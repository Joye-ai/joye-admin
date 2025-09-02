/**
 * Date utility functions
 */

/**
 * Format date to string
 */
export const formatDate = (date: Date | string | number, format: string = "YYYY-MM-DD"): string => {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    throw new Error("Invalid date");
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  return format
    .replace("YYYY", String(year))
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds);
};

/**
 * Parse date string
 */
export const parseDate = (dateString: string): Date => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date string");
  }
  return date;
};

/**
 * Get start of day
 */
export const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day
 */
export const endOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get start of week
 */
export const startOfWeek = (date: Date, firstDayOfWeek: number = 0): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day - firstDayOfWeek;
  d.setDate(d.getDate() - diff);
  return startOfDay(d);
};

/**
 * Get end of week
 */
export const endOfWeek = (date: Date, firstDayOfWeek: number = 0): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day - firstDayOfWeek;
  d.setDate(d.getDate() + (6 - diff));
  return endOfDay(d);
};

/**
 * Get start of month
 */
export const startOfMonth = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(1);
  return startOfDay(d);
};

/**
 * Get end of month
 */
export const endOfMonth = (date: Date): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  return endOfDay(d);
};

/**
 * Add days to date
 */
export const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Add months to date
 */
export const addMonths = (date: Date, months: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

/**
 * Add years to date
 */
export const addYears = (date: Date, years: number): Date => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
};

/**
 * Get difference in days
 */
export const differenceInDays = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get difference in hours
 */
export const differenceInHours = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60));
};

/**
 * Get difference in minutes
 */
export const differenceInMinutes = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60));
};

/**
 * Check if date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Check if date is yesterday
 */
export const isYesterday = (date: Date): boolean => {
  const yesterday = addDays(new Date(), -1);
  return date.toDateString() === yesterday.toDateString();
};

/**
 * Check if date is tomorrow
 */
export const isTomorrow = (date: Date): boolean => {
  const tomorrow = addDays(new Date(), 1);
  return date.toDateString() === tomorrow.toDateString();
};

/**
 * Check if date is in the past
 */
export const isPast = (date: Date): boolean => {
  return date < new Date();
};

/**
 * Check if date is in the future
 */
export const isFuture = (date: Date): boolean => {
  return date > new Date();
};

/**
 * Get relative time string
 */
export const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;

  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

/**
 * Check if year is leap year
 */
export const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

/**
 * Get days in month
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};
