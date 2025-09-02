"use client";

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { STORAGE_KEYS } from "@/constants";

export interface AuthState {
  token: string | null;
  email: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  token: typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : null,
  email: null,
  isAuthenticated:
    typeof window !== "undefined" ? !!localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ token: string; email?: string }>) => {
      state.token = action.payload.token;
      state.email = action.payload.email ?? null;
      state.isAuthenticated = true;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, action.payload.token);
      }
    },
    clearAuth: (state) => {
      state.token = null;
      state.email = null;
      state.isAuthenticated = false;
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      }
    },
  },
});

export const { setCredentials, clearAuth } = authSlice.actions;
export default authSlice.reducer;
