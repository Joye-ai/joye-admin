"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ROUTES } from "@/constants";
import { logoutSideEffects } from "@/lib/auth";
import { useAppDispatch } from "@/store";
import { clearAuth } from "@/store/slices/authSlice";

export function TopNav() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const nav = [
    { label: "Dashboard", href: ROUTES.DASHBOARD },
    { label: "Prompts", href: ROUTES.PROMPTS },
    { label: "Users", href: ROUTES.USERS },
  ];

  const performLogout = () => {
    dispatch(clearAuth());
    logoutSideEffects();
    window.location.href = ROUTES.LOGIN;
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-14 flex items-center justify-between">
          <Link href={ROUTES.DASHBOARD} className="flex items-center gap-2">
            <Image src="/logo.png" alt="Joye" width={28} height={28} className="rounded" />
            <span className="text-lg font-semibold text-[#1f00a3]">Joye Admin</span>
          </Link>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-4">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    active ? "bg-[#1f00a3]/10 text-[#1f00a3]" : "text-gray-700 hover:text-[#1f00a3]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="ml-2 px-3 py-2 rounded-md text-sm border border-[#1f00a3] text-[#1f00a3] hover:bg-[#1f00a3]/10 flex items-center gap-2 cursor-pointer"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3" />
              </svg>
              Logout
            </button>
          </div>
          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-4 py-3 space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm ${
                    active
                      ? "bg-[#1f00a3]/10 text-[#1f00a3]"
                      : "text-gray-700 hover:bg-gray-50 hover:text-[#1f00a3]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm bg-[#1f00a3] text-white hover:opacity-90 cursor-pointer"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}
      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative z-10 w-full max-w-sm mx-auto bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900">Confirm logout</h3>
            <p className="mt-2 text-sm text-gray-600">Are you sure you want to logout?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-md text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md text-sm bg-[#1f00a3] text-white hover:opacity-90 cursor-pointer"
                onClick={performLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
