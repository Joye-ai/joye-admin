"use client";

import { ReactNode } from "react";

import { TopNav } from "./TopNav";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const Layout = ({ children, title, subtitle, actions }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopNav />
      <main className="flex-1 p-6">
        {(title || subtitle || actions) && (
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
                {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center space-x-3">{actions}</div>}
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
};
