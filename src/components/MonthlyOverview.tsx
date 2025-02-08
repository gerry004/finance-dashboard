import { NotionDatabaseData } from "@/types/notion";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth, addMonths } from 'date-fns';

ChartJS.register(ArcElement, Tooltip, Legend);

interface MonthlyOverviewProps {
  data: NotionDatabaseData;
}

export function MonthlyOverview({ data }: MonthlyOverviewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Helper function to get amount from property
  const getAmount = (property: any): number => {
    if (!property || property.type !== 'number') return 0;
    const amount = property.number;
    return typeof amount === 'string' ? parseFloat(amount) : amount;
  };

  // Helper function to check if a month has data
  const hasDataForMonth = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    
    return (data.pages as PageObjectResponse[]).some(page => {
      const transactionDate = page.properties['Created']?.type === 'date' 
        ? new Date(page.properties['Created'].date?.start || '')
        : null;
      return transactionDate && transactionDate >= start && transactionDate <= end;
    });
  };

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  // Check if adjacent months have data
  const previousMonth = subMonths(selectedDate, 1);
  const nextMonth = addMonths(selectedDate, 1);
  const hasPreviousMonthData = hasDataForMonth(previousMonth);
  const hasNextMonthData = hasDataForMonth(nextMonth);

  // Filter transactions for selected month
  const monthTransactions = (data.pages as PageObjectResponse[]).filter(page => {
    const date = page.properties['Created']?.type === 'date' 
      ? new Date(page.properties['Created'].date?.start || '')
      : null;
    return date && date >= monthStart && date <= monthEnd;
  });

  // Calculate metrics for the month
  const metrics = monthTransactions.reduce((acc: any, page) => {
    const amount = getAmount(page.properties['Amount']);
    const type = page.properties['Type']?.type === 'select' 
      ? page.properties['Type'].select?.name?.toLowerCase()
      : '';
    const tags = page.properties['Tags']?.type === 'multi_select' 
      ? page.properties['Tags'].multi_select
      : [];

    if (type === 'income') {
      acc.income += amount;
      tags.forEach(tag => {
        const tagName = tag.name;
        if (tagName.toLowerCase() !== 'balance') {
          acc.incomeByTag[tagName] = (acc.incomeByTag[tagName] || 0) + amount;
        }
      });
    } else if (type === 'expenditure') {
      acc.expenditure += Math.abs(amount);
      tags.forEach(tag => {
        const tagName = tag.name;
        if (tagName.toLowerCase() !== 'balance') {
          acc.expenditureByTag[tagName] = (acc.expenditureByTag[tagName] || 0) + Math.abs(amount);
        }
      });
    }

    return acc;
  }, {
    income: 0,
    expenditure: 0,
    incomeByTag: {},
    expenditureByTag: {}
  });

  // Sort tag totals and calculate percentages
  const sortedIncomeTags = Object.entries(metrics.incomeByTag)
    .map(([tag, amount]) => ({
      tag,
      amount: amount as number,
      percentage: ((amount as number) / (metrics.income || 1)) * 100
    }))
    .sort((a, b) => b.amount - a.amount);

  const sortedExpenditureTags = Object.entries(metrics.expenditureByTag)
    .map(([tag, amount]) => ({
      tag,
      amount: amount as number,
      percentage: ((amount as number) / (metrics.expenditure || 1)) * 100
    }))
    .sort((a, b) => b.amount - a.amount);

  // Chart colors
  const chartColors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#7CBA3B', '#EC932F', '#5D62B5', '#2E7D32',
  ];

  // Prepare chart data
  const incomeChartData = {
    labels: sortedIncomeTags.map(({ tag }) => tag),
    datasets: [{
      data: sortedIncomeTags.map(({ amount }) => amount),
      backgroundColor: chartColors.slice(0, sortedIncomeTags.length),
      borderColor: 'white',
      borderWidth: 2,
    }],
  };

  const expenditureChartData = {
    labels: sortedExpenditureTags.map(({ tag }) => tag),
    datasets: [{
      data: sortedExpenditureTags.map(({ amount }) => amount),
      backgroundColor: chartColors.slice(0, sortedExpenditureTags.length),
      borderColor: 'white',
      borderWidth: 2,
    }],
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

  const handlePreviousMonth = () => {
    if (hasPreviousMonthData) {
      setSelectedDate(prev => subMonths(prev, 1));
    }
  };

  const handleNextMonth = () => {
    if (hasNextMonthData) {
      setSelectedDate(prev => addMonths(prev, 1));
    }
  };

  return (
    <div className="space-y-6 mb-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Monthly Overview</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={handlePreviousMonth}
            disabled={!hasPreviousMonthData}
            className={`px-3 py-1 rounded transition-colors ${
              hasPreviousMonthData 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' 
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            ←
          </button>
          <span className="text-lg font-semibold">
            {format(selectedDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={handleNextMonth}
            disabled={!hasNextMonthData}
            className={`px-3 py-1 rounded transition-colors ${
              hasNextMonthData 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' 
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="p-4 bg-green-100 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800">Monthly Income</h3>
          <p className="text-2xl font-bold text-green-900">
            €{metrics.income.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-red-100 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800">Monthly Expenditure</h3>
          <p className="text-2xl font-bold text-red-900">
            €{metrics.expenditure.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-blue-100 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800">Monthly Savings</h3>
          <p className="text-2xl font-bold text-blue-900">
            €{(metrics.income - metrics.expenditure).toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-purple-100 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800">Savings Rate</h3>
          <p className="text-2xl font-bold text-purple-900">
            {metrics.income ? ((metrics.income - metrics.expenditure) / metrics.income * 100).toFixed(1) : '0'}%
          </p>
        </div>
        <div className="p-4 bg-amber-100 rounded-lg">
          <h3 className="text-lg font-semibold text-amber-800">Daily Average Spend</h3>
          <p className="text-2xl font-bold text-amber-900">
            €{(metrics.expenditure / (monthEnd.getDate())).toFixed(2)}
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