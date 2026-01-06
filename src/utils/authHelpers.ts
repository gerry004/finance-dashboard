/**
 * Client-side authentication helpers
 * Note: Authentication is handled by middleware (src/middleware.ts)
 */

/**
 * Handle 401 unauthorized responses by clearing client-side auth state
 * Middleware returns 401 for unauthenticated requests, so we clear sessionStorage
 * Returns true if auth was cleared, false otherwise
 */
export function handleUnauthorized(response: Response): boolean {
  if (response.status === 401) {
    sessionStorage.removeItem('dashboard_authenticated');
    return true;
  }
  return false;
}

