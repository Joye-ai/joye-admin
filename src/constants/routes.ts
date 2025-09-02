// Route Constants
export const ROUTES = {
  // Public Routes (used)
  HOME: "/",
  LOGIN: "/login",

  // App Routes (used)
  DASHBOARD: "/dashboard",
  PROMPTS: "/prompts",
  USERS: "/users",
} as const;

// Route Groups
export const ROUTE_GROUPS = {
  PUBLIC: [ROUTES.HOME, ROUTES.LOGIN],
  PROTECTED: [ROUTES.DASHBOARD, ROUTES.USERS, ROUTES.PROMPTS],
} as const;
