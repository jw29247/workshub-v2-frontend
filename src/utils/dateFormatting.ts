/**
 * Date and time formatting utilities for UK timezone (BST/GMT)
 * All dates are displayed in UK time regardless of user's local timezone
 */

/**
 * Format a date string or Date object to UK date format
 * @param date - ISO string, Date object, or timestamp
 * @param options - Additional formatting options
 * @returns Formatted date string in UK timezone
 */
export const formatUKDate = (
  date: string | Date | number,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/London'
  }
  
  return new Date(date).toLocaleDateString('en-GB', {
    ...defaultOptions,
    ...options
  })
}

/**
 * Format a time to UK timezone
 * @param date - ISO string, Date object, or timestamp
 * @param options - Additional formatting options
 * @returns Formatted time string in UK timezone
 */
export const formatUKTime = (
  date: string | Date | number,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London'
  }
  
  return new Date(date).toLocaleTimeString('en-GB', {
    ...defaultOptions,
    ...options
  })
}

/**
 * Format a date and time to UK timezone
 * @param date - ISO string, Date object, or timestamp
 * @param options - Additional formatting options
 * @returns Formatted date and time string in UK timezone
 */
export const formatUKDateTime = (
  date: string | Date | number,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London'
  }
  
  return new Date(date).toLocaleString('en-GB', {
    ...defaultOptions,
    ...options
  })
}

/**
 * Get current UK time zone abbreviation (BST or GMT)
 * @param date - Optional date to check (defaults to now)
 * @returns 'BST' or 'GMT'
 */
export const getUKTimeZoneAbbr = (date: Date = new Date()): string => {
  const ukDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/London' }))
  const utcDate = new Date(date.toUTCString())
  const offset = (ukDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60)
  return offset === 1 ? 'BST' : 'GMT'
}

/**
 * Format date range for display
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range string
 */
export const formatUKDateRange = (
  startDate: string | Date | number,
  endDate: string | Date | number
): string => {
  const start = formatUKDate(startDate)
  const end = formatUKDate(endDate)
  return `${start} - ${end}`
}

/**
 * Get a human-readable relative time (e.g., "2 hours ago")
 * @param date - Date to compare
 * @param baseDate - Base date for comparison (defaults to now)
 * @returns Relative time string
 */
export const getRelativeTime = (
  date: string | Date | number,
  baseDate: Date = new Date()
): string => {
  const targetDate = new Date(date)
  const diffMs = baseDate.getTime() - targetDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  
  return formatUKDate(targetDate)
}

/**
 * Convert a date to UK timezone
 * @param date - Date to convert
 * @returns Date object in UK timezone
 */
export const toUKTime = (date: Date = new Date()): Date => {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Europe/London' }))
}