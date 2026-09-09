export const BALANCE_INPUT_KEYS = [
  "targetBalance",
  "trading212InterestToday",
  "cashbackAllTime",
  "cashbackPending",
  "revolutFlexibleToday",
  "cash",
  "revolutCash",
  "trading212Cash",
] as const;

export type BalanceInputKey = (typeof BALANCE_INPUT_KEYS)[number];

export interface BalanceInputs {
  targetBalance: number;
  trading212InterestToday: number;
  cashbackAllTime: number;
  cashbackPending: number;
  revolutFlexibleToday: number;
  cash: number;
  revolutCash: number;
  trading212Cash: number;
}

export interface BalanceFixedValues {
  trading212InterestOpening: number;
  cashbackInvested: number;
  revolutFlexibleOpening: number;
}

export interface BalanceResults {
  trading212InterestThisYear: number;
  cashbackUninvested: number;
  cashbackReceived: number;
  revolutFlexibleThisYear: number;
  trading212InterestAdjustment: number;
  cashbackAdjustment: number;
  actualBalance: number;
  difference: number;
}

export interface BalanceCalculationResponse {
  inputs: BalanceInputs;
  fixedValues: BalanceFixedValues;
  notionTarget: number | null;
  warnings: string[];
}

export interface BalancePatchResponse {
  field: BalanceInputKey;
  value: number;
  savedAt: string;
}

export const BALANCE_INPUT_CELL_MAP: Record<BalanceInputKey, string> = {
  targetBalance: "F2",
  trading212InterestToday: "C4",
  cashbackAllTime: "C8",
  cashbackPending: "C11",
  revolutFlexibleToday: "C16",
  cash: "C20",
  revolutCash: "C21",
  trading212Cash: "C23",
};

export const BALANCE_FIXED_CELL_MAP = {
  trading212InterestOpening: "C3",
  cashbackInvested: "C9",
  revolutFlexibleOpening: "C15",
} as const satisfies Record<keyof BalanceFixedValues, string>;

export function isBalanceInputKey(value: unknown): value is BalanceInputKey {
  return (
    typeof value === "string" &&
    BALANCE_INPUT_KEYS.includes(value as BalanceInputKey)
  );
}
