'use client';

import { NotionDatabaseData } from "@/types/notion";
import { NotionTable } from "@/components/NotionTable";
import { FinancialOverview } from "@/components/FinancialOverview";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { TagFilterControl } from "@/components/TagFilterControl";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DatabaseSelector } from "@/components/DatabaseSelector";
import { PasscodePrompt } from "@/components/PasscodePrompt";
import { extractAvailableTags } from "@/utils/notionHelpers";
import { handleUnauthorized } from "@/utils/authHelpers";
import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const databasesInitializedRef = useRef(false);
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [data, setData] = useState<NotionDatabaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excludedTags, setExcludedTags] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [availableDatabases, setAvailableDatabases] = useState<Record<string, string>>({});
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');

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

  // Fetch available databases on mount
  useEffect(() => {
    if (!isAuthenticated || databasesInitializedRef.current) return;

    const fetchDatabases = async () => {
      try {
        const response = await fetch('/api/notion/databases', { credentials: 'include' });
        
        if (!response.ok) {
          if (handleUnauthorized(response)) {
            setIsAuthenticated(false);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const { databases } = await response.json();
        setAvailableDatabases(databases || {});
        databasesInitializedRef.current = true;
        
        // Check URL params first, then set default
        const databaseNames = Object.keys(databases || {});
        if (databaseNames.length > 0) {
          const urlDatabase = searchParams.get('db');
          let databaseToSelect: string;
          
          if (urlDatabase && databaseNames.includes(urlDatabase)) {
            // Use database from URL if it exists
            databaseToSelect = urlDatabase;
          } else {
            // Default to "Finance 2026" if exists, otherwise first database
            databaseToSelect = databaseNames.includes('Finance 2026') 
              ? 'Finance 2026' 
              : databaseNames[0];
          }
          
          setSelectedDatabase(databaseToSelect);
          
          // Update URL if it doesn't match
          if (urlDatabase !== databaseToSelect) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('db', databaseToSelect);
            router.replace(`?${params.toString()}`, { scroll: false });
          }
        }
      } catch (error) {
        console.error('Error fetching databases:', error);
        // Don't set error state here, just log it
      }
    };

    fetchDatabases();
  }, [isAuthenticated, searchParams, router]);

  // Handle URL param changes (e.g., browser back/forward)
  useEffect(() => {
    if (!databasesInitializedRef.current || !isAuthenticated) return;
    
    const urlDatabase = searchParams.get('db');
    const databaseNames = Object.keys(availableDatabases);
    
    if (urlDatabase && databaseNames.includes(urlDatabase) && urlDatabase !== selectedDatabase) {
      setSelectedDatabase(urlDatabase);
      // Reset filters when switching databases
      setExcludedTags(new Set());
      setStartDate(null);
      setEndDate(null);
    }
  }, [searchParams, availableDatabases, selectedDatabase, isAuthenticated]);

  // Fetch Notion data when authenticated and database is selected
  useEffect(() => {
    if (!isAuthenticated || !selectedDatabase) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const databaseId = availableDatabases[selectedDatabase];
        const url = databaseId 
          ? `/api/notion?databaseId=${encodeURIComponent(selectedDatabase)}`
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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, selectedDatabase, availableDatabases]);


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

  // Handle database change
  const handleDatabaseChange = (databaseName: string) => {
    setSelectedDatabase(databaseName);
    // Reset filters when switching databases
    setExcludedTags(new Set());
    setStartDate(null);
    setEndDate(null);
    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    params.set('db', databaseName);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return <LoadingSkeleton type="dashboard" />;
  }

  // Show passcode prompt if not authenticated
  if (!isAuthenticated) {
    return <PasscodePrompt onAuthenticated={handleAuthenticated} />;
  }

  // Show loading while waiting for databases to load or data to fetch
  if (!selectedDatabase || loading) {
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Personal Finance Dashboard</h1>
        <div className="flex items-center gap-2">
          <DatabaseSelector
            databases={availableDatabases}
            selectedDatabase={selectedDatabase}
            onDatabaseChange={handleDatabaseChange}
            loading={loading}
          />
          <Link
            href="/"
            className="px-6 py-2 rounded-lg font-semibold transition-colors bg-blue-600 text-white"
          >
            Checking
          </Link>
          <Link
            href="/investments"
            className="px-6 py-2 rounded-lg font-semibold transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Investments
          </Link>
        </div>
      </div>

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
