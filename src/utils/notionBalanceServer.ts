import "server-only";

import {
  Client,
  isFullPage,
  type QueryDataSourceParameters,
} from "@notionhq/client";
import { calculateNotionBalance } from "./notionBalance";
import { parseDataSourceConfig } from "./notionConfig";

function resolveBalanceDataSource(
  dataSources: Record<string, string>
): string | null {
  const year = new Date().getFullYear();
  const preferredNames = [
    `Finance ${year}`,
    `Finance (${String(year).slice(-2)})`,
  ];

  for (const name of preferredNames) {
    if (dataSources[name]) {
      return dataSources[name];
    }
  }

  return Object.values(dataSources)[0] ?? null;
}

export async function fetchLiveNotionBalance(): Promise<number> {
  if (!process.env.NOTION_API_KEY) {
    throw new Error("NOTION_API_KEY is not configured");
  }

  const config = parseDataSourceConfig();
  if (!config.ok) {
    throw new Error(config.error);
  }

  const dataSourceId = resolveBalanceDataSource(config.dataSources);
  if (!dataSourceId) {
    throw new Error("No Notion data source is configured");
  }

  const notion = new Client({
    auth: process.env.NOTION_API_KEY,
    notionVersion: "2025-09-03",
  });
  const records: Array<{ amount: number | null; type: string | null }> = [];
  let cursor: string | undefined;

  while (true) {
    const queryOptions: QueryDataSourceParameters = {
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    };
    const response = await notion.dataSources.query(queryOptions);

    for (const page of response.results.filter(isFullPage)) {
      const amountProperty = page.properties.Amount;
      const typeProperty = page.properties.Type;

      records.push({
        amount:
          amountProperty?.type === "number" ? amountProperty.number : null,
        type:
          typeProperty?.type === "select"
            ? typeProperty.select?.name ?? null
            : null,
      });
    }

    if (!response.next_cursor) {
      break;
    }
    cursor = response.next_cursor;
  }

  return calculateNotionBalance(records);
}
