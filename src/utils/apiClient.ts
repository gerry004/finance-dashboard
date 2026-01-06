/**
 * Client-side utility functions for making authenticated API calls
 */

const getBaseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * Make an authenticated fetch request with automatic 401 handling
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const baseUrl = getBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  
  return fetch(fullUrl, {
    ...options,
    credentials: 'include', // Always include cookies
  });
}

/**
 * Handle 401 unauthorized responses by clearing auth state
 * Returns true if auth was cleared, false otherwise
 */
export function handleUnauthorized(response: Response): boolean {
  if (response.status === 401) {
    sessionStorage.removeItem('dashboard_authenticated');
    return true;
  }
  return false;
}

