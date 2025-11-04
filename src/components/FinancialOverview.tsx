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
  excludedTags: Set<string>;
}

export function FinancialOverview({ data, excludedTags }: FinancialOverviewProps) {
  // Helper function to get amount from property
  const getAmount = (property: any): number => {
    if (!property || property.type !== 'number') return 0;
    const amount = property.number;
    return typeof amount === 'string' ? parseFloat(amount) : amount;
  };

  // Filter pages client-side and calculate financial metrics
  const metrics = data.pages
    .filter((page) => {
      const typedPage = page as PageObjectResponse;
      const tags = typedPage.properties['Tags']?.type === 'multi_select' 
        ? typedPage.properties['Tags'].multi_select
        : [];
      
      // Include page if it has no tags or at least one non-excluded tag
      return tags.length === 0 || tags.some(tag => !excludedTags.has(tag.name));
    })
    .reduce((acc: any, page) => {
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
        // Only include non-excluded tags in the breakdown
        tags.forEach(tag => {
          const tagName = tag.name;
          if (!excludedTags.has(tagName)) {
            acc.incomeByTag[tagName] = (acc.incomeByTag[tagName] || 0) + amount;
          }
        });
      } else if (type === 'expenditure') {
        acc.expenditure += Math.abs(amount);
        // Only include non-excluded tags in the breakdown
        tags.forEach(tag => {
          const tagName = tag.name;
          if (!excludedTags.has(tagName)) {
            acc.expenditureByTag[tagName] = (acc.expenditureByTag[tagName] || 0) + Math.abs(amount);
          }
        });
      } else if (type === 'master') {
        acc.master += amount;
      }

      // Update net worth
      acc.netWorth += amount;

      return acc;
    }, {
      income: 0,
      expenditure: 0,
      netWorth: 0,
      master: 0,
      incomeByTag: {},
      expenditureByTag: {}
    });

  // Calculate checking balance
  metrics.checking = metrics.income - metrics.expenditure + metrics.master;

  // Sort tag totals and calculate percentages
  const sortedIncomeTags = Object.entries(metrics.incomeByTag)
    .map(([tag, amount]) => ({
      tag,
      amount: amount as number,
      percentage: ((amount as number) / metrics.income) * 100
    }))
    .sort((a, b) => b.amount - a.amount);

  const sortedExpenditureTags = Object.entries(metrics.expenditureByTag)
    .map(([tag, amount]) => ({
      tag,
      amount: amount as number,
      percentage: ((amount as number) / metrics.expenditure) * 100
    }))
    .sort((a, b) => b.amount - a.amount);

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

  // Prepare chart data for income
  const incomeChartData = {
    labels: Object.keys(metrics.incomeByTag),
    datasets: [
      {
        data: Object.values(metrics.incomeByTag),
        backgroundColor: chartColors.slice(0, Object.keys(metrics.incomeByTag).length),
        borderColor: 'white',
        borderWidth: 2,
      },
    ],
  };

  // Prepare chart data for expenditure
  const expenditureChartData = {
    labels: Object.keys(metrics.expenditureByTag),
    datasets: [
      {
        data: Object.values(metrics.expenditureByTag),
        backgroundColor: chartColors.slice(0, Object.keys(metrics.expenditureByTag).length),
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
            return `€${Math.abs(value).toFixed(2)}`;
          }
        }
      }
    },
  };

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-5 gap-4">
        <div className="p-4 bg-green-100 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800">Total Income</h3>
          <p className="text-2xl font-bold text-green-900">
            €{metrics.income.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-red-100 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800">Total Expenditure</h3>
          <p className="text-2xl font-bold text-red-900">
            €{metrics.expenditure.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-blue-100 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800">Cashflow</h3>
          <p className="text-2xl font-bold text-blue-900">
            €{(metrics.income - metrics.expenditure).toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-purple-100 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800">Net Worth</h3>
          <p className="text-2xl font-bold text-purple-900">
            €{metrics.netWorth.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-amber-100 rounded-lg">
          <h3 className="text-lg font-semibold text-amber-800">Checking</h3>
          <p className="text-2xl font-bold text-amber-900">
            €{metrics.checking.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Income Analysis</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-64">
              <Pie data={incomeChartData} options={chartOptions} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Tag</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-right p-2">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedIncomeTags.map(({ tag, amount, percentage }) => (
                    <tr key={tag} className="border-b">
                      <td className="p-2">{tag}</td>
                      <td className="text-right p-2">€{amount.toFixed(2)}</td>
                      <td className="text-right p-2">{percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-bold bg-gray-50">
                    <td className="p-2">Total</td>
                    <td className="text-right p-2">€{metrics.income.toFixed(2)}</td>
                    <td className="text-right p-2">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Expenditure Analysis</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-64">
              <Pie data={expenditureChartData} options={chartOptions} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Tag</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-right p-2">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedExpenditureTags.map(({ tag, amount, percentage }) => (
                    <tr key={tag} className="border-b">
                      <td className="p-2">{tag}</td>
                      <td className="text-right p-2">€{amount.toFixed(2)}</td>
                      <td className="text-right p-2">{percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-bold bg-gray-50">
                    <td className="p-2">Total</td>
                    <td className="text-right p-2">€{metrics.expenditure.toFixed(2)}</td>
                    <td className="text-right p-2">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 