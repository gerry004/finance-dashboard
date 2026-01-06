/**
 * Utility functions for date range filtering
 */

/**
 * Check if a date string falls within the specified date range
 * @param dateString - The date string to check (ISO format)
 * @param startDate - Optional start date (ISO format)
 * @param endDate - Optional end date (ISO format)
 * @returns true if the date is within range (or if no filters are set), false otherwise
 */
export function isDateInRange(
  dateString: string | null | undefined,
  startDate: string | null = null,
  endDate: string | null = null
): boolean {
  if (!dateString) return true; // Include if no date property
  
  const pageDate = new Date(dateString);
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return pageDate >= start && pageDate <= end;
  } else if (startDate) {
    const start = new Date(startDate);
    return pageDate >= start;
  } else if (endDate) {
    const end = new Date(endDate);
    return pageDate <= end;
  }
  
  return true; // Include if no date filter is set
}

