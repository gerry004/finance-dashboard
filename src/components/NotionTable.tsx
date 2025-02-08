import { NotionDatabaseData } from "@/types/notion";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

interface NotionTableProps {
  data: NotionDatabaseData;
}

export function NotionTable({ data }: NotionTableProps) {
  // Get column headers from schema properties
  const columns = Object.entries(data.schema.properties).map(([id, property]) => ({
    id,
    name: property.name,
  }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            {columns.map((column) => (
              <th key={column.id} className="p-2 text-left border">
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.pages.map((page, index) => {
            const typedPage = page as PageObjectResponse;
            return (
              <tr key={page.id} className="border-b hover:bg-gray-50">
                {columns.map((column) => {
                  const property = typedPage.properties[column.id];
                  // You might want to create a helper function to format different property types
                  return (
                    <td key={column.id} className="p-2 border">
                      {JSON.stringify(property)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
} 