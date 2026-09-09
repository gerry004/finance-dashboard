import { describe, expect, it } from "vitest";
import type {
  BalanceFixedValues,
  BalanceInputs,
} from "../types/balanceCalculation";
import {
  calculateBalance,
  normalizeEuroValue,
  parseEuroInput,
} from "./balanceCalculation";

const inputs: BalanceInputs = {
  targetBalance: 17056.45,
  trading212InterestToday: 980.54,
  cashbackAllTime: 30.28,
  cashbackPending: 0,
  revolutFlexibleToday: 1005.74,
  cash: 168.75,
  revolutCash: 49.63,
  trading212Cash: 16066.93,
};

const fixedValues: BalanceFixedValues = {
  trading212InterestOpening: 765.44,
  cashbackInvested: 17.36,
  revolutFlexibleOpening: 999.16,
};

describe("calculateBalance", () => {
  it("reproduces the Google Sheet fixture exactly", () => {
    expect(calculateBalance(inputs, fixedValues)).toEqual({
      trading212InterestThisYear: 215.1,
      cashbackUninvested: 12.92,
      cashbackReceived: 12.92,
      revolutFlexibleThisYear: 6.58,
      trading212InterestAdjustment: -215.1,
      cashbackAdjustment: -12.92,
      actualBalance: 17056.45,
      difference: 0,
    });
  });

  it("subtracts pending cashback from the received adjustment", () => {
    const result = calculateBalance(
      { ...inputs, cashbackPending: 5 },
      fixedValues
    );

    expect(result.cashbackReceived).toBe(7.92);
    expect(result.actualBalance).toBe(17061.45);
    expect(result.difference).toBe(-5);
  });

  it("supports negative balances and normalizes decimal precision", () => {
    expect(normalizeEuroValue(-1.005)).toBe(-1.01);
    expect(
      calculateBalance({ ...inputs, cash: -20.004 }, fixedValues).actualBalance
    ).toBe(16867.7);
  });
});

describe("parseEuroInput", () => {
  it("accepts currency symbols and thousands separators", () => {
    expect(parseEuroInput("€17,056.45")).toBe(17056.45);
  });

  it("rejects blank, exponent, and non-numeric values", () => {
    expect(parseEuroInput(" ")).toBeNull();
    expect(parseEuroInput("1e3")).toBeNull();
    expect(parseEuroInput("unknown")).toBeNull();
  });
});
