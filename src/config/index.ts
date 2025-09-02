/**
 * Application configuration
 */

export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api",
    timeout: 10000,
  },

  // App Configuration
  app: {
    name: "Joye Admin",
    version: "1.0.0",
    description: "Joye Admin Dashboard",
  },

  // Environment
  env: {
    isDevelopment: process.env.NODE_ENV === "development",
    isProduction: process.env.NODE_ENV === "production",
    isTest: process.env.NODE_ENV === "test",
  },

  // Features
  features: {
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
    enableNotifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS === "true",
  },
} as const;
