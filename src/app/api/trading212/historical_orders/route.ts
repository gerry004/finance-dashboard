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
        return handleTrading212Error(resp, errorText);
      }

      const data = await resp.text();
      const parsedData = parseTrading212Response(data);

      // Validate parsed data is an object (not plain text)
      if (typeof parsedData !== 'object' || parsedData === null) {
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

