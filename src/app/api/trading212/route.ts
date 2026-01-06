import { NextResponse } from "next/server";
import { requireAuth } from "@/utils/auth";
import { getTrading212Credentials, createTrading212AuthHeader, handleTrading212Error } from "@/utils/trading212";

export async function GET() {
  // Check authentication
  const authError = await requireAuth();
  if (authError) return authError;

  try {
    const credentials = getTrading212Credentials();
    if (credentials instanceof NextResponse) {
      return credentials;
    }
    
    const authHeader = createTrading212AuthHeader(credentials);

    const resp = await fetch(
      'https://live.trading212.com/api/v0/equity/portfolio',
      {
        method: 'GET',
        headers: {
          Authorization: authHeader
        }
      }
    );

    if (!resp.ok) {
      const errorText = await resp.text();
      return handleTrading212Error(resp, errorText);
    }

    const data = await resp.text();
    
    // Try to parse as JSON, but if it fails, return as text
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch {
      parsedData = data;
    }

    return NextResponse.json({ data: parsedData });
  } catch (error) {
    console.error("Error fetching Trading 212 data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Trading 212 data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

