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
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};
