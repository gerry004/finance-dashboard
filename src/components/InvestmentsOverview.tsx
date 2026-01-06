"use client";

import { Trading212Position } from "@/types/trading212";
import { useMemo } from "react";

interface InvestmentsOverviewProps {
  positions: Trading212Position[] | null;
  loading?: boolean;
  error?: string | null;
}

interface ProcessedPosition {
  ticker: string;
  quantity: number;
  currentPrice: number;
  value: number;
}

export function InvestmentsOverview({ positions, loading, error }: InvestmentsOverviewProps) {
  // Process positions to extract and calculate values
  const processedPositions = useMemo(() => {
    if (!positions || !Array.isArray(positions)) return [];

    return positions
      .map((position): ProcessedPosition | null => {
        // Extract ticker (handle different field names)
        const ticker = position.ticker || position.tickerSymbol || 'N/A';
        
        // Extract quantity
        const quantity = position.quantity || 0;
        
        // Extract current price (handle different field names)
        const currentPrice = position.currentPrice || position.price || position.averagePrice || 0;
        
        // Calculate value if not provided
        const value = position.value !== undefined 
          ? position.value 
          : currentPrice * quantity;

        // Only include positions with valid data
        if (quantity > 0 && currentPrice > 0) {
          return {
            ticker,
            quantity,
            currentPrice,
            value,
          };
        }
        
        return null;
      })
      .filter((pos): pos is ProcessedPosition => pos !== null)
      .sort((a, b) => b.value - a.value); // Sort by value descending
  }, [positions]);

  // Calculate total portfolio value
  const totalPortfolioValue = useMemo(() => {
    return processedPositions.reduce((sum, position) => sum + position.value, 0);
  }, [processedPositions]);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Total Portfolio Value */}
      <div className="p-4 bg-indigo-100 rounded-lg">
        <h3 className="text-lg font-semibold text-indigo-800 mb-2">Total Investment Portfolio Value</h3>
        <p className="text-3xl font-bold text-indigo-900">
          {formatCurrency(totalPortfolioValue)}
        </p>
      </div>

      {/* Positions Table */}
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Open Positions</h3>
        <div className="overflow-x-auto rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left border font-semibold">Ticker</th>
                <th className="p-3 text-right border font-semibold">Quantity</th>
                <th className="p-3 text-right border font-semibold">Current Price</th>
                <th className="p-3 text-right border font-semibold">Value</th>
              </tr>
            </thead>
            <tbody>
              {processedPositions.map((position, index) => (
                <tr key={`${position.ticker}-${index}`} className="border-b hover:bg-gray-50">
                  <td className="p-3 border font-medium">{position.ticker}</td>
                  <td className="p-3 border text-right">{formatNumber(position.quantity, 4)}</td>
                  <td className="p-3 border text-right">{formatCurrency(position.currentPrice)}</td>
                  <td className="p-3 border text-right font-semibold">{formatCurrency(position.value)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 font-bold">
                <td className="p-3 border">Total</td>
                <td className="p-3 border text-right"></td>
                <td className="p-3 border text-right"></td>
                <td className="p-3 border text-right">{formatCurrency(totalPortfolioValue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}


