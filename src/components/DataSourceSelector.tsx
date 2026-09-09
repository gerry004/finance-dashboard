"use client";

interface DataSourceSelectorProps {
  dataSources: Record<string, string>;
  selectedDataSource: string;
  onDataSourceChange: (dataSourceName: string) => void;
  loading?: boolean;
}

export function DataSourceSelector({
  dataSources,
  selectedDataSource,
  onDataSourceChange,
  loading = false,
}: DataSourceSelectorProps) {
  const dataSourceNames = Object.keys(dataSources);

  if (dataSourceNames.length === 0) {
    return null;
  }

  return (
    <select
      id="data-source-select"
      value={selectedDataSource}
      onChange={(event) => onDataSourceChange(event.target.value)}
      disabled={loading}
      className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[150px]"
    >
      {dataSourceNames.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
