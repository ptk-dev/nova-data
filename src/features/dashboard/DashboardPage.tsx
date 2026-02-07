import { Card, Title, Text, Metric } from "@tremor/react";
import { useAppContext } from "../../context/AppContext";
import { useEffect, useState } from "react";
import React from "react"

export default function DashboardPage() {
  const [status, setStatus] = useState<any>({});
  const { setTab } = useAppContext()

  useEffect(() => setTab("Dashboard"), []);
  useEffect(() => {
    fetch('http://localhost:3001/api/crawl/status').then(res => res.json()).then(setStatus);
  }, []);

  const totalSources = Object.keys(status).length;
  const complete = Object.values(status).filter((s: any) => s.status === 'complete').length;
  const errors = Object.values(status).filter((s: any) => s.errors);



  return (
    <div className="space-y-6">
      <Title>Crawler Progress</Title>
      <Card>
        <Metric>Total Sources: {totalSources}</Metric>
        <Text>Completed: {complete}, Errors: {errors.length}</Text>

        {!!errors.length && (
          <Card>
            <div className="font-bold text-2xl">Errors</div>
            {errors.map((e: any, i) => (
              <text className="text-gray-700">{JSON.stringify(e)}</text>
            ))}
          </Card>)
        }
      </Card>
    </div>
  );
}
