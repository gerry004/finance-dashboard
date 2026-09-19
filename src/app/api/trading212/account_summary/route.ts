import { NextResponse } from "next/server";
import {
  fetchTrading212AccountSummary,
  Trading212BalanceError,
} from "@/utils/trading212Balance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const data = await fetchTrading212AccountSummary();
    return NextResponse.json({ data }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Error fetching Trading 212 account summary:", error);
    const status =
      error instanceof Trading212BalanceError && error.status
        ? error.status
        : 500;
    return NextResponse.json(
      {
        error: "Failed to fetch Trading 212 account summary",
        details: error instanceof Error ? error.message : String(error),
      },
      { status, headers: NO_STORE_HEADERS }
    );
  }
}
