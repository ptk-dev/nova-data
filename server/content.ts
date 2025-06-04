import { Readability, isProbablyReaderable } from '@mozilla/readability';
import jsdom, { JSDOM } from 'jsdom';
import Mercury from "@postlight/mercury-parser"

// @ts-expect-error
import { structuredDataTestHtml, structuredDataTestUrl } from "structured-data-testing-tool"
// @ts-expect-error
import { Google } from "structured-data-testing-tool/presets"
import { checkValueExistsInCollection } from './db';
import { writeFileSync } from 'fs';
import { appendFile } from 'fs/promises';


const virtualConsole = new jsdom.VirtualConsole();

async function getArticleFrom(text: string, type: "text" | "url" = "url") {
    const body = type === "url" ? await (await fetch(text)).text() : text;
    const dom = new JSDOM(body, { virtualConsole });
    const reader = new Readability(dom.window.document);

    const readabilityArticle = reader.parse();
    const mercuryArticle = await Mercury.parse(text, { contentType: "text" });

    const article = {
        title: readabilityArticle?.title || mercuryArticle.title,
        content: readabilityArticle?.content || mercuryArticle.content,
        excerpt: readabilityArticle?.excerpt || mercuryArticle.excerpt,
        authors: readabilityArticle?.byline || mercuryArticle.author,
        thumbnail: mercuryArticle.lead_image_url,
        publishedTime: readabilityArticle?.publishedTime || mercuryArticle.date_published,
        textContent: readabilityArticle?.textContent
    }

    return article;
}

async function getLocalSchema(content: string, type: "url" | "text" = "url") {
    const body = type === "url" ? await (await fetch(content)).text() : content;
    const dom = new JSDOM(body, { virtualConsole });

    if (!isProbablyReaderable(dom.window.document)) {
        return false;
    }

    let schemas;
    if (type === "url") {
        const { schemas: urlSchemas, structuredData } = await structuredDataTestUrl(content, { preset: Google });
        schemas = { schemas: urlSchemas, structuredData };
    } else {
        const { schemas: urlSchemas, structuredData } = await structuredDataTestHtml(body, { preset: Google });
        schemas = { schemas: urlSchemas, structuredData };
    }

    return schemas!
}

async function getOnlineSchema(url: string) {
    let response = String(await (await fetch("https://validator.schema.org/validate?url=" + encodeURIComponent(url), {
        method: "POST"
    })).text());

    if (response.startsWith(")]}'\n")) {
        response = response.replace(")]}'\n", "");
    }

    const rawSchema = JSON.parse(response);

    const medium = {
        url: rawSchema.url,
        isRendered: rawSchema.isRendered,
        errors: rawSchema.errors,
        tripleGroups: rawSchema.tripleGroups,
    }

    const schemas = Object.keys(medium.tripleGroups).reduce((acc: typeof medium.tripleGroups, key) => {
        const group = medium.tripleGroups[key];
        let props = group.nodes.map((node: any) => {
            const { properties, typeGroup } = node;
            return Object.fromEntries([["type", typeGroup]].concat(properties.map((prop: any) => [prop.pred, prop.value])));
        });
        return [...acc, ...props];
    }, []);/**
       output -- [
  {
    type: "NewsArticle",
    headline: "GitHub nabs JavaScript packaging vendor npm",
    datePublished: "2020-03-16T17:41:42+00:00",
    dateModified: "2020-03-16T18:07:50+00:00",
    wordCount: "417",
    commentCount: "0",
    thumbnailUrl: "https://techcrunch.com/wp-content/uploads/2020/03/GettyImages-967228260.jpg",
    keywords: "npm",
    articleSection: "Startups",
    inLanguage: "en-US",
    copyrightYear: "2020",
  }
] */


    const acceptedTypes = ["Blog", "Article", "NewsArticle", "TechArticle", "BlogPosting", "ScholarlyArticle", "Report", "AnalysisNewsArticle", "OpinionNewsArticle", "AskPublicNewsArticle", "BackgroundNewsArticle", "ReportageNewsArticle", "ReviewNewsArticle"];
    const typeAccepted = (type: string) => acceptedTypes.map(_type => _type === type).reduce((a, b) => a || b, false)

    let isAcceptable: boolean = schemas.map((schema: { type: string }) => typeAccepted(schema.type)).reduce((a: any, b: any) => a || b, false);
    
    if (!isAcceptable) {
        return false
    }

    const hasHeadline = (schema: any) => 'headline' in schema;
    const hasDatePublished = (schema: any) => 'datePublished' in schema;
    const hasDateModified = (schema: any) => 'dateModified' in schema;
    const hasCommentCount = (schema: any) => 'commentCount' in schema;
    const hasThumbnailUrl = (schema: any) => 'thumbnailUrl' in schema;
    const hasKeywords = (schema: any) => 'keywords' in schema;
    const hasArticleSection = (schema: any) => 'articleSection' in schema;
    const hasLanguage = (schema: any) => 'inLanguage' in schema;

    const hasFunctions = [
        hasHeadline,
        hasDatePublished,
        hasKeywords,
        hasLanguage,
        hasThumbnailUrl
    ]

    const hasVerification = (schema:any)=> hasFunctions.map(func=> func(schema)).reduce((a:boolean,b:boolean)=> a&&b, true)
    const availableSchemaData = schemas.filter(hasVerification);

    const schema = {}
    console.log(schema)
    console.log(availableSchemaData)

}

async function articleAlreadyExists(article: any) {
    for (let [key, value] of Object.entries(article)) {
        if (await checkValueExistsInCollection("articles", key, value as any)) {
            return true
        }
    }
    return false
}

async function validUrl(url: string) {
    const text = await (await fetch(url)).text()

    const localSchema = await getLocalSchema(url, "text")

    const onlineSchema = await getOnlineSchema(url)

    if (!(localSchema && onlineSchema)) return "false 0"

    const daysLimit = parseInt(process.env.NEWS_DATE_THREADSOLD ?? "5")
    const dateLimit = new Date(Date.now() - 1000 * 60 * 60 * 24 * daysLimit)

    const hasValidNewsArticle = localSchema.schemas.includes("NewsArticle") && localSchema.schemas.includes("NewsArticle").length === 1 && new Date(localSchema.structuredData?.jsonld?.NewsArticle?.[0].datePublished) >= dateLimit

    if (!hasValidNewsArticle) return "false1"

    const newsArticle = localSchema.structuredData?.jsonld?.NewsArticle[0]
    console.log(onlineSchema)

    const raw_article = await getArticleFrom(text, "text")

    const article = {
        ...raw_article,
        thumbnail: newsArticle?.thumbnail ?? raw_article.thumbnail,
        authors: newsArticle?.author?.map((a: { name: string }) => a.name).join(", ") ?? raw_article.thumbnail,
        keywords: newsArticle?.keywords?.join(", "),
        title: newsArticle?.headline ?? raw_article.title
    }

    if (!article.title || !article.content) {
        return "false2"
    }

    const articleExists = await articleAlreadyExists(article)
    if (articleExists) {
        return "false3";
    }

    console.log(`Article "${article.title}" is valid and does not exist in the database.`);
    console.log(article);

    return article
}

console.log(await validUrl("https://techcrunch.com/2020/03/16/github-nabs-javascript-packaging-vendor-npm/"))

export {
    getArticleFrom,
    getLocalSchema as isPageNewsArticle,
    validUrl
}