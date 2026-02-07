import { database } from "../server/db";
import { Article } from "./article";

let correct = 0

class Processor {
    async validate(numOfArticles: number = 10, current = 0): Promise<any> {
        const article = new Article({ unvalidated: true })
        await article.init()
        const { valid } = await article.validate()

        if (valid === article.valid) correct++

        console.log("Originally Validated:", article.valid, "validated to be", valid)
        if (current < numOfArticles) return this.validate(numOfArticles, current);
    }

    async process(numOfArticles = 1, current = 0): Promise<any> {
        const article = new Article({ unprocessed: true })
        await article.init()


        const processArticle = await article.process()

        if (current < numOfArticles) return this.process(numOfArticles, ++current);
    }
}

console.log(process.env)

const allArticles = await (database.collection("articles")).getFullList({
    filter: "validated = false",
})
const processor = new Processor()

// processor.process(1)
try{await processor.validate(allArticles.length)}
catch {}
console.log("Correct:", correct, "out of", allArticles.length, correct/allArticles.length * 100, "%")