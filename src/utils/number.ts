/**
 * Number utility functions
 */

/**
 * Format number with commas
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("en-US").format(num);
};

/**
 * Format currency
 */
export const formatCurrency = (
  amount: number,
  currency: string = "USD",
  locale: string = "en-US",
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
};

/**
 * Format percentage
 */
export const formatPercentage = (
  value: number,
  decimals: number = 2,
  locale: string = "en-US",
): string => {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

/**
 * Round number to specified decimals
 */
export const round = (num: number, decimals: number = 0): number => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Floor number to specified decimals
 */
export const floor = (num: number, decimals: number = 0): number => {
  return Math.floor(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Ceil number to specified decimals
 */
export const ceil = (num: number, decimals: number = 0): number => {
  return Math.ceil(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Clamp number between min and max
 */
export const clamp = (num: number, min: number, max: number): number => {
  return Math.min(Math.max(num, min), max);
};

/**
 * Check if number is even
 */
export const isEven = (num: number): boolean => {
  return num % 2 === 0;
};

/**
 * Check if number is odd
 */
export const isOdd = (num: number): boolean => {
  return num % 2 !== 0;
};

/**
 * Check if number is integer
 */
export const isInteger = (num: number): boolean => {
  return Number.isInteger(num);
};

/**
 * Check if number is positive
 */
export const isPositive = (num: number): boolean => {
  return num > 0;
};

/**
 * Check if number is negative
 */
export const isNegative = (num: number): boolean => {
  return num < 0;
};

/**
 * Check if number is zero
 */
export const isZero = (num: number): boolean => {
  return num === 0;
};

/**
 * Get random number between min and max
 */
export const random = (min: number = 0, max: number = 1): number => {
  return Math.random() * (max - min) + min;
};

/**
 * Get random integer between min and max
 */
export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Convert degrees to radians
 */
export const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Convert radians to degrees
 */
export const toDegrees = (radians: number): number => {
  return radians * (180 / Math.PI);
};

/**
 * Calculate percentage
 */
export const percentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

/**
 * Calculate percentage change
 */
export const percentageChange = (oldValue: number, newValue: number): number => {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
};

/**
 * Calculate compound interest
 */
export const compoundInterest = (
  principal: number,
  rate: number,
  time: number,
  frequency: number = 1,
): number => {
  return principal * Math.pow(1 + rate / frequency, frequency * time);
};

/**
 * Calculate simple interest
 */
export const simpleInterest = (principal: number, rate: number, time: number): number => {
  return principal * rate * time;
};

/**
 * Calculate distance between two points
 */
export const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * Calculate factorial
 */
export const factorial = (n: number): number => {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  return n * factorial(n - 1);
};

/**
 * Calculate fibonacci number
 */
export const fibonacci = (n: number): number => {
  if (n < 0) return NaN;
  if (n === 0) return 0;
  if (n === 1) return 1;

  let a = 0;
  let b = 1;

  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }

  return b;
};

/**
 * Check if number is prime
 */
export const isPrime = (num: number): boolean => {
  if (num < 2) return false;
  if (num === 2) return true;
  if (num % 2 === 0) return false;

  for (let i = 3; i <= Math.sqrt(num); i += 2) {
    if (num % i === 0) return false;
  }

  return true;
};

/**
 * Get greatest common divisor
 */
export const gcd = (a: number, b: number): number => {
  if (b === 0) return a;
  return gcd(b, a % b);
};

/**
 * Get least common multiple
 */
export const lcm = (a: number, b: number): number => {
  return Math.abs(a * b) / gcd(a, b);
};

/**
 * Convert number to ordinal
 */
export const toOrdinal = (num: number): string => {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = num % 100;
  const suffix = suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
  return num + suffix;
};

/**
 * Parse number from string
 */
export const parseNumber = (str: string): number => {
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Bytes";

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
};
