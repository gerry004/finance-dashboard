import { describe, expect, it } from "vitest";
import { deriveTrading212BalanceSnapshot } from "./trading212Balance";

describe("deriveTrading212BalanceSnapshot", () => {
  it("sums available, pie, and reserved cash fields", () => {
    expect(
      deriveTrading212BalanceSnapshot({
        currency: "EUR",
        cash: {
          availableToTrade: 100.123,
          inPies: 20,
          reservedForOrders: 3.456,
        },
      })
    ).toEqual({
      cash: 123.58,
      currency: "EUR",
      warnings: [],
    });
  });

  it("rejects non-EUR account currency", () => {
    expect(
      deriveTrading212BalanceSnapshot({
        currency: "GBP",
        cash: {
          availableToTrade: 100,
          inPies: 20,
          reservedForOrders: 3,
        },
      })
    ).toEqual({
      cash: null,
      currency: "GBP",
      warnings: ["Trading 212 account currency is GBP, not EUR."],
    });
  });

  it("returns warnings for malformed cash fields", () => {
    expect(
      deriveTrading212BalanceSnapshot({
        currency: "EUR",
        cash: {
          availableToTrade: 100,
          inPies: "20",
          reservedForOrders: 3,
        },
      })
    ).toEqual({
      cash: null,
      currency: "EUR",
      warnings: ["Trading 212 cash field inPies is unavailable."],
    });
  });
});
