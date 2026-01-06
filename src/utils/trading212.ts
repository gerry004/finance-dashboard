import { NextResponse } from "next/server";

export interface Trading212Credentials {
  apiKey: string;
  apiSecret: string;
}

/**
 * Get Trading212 credentials from environment variables
 * Returns credentials or an error response
 */
export function getTrading212Credentials(): Trading212Credentials | NextResponse {
  const apiKey = process.env.TRADING_212_API_KEY;
  const apiSecret = process.env.TRADING_212_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Missing required environment variables: TRADING_212_API_KEY or TRADING_212_API_SECRET" },
      { status: 500 }
    );
  }

  return { apiKey, apiSecret };
}

/**
 * Create Basic Auth header for Trading212 API
 */
export function createTrading212AuthHeader(credentials: Trading212Credentials): string {
  return 'Basic ' + Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64');
}

/**
 * Handle Trading212 API error response
 */
export function handleTrading212Error(resp: Response, errorText: string): NextResponse {
  console.error('Trading 212 API error:', resp.status, errorText);
  return NextResponse.json(
    { error: `Trading 212 API error: ${resp.status}`, details: errorText },
    { status: resp.status }
  );
}

