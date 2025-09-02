// API Constants
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
export const MASTER_API_BASE_URL =
  process.env.NEXT_PUBLIC_MASTER_API_BASE_URL || "http://localhost:8081";
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    PROFILE: "/auth/profile",
  },
  USERS: {
    LIST: "/users",
    CREATE: "/users",
    UPDATE: "/users",
    DELETE: "/users",
  },
  DASHBOARD: {
    STATS: "/dashboard/stats",
    ANALYTICS: "/dashboard/analytics",
  },
} as const;

// App Constants
export const APP_CONFIG = {
  NAME: "Joye Admin",
  VERSION: "1.0.0",
  DESCRIPTION: "Joye Admin Dashboard",
} as const;

// UI Constants
export const UI_CONSTANTS = {
  SIDEBAR_WIDTH: 256,
  HEADER_HEIGHT: 64,
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    "2XL": 1536,
  },
} as const;

// Theme Constants
export const THEME = {
  COLORS: {
    PRIMARY: "#3B82F6",
    SECONDARY: "#64748B",
    SUCCESS: "#10B981",
    WARNING: "#F59E0B",
    ERROR: "#EF4444",
    INFO: "#06B6D4",
  },
  SPACING: {
    XS: "0.25rem",
    SM: "0.5rem",
    MD: "1rem",
    LG: "1.5rem",
    XL: "2rem",
    "2XL": "3rem",
  },
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "joye_admin_auth_token",
  USER_PREFERENCES: "joye_admin_user_preferences",
  THEME: "joye_admin_theme",
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: "MMM dd, yyyy",
  API: "yyyy-MM-dd",
  DATETIME: "MMM dd, yyyy HH:mm",
  TIME: "HH:mm",
} as const;

// Re-exports
export { ROUTES } from "./routes";
