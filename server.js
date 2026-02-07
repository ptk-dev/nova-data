// server.js
import express from 'express';
import { registerRoutes } from './server/routes';
import {
    addSource, getAllArticles, getAllSources, getArticlesBySourceId, getSourceById,
    addArticle, updateArticle, getAllCrawls, getAllSitemaps,
    database
} from './server/db';
import { Crawler } from './server/crawl';
import faviconGetter from "favicon-getter";
import cors from "cors";

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(cors());

let activeCrawlers = {};

const routes = {
    api: {
        sources: {
            get: async (req, res) => res.json(await getAllSources()),
            post: async (req, res) => {
                const { body } = req;
                const favicon = await faviconGetter(body.url);
                const source = await addSource({
                    name: body.name,
                    url: body.url,
                    last_crawl: null,
                    logo: favicon,
                    articles: []
                });
                res.json(source);
            },
            delete: async (req, res) => {
                const id = req.query.id;
                if (!id) return res.status(400).json({ error: 'Source ID required' });
                await pb.collection('sources').delete(id);
                res.json({ success: true });
            }
        },
        articles: {
            get: async (req, res) => {
                const sourceId = req.query.source;
                const articles = sourceId ? await getArticlesBySourceId(sourceId) : await getAllArticles();
                res.json(articles);
            },
            patch: async (req, res) => {
                const { id, updates } = req.body;
                if (!id || !updates) return res.status(400).json({ error: 'ID and updates required' });
                const updated = await updateArticle(id, updates);
                res.json(updated);
            }
        },
        crawl: {
            post: async (req, res) => {
                const { sourceId } = req.query;
                if (!sourceId) return res.status(400).json({ error: 'Source ID is required' });
                const source = await getSourceById(sourceId);

                const crawler = new Crawler(source, {}, {
                    onUpdate: (status) => {
                        activeCrawlers[sourceId] = status;
                    },
                    onError: (error) => {
                        activeCrawlers[sourceId] = { ...activeCrawlers[sourceId], error: true, message: error.message };
                        console.log("Crawl error",error)
                    },
                    shouldHalt: () => activeCrawlers[sourceId]?.halt === true
                });

                activeCrawlers[sourceId] = { status: 'started', progress: 0, errorRate: 0, total: 0, error: false };

                crawler.on("complete", () => {
                    activeCrawlers[sourceId].status = 'complete';
                });

                res.json({ message: 'Crawling started', sourceId });
            },
            all: async (_req, res) => {
                const sources = await getAllSources();
                sources.forEach(src => {
                    const crawler = new Crawler(src, {}, {
                        onUpdate: (status) => {
                            activeCrawlers[src.id] = status;
                        },
                        onError: (error) => {
                            activeCrawlers[src.id] = { ...activeCrawlers[src.id], error: true, message: error.message };
                            console.log("Crawler Error", error)
                        },
                        shouldHalt: () => activeCrawlers[src.id]?.halt === true
                    });

                    activeCrawlers[src.id] = { status: 'started', progress: 0, errorRate: 0, total: 0, error: false };

                    crawler.on("complete", () => {
                        activeCrawlers[src.id].status = 'complete';
                    });
                });
                res.json({ message: 'Crawling started for all sources' });
            },
            status: async (_req, res) => {
                res.json(activeCrawlers);
            },
            control: async (req, res) => {
                const { sourceId, action } = req.body;
                if (!sourceId || !action) return res.status(400).json({ error: 'sourceId and action required' });

                if (!activeCrawlers[sourceId]) return res.status(404).json({ error: 'No crawler running for this source' });

                if (action === 'halt') {
                    activeCrawlers[sourceId].halt = true;
                    res.json({ message: 'Crawler halted' });
                } else {
                    res.status(400).json({ error: 'Unsupported action' });
                }
            }
        },
        analytics: {
            articlesCount: async (_req, res) => {
                const articles = await getAllArticles();
                const counts = {};
                articles.forEach(a => {
                    counts[a.source] = (counts[a.source] || 0) + 1;
                });
                res.json(counts);
            },
            recentCrawls: async (_req, res) => {
                const crawls = await getAllCrawls();
                res.json(crawls);
            },
            sitemaps: async (_req, res) => {
                const sitemaps = await getAllSitemaps();
                res.json(sitemaps);
            },
            query: async (req, res) => {
                const collection = req.query.collection
                const filter = req.query.filter || req.query.query

                if (!collection) res.json({ message: "Collection Required", error: true })

                const result = await database.collection(collection).getFullList({
                    filter
                })

                res.json(result)
            }
        },
        health: async (_req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        }
    }
};



registerRoutes(app, routes);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
