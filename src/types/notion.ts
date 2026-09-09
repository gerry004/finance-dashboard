import type { DataSourceObjectResponse, PageObjectResponse } from "@notionhq/client";

export interface NotionDataSourceSchema {
  properties: DataSourceObjectResponse["properties"];
}

export interface NotionDataSourceData {
  schema: NotionDataSourceSchema;
  pages: PageObjectResponse[];
}
