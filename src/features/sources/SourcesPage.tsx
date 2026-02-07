import { Card, Title, Text, Button } from "@tremor/react";
import { useAppContext } from "../../context/AppContext";
import { useEffect, useState } from "react";
import React from "react"
import { FeatureCard } from "../../components/ui/card";

export default function SourcesPage() {
  const [sources, setSources] = useState<any[]>([]);
  const { setTab } = useAppContext()

  useEffect(() => setTab("Sources"), []);

  useEffect(() => {
    fetch('http://localhost:3001/api/sources').then(res => res.json()).then(setSources);
  }, []);

  return (
    <div className="space-y-4">
      <Card className="flex m-0 p-3 border-b-2 border-gray-100 justify-between items-center">
        <div>
          <Text className="text-xs text-gray-500">Total Articles: {sources.reduce((acc, source) => acc + source.articles.length, 0)}</Text>
        </div>
        <div className="flex flex-col text-center">
          <Text className="font-medium">Sources</Text>
        </div>
        <Button className="hover:cursor-pointer" onClick={() => fetch(`http://localhost:3001/api/crawl?sourceId=${source.id}`, { method: "POST" })}>
          Start Crawl
        </Button>
      </Card>
      {sources.map(source => (
        <Card key={source.id} className="flex m-0 p-3 border-b-2 border-gray-100 justify-between items-center">
          <div>
            <Text className="font-medium">{source.name}</Text>
            <Text className="text-xs text-gray-500">Articles: {source.articles.length}</Text>
          </div>
          <div className="flex gap-2">
            <Button className="hover:cursor-pointer" onClick={() => fetch(`http://localhost:3001/api/crawl?sourceId=${source.id}`, { method: "POST" })}>
              Start Crawl
            </Button>
            <Button className="hover:cursor-pointer" onClick={() => window.location.href = "/sources/" + source.id}>
              View
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
