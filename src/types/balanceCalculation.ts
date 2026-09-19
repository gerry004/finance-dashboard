export const BALANCE_INPUT_KEYS = [
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

export const DEFAULT_BALANCE_INPUTS: BalanceInputs = {
  trading212InterestToday: 980.54,
  cashbackAllTime: 30.28,
  cashbackPending: 0,
  revolutFlexibleToday: 1005.74,
  cash: 168.75,
  revolutCash: 49.63,
  trading212Cash: 16066.93,
};

export const BALANCE_FIXED_VALUES: BalanceFixedValues = {
  trading212InterestOpening: 765.44,
  cashbackInvested: 17.36,
  revolutFlexibleOpening: 999.16,
};
