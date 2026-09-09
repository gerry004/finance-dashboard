import "server-only";

import { google } from "googleapis";
import {
  BALANCE_FIXED_CELL_MAP,
  BALANCE_INPUT_CELL_MAP,
  BALANCE_INPUT_KEYS,
  type BalanceFixedValues,
  type BalanceInputKey,
  type BalanceInputs,
} from "@/types/balanceCalculation";
import { normalizeEuroValue } from "./balanceCalculation";

const SHEET_NAME = "Checking Balance Calculation";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export interface StoredBalanceInputs
  extends Omit<BalanceInputs, "targetBalance"> {
  targetBalance: number | null;
}

export interface BalanceSheetState {
  inputs: StoredBalanceInputs;
  fixedValues: BalanceFixedValues;
}

function getSheetConfiguration() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_BALANCE_SHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error(
      "Google Sheets credentials or GOOGLE_BALANCE_SHEET_ID are not configured"
    );
  }

  return { clientEmail, privateKey, spreadsheetId };
}

function getSheetsClient() {
  const { clientEmail, privateKey } = getSheetConfiguration();
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: [SHEETS_SCOPE],
  });

  return google.sheets({ version: "v4", auth });
}

function toRange(cell: string): string {
  return `'${SHEET_NAME}'!${cell}`;
}

function parseCellNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? normalizeEuroValue(parsed) : null;
}

function requireCellNumber(value: unknown, cell: string): number {
  const parsed = parseCellNumber(value);
  if (parsed === null) {
    throw new Error(`Expected a numeric value in ${SHEET_NAME}!${cell}`);
  }
  return parsed;
}

export async function readBalanceSheetState(): Promise<BalanceSheetState> {
  const { spreadsheetId } = getSheetConfiguration();
  const sheets = getSheetsClient();
  const cells = [
    ...BALANCE_INPUT_KEYS.map((key) => BALANCE_INPUT_CELL_MAP[key]),
    ...Object.values(BALANCE_FIXED_CELL_MAP),
  ];
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: cells.map(toRange),
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const values = response.data.valueRanges ?? [];
  const valueAt = (index: number) => values[index]?.values?.[0]?.[0];

  const inputs: StoredBalanceInputs = {
    targetBalance: parseCellNumber(valueAt(0)),
    trading212InterestToday: requireCellNumber(valueAt(1), "C4"),
    cashbackAllTime: requireCellNumber(valueAt(2), "C8"),
    cashbackPending: requireCellNumber(valueAt(3), "C11"),
    revolutFlexibleToday: requireCellNumber(valueAt(4), "C16"),
    cash: requireCellNumber(valueAt(5), "C20"),
    revolutCash: requireCellNumber(valueAt(6), "C21"),
    trading212Cash: requireCellNumber(valueAt(7), "C23"),
  };
  const fixedValues: BalanceFixedValues = {
    trading212InterestOpening: requireCellNumber(valueAt(8), "C3"),
    cashbackInvested: requireCellNumber(valueAt(9), "C9"),
    revolutFlexibleOpening: requireCellNumber(valueAt(10), "C15"),
  };

  return { inputs, fixedValues };
}

export async function writeBalanceInput(
  field: BalanceInputKey,
  value: number
): Promise<number> {
  const { spreadsheetId } = getSheetConfiguration();
  const sheets = getSheetsClient();
  const normalizedValue = normalizeEuroValue(value);
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: toRange(BALANCE_INPUT_CELL_MAP[field]),
    valueInputOption: "RAW",
    includeValuesInResponse: true,
    responseValueRenderOption: "UNFORMATTED_VALUE",
    requestBody: { values: [[normalizedValue]] },
  });
  const savedValue = response.data.updatedData?.values?.[0]?.[0];

  return parseCellNumber(savedValue) ?? normalizedValue;
}
