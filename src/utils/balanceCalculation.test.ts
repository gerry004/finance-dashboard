import { describe, expect, it } from "vitest";
import {
  BALANCE_FIXED_VALUES,
  DEFAULT_BALANCE_INPUTS,
} from "../types/balanceCalculation";
import {
  calculateBalance,
  normalizeEuroValue,
  parseEuroInput,
} from "./balanceCalculation";

const inputs = DEFAULT_BALANCE_INPUTS;
const fixedValues = BALANCE_FIXED_VALUES;
const liveValues = {
  trading212Cash: 16066.93,
  trading212InterestThisYear: 215.1,
};

describe("calculateBalance", () => {
  it("reproduces the built-in fixture exactly", () => {
    expect(calculateBalance(inputs, fixedValues, liveValues, 17056.45)).toEqual({
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
      fixedValues,
      liveValues,
      17056.45
    );

    expect(result.cashbackReceived).toBe(7.92);
    expect(result.actualBalance).toBe(17061.45);
    expect(result.difference).toBe(-5);
  });

  it("supports negative balances and normalizes decimal precision", () => {
    expect(normalizeEuroValue(-1.005)).toBe(-1.01);
    expect(
      calculateBalance(
        { ...inputs, cash: -20.004 },
        fixedValues,
        liveValues,
        17056.45
      ).actualBalance
    ).toBe(16867.7);
  });

  it("leaves the difference unavailable without a live Notion balance", () => {
    expect(
      calculateBalance(inputs, fixedValues, liveValues, null).difference
    ).toBeNull();
  });

  it("makes dependent totals unavailable when live Trading 212 data is missing", () => {
    const result = calculateBalance(
      inputs,
      fixedValues,
      { trading212Cash: null, trading212InterestThisYear: null },
      17056.45
    );

    expect(result.trading212InterestThisYear).toBeNull();
    expect(result.trading212InterestAdjustment).toBeNull();
    expect(result.actualBalance).toBeNull();
    expect(result.difference).toBeNull();
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
