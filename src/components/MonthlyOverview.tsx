import { NotionDatabaseData } from "@/types/notion";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyOverviewProps {
  data: NotionDatabaseData;
}

export function MonthlyOverview({ data }: MonthlyOverviewProps) {
  const [monthsToShow, setMonthsToShow] = useState(6);

  // Helper function to get amount from property
  const getAmount = (property: any): number => {
    if (!property || property.type !== 'number') return 0;
    const amount = property.number;
    return typeof amount === 'string' ? parseFloat(amount) : amount;
  };

  // Generate last N months
  const months = Array.from({ length: monthsToShow }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      label: format(date, 'MMM yyyy'),
      start: startOfMonth(date),
      end: endOfMonth(date),
    };
  }).reverse();

  // Calculate monthly metrics
  const monthlyData = months.map(month => {
    const monthTransactions = (data.pages as PageObjectResponse[]).filter(page => {
      const date = page.properties['Created']?.type === 'date' 
        ? new Date(page.properties['Created'].date?.start || '')
        : null;
      return date && date >= month.start && date <= month.end;
    });

    const metrics = monthTransactions.reduce((acc: any, page) => {
      const amount = getAmount(page.properties['Amount']);
      const type = page.properties['Type']?.type === 'select' 
        ? page.properties['Type'].select?.name?.toLowerCase()
        : '';

      if (type === 'income') {
        acc.income += amount;
      } else if (type === 'expenditure') {
        acc.expenditure += Math.abs(amount);
      }
      return acc;
    }, { income: 0, expenditure: 0 });

    return {
      ...month,
      ...metrics,
      savings: metrics.income - metrics.expenditure,
    };
  });

  const chartData = {
    labels: monthlyData.map(d => d.label),
    datasets: [
      {
        label: 'Income',
        data: monthlyData.map(d => d.income),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
      },
      {
        label: 'Expenditure',
        data: monthlyData.map(d => d.expenditure),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
      },
      {
        label: 'Savings',
        data: monthlyData.map(d => d.savings),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
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
    scales: {
      y: {
        ticks: {
          callback: (value: any) => `€${value}`
        }
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Monthly Overview</h2>
        <select 
          value={monthsToShow}
          onChange={(e) => setMonthsToShow(Number(e.target.value))}
          className="border rounded p-2"
        >
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
      </div>
      <div className="h-[400px]">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
} 