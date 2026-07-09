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
  Input,
} from "@/components/ui";
import { ROUTES } from "@/constants";
import { post, get } from "@/helpers/api";
import { useAppSelector } from "@/store";

const MESSAGE_TYPE_OPTIONS = [
  { value: "pwa-mwf", label: "PWA MWF" },
  { value: "pwa-byb", label: "PWA BYB" },
  { value: "pwa-daily-suggestion", label: "PWA Daily Suggestion" },
  { value: "pwa-happy-goal", label: "PWA Happy Goal" },
  { value: "pwa-di-tue", label: "PWA DI Tue" },
  { value: "pwa-di-wed", label: "PWA DI Wed" },
  { value: "pwa-di-thu", label: "PWA DI Thu" },
  { value: "pwa-di-fri", label: "PWA DI Fri" },
  { value: "di-mon", label: "DI Mon" },
  { value: "di-tue", label: "DI Tue" },
  { value: "di-wed", label: "DI Wed" },
  { value: "di-thu", label: "DI Thu" },
  { value: "di-fri", label: "DI Fri" },
  { value: "fr-mon", label: "FR Mon" },
  { value: "visit-notification", label: "Visit Notification" },
  { value: "daily-suggestion", label: "Daily Suggestion" },
];

const CHANNEL_OPTIONS = [
  { value: "pwa", label: "PWA" },
  { value: "visit", label: "Visit" },
  { value: "medibuddy", label: "Medibuddy" },
];

const GROUP_BY_OPTIONS = [
  { value: "none", label: "No grouping (detail rows)" },
  { value: "employeeId", label: "Employee ID" },
  { value: "date", label: "Date" },
  { value: "messageType", label: "Message Type" },
  { value: "channel", label: "Channel" },
  { value: "platformKey", label: "Platform" },
  { value: "tId", label: "Tenant ID (TID)" },
];

interface FilterState {
  platform: string;
  tenant: string;
  user: string;
  messageTypes: string[];
  channels: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

interface LogSearchState {
  searchEmpId: string;
  searchDate: string;
  searchMessageType: string;
  groupBy: string;
}

interface TenantCoverage {
  organizationId: string;
  tenantName: string;
  tId: string;
  totalUsers: number;
  notifiedUsers: number;
  usersNotNotified: number;
  coveragePercent: number;
}

interface NotificationLogAnalytics {
  consolidated: {
    totalNotifications: number;
    uniqueUsers: number;
  };
  byChannel: { channel: string; count: number }[];
  byMessageType: { messageType: string; count: number }[];
}

interface NotificationLogCoverageAnalytics {
  consolidated: {
    totalEligibleUsers: number;
    notifiedUsers: number;
    usersNotNotified: number;
    coveragePercent: number;
  };
  byTenant: TenantCoverage[];
}

interface NotificationLogRow {
  employeeId: string;
  date: string;
  messageType: string;
  channel: string;
  platformKey: string;
  tId?: string;
  sentTime: number;
}

interface NotificationLogGroupRow {
  groupKey: string;
  count: number;
  uniqueUsers: number;
}

interface NotificationLogsSearchResponse {
  view: "list" | "grouped";
  groupBy?: string;
  logs: NotificationLogRow[];
  groups: NotificationLogGroupRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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

const formatDateForApi = (date: string) => {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}-${month}-${year}`;
};

const formatSentTime = (sentTime: number) => {
  if (!sentTime) return "—";
  return new Date(sentTime).toLocaleString();
};

export default function NotificationLogsPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const didFetchPlatforms = useRef(false);

  const [filters, setFilters] = useState<FilterState>({
    platform: "",
    tenant: "",
    user: "",
    messageTypes: [],
    channels: [],
    dateRange: getCurrentWeekRange(),
  });
  const [logSearch, setLogSearch] = useState<LogSearchState>({
    searchEmpId: "",
    searchDate: "",
    searchMessageType: "",
    groupBy: "none",
  });
  const [platformOptions, setPlatformOptions] = useState<{ key: string; name: string }[]>([]);
  const [organisationOptions, setOrganisationOptions] = useState<{ _id: string; name: string }[]>(
    [],
  );
  const [userOptions, setUserOptions] = useState<{ id: string; name: string }[]>([]);
  const [analytics, setAnalytics] = useState<NotificationLogAnalytics | null>(null);
  const [coverage, setCoverage] = useState<NotificationLogCoverageAnalytics | null>(null);
  const [logs, setLogs] = useState<NotificationLogRow[]>([]);
  const [groups, setGroups] = useState<NotificationLogGroupRow[]>([]);
  const [logsView, setLogsView] = useState<"list" | "grouped">("list");
  const [activeGroupBy, setActiveGroupBy] = useState<string>("none");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapFiltersToPayload = useCallback((filterState: FilterState) => {
    const payload = {
      empId: filterState.user || "",
      messageTypes: filterState.messageTypes.length > 0 ? filterState.messageTypes.join(",") : "",
      channels: filterState.channels.length > 0 ? filterState.channels.join(",") : "",
      platform: filterState.platform || "",
      organizationId: filterState.tenant || "",
      startDate: filterState.dateRange.start ? formatDateForApi(filterState.dateRange.start) : "",
      endDate: filterState.dateRange.end ? formatDateForApi(filterState.dateRange.end) : "",
    };

    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== ""));
  }, []);

  const mapLogsSearchPayload = useCallback(
    (filterState: FilterState, logSearchState: LogSearchState, page = 1) => {
      const payload = {
        ...mapFiltersToPayload(filterState),
        searchEmpId: logSearchState.searchEmpId.trim(),
        searchDate: logSearchState.searchDate.trim(),
        searchMessageType: logSearchState.searchMessageType.trim(),
        groupBy: logSearchState.groupBy || "none",
        page,
        limit: 25,
      };

      return Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== "" && value !== "none"),
      );
    },
    [mapFiltersToPayload],
  );

  const fetchLogs = useCallback(
    async (filterState: FilterState, logSearchState: LogSearchState, page = 1) => {
      const response = await post<NotificationLogsSearchResponse>(
        "/admin/notification-log-search",
        mapLogsSearchPayload(filterState, logSearchState, page),
      );

      if (response) {
        setLogsView(response.view);
        setActiveGroupBy(response.groupBy || "none");
        setLogs(response.logs || []);
        setGroups(response.groups || []);
        setPagination(response.pagination);
      }
    },
    [mapLogsSearchPayload],
  );

  const fetchPlatforms = async () => {
    try {
      const response = await get<{ key: string; name: string }[]>("/admin/platform-data");
      if (response) {
        setPlatformOptions(response);
      }
    } catch (e) {
      console.error("Error fetching platforms:", e);
    }
  };

  const fetchOrganisations = async (platformKey: string) => {
    if (!platformKey) return;
    try {
      const response = await get<{ _id: string; name: string }[]>(
        `/admin/organization/${platformKey}`,
      );
      if (response) {
        setOrganisationOptions(response.map((org) => ({ _id: org._id, name: org.name })));
      }
    } catch (e) {
      console.error("Error fetching organizations:", e);
    }
  };

  const fetchUsers = async (tenantId: string) => {
    if (!tenantId) return;
    try {
      const response = await get<{
        users: { _id: string; email: string; employeeId: string }[];
      }>(`/admin/users/${tenantId}`);

      if (response && Array.isArray(response.users)) {
        setUserOptions(
          response.users.map((user) => ({
            name: user.email?.trim() || user.employeeId,
            id: user.employeeId,
          })),
        );
      }
    } catch (e) {
      console.error("Error fetching users:", e);
    }
  };

  const fetchData = useCallback(
    async (filterState: FilterState, logSearchState: LogSearchState, page = 1) => {
      const filterPayload = mapFiltersToPayload(filterState);

      const [analyticsResponse, coverageResponse] = await Promise.all([
        post<NotificationLogAnalytics>("/admin/notification-log-analytics", filterPayload),
        post<NotificationLogCoverageAnalytics>("/admin/notification-log-coverage", filterPayload),
      ]);

      if (analyticsResponse) {
        setAnalytics(analyticsResponse);
      }
      if (coverageResponse) {
        setCoverage(coverageResponse);
      }

      await fetchLogs(filterState, logSearchState, page);
    },
    [mapFiltersToPayload, fetchLogs],
  );

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

  const handleApplyFilters = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await fetchData(filters, logSearch, 1);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch notification logs";
      setError(message);
      console.error("Error applying filters:", e);
    } finally {
      setIsLoading(false);
    }
  }, [filters, logSearch, fetchData]);

  const handleApplyLogSearch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await fetchLogs(filters, logSearch, 1);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to search notification logs";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters, logSearch, fetchLogs]);

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    try {
      setIsLoading(true);
      setError(null);
      await fetchLogs(filters, logSearch, newPage);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch notification logs";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogSearchChange = (key: keyof LogSearchState, value: string) => {
    setLogSearch((prev) => ({ ...prev, [key]: value }));
  };

  const groupByLabel =
    GROUP_BY_OPTIONS.find((option) => option.value === activeGroupBy)?.label || activeGroupBy;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(ROUTES.LOGIN);
    }
    if (!didFetchPlatforms.current) {
      didFetchPlatforms.current = true;
      fetchPlatforms();
    }
  }, [router, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && platformOptions.length > 0) {
      handleApplyFilters();
    }
  }, [isAuthenticated, platformOptions.length, handleApplyFilters]);

  const KPITile = ({ title, value }: { title: string; value: string }) => (
    <Card>
      <CardContent>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </CardContent>
    </Card>
  );

  return (
    <Layout title="Notification Logs" subtitle="Notification delivery analytics">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

              <MultiSelect
                label="Message Type"
                options={MESSAGE_TYPE_OPTIONS}
                value={filters.messageTypes}
                onChange={(value) => handleFilterChange("messageTypes", value)}
                placeholder="Select message types..."
              />

              <MultiSelect
                label="Channel"
                options={CHANNEL_OPTIONS}
                value={filters.channels}
                onChange={(value) => handleFilterChange("channels", value)}
                placeholder="All channels..."
              />

              <DateRangePicker
                label="Date Range"
                value={filters.dateRange}
                onChange={(value) => handleFilterChange("dateRange", value)}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="primary" onClick={handleApplyFilters} disabled={isLoading}>
                {isLoading ? "Loading..." : "Apply Filters"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {(analytics || coverage) && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">KPIs</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics && (
                <>
                  <KPITile
                    title="Total Notifications"
                    value={analytics.consolidated.totalNotifications.toLocaleString()}
                  />
                  <KPITile
                    title="Users Notified"
                    value={analytics.consolidated.uniqueUsers.toLocaleString()}
                  />
                </>
              )}
              {coverage && (
                <>
                  <KPITile
                    title="Total Users (in scope)"
                    value={coverage.consolidated.totalEligibleUsers.toLocaleString()}
                  />
                  <KPITile
                    title="Users Not Notified"
                    value={coverage.consolidated.usersNotNotified.toLocaleString()}
                  />
                  <KPITile title="Coverage" value={`${coverage.consolidated.coveragePercent}%`} />
                </>
              )}
            </div>

            {coverage && coverage.byTenant.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>By Tenant</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-gray-600">
                          <th className="pb-2 pr-4 font-medium">Tenant</th>
                          <th className="pb-2 pr-4 font-medium">TID</th>
                          <th className="pb-2 pr-4 font-medium text-right">Total Users</th>
                          <th className="pb-2 pr-4 font-medium text-right">Notified</th>
                          <th className="pb-2 pr-4 font-medium text-right">Not Notified</th>
                          <th className="pb-2 font-medium text-right">Coverage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coverage.byTenant.map((row) => (
                          <tr key={row.organizationId} className="border-b border-gray-100">
                            <td className="py-2 pr-4 text-gray-900">{row.tenantName}</td>
                            <td className="py-2 pr-4 text-gray-900">{row.tId}</td>
                            <td className="py-2 pr-4 text-right text-gray-900">
                              {row.totalUsers.toLocaleString()}
                            </td>
                            <td className="py-2 pr-4 text-right text-gray-900">
                              {row.notifiedUsers.toLocaleString()}
                            </td>
                            <td className="py-2 pr-4 text-right text-gray-900">
                              {row.usersNotNotified.toLocaleString()}
                            </td>
                            <td className="py-2 text-right text-gray-900">
                              {row.coveragePercent}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>By Channel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.byChannel.length === 0 ? (
                      <p className="text-sm text-gray-500">No data for selected filters.</p>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-gray-600">
                            <th className="pb-2 font-medium">Channel</th>
                            <th className="pb-2 font-medium text-right">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.byChannel.map((row) => (
                            <tr key={row.channel} className="border-b border-gray-100">
                              <td className="py-2 text-gray-900">{row.channel}</td>
                              <td className="py-2 text-right text-gray-900">
                                {row.count.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>By Message Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.byMessageType.length === 0 ? (
                      <p className="text-sm text-gray-500">No data for selected filters.</p>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-gray-600">
                            <th className="pb-2 font-medium">Message Type</th>
                            <th className="pb-2 font-medium text-right">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.byMessageType.map((row) => (
                            <tr key={row.messageType} className="border-b border-gray-100">
                              <td className="py-2 text-gray-900">{row.messageType}</td>
                              <td className="py-2 text-right text-gray-900">
                                {row.count.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Notification Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">Search &amp; Group</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="Search Employee ID"
                  placeholder="Partial employee ID..."
                  value={logSearch.searchEmpId}
                  onChange={(e) => handleLogSearchChange("searchEmpId", e.target.value)}
                />
                <Input
                  label="Search Date"
                  placeholder="e.g. 05-07-2026"
                  value={logSearch.searchDate}
                  onChange={(e) => handleLogSearchChange("searchDate", e.target.value)}
                />
                <Input
                  label="Search Message Type"
                  placeholder="e.g. pwa-mwf"
                  value={logSearch.searchMessageType}
                  onChange={(e) => handleLogSearchChange("searchMessageType", e.target.value)}
                />
                <SearchableSelect
                  label="Group By"
                  options={GROUP_BY_OPTIONS}
                  value={logSearch.groupBy}
                  onChange={(value) => handleLogSearchChange("groupBy", value)}
                  placeholder="Select grouping..."
                  emptyMessage="No options"
                />
              </div>
              <div className="flex justify-end">
                <Button variant="secondary" onClick={handleApplyLogSearch} disabled={isLoading}>
                  {isLoading ? "Searching..." : "Search Logs"}
                </Button>
              </div>
            </div>

            {logsView === "grouped" ? (
              groups.length === 0 ? (
                <p className="text-sm text-gray-500">No grouped results for selected filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <p className="mb-3 text-sm text-gray-600">Grouped by: {groupByLabel}</p>
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-600">
                        <th className="pb-2 pr-4 font-medium">{groupByLabel}</th>
                        <th className="pb-2 pr-4 font-medium text-right">Count</th>
                        <th className="pb-2 font-medium text-right">Unique Users</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((row) => (
                        <tr key={row.groupKey} className="border-b border-gray-100">
                          <td className="py-2 pr-4 text-gray-900">{row.groupKey || "—"}</td>
                          <td className="py-2 pr-4 text-right text-gray-900">
                            {row.count.toLocaleString()}
                          </td>
                          <td className="py-2 text-right text-gray-900">
                            {row.uniqueUsers.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : logs.length === 0 ? (
              <p className="text-sm text-gray-500">No logs found for selected filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-600">
                      <th className="pb-2 pr-4 font-medium">Employee ID</th>
                      <th className="pb-2 pr-4 font-medium">Date</th>
                      <th className="pb-2 pr-4 font-medium">Message Type</th>
                      <th className="pb-2 pr-4 font-medium">Channel</th>
                      <th className="pb-2 pr-4 font-medium">Platform</th>
                      <th className="pb-2 font-medium">Sent At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => (
                      <tr
                        key={`${log.employeeId}-${log.sentTime}-${idx}`}
                        className="border-b border-gray-100"
                      >
                        <td className="py-2 pr-4 text-gray-900">{log.employeeId}</td>
                        <td className="py-2 pr-4 text-gray-900">{log.date}</td>
                        <td className="py-2 pr-4 text-gray-900">{log.messageType}</td>
                        <td className="py-2 pr-4 text-gray-900">{log.channel}</td>
                        <td className="py-2 pr-4 text-gray-900">{log.platformKey}</td>
                        <td className="py-2 text-gray-900">{formatSentTime(log.sentTime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={isLoading || pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={isLoading || pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
