import { z } from "zod"
import { articleSchema, crawlSchema } from "../server/schema";
import { articles, getArticleById } from "../server/db";
import { database } from "../server/db";

type ArticleProps = {
    id?: string
    next?: boolean
}

class Article {
    id!: string;
    title!: string;
    authors!: string[];
    source!: string;
    thumbnail!: string;
    keywords!: string[];
    content!: string[];
    excrept!: string;
    url!: string;
    date!: Date;
    crawl!: z.infer<typeof crawlSchema>;
    processed!: boolean
    fetching: boolean = false;

    constructor({ id, next }: Partial<ArticleProps>) {
        if (id) this.articleById(id)
        if (next) this.nextUnprocessedArticle()
    }

    async init() {
        const j = this
        return new Promise(res => {
            const i = setInterval(() => {
                if (!j.fetching) {
                    res(void (0))
                    clearInterval(i)
                }
            }, 100)
        })
    }

    async articleById(id: string) {
        this.fetching = true
        try {
            const article = await getArticleById(id) as unknown as z.infer<typeof articleSchema>

            for (let [key, value] of Object.entries(article)) {
                // @ts-expect-error
                this[key] = value
            }
        } catch {
            console.log(`Article ${id} could be fetched.`)
        }
        this.fetching = false
    }

    async nextUnprocessedArticle() {
        this.fetching = true
        try {
            const article = await database.collection(articles).getFirstListItem("processed = false")

            for (let [key, value] of Object.entries(article)) {
                // @ts-expect-error
                this[key] = value
            }
        } catch {
            console.log(`Next article could be fetched.`)
        }
        this.fetching = false
    }
}

export { Article }