import { z } from "zod"
import { articleSchema, crawlSchema } from "../server/schema";
import { articles, getArticleById, updateArticle } from "../server/db";
import { database } from "../server/db";
import { validateArticle } from "./validator";
import { processArticle } from "./process";


type ArticleProps = {
    id?: string
    unprocessed?: boolean
    unvalidated?: boolean
}

class Article {
    id!: string;
    title!: string;
    authors!: string[];
    source!: string;
    thumbnail!: string;
    keywords!: string;
    content!: string;
    excrept!: string;
    url!: string;
    date!: Date;
    crawl!: z.infer<typeof crawlSchema>;
    processed!: boolean
    fetching: boolean = false;
    valid: boolean | undefined;
    validated: boolean = false;

    constructor({ id, unprocessed, unvalidated }: Partial<ArticleProps>) {
        if (id) this.articleById(id)
        if (unprocessed) this.nextUnProcessedArticle()
        if (unvalidated) this.nextUnValidatedArticle()
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

    async nextUnProcessedArticle() {
        this.fetching = true
        try {
            const article = await database.collection(articles).getFirstListItem("processed = false && validated = true && valid = true")

            for (let [key, value] of Object.entries(article)) {
                // @ts-expect-error
                this[key] = value
            }
        } catch {
            console.log(`Next article could be fetched.`)
        }
        this.fetching = false
    }

    async nextUnValidatedArticle() {
        this.fetching = true
        try {
            const article = await database.collection(articles)
            .getFirstListItem("validated = false")

            for (let [key, value] of Object.entries(article)) {
                // @ts-expect-error
                this[key] = value
            }
        } catch {
            console.log(`Next article could be fetched.`)
        }
        this.fetching = false
    }

    async validate() {
        // if (this.validated) return this.valid
        const trimmedContent = `${this.content.slice(0, 1200)}...`
        const { valid, message } = await validateArticle(this.title, trimmedContent, false)
        // this.valid = valid

        
        await updateArticle(this.id, { valid: this.valid, validated: true })
        
        return { valid, message }
    }
    
    async process() {
        if (this.valid === undefined) await this.validate()
            if (!this.valid) return { error: true, message: "The Article is not valid thus could not be processed." }
        // if (this.processed) return get
        const processedArticle = await processArticle(this.title, this.content, this.keywords)



        console.log(processedArticle)
    }
}

export { Article }