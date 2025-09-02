import { useRouter } from "next/navigation";

import { ROUTES } from "@/constants";

/**
 * Generic navigation function - pass only the route
 * @param router - Next.js router instance
 * @param route - Route path to navigate to
 */
export const navigateTo = (router: any, route: string): void => {
  router.push(route);
};

/**
 * Navigation helper functions
 */

export const navigationHelpers = {
  /**
   * Generic navigation function - pass only the route
   */
  goTo: (router: any, route: string): void => {
    router.push(route);
  },

  /**
   * Navigate to a route (legacy function)
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
