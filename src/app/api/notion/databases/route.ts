import { NextResponse } from "next/server";

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

export async function GET() {
  // Authentication is handled by middleware
  try {
    const databases = parseDatabaseConfig();

    if (!databases) {
      return NextResponse.json(
        { error: "NOTION_DATABASE_ID environment variable is not configured" },
        { status: 500 }
      );
    }

    return NextResponse.json({ databases });
  } catch (error) {
    console.error("Error parsing database configuration:", error);
    return NextResponse.json(
      { error: "Failed to parse database configuration" },
      { status: 500 }
    );
  }
}

