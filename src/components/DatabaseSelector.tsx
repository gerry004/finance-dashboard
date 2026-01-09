"use client";

interface DatabaseSelectorProps {
  databases: Record<string, string>;
  selectedDatabase: string;
  onDatabaseChange: (databaseName: string) => void;
  loading?: boolean;
}

export function DatabaseSelector({
  databases,
  selectedDatabase,
  onDatabaseChange,
  loading = false,
}: DatabaseSelectorProps) {
  const databaseNames = Object.keys(databases);

  if (databaseNames.length === 0) {
    return null;
  }

  return (
    <select
      id="database-select"
      value={selectedDatabase}
      onChange={(e) => onDatabaseChange(e.target.value)}
      disabled={loading}
      className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[150px]"
    >
      {databaseNames.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}

