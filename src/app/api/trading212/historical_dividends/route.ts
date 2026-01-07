import { NextResponse } from "next/server";
import { getTrading212Credentials, createTrading212AuthHeader } from "@/utils/trading212";
import { handleTrading212Error, parseTrading212Response, sleep } from "@/utils/trading212Helpers";

export async function GET() {
  // Authentication is handled by middleware
  try {
    const credentials = getTrading212Credentials();
    if (credentials instanceof NextResponse) {
      return credentials;
    }
    
    const authHeader = createTrading212AuthHeader(credentials);

    const allDividends = [];
    const limit = 20;
    let nextPagePath: string | null = null;

    // Paginate to get all dividends using nextPagePath
    while (true) {
      // Use nextPagePath if available, otherwise start with initial request
      const url = nextPagePath 
        ? `https://live.trading212.com${nextPagePath}`
        : `https://live.trading212.com/api/v0/equity/history/dividends?limit=${limit}`;

      // Retry logic for rate limiting
      let resp: Response | null = null;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries <= maxRetries) {
        resp = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: authHeader
          }
        });

        if (resp.status === 429 && retries < maxRetries) {
          // Rate limited - wait with exponential backoff
          const delay = 1000 * Math.pow(2, retries);
          console.warn(`Rate limited (429) on dividends pagination. Retrying in ${delay}ms...`);
          await sleep(delay);
          retries++;
          continue;
        }

        if (!resp.ok) {
          const errorText = await resp.text();
          return handleTrading212Error(resp, errorText);
        }

        break;
      }

      // TypeScript now knows resp is assigned (loop always executes at least once)
      if (!resp) {
        return NextResponse.json(
          { error: "Failed to fetch Trading 212 historical dividends" },
          { status: 500 }
        );
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
        allDividends.push(...parsedData.items);
        nextPagePath = parsedData.nextPagePath || null;
        
        // If nextPagePath is null, we've reached the end
        if (!nextPagePath) {
          break;
        }
        
        // Add a small delay between pagination requests to avoid rate limiting
        await sleep(200);
      } else {
        // Unexpected response format
        console.warn('Unexpected response format from Trading 212 API:', parsedData);
        break;
      }
    }

    return NextResponse.json({ data: allDividends });
  } catch (error) {
    console.error("Error fetching Trading 212 historical dividends:", error);
    return NextResponse.json(
      { error: "Failed to fetch Trading 212 historical dividends", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

