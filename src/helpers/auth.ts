import { STORAGE_KEYS } from "@/constants";

/**
 * Authentication helper functions
 */

export const authHelpers = {
  /**
   * Get stored authentication token
   */
  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  /**
   * Set authentication token
   */
  setToken: (token: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  /**
   * Remove authentication token
   */
  removeToken: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    const token = authHelpers.getToken();
    return !!token;
  },

  /**
   * Get authorization header
   */
  getAuthHeader: (): Record<string, string> => {
    const token = authHelpers.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  /**
   * Parse JWT token payload
   */
  parseToken: (token: string): any => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join(""),
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error parsing token:", error);
      return null;
    }
  },

  /**
   * Check if token is expired
   */
  isTokenExpired: (token: string): boolean => {
    const payload = authHelpers.parseToken(token);
    if (!payload || !payload.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  },
};
