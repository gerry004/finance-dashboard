'use client';

import { NotionDatabaseData } from "@/types/notion";
import { Trading212Position } from "@/types/trading212";
import { NotionTable } from "@/components/NotionTable";
import { FinancialOverview } from "@/components/FinancialOverview";
import { InvestmentsOverview } from "@/components/InvestmentsOverview";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { TagFilterControl } from "@/components/TagFilterControl";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PasscodePrompt } from "@/components/PasscodePrompt";
import { extractAvailableTags } from "@/utils/notionHelpers";
import { authenticatedFetch, handleUnauthorized } from "@/utils/apiClient";
import { useEffect, useState, useMemo } from "react";

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [data, setData] = useState<NotionDatabaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excludedTags, setExcludedTags] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [trading212Positions, setTrading212Positions] = useState<Trading212Position[] | null>(null);
  const [trading212Loading, setTrading212Loading] = useState(true);
  const [trading212Error, setTrading212Error] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'checking' | 'investments'>('checking');

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      // First check sessionStorage
      const sessionAuth = sessionStorage.getItem('dashboard_authenticated');
      if (sessionAuth === 'true') {
        // Verify with server
        try {
          const response = await authenticatedFetch('/api/auth/verify');
          const data = await response.json();
          if (data.authenticated) {
            setIsAuthenticated(true);
          } else {
            sessionStorage.removeItem('dashboard_authenticated');
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Error checking auth:', error);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await authenticatedFetch('/api/notion');
        
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
  }, [isAuthenticated]);

  // Fetch Trading 212 open positions
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchTrading212Positions = async () => {
      setTrading212Loading(true);
      setTrading212Error(null);
      try {
        const response = await authenticatedFetch('/api/trading212');
        
        if (!response.ok) {
          if (handleUnauthorized(response)) {
            setIsAuthenticated(false);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const trading212Data = await response.json();
        console.log('Trading 212 Open Positions:', trading212Data);
        
        // Extract positions from the response
        // The API returns { data: [...] } so we need to handle that
        if (trading212Data.data) {
          // Check if data is an array
          if (Array.isArray(trading212Data.data)) {
            setTrading212Positions(trading212Data.data);
          } else if (trading212Data.data.error) {
            setTrading212Error(trading212Data.data.error);
          } else {
            // If data is an object, try to find positions array
            setTrading212Positions([]);
          }
        } else if (trading212Data.error) {
          setTrading212Error(trading212Data.error);
        } else {
          setTrading212Positions([]);
        }
      } catch (error) {
        console.error('Error fetching Trading 212 positions:', error);
        setTrading212Error(error instanceof Error ? error.message : 'An error occurred while fetching Trading 212 positions');
      } finally {
        setTrading212Loading(false);
      }
    };

    fetchTrading212Positions();
  }, [isAuthenticated]);

  // Fetch Trading 212 historical orders
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchHistoricalOrders = async () => {
      try {
        const response = await authenticatedFetch('/api/trading212/historical_orders');
        
        if (!response.ok) {
          if (handleUnauthorized(response)) {
            setIsAuthenticated(false);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const ordersData = await response.json();
        console.log('Trading 212 Historical Orders:', ordersData);
      } catch (error) {
        console.error('Error fetching Trading 212 historical orders:', error);
      }
    };

    fetchHistoricalOrders();
  }, [isAuthenticated]);

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

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return <LoadingSkeleton type="dashboard" />;
  }

  // Show passcode prompt if not authenticated
  if (!isAuthenticated) {
    return <PasscodePrompt onAuthenticated={handleAuthenticated} />;
  }

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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Personal Finance Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('checking')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'checking'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Checking
          </button>
          <button
            onClick={() => setActiveTab('investments')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'investments'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Investments
          </button>
        </div>
      </div>

      {activeTab === 'checking' && (
        <>
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
        </>
      )}

      {activeTab === 'investments' && (
        <InvestmentsOverview 
          positions={trading212Positions}
          loading={trading212Loading}
          error={trading212Error}
        />
      )}
    </main>
  );
}
