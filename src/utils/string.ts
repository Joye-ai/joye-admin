/**
 * String utility functions
 */

/**
 * Capitalize first letter
 */
export const capitalize = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert to title case
 */
export const toTitleCase = (str: string): string => {
  if (!str) return str;
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

/**
 * Convert to camel case
 */
export const toCamelCase = (str: string): string => {
  if (!str) return str;
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
};

/**
 * Convert to kebab case
 */
export const toKebabCase = (str: string): string => {
  if (!str) return str;
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
};

/**
 * Convert to snake case
 */
export const toSnakeCase = (str: string): string => {
  if (!str) return str;
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
};

/**
 * Convert to pascal case
 */
export const toPascalCase = (str: string): string => {
  if (!str) return str;
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
      return word.toUpperCase();
    })
    .replace(/\s+/g, "");
};

/**
 * Truncate string
 */
export const truncate = (str: string, length: number, suffix: string = "..."): string => {
  if (!str || str.length <= length) return str;
  return str.substring(0, length) + suffix;
};

/**
 * Remove HTML tags
 */
export const stripHtml = (str: string): string => {
  if (!str) return str;
  return str.replace(/<[^>]*>/g, "");
};

/**
 * Escape HTML
 */
export const escapeHtml = (str: string): string => {
  if (!str) return str;
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
};

/**
 * Unescape HTML
 */
export const unescapeHtml = (str: string): string => {
  if (!str) return str;
  const div = document.createElement("div");
  div.innerHTML = str;
  return div.textContent || div.innerText || "";
};

/**
 * Generate slug from string
 */
export const slugify = (str: string): string => {
  if (!str) return str;
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Generate random string
 */
export const randomString = (length: number = 10): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Check if string is email
 */
export const isEmail = (str: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
};

/**
 * Check if string is URL
 */
export const isUrl = (str: string): boolean => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if string is phone number
 */
export const isPhoneNumber = (str: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(str);
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);

  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }

  return phone;
};

/**
 * Mask email
 */
export const maskEmail = (email: string): string => {
  if (!email || !isEmail(email)) return email;

  const [localPart, domain] = email.split("@");
  const maskedLocal =
    localPart.length > 2 ? localPart.substring(0, 2) + "*".repeat(localPart.length - 2) : localPart;

  return `${maskedLocal}@${domain}`;
};

/**
 * Mask phone number
 */
export const maskPhoneNumber = (phone: string): string => {
  if (!phone) return phone;

  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 4) return phone;

  const visible = cleaned.slice(-4);
  const masked = "*".repeat(cleaned.length - 4);

  return `${masked}${visible}`;
};

/**
 * Remove extra whitespace
 */
export const normalizeWhitespace = (str: string): string => {
  if (!str) return str;
  return str.replace(/\s+/g, " ").trim();
};

/**
 * Count words
 */
export const countWords = (str: string): number => {
  if (!str) return 0;
  return str.trim().split(/\s+/).length;
};

/**
 * Count characters
 */
export const countCharacters = (str: string): number => {
  return str ? str.length : 0;
};

/**
 * Reverse string
 */
export const reverse = (str: string): string => {
  if (!str) return str;
  return str.split("").reverse().join("");
};

/**
 * Check if string is palindrome
 */
export const isPalindrome = (str: string): boolean => {
  if (!str) return true;
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned === reverse(cleaned);
};
