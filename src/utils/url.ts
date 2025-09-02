/**
 * URL utility functions
 */

/**
 * Parse URL parameters
 */
export const parseUrlParams = (url: string): Record<string, string> => {
  const params = new URLSearchParams(new URL(url).search);
  const result: Record<string, string> = {};

  for (const [key, value] of params) {
    result[key] = value;
  }

  return result;
};

/**
 * Build URL with parameters
 */
export const buildUrl = (baseUrl: string, params?: Record<string, any>): string => {
  const url = new URL(baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

/**
 * Check if URL is valid
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
