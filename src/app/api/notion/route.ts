import { Client } from "@notionhq/client";
import { NextResponse } from "next/server";
import { NotionDatabaseData } from "@/types/notion";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export async function GET() {
  try {
    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
      return NextResponse.json(
        { error: "Missing required environment variables" },
        { status: 500 }
      );
    } 
    
    const database = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID!,
    });

    const pages = await getAllPages();

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

async function getAllPages() {
  const pages = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const { results, next_cursor } = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID!,
      start_cursor: cursor,
      page_size: 100,
    });

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