"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Layout } from "@/components/layout";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  MultiSelect,
  DateRangePicker,
} from "@/components/ui";
import { ROUTES } from "@/constants";
import { post, patch, get } from "@/helpers/api";
import { useAppSelector } from "@/store";

interface FilterState {
  platform: string;
  tenant: string;
  user: string;
  featureTypes: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

interface KPIData {
  model: string;
  sessions: number;
  turnsPerSession: number;
  totalTurns: number;
  inputTokensPerSession: number;
  totalInputTokens: number;
  cacheCreationTokensPerSession: number;
  totalCacheCreationTokens: number;
  cacheReadTokensPerSession: number;
  totalCacheReadTokens: number;
  outputTokensPerSession: number;
  totalOutputTokens: number;
}

export default function ChatsPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const didFetchPlatforms = useRef(false);

  const getCurrentWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
    };
  };

  const [filters, setFilters] = useState<FilterState>({
    platform: "",
    tenant: "",
    user: "",
    featureTypes: [],
    dateRange: getCurrentWeekRange(),
  });
  const [platformOptions, setPlatformOptions] = useState<{ key: string; name: string }[]>([]);
  const [organisationOptions, setOrganisationOptions] = useState<{ _id: string; name: string }[]>(
    [],
  );
  const [userOptions, setUserOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(ROUTES.LOGIN);
    }
    if (!didFetchPlatforms.current) {
      didFetchPlatforms.current = true;
      fetchPlatforms();
    }
  }, [router, isAuthenticated]);

  // Mock data for demonstration
  const consolidatedData: KPIData = {
    model: "GPT-4",
    sessions: 1250,
    turnsPerSession: 3.2,
    totalTurns: 4000,
    inputTokensPerSession: 150,
    totalInputTokens: 187500,
    cacheCreationTokensPerSession: 25,
    totalCacheCreationTokens: 31250,
    cacheReadTokensPerSession: 30,
    totalCacheReadTokens: 37500,
    outputTokensPerSession: 200,
    totalOutputTokens: 250000,
  };

  const brewData: KPIData = {
    model: "GPT-4",
    sessions: 450,
    turnsPerSession: 2.8,
    totalTurns: 1260,
    inputTokensPerSession: 120,
    totalInputTokens: 54000,
    cacheCreationTokensPerSession: 20,
    totalCacheCreationTokens: 9000,
    cacheReadTokensPerSession: 25,
    totalCacheReadTokens: 11250,
    outputTokensPerSession: 180,
    totalOutputTokens: 81000,
  };

  const mindfulMinuteData: KPIData = {
    model: "GPT-4",
    sessions: 800,
    turnsPerSession: 3.5,
    totalTurns: 2800,
    inputTokensPerSession: 180,
    totalInputTokens: 144000,
    cacheCreationTokensPerSession: 30,
    totalCacheCreationTokens: 24000,
    cacheReadTokensPerSession: 35,
    totalCacheReadTokens: 28000,
    outputTokensPerSession: 220,
    totalOutputTokens: 176000,
  };

  const handleFilterChange = (
    key: keyof FilterState,
    value: string | string[] | { start: string; end: string },
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || (key === "dateRange" ? getCurrentWeekRange() : value),
    }));

    if (key === "platform" && typeof value === "string") {
      fetchOrganisations(value);
      setOrganisationOptions([]);
      setUserOptions([]);
      setFilters((prev) => ({ ...prev, tenant: "", user: "" }));
    }

    if (key === "tenant" && typeof value === "string") {
      fetchUsers(value);
      setUserOptions([]);
      setFilters((prev) => ({ ...prev, user: "" }));
    }
  };

  // Helper function to clean filter parameters
  const prepareFilterParams = () => {
    const filterParams = {
      platform: filters.platform || null,
      tenant: filters.tenant || null,
      user: filters.user || null,
      featureTypes: filters.featureTypes.length > 0 ? filters.featureTypes : null,
      dateRange: {
        start: filters.dateRange.start || null,
        end: filters.dateRange.end || null,
      },
    };

    // Remove null values to clean up the payload
    const cleanedParams = Object.fromEntries(
      Object.entries(filterParams).filter(([, value]) => {
        if (value === null) return false;
        if (typeof value === "object" && value !== null && "start" in value && "end" in value) {
          // For dateRange object, check if both start and end are null
          return !(value.start === null && value.end === null);
        }
        return true;
      }),
    );

    return cleanedParams;
  };

  // API call function (replace with actual implementation)
  const fetchChatData = async (params: any) => {
    try {
      // Example API call structure
      const response = await fetch("/api/chats/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch chat data");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching chat data:", error);
      throw error;
    }
  };

  const fetchPlatforms = async () => {
    try {
      const response = await get<{ key: string; name: string }[]>("/admin/platform-data");

      if (response) {
        setPlatformOptions(response);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch data";
      console.error("Error fetching platforms:", message);
    }
  };

  const fetchOrganisations = async (platformKey: string) => {
    if (!platformKey) return;
    try {
      const response = await get<{ _id: string; name: string }[]>(
        `/admin/organization/${platformKey}`,
      );

      if (response) {
        const mapped = response.map((org) => ({
          _id: org._id,
          name: org.name,
        }));
        setOrganisationOptions(mapped);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch organization";
      console.error("Error fetching organizations", message);
    }
  };

  const fetchUsers = async (tenantId: string) => {
    if (!tenantId) return;
    try {
      const response = await get<{
        users: { _id: string; email: string; employeeId: string }[];
      }>(`/admin/users/${tenantId}`);

      if (response && Array.isArray(response.users)) {
        const mapped = response?.users?.map((user) => ({
          name: user.email?.trim() || user.employeeId,
          id: user.employeeId,
        }));
        setUserOptions(mapped);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch users";
      console.error("Error fetching users:", message);
    }
  };

  const handleApplyFilters = async () => {
    try {
      const filterParams = prepareFilterParams();

      console.log("Filter parameters for API call:", filterParams);

      // TODO: Uncomment when API is ready
      // const chatData = await fetchChatData(filterParams);
      // Update state with fetched data

      // For now, just show the parameters
      alert(`Filters applied!\n\nParameters:\n${JSON.stringify(filterParams, null, 2)}`);
    } catch (error) {
      console.error("Error applying filters:", error);
      alert("Error applying filters. Please try again.");
    }
  };

  const KPITile = ({
    title,
    value,
    subtitle,
    change,
    changeType,
  }: {
    title: string;
    value: string;
    subtitle?: string;
    change?: string;
    changeType?: "increase" | "decrease";
  }) => (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {change && (
            <div className="flex items-center">
              <span
                className={`text-sm font-medium ${
                  changeType === "increase" ? "text-green-600" : "text-red-600"
                }`}
              >
                {change}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const KPISection = ({
    title,
    data,
    modelOverride,
  }: {
    title: string;
    data: KPIData;
    modelOverride?: string;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">Model: {modelOverride || data.model}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          title="Number of Sessions"
          value={data.sessions.toLocaleString()}
          subtitle={`Total: ${data.totalTurns.toLocaleString()} turns`}
        />
        <KPITile
          title="Turns Per Session"
          value={data.turnsPerSession.toString()}
          subtitle={`Total: ${data.totalTurns.toLocaleString()}`}
        />
        <KPITile
          title="Input Tokens per session"
          value={data.inputTokensPerSession.toString()}
          subtitle={`Total: ${data.totalInputTokens.toLocaleString()}`}
        />
        <KPITile
          title="Output Tokens per session"
          value={data.outputTokensPerSession.toString()}
          subtitle={`Total: ${data.totalOutputTokens.toLocaleString()}`}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPITile
          title="Cache Creation Input Tokens per session"
          value={data.cacheCreationTokensPerSession.toString()}
          subtitle={`Total: ${data.totalCacheCreationTokens.toLocaleString()}`}
        />
        <KPITile
          title="Cache Read Input Tokens per session"
          value={data.cacheReadTokensPerSession.toString()}
          subtitle={`Total: ${data.totalCacheReadTokens.toLocaleString()}`}
        />
      </div>
    </div>
  );

  return (
    <Layout title="Chats" subtitle="Chat Insights">
      <div className="space-y-6">
        {/* Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select
                  value={filters.platform}
                  onChange={(e) => handleFilterChange("platform", e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Platforms</option>
                  {platformOptions.map((platform) => (
                    <option key={platform.key} value={platform.key}>
                      {platform.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
                <select
                  value={filters.tenant}
                  onChange={(e) => handleFilterChange("tenant", e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Tenants</option>
                  {organisationOptions.map((org) => (
                    <option key={org._id} value={org._id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <select
                  value={filters.user}
                  onChange={(e) => handleFilterChange("user", e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Users</option>
                  {userOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <MultiSelect
                  label="Feature Type"
                  options={[
                    { value: "all", label: "All" },
                    { value: "brew", label: "Brew" },
                    { value: "mindful", label: "Mindful Minute" },
                  ]}
                  value={filters.featureTypes}
                  onChange={(value) => handleFilterChange("featureTypes", value)}
                  placeholder="Select feature types..."
                />
              </div>

              <div className="lg:col-span-2">
                <DateRangePicker
                  label="Date Range"
                  value={filters.dateRange}
                  onChange={(value) => handleFilterChange("dateRange", value)}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="primary" onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPIs Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">KPIs</h2>

          {/* Consolidated View */}
          <KPISection title="Total: (Consolidated view)" data={consolidatedData} />

          {/* Feature-specific sections - separate white boxes */}
          <Card>
            <CardContent>
              <KPISection title="Feature Name - Brew" data={brewData} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <KPISection title="Feature Name - Mindful Minute" data={mindfulMinuteData} />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
