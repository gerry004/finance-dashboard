'use client';

import { Suspense } from "react";
import { NotionDataSourceData } from "@/types/notion";
import { NotionTable } from "@/components/NotionTable";
import { FinancialOverview } from "@/components/FinancialOverview";
import { MonthlyFinancialChart } from "@/components/MonthlyFinancialChart";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { TagFilterControl } from "@/components/TagFilterControl";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DataSourceSelector } from "@/components/DataSourceSelector";
import { DashboardNav } from "@/components/DashboardNav";
import { PasscodePrompt } from "@/components/PasscodePrompt";
import { extractAvailableTags } from "@/utils/notionHelpers";
import { handleUnauthorized } from "@/utils/authHelpers";
import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dataSourcesInitializedRef = useRef(false);
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [data, setData] = useState<NotionDataSourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excludedTags, setExcludedTags] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [availableDataSources, setAvailableDataSources] = useState<Record<string, string>>({});
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [chartFilter, setChartFilter] = useState<{ month: string; type: string } | null>(null);

  // Check authentication status on mount
  // Middleware handles API authentication, but we need to check client-side for UI
  useEffect(() => {
    const checkAuthStatus = async () => {
      // First check sessionStorage - if it doesn't exist, user closed the tab/browser
      const sessionAuth = sessionStorage.getItem('dashboard_authenticated');
      if (!sessionAuth) {
        setIsAuthenticated(false);
        return;
      }

      // If sessionStorage exists, verify with server
      try {
        const response = await fetch('/api/auth/verify', { credentials: 'include' });
        const data = await response.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          sessionStorage.setItem('dashboard_authenticated', 'true');
        } else {
          setIsAuthenticated(false);
          sessionStorage.removeItem('dashboard_authenticated');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
        sessionStorage.removeItem('dashboard_authenticated');
      }
    };

    checkAuthStatus();
  }, []);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  // Fetch available data sources on mount
  useEffect(() => {
    if (!isAuthenticated || dataSourcesInitializedRef.current) return;

    const fetchDataSources = async () => {
      try {
        const response = await fetch('/api/notion/data-sources', { credentials: 'include' });
        
        if (!response.ok) {
          if (handleUnauthorized(response)) {
            setIsAuthenticated(false);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const { dataSources } = await response.json();
        setAvailableDataSources(dataSources || {});
        dataSourcesInitializedRef.current = true;
        
        // Check URL params first, then set default
        const dataSourceNames = Object.keys(dataSources || {});
        if (dataSourceNames.length > 0) {
          const urlDataSource = searchParams.get('dataSource');
          let dataSourceToSelect: string;
          
          if (urlDataSource && dataSourceNames.includes(urlDataSource)) {
            dataSourceToSelect = urlDataSource;
          } else {
            dataSourceToSelect = dataSourceNames.includes('Finance 2026')
              ? 'Finance 2026' 
              : dataSourceNames[0];
          }
          
          setSelectedDataSource(dataSourceToSelect);
          
          // Update URL if it doesn't match
          if (urlDataSource !== dataSourceToSelect) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('dataSource', dataSourceToSelect);
            router.replace(`?${params.toString()}`, { scroll: false });
          }
        }
      } catch (error) {
        console.error('Error fetching data sources:', error);
        // Don't set error state here, just log it
      }
    };

    fetchDataSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Handle URL param changes (e.g., browser back/forward)
  const urlDataSourceRef = useRef<string | null>(null);
  useEffect(() => {
    if (!dataSourcesInitializedRef.current || !isAuthenticated) return;
    
    const urlDataSource = searchParams.get('dataSource');
    if (urlDataSourceRef.current === urlDataSource) return;
    urlDataSourceRef.current = urlDataSource;
    
    const dataSourceNames = Object.keys(availableDataSources);
    
    if (urlDataSource && dataSourceNames.includes(urlDataSource) && urlDataSource !== selectedDataSource) {
      setSelectedDataSource(urlDataSource);
      setExcludedTags(new Set());
      setStartDate(null);
      setEndDate(null);
      setChartFilter(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, availableDataSources, isAuthenticated]);

  // Fetch Notion data when authenticated and a data source is selected
  const dataFetchRef = useRef<string>('');
  useEffect(() => {
    if (!isAuthenticated || !selectedDataSource) return;
    
    const fetchKey = `${selectedDataSource}-${availableDataSources[selectedDataSource] || ''}`;
    if (dataFetchRef.current === fetchKey) return;
    dataFetchRef.current = fetchKey;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const dataSourceId = availableDataSources[selectedDataSource];
        const url = dataSourceId
          ? `/api/notion?dataSource=${encodeURIComponent(selectedDataSource)}`
          : '/api/notion';
        
        const response = await fetch(url, { credentials: 'include' });
        
        if (!response.ok) {
          if (handleUnauthorized(response)) {
            setIsAuthenticated(false);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const notionData = await response.json();
        setData(notionData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'An error occurred while fetching data');
        dataFetchRef.current = ''; // Reset on error to allow retry
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, selectedDataSource, availableDataSources]);


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

  const handleDataSourceChange = (dataSourceName: string) => {
    if (dataSourceName === selectedDataSource) return;
    
    // Update URL first, then state will sync via the URL effect
    const params = new URLSearchParams(searchParams.toString());
    params.set('dataSource', dataSourceName);
    router.replace(`?${params.toString()}`, { scroll: false });
    
    // Update state immediately for better UX
    setSelectedDataSource(dataSourceName);
    setExcludedTags(new Set());
    setStartDate(null);
    setEndDate(null);
    setChartFilter(null);
    // Reset fetch ref to allow new fetch for the new database
    dataFetchRef.current = '';
  };

  // Handle chart data point click
  const handleChartClick = (month: string, type: string) => {
    // If clicking the same filter, clear it
    if (chartFilter?.month === month && chartFilter?.type === type) {
      setChartFilter(null);
    } else {
      setChartFilter({ month, type });
    }
  };

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return <LoadingSkeleton type="dashboard" />;
  }

  // Show passcode prompt if not authenticated
  if (!isAuthenticated) {
    return <PasscodePrompt onAuthenticated={handleAuthenticated} />;
  }

  // Show loading while waiting for data sources to load or data to fetch
  if (!selectedDataSource || loading) {
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
    <main className="container mx-auto px-4 py-8 sm:py-10">
      <DashboardNav
        controls={
          <DataSourceSelector
            dataSources={availableDataSources}
            selectedDataSource={selectedDataSource}
            onDataSourceChange={handleDataSourceChange}
            loading={loading}
          />
        }
      />

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
      <MonthlyFinancialChart 
        data={data} 
        excludedTags={excludedTags}
        startDate={startDate}
        endDate={endDate}
        onDataPointClick={handleChartClick}
      />
      {chartFilter && (() => {
        const [year, month] = chartFilter.month.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const typeLabel = chartFilter.type === 'checking' ? 'contributing to checking' : chartFilter.type;
        return (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-blue-800">
              Filtered: {typeLabel} transactions in {monthLabel}
            </span>
            <button
              onClick={() => setChartFilter(null)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear filter
            </button>
          </div>
        );
      })()}
      <NotionTable 
        data={data} 
        excludedTags={excludedTags}
        startDate={startDate}
        endDate={endDate}
        chartFilter={chartFilter}
      />
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingSkeleton type="dashboard" />}>
      <DashboardContent />
    </Suspense>
  );
}
