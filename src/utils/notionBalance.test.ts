import { describe, expect, it } from "vitest";
import {
  BALANCE_FIXED_CELL_MAP,
  BALANCE_INPUT_CELL_MAP,
  BALANCE_INPUT_KEYS,
  isBalanceInputKey,
} from "../types/balanceCalculation";
import { calculateNotionBalance } from "./notionBalance";

describe("calculateNotionBalance", () => {
  it("sums signed checking amounts and excludes creditors", () => {
    expect(
      calculateNotionBalance([
        { type: "Master", amount: 1000 },
        { type: "Income", amount: 250.5 },
        { type: "Expenditure", amount: -100.25 },
        { type: "Investment", amount: -300 },
        { type: "Investment", amount: 125 },
        { type: "Creditors", amount: 5000 },
        { type: null, amount: 25 },
      ])
    ).toBe(975.25);
  });
});

describe("balance sheet cell allow-list", () => {
  it("maps every editable field to only the approved blue cells", () => {
    expect(Object.keys(BALANCE_INPUT_CELL_MAP)).toEqual(BALANCE_INPUT_KEYS);
    expect(BALANCE_INPUT_CELL_MAP).toEqual({
      targetBalance: "F2",
      trading212InterestToday: "C4",
      cashbackAllTime: "C8",
      cashbackPending: "C11",
      revolutFlexibleToday: "C16",
      cash: "C20",
      revolutCash: "C21",
      trading212Cash: "C23",
    });
    expect(Object.values(BALANCE_INPUT_CELL_MAP)).not.toContain("C26");
    expect(Object.values(BALANCE_INPUT_CELL_MAP)).not.toContain("F4");
  });

  it("keeps fixed baseline cells outside the editable allow-list", () => {
    expect(BALANCE_FIXED_CELL_MAP).toEqual({
      trading212InterestOpening: "C3",
      cashbackInvested: "C9",
      revolutFlexibleOpening: "C15",
    });
    expect(isBalanceInputKey("cash")).toBe(true);
    expect(isBalanceInputKey("C26")).toBe(false);
    expect(isBalanceInputKey("trading212InterestOpening")).toBe(false);
  });
});
