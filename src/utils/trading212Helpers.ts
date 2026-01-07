import { NextResponse } from "next/server";

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse Trading212 API response, handling both JSON and text responses
 * @param data - The raw response data (text or JSON string)
 * @returns Parsed data object or the original data if parsing fails
 */
export function parseTrading212Response(data: string): any {
  try {
    return JSON.parse(data);
  } catch {
    // If parsing fails, return as-is (might be plain text or empty)
    return data;
  }
}

/**
 * Handle Trading212 API error response with consistent formatting
 * @param resp - The fetch Response object
 * @param errorText - The error text from the response
 * @returns NextResponse with error details
 */
export function handleTrading212Error(resp: Response, errorText: string): NextResponse {
  console.error('Trading 212 API error:', resp.status, errorText);
  
  let errorDetails: any = { error: `Trading 212 API error: ${resp.status}` };
  
  // Try to parse error details if available
  try {
    const parsedError = JSON.parse(errorText);
    errorDetails = { ...errorDetails, details: parsedError };
  } catch {
    // If not JSON, include as text
    if (errorText) {
      errorDetails.details = errorText;
    }
  }
  
  return NextResponse.json(errorDetails, { status: resp.status });
}

