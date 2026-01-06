import { NextResponse } from "next/server";
import { getTrading212Credentials, createTrading212AuthHeader } from "@/utils/trading212";
import { handleTrading212Error, parseTrading212Response } from "@/utils/trading212Helpers";

export async function GET() {
  // Authentication is handled by middleware
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
    const parsedData = parseTrading212Response(data);

    return NextResponse.json({ data: parsedData });
  } catch (error) {
    console.error("Error fetching Trading 212 data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Trading 212 data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

