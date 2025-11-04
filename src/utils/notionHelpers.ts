import { NotionDatabaseSchema } from "@/types/notion";

export interface TagOption {
  id: string;
  name: string;
  color: string;
}

/**
 * Extracts all available tag options from the Notion database schema
 * @param schema - The Notion database schema containing property definitions
 * @returns Array of tag options with id, name, and color
 */
export function extractAvailableTags(schema: NotionDatabaseSchema): TagOption[] {
  // Find the Tags property in the schema
  const tagsProperty = Object.values(schema.properties).find(
    (prop) => prop.name === "Tags" && prop.type === "multi_select"
  );

  // Return empty array if Tags property doesn't exist or isn't multi_select
  if (!tagsProperty || tagsProperty.type !== "multi_select") {
    console.warn("Tags property not found or is not a multi_select type");
    return [];
  }

  // Extract options from the multi_select property
  const options = tagsProperty.multi_select?.options || [];

  return options.map((option) => ({
    id: option.id || option.name, // Fallback to name if id is missing
    name: option.name,
    color: option.color || "default",
  }));
}

