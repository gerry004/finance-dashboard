export const BALANCE_INPUT_KEYS = [
  "cashbackAllTime",
  "cashbackPending",
  "revolutFlexibleToday",
  "cash",
  "revolutCash",
] as const;

export type BalanceInputKey = (typeof BALANCE_INPUT_KEYS)[number];

export interface BalanceInputs {
  cashbackAllTime: number;
  cashbackPending: number;
  revolutFlexibleToday: number;
  cash: number;
  revolutCash: number;
}

export interface BalanceFixedValues {
  cashbackInvested: number;
  revolutFlexibleOpening: number;
}

export interface BalanceLiveValues {
  trading212Cash: number | null;
  trading212InterestThisYear: number | null;
}

export interface BalanceResults {
  trading212InterestThisYear: number | null;
  cashbackUninvested: number;
  cashbackReceived: number;
  revolutFlexibleThisYear: number;
  trading212InterestAdjustment: number | null;
  cashbackAdjustment: number;
  actualBalance: number | null;
  difference: number | null;
}

export interface BalanceCalculationResponse {
  notionTarget: number | null;
  trading212?: {
    cash: number | null;
    currency: string | null;
    warnings: string[];
  };
  warnings: string[];
}

export interface Trading212InterestResponse {
  interestThisYear: number | null;
  currency: string | null;
  status: "synchronized" | "unavailable";
  asOf: string | null;
  warnings: string[];
}

export const DEFAULT_BALANCE_INPUTS: BalanceInputs = {
  cashbackAllTime: 30.28,
  cashbackPending: 0,
  revolutFlexibleToday: 1005.74,
  cash: 168.75,
  revolutCash: 49.63,
};

export const BALANCE_FIXED_VALUES: BalanceFixedValues = {
  cashbackInvested: 17.36,
  revolutFlexibleOpening: 999.16,
};
