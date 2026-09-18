import { normalizeEuroValue } from "./balanceCalculation";
import {
  createTrading212AuthHeader,
  getTrading212Credentials,
} from "./trading212";
import {
  parseTrading212Response,
  sleep,
} from "./trading212Helpers";

const TRADING_212_ACCOUNT_SUMMARY_URL =
  "https://live.trading212.com/api/v0/equity/account/summary";

export interface Trading212BalanceSnapshot {
  cash: number | null;
  currency: string | null;
  warnings: string[];
}

export class Trading212BalanceError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "Trading212BalanceError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readFiniteNumber(
  record: Record<string, unknown>,
  key: string,
  warnings: string[]
): number | null {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  warnings.push(`Trading 212 cash field ${key} is unavailable.`);
  return null;
}

export function deriveTrading212BalanceSnapshot(
  accountSummary: unknown
): Trading212BalanceSnapshot {
  const warnings: string[] = [];

  if (!isRecord(accountSummary)) {
    return {
      cash: null,
      currency: null,
      warnings: ["Trading 212 account summary response was not valid."],
    };
  }

  const currency =
    typeof accountSummary.currency === "string"
      ? accountSummary.currency
      : null;
  if (currency !== "EUR") {
    return {
      cash: null,
      currency,
      warnings: [
        currency
          ? `Trading 212 account currency is ${currency}, not EUR.`
          : "Trading 212 account currency is unavailable.",
      ],
    };
  }

  const cash = accountSummary.cash;
  if (!isRecord(cash)) {
    return {
      cash: null,
      currency,
      warnings: ["Trading 212 cash summary is unavailable."],
    };
  }

  const availableToTrade = readFiniteNumber(
    cash,
    "availableToTrade",
    warnings
  );
  const inPies = readFiniteNumber(cash, "inPies", warnings);
  const reservedForOrders = readFiniteNumber(
    cash,
    "reservedForOrders",
    warnings
  );

  if (
    availableToTrade === null ||
    inPies === null ||
    reservedForOrders === null
  ) {
    return { cash: null, currency, warnings };
  }

  return {
    cash: normalizeEuroValue(availableToTrade + inPies + reservedForOrders),
    currency,
    warnings,
  };
}

export async function fetchTrading212AccountSummary(): Promise<unknown> {
  const credentials = getTrading212Credentials();
  if (credentials instanceof Response) {
    throw new Trading212BalanceError("Trading 212 credentials are missing.");
  }

  const authHeader = createTrading212AuthHeader(credentials);
  let response: Response | null = null;
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    response = await fetch(TRADING_212_ACCOUNT_SUMMARY_URL, {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
    });

    if (response.status === 429 && attempt < maxRetries) {
      await sleep(1000 * Math.pow(2, attempt));
      continue;
    }

    break;
  }

  if (!response) {
    throw new Trading212BalanceError(
      "Trading 212 account summary request failed."
    );
  }

  if (!response.ok) {
    throw new Trading212BalanceError(
      `Trading 212 account summary failed with status ${response.status}.`,
      response.status
    );
  }

  return parseTrading212Response(await response.text());
}

export async function fetchTrading212BalanceSnapshot(): Promise<Trading212BalanceSnapshot> {
  try {
    const accountSummary = await fetchTrading212AccountSummary();
    return deriveTrading212BalanceSnapshot(accountSummary);
  } catch (error) {
    return {
      cash: null,
      currency: null,
      warnings: [
        error instanceof Error
          ? error.message
          : "Trading 212 account summary is unavailable.",
      ],
    };
  }
}
