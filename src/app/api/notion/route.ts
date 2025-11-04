import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";
import { NotionDatabaseData } from "@/types/notion";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export async function GET(request: Request) {
  try {
    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
      return NextResponse.json(
        { error: "Missing required environment variables" },
        { status: 500 }
      );
    }
    
    // Parse query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    const database = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID!,
    });

    const pages = await getAllPages(startDate, endDate);

    const response: NotionDatabaseData = {
      schema: {
        properties: database.properties,
      },
      pages: pages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching Notion data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Notion data" },
      { status: 500 }
    );
  }
}

async function getAllPages(startDate: string | null, endDate: string | null) {
  const pages = [];
  let cursor: string | undefined = undefined;

  // Build date filter if dates are provided
  let filter: any = undefined;
  
  if (startDate && endDate) {
    // Both start and end dates provided
    filter = {
      and: [
        {
          property: "Created",
          date: {
            on_or_after: startDate
          }
        },
        {
          property: "Created",
          date: {
            on_or_before: endDate
          }
        }
      ]
    };
  } else if (startDate) {
    // Only start date provided
    filter = {
      property: "Created",
      date: {
        on_or_after: startDate
      }
    };
  } else if (endDate) {
    // Only end date provided
    filter = {
      property: "Created",
      date: {
        on_or_before: endDate
      }
    };
  }

  while (true) {
    const queryOptions: any = {
      database_id: process.env.NOTION_DATABASE_ID!,
      start_cursor: cursor,
      page_size: 100,
    };

    // Add filter if it exists
    if (filter) {
      queryOptions.filter = filter;
    }

    const { results, next_cursor } = await notion.databases.query(queryOptions);

    // Filter to include only full PageObjects
    const fullPages = results.filter((page): page is PageObjectResponse => 
      'properties' in page
    );
    
    pages.push(...fullPages);

    if (!next_cursor) break;
    cursor = next_cursor;
  }

  return pages;
} 