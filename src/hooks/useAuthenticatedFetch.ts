/**
 * Custom hook for authenticated data fetching with error handling
 * Note: Authentication is handled by middleware (src/middleware.ts)
 */

import { useState, useEffect } from 'react';
import { handleUnauthorized } from '@/utils/authHelpers';

interface UseAuthenticatedFetchOptions<T> {
  url: string;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  onUnauthorized?: () => void;
}

interface UseAuthenticatedFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAuthenticatedFetch<T = any>({
  url,
  enabled = true,
  onSuccess,
  onError,
  onUnauthorized,
}: UseAuthenticatedFetchOptions<T>): UseAuthenticatedFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, { credentials: 'include' });
      
      if (!response.ok) {
        // Middleware returns 401 for unauthenticated requests
        if (response.status === 401) {
          handleUnauthorized(response);
          setError('Unauthorized');
          onError?.('Unauthorized');
          onUnauthorized?.();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      setData(responseData);
      onSuccess?.(responseData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while fetching data';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

