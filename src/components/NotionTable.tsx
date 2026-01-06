"use client";

import { NotionDatabaseData } from "@/types/notion";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { useState } from "react";
import { NOTION_COLOR_MAP } from "@/utils/constants";
import { shouldIncludePage } from "@/utils/notionFilters";

interface NotionTableProps {
  data: NotionDatabaseData;
  excludedTags: Set<string>;
  startDate: string | null;
  endDate: string | null;
}

// Add type for sorting
type SortConfig = {
  column: string | null;
  direction: "asc" | "desc";
};

function formatProperty(property: any, excludedTags?: Set<string>) {
  if (!property) return "";

  switch (property.type) {
    case "number":
      return property.number;

    case "select":
      return (
        <span
          className={`px-2 py-1 rounded text-sm ${
            NOTION_COLOR_MAP[property.select?.color as keyof typeof NOTION_COLOR_MAP] || NOTION_COLOR_MAP.default
          }`}
        >
          {property.select?.name}
        </span>
      );

    case "date":
      return property.date?.start || "";

    case "multi_select":
      return property.multi_select
        .filter((item: any) => !excludedTags?.has(item.name))
        .map((item: any) => (
          <span
            key={item.id}
            className={`mr-1 px-2 py-1 rounded text-sm ${
              NOTION_COLOR_MAP[item.color as keyof typeof NOTION_COLOR_MAP] || NOTION_COLOR_MAP.default
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

export function NotionTable({ data, excludedTags, startDate, endDate }: NotionTableProps) {
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

  // Filter and sort pages client-side
  const sortedPages = data.pages
    .filter((page) => {
      const typedPage = page as PageObjectResponse;
      return shouldIncludePage(typedPage, excludedTags, startDate, endDate);
    })
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
                        {formatProperty(property, excludedTags)}
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
