// Route Constants
export const ROUTES = {
  // Public Routes (used)
  HOME: "/",
  LOGIN: "/login",

  // App Routes (used)
  DASHBOARD: "/",
  PROMPTS: "/prompts",
  USERS: "/users",
  CHATS: "/chats",
  NOTIFICATION_LOGS: "/notification-logs",
  TEAMS_CARD_LOGS: "/teams-card-logs",
} as const;

// Route Groups
export const ROUTE_GROUPS = {
  PUBLIC: [ROUTES.LOGIN],
  PROTECTED: [
    ROUTES.HOME,
    ROUTES.USERS,
    ROUTES.PROMPTS,
    ROUTES.CHATS,
    ROUTES.NOTIFICATION_LOGS,
    ROUTES.TEAMS_CARD_LOGS,
  ],
} as const;
