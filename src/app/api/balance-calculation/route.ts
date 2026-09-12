import { NextResponse } from "next/server";
import type { BalanceCalculationResponse } from "@/types/balanceCalculation";
import { fetchLiveNotionBalance } from "@/utils/notionBalanceServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const warnings: string[] = [];
  let notionTarget: number | null = null;

  try {
    notionTarget = await fetchLiveNotionBalance();
  } catch (error) {
    console.error("Error calculating live Notion balance:", error);
    warnings.push("Live Notion balance is currently unavailable.");
  }

  const response: BalanceCalculationResponse = {
    notionTarget,
    warnings,
  };

  return NextResponse.json(response, { headers: NO_STORE_HEADERS });
}
