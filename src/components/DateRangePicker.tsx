"use client";

import { useState } from "react";
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onDateRangeChange: (startDate: string | null, endDate: string | null) => void;
}

type PresetOption = {
  label: string;
  getRange: () => { start: string; end: string };
};

export function DateRangePicker({ startDate, endDate, onDateRangeChange }: DateRangePickerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const presets: PresetOption[] = [
    {
      label: "All Time",
      getRange: () => ({ start: "", end: "" }),
    },
    {
      label: "This Month",
      getRange: () => ({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      }),
    },
    {
      label: "Last Month",
      getRange: () => ({
        start: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
        end: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
      }),
    },
    {
      label: "Last 3 Months",
      getRange: () => ({
        start: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      }),
    },
    {
      label: "Last 6 Months",
      getRange: () => ({
        start: format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      }),
    },
  ];

  const handlePresetClick = (preset: PresetOption) => {
    const { start, end } = preset.getRange();
    onDateRangeChange(start || null, end || null);
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      onDateRangeChange(value || null, endDate);
    } else {
      onDateRangeChange(startDate, value || null);
    }
  };

  const handleClearDates = () => {
    onDateRangeChange(null, null);
  };

  const getDisplayText = () => {
    if (!startDate && !endDate) return "All Time";
    if (startDate && endDate) return `${startDate} to ${endDate}`;
    if (startDate) return `From ${startDate}`;
    if (endDate) return `Until ${endDate}`;
    return "Select dates";
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-6 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <h3 className="text-lg font-semibold">Date Range</h3>
          <span className="text-sm text-gray-500">({getDisplayText()})</span>
        </div>
        <span className="text-gray-500">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200">
          {/* Preset Buttons */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Quick Presets:</h4>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Inputs */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Custom Range:</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate || ""}
                  onChange={(e) => handleCustomDateChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate || ""}
                  onChange={(e) => handleCustomDateChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Clear Button */}
          {(startDate || endDate) && (
            <button
              onClick={handleClearDates}
              className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
            >
              Clear Date Filter (Show All Time)
            </button>
          )}

          {/* Help Text */}
          <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-2 rounded">
            💡 Select a preset or choose custom dates. Data will be fetched from Notion based on
            your selection.
          </div>
        </div>
      )}
    </div>
  );
}

