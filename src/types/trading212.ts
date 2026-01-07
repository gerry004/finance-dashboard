export interface Trading212Position {
  ticker?: string;
  tickerSymbol?: string;
  quantity: number;
  currentPrice?: number;
  averagePrice?: number;
  averagePricePaid?: number;
  price?: number;
  value?: number;
  instrument?: {
    ticker: string;
    name: string;
    isin: string;
    currency: string;
  };
  walletImpact?: {
    currency: string;
    totalCost: number;
    currentValue: number;
    unrealizedProfitLoss: number;
    fxImpact: number;
  };
  [key: string]: any; // Allow for additional fields
}

export interface Trading212Data {
  data?: Trading212Position[] | any;
  error?: string;
}

export interface Trading212Fill {
  filledAt: string;
  id: number;
  price: number;
  quantity: number;
  tradingMethod: string;
  type: string;
  walletImpact?: {
    currency: string;
    netValue: number;
    realisedProfitLoss: number;
    fxRate: number;
    taxes: any[];
  };
}

export interface Trading212Order {
  createdAt: string;
  currency: string;
  extendedHours: boolean;
  filledQuantity: number;
  id: number;
  initiatedFrom: string;
  instrument: {
    ticker: string;
    name: string;
    isin: string;
    currency: string;
  };
  quantity: number;
  side: "BUY" | "SELL";
  status: string;
  strategy: string;
  ticker: string;
  type: string;
}

export interface Trading212HistoricalOrder {
  fill: Trading212Fill;
  order: Trading212Order;
}


