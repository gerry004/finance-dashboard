"use client";

import { Trading212Position, Trading212HistoricalOrder, Trading212Dividend } from "@/types/trading212";
import { useMemo } from "react";

interface InvestmentsOverviewProps {
  positions: Trading212Position[] | null;
  orders?: Trading212HistoricalOrder[] | null;
  dividends?: Trading212Dividend[] | null;
  loading?: boolean;
  error?: string | null;
}

interface ProcessedPosition {
  ticker: string;
  quantity: number;
  currentPrice: number;
  value: number;
  costBasis: number;
  dividends: number;
  unrealizedProfitLoss: number;
  percentageChange: number;
  currency: string; // Currency for value (from walletImpact)
  instrumentCurrency: string; // Currency for current price (from instrument)
}

export function InvestmentsOverview({ positions, orders, dividends, loading, error }: InvestmentsOverviewProps) {
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

  // Calculate cost basis from historical orders for each ticker
  // Cost basis = Total Buys - Total Sells (net investment in current position)
  const costBasisByTicker = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return new Map<string, { costBasis: number; currency: string }>();

    const tickerMap = new Map<string, { costBasis: number; currency: string }>();

    orders
      .filter((orderItem) => {
        // Only include filled orders with walletImpact
        return (
          orderItem.order?.status === "FILLED" &&
          orderItem.fill?.walletImpact
        );
      })
      .forEach((orderItem) => {
        const ticker = orderItem.order.instrument?.ticker || orderItem.order.ticker || "N/A";
        if (ticker === "N/A") return;

        const walletImpact = orderItem.fill!.walletImpact!;
        const netValue = walletImpact.netValue;
        const currency = walletImpact.currency;
        const side = orderItem.order.side;

        if (!tickerMap.has(ticker)) {
          tickerMap.set(ticker, { costBasis: 0, currency });
        }

        const tickerData = tickerMap.get(ticker)!;
        
        if (side === "BUY") {
          // BUY orders have negative netValue (money out), so we add the absolute value
          tickerData.costBasis += Math.abs(netValue);
        } else if (side === "SELL") {
          // SELL orders have positive netValue (money in), so we subtract it
          // This gives us the net cost basis of what we currently own
          tickerData.costBasis -= netValue;
        }
      });

    return tickerMap;
  }, [orders]);

  // Process positions to extract and calculate values
  const processedPositions = useMemo(() => {
    if (!positions || !Array.isArray(positions)) return [];

    return positions
      .map((position): ProcessedPosition | null => {
        // Extract ticker from instrument.ticker (new structure)
        const ticker = position.instrument?.ticker || position.ticker || position.tickerSymbol || 'N/A';
        
        // Extract quantity
        const quantity = position.quantity || 0;
        
        // Extract current price (handle different field names)
        const currentPrice = position.currentPrice || position.price || position.averagePrice || 0;
        
        // Get current value from walletImpact.currentValue (new structure)
        const value = position.walletImpact?.currentValue !== undefined
          ? position.walletImpact.currentValue
          : position.value !== undefined 
            ? position.value 
            : currentPrice * quantity;

        // Get currency from walletImpact.currency (for value display)
        const currency = position.walletImpact?.currency || position.instrument?.currency || "USD";
        
        // Get instrument currency (for current price display)
        const instrumentCurrency = position.instrument?.currency || "USD";

        // Get cost basis from historical orders
        const costBasisData = costBasisByTicker.get(ticker);
        const costBasis = costBasisData?.costBasis || 0;

        // Get dividends for this ticker
        const dividends = dividendsByTicker.get(ticker) || 0;

        // Use unrealizedProfitLoss from walletImpact if available, otherwise calculate
        const unrealizedProfitLoss = position.walletImpact?.unrealizedProfitLoss !== undefined
          ? position.walletImpact.unrealizedProfitLoss
          : value - costBasis;

        // Calculate percentage change: (unrealizedProfitLoss / costBasis) * 100
        const percentageChange = costBasis > 0 
          ? (unrealizedProfitLoss / costBasis) * 100 
          : 0;

        // Only include positions with valid data
        if (quantity > 0 && (currentPrice > 0 || value > 0)) {
          return {
            ticker,
            quantity,
            currentPrice,
            value,
            costBasis,
            dividends,
            unrealizedProfitLoss,
            percentageChange,
            currency,
            instrumentCurrency,
          };
        }
        
        return null;
      })
      .filter((pos): pos is ProcessedPosition => pos !== null)
      .sort((a, b) => b.value - a.value); // Sort by value descending
  }, [positions, costBasisByTicker, dividendsByTicker]);

  // Calculate total portfolio value and cost basis
  const totalPortfolioValue = useMemo(() => {
    return processedPositions.reduce((sum, position) => sum + position.value, 0);
  }, [processedPositions]);

  const totalCostBasis = useMemo(() => {
    return processedPositions.reduce((sum, position) => sum + position.costBasis, 0);
  }, [processedPositions]);

  const totalUnrealizedPL = useMemo(() => {
    return processedPositions.reduce((sum, position) => sum + position.unrealizedProfitLoss, 0);
  }, [processedPositions]);

  const totalDividends = useMemo(() => {
    return processedPositions.reduce((sum, position) => sum + position.dividends, 0);
  }, [processedPositions]);

  // Calculate total percentage change (weighted average)
  const totalPercentageChange = useMemo(() => {
    const totalCostBasis = processedPositions.reduce((sum, position) => sum + position.costBasis, 0);
    if (totalCostBasis === 0) return 0;
    return (totalUnrealizedPL / totalCostBasis) * 100;
  }, [processedPositions, totalUnrealizedPL]);

  // Get the most common currency (or default to USD)
  const defaultCurrency = useMemo(() => {
    if (processedPositions.length === 0) return "USD";
    const currencies = processedPositions.map((p) => p.currency);
    const counts = currencies.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "USD";
  }, [processedPositions]);

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

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
          <h3 className="text-lg font-bold mb-2">Error Loading Investments</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!positions || processedPositions.length === 0) {
    return (
      <div className="space-y-6 mb-8">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <h3 className="font-bold">No Investment Positions</h3>
          <p>There are no open positions to display at this time.</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number, currency: string = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-purple-100 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800 mb-2">Total Portfolio Value</h3>
          <p className="text-3xl font-bold text-purple-900">
            {formatCurrency(totalPortfolioValue, defaultCurrency)}
          </p>
        </div>
        <div className="p-4 bg-orange-100 rounded-lg">
          <h3 className="text-lg font-semibold text-orange-800 mb-2">Total Cost Basis</h3>
          <p className="text-3xl font-bold text-orange-900">
            {formatCurrency(totalCostBasis, defaultCurrency)}
          </p>
        </div>
        <div className={`p-4 rounded-lg ${
          totalUnrealizedPL >= 0 
            ? "bg-green-100" 
            : "bg-red-100"
        }`}>
          <h3 className={`text-lg font-semibold mb-2 ${
            totalUnrealizedPL >= 0 
              ? "text-green-800" 
              : "text-red-800"
          }`}>
            Total Unrealized Profit/Loss
          </h3>
          <p className={`text-3xl font-bold ${
            totalUnrealizedPL >= 0 
              ? "text-green-900" 
              : "text-red-900"
          }`}>
            {formatCurrency(totalUnrealizedPL, defaultCurrency)}
          </p>
        </div>
        <div className="p-4 bg-blue-100 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Total Dividends Received</h3>
          <p className="text-3xl font-bold text-blue-900">
            {formatCurrency(totalDividends, "EUR")}
          </p>
        </div>
      </div>

      {/* Positions Table */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Open Positions</h3>
        <div className="overflow-x-auto rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left border font-semibold">Ticker</th>
                <th className="p-3 text-right border font-semibold">Quantity</th>
                <th className="p-3 text-right border font-semibold">Current Price</th>
                <th className="p-3 text-right border font-semibold">Cost Basis</th>
                <th className="p-3 text-right border font-semibold">Current Value</th>
                <th className="p-3 text-right border font-semibold">Dividends</th>
                <th className="p-3 text-right border font-semibold">Unrealized P/L</th>
                <th className="p-3 text-right border font-semibold">% Change</th>
              </tr>
            </thead>
            <tbody>
              {processedPositions.map((position, index) => (
                <tr key={`${position.ticker}-${index}`} className="border-b hover:bg-gray-50">
                  <td className="p-3 border font-medium">{position.ticker}</td>
                  <td className="p-3 border text-right">{formatNumber(position.quantity, 4)}</td>
                  <td className="p-3 border text-right">{formatCurrency(position.currentPrice, position.instrumentCurrency)}</td>
                  <td className="p-3 border text-right text-orange-600">
                    {position.costBasis > 0 
                      ? formatCurrency(position.costBasis, position.currency)
                      : <span className="text-gray-400">N/A</span>
                    }
                  </td>
                  <td className="p-3 border text-right font-semibold text-purple-600">
                    {formatCurrency(position.value, position.currency)}
                  </td>
                  <td className="p-3 border text-right text-blue-600">
                    {formatCurrency(position.dividends, "EUR")}
                  </td>
                  <td className={`p-3 border text-right font-semibold ${
                    position.unrealizedProfitLoss >= 0 
                      ? "text-green-600" 
                      : "text-red-600"
                  }`}>
                    {position.costBasis > 0 
                      ? formatCurrency(position.unrealizedProfitLoss, position.currency)
                      : <span className="text-gray-400">N/A</span>
                    }
                  </td>
                  <td className={`p-3 border text-right font-semibold ${
                    position.percentageChange >= 0 
                      ? "text-green-600" 
                      : "text-red-600"
                  }`}>
                    {position.costBasis > 0 
                      ? formatPercentage(position.percentageChange)
                      : <span className="text-gray-400">N/A</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 font-bold">
                <td className="p-3 border">Total</td>
                <td className="p-3 border text-right"></td>
                <td className="p-3 border text-right"></td>
                <td className="p-3 border text-right text-orange-600">
                  {formatCurrency(totalCostBasis, defaultCurrency)}
                </td>
                <td className="p-3 border text-right text-purple-600">
                  {formatCurrency(totalPortfolioValue, defaultCurrency)}
                </td>
                <td className="p-3 border text-right text-blue-600">
                  {formatCurrency(totalDividends, "EUR")}
                </td>
                <td className={`p-3 border text-right ${
                  totalUnrealizedPL >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {formatCurrency(totalUnrealizedPL, defaultCurrency)}
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


