const NOTION_ID_PATTERN = /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export type DataSourceConfigResult =
  | { ok: true; dataSources: Record<string, string> }
  | { ok: false; error: string };

function isNotionId(value: unknown): value is string {
  return typeof value === "string" && NOTION_ID_PATTERN.test(value.trim());
}

export function parseDataSourceConfig(
  envValue = process.env.NOTION_DATA_SOURCE_ID
): DataSourceConfigResult {
  const value = envValue?.trim();

  if (!value) {
    return {
      ok: false,
      error: "NOTION_DATA_SOURCE_ID environment variable is not configured",
    };
  }

  if (!value.startsWith("{")) {
    if (!isNotionId(value)) {
      return {
        ok: false,
        error: "Invalid NOTION_DATA_SOURCE_ID configuration",
      };
    }

    return { ok: true, dataSources: { Default: value } };
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Expected a JSON object");
    }

    const entries = Object.entries(parsed);
    if (
      entries.length === 0 ||
      entries.some(([name, id]) => !name.trim() || !isNotionId(id))
    ) {
      throw new Error("Expected named Notion data source IDs");
    }

    return {
      ok: true,
      dataSources: Object.fromEntries(
        entries.map(([name, id]) => [name.trim(), (id as string).trim()])
      ),
    };
  } catch {
    return {
      ok: false,
      error: "Invalid NOTION_DATA_SOURCE_ID configuration",
    };
  }
}

export function resolveDataSourceId(
  dataSources: Record<string, string>,
  selector: string | null
): string | null {
  if (selector) {
    return dataSources[selector] ??
      Object.values(dataSources).find((id) => id === selector) ??
      null;
  }

  return Object.values(dataSources)[0] ?? null;
}
