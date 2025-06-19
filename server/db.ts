import PocketBase from 'pocketbase';
import { articleSchema, sourceSchema, crawlSchema, sitemapSchema } from './schema';
import z from 'zod';

const pb = new PocketBase('http://127.0.0.1:8090');

const sources = "sources"
const articles = "articles"
const crawls = "crawls"
const sitemaps = "sitemaps"
type Collections = typeof sources | typeof articles | typeof crawls | typeof sitemaps;

function getAllSources() {
    return pb.collection(sources).getFullList();
}

function getSourceById(id: string) {
    return pb.collection(sources).getOne(id);
}

async function updateSourceArticles(sourceId: string, articleId: string) {
    const source = await pb.collection(sources).getOne(sourceId);

    return pb.collection(sources).update(sourceId, {
        articles: [source.articles, articleId].flat()
    });
}

async function getAllArticles() {
    const sources = (await getAllSources()).reduce((a, b) => {
        a[b.id] = b
        return a
    }, {} as any)

    return (await pb.collection(articles).getFullList()).map((article) => ({...article, source: sources[article.source]?.name}));
}

function getArticleById(id: string) {
    return pb.collection(articles).getOne(id);
}

async function getArticlesBySourceId(sourceId: string) {
    const { articles } = await pb.collection(sources).getOne(sourceId)

    return await Promise.all(articles.map(async (id: string) => await getArticleById(id)));
}

function getCrawlById(id: string) {
    return pb.collection(crawls).getOne(id);
}
function getSitemapById(id: string) {
    return pb.collection(sitemaps).getOne(id);
}

function getAllCrawls() {
    return pb.collection(crawls).getFullList();
}

function getAllSitemaps() {
    return pb.collection(sitemaps).getFullList()
}
async function addCrawl(crawl: z.infer<typeof crawlSchema>) {
    try {
        const processedCrawl = crawlSchema.parse(crawl);
        return pb.collection(crawls).create(processedCrawl);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Validation failed:", error.errors);
        } else {
            console.error("An unexpected error occurred:", error);
        }
    }
}

async function addSitemap(sitemap: z.infer<typeof sitemapSchema>) {
    try {
        const processedSitemap = sitemapSchema.parse(sitemap);
        return pb.collection(sitemaps).create(processedSitemap);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Validation failed:", error.errors);
        } else {
            console.error("An unexpected error occurred:", error);
        }
    }
}

async function updateSitemap(sitemapId: string, sitemap: z.infer<typeof sitemapSchema>) {
    const processedSitemap = sitemapSchema.parse(sitemap);
    try {
        return pb.collection(sitemaps).update(sitemapId, processedSitemap);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Validation failed:", error.errors);
        } else {
            console.error("An unexpected error occurred:", error);
        }
    }
}

async function checkAttrInCollection(collection: Collections, attr: string, value: string) {
    const records = await pb.collection(collection).getList(1, 1, {
        filter: `${attr} = "${value}"`
    });

    if (records.totalItems > 0) {
        return records;
    }
}

async function checkValueExistsInCollection(collection: Collections, attr: string, value: string) {
    const records = await checkAttrInCollection(collection, attr, value)

    if (records?.totalItems === 1) {
        return records.items[0]
    }
}

async function updateCrawls(id: string, changes: Partial<z.infer<typeof crawlSchema>>) {
    const prevCrawl = await getCrawlById(id)
    try {
        const processedCrawl = crawlSchema.parse({ ...prevCrawl, ...changes });
        return pb.collection(crawls).update(id, processedCrawl);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Validation failed:", error.errors);
        } else {
            console.error("An unexpected error occurred:", error);
        }
    }
}

function addSource(source: z.infer<typeof sourceSchema>) {
    try {
        const processedSource = sourceSchema.parse(source);
        return pb.collection(sources).create(processedSource);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Validation failed:", error.errors);
        } else {
            console.error("An unexpected error occurred:", error);
        }
    }
}

async function addArticle(article: z.infer<typeof articleSchema>) {
    try {
        const processesArticle = articleSchema.parse(article);
        
        
        const Article = await pb.collection(articles).create(processesArticle);
        
        // put the article into source
        await updateSourceArticles(Article.source, Article.id)
        
        return Article
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Validation failed:", error.errors);
        } else {
            console.error("An unexpected error occurred:", error);
        }
    }
}


export {
    getAllSources,
    getSourceById,
    updateSourceArticles,
    getAllArticles,
    getArticleById,
    getArticlesBySourceId,
    addSource,
    addArticle,
    getAllCrawls,
    getAllSitemaps,
    getCrawlById,
    getSitemapById,
    addCrawl,
    addSitemap,
    checkAttrInCollection,
    checkValueExistsInCollection,
    updateSitemap,
    updateCrawls,
    pb as database,
    crawls, articles
}