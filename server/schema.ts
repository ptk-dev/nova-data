import { z } from "zod";

const articleSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(2),
    authors: z.string(),
    thumbnail: z.string(),
    keywords: z.string().optional(),
    content: z.string().nullable(),
    excerpt: z.string().nullable(),
    source: z.string(),
    crawl: z.string(),
    url: z.string().url(),
    date: z.date().nullable(),
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
    verified: z.boolean(),
    last_crawl: z.date()
})

const crawlSchema = z.object({
    name: z.string(),
    source: z.string(),
    url: z.string(),
    article: z.string().optional(),
    sitemap: z.string(),
    verified: z.boolean().optional()
})

export {
    articleSchema,
    sourceSchema,
    sitemapSchema,
    crawlSchema
}