"use client";

import { NotionDatabaseData } from "@/types/notion";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { useMemo } from "react";
import { shouldIncludePage, extractAmount, extractType, extractCreatedDate } from "@/utils/notionFilters";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

interface MonthlyFinancialChartProps {
  data: NotionDatabaseData;
  excludedTags: Set<string>;
  startDate: string | null;
  endDate: string | null;
  onDataPointClick?: (month: string, type: string) => void;
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  income: number;
  expenditure: number;
  checkingAtEnd: number;
}

export function MonthlyFinancialChart({ data, excludedTags, startDate, endDate, onDataPointClick }: MonthlyFinancialChartProps) {
  const monthlyData = useMemo(() => {
    // Filter pages
    const filteredPages = data.pages
      .filter((page) => {
        const typedPage = page as PageObjectResponse;
        return shouldIncludePage(typedPage, excludedTags, startDate, endDate);
      })
      .map((page) => {
        const typedPage = page as PageObjectResponse;
        const createdDate = extractCreatedDate(typedPage);
        const amount = extractAmount(typedPage.properties['Amount']);
        const type = extractType(typedPage.properties['Type']);
        const tags = typedPage.properties['Tags']?.type === 'multi_select' 
          ? typedPage.properties['Tags'].multi_select
          : [];

        return {
          date: createdDate,
          amount,
          type,
          tags,
        };
      })
      .filter((item) => item.date !== null) // Exclude pages without dates
      .sort((a, b) => {
        // Sort chronologically
        return new Date(a.date!).getTime() - new Date(b.date!).getTime();
      });

    // Group by month and calculate monthly aggregates
    const monthlyMap = new Map<string, {
      income: number;
      expenditure: number;
      master: number;
      investmentBuys: number;
      investmentSells: number;
      investmentOther: number;
    }>();

    // Process transactions chronologically to calculate checking balance
    let cumulativeMaster = 0;
    let cumulativeIncome = 0;
    let cumulativeExpenditure = 0;
    let cumulativeInvestmentSells = 0;
    let cumulativeInvestmentBuys = 0;
    let cumulativeInvestmentOther = 0;
    
    const checkingAtEndByMonth = new Map<string, number>();
    let previousMonthKey: string | null = null;

    filteredPages.forEach((item) => {
      const date = new Date(item.date!);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // If we've moved to a new month, store the checking balance at end of previous month
      if (previousMonthKey !== null && previousMonthKey !== monthKey) {
        const checkingAtEnd = cumulativeMaster + cumulativeIncome - cumulativeExpenditure + cumulativeInvestmentSells - cumulativeInvestmentBuys + cumulativeInvestmentOther;
        checkingAtEndByMonth.set(previousMonthKey, checkingAtEnd);
      }
      
      // Initialize month if not exists
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          income: 0,
          expenditure: 0,
          master: 0,
          investmentBuys: 0,
          investmentSells: 0,
          investmentOther: 0,
        });
      }

      const monthData = monthlyMap.get(monthKey)!;

      // Update monthly aggregates
      if (item.type === 'income') {
        monthData.income += item.amount;
        cumulativeIncome += item.amount;
      } else if (item.type === 'expenditure') {
        monthData.expenditure += Math.abs(item.amount);
        cumulativeExpenditure += Math.abs(item.amount);
      } else if (item.type === 'master') {
        monthData.master += item.amount;
        cumulativeMaster += item.amount;
      } else if (item.type === 'investment') {
        const hasBuyTag = item.tags.some(tag => tag.name.toLowerCase() === 'buy');
        const hasSellTag = item.tags.some(tag => tag.name.toLowerCase() === 'sell');
        
        if (hasBuyTag) {
          monthData.investmentBuys += Math.abs(item.amount);
          cumulativeInvestmentBuys += Math.abs(item.amount);
        } else if (hasSellTag) {
          monthData.investmentSells += Math.abs(item.amount);
          cumulativeInvestmentSells += Math.abs(item.amount);
        } else {
          // Investment transactions without buy/sell tags - use actual value (can be positive or negative)
          monthData.investmentOther += item.amount;
          cumulativeInvestmentOther += item.amount;
        }
      }
      
      previousMonthKey = monthKey;
    });
    
    // Store checking balance at end of the last month
    if (previousMonthKey !== null) {
      const checkingAtEnd = cumulativeMaster + cumulativeIncome - cumulativeExpenditure + cumulativeInvestmentSells - cumulativeInvestmentBuys + cumulativeInvestmentOther;
      checkingAtEndByMonth.set(previousMonthKey, checkingAtEnd);
    }

    // Convert to array and format labels
    const monthlyArray: MonthlyData[] = Array.from(monthlyMap.entries())
      .map(([monthKey, monthData]) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        return {
          month: monthKey,
          monthLabel,
          income: monthData.income,
          expenditure: monthData.expenditure,
          checkingAtEnd: checkingAtEndByMonth.get(monthKey) || 0,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    return monthlyArray;
  }, [data, excludedTags, startDate, endDate]);

  // Prepare chart data
  const chartData = useMemo(() => ({
    labels: monthlyData.map(d => d.monthLabel),
    datasets: [
      {
        label: 'Income',
        data: monthlyData.map(d => d.income),
        borderColor: '#22c55e', // green
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1,
      },
      {
        label: 'Expenditure',
        data: monthlyData.map(d => d.expenditure),
        borderColor: '#ef4444', // red
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.1,
      },
      {
        label: 'Checking at End',
        data: monthlyData.map(d => d.checkingAtEnd),
        borderColor: '#f59e0b', // amber
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.1,
      },
    ],
  }), [monthlyData]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: €${context.raw.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: any) => `€${value.toFixed(0)}`,
        },
      },
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0 && onDataPointClick) {
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const index = element.index;
        
        const datasetLabel = chartData.datasets[datasetIndex].label;
        
        // Map dataset label to type
        let type = '';
        if (datasetLabel === 'Income') {
          type = 'income';
        } else if (datasetLabel === 'Expenditure') {
          type = 'expenditure';
        } else if (datasetLabel === 'Checking at End') {
          // For checking, we need to find the month key
          const monthDataItem = monthlyData[index];
          if (monthDataItem) {
            onDataPointClick(monthDataItem.month, 'checking');
          }
          return;
        }
        
        // Find the month key from the label
        const monthDataItem = monthlyData[index];
        if (monthDataItem && type) {
          onDataPointClick(monthDataItem.month, type);
        }
      }
    },
  }), [monthlyData, chartData, onDataPointClick]);

  // Calculate averages
  const averageIncome = useMemo(() => {
    if (monthlyData.length === 0) return 0;
    const totalIncome = monthlyData.reduce((sum, d) => sum + d.income, 0);
    return totalIncome / monthlyData.length;
  }, [monthlyData]);

  const averageExpenditure = useMemo(() => {
    if (monthlyData.length === 0) return 0;
    const totalExpenditure = monthlyData.reduce((sum, d) => sum + d.expenditure, 0);
    return totalExpenditure / monthlyData.length;
  }, [monthlyData]);

  if (monthlyData.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow mb-8">
      <h3 className="text-lg font-semibold mb-4">Monthly Financial Overview</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700 font-medium">Average Monthly Income</p>
          <p className="text-xl font-bold text-green-900">€{averageIncome.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-700 font-medium">Average Monthly Expenditure</p>
          <p className="text-xl font-bold text-red-900">€{averageExpenditure.toFixed(2)}</p>
        </div>
      </div>
      <div className="h-96">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

