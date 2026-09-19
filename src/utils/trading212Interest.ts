import type { Trading212InterestResponse } from "@/types/balanceCalculation";
import {
  eurosToCents,
  normalizeEuroValue,
} from "./balanceCalculation";
import {
  createTrading212AuthHeader,
  getTrading212Credentials,
} from "./trading212";
import { sleep } from "./trading212Helpers";

const TRADING_212_ORIGIN = "https://live.trading212.com";
const TRANSACTIONS_PATH = "/api/v0/equity/history/transactions";
const FIRST_PAGE_URL = `${TRADING_212_ORIGIN}${TRANSACTIONS_PATH}?limit=50`;
const INTER_PAGE_DELAY_MS = 10_100;
const MAX_RETRIES = 3;
const MAX_PAGES = 1_000;
const CACHE_TTL_MS = 15 * 60 * 1_000;

interface InterestSyncOptions {
  authHeader?: string;
  fetcher?: typeof fetch;
  now?: Date;
  sleepFn?: (milliseconds: number) => Promise<void>;
}

interface CachedInterest {
  year: number;
  expiresAt: number;
  value: Trading212InterestResponse;
}

let cachedInterest: CachedInterest | null = null;
let interestSync: Promise<Trading212InterestResponse> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveNextPageUrl(nextPagePath: unknown): string | null {
  if (nextPagePath === null || nextPagePath === undefined) {
    return null;
  }
  if (typeof nextPagePath !== "string") {
    throw new Error("Trading 212 returned an invalid transaction pagination path.");
  }

  const url = new URL(nextPagePath, TRADING_212_ORIGIN);
  if (
    url.origin !== TRADING_212_ORIGIN ||
    url.pathname !== TRANSACTIONS_PATH
  ) {
    throw new Error("Trading 212 returned an unsafe transaction pagination path.");
  }

  return url.toString();
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return retryAfter * 1_000;
  }
  return INTER_PAGE_DELAY_MS * Math.pow(2, attempt);
}

async function fetchTransactionPage(
  url: string,
  authHeader: string,
  fetcher: typeof fetch,
  sleepFn: (milliseconds: number) => Promise<void>
): Promise<unknown> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetcher(url, {
      method: "GET",
      headers: { Authorization: authHeader },
      cache: "no-store",
    });

    if (response.status === 429 && attempt < MAX_RETRIES) {
      await sleepFn(retryDelay(response, attempt));
      continue;
    }
    if (!response.ok) {
      throw new Error(
        `Trading 212 transaction history failed with status ${response.status}.`
      );
    }

    return response.json();
  }

  throw new Error("Trading 212 transaction history retry limit was reached.");
}

export async function syncTrading212Interest(
  options: InterestSyncOptions = {}
): Promise<Trading212InterestResponse> {
  const now = options.now ?? new Date();
  const yearStart = Date.UTC(now.getUTCFullYear(), 0, 1);
  const nowTime = now.getTime();
  const fetcher = options.fetcher ?? fetch;
  const sleepFn = options.sleepFn ?? sleep;

  let authHeader = options.authHeader;
  if (!authHeader) {
    const credentials = getTrading212Credentials();
    if (credentials instanceof Response) {
      throw new Error("Trading 212 credentials are missing.");
    }
    authHeader = createTrading212AuthHeader(credentials);
  }

  let nextUrl: string | null = FIRST_PAGE_URL;
  let interestCents = 0;
  let pageCount = 0;
  let malformedItemCount = 0;
  const seenUrls = new Set<string>();

  while (nextUrl) {
    if (pageCount >= MAX_PAGES) {
      throw new Error("Trading 212 transaction pagination limit was reached.");
    }
    if (seenUrls.has(nextUrl)) {
      throw new Error("Trading 212 transaction pagination loop was detected.");
    }
    seenUrls.add(nextUrl);

    if (pageCount > 0) {
      await sleepFn(INTER_PAGE_DELAY_MS);
    }
    const rawPage = await fetchTransactionPage(
      nextUrl,
      authHeader,
      fetcher,
      sleepFn
    );
    pageCount += 1;

    if (!isRecord(rawPage) || !Array.isArray(rawPage.items)) {
      throw new Error("Trading 212 returned an invalid transaction page.");
    }

    let reachedYearStart = false;
    let malformedItems = 0;
    for (const item of rawPage.items) {
      if (!isRecord(item) || typeof item.dateTime !== "string") {
        malformedItems += 1;
        continue;
      }

      const transactionTime = Date.parse(item.dateTime);
      if (!Number.isFinite(transactionTime)) {
        malformedItems += 1;
        continue;
      }
      if (transactionTime < yearStart) {
        reachedYearStart = true;
      }
      if (
        item.type !== "INTEREST_ON_FREE_CASH" ||
        transactionTime < yearStart ||
        transactionTime > nowTime
      ) {
        continue;
      }
      if (item.currency !== "EUR") {
        throw new Error(
          `Trading 212 interest currency is ${String(item.currency)}, not EUR.`
        );
      }
      if (typeof item.amount !== "number" || !Number.isFinite(item.amount)) {
        throw new Error("Trading 212 returned an invalid interest amount.");
      }

      interestCents += eurosToCents(item.amount);
    }

    malformedItemCount += malformedItems;

    if (reachedYearStart) {
      nextUrl = null;
    } else {
      nextUrl = resolveNextPageUrl(rawPage.nextPagePath);
    }
  }

  if (malformedItemCount > 0) {
    throw new Error(
      `Trading 212 interest synchronization was incomplete because ${malformedItemCount} transaction record${
        malformedItemCount === 1 ? " was" : "s were"
      } malformed.`
    );
  }

  return {
    interestThisYear: normalizeEuroValue(interestCents / 100),
    currency: "EUR",
    status: "synchronized",
    asOf: now.toISOString(),
    warnings: [],
  };
}

export async function fetchTrading212InterestSnapshot(): Promise<Trading212InterestResponse> {
  const now = new Date();
  const year = now.getUTCFullYear();
  if (
    cachedInterest &&
    cachedInterest.year === year &&
    cachedInterest.expiresAt > now.getTime()
  ) {
    return cachedInterest.value;
  }

  if (!interestSync) {
    interestSync = syncTrading212Interest({ now })
      .then((value) => {
        cachedInterest = {
          year,
          expiresAt: Date.now() + CACHE_TTL_MS,
          value,
        };
        return value;
      })
      .finally(() => {
        interestSync = null;
      });
  }

  try {
    return await interestSync;
  } catch (error) {
    return {
      interestThisYear: null,
      currency: null,
      status: "unavailable",
      asOf: null,
      warnings: [
        error instanceof Error
          ? error.message
          : "Trading 212 interest history is unavailable.",
      ],
    };
  }
}

export function resetTrading212InterestCache(): void {
  cachedInterest = null;
  interestSync = null;
}
