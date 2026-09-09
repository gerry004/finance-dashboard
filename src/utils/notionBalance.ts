import { centsToEuros, eurosToCents } from "./balanceCalculation";

export interface NotionBalanceRecord {
  amount: number | null;
  type: string | null;
}

const INCLUDED_TYPES = new Set([
  "master",
  "income",
  "expenditure",
  "investment",
]);

export function calculateNotionBalance(
  records: NotionBalanceRecord[]
): number {
  const balanceCents = records.reduce((total, record) => {
    if (
      record.amount === null ||
      record.type === null ||
      !INCLUDED_TYPES.has(record.type.toLowerCase())
    ) {
      return total;
    }

    return total + eurosToCents(record.amount);
  }, 0);

  return centsToEuros(balanceCents);
}
