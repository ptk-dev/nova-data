import { Article } from "./article";

let a = new Article({ next: true })
await a.init()


console.log(a)