import { useRouter } from "next/navigation";

import { ROUTES } from "@/constants";

/**
 * Navigation helper functions
 */

export const navigationHelpers = {
  /**
   * Navigate to a route
   */
  navigate: (router: any, path: string): void => {
    router.push(path);
  },

  /**
   * Navigate back
   */
  goBack: (router: any): void => {
    router.back();
  },

  /**
   * Navigate to home
   */
  goHome: (router: any): void => {
    router.push(ROUTES.HOME);
  },

  /**
   * Navigate to dashboard
   */
  goToDashboard: (router: any): void => {
    router.push(ROUTES.DASHBOARD);
  },

  /**
   * Navigate to login
   */
  goToLogin: (router: any): void => {
    router.push(ROUTES.LOGIN);
  },

  /**
   * Navigate to users
   */
  goToUsers: (router: any): void => {
    router.push(ROUTES.USERS);
  },

  /**
   * Navigate to user create
   */
  goToUserCreate: (router: any): void => {
    router.push(ROUTES.USER_CREATE);
  },

  /**
   * Navigate to user edit
   */
  goToUserEdit: (router: any, userId: string): void => {
    router.push(`${ROUTES.USER_EDIT}/${userId}`);
  },

  /**
   * Navigate to settings
   */
  goToSettings: (router: any): void => {
    router.push(ROUTES.SETTINGS);
  },

  /**
   * Check if current route matches
   */
  isCurrentRoute: (pathname: string, route: string): boolean => {
    return pathname === route;
  },

  /**
   * Check if current route starts with
   */
  isCurrentRouteStartsWith: (pathname: string, route: string): boolean => {
    return pathname.startsWith(route);
  },

  /**
   * Get breadcrumbs for current route
   */
  getBreadcrumbs: (pathname: string): Array<{ label: string; href: string }> => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: Array<{ label: string; href: string }> = [
      { label: "Home", href: ROUTES.HOME },
    ];

    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({
        label: label.replace("-", " "),
        href: currentPath,
      });
    });

    return breadcrumbs;
  },

  /**
   * Generate pagination URLs
   */
  getPaginationUrls: (
    basePath: string,
    currentPage: number,
    totalPages: number,
  ): {
    first: string;
    prev: string | null;
    next: string | null;
    last: string;
  } => {
    const first = `${basePath}?page=1`;
    const prev = currentPage > 1 ? `${basePath}?page=${currentPage - 1}` : null;
    const next = currentPage < totalPages ? `${basePath}?page=${currentPage + 1}` : null;
    const last = `${basePath}?page=${totalPages}`;

    return { first, prev, next, last };
  },
};
