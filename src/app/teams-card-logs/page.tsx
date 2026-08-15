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
  { value: "joy-level-question", label: "Joy Level QA" },
  { value: "joy-level", label: "Joy Level" },
  { value: "joy-level-initial", label: "Joy Level Initial" },
  { value: "daily-brew", label: "Daily Brew" },
  { value: "stress-buster", label: "Stress Buster" },
  { value: "blessings", label: "Blessings / TGIF" },
  { value: "praise-cron", label: "Praise Cron" },
  { value: "thanks-cron", label: "Thanks Cron" },
  { value: "daily-suggestion", label: "Daily Suggestion" },
  { value: "daily-suggestion-monday", label: "Daily Suggestion Monday" },
  { value: "calendar", label: "Calendar" },
  { value: "dynamic-calendar", label: "Dynamic Calendar" },
];

const STATUS_OPTIONS = [
  { value: "sent", label: "Sent" },
  { value: "received", label: "Received" },
];

const INTEGRATION_OPTIONS = [
  { value: "teams", label: "Teams (default)" },
  { value: "raima", label: "Raima" },
];

const BOOL_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const GROUP_BY_OPTIONS = [
  { value: "none", label: "No grouping (detail rows)" },
  { value: "employeeId", label: "Employee ID" },
  { value: "date", label: "Date" },
  { value: "messageType", label: "Message Type" },
  { value: "status", label: "Status" },
  { value: "integration", label: "Integration" },
];

interface FilterState {
  platform: string;
  tenant: string;
  user: string;
  messageTypes: string[];
  statuses: string[];
  integrations: string[];
  messageSeen: string;
  saved: string;
  deleted: string;
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

interface TeamsCardLogAnalytics {
  consolidated: {
    totalCards: number;
    uniqueUsers: number;
  };
  byStatus: { status: string; count: number }[];
  byMessageType: { messageType: string; count: number }[];
  byIntegration: { integration: string; count: number }[];
  byOrganization: {
    organizationId: string;
    tenantName: string;
    tId: string;
    totalCards: number;
    uniqueUsers: number;
  }[];
}

interface TeamsCardLogRow {
  employeeId: string;
  date: string;
  messageType: string;
  status: string;
  activityId: string;
  sentTime?: number;
  messageSeen?: boolean;
  saved?: boolean;
  deleted?: boolean;
  appreciation?: boolean;
  recommendationsMoreClick?: boolean;
  linkCardCounter?: number;
  noteToSelfClick?: number;
  integration?: string;
}

interface TeamsCardLogGroupRow {
  groupKey: string;
  count: number;
  uniqueUsers: number;
}

interface TeamsCardLogsSearchResponse {
  view: "list" | "grouped";
  groupBy?: string;
  logs: TeamsCardLogRow[];
  groups: TeamsCardLogGroupRow[];
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

const formatSentTime = (sentTime?: number) => {
  if (!sentTime) return "—";
  return new Date(sentTime).toLocaleString();
};

const formatBool = (value?: boolean) => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
};

const getErrorMessage = (error: unknown, fallback: string) => {
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

const requiresPlatformSelection = (filterState: FilterState) => !filterState.platform;

export default function TeamsCardLogsPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const didFetchPlatforms = useRef(false);

  const [filters, setFilters] = useState<FilterState>({
    platform: "",
    tenant: "",
    user: "",
    messageTypes: [],
    statuses: [],
    integrations: [],
    messageSeen: "all",
    saved: "all",
    deleted: "all",
    dateRange: getTodayRange(),
  });
  const [logSearch, setLogSearch] = useState<LogSearchState>({
    searchEmpId: "",
    searchDate: "",
    searchMessageType: "",
    groupBy: "none",
  });
  const [platformOptions, setPlatformOptions] = useState<{ key: string; name: string }[]>([]);
  const [organisationOptions, setOrganisationOptions] = useState<
    { _id: string; name: string; inactive?: boolean }[]
  >([]);
  const [userOptions, setUserOptions] = useState<{ id: string; name: string }[]>([]);
  const [analytics, setAnalytics] = useState<TeamsCardLogAnalytics | null>(null);
  const [logs, setLogs] = useState<TeamsCardLogRow[]>([]);
  const [groups, setGroups] = useState<TeamsCardLogGroupRow[]>([]);
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
      statuses: filterState.statuses.length > 0 ? filterState.statuses.join(",") : "",
      integrations: filterState.integrations.length > 0 ? filterState.integrations.join(",") : "",
      messageSeen: filterState.messageSeen !== "all" ? filterState.messageSeen : "",
      saved: filterState.saved !== "all" ? filterState.saved : "",
      deleted: filterState.deleted !== "all" ? filterState.deleted : "",
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
        Object.entries(payload).filter(
          ([key, value]) => value !== "" && (key !== "groupBy" || value !== "none"),
        ),
      );
    },
    [mapFiltersToPayload],
  );

  const fetchLogs = useCallback(
    async (filterState: FilterState, logSearchState: LogSearchState, page = 1) => {
      const response = await post<TeamsCardLogsSearchResponse>(
        "/admin/teams-card-log-search",
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
      const analyticsResponse = await post<TeamsCardLogAnalytics>(
        "/admin/teams-card-log-analytics",
        filterPayload,
      );
      if (analyticsResponse) {
        setAnalytics(analyticsResponse);
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
        setLogs([]);
        setGroups([]);
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
      setError("Select a platform before loading Teams card stats");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await fetchData(filters, logSearch, 1);
    } catch (e) {
      setError(getErrorMessage(e, "Unable to load Teams card logs. Please try again."));
      console.error("Error applying filters:", e);
    } finally {
      setIsLoading(false);
    }
  }, [filters, logSearch, fetchData]);

  const handleApplyLogSearch = useCallback(async () => {
    if (requiresPlatformSelection(filters)) {
      setError("Select a platform before searching Teams card logs");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await fetchLogs(filters, logSearch, 1);
    } catch (e) {
      setError(getErrorMessage(e, "Unable to search Teams card logs. Please try again."));
    } finally {
      setIsLoading(false);
    }
  }, [filters, logSearch, fetchLogs]);

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    if (requiresPlatformSelection(filters)) {
      setError("Select a platform before loading Teams card logs");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await fetchLogs(filters, logSearch, newPage);
    } catch (e) {
      setError(getErrorMessage(e, "Unable to load Teams card logs. Please try again."));
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
    if (!isAuthenticated || !filters.platform) return;

    let cancelled = false;
    const run = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await fetchData(filters, logSearch, 1);
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e, "Unable to load Teams card logs. Please try again."));
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
    <Layout title="Teams Card Logs" subtitle="Teams adaptive card delivery and engagement">
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
                placeholder={filters.platform ? "Select Tenant" : "Select platform first"}
                emptyMessage="No tenants found"
                disabled={!filters.platform || organisationOptions.length === 0}
              />

              <SearchableSelect
                label="User"
                options={userOptions.map((user) => ({
                  value: user.id,
                  label: user.name,
                }))}
                value={filters.user}
                onChange={(value) => handleFilterChange("user", value)}
                placeholder={filters.tenant ? "Select User" : "Select tenant first"}
                emptyMessage="No users found"
                disabled={!filters.tenant || userOptions.length === 0}
              />

              <DateRangePicker
                label="Date Range"
                value={filters.dateRange}
                onChange={(value) => handleFilterChange("dateRange", value)}
              />

              <MultiSelect
                label="Message Types"
                options={MESSAGE_TYPE_OPTIONS}
                value={filters.messageTypes}
                onChange={(value) => handleFilterChange("messageTypes", value)}
                placeholder="All message types"
              />

              <MultiSelect
                label="Status"
                options={STATUS_OPTIONS}
                value={filters.statuses}
                onChange={(value) => handleFilterChange("statuses", value)}
                placeholder="All statuses"
              />

              <MultiSelect
                label="Integration"
                options={INTEGRATION_OPTIONS}
                value={filters.integrations}
                onChange={(value) => handleFilterChange("integrations", value)}
                placeholder="All integrations"
              />

              <SearchableSelect
                label="Message Seen"
                options={BOOL_FILTER_OPTIONS}
                value={filters.messageSeen}
                onChange={(value) => handleFilterChange("messageSeen", value)}
                placeholder="All"
              />

              <SearchableSelect
                label="Saved"
                options={BOOL_FILTER_OPTIONS}
                value={filters.saved}
                onChange={(value) => handleFilterChange("saved", value)}
                placeholder="All"
              />

              <SearchableSelect
                label="Deleted"
                options={BOOL_FILTER_OPTIONS}
                value={filters.deleted}
                onChange={(value) => handleFilterChange("deleted", value)}
                placeholder="All"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={handleApplyFilters} disabled={isLoading || !filters.platform}>
                {isLoading ? "Loading..." : "Apply Filters"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KPITile
            title="Total Cards"
            value={analytics ? String(analytics.consolidated.totalCards) : "—"}
          />
          <KPITile
            title="Unique Users"
            value={analytics ? String(analytics.consolidated.uniqueUsers) : "—"}
          />
        </div>

        {analytics?.byOrganization && analytics.byOrganization.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>By Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(229,231,235)]">
                      <tr className="text-left text-gray-600">
                        <th className="bg-white px-4 py-3 font-medium">Tenant</th>
                        <th className="bg-white px-4 py-3 font-medium">TID</th>
                        <th className="bg-white px-4 py-3 text-right font-medium">Total Cards</th>
                        <th className="bg-white px-4 py-3 text-right font-medium">Unique Users</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.byOrganization.map((row) => (
                        <tr key={row.organizationId} className="border-b border-gray-100">
                          <td className="px-4 py-2 text-gray-900">{row.tenantName}</td>
                          <td className="px-4 py-2 text-gray-900">{row.tId}</td>
                          <td className="px-4 py-2 text-right text-gray-900">
                            {row.totalCards.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-900">
                            {row.uniqueUsers.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 z-10 bg-gray-50 shadow-[0_-1px_0_0_rgb(229,231,235)]">
                      <tr className="font-semibold text-gray-900">
                        <td className="bg-gray-50 px-4 py-3">Total</td>
                        <td className="bg-gray-50 px-4 py-3">—</td>
                        <td className="bg-gray-50 px-4 py-3 text-right">
                          {analytics.consolidated.totalCards.toLocaleString()}
                        </td>
                        <td className="bg-gray-50 px-4 py-3 text-right">
                          {analytics.consolidated.uniqueUsers.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>By Status</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.byStatus?.length ? (
                <ul className="space-y-2 text-sm">
                  {analytics.byStatus.slice(0, 10).map((row) => (
                    <li key={row.status || "blank"} className="flex justify-between gap-4">
                      <span className="text-gray-700 truncate">{row.status || "(blank)"}</span>
                      <span className="font-medium text-gray-900">{row.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No status breakdown yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By Integration</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.byIntegration?.length ? (
                <ul className="space-y-2 text-sm">
                  {analytics.byIntegration.slice(0, 10).map((row) => (
                    <li key={row.integration || "blank"} className="flex justify-between gap-4">
                      <span className="text-gray-700 truncate">{row.integration || "(blank)"}</span>
                      <span className="font-medium text-gray-900">{row.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No integration breakdown yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search & Group</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Search Employee ID"
                value={logSearch.searchEmpId}
                onChange={(e) => handleLogSearchChange("searchEmpId", e.target.value)}
                placeholder="Partial employee ID"
              />
              <Input
                label="Search Date"
                value={logSearch.searchDate}
                onChange={(e) => handleLogSearchChange("searchDate", e.target.value)}
                placeholder="e.g. 17-07-2026"
              />
              <Input
                label="Search Message Type"
                value={logSearch.searchMessageType}
                onChange={(e) => handleLogSearchChange("searchMessageType", e.target.value)}
                placeholder="Partial message type"
              />
              <SearchableSelect
                label="Group By"
                options={GROUP_BY_OPTIONS}
                value={logSearch.groupBy}
                onChange={(value) => handleLogSearchChange("groupBy", value)}
                placeholder="No grouping"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleApplyLogSearch} disabled={isLoading || !filters.platform}>
                {isLoading ? "Searching..." : "Search Logs"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {logsView === "grouped" ? `Grouped by ${groupByLabel}` : "Teams Card Logs"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logsView === "grouped" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-600">
                      <th className="py-2 pr-4">Group</th>
                      <th className="py-2 pr-4">Count</th>
                      <th className="py-2 pr-4">Unique Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-gray-500">
                          No grouped results.
                        </td>
                      </tr>
                    ) : (
                      groups.map((group) => (
                        <tr key={group.groupKey} className="border-b border-gray-100">
                          <td className="py-2 pr-4 font-medium text-gray-900">
                            {group.groupKey || "(blank)"}
                          </td>
                          <td className="py-2 pr-4">{group.count}</td>
                          <td className="py-2 pr-4">{group.uniqueUsers}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-600">
                      <th className="py-2 pr-4">Employee ID</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Message Type</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Activity ID</th>
                      <th className="py-2 pr-4">Sent Time</th>
                      <th className="py-2 pr-4">Seen</th>
                      <th className="py-2 pr-4">Saved</th>
                      <th className="py-2 pr-4">Deleted</th>
                      <th className="py-2 pr-4">Integration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-6 text-center text-gray-500">
                          No Teams card logs found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr
                          key={`${log.employeeId}-${log.activityId}-${log.date}-${log.messageType}`}
                          className="border-b border-gray-100"
                        >
                          <td className="py-2 pr-4 font-medium text-gray-900">{log.employeeId}</td>
                          <td className="py-2 pr-4">{log.date}</td>
                          <td className="py-2 pr-4">{log.messageType}</td>
                          <td className="py-2 pr-4">{log.status}</td>
                          <td className="py-2 pr-4 max-w-[180px] truncate" title={log.activityId}>
                            {log.activityId}
                          </td>
                          <td className="py-2 pr-4 whitespace-nowrap">
                            {formatSentTime(log.sentTime)}
                          </td>
                          <td className="py-2 pr-4">{formatBool(log.messageSeen)}</td>
                          <td className="py-2 pr-4">{formatBool(log.saved)}</td>
                          <td className="py-2 pr-4">{formatBool(log.deleted)}</td>
                          <td className="py-2 pr-4">{log.integration || "teams"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <span>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={pagination.page <= 1 || isLoading}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pagination.page >= pagination.totalPages || isLoading}
                    onClick={() => handlePageChange(pagination.page + 1)}
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
