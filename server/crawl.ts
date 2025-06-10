import robotParser from "robots-txt-parser";
import { URL } from "url";
import EventEmitter from "events";
import { XMLParser } from "fast-xml-parser";
import { sitemapSchema, sourceSchema } from "./schema";
import z, { number } from "zod";
import { addSitemap, checkValueExistsInCollection, getAllSitemaps } from "./db";
import axios, { AxiosInstance } from "axios"
import axiosRetry from "axios-retry"
import { validAndProcessUrl } from "./content";

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
let i = 0
class Crawler extends EventEmitter {
    options: CrawlerOptionType = {
        maxDepth: 3,
        maxPages: 100,
        userAgent: 'Mozilla/5.0 (compatible; MyCrawler/1.0; +http://example.com/bot)',
        timeout: 5000,
        followRedirects: true,
        headers: {},
        proxy: null,
        retryCount: 3,
        delayBetweenRequests: 1000,
        articleHardLimit: parseInt(process.env.ARTICLE_PER_SOURCE_HARDLIMIT ?? "10")
    };
    source: CrawlerSource;
    status: 'idle' | 'crawling' | 'completed' | 'error';
    progress: number;
    axe: AxiosInstance;
    articlesListed = 0;

    constructor(_source: z.infer<typeof sourceSchema>, options: Partial<CrawlerOptionType> = {}) {
        super();

        this.source = {
            ..._source,
            url: new URL(_source.url),
            last_crawl: _source.last_crawl ? new Date(_source.last_crawl) : null,
            id: _source.id!
        };

        // Axios init.
        const axe = axios.create({
            timeout: 5000,
            headers: {
                "User-Agent": this.options.userAgent
            }
        })

        axiosRetry(axe, {
            retries: this.options.retryCount,
            retryDelay: () => 200,
            retryCondition: (error) => {
                if (error.isAxiosError || axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error)) {
                    return true
                }
                return false
            }
        })

        this.axe = axe

        this.options = { ...this.options, ...options };
        this.status = 'idle';
        this.progress = 0;

        this.init();
    }

    async init() {
        const result = await this.findRss();
        if (result.error) {
            console.log("Reason:", result.reason);
            console.log("Message:", result.message);
        }
    }

    async fetch(url: URL, type: 'text' | 'json' | 'blob' | 'xml' = 'text', retries = 0): Promise<any | { error: true; message: string }> {
        const data = await this.axe.get(url.href)

        const response = await fetch(url.href, {
            headers: this.options.headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        if (type === "xml") {
            return parser.parse(await response.text());
        }

        return await response[type]();
    }

    update(status: typeof this.status, progress: number) {
        this.status = status;
        this.progress = progress;
        console.log(status, progress)
    }



    async addSitemap(sitemapToAdd: z.infer<typeof sitemapSchema>) {
        const isExists = await checkValueExistsInCollection("sitemaps", "url", sitemapToAdd.url);
        if (!isExists) {
            const sitemap = await addSitemap(sitemapToAdd)
            return sitemap!
        }
        return isExists
    }

    async validateSitemap(sitemapUrl: URL) {

        const xml = await this.fetch(sitemapUrl, "xml");

        if (!xml) {
            return {
                error: true,
                reason: 0,
                message: reasons[0]
            };
        }

        if (xml.sitemapindex) {
            await this.addSitemap({
                url: sitemapUrl.href,
                news: false,
                source: this.source.id,
                verified: true
            });

            for (const sitemap of xml.sitemapindex.sitemap) {
                await this.addSitemap({
                    url: sitemap.loc,
                    news: false,
                    source: this.source.id,
                    verified: false
                });
            };
            return;
        }

        if (xml.urlset) {
            for (const urlObj of xml.urlset.url) {
                const url = urlObj["loc"]
                const article = await validAndProcessUrl(url)

                if (article.error) {
                    continue;
                }


                i++;
            }
        }
    }

    async findRss() {
        const robots = robotParser({
            userAgent: this.options.userAgent,
            allowOnNeutral: false
        });

        const robotsTxt = await robots.useRobotsFor(this.source.url.origin) as {
            sitemaps?: string[];
            [key: string]: unknown;
        };


        if (robotsTxt?.sitemaps?.length) {
            await this.validateSitemap(new URL(robotsTxt.sitemaps[0]));

            for (let sitemap of robotsTxt.sitemaps) {
                console.log("Sitemap found:", sitemap);
                this.update('crawling', ++this.progress);
                await this.validateSitemap(new URL(sitemap));
            }

            return {
                reason: 1,
                message: reasons[1]
            };
        }

        return {
            error: true,
            reason: 0,
            message: reasons[0]
        };
    }
}

export { Crawler };
