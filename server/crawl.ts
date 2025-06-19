import robotParser from "robots-txt-parser";
import { URL } from "url";
import EventEmitter from "events";
import { XMLParser } from "fast-xml-parser";
import { sitemapSchema, sourceSchema } from "./schema";
import z from "zod";
import { addCrawl, addSitemap, checkValueExistsInCollection, getAllSitemaps, getCrawlById, getSitemapById, updateCrawls, updateSitemap } from "./db";
import axios, { AxiosInstance } from "axios"
import axiosRetry from "axios-retry"
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

class Crawler extends EventEmitter {
    options: CrawlerOptionType = {
        maxDepth: 3,
        maxPages: 100,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        timeout: 5000,
        followRedirects: true,
        headers: {
            "Content-Type": "application/xml",
            "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
        },
        proxy: null,
        retryCount: 3,
        delayBetweenRequests: 1000,
        articleHardLimit: parseInt(process.env.ARTICLE_PER_SOURCE_HARDLIMIT ?? "10") - 1
    };
    source: CrawlerSource;
    status: 'idle' | 'crawling' | 'completed' | 'error';
    progress = {
        crawls: 0,
    };
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
            },

        })

        axiosRetry(axe, {
            retries: this.options.retryCount,
            retryDelay: () => 200,
            retryCondition: (error) => {
                if (error.isAxiosError || axiosRetry.isNetworkError(error) || axiosRetry.isRetryableError(error)) {
                    return true
                }
                return false
            },
            onRetry: () => console.log("Axios Retrying"),
            onMaxRetryTimesExceeded: () => console.log("Axios Failed.")
        })

        this.axe = axe

        this.options = { ...this.options, ...options };
        this.status = 'idle';

        this.init();
    }

    async init() {
        const result = await this.findRss();
        if (result && result.error) {
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

    update(status: typeof this.status, progress?: number, message?: string) {
        this.status = status;
        if (progress) this.progress.crawls = progress;
        console.log(status, progress, message)
    }



    async addSitemap(sitemapToAdd: z.infer<typeof sitemapSchema>) {
        let isExists = await checkValueExistsInCollection("sitemaps", "url", sitemapToAdd.url);
        if (!isExists) {
            const sitemap = await addSitemap(sitemapToAdd)
            return sitemap!
        } else if (!isExists.verified && sitemapToAdd.verified) {
            isExists = await updateSitemap(isExists.id, sitemapToAdd);
        }

        return isExists
    }

    async addCrawls(url: string, sitemap: string) {
        let isExists = await checkValueExistsInCollection("crawls", "url", url)
        if (!isExists) {
            const crawl = await addCrawl({
                source: this.source.id,
                name: this.source.name,
                url,
                sitemap
            })
            return crawl!
        }
        return isExists!
    }

    async updateSitemap(id: string, params: object) {
        const sitemap = await getSitemapById(id)

        if (sitemap) {
            const newPreSitemap = { ...sitemap, ...params, last_crawl: new Date(sitemap.last_crawl || "") } as unknown as z.infer<typeof sitemapSchema>

            const newSitemap = await updateSitemap(id, newPreSitemap)

            return newSitemap
        }
    }

    haltCrawling() {
        const hardLimit = parseInt(process.env.ARTICLE_PER_SOURCE_HARDLIMIT || "10")
        const currentNumber = this.progress.crawls

        if (currentNumber > hardLimit) {
            console.log("Limit hit.")
            return true
        }
    }

    async validateSitemap(sitemapUrl: URL) {
        const sitemap = await checkValueExistsInCollection("sitemaps", "url", sitemapUrl.href) || await this.addSitemap({
            url: sitemapUrl.href,
            news: false,
            source: this.source.id,
            verified: false,
            last_crawl: new Date()
        });

        if (this.haltCrawling()) return;

        await this.updateSitemap(sitemap!.id, { last_crawl: new Date() })

        if (sitemap!.verified && !sitemap!.news) return;
        if (!sitemap!.last_crawl) {
            const crawlTime = new Date(!sitemap!.last_crawl as unknown as string || "")
            const maxOffsetHours = parseInt(process.env.SITEMAP_LEAST_HOURS_FOR_RECRAWL || "2")
            // @ts-expect-error
            if (!(Math.abs(new Date() - crawlTime) / (1000 * 60 * 60) >= maxOffsetHours)) {
                console.log("Skipped because of too short period of re-pinging.")
                return;
            }
        }
        this.update("crawling", undefined, sitemap!.id)

        const xml = await this.fetch(sitemapUrl, "xml");

        if (!xml) {
            return {
                error: true,
                reason: 0,
                message: reasons[0]
            };
        }

        if (xml.sitemapindex) {
            await this.updateSitemap(sitemap!.id, { news: false, verified: true })

            if (xml.sitemapindex.sitemap && !Array.isArray(xml.sitemapindex.sitemap)) {
                const sitemap = xml.sitemapindex.sitemap
                await this.addSitemap({
                    url: sitemap.loc,
                    news: false,
                    source: this.source.id,
                    verified: false,
                    last_crawl: new Date()
                });
            } else {
                for (const sitemap of xml.sitemapindex.sitemap) {
                    if (sitemap.loc.includes("archive")) continue;

                    await this.addSitemap({
                        url: sitemap.loc,
                        news: false,
                        source: this.source.id,
                        last_crawl: new Date(),
                        verified: false
                    });
                };
            }
            return;
        }

        if (xml.urlset) {
            let hasNews = false
            for (const urlObj of xml.urlset.url) {
                if (this.haltCrawling()) return;
                const url = urlObj["loc"]
                if (!url) continue;

                if (url.includes("archive")) continue;

                const crawl = await this.addCrawls(url, sitemap!.id)
                const urlVerified = (await getCrawlById(crawl.id)).verified

                if (urlVerified) continue;

                const articleExists = await articleAlreadyExists(url)

                if (articleExists) continue;

                const article = await validAndProcessUrl(url, this.source.id, crawl.id)

                await updateCrawls(crawl.id, {
                    verified: true
                })

                if (article!.error) {
                    console.log(article!.message)
                    continue;
                }
                this.progress.crawls++;
                hasNews = true;
            }
            await this.updateSitemap(sitemap!.id, { news: hasNews, verified: true, last_crawl: new Date() })
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
            if (this.haltCrawling()) return;
            await this.validateSitemap(new URL(robotsTxt.sitemaps[0]));

            for (let sitemap of robotsTxt.sitemaps) {
                if (this.haltCrawling()) return;
                if (!await isSitemapUrlVerified(sitemap)) await this.validateSitemap(new URL(sitemap));
            }

            console.log("Robots.txt step finished.")
        }


        const unValidatedSitemaps = (await getAllSitemaps()).filter(sitemap => !sitemap.verified && sitemap.source === this.source.id);
        console.log("Un-Validated step finished.")

        for (const sitemap of unValidatedSitemaps) {
            if (this.haltCrawling()) return;
            if (!await isSitemapUrlVerified(sitemap.url)) await this.validateSitemap(new URL(sitemap.url))
        }
        console.log("Un-Validated step finished.")

        const newsSitemaps = (await getAllSitemaps()).filter(sitemap => !sitemap.verified && sitemap.news);

        for (const sitemap of newsSitemaps) {
            if (this.haltCrawling()) return;
            await this.validateSitemap(new URL(sitemap.url))
        }

        console.log("Finished!!")

        return {
            error: false,
            reason: 1,
            message: reasons[1]
        };
    }
}

async function isSitemapUrlVerified(sitemap: string) {
    return (await getAllSitemaps()).some(s => s.url === sitemap && s.verified);
}

export { Crawler };
