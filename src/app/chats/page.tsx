"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";

import { Layout } from "@/components/layout";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  MultiSelect,
  SearchableSelect,
  DateRangePicker,
} from "@/components/ui";
import { ROUTES } from "@/constants";
import { post, get } from "@/helpers/api";
import { useAppSelector } from "@/store";

interface FilterState {
  platform: string;
  tenant: string;
  user: string;
  featureTypes: string[];
  dateRange: {
    start: string;
    end: string;
  }; //
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
  totaluniqueUsersCount: number;
  lessThan5Turns: number;
  greaterThanOrEq5: number;
  greaterThanOrEq10: number;
  greaterThanOrEq15: number;
}

interface KPIStats {
  type: string;
  model: string;
  sessionCount: number;
  totalTurns: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  totaluniqueUsersCount: number;
  lessThan5Turns: number;
  greaterThanOrEq5: number;
  greaterThanOrEq10: number;
  greaterThanOrEq15: number;
}

type ChatResponse = {
  consolidated: KPIStats;
  types: KPIStats[];
};

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
  const [chatData, setChatData] = useState<ChatResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(ROUTES.LOGIN);
    }
    if (!didFetchPlatforms.current) {
      didFetchPlatforms.current = true;
      fetchPlatforms();
    }
  }, [router, isAuthenticated]);

  const mapApiToKPIData = (stats: KPIStats) => {
    const sessions = stats.sessionCount || 0;

    return {
      model: stats.model,
      sessions: stats.sessionCount || 0,
      turnsPerSession: sessions > 0 ? stats.totalTurns : 0,
      totalTurns: stats.totalTurns,
      inputTokensPerSession: sessions > 0 ? stats.totalInputTokens : 0,
      totalInputTokens: stats.totalInputTokens,
      cacheCreationTokensPerSession: sessions > 0 ? stats.totalCacheCreationTokens : 0,
      totalCacheCreationTokens: stats.totalCacheCreationTokens,
      cacheReadTokensPerSession: sessions > 0 ? stats.totalCacheReadTokens : 0,
      totalCacheReadTokens: stats.totalCacheReadTokens,
      outputTokensPerSession: sessions > 0 ? stats.totalOutputTokens : 0,
      totalOutputTokens: stats.totalOutputTokens,
      totaluniqueUsersCount: stats.totaluniqueUsersCount,
      lessThan5Turns: stats.lessThan5Turns,
      greaterThanOrEq5: stats.greaterThanOrEq5,
      greaterThanOrEq10: stats.greaterThanOrEq10,
      greaterThanOrEq15: stats.greaterThanOrEq15,
    };
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
  const prepareFilterParams = useCallback(() => {
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
  }, [filters]);

  const formatDate = (date: string) => {
    if (!date) return "";
    const [year, month, day] = date.split("-");
    return `${day}-${month}-${year}`;
  };

  const mapFiltersToPayload = useCallback((filters: FilterState) => {
    const payload = {
      empId: filters.user || "",
      type: filters.featureTypes.length > 0 ? filters.featureTypes.join(",") : "",
      platform: filters.platform || "",
      organizationId: filters.tenant || "",
      startDate: filters.dateRange.start ? formatDate(filters.dateRange.start) : "",
      endDate: filters.dateRange.end ? formatDate(filters.dateRange.end) : "",
    };

    //  Remove keys with empty string values
    const cleanedPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== ""),
    );

    //  If cleanedPayload is empty, return {}
    return Object.keys(cleanedPayload).length > 0 ? cleanedPayload : {};
  }, []);

  const fetchChatData = useCallback(
    async (filters: FilterState) => {
      try {
        const payload = mapFiltersToPayload(filters);

        const response = await post<ChatResponse>("/admin/chat-insight", payload);
        if (response) {
          setChatData(response);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to chat-insights data";
        console.error("Error showing chat-insights:", message);
      }
    },
    [mapFiltersToPayload],
  );

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

  const handleApplyFilters = useCallback(async () => {
    try {
      setIsLoading(true);
      const filterParams = prepareFilterParams();

      console.log("Filter parameters for API call:", filterParams);

      // TODO: Uncomment when API is ready
      await fetchChatData(filters);
      // Update state with fetched data

      // For now, just show the parameters
      console.log(`Filters applied!\n\nParameters:\n${JSON.stringify(filterParams, null, 2)}`);
    } catch (error) {
      console.error("Error applying filters:", error);
      alert("Error applying filters. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, prepareFilterParams, fetchChatData]);

  // Auto-load data with default filters when component mounts
  useEffect(() => {
    if (isAuthenticated && platformOptions.length > 0) {
      handleApplyFilters();
    }
  }, [isAuthenticated, platformOptions.length, handleApplyFilters]);

  const KPITile = ({
    title,
    value,
    subtitle,
    change,
    changeType,
  }: {
    title: string;
    value: string;
    subtitle?: React.ReactNode;
    change?: string | number;
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
      {/** Precompute per-session metrics */}
      {(() => {
        const sessions = data.sessions ?? 0;
        const turnsPerSession = sessions > 0 ? (data.totalTurns / sessions).toFixed(1) : "0";
        const inputTokensPerSession =
          sessions > 0 ? Math.round(data.totalInputTokens / sessions).toString() : "0";
        const cacheCreationTokensPerSession =
          sessions > 0 ? Math.round(data.totalCacheCreationTokens / sessions).toString() : "0";
        const cacheReadTokensPerSession =
          sessions > 0 ? Math.round(data.totalCacheReadTokens / sessions).toString() : "0";
        const outputTokensPerSession =
          sessions > 0 ? Math.round(data.totalOutputTokens / sessions).toString() : "0";
        const totaluniqueUsersCount = data?.totaluniqueUsersCount
          ? Math.round(data.totaluniqueUsersCount).toString()
          : "0";

        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <KPITile
                title="Number of Sessions Count"
                value={sessions.toString()}
                subtitle={`No of Users: ${totaluniqueUsersCount} `}
              />
              <KPITile
                title="Turns Per Session"
                value={turnsPerSession}
                subtitle={
                  <>
                    <div>Total: {data.totalTurns.toLocaleString()}</div>
                    <div className="mt-1 text-gray-400 text-xs flex flex-wrap gap-4">
                      <div>
                        {"<5"}: {data.lessThan5Turns ?? 0}
                      </div>
                      <div>
                        {">=5"}: {data.greaterThanOrEq5 ?? 0}
                      </div>
                      <div>
                        {">=10"}: {data.greaterThanOrEq10 ?? 0}
                      </div>
                      <div>
                        {">=15"}: {data.greaterThanOrEq15 ?? 0}
                      </div>
                    </div>
                  </>
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KPITile
                title="Input Tokens per session"
                value={inputTokensPerSession}
                subtitle={`Total: ${data.totalInputTokens.toLocaleString()}`}
              />
              <KPITile
                title="Cache Write Tokens per session"
                value={cacheCreationTokensPerSession}
                subtitle={`Total: ${data.totalCacheCreationTokens.toLocaleString()}`}
              />
              <KPITile
                title="Cache Read Tokens per session"
                value={cacheReadTokensPerSession}
                subtitle={`Total: ${data.totalCacheReadTokens.toLocaleString()}`}
              />
              <KPITile
                title="Output Tokens per session"
                value={outputTokensPerSession}
                subtitle={`Total: ${data.totalOutputTokens.toLocaleString()}`}
              />
            </div>
          </>
        );
      })()}
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
                <SearchableSelect
                  label="Platform"
                  options={platformOptions.map((platform) => ({
                    value: platform.key,
                    label: platform.name,
                  }))}
                  value={filters.platform}
                  onChange={(value) => handleFilterChange("platform", value)}
                  placeholder="All Platforms"
                  emptyMessage="No platforms found"
                  disabled={platformOptions.length === 0}
                />
              </div>

              <div>
                <SearchableSelect
                  label="Tenant"
                  options={organisationOptions.map((org) => ({
                    value: org._id,
                    label: org.name,
                  }))}
                  value={filters.tenant}
                  onChange={(value) => handleFilterChange("tenant", value)}
                  placeholder="All Tenants"
                  emptyMessage="No tenants found"
                  disabled={organisationOptions.length === 0}
                />
              </div>

              <div>
                <SearchableSelect
                  label="User"
                  options={userOptions.map((user) => ({
                    value: user.id,
                    label: user.name,
                  }))}
                  value={filters.user}
                  onChange={(value) => handleFilterChange("user", value)}
                  placeholder="All Users"
                  emptyMessage="No users found"
                  disabled={userOptions.length === 0}
                />
              </div>

              <div>
                <MultiSelect
                  label="Feature Type"
                  options={[
                    { value: "brew", label: "Brew" },
                    { value: "mindful-minute", label: "Mindful Minute" },
                    { value: "byb", label: "BYB" },
                    { value: "quick-jl", label: "Quick JL" },
                  ]}
                  value={filters.featureTypes}
                  onChange={(value) => handleFilterChange("featureTypes", value)}
                  placeholder="Select feature types..."
                />
              </div>

              <div>
                <DateRangePicker
                  label="Date Range"
                  value={filters.dateRange}
                  onChange={(value) => handleFilterChange("dateRange", value)}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="primary" onClick={handleApplyFilters} disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading...
                  </div>
                ) : (
                  "Apply Filters"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPIs Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">KPIs</h2>

          {chatData && (
            <>
              <KPISection
                title="Total: (Consolidated view)"
                data={mapApiToKPIData(chatData.consolidated)}
              />

              {chatData.types.map((t, idx) => (
                <Card key={`${t.type}-${t.model}- ${idx}`}>
                  <CardContent>
                    <KPISection
                      title={`Type - ${t.type}`}
                      data={mapApiToKPIData(t)}
                      modelOverride={t.model}
                    />
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
