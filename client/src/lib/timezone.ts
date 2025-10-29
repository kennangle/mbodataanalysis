/**
 * Timezone utilities for displaying dates in user's preferred timezone
 */

/**
 * Format a date in the user's timezone
 * @param date - Date to format (can be Date object, ISO string, or YYYY-MM-DD string)
 * @param timezone - User's timezone (e.g., "America/New_York")
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string = "UTC",
  options: Intl.DateTimeFormatOptions = {}
): string {
  // For date-only strings (YYYY-MM-DD), format directly without timezone conversion
  // This ensures calendar dates display correctly regardless of timezone
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    const formatter = new Intl.DateTimeFormat("en-US", options);
    // Create a simple date object for formatting only (not for timezone conversion)
    const simpleDate = new Date(year, month - 1, day);
    return formatter.format(simpleDate);
  }
  
  // For timestamps, convert to target timezone
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    ...options,
  };

  return new Intl.DateTimeFormat("en-US", defaultOptions).format(dateObj);
}

/**
 * Format a date as "MMM D, YYYY" in user's timezone
 */
export function formatDateShort(date: Date | string, timezone: string = "UTC"): string {
  return formatInTimezone(date, timezone, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date as "MMMM D, YYYY" in user's timezone
 */
export function formatDateLong(date: Date | string, timezone: string = "UTC"): string {
  return formatInTimezone(date, timezone, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a datetime as "MMM D, YYYY h:mm A" in user's timezone
 */
export function formatDateTime(date: Date | string, timezone: string = "UTC"): string {
  return formatInTimezone(date, timezone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a datetime as "MMM D, YYYY h:mm:ss A" in user's timezone
 */
export function formatDateTimeFull(date: Date | string, timezone: string = "UTC"): string {
  return formatInTimezone(date, timezone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * Format time only as "h:mm A" in user's timezone
 */
export function formatTime(date: Date | string, timezone: string = "UTC"): string {
  return formatInTimezone(date, timezone, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 * This is timezone-agnostic as it shows relative time
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? "s" : ""} ago`;
  
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears !== 1 ? "s" : ""} ago`;
}

/**
 * Get the current date/time in the user's timezone as a Date object
 */
export function nowInTimezone(timezone: string = "UTC"): Date {
  // Create a date string in the target timezone and parse it back
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const getValue = (type: string) => parts.find((p) => p.type === type)?.value;

  return new Date(
    `${getValue("year")}-${getValue("month")}-${getValue("day")}T${getValue("hour")}:${getValue("minute")}:${getValue("second")}`
  );
}

/**
 * Convert a date to YYYY-MM-DD format in user's timezone
 * Useful for API calls and date pickers
 */
export function toDateString(date: Date | string, timezone: string = "UTC"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(dateObj);
}
