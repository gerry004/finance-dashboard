import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";
import { NotionDatabaseData } from "@/types/notion";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

/**
 * Parse the NOTION_DATABASE_ID environment variable
 * Supports both JSON object format and single string format (backward compatibility)
 */
function parseDatabaseConfig(): Record<string, string> | null {
  const envValue = process.env.NOTION_DATABASE_ID;
  
  if (!envValue) {
    return null;
  }

  // Try to parse as JSON first (new format)
  try {
    const parsed = JSON.parse(envValue);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // If JSON parsing fails, treat as single database (old format)
    // Return as object with a default key
    return { "Default": envValue };
  }

  return null;
}

/**
 * Get the database ID to use
 * Priority: query parameter > "Finance 2026" > first database in config
 */
function getDatabaseId(databaseConfig: Record<string, string>, databaseIdParam?: string | null): string | null {
  // If databaseId query parameter is provided, use it
  if (databaseIdParam) {
    // Check if it's a database name (key) or ID (value)
    if (databaseConfig[databaseIdParam]) {
      return databaseConfig[databaseIdParam];
    }
    // Check if it's a direct ID
    const foundEntry = Object.entries(databaseConfig).find(([_, id]) => id === databaseIdParam);
    if (foundEntry) {
      return foundEntry[1];
    }
    // If not found in config, assume it's a direct ID
    return databaseIdParam;
  }

  // Default to "Finance 2026" if it exists
  if (databaseConfig["Finance 2026"]) {
    return databaseConfig["Finance 2026"];
  }

  // Otherwise use the first database
  const firstKey = Object.keys(databaseConfig)[0];
  return firstKey ? databaseConfig[firstKey] : null;
}

export async function GET(request: Request) {
  // Authentication is handled by middleware
  try {
    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
      return NextResponse.json(
        { error: "Missing required environment variables" },
        { status: 500 }
      );
    }

    const databaseConfig = parseDatabaseConfig();
    if (!databaseConfig) {
      return NextResponse.json(
        { error: "Invalid NOTION_DATABASE_ID configuration" },
        { status: 500 }
      );
    }

    // Get databaseId from query parameter
    const { searchParams } = new URL(request.url);
    const databaseIdParam = searchParams.get('databaseId');

    const databaseId = getDatabaseId(databaseConfig, databaseIdParam);
    if (!databaseId) {
      return NextResponse.json(
        { error: "No database ID found" },
        { status: 500 }
      );
    }
    
    const database = await notion.databases.retrieve({
      database_id: databaseId,
    });

    const pages = await getAllPages(databaseId);

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

async function getAllPages(databaseId: string) {
  const pages = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const queryOptions: any = {
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    };

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