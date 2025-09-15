"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { Layout } from "@/components/layout";
import { Card, CardContent, Loader } from "@/components/ui";
import { ROUTES } from "@/constants";
import { useAppSelector } from "@/store";

const PLATFORM_OPTIONS = [
  { label: "Teams", value: "teams" },
  { label: "Viswas", value: "viswas" },
];

const TENANT_OPTIONS = [
  { label: "Tenant 1", value: "tenant1" },
  { label: "Tenant 2", value: "tenant2" },
];

const USER_OPTIONS = [
  { label: "User 1", value: "user1" },
  { label: "User 2", value: "user2" },
];

const FEATURE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Mindful Minute", value: "mindful-minutes" },
  { label: "Brew", value: "brew" },
  { label: "Quick JL", value: "quick-jl" },
  { label: "BYB", value: "byb" },
];

// 🔹 Static KPI data (for demo)
const KPI_DATA = [
  { title: "Total (Consolidated)", value: "12,345" },
  { title: "Model (Tenant Selected)", value: "Tenant 1 Model A" },
  { title: "Number of Sessions", value: "456" },
  { title: "Turns Per Session (Total Turns)", value: "3.4" },
  { title: "Input Tokens per Session (Total)", value: "23,450" },
  { title: "Cache Creation Input Tokens", value: "5,200" },
  { title: "Cache Read Input Tokens", value: "8,900" },
  { title: "Output Tokens per Session (Total)", value: "19,340" },
];

// 🔹 Per Feature KPIs
const FEATURE_KPIS = {
  brew: [
    { title: "Feature Name", value: "Brew" },
    { title: "Model (Tenant Selected)", value: "Tenant 1 Brew Model" },
    { title: "Number of Sessions", value: "210" },
    { title: "Turns Per Session (Total Turns)", value: "4.2" },
    { title: "Input Tokens per Session (Total)", value: "10,500" },
    { title: "Cache Creation Input Tokens", value: "2,100" },
    { title: "Cache Read Input Tokens", value: "3,900" },
    { title: "Output Tokens per Session (Total)", value: "8,000" },
  ],
  mindful: [
    { title: "Feature Name", value: "Mindful Minute" },
    { title: "Model (Tenant Selected)", value: "Tenant 1 Mindful Model" },
    { title: "Number of Sessions", value: "246" },
    { title: "Turns Per Session (Total Turns)", value: "3.8" },
    { title: "Input Tokens per Session (Total)", value: "12,950" },
    { title: "Cache Creation Input Tokens", value: "3,100" },
    { title: "Cache Read Input Tokens", value: "5,000" },
    { title: "Output Tokens per Session (Total)", value: "9,200" },
  ],
};

export default function ChatPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(ROUTES.LOGIN);
    }
  }, [router, isAuthenticated]);

  const [loading, setLoading] = useState(false);

  // Filter states
  const [platform, setPlatform] = useState<string>("");
  const [tenant, setTenant] = useState<string>("");
  const [user, setUser] = useState<string>("");
  const [feature, setFeature] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });

  const applyFilters = () => {
    console.log({
      platform,
      tenant,
      user,
      feature,
      dateRange,
    });
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      console.log("Filters applied!");
    }, 1500);
  };

  const resetFilters = () => {
    setPlatform("");
    setTenant("");
    setUser("");
    setFeature("all");
    setDateRange({ start: "", end: "" });
  };

  // 🔹 Reusable small KPI component
  const SmallKPI = ({ title, value }: { title: string; value: string }) => (
    <div className="flex flex-col border rounded-lg p-3 bg-white shadow-sm">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );

  return (
    <Layout
      title="Chat"
      subtitle="Filter and manage chat sessions"
      actions={
        <button
          disabled={loading}
          onClick={() => console.log("refresh chat")}
          className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Refresh data"
        >
          {loading ? <Loader type="dots" size="sm" variant="primary" /> : "↻"}
        </button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent>
            <div className="py-4">
              <div className="flex flex-wrap gap-4 items-end">
                {/* Platform */}
                <div className="flex flex-col flex-1 min-w-[150px]">
                  <label className="text-sm font-medium text-gray-700 mb-1">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    disabled={loading}
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f00a3]"
                  >
                    <option value="">Select Platform</option>
                    {PLATFORM_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tenant */}
                <div className="flex flex-col flex-1 min-w-[150px]">
                  <label className="text-sm font-medium text-gray-700 mb-1">Tenant</label>
                  <select
                    value={tenant}
                    onChange={(e) => setTenant(e.target.value)}
                    disabled={loading}
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f00a3]"
                  >
                    <option value="">Select Tenant</option>
                    {TENANT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* User */}
                <div className="flex flex-col flex-1 min-w-[150px]">
                  <label className="text-sm font-medium text-gray-700 mb-1">User</label>
                  <select
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    disabled={loading}
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f00a3]"
                  >
                    <option value="">Select User</option>
                    {USER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Feature */}
                <div className="flex flex-col flex-1 min-w-[150px]">
                  <label className="text-sm font-medium text-gray-700 mb-1">Feature</label>
                  <select
                    value={feature}
                    onChange={(e) => setFeature(e.target.value)}
                    disabled={loading}
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f00a3]"
                  >
                    {FEATURE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range */}
                <div className="flex flex-col flex-1 min-w-[300px]">
                  <label className="text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange((d) => ({ ...d, start: e.target.value }))}
                      disabled={loading}
                      className="h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f00a3] flex-1"
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))}
                      disabled={loading}
                      className="h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f00a3] flex-1"
                    />
                  </div>
                </div>

                {/* Apply / Reset */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="h-10 px-3 rounded-md bg-[#1f00a3] text-white text-sm hover:opacity-95 transition"
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="h-10 px-3 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Consolidated KPIs */}
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Consolidated KPIs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {KPI_DATA.map((kpi, idx) => (
                <SmallKPI key={idx} title={kpi.title} value={kpi.value} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Feature KPIs – Brew */}
        {(feature === "all" || feature === "brew") && (
          <Card>
            <CardContent>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature KPIs</h2>
              <h3 className="text-md font-semibold text-gray-800 mb-3">Feature: Brew</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {FEATURE_KPIS.brew.map((kpi, idx) => (
                  <SmallKPI key={`brew-${idx}`} title={kpi.title} value={kpi.value} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feature KPIs – Mindful Minute */}
        {(feature === "all" || feature === "mindful-minutes") && (
          <Card>
            <CardContent>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature KPIs</h2>
              <h3 className="text-md font-semibold text-gray-800 mb-3">Feature: Mindful Minute</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {FEATURE_KPIS.mindful.map((kpi, idx) => (
                  <SmallKPI key={`mindful-${idx}`} title={kpi.title} value={kpi.value} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
