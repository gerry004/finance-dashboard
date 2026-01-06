"use client";

import { Trading212HistoricalOrder } from "@/types/trading212";
import { useMemo } from "react";

interface HistoricalOrdersTableProps {
  orders: Trading212HistoricalOrder[] | null;
  loading?: boolean;
  error?: string | null;
}

interface ProcessedOrder {
  ticker: string;
  filledAt: string;
  side: "BUY" | "SELL";
  netValue: number;
  currency: string;
}

export function HistoricalOrdersTable({ orders, loading, error }: HistoricalOrdersTableProps) {
  // Process orders to extract filled orders and sort reverse chronologically
  const processedOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];

    return orders
      .filter((orderItem) => {
        // Only include orders with status FILLED and walletImpact data
        return orderItem.order?.status === "FILLED" && orderItem.fill?.walletImpact;
      })
      .map((orderItem): ProcessedOrder => {
        // walletImpact is guaranteed to exist due to filter above
        const walletImpact = orderItem.fill!.walletImpact!;
        return {
          ticker: orderItem.order.instrument?.ticker || orderItem.order.ticker || "N/A",
          filledAt: orderItem.fill.filledAt,
          side: orderItem.order.side,
          netValue: walletImpact.netValue,
          currency: walletImpact.currency,
        };
      })
      .sort((a, b) => {
        // Sort reverse chronologically by filledAt date (newest first)
        return new Date(b.filledAt).getTime() - new Date(a.filledAt).getTime();
      });
  }, [orders]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number, currency: string = "USD") => {
    // Format currency with proper symbol (EUR will show €)
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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
          <h3 className="text-lg font-bold mb-2">Error Loading Historical Orders</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!orders || processedOrders.length === 0) {
    return (
      <div className="space-y-6 mb-8">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <h3 className="font-bold">No Filled Orders</h3>
          <p>There are no filled orders to display at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Filled Orders</h3>
        <div className="overflow-x-auto rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left border font-semibold">Ticker</th>
                <th className="p-3 text-left border font-semibold">Filled At</th>
                <th className="p-3 text-right border font-semibold">Net Value</th>
                <th className="p-3 text-center border font-semibold">Side</th>
              </tr>
            </thead>
            <tbody>
              {processedOrders.map((order, index) => (
                <tr key={`${order.ticker}-${order.filledAt}-${index}`} className="border-b hover:bg-gray-50">
                  <td className="p-3 border font-medium">{order.ticker}</td>
                  <td className="p-3 border">{formatDate(order.filledAt)}</td>
                  <td className="p-3 border text-right">{formatCurrency(order.netValue, order.currency)}</td>
                  <td className="p-3 border text-center">
                    <span
                      className={`px-2 py-1 rounded text-sm font-semibold ${
                        order.side === "BUY"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {order.side}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

