import {
  BALANCE_INPUT_KEYS,
  type BalanceInputKey,
  type BalanceInputs,
} from "../types/balanceCalculation";
import { normalizeEuroValue } from "./balanceCalculation";

const STORAGE_PREFIX = "finance-dashboard.balance-calculation.v1";
const LEGACY_LIVE_FIELDS = [
  "trading212Cash",
  "trading212InterestToday",
] as const;

export interface BalanceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

function parseStoredValue(value: string | null): number | null {
  if (value === null || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? normalizeEuroValue(parsed) : null;
}

export function getBalanceStorageKey(field: BalanceInputKey): string {
  return `${STORAGE_PREFIX}.${field}`;
}

export function loadStoredBalanceInputs(
  storage: BalanceStorage,
  defaults: BalanceInputs
): BalanceInputs {
  const inputs = { ...defaults };

  for (const field of BALANCE_INPUT_KEYS) {
    const storedValue = parseStoredValue(
      storage.getItem(getBalanceStorageKey(field))
    );
    if (storedValue !== null) {
      inputs[field] = storedValue;
    }
  }

  return inputs;
}

export function hasStoredBalanceInput(
  storage: BalanceStorage,
  field: BalanceInputKey
): boolean {
  return parseStoredValue(storage.getItem(getBalanceStorageKey(field))) !== null;
}

export function saveStoredBalanceInput(
  storage: BalanceStorage,
  field: BalanceInputKey,
  value: number
): number {
  const normalizedValue = normalizeEuroValue(value);
  storage.setItem(getBalanceStorageKey(field), String(normalizedValue));
  return normalizedValue;
}

export function removeStoredBalanceInput(
  storage: BalanceStorage,
  field: BalanceInputKey
): void {
  const key = getBalanceStorageKey(field);
  if (storage.removeItem) {
    storage.removeItem(key);
    return;
  }

  storage.setItem(key, "");
}

export function removeLegacyLiveBalanceInputs(storage: BalanceStorage): void {
  for (const field of LEGACY_LIVE_FIELDS) {
    const key = `${STORAGE_PREFIX}.${field}`;
    if (storage.removeItem) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, "");
    }
  }
}
