import { NextResponse } from "next/server";
import { fetchTrading212InterestSnapshot } from "@/utils/trading212Interest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await fetchTrading212InterestSnapshot();
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
