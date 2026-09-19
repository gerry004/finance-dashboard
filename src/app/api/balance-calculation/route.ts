import { NextResponse } from "next/server";
import type { BalanceCalculationResponse } from "@/types/balanceCalculation";
import { fetchLiveNotionBalance } from "@/utils/notionBalanceServer";
import { fetchTrading212BalanceSnapshot } from "@/utils/trading212Balance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const warnings: string[] = [];
  let notionTarget: number | null = null;
  const trading212 = await fetchTrading212BalanceSnapshot();

  try {
    notionTarget = await fetchLiveNotionBalance();
  } catch (error) {
    console.error("Error calculating live Notion balance:", error);
    warnings.push("Live Notion balance is currently unavailable.");
  }

  const response: BalanceCalculationResponse = {
    notionTarget,
    trading212,
    warnings,
  };

  return NextResponse.json(response, { headers: NO_STORE_HEADERS });
}
