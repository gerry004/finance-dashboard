import { NotionDatabaseData } from "@/types/notion";
import { NotionTable } from "@/components/NotionTable";

export default async function DashboardPage() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/notion`, {
    cache: 'no-store'
  });
  const data: NotionDatabaseData = await response.json();

  console.log(data.schema.properties);
  console.log(data.pages);
  
  return (
    <main className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Finance Dashboard</h1>
      <NotionTable data={data} />
    </main>
  );
}
