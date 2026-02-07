import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "@tremor/react";
import React from "react";
import { useParams } from "react-router";
import Table from "react-table-lite"

async function fetchSource(id: string) {
    function chunkArray<T>(arr: T[], size: number): T[][] {
        return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
            arr.slice(i * size, i * size + size)
        );
    }

    const response = (await fetch(`http://localhost:3001/api/analytics/query?collection=sources&filter=id="${id}"`)).json()
    const source = (await response)[0]
    if (!source) {
        throw new Error("Source not found")
    }
    if ((source.articles && source.articles.length != 0)) {
        const articlesChunks = chunkArray(source.articles, 50)
        const res = await Promise.all(articlesChunks.map(async (articles) => (await fetch(`http://localhost:3001/api/analytics/query?collection=articles&query=id=\"${articles.join("\"||id=\"")}\"`)).json()))
        const articles = res.flat()
        source.articles = articles
    }

    return source
}

const actions = {
    process: (row: any) => (
              <button className="bg-red-800" onClick={() => console.log("Processing article:", row)}>Process</button>
        )
}


export function SourcePage() {
    const { id } = useParams<{ id: string }>()

    const { data: source, error, status } = useQuery({
        queryKey: ["source"],
        queryFn: () => fetchSource(id!)
    });

    return (
        <>
            <Card className="flex m-0 p-3 border-b-2 border-gray-100 justify-between items-center">
                <Button className="hover:cursor-pointer" onClick={() => window.location.href = "/sources"}>
                    Back
                </Button>
                <div className="flex flex-col text-center">
                    <a href={source?.url} target="_blank" rel="noopener noreferrer">
                        <p className="font-medium text-black">{source?.name}</p>
                    </a>
                    <p className="text-xs text-gray-500">
                        Total Articles:&nbsp;
                        <span className="text-blue-400">{source?.articles.length}</span> •&nbsp;
                        <span className="text-green-400">{source?.articles.filter((article: any) => article.valid).length}</span> •&nbsp;
                        <span className="text-red-400">{source?.articles.filter((article: any) => !article.valid).length}</span> •&nbsp;
                        <span className="text-gray-500">{source?.articles.filter((article: any) => article.processed).length}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="text-xs text-gray-500 text-center align-middle p-3">
                        Last Crawled: {source?.last_crawl ? new Date(source.last_crawl).toLocaleDateString() : "Never"}
                    </div>
                    <Button className="hover:cursor-pointer" onClick={() => fetch(`http://localhost:3001/api/crawl?sourceId=${source.id}`, { method: "POST" })}>
                        Start Crawl
                    </Button>
                </div>
            </Card>
            {source?.articles &&
                <Table
                    data={source.articles}
                    headers={[
                        "title",
                        "authors",
                        "date"
                    ]}
                    customHeaders={{
                        title: "Title",
                        authors: "Authors",
                        date: "Date"
                    }}
                    customRenderActions={actions}
                    // actionTypes={["process", "edit", "delete", "view"]}
                    showActions={true}
                />
            }
        </>
    )
}