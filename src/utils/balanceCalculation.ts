import type {
  BalanceFixedValues,
  BalanceInputs,
  BalanceResults,
} from "@/types/balanceCalculation";

export function eurosToCents(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Currency values must be finite numbers");
  }

  const sign = value < 0 ? -1 : 1;
  return sign * Math.round((Math.abs(value) + Number.EPSILON) * 100);
}

export function centsToEuros(value: number): number {
  return value / 100;
}

export function normalizeEuroValue(value: number): number {
  return centsToEuros(eurosToCents(value));
}

export function parseEuroInput(value: string): number | null {
  const normalized = value.trim().replace(/[€,\s]/g, "");

  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? normalizeEuroValue(parsed) : null;
}

export function calculateBalance(
  inputs: BalanceInputs,
  fixedValues: BalanceFixedValues,
  notionBalance: number | null
): BalanceResults {
  const inputCents = {
    trading212InterestToday: eurosToCents(inputs.trading212InterestToday),
    cashbackAllTime: eurosToCents(inputs.cashbackAllTime),
    cashbackPending: eurosToCents(inputs.cashbackPending),
    revolutFlexibleToday: eurosToCents(inputs.revolutFlexibleToday),
    cash: eurosToCents(inputs.cash),
    revolutCash: eurosToCents(inputs.revolutCash),
    trading212Cash: eurosToCents(inputs.trading212Cash),
  };
  const fixedCents = {
    trading212InterestOpening: eurosToCents(
      fixedValues.trading212InterestOpening
    ),
    cashbackInvested: eurosToCents(fixedValues.cashbackInvested),
    revolutFlexibleOpening: eurosToCents(
      fixedValues.revolutFlexibleOpening
    ),
  };

  const trading212InterestThisYear =
    inputCents.trading212InterestToday -
    fixedCents.trading212InterestOpening;
  const cashbackUninvested =
    inputCents.cashbackAllTime - fixedCents.cashbackInvested;
  const cashbackReceived =
    cashbackUninvested - inputCents.cashbackPending;
  const revolutFlexibleThisYear =
    inputCents.revolutFlexibleToday - fixedCents.revolutFlexibleOpening;
  const trading212InterestAdjustment = -trading212InterestThisYear;
  const cashbackAdjustment = -cashbackReceived;
  const actualBalance =
    inputCents.cash +
    inputCents.revolutCash +
    fixedCents.revolutFlexibleOpening +
    inputCents.trading212Cash +
    trading212InterestAdjustment +
    cashbackAdjustment;

  return {
    trading212InterestThisYear: centsToEuros(
      trading212InterestThisYear
    ),
    cashbackUninvested: centsToEuros(cashbackUninvested),
    cashbackReceived: centsToEuros(cashbackReceived),
    revolutFlexibleThisYear: centsToEuros(revolutFlexibleThisYear),
    trading212InterestAdjustment: centsToEuros(
      trading212InterestAdjustment
    ),
    cashbackAdjustment: centsToEuros(cashbackAdjustment),
    actualBalance: centsToEuros(actualBalance),
    difference:
      notionBalance === null
        ? null
        : centsToEuros(eurosToCents(notionBalance) - actualBalance),
  };
}
