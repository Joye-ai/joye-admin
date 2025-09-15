// Route Constants
export const ROUTES = {
  // Public Routes (used)
  HOME: "/",
  LOGIN: "/login",

  // App Routes (used)
  DASHBOARD: "/",
  PROMPTS: "/prompts",
  USERS: "/users",
  CHAT: "/chat",
} as const;

// Route Groups
export const ROUTE_GROUPS = {
  PUBLIC: [ROUTES.LOGIN],
  PROTECTED: [ROUTES.HOME, ROUTES.USERS, ROUTES.PROMPTS],
} as const;
