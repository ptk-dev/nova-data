import { URL } from "url";
import { z } from "zod";

const articleSchema = z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(2).max(100),
    article: z.string().min(2).max(100),
    description: z.string().min(2).max(500),
    thumbnail: z.string().url(),
    author: z.string().min(2).max(100),
    source: z.string().uuid(),
    origin_url: z.string().url()
});

const sourceSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(2).max(100),
    url: z.string().url(),
    last_crawl: z.string().datetime().nullable(),
    articles: z.array(z.string().uuid()),
    logo: z.string().url()
});

const sitemapSchema = z.object({
    url: z.string(),
    source: z.string(),
    news: z.boolean(),
    verified: z.boolean()
})

const crawlSchema = z.object({
    name: z.string(),
    source: z.string(),
    url: z.string(),
    article: z.string().optional(),
})

export {
    articleSchema,
    sourceSchema,
    sitemapSchema,
    crawlSchema
}