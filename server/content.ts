import { Readability } from '@mozilla/readability';
import jsdom, { JSDOM } from 'jsdom';
import Mercury from "@postlight/mercury-parser"

// @ts-expect-error
import { structuredDataTestHtml, structuredDataTestUrl } from "structured-data-testing-tool"
// @ts-expect-error
import { Google } from "structured-data-testing-tool/presets"
import { addArticle, checkValueExistsInCollection, updateCrawls } from './db';
import z from 'zod';
import { articleSchema } from './schema';

const virtualConsole = new jsdom.VirtualConsole();

async function getArticleFrom(text: string, type: "text" | "url" = "url") {
    const body = type === "url" ? await (await fetch(text)).text() : text;
    const dom = new JSDOM(body, { virtualConsole });
    const reader = new Readability(dom.window.document);

    const readabilityArticle = reader.parse();
    const mercuryArticle = await Mercury.parse(text, { contentType: "html" });

    const article = {
        title: readabilityArticle?.title || mercuryArticle.title,
        content: readabilityArticle?.content && readabilityArticle?.content !== "undefined" ? readabilityArticle?.content : readabilityArticle?.content || mercuryArticle.content,
        excerpt: readabilityArticle?.excerpt || mercuryArticle.excerpt,
        authors: readabilityArticle?.byline || mercuryArticle.author,
        thumbnail: mercuryArticle.lead_image_url,
        date: new Date(readabilityArticle?.publishedTime || mercuryArticle.date_published || ""),
    }

    return article;
}

async function getLocalSchema(content: string, type: "url" | "text" = "url") {
    const body = type === "url" ? await (await fetch(content)).text() : content;

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

    const schemas = Object.keys(rawSchema.tripleGroups).reduce((acc: typeof rawSchema.tripleGroups, key) => {
        const group = rawSchema.tripleGroups[key];
        let props = group.nodes.map((node: any) => {
            const { properties, typeGroup } = node;
            return Object.fromEntries([["type", typeGroup]].concat(properties.map((prop: any) => [prop.pred, prop.value])));
        });
        return [...acc, ...props];
    }, []);


    const acceptedTypes = ["Blog", "Article", "NewsArticle", "TechArticle", "BlogPosting", "ScholarlyArticle", "Report", "AnalysisNewsArticle", "OpinionNewsArticle", "AskPublicNewsArticle", "BackgroundNewsArticle", "ReportageNewsArticle", "ReviewNewsArticle"];
    const typeAccepted = (type: string) => acceptedTypes.map(_type => _type === type).reduce((a, b) => a || b, false)

    const acceptables = schemas.filter((schema: { type: string }) => typeAccepted(schema.type));

    const hasHeadline = (schema: any) => 'headline' in schema;
    const hasDatePublished = (schema: any) => 'datePublished' in schema;
    const hasThumbnailUrl = (schema: any) => 'thumbnailUrl' in schema;
    const hasKeywords = (schema: any) => 'keywords' in schema;
    const hasLanguage = (schema: any) => 'inLanguage' in schema;

    const hasFunctions = [
        hasHeadline,
        hasDatePublished,
        hasKeywords,
        hasLanguage,
        hasThumbnailUrl
    ]

    const hasVerification = (schema: any) => hasFunctions.map(func => func(schema)).reduce((a: boolean, b: boolean) => a && b, true)
    const filteredSchemas = acceptables.filter(hasVerification);

    return filteredSchemas[0]
}

async function articleAlreadyExists(url: string) {
    return await checkValueExistsInCollection("articles", "url", url) ? true : false
}

async function validAndProcessUrl(url: string, source: string, crawl: string) {
    url = url.trim()

    const articleExists = await articleAlreadyExists(url)
    if (articleExists) {
        return {
            error: true,
            message: "The Article already exists in the database"
        };
    }

    const text = await (await fetch(url)).text()

    const localSchema = await getLocalSchema(text, "text")
    // const onlineSchema = await getOnlineSchema(url)


    if (!(localSchema /*|| onlineSchema*/)) {
        await updateCrawls(crawl, {
            verified: true
        })
        return { error: true, message: "Neither of the sources were able to aquire any useful information about the webpage." }
    }

    const daysLimit = parseInt(process.env.NEWS_DATE_THREADSOLD ?? "5")
    const dateLimit = new Date(
        Date.now() - 1000 * 60 * 60 * 24 * daysLimit
    )

    const hasValidNewsArticleLocal =
        localSchema &&
        localSchema.schemas.includes("NewsArticle") &&
        new Date(localSchema.structuredData?.jsonld?.NewsArticle?.[0].datePublished) >= dateLimit

    // const hasValidNewsArticleOnline =
    //     onlineSchema ?
    //         true :
    //         false

    if (!(hasValidNewsArticleLocal)) return { error: true, message: "Neither of the sources confirm that the webpage has a valid Article." }

    const newsArticle = localSchema ? localSchema?.structuredData?.jsonld?.NewsArticle?.[0] : {}

    const raw_article = await getArticleFrom(text, "text")

    const thumbnail = newsArticle?.thumbnail ??
        newsArticle?.thumbnailUrl ??
        localSchema?.structuredData?.metatags?.primaryImageOfPage?.[0] ??
        raw_article.thumbnail ??
        newsArticle?.image?.contentUrl ??
        newsArticle?.image?.url ??
        newsArticle?.associatedMedia?.url


    const author =
        newsArticle?.author ?
            typeof newsArticle?.author === "string" ?
                newsArticle?.author :
                Array.isArray(newsArticle?.author) ?
                    newsArticle?.author.map((p: any) => typeof p === "string" ? p : typeof p === "object" ? p.name ? p.name : "" : "").join(", ") :
                    newsArticle?.author?.name :
            undefined


    const article: z.infer<typeof articleSchema> = {
        ...raw_article,
        thumbnail: /*onlineSchema?.thumbnailUrl ??*/ thumbnail ?? newsArticle?.thumbnail ?? raw_article.thumbnail,
        authors: author ?? (newsArticle?.author && typeof newsArticle?.author === 'string' ? newsArticle?.author : newsArticle?.author?.map((a: { name: string }) => a.name).join(", ") ?? raw_article.authors),
        keywords: /*onlineSchema?.keywords ??*/ newsArticle?.keywords ? typeof newsArticle?.keywords === "string" ? newsArticle?.keywords : newsArticle?.keywords?.join(", ") : undefined,
        title: /*onlineSchema?.headline ?? */ newsArticle?.headline ?? raw_article.title,
        url,
        source,
        crawl,
        content: newsArticle?.articleBody && newsArticle?.articleBody !== "undefined" ? newsArticle?.articleBody : raw_article.content
    }


    if (!(article.title && article.content && article.authors && article.thumbnail)) {
        return {
            error: true,
            message: "The essential data for the Article could be found."
        }
    }


    const dbArticle = await addArticle(article)

    await updateCrawls(crawl, {
        article: dbArticle?.id,
        verified: true
    })

    return { ...dbArticle, error: false }
}
export {
    getArticleFrom, getLocalSchema as isPageNewsArticle,
    validAndProcessUrl,
    articleAlreadyExists
}