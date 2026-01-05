'use client';

import { NotionDatabaseData } from "@/types/notion";
import { NotionTable } from "@/components/NotionTable";
import { FinancialOverview } from "@/components/FinancialOverview";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { TagFilterControl } from "@/components/TagFilterControl";
import { DateRangePicker } from "@/components/DateRangePicker";
import { extractAvailableTags } from "@/utils/notionHelpers";
import { useEffect, useState, useMemo } from "react";

export default function DashboardPage() {
  const [data, setData] = useState<NotionDatabaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excludedTags, setExcludedTags] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const url = `${baseUrl}/api/notion`;
        const response = await fetch(url);
        
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

  // Extract available tags from schema
  const availableTags = useMemo(() => {
    if (!data) return [];
    return extractAvailableTags(data.schema);
  }, [data]);

  // Handle date range change
  const handleDateRangeChange = (newStartDate: string | null, newEndDate: string | null) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  if (loading) {
    return <LoadingSkeleton type="dashboard" />;
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
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={handleDateRangeChange}
      />
      <TagFilterControl
        availableTags={availableTags}
        excludedTags={excludedTags}
        onExcludedTagsChange={setExcludedTags}
      />
      <FinancialOverview 
        data={data} 
        excludedTags={excludedTags}
        startDate={startDate}
        endDate={endDate}
      />
      <NotionTable 
        data={data} 
        excludedTags={excludedTags}
        startDate={startDate}
        endDate={endDate}
      />
    </main>
  );
}
