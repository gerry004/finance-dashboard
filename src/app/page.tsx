'use client';

import { NotionDatabaseData } from "@/types/notion";
import { Trading212Position, Trading212HistoricalOrder, Trading212Dividend } from "@/types/trading212";
import { NotionTable } from "@/components/NotionTable";
import { FinancialOverview } from "@/components/FinancialOverview";
import { InvestmentsOverview } from "@/components/InvestmentsOverview";
import { HistoricalOrdersTable } from "@/components/HistoricalOrdersTable";
import { RealizedProfitLoss } from "@/components/RealizedProfitLoss";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { TagFilterControl } from "@/components/TagFilterControl";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PasscodePrompt } from "@/components/PasscodePrompt";
import { extractAvailableTags } from "@/utils/notionHelpers";
import { handleUnauthorized } from "@/utils/authHelpers";
import { fetchWithRetry, sleep } from "@/utils/apiHelpers";
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
  const [historicalOrders, setHistoricalOrders] = useState<Trading212HistoricalOrder[] | null>(null);
  const [historicalOrdersLoading, setHistoricalOrdersLoading] = useState(true);
  const [historicalOrdersError, setHistoricalOrdersError] = useState<string | null>(null);
  const [historicalDividends, setHistoricalDividends] = useState<Trading212Dividend[] | null>(null);
  const [historicalDividendsLoading, setHistoricalDividendsLoading] = useState(true);
  const [historicalDividendsError, setHistoricalDividendsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'checking' | 'investments'>('checking');

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

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/notion', { credentials: 'include' });
        
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

  // Fetch all Trading 212 data sequentially to avoid rate limits
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchTrading212Data = async () => {
      // Helper function to fetch and parse API response
      const fetchApiData = async (
        endpoint: string,
        setData: (data: any) => void,
        setLoading: (loading: boolean) => void,
        setError: (error: string | null) => void,
        errorMessage: string
      ) => {
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetchWithRetry(endpoint, { credentials: 'include' });
          
          if (!response.ok) {
            if (handleUnauthorized(response)) {
              setIsAuthenticated(false);
              return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const responseData = await response.json();
          
          // Extract data from response
          if (responseData.data) {
            if (Array.isArray(responseData.data)) {
              setData(responseData.data);
            } else if (responseData.data.error) {
              setError(responseData.data.error);
            } else {
              setData([]);
            }
          } else if (responseData.error) {
            setError(responseData.error);
          } else {
            setData([]);
          }
        } catch (error) {
          console.error(errorMessage, error);
          setError(error instanceof Error ? error.message : errorMessage);
        } finally {
          setLoading(false);
        }
      };

      // Fetch sequentially with delays to avoid rate limits
      await fetchApiData(
        '/api/trading212',
        (data) => setTrading212Positions(Array.isArray(data) ? data : []),
        setTrading212Loading,
        setTrading212Error,
        'Error fetching Trading 212 positions'
      );

      await sleep(500); // Delay between requests
      
      await fetchApiData(
        '/api/trading212/historical_orders',
        (data) => setHistoricalOrders(Array.isArray(data) ? data : []),
        setHistoricalOrdersLoading,
        setHistoricalOrdersError,
        'Error fetching Trading 212 historical orders'
      );

      await sleep(500); // Delay between requests
      
      await fetchApiData(
        '/api/trading212/historical_dividends',
        (data) => setHistoricalDividends(Array.isArray(data) ? data : []),
        setHistoricalDividendsLoading,
        setHistoricalDividendsError,
        'Error fetching Trading 212 historical dividends'
      );
    };

    fetchTrading212Data();
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
        <>
          <InvestmentsOverview 
            positions={trading212Positions}
            orders={historicalOrders}
            dividends={historicalDividends}
            loading={trading212Loading || historicalDividendsLoading}
            error={trading212Error || historicalDividendsError}
          />
          <RealizedProfitLoss 
            orders={historicalOrders}
            positions={trading212Positions}
            dividends={historicalDividends}
            loading={historicalOrdersLoading || trading212Loading || historicalDividendsLoading}
            error={historicalOrdersError || trading212Error || historicalDividendsError}
          />
          <HistoricalOrdersTable 
            orders={historicalOrders}
            loading={historicalOrdersLoading}
            error={historicalOrdersError}
          />
        </>
      )}
    </main>
  );
}
