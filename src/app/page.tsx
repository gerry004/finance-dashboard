'use client';

import { NotionDatabaseData } from "@/types/notion";
import { NotionTable } from "@/components/NotionTable";
import { FinancialOverview } from "@/components/FinancialOverview";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [data, setData] = useState<NotionDatabaseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/notion`);
        const notionData = await response.json();
        setData(notionData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="container mx-auto py-10">
        <h1 className="text-4xl font-bold mb-8">Finance Dashboard</h1>
        <div>Loading...</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container mx-auto py-10">
        <h1 className="text-4xl font-bold mb-8">Finance Dashboard</h1>
        <div>Error loading data</div>
      </main>
    );
  }
  
  return (
    <main className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Finance Dashboard</h1>
      <FinancialOverview data={data} />
      <NotionTable data={data} />
    </main>
  );
}
