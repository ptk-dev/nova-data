import { Card, Title } from "@tremor/react";
import { BarList } from "../../components/ui/BarList";
import React, { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";

export default function AnalyticsPage() {
  const [counts, setCounts] = useState<any>({});
  const { setTab } = useAppContext()

  useEffect(() => setTab("Analytics"), []);

  useEffect(() => {
    fetch('http://localhost:3001/api/analytics/articlesCount')
      .then(res => res.json())
      .then(setCounts);
  }, []);

  const data = Object.entries(counts).map(([source, count]) => ({
    name: source,
    value: Number(count),
  }));


  return (
    <div>
      <Title className="font-bold text-2xl">Article Count per Source</Title>
      <Card>
        <BarList data={data} />
      </Card>
    </div>
  );
}

