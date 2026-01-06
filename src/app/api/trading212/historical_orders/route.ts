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

    const allOrders = [];
    const limit = 20;
    let nextPagePath: string | null = null;

    // Paginate to get all orders using nextPagePath
    while (true) {
      // Use nextPagePath if available, otherwise start with initial request
      const url = nextPagePath 
        ? `https://live.trading212.com${nextPagePath}`
        : `https://live.trading212.com/api/v0/equity/history/orders?limit=${limit}`;

      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: authHeader
        }
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Trading 212 API error:', resp.status, errorText);
        return NextResponse.json(
          { error: `Trading 212 API error: ${resp.status}`, details: errorText },
          { status: resp.status }
        );
      }

      const data = await resp.text();
      
      // Parse JSON response
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON response from Trading 212 API" },
          { status: 500 }
        );
      }

      // Extract items and nextPagePath from response
      if (parsedData?.items && Array.isArray(parsedData.items)) {
        allOrders.push(...parsedData.items);
        nextPagePath = parsedData.nextPagePath || null;
        
        // If nextPagePath is null, we've reached the end
        if (!nextPagePath) {
          break;
        }
      } else {
        // Unexpected response format
        console.warn('Unexpected response format from Trading 212 API:', parsedData);
        break;
      }
    }

    return NextResponse.json({ data: allOrders });
  } catch (error) {
    console.error("Error fetching Trading 212 historical orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch Trading 212 historical orders", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

