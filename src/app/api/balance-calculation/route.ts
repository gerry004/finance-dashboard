import { NextResponse } from "next/server";
import {
  isBalanceInputKey,
  type BalanceCalculationResponse,
  type BalanceInputs,
  type BalancePatchResponse,
} from "@/types/balanceCalculation";
import { normalizeEuroValue } from "@/utils/balanceCalculation";
import {
  readBalanceSheetState,
  writeBalanceInput,
} from "@/utils/googleBalanceSheet";
import { fetchLiveNotionBalance } from "@/utils/notionBalanceServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const [sheetResult, notionResult] = await Promise.allSettled([
    readBalanceSheetState(),
    fetchLiveNotionBalance(),
  ]);

  if (sheetResult.status === "rejected") {
    console.error("Error reading balance calculation sheet:", sheetResult.reason);
    return NextResponse.json(
      { error: "Failed to load balance calculation values" },
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }

  const warnings: string[] = [];
  let notionTarget: number | null = null;

  if (notionResult.status === "fulfilled") {
    notionTarget = notionResult.value;
  } else {
    console.error("Error calculating live Notion balance:", notionResult.reason);
    warnings.push("Live Notion balance is currently unavailable.");
  }

  let targetBalance = sheetResult.value.inputs.targetBalance;
  if (targetBalance === null) {
    if (notionTarget === null) {
      return NextResponse.json(
        { error: "The saved target is empty and the live Notion balance is unavailable" },
        { status: 502, headers: NO_STORE_HEADERS }
      );
    }

    try {
      targetBalance = await writeBalanceInput("targetBalance", notionTarget);
    } catch (error) {
      console.error("Error initializing saved target:", error);
      return NextResponse.json(
        { error: "Failed to initialize the saved target" },
        { status: 502, headers: NO_STORE_HEADERS }
      );
    }
  }

  const inputs: BalanceInputs = {
    ...sheetResult.value.inputs,
    targetBalance,
  };
  const response: BalanceCalculationResponse = {
    inputs,
    fixedValues: sheetResult.value.fixedValues,
    notionTarget,
    warnings,
  };

  return NextResponse.json(response, { headers: NO_STORE_HEADERS });
}

export async function PATCH(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Request body must be an object" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const { field, value } = body as { field?: unknown; value?: unknown };
  if (!isBalanceInputKey(field) || typeof value !== "number" || !Number.isFinite(value)) {
    return NextResponse.json(
      { error: "Field must be editable and value must be a finite number" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const savedValue = await writeBalanceInput(
      field,
      normalizeEuroValue(value)
    );
    const response: BalancePatchResponse = {
      field,
      value: savedValue,
      savedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Error saving balance input:", error);
    return NextResponse.json(
      { error: "Failed to save the balance value" },
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }
}
