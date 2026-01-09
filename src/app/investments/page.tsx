'use client';

import { Trading212Position, Trading212HistoricalOrder, Trading212Dividend } from "@/types/trading212";
import { InvestmentsOverview } from "@/components/InvestmentsOverview";
import { HistoricalOrdersTable } from "@/components/HistoricalOrdersTable";
import { RealizedProfitLoss } from "@/components/RealizedProfitLoss";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PasscodePrompt } from "@/components/PasscodePrompt";
import { handleUnauthorized } from "@/utils/authHelpers";
import { fetchWithRetry, sleep } from "@/utils/apiHelpers";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function InvestmentsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [trading212Positions, setTrading212Positions] = useState<Trading212Position[] | null>(null);
  const [trading212Loading, setTrading212Loading] = useState(true);
  const [trading212Error, setTrading212Error] = useState<string | null>(null);
  const [historicalOrders, setHistoricalOrders] = useState<Trading212HistoricalOrder[] | null>(null);
  const [historicalOrdersLoading, setHistoricalOrdersLoading] = useState(true);
  const [historicalOrdersError, setHistoricalOrdersError] = useState<string | null>(null);
  const [historicalDividends, setHistoricalDividends] = useState<Trading212Dividend[] | null>(null);
  const [historicalDividendsLoading, setHistoricalDividendsLoading] = useState(true);
  const [historicalDividendsError, setHistoricalDividendsError] = useState<string | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      const sessionAuth = sessionStorage.getItem('dashboard_authenticated');
      if (!sessionAuth) {
        setIsAuthenticated(false);
        return;
      }

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

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return <LoadingSkeleton type="dashboard" />;
  }

  // Show passcode prompt if not authenticated
  if (!isAuthenticated) {
    return <PasscodePrompt onAuthenticated={handleAuthenticated} />;
  }

  return (
    <main className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Personal Finance Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-6 py-2 rounded-lg font-semibold transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Checking
          </Link>
          <Link
            href="/investments"
            className="px-6 py-2 rounded-lg font-semibold transition-colors bg-blue-600 text-white"
          >
            Investments
          </Link>
        </div>
      </div>

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
    </main>
  );
}

