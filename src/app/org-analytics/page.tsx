"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Layout } from "@/components/layout";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  MultiSelect,
  SearchableSelect,
} from "@/components/ui";
import { ROUTES } from "@/constants";
import { get, post } from "@/helpers/api";
import { useAppSelector } from "@/store";

const CURRENT_YEAR = new Date().getFullYear();
const MAX_WEEKS_WITHOUT_CONFIRM = 4;
const MAX_TENANTS_WITHOUT_CONFIRM = 2;

interface FilterState {
  platform: string;
  tenants: string[];
  year: string;
  weeks: string[];
}

interface OrganisationOption {
  tId: string;
  name: string;
  inactive?: boolean;
}

interface AnalyticsRecord {
  tId?: string;
  periodType: "summary" | "week" | "month";
  week: number | null;
  month: number | null;
  status: "pending" | "processing" | "complete" | "failed";
  registeredUsers?: number | null;
  activeUsers?: number | null;
  repeatUsers?: number | null;
  totalActivity?: number | null;
  activePercent?: number | null;
  repeatPercent?: number | null;
  activityPerUser?: number | null;
  processedUsers?: number | null;
  totalUsers?: number | null;
  errorMessage?: string | null;
  reportStartDate?: string;
  reportEndDate?: string;
}

interface AnalyticsSummaryRow {
  registeredUsers: number | null;
  activeUsers: number | null;
  repeatUsers: number | null;
  totalActivity: number | null;
  activePercent: number | null;
  repeatPercent: number | null;
  activityPerUser: number | null;
  status: string;
}

interface AnalyticsTenantResult {
  tId: string;
  triggered: boolean;
  records: AnalyticsRecord[];
  summaryRow: AnalyticsSummaryRow | null;
}

interface AnalyticsResponse {
  triggered: boolean;
  weeks: number[];
  months: number[];
  tIds?: string[];
  records: AnalyticsRecord[];
  summaryRow: AnalyticsSummaryRow | null;
  results?: AnalyticsTenantResult[];
}

const WEEK_OPTIONS = Array.from({ length: 52 }, (_, i) => {
  const week = i + 1;
  return { value: String(week), label: `Week ${week}` };
});

const YEAR_OPTIONS = [0, 1, 2].map((offset) => {
  const year = String(CURRENT_YEAR - offset);
  return { value: year, label: year };
});

export default function OrgAnalyticsPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const didFetchPlatforms = useRef(false);

  const [filters, setFilters] = useState<FilterState>({
    platform: "",
    tenants: [],
    year: String(CURRENT_YEAR),
    weeks: [],
  });
  const [platformOptions, setPlatformOptions] = useState<{ key: string; name: string }[]>([]);
  const [organisationOptions, setOrganisationOptions] = useState<OrganisationOption[]>([]);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showLargeSelectionAlert, setShowLargeSelectionAlert] = useState(false);

  const canSubmit = Boolean(
    filters.platform && filters.tenants.length && filters.year && filters.weeks.length,
  );

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!filters.platform) missing.push("platform");
    if (!filters.tenants.length) missing.push("at least one tenant");
    if (!filters.year) missing.push("year");
    if (!filters.weeks.length) missing.push("at least one week");
    return missing;
  }, [filters]);

  const tenantNameById = useMemo(
    () => Object.fromEntries(organisationOptions.map((org) => [org.tId, org.name])),
    [organisationOptions],
  );

  const isProcessing = Boolean(
    data?.records.some((record) => record.status === "processing" || record.status === "pending"),
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(ROUTES.LOGIN);
    }
    if (!didFetchPlatforms.current) {
      didFetchPlatforms.current = true;
      void fetchPlatforms();
    }
  }, [router, isAuthenticated]);

  const fetchPlatforms = async () => {
    try {
      const response = await get<{ key: string; name: string }[]>("/admin/platform-data");
      if (response) setPlatformOptions(response);
    } catch (e) {
      console.error("Error fetching platforms:", e);
    }
  };

  const fetchOrganisations = async (platformKey: string) => {
    if (!platformKey) return;
    try {
      const response = await get<OrganisationOption[]>(`/admin/organization/${platformKey}`);
      if (response) {
        setOrganisationOptions(
          response.map((org) => ({
            tId: org.tId,
            name: org.name,
            inactive: Boolean(org.inactive),
          })),
        );
      }
    } catch (e) {
      console.error("Error fetching organizations:", e);
      setOrganisationOptions([]);
    }
  };

  const loadAnalytics = useCallback(async () => {
    if (!filters.platform || !filters.tenants.length || !filters.year || !filters.weeks.length) {
      setError(
        "Select platform, at least one tenant, year, and at least one week before running Org Analytics.",
      );
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await post<AnalyticsResponse>("/admin/organization-analytics", {
        platformKey: filters.platform,
        tIds: filters.tenants,
        year: Number(filters.year),
        weeks: filters.weeks.map(Number).sort((a, b) => a - b),
        includeSummary: true,
      });
      setData(response);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load organization analytics";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (!isProcessing || !canSubmit) return undefined;
    const timer = window.setInterval(() => {
      void loadAnalytics();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [isProcessing, canSubmit, loadAnalytics]);

  const handleFilterChange = (key: keyof FilterState, value: string | string[]) => {
    setData(null);
    setError("");
    setFilters((prev) => ({ ...prev, [key]: value }));

    if (key === "platform" && typeof value === "string") {
      setOrganisationOptions([]);
      setFilters((prev) => ({ ...prev, platform: value, tenants: [] }));
      void fetchOrganisations(value);
    }
  };

  const needsLargeSelectionConfirm =
    filters.weeks.length > MAX_WEEKS_WITHOUT_CONFIRM ||
    filters.tenants.length > MAX_TENANTS_WITHOUT_CONFIRM;

  const handleGenerate = async () => {
    if (!canSubmit) {
      setError(`Select ${missingFields.join(", ")} before running Org Analytics.`);
      return;
    }
    if (needsLargeSelectionConfirm) {
      setShowLargeSelectionAlert(true);
      return;
    }
    await loadAnalytics();
  };

  const handleConfirmLargeSelection = async () => {
    setShowLargeSelectionAlert(false);
    await loadAnalytics();
  };

  const formatNumber = (value?: number | null) => {
    if (value == null) return "—";
    return Number(value).toLocaleString();
  };

  const periodLabel = (record: AnalyticsRecord) => {
    if (record.periodType === "week") return `Week ${record.week}`;
    if (record.periodType === "month") return `Month ${record.month}`;
    return "Summary";
  };

  return (
    <Layout
      title="Org Analytics"
      subtitle="Generate missing data for your selection, or show cached results if already generated"
    >
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
                placeholder="Select platform"
                emptyMessage="No platforms found"
                disabled={platformOptions.length === 0}
              />
              <MultiSelect
                label="Tenants"
                options={organisationOptions
                  .filter((org) => !org.inactive)
                  .map((org) => ({
                    value: org.tId,
                    label: org.name,
                  }))}
                value={filters.tenants}
                onChange={(value) => handleFilterChange("tenants", value)}
                placeholder={
                  filters.platform ? "Select one or more tenants" : "Select a platform first"
                }
                allowSelectAll={false}
                searchable
                searchPlaceholder="Search tenants..."
                emptyMessage="No tenants found"
              />
              <SearchableSelect
                label="Year"
                options={YEAR_OPTIONS}
                value={filters.year}
                onChange={(value) => handleFilterChange("year", value)}
                placeholder="Select year"
              />
              <MultiSelect
                label="Weeks"
                options={WEEK_OPTIONS}
                value={filters.weeks}
                onChange={(value) => handleFilterChange("weeks", value)}
                placeholder="Select one or more weeks"
                allowSelectAll={false}
                searchable
                searchPlaceholder="Search weeks..."
                emptyMessage="No weeks found"
              />
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Generates weeks, overlapping months, and a summary for the tenants and weeks you
              selected. Already completed periods are reused from cache and are not recalculated.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={handleGenerate}
                loading={isLoading}
                disabled={!canSubmit || isLoading}
              >
                {isProcessing ? "Refresh progress" : "Generate analytics"}
              </Button>
              {!canSubmit && (
                <span className="text-sm text-gray-500">Required: {missingFields.join(", ")}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError("")}>
            {error}
          </Alert>
        )}

        {isProcessing && (
          <Alert variant="info">
            Generating missing periods for this selection. Cached periods stay as they are. This
            page refreshes every 8 seconds.
          </Alert>
        )}

        {data?.summaryRow && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <p className="text-sm text-gray-600">Registered users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(data.summaryRow.registeredUsers)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-sm text-gray-600">Active users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(data.summaryRow.activeUsers)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-sm text-gray-600">Repeat users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(data.summaryRow.repeatUsers)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-sm text-gray-600">Total activity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(data.summaryRow.totalActivity)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {data && (
          <Card>
            <CardHeader>
              <CardTitle>Period results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 border-b border-gray-200">
                      <th className="py-2 pr-4 font-medium">Tenant</th>
                      <th className="py-2 pr-4 font-medium">Period</th>
                      <th className="py-2 pr-4 font-medium">Range</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Active</th>
                      <th className="py-2 pr-4 font-medium">Repeat</th>
                      <th className="py-2 pr-4 font-medium">Activity</th>
                      <th className="py-2 pr-4 font-medium">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.records.map((record) => (
                      <tr
                        key={`${record.tId}-${record.periodType}-${record.week}-${record.month}`}
                        className="border-b border-gray-100"
                      >
                        <td className="py-2 pr-4 text-gray-900">
                          {record.tId ? tenantNameById[record.tId] || record.tId : "—"}
                        </td>
                        <td className="py-2 pr-4 text-gray-900">{periodLabel(record)}</td>
                        <td className="py-2 pr-4 text-gray-600">
                          {record.reportStartDate && record.reportEndDate
                            ? `${record.reportStartDate} – ${record.reportEndDate}`
                            : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={
                              record.status === "complete"
                                ? "text-green-700"
                                : record.status === "failed"
                                  ? "text-red-700"
                                  : "text-amber-700"
                            }
                          >
                            {record.status}
                          </span>
                          {record.errorMessage ? (
                            <div className="text-xs text-red-600">{record.errorMessage}</div>
                          ) : null}
                        </td>
                        <td className="py-2 pr-4 text-gray-900">
                          {formatNumber(record.activeUsers)}
                        </td>
                        <td className="py-2 pr-4 text-gray-900">
                          {formatNumber(record.repeatUsers)}
                        </td>
                        <td className="py-2 pr-4 text-gray-900">
                          {formatNumber(record.totalActivity)}
                        </td>
                        <td className="py-2 pr-4 text-gray-600">
                          {record.processedUsers != null && record.totalUsers != null
                            ? `${record.processedUsers}/${record.totalUsers}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showLargeSelectionAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowLargeSelectionAlert(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="large-selection-title"
            className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 id="large-selection-title" className="text-lg font-semibold text-gray-900">
                  Large selection
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  You selected {filters.tenants.length} tenant
                  {filters.tenants.length === 1 ? "" : "s"} and {filters.weeks.length} week
                  {filters.weeks.length === 1 ? "" : "s"}. That can create{" "}
                  {filters.tenants.length * filters.weeks.length} week jobs, plus overlapping months
                  and a summary.
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Missing periods will be generated. Completed periods are reused from cache.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowLargeSelectionAlert(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmLargeSelection} loading={isLoading}>
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
