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

const USER_NOTIFICATION_STATUS_OPTIONS = [
  { value: "all", label: "All Users" },
  { value: "sent", label: "Notification Sent Users" },
  { value: "not_sent", label: "Notification Not Sent Users" },
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
  notificationStatus: string;
}

interface TenantCoverage {
  organizationId: string;
  tenantName: string;
  tId: string;
  totalUsers: number;
  totalNotifications: number;
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
    totalNotifications: number;
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

interface NotificationLogUserNotNotifiedRow {
  employeeId: string;
  email?: string;
  organizationId?: string;
  createdAt?: number;
}

interface NotificationLogsSearchResponse {
  view: "list" | "grouped" | "notNotifiedUsers";
  groupBy?: string;
  logs: NotificationLogRow[];
  groups: NotificationLogGroupRow[];
  usersNotNotified?: NotificationLogUserNotNotifiedRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const getTodayRange = () => {
  const today = new Date().toISOString().split("T")[0];
  return {
    start: today,
    end: today,
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

const getNotificationLogsErrorMessage = (error: unknown, fallback: string) => {
  if (!(error instanceof Error) || !error.message) return fallback;
  const message = error.message.trim();
  if (
    message.startsWith("API ") ||
    message.startsWith("Request failed") ||
    message === "Failed to fetch" ||
    message.includes("Failed to fetch")
  ) {
    return fallback;
  }
  return message;
};

const requiresPlatformForNotSent = (filterState: FilterState, logSearchState: LogSearchState) =>
  logSearchState.notificationStatus === "not_sent" &&
  !filterState.platform &&
  !filterState.tenant &&
  !filterState.user;

const requiresPlatformSelection = (filterState: FilterState) => !filterState.platform;

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
    dateRange: getTodayRange(),
  });
  const [logSearch, setLogSearch] = useState<LogSearchState>({
    searchEmpId: "",
    searchDate: "",
    searchMessageType: "",
    groupBy: "none",
    notificationStatus: "all",
  });
  const [platformOptions, setPlatformOptions] = useState<{ key: string; name: string }[]>([]);
  const [organisationOptions, setOrganisationOptions] = useState<
    { _id: string; name: string; inactive?: boolean }[]
  >([]);
  const [userOptions, setUserOptions] = useState<{ id: string; name: string }[]>([]);
  const [analytics, setAnalytics] = useState<NotificationLogAnalytics | null>(null);
  const [coverage, setCoverage] = useState<NotificationLogCoverageAnalytics | null>(null);
  const [logs, setLogs] = useState<NotificationLogRow[]>([]);
  const [groups, setGroups] = useState<NotificationLogGroupRow[]>([]);
  const [logsView, setLogsView] = useState<"list" | "grouped" | "notNotifiedUsers">("list");
  const [activeGroupBy, setActiveGroupBy] = useState<string>("none");
  const [usersNotNotified, setUsersNotNotified] = useState<NotificationLogUserNotNotifiedRow[]>([]);
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
        notificationStatus: logSearchState.notificationStatus || "all",
        page,
        limit: 25,
      };

      return Object.fromEntries(
        Object.entries(payload).filter(
          ([key, value]) =>
            value !== "" &&
            (key !== "groupBy" || value !== "none") &&
            (key !== "notificationStatus" || value !== "all"),
        ),
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
        setUsersNotNotified(response.usersNotNotified || []);
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
      const response = await get<{ _id: string; name: string; inactive?: boolean }[]>(
        `/admin/organization/${platformKey}`,
      );
      if (response) {
        setOrganisationOptions(
          response.map((org) => ({
            _id: org._id,
            name: org.name,
            inactive: Boolean(org.inactive),
          })),
        );
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
      [key]: value || (key === "dateRange" ? getTodayRange() : value),
    }));

    if (key === "platform" && typeof value === "string") {
      fetchOrganisations(value);
      setOrganisationOptions([]);
      setUserOptions([]);
      setFilters((prev) => ({ ...prev, tenant: "", user: "" }));
      if (!value) {
        setAnalytics(null);
        setCoverage(null);
        setLogs([]);
        setGroups([]);
        setUsersNotNotified([]);
        setPagination({ page: 1, limit: 25, total: 0, totalPages: 0 });
        setLogsView("list");
        setActiveGroupBy("none");
      }
    }

    if (key === "tenant" && typeof value === "string") {
      fetchUsers(value);
      setUserOptions([]);
      setFilters((prev) => ({ ...prev, user: "" }));
    }
  };

  const handleApplyFilters = useCallback(async () => {
    if (requiresPlatformSelection(filters)) {
      setError("Select a platform before loading notification stats");
      return;
    }

    if (requiresPlatformForNotSent(filters, logSearch)) {
      setError("Select a platform or tenant before filtering Notification Not Sent Users");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await fetchData(filters, logSearch, 1);
    } catch (e) {
      setError(
        getNotificationLogsErrorMessage(e, "Unable to load notification logs. Please try again."),
      );
      console.error("Error applying filters:", e);
    } finally {
      setIsLoading(false);
    }
  }, [filters, logSearch, fetchData]);

  const handleApplyLogSearch = useCallback(async () => {
    if (requiresPlatformSelection(filters)) {
      setError("Select a platform before searching notification logs");
      return;
    }

    if (requiresPlatformForNotSent(filters, logSearch)) {
      setError("Select a platform or tenant before filtering Notification Not Sent Users");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await fetchLogs(filters, logSearch, 1);
    } catch (e) {
      setError(
        getNotificationLogsErrorMessage(e, "Unable to search notification logs. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters, logSearch, fetchLogs]);

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    if (requiresPlatformSelection(filters)) {
      setError("Select a platform before loading notification logs");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await fetchLogs(filters, logSearch, newPage);
    } catch (e) {
      setError(
        getNotificationLogsErrorMessage(e, "Unable to load notification logs. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogSearchChange = (key: keyof LogSearchState, value: string) => {
    setLogSearch((prev) => ({ ...prev, [key]: value }));
  };

  const handleNotificationStatusChange = async (value: string) => {
    if (requiresPlatformSelection(filters)) {
      setLogSearch((prev) => ({
        ...prev,
        notificationStatus: value,
        groupBy: value === "not_sent" ? "none" : prev.groupBy,
      }));
      setError("Select a platform before loading notification logs");
      return;
    }

    if (value === "not_sent" && !filters.platform && !filters.tenant && !filters.user) {
      setLogSearch((prev) => ({ ...prev, notificationStatus: value, groupBy: "none" }));
      setError("Select a platform or tenant before filtering Notification Not Sent Users");
      return;
    }

    const nextLogSearch = {
      ...logSearch,
      notificationStatus: value,
      groupBy: value === "not_sent" ? "none" : logSearch.groupBy,
    };
    setLogSearch(nextLogSearch);

    try {
      setIsLoading(true);
      setError(null);
      await fetchLogs(filters, nextLogSearch, 1);
    } catch (e) {
      setError(
        getNotificationLogsErrorMessage(e, "Unable to search notification logs. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
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

  // Auto-fetch only when a specific platform is chosen — never for "All Platforms".
  useEffect(() => {
    if (!isAuthenticated || !filters.platform) return;

    let cancelled = false;
    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await fetchData(filters, logSearch, 1);
      } catch (e) {
        if (!cancelled) {
          setError(
            getNotificationLogsErrorMessage(
              e,
              "Unable to load notification logs. Please try again.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
    // Intentionally only re-run when platform selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, filters.platform]);

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
                placeholder="Select Platform"
                emptyMessage="No platforms found"
                disabled={platformOptions.length === 0}
              />

              <SearchableSelect
                label="Tenant"
                options={organisationOptions.map((org) => ({
                  value: org._id,
                  label: org.inactive ? `${org.name} (Inactive)` : org.name,
                  disabled: Boolean(org.inactive),
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
                    title="Total Notification"
                    value={analytics.consolidated.totalNotifications.toLocaleString()}
                  />
                  <KPITile
                    title="Unique Users Notified"
                    value={analytics.consolidated.uniqueUsers.toLocaleString()}
                  />
                </>
              )}
              {coverage && (
                <>
                  <KPITile
                    title="Total Users (created by end date)"
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
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="min-w-full border-separate border-spacing-0 text-sm">
                        <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(229,231,235)]">
                          <tr className="text-left text-gray-600">
                            <th className="bg-white px-4 py-3 font-medium">Tenant</th>
                            <th className="bg-white px-4 py-3 font-medium">TID</th>
                            <th className="bg-white px-4 py-3 text-right font-medium">
                              Total Users
                            </th>
                            <th className="bg-white px-4 py-3 text-right font-medium">
                              Total Notification
                            </th>
                            <th className="bg-white px-4 py-3 text-right font-medium">Notified</th>
                            <th className="bg-white px-4 py-3 text-right font-medium">
                              Not Notified
                            </th>
                            <th className="bg-white px-4 py-3 text-right font-medium">Coverage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {coverage.byTenant.map((row) => (
                            <tr key={row.organizationId} className="border-b border-gray-100">
                              <td className="px-4 py-2 text-gray-900">{row.tenantName}</td>
                              <td className="px-4 py-2 text-gray-900">{row.tId}</td>
                              <td className="px-4 py-2 text-right text-gray-900">
                                {row.totalUsers.toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-900">
                                {(row.totalNotifications ?? 0).toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-900">
                                {row.notifiedUsers.toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-900">
                                {row.usersNotNotified.toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-900">
                                {row.coveragePercent}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="sticky bottom-0 z-10 bg-gray-50 shadow-[0_-1px_0_0_rgb(229,231,235)]">
                          <tr className="font-semibold text-gray-900">
                            <td className="bg-gray-50 px-4 py-3">Total</td>
                            <td className="bg-gray-50 px-4 py-3">—</td>
                            <td className="bg-gray-50 px-4 py-3 text-right">
                              {coverage.consolidated.totalEligibleUsers.toLocaleString()}
                            </td>
                            <td className="bg-gray-50 px-4 py-3 text-right">
                              {(
                                coverage.consolidated.totalNotifications ??
                                analytics?.consolidated.totalNotifications ??
                                0
                              ).toLocaleString()}
                            </td>
                            <td className="bg-gray-50 px-4 py-3 text-right">
                              {coverage.consolidated.notifiedUsers.toLocaleString()}
                            </td>
                            <td className="bg-gray-50 px-4 py-3 text-right">
                              {coverage.consolidated.usersNotNotified.toLocaleString()}
                            </td>
                            <td className="bg-gray-50 px-4 py-3 text-right">
                              {coverage.consolidated.coveragePercent}%
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
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
                  label="User Notification Status"
                  options={USER_NOTIFICATION_STATUS_OPTIONS}
                  value={logSearch.notificationStatus}
                  onChange={handleNotificationStatusChange}
                  placeholder="Select status..."
                  emptyMessage="No options"
                />
                <SearchableSelect
                  label="Group By"
                  options={GROUP_BY_OPTIONS}
                  value={logSearch.groupBy}
                  onChange={(value) => handleLogSearchChange("groupBy", value)}
                  placeholder="Select grouping..."
                  emptyMessage="No options"
                  disabled={logSearch.notificationStatus === "not_sent"}
                />
              </div>
              <div className="flex justify-end">
                <Button variant="secondary" onClick={handleApplyLogSearch} disabled={isLoading}>
                  {isLoading ? "Searching..." : "Search Logs"}
                </Button>
              </div>
            </div>

            {logsView === "notNotifiedUsers" ? (
              usersNotNotified.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No users without notifications for selected filters.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-sm">
                      <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(229,231,235)]">
                        <tr className="text-left text-gray-600">
                          <th className="bg-white px-4 py-3 font-medium">Employee ID</th>
                          <th className="bg-white px-4 py-3 font-medium">Email</th>
                          <th className="bg-white px-4 py-3 font-medium">Organization ID</th>
                          <th className="bg-white px-4 py-3 font-medium">Created At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersNotNotified.map((user) => (
                          <tr key={user.employeeId} className="border-b border-gray-100">
                            <td className="px-4 py-2 text-gray-900">{user.employeeId}</td>
                            <td className="px-4 py-2 text-gray-900">{user.email || "—"}</td>
                            <td className="px-4 py-2 text-gray-900">
                              {user.organizationId || "—"}
                            </td>
                            <td className="px-4 py-2 text-gray-900">
                              {user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : logsView === "grouped" ? (
              groups.length === 0 ? (
                <p className="text-sm text-gray-500">No grouped results for selected filters.</p>
              ) : (
                <div>
                  <p className="mb-3 text-sm text-gray-600">Grouped by: {groupByLabel}</p>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="min-w-full border-separate border-spacing-0 text-sm">
                        <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(229,231,235)]">
                          <tr className="text-left text-gray-600">
                            <th className="bg-white px-4 py-3 font-medium">{groupByLabel}</th>
                            <th className="bg-white px-4 py-3 text-right font-medium">Count</th>
                            <th className="bg-white px-4 py-3 text-right font-medium">
                              Unique Users
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {groups.map((row) => (
                            <tr key={row.groupKey} className="border-b border-gray-100">
                              <td className="px-4 py-2 text-gray-900">{row.groupKey || "—"}</td>
                              <td className="px-4 py-2 text-right text-gray-900">
                                {row.count.toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-900">
                                {row.uniqueUsers.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )
            ) : logs.length === 0 ? (
              <p className="text-sm text-gray-500">No logs found for selected filters.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(229,231,235)]">
                      <tr className="text-left text-gray-600">
                        <th className="bg-white px-4 py-3 font-medium">Employee ID</th>
                        <th className="bg-white px-4 py-3 font-medium">Date</th>
                        <th className="bg-white px-4 py-3 font-medium">Message Type</th>
                        <th className="bg-white px-4 py-3 font-medium">Channel</th>
                        <th className="bg-white px-4 py-3 font-medium">Platform</th>
                        <th className="bg-white px-4 py-3 font-medium">Sent At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, idx) => (
                        <tr
                          key={`${log.employeeId}-${log.sentTime}-${idx}`}
                          className="border-b border-gray-100"
                        >
                          <td className="px-4 py-2 text-gray-900">{log.employeeId}</td>
                          <td className="px-4 py-2 text-gray-900">{log.date}</td>
                          <td className="px-4 py-2 text-gray-900">{log.messageType}</td>
                          <td className="px-4 py-2 text-gray-900">{log.channel}</td>
                          <td className="px-4 py-2 text-gray-900">{log.platformKey}</td>
                          <td className="px-4 py-2 text-gray-900">
                            {formatSentTime(log.sentTime)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
