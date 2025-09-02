"use client";

import { useRouter } from "next/navigation";
import { ReactNode } from "react";

import { ROUTES } from "@/constants";
import { logoutSideEffects } from "@/lib";
import { useAppDispatch } from "@/store";
import { clearAuth } from "@/store/slices/authSlice";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const Header = ({ title, subtitle, actions }: HeaderProps) => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    dispatch(clearAuth());
    logoutSideEffects();
    router.replace(ROUTES.LOGIN);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center space-x-3">
          {actions}
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
