import {
  Client,
  isFullDataSource,
  isFullPage,
  type PageObjectResponse,
  type QueryDataSourceParameters,
} from "@notionhq/client";
import { NextResponse } from "next/server";
import { NotionDataSourceData } from "@/types/notion";
import {
  parseDataSourceConfig,
  resolveDataSourceId,
} from "@/utils/notionConfig";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  notionVersion: "2025-09-03",
});

export async function GET(request: Request) {
  // Authentication is handled by middleware
  try {
    if (!process.env.NOTION_API_KEY) {
      return NextResponse.json(
        { error: "NOTION_API_KEY environment variable is not configured" },
        { status: 500 }
      );
    }

    const config = parseDataSourceConfig();
    if (!config.ok) {
      return NextResponse.json(
        { error: config.error },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const selector = searchParams.get("dataSource");
    const dataSourceId = resolveDataSourceId(config.dataSources, selector);

    if (!dataSourceId) {
      return NextResponse.json(
        { error: "Unknown Notion data source" },
        { status: 400 }
      );
    }

    const dataSource = await notion.dataSources.retrieve({
      data_source_id: dataSourceId,
    });

    if (!isFullDataSource(dataSource)) {
      throw new Error("Notion returned a partial data source");
    }

    const response: NotionDataSourceData = {
      schema: {
        properties: dataSource.properties,
      },
      pages: await getAllPages(dataSourceId),
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

async function getAllPages(dataSourceId: string): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const queryOptions: QueryDataSourceParameters = {
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    };

    const { results, next_cursor } = await notion.dataSources.query(queryOptions);
    pages.push(...results.filter(isFullPage));

    if (!next_cursor) break;
    cursor = next_cursor;
  }

  return pages;
}
