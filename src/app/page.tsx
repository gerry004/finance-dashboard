'use client';

import { NotionDatabaseData } from "@/types/notion";
import { NotionTable } from "@/components/NotionTable";
import { FinancialOverview } from "@/components/FinancialOverview";
import { MonthlyOverview } from "@/components/MonthlyOverview";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [data, setData] = useState<NotionDatabaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/notion`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const notionData = await response.json();
        setData(notionData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'An error occurred while fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="container mx-auto py-10">
        <div className="flex flex-col justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
          <p className="mt-4 text-xl text-gray-900 dark:text-white">Loading your financial data...</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">This may take a few moments</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto py-10">
        <div className="flex flex-col justify-center items-center h-screen">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
            <h3 className="text-lg font-bold mb-2">Error Loading Dashboard</h3>
            <p>{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="container mx-auto py-10">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <h3 className="font-bold">No Data Available</h3>
          <p>There is no financial data to display at this time.</p>
        </div>
      </main>
    );
  }
  
  return (
    <main className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Personal Finance Dashboard</h1>
      <MonthlyOverview data={data} />
      <FinancialOverview data={data} />
      <NotionTable data={data} />
    </main>
  );
}
