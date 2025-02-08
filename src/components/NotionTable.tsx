"use client";

import { NotionDatabaseData } from "@/types/notion";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { useState } from "react";

interface NotionTableProps {
  data: NotionDatabaseData;
}

const colorMap = {
  red: "bg-red-100 text-red-800",
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  purple: "bg-purple-100 text-purple-800",
  pink: "bg-pink-100 text-pink-800",
  orange: "bg-orange-100 text-orange-800",
  gray: "bg-gray-100 text-gray-800",
  brown: "bg-zinc-100 text-zinc-800",
  lime: "bg-lime-100 text-lime-800",
  emerald: "bg-emerald-100 text-emerald-800",
  cyan: "bg-cyan-100 text-cyan-800",
  violet: "bg-violet-100 text-violet-800",
  fuchsia: "bg-fuchsia-100 text-fuchsia-800",
  rose: "bg-rose-100 text-rose-800",
  default: "bg-gray-100 text-gray-800",
};

// Add type for sorting
type SortConfig = {
  column: string | null;
  direction: "asc" | "desc";
};

function formatProperty(property: any) {
  if (!property) return "";

  switch (property.type) {
    case "number":
      return property.number;

    case "select":
      return (
        <span
          className={`px-2 py-1 rounded text-sm ${
            colorMap[property.select?.color as keyof typeof colorMap]
          }`}
        >
          {property.select?.name}
        </span>
      );

    case "date":
      return property.date?.start || "";

    case "multi_select":
      return property.multi_select.map((item: any) => (
        <span
          key={item.id}
          className={`mr-1 px-2 py-1 rounded text-sm ${
            colorMap[item.color as keyof typeof colorMap]
          }`}
        >
          {item.name}
        </span>
      ));

    case "title":
      return property.title[0]?.plain_text || "";

    default:
      return JSON.stringify(property);
  }
}

function compareValues(a: any, b: any, direction: "asc" | "desc") {
  if (
    a?.props?.children &&
    b?.props?.children &&
    typeof a.props.children === "string" &&
    typeof b.props.children === "string"
  ) {
    a = a.props.children;
    b = b.props.children;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    console.log(a, b);
    a = a[0].props.children;
    b = b[0].props.children;
  }

  if (a === b) return 0;
  if (a === null || a === undefined) return direction === "asc" ? -1 : 1;
  if (b === null || b === undefined) return direction === "asc" ? 1 : -1;

  return direction === "asc" ? (a < b ? -1 : 1) : a < b ? 1 : -1;
}

export function NotionTable({ data }: NotionTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: null,
    direction: "asc",
  });

  const desiredOrder = ["Description", "Amount", "Type", "Tags", "Created"];
  const columns = Object.entries(data.schema.properties)
    .filter(([_, property]) => {
      if (property.type === "title") return true;
      return desiredOrder.some(
        (name) => property.name.toLowerCase() === name.toLowerCase()
      );
    })
    .sort(([_, a], [__, b]) => {
      if (a.type === "title") return -1;
      if (b.type === "title") return 1;
      return desiredOrder.indexOf(a.name) - desiredOrder.indexOf(b.name);
    })
    .map(([id, property]) => ({
      id,
      name: property.name,
    }));

  // Sort pages
  const sortedPages = data.pages
    .sort((a, b) => {
      if (!sortConfig.column) return 0;
      const typedA = a as PageObjectResponse;
      const typedB = b as PageObjectResponse;
      const valueA = formatProperty(typedA.properties[sortConfig.column]);
      const valueB = formatProperty(typedB.properties[sortConfig.column]);
      return compareValues(valueA, valueB, sortConfig.direction);
    });

  const handleSort = (columnId: string) => {
    setSortConfig((current) => ({
      column: columnId,
      direction:
        current.column === columnId && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Personal Finance Data</h2>
      <div className="overflow-x-auto rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {columns.map((column) => (
                <th
                  key={column.id}
                  className="p-2 text-left border cursor-pointer hover:bg-gray-200"
                  onClick={() => handleSort(column.id)}
                >
                  <div className="flex items-center">
                    {column.name}
                    {sortConfig.column === column.id && (
                      <span className="ml-1">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPages.map((page) => {
              const typedPage = page as PageObjectResponse;
              return (
                <tr key={page.id} className="border-b hover:bg-gray-50">
                  {columns.map((column) => {
                    const property = typedPage.properties[column.id];
                    return (
                      <td key={column.id} className="p-2 border">
                        {formatProperty(property)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
