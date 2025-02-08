"use client";

import { NotionDatabaseData } from "@/types/notion";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Colors
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Colors);

interface FinancialOverviewProps {
  data: NotionDatabaseData;
}

export function FinancialOverview({ data }: FinancialOverviewProps) {
  // Helper function to get amount from property
  const getAmount = (property: any): number => {
    if (!property || property.type !== 'number') return 0;
    const amount = property.number;
    return typeof amount === 'string' ? parseFloat(amount) : amount;
  };

  // Calculate financial metrics
  const metrics = data.pages.reduce((acc: any, page) => {
    const typedPage = page as PageObjectResponse;
    const amount = getAmount(typedPage.properties['Amount']);
    const type = typedPage.properties['Type']?.type === 'select' 
      ? typedPage.properties['Type'].select?.name?.toLowerCase()
      : '';
    const tags = typedPage.properties['Tags']?.type === 'multi_select' 
      ? typedPage.properties['Tags'].multi_select
      : [];

    // Update income and expenditure
    if (type === 'income') {
      acc.income += amount;
    } else if (type === 'expenditure') {
      acc.expenditure += Math.abs(amount);
    }

    // Update tag totals
    tags.forEach(tag => {
      const tagName = tag.name;
      acc.tagTotals[tagName] = (acc.tagTotals[tagName] || 0) + amount;
    });

    // Update net worth
    acc.netWorth += amount;

    return acc;
  }, {
    income: 0,
    expenditure: 0,
    netWorth: 0,
    tagTotals: {}
  });

  // Define a color palette for the pie chart
  const chartColors = [
    '#FF6384', // pink
    '#36A2EB', // blue
    '#FFCE56', // yellow
    '#4BC0C0', // turquoise
    '#9966FF', // purple
    '#FF9F40', // orange
    '#7CBA3B', // green
    '#EC932F', // dark orange
    '#5D62B5', // indigo
    '#2E7D32', // dark green
  ];

  // Filter out the "Balance" tag and prepare chart data
  const filteredTags = Object.entries(metrics.tagTotals)
    .filter(([tagName]) => tagName.toLowerCase() !== 'balance')
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, number>);

  const chartData = {
    labels: Object.keys(filteredTags),
    datasets: [
      {
        data: Object.values(filteredTags),
        backgroundColor: chartColors.slice(0, Object.keys(filteredTags).length),
        borderColor: 'white',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            return `$${Math.abs(value).toFixed(2)}`;
          }
        }
      }
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-100 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800">Total Income</h3>
            <p className="text-2xl font-bold text-green-900">
              ${metrics.income.toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-red-100 rounded-lg">
            <h3 className="text-lg font-semibold text-red-800">Total Expenditure</h3>
            <p className="text-2xl font-bold text-red-900">
              ${metrics.expenditure.toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-blue-100 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800">Cashflow</h3>
            <p className="text-2xl font-bold text-blue-900">
              ${(metrics.income - metrics.expenditure).toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-purple-100 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-800">Net Worth</h3>
            <p className="text-2xl font-bold text-purple-900">
              ${metrics.netWorth.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Breakdown by Tag</h3>
        <Pie data={chartData} options={chartOptions} />
      </div>
    </div>
  );
} 