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
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Logo Section */}
          <Link href={ROUTES.DASHBOARD} className="flex items-center gap-3 group">
            <div className="relative">
              <Image
                src="/logo.png"
                alt="Joye"
                width={32}
                height={32}
                className="rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200"
              />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#1f00a3]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-[#1f00a3] group-hover:text-[#1a0088] transition-colors duration-200">
                Joye Admin
              </span>
              <span className="text-xs text-gray-500 -mt-1">Dashboard</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-[#1f00a3] to-[#1a0088] text-white shadow-md"
                      : "text-gray-700 hover:text-[#1f00a3] hover:bg-[#1f00a3]/5"
                  }`}
                >
                  {item.label}
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                  )}
                </Link>
              );
            })}

            {/* User Menu */}
            <div className="ml-4 pl-4 border-l border-gray-200">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-all duration-200 group"
              >
                <svg
                  className="h-4 w-4 group-hover:rotate-12 transition-transform duration-200"
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
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              className={`h-6 w-6 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
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
        <div className="md:hidden border-t border-gray-200 bg-gray-50/50 backdrop-blur-sm">
          <div className="px-4 py-4 space-y-2">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-[#1f00a3] to-[#1a0088] text-white shadow-md"
                      : "text-gray-700 hover:bg-white hover:text-[#1f00a3] hover:shadow-sm"
                  }`}
                >
                  <span className="flex-1">{item.label}</span>
                  {active && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </Link>
              );
            })}

            <div className="pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 transition-all duration-200"
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
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative z-10 w-full max-w-sm mx-auto bg-white rounded-xl shadow-2xl p-6 transform transition-all duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-600"
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
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Logout</h3>
                <p className="text-sm text-gray-500">You&apos;ll need to sign in again</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to logout from your account?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
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
