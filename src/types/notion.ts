import { DatabaseObjectResponse, PageObjectResponse, PartialPageObjectResponse, PartialDatabaseObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export interface NotionDatabaseSchema {
  properties: DatabaseObjectResponse['properties'];
}

export interface NotionDatabaseData {
  schema: NotionDatabaseSchema;
  pages: (PageObjectResponse | PartialPageObjectResponse | PartialDatabaseObjectResponse)[];
}