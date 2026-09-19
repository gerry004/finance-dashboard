import { describe, expect, it } from "vitest";
import { DEFAULT_BALANCE_INPUTS } from "../types/balanceCalculation";
import {
  getBalanceStorageKey,
  hasStoredBalanceInput,
  loadStoredBalanceInputs,
  removeLegacyLiveBalanceInputs,
  removeStoredBalanceInput,
  saveStoredBalanceInput,
  type BalanceStorage,
} from "./balanceStorage";

function createStorage(initial: Record<string, string> = {}): BalanceStorage {
  const values = new Map(Object.entries(initial));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
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
    });

    expect(loadStoredBalanceInputs(storage, DEFAULT_BALANCE_INPUTS)).toEqual({
      ...DEFAULT_BALANCE_INPUTS,
      cash: 42.13,
    });
  });

  it("saves normalized values independently by field", () => {
    const storage = createStorage();

    expect(saveStoredBalanceInput(storage, "cash", -1.005)).toBe(-1.01);
      expect(loadStoredBalanceInputs(storage, DEFAULT_BALANCE_INPUTS).cash).toBe(
      -1.01
    );
  });

  it("detects and clears saved values", () => {
    const storage = createStorage();

    expect(hasStoredBalanceInput(storage, "cashbackPending")).toBe(false);
    saveStoredBalanceInput(storage, "cashbackPending", 12.34);
    expect(hasStoredBalanceInput(storage, "cashbackPending")).toBe(true);

    removeStoredBalanceInput(storage, "cashbackPending");
    expect(hasStoredBalanceInput(storage, "cashbackPending")).toBe(false);
  });

  it("removes legacy live Trading 212 overrides", () => {
    const cashKey = "finance-dashboard.balance-calculation.v1.trading212Cash";
    const interestKey =
      "finance-dashboard.balance-calculation.v1.trading212InterestToday";
    const storage = createStorage({
      [cashKey]: "12.34",
      [interestKey]: "56.78",
    });

    removeLegacyLiveBalanceInputs(storage);

    expect(storage.getItem(cashKey)).toBeNull();
    expect(storage.getItem(interestKey)).toBeNull();
  });
});
