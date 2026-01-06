/**
 * Utility functions for filtering Notion pages
 */

import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { isDateInRange } from "./dateHelpers";

/**
 * Check if a Notion page should be included based on date and tag filters
 * @param page - The Notion page to check
 * @param excludedTags - Set of tag names to exclude
 * @param startDate - Optional start date filter (ISO format)
 * @param endDate - Optional end date filter (ISO format)
 * @returns true if the page should be included, false otherwise
 */
export function shouldIncludePage(
  page: PageObjectResponse,
  excludedTags: Set<string>,
  startDate: string | null = null,
  endDate: string | null = null
): boolean {
  // Filter by date range
  const createdDate = page.properties['Created']?.type === 'date'
    ? page.properties['Created'].date?.start
    : null;
  
  if (!isDateInRange(createdDate, startDate, endDate)) {
    return false;
  }
  
  // Filter by tags
  const tags = page.properties['Tags']?.type === 'multi_select' 
    ? page.properties['Tags'].multi_select
    : [];
  
  // Include page if it has no tags or at least one non-excluded tag
  return tags.length === 0 || tags.some(tag => !excludedTags.has(tag.name));
}

/**
 * Extract tags from a Notion page
 * @param page - The Notion page
 * @returns Array of tag names
 */
export function extractTagsFromPage(page: PageObjectResponse): string[] {
  const tags = page.properties['Tags']?.type === 'multi_select' 
    ? page.properties['Tags'].multi_select
    : [];
  return tags.map(tag => tag.name);
}

/**
 * Extract the created date from a Notion page
 * @param page - The Notion page
 * @returns The created date string or null
 */
export function extractCreatedDate(page: PageObjectResponse): string | null {
  return page.properties['Created']?.type === 'date'
    ? page.properties['Created'].date?.start || null
    : null;
}

/**
 * Extract amount from a Notion page property
 * @param property - The property object
 * @returns The numeric amount or 0
 */
export function extractAmount(property: any): number {
  if (!property || property.type !== 'number') return 0;
  const amount = property.number;
  return typeof amount === 'string' ? parseFloat(amount) : amount;
}

/**
 * Extract type from a Notion page property
 * @param property - The property object
 * @returns The type name in lowercase or empty string
 */
export function extractType(property: any): string {
  return property?.type === 'select' 
    ? property.select?.name?.toLowerCase() || ''
    : '';
}

