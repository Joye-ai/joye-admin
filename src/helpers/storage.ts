import { STORAGE_KEYS } from "@/constants";

/**
 * Storage helper functions
 */

export const storageHelpers = {
  /**
   * Set item in localStorage
   */
  set: (key: string, value: any): void => {
    if (typeof window === "undefined") return;

    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  },

  /**
   * Get item from localStorage
   */
  get: <T = any>(key: string, defaultValue?: T): T | null => {
    if (typeof window === "undefined") return defaultValue || null;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return defaultValue || null;
    }
  },

  /**
   * Remove item from localStorage
   */
  remove: (key: string): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  },

  /**
   * Clear all localStorage
   */
  clear: (): void => {
    if (typeof window === "undefined") return;
    localStorage.clear();
  },

  /**
   * Check if key exists in localStorage
   */
  has: (key: string): boolean => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(key) !== null;
  },

  /**
   * Get all keys from localStorage
   */
  keys: (): string[] => {
    if (typeof window === "undefined") return [];
    return Object.keys(localStorage);
  },

  /**
   * Set user preferences
   */
  setUserPreferences: (preferences: any): void => {
    storageHelpers.set(STORAGE_KEYS.USER_PREFERENCES, preferences);
  },

  /**
   * Get user preferences
   */
  getUserPreferences: (): any => {
    return storageHelpers.get(STORAGE_KEYS.USER_PREFERENCES, {});
  },

  /**
   * Set theme
   */
  setTheme: (theme: "light" | "dark" | "system"): void => {
    storageHelpers.set(STORAGE_KEYS.THEME, theme);
  },

  /**
   * Get theme
   */
  getTheme: (): "light" | "dark" | "system" => {
    return storageHelpers.get(STORAGE_KEYS.THEME, "system") || "system";
  },

  /**
   * Session storage helpers
   */
  session: {
    set: (key: string, value: any): void => {
      if (typeof window === "undefined") return;

      try {
        const serializedValue = JSON.stringify(value);
        sessionStorage.setItem(key, serializedValue);
      } catch (error) {
        console.error("Error saving to sessionStorage:", error);
      }
    },

    get: <T = any>(key: string, defaultValue?: T): T | null => {
      if (typeof window === "undefined") return defaultValue || null;

      try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue || null;
      } catch (error) {
        console.error("Error reading from sessionStorage:", error);
        return defaultValue || null;
      }
    },

    remove: (key: string): void => {
      if (typeof window === "undefined") return;
      sessionStorage.removeItem(key);
    },

    clear: (): void => {
      if (typeof window === "undefined") return;
      sessionStorage.clear();
    },
  },
};
