"use client";

import { STORAGE_KEYS } from "@/constants";

export type MockLoginPayload = { email: string; password: string };

export const mockAuthApi = {
  async login(payload: MockLoginPayload): Promise<{ token: string }> {
    await new Promise((r) => setTimeout(r, 500));
    if (!payload.email || !payload.password) {
      throw new Error("Email and password are required");
    }
    const envEmail = process.env.NEXT_PUBLIC_MOCK_EMAIL?.toLowerCase();
    const envPassword = process.env.NEXT_PUBLIC_MOCK_PASSWORD;
    if (payload.email.toLowerCase() === envEmail && payload.password === envPassword) {
      return { token: "mock-token-123" };
    }
    throw new Error("Invalid credentials");
  },
};

export const authStorage = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },
  setToken(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },
  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  },
  isAuthenticated(): boolean {
    return !!authStorage.getToken();
  },
};

export function logoutSideEffects(): void {
  // remove cookie used by middleware
  if (typeof document !== "undefined") {
    document.cookie = "joye_admin_auth_token=; Max-Age=0; path=/; SameSite=Lax";
  }
}
