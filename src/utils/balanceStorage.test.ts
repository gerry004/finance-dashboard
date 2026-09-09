import { describe, expect, it } from "vitest";
import { DEFAULT_BALANCE_INPUTS } from "../types/balanceCalculation";
import {
  getBalanceStorageKey,
  hasStoredBalanceInput,
  loadStoredBalanceInputs,
  saveStoredBalanceInput,
  type BalanceStorage,
} from "./balanceStorage";

function createStorage(initial: Record<string, string> = {}): BalanceStorage {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("balance storage", () => {
  it("uses defaults when no browser values have been saved", () => {
    expect(loadStoredBalanceInputs(createStorage(), DEFAULT_BALANCE_INPUTS)).toEqual(
      DEFAULT_BALANCE_INPUTS
    );
  });

  it("loads valid saved values and ignores corrupted values", () => {
    const storage = createStorage({
      [getBalanceStorageKey("cash")]: "42.126",
      [getBalanceStorageKey("revolutCash")]: "not-a-number",
      [getBalanceStorageKey("targetBalance")]: "",
    });

    expect(loadStoredBalanceInputs(storage, DEFAULT_BALANCE_INPUTS)).toEqual({
      ...DEFAULT_BALANCE_INPUTS,
      cash: 42.13,
    });
    expect(hasStoredBalanceInput(storage, "targetBalance")).toBe(false);
  });

  it("saves normalized values independently by field", () => {
    const storage = createStorage();

    expect(saveStoredBalanceInput(storage, "cash", -1.005)).toBe(-1.01);
    expect(hasStoredBalanceInput(storage, "cash")).toBe(true);
    expect(hasStoredBalanceInput(storage, "targetBalance")).toBe(false);
    expect(loadStoredBalanceInputs(storage, DEFAULT_BALANCE_INPUTS).cash).toBe(
      -1.01
    );
  });
});
