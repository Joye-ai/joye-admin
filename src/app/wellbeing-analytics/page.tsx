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
  MultiSelect,
  SearchableSelect,
} from "@/components/ui";
import { ROUTES } from "@/constants";
import { get, post } from "@/helpers/api";
import { useAppSelector } from "@/store";

interface OrganizationOption {
  _id: string;
  name: string;
  tId: string;
  inactive?: boolean;
}

interface WellbeingMonthRow {
  id: string;
  orgName: string;
  tId: string;
  department: string | null;
  month: number;
  year: number;
  wellbeingIndex: number | null;
  joyLevel: number | null;
  brew: number | null;
  gratitude: number | null;
  effectiveness: number | null;
}

interface WellbeingAnalyticsRecord {
  platformKey: string;
  tId: string;
  department: string | null;
  year: number;
  month: number;
  wellbeingIndex: number | null;
  joyLevel: number | null;
  brew: number | null;
  gratitude: number | null;
  effectiveness: number | null;
}

interface WellbeingAnalyticsResponse {
  year: number;
  months: number[];
  tIds: string[];
  records: WellbeingAnalyticsRecord[];
}

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => {
  const y = String(currentYear - i);
  return { value: y, label: y };
});

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_OPTIONS = MONTH_LABELS.map((label, index) => ({
  value: String(index + 1),
  label,
}));

/** Tenants per wellbeing-analytics request (chunked fetching). */
const TENANT_BATCH_SIZE = 25;

const formatMonth = (month: number, year: number) => `${MONTH_LABELS[month - 1] || "—"} ${year}`;

const formatMetric = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return "—";
  return Number(value).toFixed(1);
};

const formatPercent = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(1)}%`;
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

export default function WellbeingAnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const requestRef = useRef(0);

  const [platformOptions, setPlatformOptions] = useState<{ key: string; name: string }[]>([]);
  const [organisationOptions, setOrganisationOptions] = useState<OrganizationOption[]>([]);
  const [platform, setPlatform] = useState("");
  const [tenantIds, setTenantIds] = useState<string[]>([]);
  const [year, setYear] = useState(String(currentYear));
  const [months, setMonths] = useState<string[]>([String(currentMonth)]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<WellbeingMonthRow[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [tenantBatchProgress, setTenantBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const selectedOrgs = useMemo(
    () => organisationOptions.filter((org) => tenantIds.includes(org._id) && org.tId),
    [organisationOptions, tenantIds],
  );

  const orgNameByTid = useMemo(() => {
    const map = new Map<string, string>();
    for (const org of organisationOptions) {
      if (org.tId) map.set(org.tId, org.name);
    }
    return map;
  }, [organisationOptions]);

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

  const monthOptions = useMemo(() => {
    const selectedYear = Number(year) || currentYear;
    const maxMonth =
      selectedYear < currentYear ? 12 : selectedYear > currentYear ? 0 : currentMonth;
    return MONTH_OPTIONS.filter((option) => Number(option.value) <= maxMonth);
  }, [year]);

  useEffect(() => {
    const allowed = new Set(monthOptions.map((option) => option.value));
    setMonths((prev) => {
      const next = prev.filter((value) => allowed.has(value));
      if (next.length > 0) return next;
      const fallback = monthOptions[monthOptions.length - 1]?.value;
      return fallback ? [fallback] : [];
    });
  }, [monthOptions]);

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

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(ROUTES.LOGIN);
      return;
    }
    fetchPlatforms();
  }, [isAuthenticated, router]);

  useEffect(() => {
    setTenantIds([]);
    setOrganisationOptions([]);
    setRows([]);
    setHasLoaded(false);
    if (platform) fetchOrganisations(platform);
  }, [platform]);

  const mapRecords = useCallback(
    (records: WellbeingAnalyticsRecord[]): WellbeingMonthRow[] =>
      records.map((record) => ({
        id: `${record.tId}-${record.department || "org"}-${record.year}-${record.month}`,
        orgName: orgNameByTid.get(record.tId) || record.tId,
        tId: record.tId,
        department: record.department,
        month: record.month,
        year: record.year,
        wellbeingIndex: record.wellbeingIndex,
        joyLevel: record.joyLevel,
        brew: record.brew,
        gratitude: record.gratitude,
        effectiveness: record.effectiveness,
      })),
    [orgNameByTid],
  );

  const handleLoad = useCallback(async () => {
    setError("");
    if (!platform || selectedOrgs.length === 0 || !year || months.length === 0) {
      setError("Select platform, one or more tenants, year, and at least one month");
      return;
    }

    const requestId = ++requestRef.current;
    setLoading(true);
    setRows([]);
    setHasLoaded(true);

    const batches = chunk(selectedOrgs, TENANT_BATCH_SIZE);
    const allRecords: WellbeingAnalyticsRecord[] = [];
    const selectedMonths = months.map(Number).sort((a, b) => a - b);
    let completedTenants = 0;

    try {
      for (let i = 0; i < batches.length; i++) {
        if (requestId !== requestRef.current) return;

        if (batches.length > 1) {
          setTenantBatchProgress({ current: i + 1, total: batches.length });
        }

        const batch = batches[i];
        const response = await post<WellbeingAnalyticsResponse>("/admin/wellbeing-analytics", {
          platformKey: platform,
          tIds: batch.map((org) => org.tId),
          year: Number(year) || currentYear,
          months: selectedMonths,
          viewMode: "organization",
        });

        allRecords.push(...(response?.records || []));
        completedTenants += batch.length;

        if (requestId !== requestRef.current) return;
        // Progressive UI: show rows as each tenant chunk returns
        setRows(mapRecords(allRecords));
      }

      if (requestId !== requestRef.current) return;
      setHasLoaded(true);
    } catch (e) {
      if (requestId !== requestRef.current) return;
      console.error(e);
      const base = e instanceof Error ? e.message : "Failed to load wellbeing analytics";
      setError(
        allRecords.length > 0
          ? `${base} (${completedTenants} of ${selectedOrgs.length} tenants loaded.)`
          : base,
      );
      if (allRecords.length === 0) {
        setRows([]);
        setHasLoaded(false);
      }
    } finally {
      if (requestId === requestRef.current) {
        setTenantBatchProgress(null);
        setLoading(false);
      }
    }
  }, [platform, selectedOrgs, year, months, mapRecords]);

  return (
    <Layout
      title="Wellbeing Analytics"
      subtitle="Organization monthly wellbeing metrics from User_Wellbeing_Data"
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
                allowSelectAll
                searchable
              />

              <SearchableSelect
                label="Year"
                options={YEAR_OPTIONS}
                value={year}
                onChange={setYear}
                placeholder="Select Year"
              />

              <MultiSelect
                label="Month"
                options={monthOptions}
                value={months}
                onChange={setMonths}
                placeholder="Select one or more months..."
                searchPlaceholder="Search months..."
                emptyMessage="No months available"
                disabled={monthOptions.length === 0}
                allowSelectAll
                searchable
              />
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Loads organization-level metrics for the selected year and month(s). Metrics are
              calculated live from daily wellbeing data.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                onClick={handleLoad}
                disabled={
                  loading || !platform || tenantIds.length === 0 || !year || months.length === 0
                }
                loading={loading}
              >
                {loading
                  ? tenantBatchProgress
                    ? `Loading batch ${tenantBatchProgress.current}/${tenantBatchProgress.total}…`
                    : "Loading..."
                  : "Load"}
              </Button>
              {loading && tenantBatchProgress && (
                <p className="text-xs text-gray-500">
                  Chunk size {TENANT_BATCH_SIZE} tenants ·{" "}
                  {Math.min(tenantBatchProgress.current * TENANT_BATCH_SIZE, selectedOrgs.length)}/
                  {selectedOrgs.length} tenants
                </p>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>

        {hasLoaded && (
          <Card>
            <CardHeader>
              <CardTitle>Organization monthly metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[32rem]">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50">
                    <tr>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Organization
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        tId
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Month
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Wellbeing Index
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Joy Level
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Brew
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Gratitude
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Effectiveness %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                          No rows for this selection
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, index) => (
                        <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/80"}>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                            {row.orgName}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-700">{row.tId}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                            {formatMonth(row.month, row.year)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                            {formatMetric(row.wellbeingIndex)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                            {formatMetric(row.joyLevel)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                            {formatMetric(row.brew)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                            {formatMetric(row.gratitude)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                            {formatPercent(row.effectiveness)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
