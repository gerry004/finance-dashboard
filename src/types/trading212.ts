export interface Trading212Position {
  ticker?: string;
  tickerSymbol?: string;
  quantity: number;
  currentPrice?: number;
  averagePrice?: number;
  price?: number;
  value?: number;
  [key: string]: any; // Allow for additional fields
}

export interface Trading212Data {
  data?: Trading212Position[] | any;
  error?: string;
}


