"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Layout } from "@/components/layout";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Loader,
  MultiSelect,
  SearchableSelect,
} from "@/components/ui";
import { ROUTES } from "@/constants";
import { get, post } from "@/helpers/api";
import { useAppSelector } from "@/store";

type AnalyticsStatus = "pending" | "processing" | "complete" | "failed";

interface OrganizationOption {
  _id: string;
  name: string;
  tId: string;
  inactive?: boolean;
}

interface OrganizationAnalyticsRecord {
  platformKey: string;
  tId: string;
  year: number;
  periodType: "summary" | "week" | "month";
  week: number | null;
  month: number | null;
  status: AnalyticsStatus;
  reportBatchId: string;
  reportStartDate?: string;
  reportEndDate?: string;
  registeredUsers?: number;
  activeUsers?: number;
  repeatUsers?: number;
  reportedUsersCount?: number;
  totalActivity?: number;
  detailedRowsCount?: number;
  activityPerUser?: number;
  averageUserTenure?: number;
  activePercent?: number;
  repeatPercent?: number;
  activeUsersInPeriod?: number;
  totalUsers?: number;
  processedUsers?: number;
  errorMessage?: string | null;
}

interface OrganizationAnalyticsSummaryRow {
  registeredUsers: number | null;
  activeUsers: number | null;
  repeatUsers: number | null;
  totalActivity: number | null;
  reportedUsersCount: number | null;
  detailedRowsCount: number | null;
  activePercent: number | null;
  repeatPercent: number | null;
  activityPerUser: number | null;
  averageUserTenure: number | null;
  status: AnalyticsStatus;
  [key: string]: number | string | null | undefined;
}

interface OrganizationAnalyticsResponse {
  reportBatchId: string;
  triggered: boolean;
  selectedWeek: number;
  weeks: number[];
  months: number[];
  records: OrganizationAnalyticsRecord[];
  summaryRow: OrganizationAnalyticsSummaryRow | null;
}

interface OrgAnalyticsResult {
  orgId: string;
  orgName: string;
  tId: string;
  response: OrganizationAnalyticsResponse;
  error?: string;
}

const POLL_INTERVAL_MS = 15000;

const currentYear = new Date().getFullYear();

/** ISO week number (1–53), matching backend moment().isoWeek() */
const getCurrentIsoWeek = () => {
  const date = new Date();
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

const currentIsoWeek = getCurrentIsoWeek();

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => {
  const year = currentYear - i;
  return { value: String(year), label: String(year) };
});

const buildWeekOptions = (selectedYear: number) => {
  const maxWeek = selectedYear === currentYear ? currentIsoWeek : 52;
  return Array.from({ length: maxWeek }, (_, i) => {
    const week = i + 1;
    return { value: String(week), label: `Week ${week}` };
  });
};

const statusClass = (status: AnalyticsStatus) => {
  switch (status) {
    case "complete":
      return "bg-green-100 text-green-800";
    case "processing":
    case "pending":
      return "bg-[#1f00a3]/10 text-[#1f00a3]";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const formatNumber = (value?: number | null) =>
  value == null || Number.isNaN(Number(value)) ? "—" : Number(value).toLocaleString();

const PERCENT_COLUMN_KEYS = new Set(["activePercent", "repeatPercent"]);

const formatPercent = (value?: number | null) =>
  value == null || Number.isNaN(Number(value)) ? "—" : `${Math.trunc(Number(value))}%`;

export default function OrganizationAnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const [platformOptions, setPlatformOptions] = useState<{ key: string; name: string }[]>([]);
  const [organisationOptions, setOrganisationOptions] = useState<OrganizationOption[]>([]);
  const [platform, setPlatform] = useState("");
  const [tenantIds, setTenantIds] = useState<string[]>([]);
  const [year, setYear] = useState(String(currentYear));
  const [week, setWeek] = useState("");

  const weekOptions = useMemo(() => buildWeekOptions(Number(year) || currentYear), [year]);

  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<OrgAnalyticsResult[]>([]);
  const [tableOrgFilter, setTableOrgFilter] = useState("");
  const [tableTidFilter, setTableTidFilter] = useState("");
  const [tableWeekFilter, setTableWeekFilter] = useState("");

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestRef = useRef(0);

  const selectedOrgs = useMemo(
    () => organisationOptions.filter((org) => tenantIds.includes(org._id) && org.tId),
    [organisationOptions, tenantIds],
  );

  const tenantOptions = useMemo(
    () =>
      organisationOptions.map((org) => ({
        value: org._id,
        label: org.inactive ? `${org.name} (Inactive)` : org.name,
        secondaryLabel: org.tId ? `tId: ${org.tId}` : "tId: —",
        disabled: Boolean(org.inactive) || !org.tId,
      })),
    [organisationOptions],
  );

  const scopeWeeks = useMemo(() => {
    const all = results.flatMap((r) => r.response.weeks || []);
    return [...new Set(all)].sort((a, b) => a - b);
  }, [results]);

  const scopeMonths = useMemo(() => {
    const all = results.flatMap((r) => r.response.months || []);
    return [...new Set(all)].sort((a, b) => a - b);
  }, [results]);

  const spreadsheetColumns = useMemo(() => {
    return [
      { key: "orgName", label: "Organization", group: "meta" },
      { key: "tId", label: "tId", group: "meta" },
      { key: "status", label: "Status", group: "meta" },
      { key: "registeredUsers", label: "Registered Users Count", group: "core" },
      { key: "activeUsers", label: "Active Users", group: "core" },
      { key: "repeatUsers", label: "Repeat User", group: "core" },
      { key: "totalActivity", label: "Total Activity", group: "core" },
      { key: "detailedRowsCount", label: "Detailed Rows Count", group: "core" },
      { key: "activePercent", label: "Active%", group: "derived" },
      { key: "repeatPercent", label: "Repeat% (of active)", group: "derived" },
      { key: "activityPerUser", label: "Activity per user", group: "derived" },
      ...scopeWeeks.map((w) => ({ key: `w${w} Active`, label: `w${w} Active`, group: "week" })),
      ...scopeMonths.map((m) => ({ key: `m${m} Active`, label: `m${m} Active`, group: "month" })),
    ];
  }, [scopeWeeks, scopeMonths]);

  const workingTenants = useMemo(() => {
    if (loading && results.length === 0) {
      return selectedOrgs.map((org) => org.name);
    }
    return results
      .filter((r) =>
        r.response.records.some((rec) => rec.status === "processing" || rec.status === "pending"),
      )
      .map((r) => r.orgName);
  }, [loading, results, selectedOrgs]);

  const showProgress = workingTenants.length > 0 || loading || polling;

  const allRecords = useMemo(
    () =>
      results.flatMap((r) =>
        r.response.records.map((rec) => ({
          ...rec,
          orgName: r.orgName,
        })),
      ),
    [results],
  );

  const tableOrgOptions = useMemo(() => {
    const names = [...new Set(results.map((r) => r.orgName))].sort();
    return [
      { value: "", label: "All organizations" },
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }, [results]);

  const tableTidOptions = useMemo(() => {
    const tids = [...new Set(results.map((r) => r.tId).filter(Boolean))].sort();
    return [{ value: "", label: "All tIds" }, ...tids.map((tId) => ({ value: tId, label: tId }))];
  }, [results]);

  const tableWeekFilterOptions = useMemo(() => {
    return [
      { value: "", label: "All weeks" },
      ...scopeWeeks.map((w) => ({ value: String(w), label: `Week ${w}` })),
    ];
  }, [scopeWeeks]);

  /** Calendar month (1–12) that contains ISO week `week` for the selected year. */
  const monthForIsoWeek = useCallback((selectedYear: number, weekNum: number) => {
    const date = new Date(Date.UTC(selectedYear, 0, 4));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day + (weekNum - 1) * 7);
    return date.getUTCMonth() + 1;
  }, []);

  const weekRecords = useMemo(() => {
    const weekNum = tableWeekFilter ? Number(tableWeekFilter) : null;
    return allRecords
      .filter((r) => r.periodType === "week")
      .filter((r) => !tableOrgFilter || r.orgName === tableOrgFilter)
      .filter((r) => !tableTidFilter || r.tId === tableTidFilter)
      .filter((r) => weekNum == null || r.week === weekNum)
      .sort((a, b) => a.orgName.localeCompare(b.orgName) || (a.week || 0) - (b.week || 0));
  }, [allRecords, tableOrgFilter, tableTidFilter, tableWeekFilter]);

  const monthRecords = useMemo(() => {
    const weekNum = tableWeekFilter ? Number(tableWeekFilter) : null;
    const monthFromWeek =
      weekNum != null ? monthForIsoWeek(Number(year) || currentYear, weekNum) : null;
    return allRecords
      .filter((r) => r.periodType === "month")
      .filter((r) => !tableOrgFilter || r.orgName === tableOrgFilter)
      .filter((r) => !tableTidFilter || r.tId === tableTidFilter)
      .filter((r) => monthFromWeek == null || r.month === monthFromWeek)
      .sort((a, b) => a.orgName.localeCompare(b.orgName) || (a.month || 0) - (b.month || 0));
  }, [allRecords, tableOrgFilter, tableTidFilter, tableWeekFilter, monthForIsoWeek, year]);

  const showWeekProgressColumn = useMemo(
    () => weekRecords.some((r) => r.status !== "complete"),
    [weekRecords],
  );

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setPolling(false);
  }, []);

  const fetchPlatforms = async () => {
    try {
      const data = await get<{ key: string; name: string }[]>("/admin/platform-data");
      if (data) setPlatformOptions(data);
    } catch (e) {
      console.error("Error fetching platforms:", e);
    }
  };

  const fetchOrganisations = async (platformKey: string) => {
    if (!platformKey) {
      setOrganisationOptions([]);
      return;
    }
    try {
      const data = await get<OrganizationOption[]>(`/admin/organization/${platformKey}`);
      if (data) {
        setOrganisationOptions(
          data.map((org) => ({
            _id: org._id,
            name: org.name,
            tId: org.tId,
            inactive: Boolean(org.inactive),
          })),
        );
      }
    } catch (e) {
      console.error("Error fetching organizations:", e);
      setOrganisationOptions([]);
    }
  };

  const fetchAnalytics = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!platform || selectedOrgs.length === 0 || !year || !week) {
        setError("Select platform, one or more tenants, year, and week");
        return null;
      }

      const requestId = ++requestRef.current;
      if (!opts?.silent) {
        setLoading(true);
        setError("");
      }

      try {
        const settled = await Promise.all(
          selectedOrgs.map(async (org) => {
            try {
              const response = await post<OrganizationAnalyticsResponse>(
                "/admin/organization-analytics",
                {
                  platformKey: platform,
                  tId: org.tId,
                  year: Number(year),
                  week: Number(week),
                  includeSummary: true,
                },
              );
              return {
                orgId: org._id,
                orgName: org.name,
                tId: org.tId,
                response,
              } as OrgAnalyticsResult;
            } catch (e) {
              return {
                orgId: org._id,
                orgName: org.name,
                tId: org.tId,
                response: {
                  reportBatchId: "",
                  triggered: false,
                  selectedWeek: Number(week),
                  weeks: [],
                  months: [],
                  records: [],
                  summaryRow: null,
                },
                error: e instanceof Error ? e.message : "Failed to load analytics",
              } as OrgAnalyticsResult;
            }
          }),
        );

        if (requestId !== requestRef.current) return null;
        setResults(settled);

        const failures = settled.filter((r) => r.error);
        if (failures.length && failures.length === settled.length) {
          setError(failures.map((f) => `${f.orgName}: ${f.error}`).join("; "));
        } else if (failures.length) {
          setError(
            `Some tenants failed: ${failures.map((f) => `${f.orgName}: ${f.error}`).join("; ")}`,
          );
        } else if (!opts?.silent) {
          setError("");
        }

        return settled;
      } catch (e) {
        if (requestId !== requestRef.current) return null;
        const message = e instanceof Error ? e.message : "Failed to load organization analytics";
        setError(message);
        return null;
      } finally {
        if (requestId === requestRef.current && !opts?.silent) {
          setLoading(false);
        }
      }
    },
    [platform, selectedOrgs, year, week],
  );

  const startPolling = useCallback(() => {
    stopPolling();
    setPolling(true);
    pollTimerRef.current = setInterval(async () => {
      const data = await fetchAnalytics({ silent: true });
      if (!data) return;
      const stillProcessing = data.some((r) =>
        r.response.records.some((rec) => rec.status === "processing" || rec.status === "pending"),
      );
      if (!stillProcessing) {
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }, [fetchAnalytics, stopPolling]);

  const handleLoad = async () => {
    stopPolling();
    setTableOrgFilter("");
    setTableTidFilter("");
    setTableWeekFilter("");
    const data = await fetchAnalytics();
    if (!data) return;
    const stillProcessing = data.some((r) =>
      r.response.records.some((rec) => rec.status === "processing" || rec.status === "pending"),
    );
    if (stillProcessing) {
      startPolling();
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(ROUTES.LOGIN);
      return;
    }
    fetchPlatforms();
  }, [isAuthenticated, router]);

  useEffect(() => {
    setTenantIds([]);
    setResults([]);
    stopPolling();
    if (platform) {
      fetchOrganisations(platform);
    } else {
      setOrganisationOptions([]);
    }
  }, [platform, stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const headerClass = (group: string) => {
    if (group === "meta") return "bg-gray-100 text-gray-800";
    if (group === "core") return "bg-emerald-100 text-emerald-900";
    if (group === "derived") return "bg-sky-100 text-sky-900";
    if (group === "week") return "bg-amber-100 text-amber-900";
    return "bg-violet-100 text-violet-900";
  };

  const rowValue = (result: OrgAnalyticsResult, key: string) => {
    if (key === "orgName") return result.orgName;
    if (key === "tId") return result.tId;
    if (key === "status") {
      if (result.error) return "failed";
      const summary = result.response.records.find((r) => r.periodType === "summary");
      return summary?.status || result.response.summaryRow?.status || "—";
    }
    const value = result.response.summaryRow?.[key];
    if (value != null && typeof value === "object") return null;
    return (value as number | string | null | undefined) ?? null;
  };

  const summaryTotalsRow = useMemo(() => {
    if (results.length === 0) return null;

    let registeredUsers = 0;
    let activeUsers = 0;
    let repeatUsers = 0;
    let totalActivity = 0;
    let detailedRowsCount = 0;
    const pivotTotals: Record<string, number> = {};

    for (const result of results) {
      const row = result.response.summaryRow;
      if (!row) continue;

      registeredUsers += row.registeredUsers ?? 0;
      activeUsers += row.activeUsers ?? 0;
      repeatUsers += row.repeatUsers ?? 0;
      totalActivity += row.totalActivity ?? 0;
      detailedRowsCount += row.detailedRowsCount ?? 0;

      for (const w of scopeWeeks) {
        const key = `w${w} Active`;
        const value = row[key];
        if (typeof value === "number") {
          pivotTotals[key] = (pivotTotals[key] ?? 0) + value;
        }
      }
      for (const m of scopeMonths) {
        const key = `m${m} Active`;
        const value = row[key];
        if (typeof value === "number") {
          pivotTotals[key] = (pivotTotals[key] ?? 0) + value;
        }
      }
    }

    const activePercent =
      registeredUsers > 0 ? Math.trunc((activeUsers / registeredUsers) * 100) : 0;
    const repeatPercent = activeUsers > 0 ? Math.trunc((repeatUsers / activeUsers) * 100) : 0;
    const activityPerUser =
      repeatUsers > 0 ? Number(((totalActivity - activeUsers) / repeatUsers).toFixed(2)) : 0;

    const totals: Record<string, number | string | null> = {
      orgName: "Total",
      tId: "—",
      status: "—",
      registeredUsers,
      activeUsers,
      repeatUsers,
      totalActivity,
      detailedRowsCount,
      activePercent,
      repeatPercent,
      activityPerUser,
    };

    for (const w of scopeWeeks) {
      const key = `w${w} Active`;
      totals[key] = pivotTotals[key] ?? 0;
    }
    for (const m of scopeMonths) {
      const key = `m${m} Active`;
      totals[key] = pivotTotals[key] ?? 0;
    }

    return totals;
  }, [results, scopeWeeks, scopeMonths]);

  return (
    <Layout title="Org Analytics">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SearchableSelect
                label="Platform"
                options={platformOptions.map((p) => ({ value: p.key, label: p.name }))}
                value={platform}
                onChange={setPlatform}
                placeholder="Select Platform"
                emptyMessage="No platforms found"
                disabled={platformOptions.length === 0}
              />

              <MultiSelect
                label="Tenants"
                options={tenantOptions}
                value={tenantIds}
                onChange={setTenantIds}
                placeholder="Select one or more tenants..."
                searchPlaceholder="Search by org name or tId..."
                emptyMessage="No tenants found"
                disabled={organisationOptions.length === 0}
              />

              <SearchableSelect
                label="Year"
                options={YEAR_OPTIONS}
                value={year}
                onChange={(value) => {
                  setYear(value);
                  const maxWeek = Number(value) === currentYear ? currentIsoWeek : 52;
                  if (week && Number(week) > maxWeek) {
                    setWeek("");
                  }
                }}
                placeholder="Select Year"
              />

              <SearchableSelect
                label="Through Week"
                options={weekOptions}
                value={week}
                onChange={setWeek}
                placeholder="Select Week"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                onClick={handleLoad}
                disabled={loading || !platform || tenantIds.length === 0 || !week}
                loading={loading}
              >
                {loading ? "Loading..." : "Load / Generate"}
              </Button>
            </div>

            {showProgress && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#1f00a3]/15 bg-[#1f00a3]/5 px-4 py-3">
                <Loader size="sm" variant="primary" inline />
                <p className="text-sm text-[#1f00a3]">
                  <span className="font-medium">Loading tenant</span>
                  {workingTenants.length > 0 ? (
                    <>
                      : <span className="font-semibold">{workingTenants.join(", ")}</span>
                    </>
                  ) : (
                    "…"
                  )}
                </p>
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span>
                Scope: weeks 1–{week || "—"}, months{" "}
                {scopeMonths.length ? `1–${scopeMonths[scopeMonths.length - 1]}` : "—"}
              </span>
              <span>
                Triggered:{" "}
                <span className="font-medium text-gray-900">
                  {results.some((r) => r.response.triggered) ? "yes" : "no (cached)"}
                </span>
              </span>
              {workingTenants.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1f00a3]/10 px-2.5 py-1 text-sm text-[#1f00a3]">
                  <Loader size="sm" variant="primary" inline />
                  Loading: {workingTenants.join(", ")}
                </span>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Summary (report-users Summary sheet)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead>
                      <tr>
                        {spreadsheetColumns.map((col) => (
                          <th
                            key={col.key}
                            className={`whitespace-nowrap px-3 py-2 text-left text-xs font-semibold ${headerClass(col.group)}`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {summaryTotalsRow && (
                        <tr className="border-y-2 border-[#1f00a3]/40 bg-[#1f00a3]/12">
                          {spreadsheetColumns.map((col) => {
                            const value = summaryTotalsRow[col.key];
                            return (
                              <td
                                key={`total-${col.key}`}
                                className="whitespace-nowrap px-3 py-2.5 text-left text-sm font-bold text-[#1f00a3]"
                              >
                                {typeof value === "number"
                                  ? PERCENT_COLUMN_KEYS.has(col.key)
                                    ? formatPercent(value)
                                    : formatNumber(value)
                                  : (value ?? "—")}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                      {results.map((result) => (
                        <tr key={result.orgId}>
                          {spreadsheetColumns.map((col) => {
                            const value = rowValue(result, col.key);
                            return (
                              <td
                                key={col.key}
                                className="whitespace-nowrap px-3 py-2 text-left text-gray-900"
                              >
                                {col.key === "status" && typeof value === "string" ? (
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(value as AnalyticsStatus)}`}
                                  >
                                    {(value === "processing" || value === "pending") && (
                                      <Loader size="sm" variant="primary" inline />
                                    )}
                                    {value}
                                  </span>
                                ) : typeof value === "number" ? (
                                  PERCENT_COLUMN_KEYS.has(col.key) ? (
                                    formatPercent(value)
                                  ) : (
                                    formatNumber(value)
                                  )
                                ) : value == null ? (
                                  "—"
                                ) : (
                                  String(value)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Week &amp; Month detail filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SearchableSelect
                      label="Organization"
                      options={tableOrgOptions}
                      value={tableOrgFilter}
                      onChange={setTableOrgFilter}
                      placeholder="All organizations"
                      emptyMessage="No organizations"
                    />
                    <SearchableSelect
                      label="tId"
                      options={tableTidOptions}
                      value={tableTidFilter}
                      onChange={setTableTidFilter}
                      placeholder="All tIds"
                      emptyMessage="No tIds"
                    />
                    <SearchableSelect
                      label="Week"
                      options={tableWeekFilterOptions}
                      value={tableWeekFilter}
                      onChange={setTableWeekFilter}
                      placeholder="All weeks"
                      emptyMessage="No weeks"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Week filter applies to week rows directly; for month rows it keeps the calendar
                    month that contains that ISO week.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Week records (week set, month=null)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-80">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Organization</th>
                          <th className="px-3 py-2 text-left">tId</th>
                          <th className="px-3 py-2 text-left">Week</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Registered</th>
                          <th className="px-3 py-2 text-left">Active</th>
                          <th className="px-3 py-2 text-left">Repeat</th>
                          <th className="px-3 py-2 text-left">Total Activity</th>
                          {showWeekProgressColumn && (
                            <th className="px-3 py-2 text-left">Progress</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {weekRecords.length === 0 ? (
                          <tr>
                            <td
                              colSpan={showWeekProgressColumn ? 9 : 8}
                              className="px-3 py-4 text-left text-gray-500"
                            >
                              No week records match the filters.
                            </td>
                          </tr>
                        ) : (
                          weekRecords.map((record) => (
                            <tr key={`${record.tId}-w-${record.week}`}>
                              <td className="px-3 py-2 text-left">{record.orgName}</td>
                              <td className="px-3 py-2 text-left font-mono text-xs">
                                {record.tId}
                              </td>
                              <td className="px-3 py-2 text-left">{record.week}</td>
                              <td className="px-3 py-2 text-left">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(record.status)}`}
                                >
                                  {(record.status === "processing" ||
                                    record.status === "pending") && (
                                    <Loader size="sm" variant="primary" inline />
                                  )}
                                  {record.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-left">
                                {formatNumber(record.registeredUsers)}
                              </td>
                              <td className="px-3 py-2 text-left">
                                {formatNumber(record.activeUsersInPeriod ?? record.activeUsers)}
                              </td>
                              <td className="px-3 py-2 text-left">
                                {formatNumber(record.repeatUsers)}
                              </td>
                              <td className="px-3 py-2 text-left">
                                {formatNumber(record.totalActivity)}
                              </td>
                              {showWeekProgressColumn && (
                                <td className="px-3 py-2 text-left">
                                  {record.status === "complete" || !record.totalUsers ? (
                                    "—"
                                  ) : (
                                    <div className="min-w-[7rem]">
                                      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-gray-600">
                                        <span>
                                          {record.processedUsers || 0}/{record.totalUsers}
                                        </span>
                                        {(record.status === "processing" ||
                                          record.status === "pending") && (
                                          <Loader size="sm" variant="primary" inline />
                                        )}
                                      </div>
                                      <div className="h-1.5 overflow-hidden rounded-full bg-[#1f00a3]/10">
                                        <div
                                          className="h-full rounded-full bg-[#1f00a3] transition-all duration-500"
                                          style={{
                                            width: `${Math.min(
                                              100,
                                              Math.round(
                                                ((record.processedUsers || 0) / record.totalUsers) *
                                                  100,
                                              ),
                                            )}%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Month records (week=null, month set)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto max-h-80">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Organization</th>
                          <th className="px-3 py-2 text-left">tId</th>
                          <th className="px-3 py-2 text-left">Month</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Registered</th>
                          <th className="px-3 py-2 text-left">Active</th>
                          <th className="px-3 py-2 text-left">Repeat</th>
                          <th className="px-3 py-2 text-left">Total Activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {monthRecords.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-3 py-4 text-left text-gray-500">
                              No month records match the filters.
                            </td>
                          </tr>
                        ) : (
                          monthRecords.map((record) => (
                            <tr key={`${record.tId}-m-${record.month}`}>
                              <td className="px-3 py-2 text-left">{record.orgName}</td>
                              <td className="px-3 py-2 text-left font-mono text-xs">
                                {record.tId}
                              </td>
                              <td className="px-3 py-2 text-left">{record.month}</td>
                              <td className="px-3 py-2 text-left">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(record.status)}`}
                                >
                                  {(record.status === "processing" ||
                                    record.status === "pending") && (
                                    <Loader size="sm" variant="primary" inline />
                                  )}
                                  {record.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-left">
                                {formatNumber(record.registeredUsers)}
                              </td>
                              <td className="px-3 py-2 text-left">
                                {formatNumber(record.activeUsersInPeriod ?? record.activeUsers)}
                              </td>
                              <td className="px-3 py-2 text-left">
                                {formatNumber(record.repeatUsers)}
                              </td>
                              <td className="px-3 py-2 text-left">
                                {formatNumber(record.totalActivity)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
