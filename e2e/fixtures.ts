import type { NotionDataSourceData } from "@/types/notion";
import type {
  Trading212Dividend,
  Trading212HistoricalOrder,
  Trading212Position,
} from "@/types/trading212";

type NotionProperty = Record<string, unknown>;

const tagOptions = [
  { id: "salary", name: "Salary", color: "green" },
  { id: "rent", name: "Rent", color: "red" },
  { id: "food", name: "Food", color: "yellow" },
  { id: "brokerage", name: "Brokerage", color: "blue" },
  { id: "refund", name: "Refund", color: "purple" },
];

const schema = {
  properties: {
    Description: {
      id: "Description",
      name: "Description",
      type: "title",
      title: {},
    },
    Amount: {
      id: "Amount",
      name: "Amount",
      type: "number",
      number: { format: "euro" },
    },
    Type: {
      id: "Type",
      name: "Type",
      type: "select",
      select: {
        options: [
          { id: "income", name: "income", color: "green" },
          { id: "expenditure", name: "expenditure", color: "red" },
          { id: "master", name: "master", color: "blue" },
          { id: "investment", name: "investment", color: "purple" },
          { id: "creditors", name: "creditors", color: "orange" },
        ],
      },
    },
    Tags: {
      id: "Tags",
      name: "Tags",
      type: "multi_select",
      multi_select: { options: tagOptions },
    },
    "Created Date": {
      id: "Created Date",
      name: "Created Date",
      type: "formula",
      formula: { expression: "formatDate(prop(\"Created\"), \"YYYY-MM-DD\")" },
    },
  },
} as unknown as NotionDataSourceData["schema"];

function property(
  description: string,
  amount: number,
  type: string,
  tags: string[],
  createdDate: string
): Record<string, NotionProperty> {
  return {
    Description: {
      id: "Description",
      type: "title",
      title: [{ plain_text: description }],
    },
    Amount: {
      id: "Amount",
      type: "number",
      number: amount,
    },
    Type: {
      id: "Type",
      type: "select",
      select: { id: type, name: type, color: "default" },
    },
    Tags: {
      id: "Tags",
      type: "multi_select",
      multi_select: tags.map((name) => ({
        id: name.toLowerCase(),
        name,
        color: tagOptions.find((tag) => tag.name === name)?.color ?? "default",
      })),
    },
    "Created Date": {
      id: "Created Date",
      type: "formula",
      formula: {
        type: "date",
        date: { start: createdDate },
      },
    },
  };
}

function page(
  id: string,
  description: string,
  amount: number,
  type: string,
  tags: string[],
  createdDate: string
) {
  return {
    object: "page",
    id,
    created_time: `${createdDate}T09:00:00.000Z`,
    last_edited_time: `${createdDate}T09:00:00.000Z`,
    archived: false,
    in_trash: false,
    url: `https://notion.so/${id}`,
    public_url: null,
    properties: property(description, amount, type, tags, createdDate),
    parent: { type: "data_source_id", data_source_id: "test-data-source" },
  };
}

export const dataSources = {
  "Finance 2026": "11111111111111111111111111111111",
  "Side Account": "22222222222222222222222222222222",
};

export const notionFixtures: Record<string, NotionDataSourceData> = {
  "Finance 2026": {
    schema,
    pages: [
      page("salary-january", "January Salary", 3000, "income", ["Salary"], "2026-01-15"),
      page("rent-january", "January Rent", -1200, "expenditure", ["Rent"], "2026-01-02"),
      page("groceries-january", "January Groceries", -200, "expenditure", ["Food"], "2026-01-20"),
      page("opening-balance", "Opening Balance", 500, "master", [], "2026-01-01"),
      page("broker-buy", "Broker Buy", -400, "investment", ["Brokerage"], "2026-01-22"),
      page("friend-loan", "Friend Loan", 250, "creditors", [], "2026-01-25"),
      page("february-salary", "February Salary", 3200, "income", ["Salary"], "2026-02-15"),
    ] as NotionDataSourceData["pages"],
  },
  "Side Account": {
    schema,
    pages: [
      page("side-refund", "Side Refund", 75, "income", ["Refund"], "2026-01-12"),
      page("side-snack", "Side Snack", -10, "expenditure", ["Food"], "2026-01-13"),
    ] as NotionDataSourceData["pages"],
  },
};

export const trading212Positions: Trading212Position[] = [
  {
    quantity: 10,
    currentPrice: 15,
    instrument: {
      ticker: "OPEN",
      name: "Open Holdings",
      isin: "IE00OPEN0001",
      currency: "EUR",
    },
    walletImpact: {
      currency: "EUR",
      totalCost: 100,
      currentValue: 150,
      unrealizedProfitLoss: 50,
      fxImpact: 0,
    },
  },
];

export const trading212HistoricalOrders: Trading212HistoricalOrder[] = [
  {
    fill: {
      filledAt: "2026-01-03T10:00:00Z",
      id: 1,
      price: 10,
      quantity: 10,
      tradingMethod: "REGULAR",
      type: "FILL",
      walletImpact: {
        currency: "EUR",
        netValue: -100,
        realisedProfitLoss: 0,
        fxRate: 1,
        taxes: [],
      },
    },
    order: {
      createdAt: "2026-01-03T09:59:00Z",
      currency: "EUR",
      extendedHours: false,
      filledQuantity: 10,
      id: 1,
      initiatedFrom: "WEB",
      instrument: {
        ticker: "OPEN",
        name: "Open Holdings",
        isin: "IE00OPEN0001",
        currency: "EUR",
      },
      quantity: 10,
      side: "BUY",
      status: "FILLED",
      strategy: "QUANTITY",
      ticker: "OPEN",
      type: "MARKET",
    },
  },
  {
    fill: {
      filledAt: "2026-02-01T10:00:00Z",
      id: 2,
      price: 20,
      quantity: 5,
      tradingMethod: "REGULAR",
      type: "FILL",
      walletImpact: {
        currency: "EUR",
        netValue: -100,
        realisedProfitLoss: 0,
        fxRate: 1,
        taxes: [],
      },
    },
    order: {
      createdAt: "2026-02-01T09:59:00Z",
      currency: "EUR",
      extendedHours: false,
      filledQuantity: 5,
      id: 2,
      initiatedFrom: "WEB",
      instrument: {
        ticker: "CLOSED",
        name: "Closed Holdings",
        isin: "IE00CLOSED01",
        currency: "EUR",
      },
      quantity: 5,
      side: "BUY",
      status: "FILLED",
      strategy: "QUANTITY",
      ticker: "CLOSED",
      type: "MARKET",
    },
  },
  {
    fill: {
      filledAt: "2026-03-01T10:00:00Z",
      id: 3,
      price: 30,
      quantity: 5,
      tradingMethod: "REGULAR",
      type: "FILL",
      walletImpact: {
        currency: "EUR",
        netValue: 150,
        realisedProfitLoss: 50,
        fxRate: 1,
        taxes: [],
      },
    },
    order: {
      createdAt: "2026-03-01T09:59:00Z",
      currency: "EUR",
      extendedHours: false,
      filledQuantity: 5,
      id: 3,
      initiatedFrom: "WEB",
      instrument: {
        ticker: "CLOSED",
        name: "Closed Holdings",
        isin: "IE00CLOSED01",
        currency: "EUR",
      },
      quantity: 5,
      side: "SELL",
      status: "FILLED",
      strategy: "QUANTITY",
      ticker: "CLOSED",
      type: "MARKET",
    },
  },
];

export const trading212HistoricalDividends: Trading212Dividend[] = [
  {
    amount: 5,
    amountInEuro: 5,
    currency: "EUR",
    grossAmountPerShare: 0.5,
    instrument: {
      ticker: "OPEN",
      name: "Open Holdings",
      isin: "IE00OPEN0001",
      currency: "EUR",
    },
    paidOn: "2026-02-10",
    quantity: 10,
    reference: "DIV-OPEN",
    ticker: "OPEN",
    type: "DIVIDEND",
  },
  {
    amount: 3,
    amountInEuro: 3,
    currency: "EUR",
    grossAmountPerShare: 0.6,
    instrument: {
      ticker: "CLOSED",
      name: "Closed Holdings",
      isin: "IE00CLOSED01",
      currency: "EUR",
    },
    paidOn: "2026-03-10",
    quantity: 5,
    reference: "DIV-CLOSED",
    ticker: "CLOSED",
    type: "DIVIDEND",
  },
];
