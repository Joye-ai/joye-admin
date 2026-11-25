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
  ORGANIZATION_ANALYTICS: "/organization-analytics",
  ORG_ANALYTICS: "/org-analytics",
  CLIENT_REPORT: "/client-report",
  TIERS: "/tiers",
  TIER_ASSIGNMENTS: "/tiers/assignments",
  TIER_MANAGE: "/tiers/manage",
  FEATURE_MANAGE: "/tiers/features",
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
    ROUTES.ORGANIZATION_ANALYTICS,
    ROUTES.ORG_ANALYTICS,
    ROUTES.CLIENT_REPORT,
    ROUTES.TIERS,
    ROUTES.TIER_ASSIGNMENTS,
    ROUTES.TIER_MANAGE,
    ROUTES.FEATURE_MANAGE,
  ],
} as const;
