import { describe, expect, it, vi } from "vitest";
import { syncTrading212Interest } from "./trading212Interest";

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("syncTrading212Interest", () => {
  it("paginates through January 1 and sums only current-year EUR interest", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              type: "INTEREST_ON_FREE_CASH",
              amount: 1.23,
              currency: "EUR",
              dateTime: "2026-09-18T01:00:00Z",
            },
            {
              type: "DEPOSIT",
              amount: 100,
              currency: "EUR",
              dateTime: "2026-05-01T12:00:00Z",
            },
            {
              type: "INTEREST_ON_FREE_CASH",
              amount: 99,
              currency: "EUR",
              dateTime: "2026-09-20T01:00:00Z",
            },
          ],
          nextPagePath:
            "/api/v0/equity/history/transactions?limit=50&cursor=abc&time=2026-05-01T12%3A00%3A00Z",
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              type: "INTEREST_ON_FREE_CASH",
              amount: 2.77,
              currency: "EUR",
              dateTime: "2026-01-01T01:00:00Z",
            },
            {
              type: "INTEREST_ON_FREE_CASH",
              amount: 50,
              currency: "EUR",
              dateTime: "2025-12-31T23:59:59Z",
            },
          ],
          nextPagePath:
            "/api/v0/equity/history/transactions?limit=50&cursor=older&time=2025-12-31T23%3A59%3A59Z",
        })
      );
    const sleepFn = vi.fn().mockResolvedValue(undefined);

    await expect(
      syncTrading212Interest({
        authHeader: "Basic test",
        fetcher: fetcher as typeof fetch,
        now: new Date("2026-09-19T12:00:00Z"),
        sleepFn,
      })
    ).resolves.toEqual({
      interestThisYear: 4,
      currency: "EUR",
      status: "synchronized",
      asOf: "2026-09-19T12:00:00.000Z",
      warnings: [],
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalledWith(10_100);
  });

  it("rejects non-EUR interest rather than returning a partial total", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [
          {
            type: "INTEREST_ON_FREE_CASH",
            amount: 1,
            currency: "GBP",
            dateTime: "2026-01-02T01:00:00Z",
          },
        ],
        nextPagePath: null,
      })
    );

    await expect(
      syncTrading212Interest({
        authHeader: "Basic test",
        fetcher: fetcher as typeof fetch,
        now: new Date("2026-09-19T12:00:00Z"),
        sleepFn: async () => undefined,
      })
    ).rejects.toThrow("interest currency is GBP, not EUR");
  });

  it("rejects unsafe and repeated pagination paths", async () => {
    const unsafeFetcher = vi.fn().mockResolvedValue(
      jsonResponse({ items: [], nextPagePath: "https://example.com/steal" })
    );
    await expect(
      syncTrading212Interest({
        authHeader: "Basic test",
        fetcher: unsafeFetcher as typeof fetch,
        now: new Date("2026-09-19T12:00:00Z"),
        sleepFn: async () => undefined,
      })
    ).rejects.toThrow("unsafe transaction pagination path");

    const repeatedPath =
      "/api/v0/equity/history/transactions?limit=50&cursor=same&time=2026-01-02T00%3A00%3A00Z";
    const loopFetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [], nextPagePath: repeatedPath }))
      .mockResolvedValueOnce(jsonResponse({ items: [], nextPagePath: repeatedPath }));
    await expect(
      syncTrading212Interest({
        authHeader: "Basic test",
        fetcher: loopFetcher as typeof fetch,
        now: new Date("2026-09-19T12:00:00Z"),
        sleepFn: async () => undefined,
      })
    ).rejects.toThrow("pagination loop was detected");
  });

  it("honors Retry-After when Trading 212 rate-limits a page", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429, { "retry-after": "2" }))
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              type: "DEPOSIT",
              amount: 1,
              currency: "EUR",
              dateTime: "2025-12-31T00:00:00Z",
            },
          ],
          nextPagePath: null,
        })
      );
    const sleepFn = vi.fn().mockResolvedValue(undefined);

    await syncTrading212Interest({
      authHeader: "Basic test",
      fetcher: fetcher as typeof fetch,
      now: new Date("2026-09-19T12:00:00Z"),
      sleepFn,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalledWith(2_000);
  });
});
