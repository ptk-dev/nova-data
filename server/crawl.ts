// --- Enhanced Crawler Class With Dashboard Integration and Error/Progress Updates ---

import robotParser from "robots-txt-parser";
import { URL } from "url";
import EventEmitter from "events";
import { XMLParser } from "fast-xml-parser";
import { sitemapSchema, sourceSchema } from "./schema";
import z from "zod";
import {
  addCrawl,
  addSitemap,
  checkValueExistsInCollection,
  getAllSitemaps,
  getCrawlById,
  getSitemapById,
  updateCrawls,
  updateSitemap
} from "./db";
import axios, { AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import { articleAlreadyExists, validAndProcessUrl } from "./content";

const parser = new XMLParser();

const reasons = {
  0: "No Sitemap Found",
  1: "Sitemaps Found."
};

type CrawlerOptionType = {
  maxDepth: number;
  maxPages: number;
  userAgent: string;
  timeout: number;
  followRedirects: boolean;
  headers: Record<string, string>;
  proxy: null;
  retryCount: number;
  delayBetweenRequests: number;
  articleHardLimit: number;
};

type CrawlerSource = {
  name: string;
  url: URL;
  id: string;
  last_crawl: Date | "" | null;
  articles: string[];
  logo: string;
};

type CrawlerHooks = {
  onUpdate?: (status: object) => void;
  onError?: (err: Error) => void;
  shouldHalt?: () => boolean;
};

let step = 0

class Crawler extends EventEmitter {
  options: CrawlerOptionType;
  source: CrawlerSource;
  status: 'idle' | 'crawling' | 'completed' | 'error';
  progress = { crawls: 0, errors: 0 };
  axe: AxiosInstance;
  articlesListed = 0;
  hooks: CrawlerHooks;

  constructor(_source: z.infer<typeof sourceSchema>, options: Partial<CrawlerOptionType> = {}, hooks: CrawlerHooks = {}) {
    super();

    this.source = {
      ..._source,
      url: new URL(_source.url),
      last_crawl: _source.last_crawl ? new Date(_source.last_crawl) : null,
      id: _source.id!
    };

    this.options = {
      maxDepth: 3,
      maxPages: 100,
      userAgent: 'Mozilla/5.0',
      timeout: 5000,
      followRedirects: true,
      headers: {
        "Content-Type": "application/xml",
        "User-Agent": 'Mozilla/5.0'
      },
      proxy: null,
      retryCount: 3,
      delayBetweenRequests: 1000,
      articleHardLimit: parseInt(process.env.ARTICLE_PER_SOURCE_HARDLIMIT ?? "10") - 1,
      ...options
    };

    this.axe = axios.create({ timeout: 5000, headers: { "User-Agent": this.options.userAgent } });
    axiosRetry(this.axe, {
      retries: this.options.retryCount,
      retryDelay: () => 200,
      retryCondition: (e) => axiosRetry.isNetworkOrIdempotentRequestError(e),
      onRetry: () => this.log("Retrying request..."),
      onMaxRetryTimesExceeded: () => this.log("Max retries exceeded")
    });

    this.status = 'idle';
    this.hooks = hooks;
    this.init();
  }

  log(msg: string) {
    console.log(`[Crawler:${this.source.name}]`, msg);
  }

  report(err?: Error) {
    this.hooks.onUpdate?.({
      sourceId: this.source.id,
      status: this.status,
      progress: this.progress.crawls,
      errors: this.progress.errors,
      timestamp: new Date().toISOString(),
      ...err
    });
  }

  error(err: Error) {
    this.status = 'error';
    this.progress.errors++;
    this.hooks.onError?.(err);
    this.report(err);
  }

  async init() {
    try {
      const result = await this.findRss();
      if (result?.error) this.log(result.message);
      this.status = 'completed';
    } catch (err) {
      this.error(err as Error);
    } finally {
      this.report();
      this.emit('complete');
    }
  }

  haltCrawling() {
    return this.hooks.shouldHalt?.() || this.progress.crawls > this.options.articleHardLimit;
  }

  async fetch(url: URL, type: 'text' | 'json' | 'blob' | 'xml' = 'text') {
    const res = await this.axe.get(url.href);
    if (type === "xml") return parser.parse(res.data);
    return res.data;
  }

  updateStatus(status: typeof this.status) {
    this.status = status;
    this.report();
  }

  async validateSitemap(sitemapUrl: URL) {
    try {
      const sitemap = await checkValueExistsInCollection("sitemaps", "url", sitemapUrl.href)
        || await addSitemap({ url: sitemapUrl.href, news: false, source: this.source.id, verified: false, last_crawl: new Date() });

      if (this.haltCrawling()) return;
      await updateSitemap(sitemap!.id, { last_crawl: new Date() });

      this.updateStatus("crawling");
      const xml = await this.fetch(sitemapUrl, "xml");
      if (!xml) throw new Error("Invalid sitemap");

      if (xml.sitemapindex) {
        await updateSitemap(sitemap!.id, { news: false, verified: true });
        const maps = Array.isArray(xml.sitemapindex.sitemap) ? xml.sitemapindex.sitemap : [xml.sitemapindex.sitemap];
        for (const map of maps) {
          if (map.loc.includes("archive")) continue;
          await this.validateSitemap(new URL(map.loc));
        }
        return;
      }

      if (xml.urlset) {
        let hasNews = false;
        for (const urlObj of xml.urlset.url) {
          if (this.haltCrawling()) return;
          const url = urlObj.loc;
          if (!url || url.includes("archive")) continue;

          const crawl = await this.addCrawlAndCheck(url, sitemap!.id);
          if (!crawl) continue;

          const article = await validAndProcessUrl(url, this.source.id, crawl.id);
          await updateCrawls(crawl.id, { verified: true });

          if (!article || article.error) continue;
          this.progress.crawls++;
          hasNews = true;
          this.report();
        }
        await updateSitemap(sitemap!.id, { news: hasNews, verified: true, last_crawl: new Date() });
      }
    } catch (err) {
      this.error(err as Error);
    }
  }

  async addCrawlAndCheck(url: string, sitemapId: string) {
    const existing = await checkValueExistsInCollection("crawls", "url", url);
    if (existing && existing.verified) return null;
    if (await articleAlreadyExists(url)) return null;
    return existing || await addCrawl({ source: this.source.id, name: this.source.name, url, sitemap: sitemapId });
  }

  async findRss() {
    console.log(`[Crawler State: ${step++}]`)

    const robots = robotParser({ userAgent: this.options.userAgent, allowOnNeutral: false });
    const robotsTxt = await robots.useRobotsFor(this.source.url.origin);

    const sitemaps = robotsTxt?.sitemaps || [];
    for (const sitemapUrl of sitemaps) {
      if (this.haltCrawling()) return;
      await this.validateSitemap(new URL(sitemapUrl));
    }

    const unverified = (await getAllSitemaps()).filter(s => !s.verified && s.source === this.source.id);
    for (const s of unverified) {
      if (this.haltCrawling()) return;
      await this.validateSitemap(new URL(s.url));
    }

    return { error: false, reason: 1, message: reasons[1] };
  }
}

export { Crawler };
