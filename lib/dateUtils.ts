/**
 * Post dates are stored as UTC midnight ISO strings (e.g., "2023-09-08T00:00:00.000Z").
 * Formatting must use UTC too, otherwise readers west of Greenwich see the previous day.
 */
const UTC = { timeZone: 'UTC' as const }

/**
 * Format date string to human-readable format
 * @param dateString - ISO date string (e.g., "2023-09-08T00:00:00.000Z")
 * @returns Formatted date string (e.g., "September 8, 2023")
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    ...UTC,
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Format date string to short format
 * @param dateString - ISO date string
 * @returns Short formatted date string (e.g., "Sep 8, 2023")
 */
export const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    ...UTC,
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/** Four-digit year of a post date, in UTC. */
export const getYear = (dateString: string): number => new Date(dateString).getUTCFullYear()

/** Reading time label, e.g. "5 min read" */
export const formatReadingTime = (minutes: number): string =>
  `${Math.max(1, Math.round(minutes))} min read`
