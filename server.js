import express from 'express';
import path from 'path';
import { registerRoutes } from './server/routes';
import { addSource, getAllArticles, getAllSources, getArticlesBySourceId, getSourceById } from './server/db';
import { Crawler } from './server/crawl';
import faviconGetter from "favicon-getter"


const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(express.static(path.join(__dirname, process.env.PUBLIC_DIR)));


const routes = {
    api: {
        sources: {
            get: async (req, res) => {
                res.json(await getAllSources());
            },
            post: async (req, res) => {
                const { body } = req
                const favicon = await faviconGetter(body.url)
                res.json(addSource({
                    name: body.name,
                    url: body.url,
                    last_crawl: null,
                    logo: favicon,
                    articles: []
                }));
            }
        },
        articles: {
            get: async (req, res) => {
                const sourceId = req.query.source
                if (!sourceId) res.send(await getAllArticles())

                res.send(await getArticlesBySourceId(sourceId))
            }
        },
        crawl: async (req, res) => {
            const { sourceId } = req.query;
            if (!sourceId) {
                res.send({ error: 'Source ID is required' });
                return;
            }

            const source = await getSourceById(sourceId);

            try {
                const crawler = new Crawler(source);

                crawler.on("complete", () => res.send({ done: true }))
            } catch (e) {
                console.log(new Error(e))
                res.send({ done: false })
            }

            res.send({ message: 'Crawling Done!!' });
        }
    }
}

registerRoutes(app, routes);

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});