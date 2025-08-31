/**
 * Format date string to human-readable format
 * @param dateString - ISO date string (e.g., "2023-09-08T00:00:00.000Z")
 * @returns Formatted date string (e.g., "September 8, 2023")
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
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
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}


