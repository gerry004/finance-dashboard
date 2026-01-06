import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.TRADING_212_API_KEY;
    const apiSecret = process.env.TRADING_212_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Missing required environment variables: TRADING_212_API_KEY or TRADING_212_API_SECRET" },
        { status: 500 }
      );
    }
    
    // Create Basic Auth header
    const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

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
      console.error('Trading 212 API error:', resp.status, errorText);
      return NextResponse.json(
        { error: `Trading 212 API error: ${resp.status}`, details: errorText },
        { status: resp.status }
      );
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

