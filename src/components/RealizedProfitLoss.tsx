"use client";

import { Trading212HistoricalOrder, Trading212Position, Trading212Dividend } from "@/types/trading212";
import { useMemo, useEffect, useState } from "react";

interface RealizedProfitLossProps {
  orders: Trading212HistoricalOrder[] | null;
  positions: Trading212Position[] | null;
  dividends?: Trading212Dividend[] | null;
  loading?: boolean;
  error?: string | null;
}

interface ClosedPosition {
  ticker: string;
  totalBuys: number;
  totalSells: number;
  dividends: number;
  realizedProfitLoss: number;
  percentageChange: number;
  currency: string;
}

type SortConfig = {
  column: keyof ClosedPosition | null;
  direction: "asc" | "desc";
};

function compareValues(a: any, b: any, direction: "asc" | "desc") {
  if (a === b) return 0;
  if (a === null || a === undefined) return direction === "asc" ? -1 : 1;
  if (b === null || b === undefined) return direction === "asc" ? 1 : -1;

  if (typeof a === "string" && typeof b === "string") {
    return direction === "asc" 
      ? a.localeCompare(b)
      : b.localeCompare(a);
  }

  return direction === "asc" ? (a < b ? -1 : 1) : a < b ? 1 : -1;
}

export function RealizedProfitLoss({ orders, positions, dividends, loading, error }: RealizedProfitLossProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: "asc",
  });
  // Log dividends when they change
  useEffect(() => {
    if (dividends) {
      console.log('Historical Dividends:', dividends);
    }
  }, [dividends]);

  // Get set of tickers that are currently open
  const openTickers = useMemo(() => {
    if (!positions || !Array.isArray(positions)) return new Set<string>();
    
    return new Set(
      positions
        .map((pos) => pos.instrument?.ticker || pos.ticker || pos.tickerSymbol || "")
        .filter((ticker) => ticker && ticker !== "N/A")
    );
  }, [positions]);

  // Aggregate dividends by ticker using amountInEuro
  const dividendsByTicker = useMemo(() => {
    if (!dividends || !Array.isArray(dividends)) return new Map<string, number>();

    const dividendMap = new Map<string, number>();
    
    dividends.forEach((dividend) => {
      const ticker = dividend.ticker || dividend.instrument?.ticker || "N/A";
      if (ticker === "N/A") return;
      
      const currentTotal = dividendMap.get(ticker) || 0;
      dividendMap.set(ticker, currentTotal + dividend.amountInEuro);
    });

    return dividendMap;
  }, [dividends]);

  // Process orders to calculate realized P/L for closed positions
  const closedPositions = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];

    // Aggregate orders by ticker
    const tickerMap = new Map<string, { buys: number; sells: number; currency: string }>();

    orders
      .filter((orderItem) => {
        // Only include filled orders with walletImpact
        return orderItem.order?.status === "FILLED" && orderItem.fill?.walletImpact;
      })
      .forEach((orderItem) => {
        const ticker = orderItem.order.instrument?.ticker || orderItem.order.ticker || "N/A";
        if (ticker === "N/A") return;

        const walletImpact = orderItem.fill!.walletImpact!;
        const netValue = walletImpact.netValue;
        const currency = walletImpact.currency;
        const side = orderItem.order.side;

        if (!tickerMap.has(ticker)) {
          tickerMap.set(ticker, { buys: 0, sells: 0, currency });
        }

        const tickerData = tickerMap.get(ticker)!;
        
        if (side === "BUY") {
          // BUY orders have negative netValue (money out), so we add the absolute value
          tickerData.buys += Math.abs(netValue);
        } else if (side === "SELL") {
          // SELL orders have positive netValue (money in)
          tickerData.sells += netValue;
        }
      });

    // Filter to only closed positions (not in open positions) and calculate realized P/L
    const closed: ClosedPosition[] = [];
    
    tickerMap.forEach((data, ticker) => {
      // Only include tickers that are NOT in open positions
      if (!openTickers.has(ticker) && (data.buys > 0 || data.sells > 0)) {
        const dividends = dividendsByTicker.get(ticker) || 0;
        const realizedProfitLoss = data.sells - data.buys;
        // Calculate percentage change: (Realized P/L / Total Buys) * 100
        const percentageChange = data.buys > 0 
          ? (realizedProfitLoss / data.buys) * 100 
          : 0;
        closed.push({
          ticker,
          totalBuys: data.buys,
          totalSells: data.sells,
          dividends,
          realizedProfitLoss,
          percentageChange,
          currency: data.currency,
        });
      }
    });

    return closed;
  }, [orders, openTickers, dividendsByTicker]);

  // Sort closed positions based on sortConfig
  const sortedClosedPositions = useMemo(() => {
    if (!sortConfig.column) {
      // Default sort by realized profit/loss (best performers first)
      return [...closedPositions].sort((a, b) => b.realizedProfitLoss - a.realizedProfitLoss);
    }

    return [...closedPositions].sort((a, b) => {
      const valueA = a[sortConfig.column!];
      const valueB = b[sortConfig.column!];
      return compareValues(valueA, valueB, sortConfig.direction);
    });
  }, [closedPositions, sortConfig]);

  const handleSort = (column: keyof ClosedPosition) => {
    setSortConfig((current) => ({
      column,
      direction:
        current.column === column && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const formatCurrency = (value: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Calculate total dividends
  const totalDividends = useMemo(() => {
    return closedPositions.reduce((sum, pos) => sum + pos.dividends, 0);
  }, [closedPositions]);

  // Calculate total realized P/L
  const totalRealizedPL = useMemo(() => {
    return closedPositions.reduce((sum, pos) => sum + pos.realizedProfitLoss, 0);
  }, [closedPositions]);

  // Calculate total percentage change (weighted average)
  const totalPercentageChange = useMemo(() => {
    const totalBuys = closedPositions.reduce((sum, pos) => sum + pos.totalBuys, 0);
    if (totalBuys === 0) return 0;
    return (totalRealizedPL / totalBuys) * 100;
  }, [closedPositions, totalRealizedPL]);

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Get the most common currency (or default to USD)
  const defaultCurrency = useMemo(() => {
    if (closedPositions.length === 0) return "USD";
    const currencies = closedPositions.map((p) => p.currency);
    const counts = currencies.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "USD";
  }, [closedPositions]);

  if (loading) {
    return (
      <div className="space-y-6 mb-8">
        <div className="p-4 bg-gray-100 rounded-lg animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 mb-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <h3 className="text-lg font-bold mb-2">Error Loading Realized Profit/Loss</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (closedPositions.length === 0) {
    return (
      <div className="space-y-6 mb-8">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <h3 className="font-bold">No Closed Positions</h3>
          <p>There are no closed positions with realized profit/loss to display.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Realized P/L Summary */}
        <div className={`p-4 rounded-lg ${
          totalRealizedPL >= 0 
            ? "bg-green-100" 
            : "bg-red-100"
        }`}>
          <h3 className={`text-lg font-semibold mb-2 ${
            totalRealizedPL >= 0 
              ? "text-green-800" 
              : "text-red-800"
          }`}>
            Total Realized Profit/Loss
          </h3>
          <p className={`text-3xl font-bold ${
            totalRealizedPL >= 0 
              ? "text-green-900" 
              : "text-red-900"
          }`}>
            {formatCurrency(totalRealizedPL, defaultCurrency)}
          </p>
        </div>

        {/* Total Dividends Received Summary */}
        <div className="p-4 rounded-lg bg-blue-100">
          <h3 className="text-lg font-semibold mb-2 text-blue-800">
            Total Dividends Received
          </h3>
          <p className="text-3xl font-bold text-blue-900">
            {formatCurrency(totalDividends, "EUR")}
          </p>
        </div>
      </div>

      {/* Closed Positions Table */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Closed Positions</h3>
        <div className="overflow-x-auto rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th 
                  className="p-3 text-left border font-semibold cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort("ticker")}
                >
                  <div className="flex items-center">
                    Ticker
                    {sortConfig.column === "ticker" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="p-3 text-right border font-semibold cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort("totalBuys")}
                >
                  <div className="flex items-center justify-end">
                    Total Buys
                    {sortConfig.column === "totalBuys" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="p-3 text-right border font-semibold cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort("totalSells")}
                >
                  <div className="flex items-center justify-end">
                    Total Sells
                    {sortConfig.column === "totalSells" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="p-3 text-right border font-semibold cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort("dividends")}
                >
                  <div className="flex items-center justify-end">
                    Dividends
                    {sortConfig.column === "dividends" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="p-3 text-right border font-semibold cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort("realizedProfitLoss")}
                >
                  <div className="flex items-center justify-end">
                    Realized P/L
                    {sortConfig.column === "realizedProfitLoss" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="p-3 text-right border font-semibold cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort("percentageChange")}
                >
                  <div className="flex items-center justify-end">
                    % Change
                    {sortConfig.column === "percentageChange" && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedClosedPositions.map((position, index) => (
                <tr key={`${position.ticker}-${index}`} className="border-b hover:bg-gray-50">
                  <td className="p-3 border font-medium">{position.ticker}</td>
                  <td className="p-3 border text-right">
                    {formatCurrency(position.totalBuys, position.currency)}
                  </td>
                  <td className="p-3 border text-right">
                    {formatCurrency(position.totalSells, position.currency)}
                  </td>
                  <td className="p-3 border text-right text-blue-600">
                    {formatCurrency(position.dividends, "EUR")}
                  </td>
                  <td className={`p-3 border text-right font-semibold ${
                    position.realizedProfitLoss >= 0 
                      ? "text-green-600" 
                      : "text-red-600"
                  }`}>
                    {formatCurrency(position.realizedProfitLoss, position.currency)}
                  </td>
                  <td className={`p-3 border text-right font-semibold ${
                    position.percentageChange >= 0 
                      ? "text-green-600" 
                      : "text-red-600"
                  }`}>
                    {formatPercentage(position.percentageChange)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 font-bold">
                <td className="p-3 border">Total</td>
                <td className="p-3 border text-right">
                  {formatCurrency(
                    sortedClosedPositions.reduce((sum, p) => sum + p.totalBuys, 0),
                    defaultCurrency
                  )}
                </td>
                <td className="p-3 border text-right">
                  {formatCurrency(
                    sortedClosedPositions.reduce((sum, p) => sum + p.totalSells, 0),
                    defaultCurrency
                  )}
                </td>
                <td className="p-3 border text-right text-blue-600">
                  {formatCurrency(totalDividends, "EUR")}
                </td>
                <td className={`p-3 border text-right ${
                  totalRealizedPL >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {formatCurrency(totalRealizedPL, defaultCurrency)}
                </td>
                <td className={`p-3 border text-right ${
                  totalPercentageChange >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {formatPercentage(totalPercentageChange)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

