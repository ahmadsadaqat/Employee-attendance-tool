const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Format a timestamp as the calendar date the user sees in their local
 * timezone. Date inputs provide YYYY-MM-DD values without a timezone, so
 * comparing these strings avoids UTC shifting the selected day.
 */
export function toLocalDateOnly(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isWithinLocalDateRange(
  timestamp: string,
  startDate?: string,
  endDate?: string,
): boolean {
  const localDate = toLocalDateOnly(timestamp)
  if (!localDate) return false

  if (startDate && DATE_ONLY_PATTERN.test(startDate) && localDate < startDate) {
    return false
  }
  if (endDate && DATE_ONLY_PATTERN.test(endDate) && localDate > endDate) {
    return false
  }
  return true
}
