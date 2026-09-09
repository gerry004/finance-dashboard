import { NextResponse } from "next/server";
import { parseDataSourceConfig } from "@/utils/notionConfig";

export async function GET() {
  // Authentication is handled by middleware.
  const config = parseDataSourceConfig();

  if (!config.ok) {
    return NextResponse.json({ error: config.error }, { status: 500 });
  }

  return NextResponse.json({ dataSources: config.dataSources });
}
