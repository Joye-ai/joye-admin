"use client";

import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  brew: number | null;
  brewCount: number | null;
  gratitude: number | null;
  gratitudeCount: number | null;
  mm: number | null;
  mmCount: number | null;
  totalCount: number | null;
  helpful: number | null;
  notHelpful: number | null;
  effectiveness: number | null;
  userCount: number | null;
  usersWithData: number | null;
}

interface WellbeingAnalyticsRecord {
  platformKey: string;
  tId: string;
  department: string | null;
  year: number;
  month: number;
  wellbeingIndex: number | null;
  brew: number | null;
  brewCount: number | null;
  gratitude: number | null;
  gratitudeCount: number | null;
  mm: number | null;
  mmCount: number | null;
  totalCount: number | null;
  helpful: number | null;
  notHelpful: number | null;
  effectiveness: number | null;
  userCount?: number | null;
  usersWithData?: number | null;
}

interface WellbeingAnalyticsResponse {
  year: number;
  months: number[];
  tIds: string[];
  records: WellbeingAnalyticsRecord[];
}

interface EmotionalDriverAnalyticsRecord {
  platformKey: string;
  tId: string;
  year: number;
  month: number;
  driverKey: string;
  driverTitle: string;
  avgScore: number | null;
  usersWithData: number;
  userCount: number;
}

interface EmotionalCategoryAnalyticsRecord {
  platformKey: string;
  tId: string;
  year: number;
  month: number;
  categoryKey: string;
  categoryTitle: string;
  polarity: "negative" | "positive";
  avgScore: number | null;
  usersWithData: number;
  pctAtOrAboveThreshold: number | null;
  usersAtOrAboveThreshold: number;
  userCount: number;
  suppressed: boolean;
  suppressReason: string | null;
  threshold: number;
  layer2MinEligible: number;
}

interface EmotionalDriverAnalyticsResponse {
  year: number;
  months: number[];
  platformKey: string;
  tIds: string[];
  records: EmotionalDriverAnalyticsRecord[];
  categoryRecords?: EmotionalCategoryAnalyticsRecord[];
}

interface DriverMonthRow {
  id: string;
  platformKey: string;
  orgName: string;
  tId: string;
  month: number;
  year: number;
  userCount: number;
  drivers: Record<string, { title: string; avgScore: number | null; usersWithData: number }>;
}

interface CategoryMonthRow {
  id: string;
  platformKey: string;
  orgName: string;
  tId: string;
  month: number;
  year: number;
  userCount: number;
  categories: Record<
    string,
    {
      title: string;
      polarity: "negative" | "positive";
      avgScore: number | null;
      usersWithData: number;
      usersAtOrAboveThreshold: number;
      pctAtOrAboveThreshold: number | null;
      suppressed: boolean;
    }
  >;
}

type AnalyticsStatus = "pending" | "processing" | "complete" | "failed";

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

interface OrganizationAnalyticsRecord {
  tId: string;
  periodType: "summary" | "week" | "month";
  status: AnalyticsStatus;
}

interface OrganizationAnalyticsTenantResult {
  tId: string;
  records: OrganizationAnalyticsRecord[];
  summaryRow: OrganizationAnalyticsSummaryRow | null;
}

interface OrganizationAnalyticsResponse {
  reportBatchId?: string;
  triggered?: boolean;
  selectedWeek?: number;
  weeks?: number[];
  months?: number[];
  records: OrganizationAnalyticsRecord[];
  summaryRow: OrganizationAnalyticsSummaryRow | null;
  results?: OrganizationAnalyticsTenantResult[];
}

interface OrgSummaryResult {
  orgId: string;
  orgName: string;
  tId: string;
  summaryRow: OrganizationAnalyticsSummaryRow | null;
  status: string;
}

/** Exact same Current Summary columns as Org Analytics. */
const SUMMARY_COLUMNS: Array<{ key: string; label: string; group: "meta" | "core" | "derived" }> = [
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
];

const SUMMARY_PERCENT_KEYS = new Set(["activePercent", "repeatPercent"]);

const summaryHeaderClass = (group: string) => {
  if (group === "meta") return "bg-gray-100 text-gray-800";
  if (group === "core") return "bg-emerald-100 text-emerald-900";
  return "bg-sky-100 text-sky-900";
};

const getIsoWeek = (date: Date) => {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

const getCurrentIsoWeek = () => getIsoWeek(new Date());

/** ISO weeks that overlap the selected calendar months (completed weeks only for current year). */
const isoWeeksForMonths = (year: number, months: number[]): number[] => {
  const weeks = new Set<number>();
  const thisYear = new Date().getFullYear();
  const maxWeek = year < thisYear ? 53 : year > thisYear ? 0 : Math.max(0, getCurrentIsoWeek() - 1);
  for (const month of months) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const week = getIsoWeek(d);
      if (week >= 1 && week <= maxWeek) weeks.add(week);
    }
  }
  return [...weeks].sort((a, b) => a - b);
};

const formatOrgNumber = (value?: number | null) =>
  value == null || Number.isNaN(Number(value)) ? "—" : Number(value).toLocaleString();

const formatOrgPercent = (value?: number | null) =>
  value == null || Number.isNaN(Number(value)) ? "—" : `${Math.trunc(Number(value))}%`;

const statusClass = (status: string) => {
  switch (status) {
    case "complete":
      return "bg-green-100 text-green-800";
    case "generating":
    case "processing":
    case "pending":
      return "bg-[#1f00a3]/10 text-[#1f00a3]";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const renderStatusBadge = (status?: string | null) => {
  const label = status || "—";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(label)}`}
    >
      {(label === "generating" || label === "processing" || label === "pending") && (
        <Loader size="sm" variant="primary" inline />
      )}
      {label}
    </span>
  );
};

const CATEGORY_ORDER = ["burnoutRisk", "stress", "belonging", "energy"] as const;

const CATEGORY_TITLES: Record<(typeof CATEGORY_ORDER)[number], string> = {
  burnoutRisk: "Burnout Risk",
  stress: "Stress",
  belonging: "Belonging",
  energy: "Energy",
};

const DRIVER_ORDER = [
  "workPressure",
  "burnoutRisk",
  "lonelinessRisk",
  "stressAnxietyRisk",
  "irritabilityRisk",
  "psychologicalSafety",
  "goodRelationships",
  "positivity",
  "goodMotivation",
  "recovery",
] as const;

const DRIVER_TITLES: Record<(typeof DRIVER_ORDER)[number], string> = {
  workPressure: "Work Pressure",
  burnoutRisk: "Burnout Risk",
  lonelinessRisk: "Loneliness Risk",
  stressAnxietyRisk: "Stress & Anxiety",
  irritabilityRisk: "Irritability",
  psychologicalSafety: "Psychological Safety",
  goodRelationships: "Good Relationships",
  positivity: "Positivity",
  goodMotivation: "Good Motivation",
  recovery: "Recovery",
};

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

const formatCount = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return "—";
  return String(Math.round(Number(value)));
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

const COLUMN_INFO: Record<string, string> = {
  wellbeingIndex:
    "Average of available scores among Brew, Gratitude, and Mindful Minute value. Brew/Gratitude = mean of non-null values. Mindful Minute value = (yes×8 + no×3 + maybe×5.5) ÷ (yes+no+maybe). Only present scores are averaged.",
  mm: "Mindful Minute value = mean of (yes×8 + no×3 + maybe×5.5) ÷ (yes+no+maybe) for rows with yes/no/maybe answers that month.",
  effectiveness:
    "Effectiveness % = (count of Helpful) ÷ (Helpful + Not Helpful) × 100. From Feature_Feedback thumbs (likes / dislikes). Shown as — when there are no helpful/not-helpful responses that month.",
  orgName: "Organization name for the selected tenant.",
  tId: "Tenant identifier (tId) used to scope analytics for this organization.",
  status: "Org Analytics summary status (complete / generating / failed).",
  registeredUsers: "Registered users count from Org Analytics current summary.",
  activeUsers: "Active users from Org Analytics current summary.",
  repeatUsers: "Repeat users from Org Analytics current summary.",
  totalActivity: "Total activity from Org Analytics current summary.",
  detailedRowsCount: "Detailed rows count from Org Analytics current summary.",
  activePercent: "Active% = Active Users ÷ Registered Users × 100.",
  repeatPercent: "Repeat% (of active) = Repeat Users ÷ Active Users × 100.",
  activityPerUser: "Activity per user from Org Analytics current summary.",
};

function ColumnInfoIcon({ info }: { info: string }) {
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);

  return (
    <span className="relative ml-1 inline-flex align-middle">
      <button
        type="button"
        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-current/40 text-[9px] font-bold leading-none opacity-60 hover:opacity-100 focus:opacity-100 focus:outline-none"
        aria-label={info}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const width = 288;
          const padding = 8;
          const centerX = rect.left + rect.width / 2;
          const left = Math.min(
            Math.max(centerX, padding + width / 2),
            window.innerWidth - padding - width / 2,
          );
          setTip({ top: rect.bottom + 6, left });
        }}
        onMouseLeave={() => setTip(null)}
        onFocus={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const width = 288;
          const padding = 8;
          const centerX = rect.left + rect.width / 2;
          const left = Math.min(
            Math.max(centerX, padding + width / 2),
            window.innerWidth - padding - width / 2,
          );
          setTip({ top: rect.bottom + 6, left });
        }}
        onBlur={() => setTip(null)}
      >
        i
      </button>
      {tip && (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-[100] w-72 -translate-x-1/2 whitespace-normal break-words rounded-md bg-gray-900 px-2.5 py-1.5 text-left text-[11px] font-normal normal-case leading-snug text-white shadow-lg"
          style={{ top: tip.top, left: tip.left }}
        >
          {info}
        </span>
      )}
    </span>
  );
}

function HeaderWithInfo({ label, infoKey }: { label: string; infoKey: string }) {
  return (
    <span className="inline-flex items-center">
      {label}
      <ColumnInfoIcon info={COLUMN_INFO[infoKey] || `How ${label} is calculated.`} />
    </span>
  );
}

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
  const [driverRows, setDriverRows] = useState<DriverMonthRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<CategoryMonthRow[]>([]);
  const [orgSummaryRows, setOrgSummaryRows] = useState<OrgSummaryResult[]>([]);
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
    setDriverRows([]);
    setCategoryRows([]);
    setOrgSummaryRows([]);
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
        brew: record.brew,
        brewCount: record.brewCount,
        gratitude: record.gratitude,
        gratitudeCount: record.gratitudeCount,
        mm: record.mm,
        mmCount: record.mmCount,
        totalCount: record.totalCount,
        helpful: record.helpful,
        notHelpful: record.notHelpful,
        effectiveness:
          record.effectiveness != null
            ? record.effectiveness
            : record.helpful != null &&
                record.notHelpful != null &&
                record.helpful + record.notHelpful > 0
              ? Number(((record.helpful / (record.helpful + record.notHelpful)) * 100).toFixed(1))
              : null,
        userCount: record.userCount ?? null,
        usersWithData: record.usersWithData ?? null,
      })),
    [orgNameByTid],
  );

  const mapDriverRecords = useCallback(
    (records: EmotionalDriverAnalyticsRecord[]): DriverMonthRow[] => {
      const byKey = new Map<string, DriverMonthRow>();
      for (const record of records) {
        const id = `${record.platformKey}-${record.tId}-${record.year}-${record.month}`;
        const existing = byKey.get(id) || {
          id,
          platformKey: record.platformKey,
          orgName: orgNameByTid.get(record.tId) || record.tId,
          tId: record.tId,
          month: record.month,
          year: record.year,
          userCount: record.userCount,
          drivers: {},
        };
        existing.userCount = record.userCount;
        existing.drivers[record.driverKey] = {
          title: record.driverTitle,
          avgScore: record.avgScore,
          usersWithData: record.usersWithData,
        };
        byKey.set(id, existing);
      }
      return [...byKey.values()].sort(
        (a, b) => a.orgName.localeCompare(b.orgName) || a.month - b.month,
      );
    },
    [orgNameByTid],
  );

  const mapCategoryRecords = useCallback(
    (records: EmotionalCategoryAnalyticsRecord[]): CategoryMonthRow[] => {
      const byKey = new Map<string, CategoryMonthRow>();
      for (const record of records) {
        const id = `${record.platformKey}-${record.tId}-${record.year}-${record.month}-category`;
        const existing = byKey.get(id) || {
          id,
          platformKey: record.platformKey,
          orgName: orgNameByTid.get(record.tId) || record.tId,
          tId: record.tId,
          month: record.month,
          year: record.year,
          userCount: record.userCount,
          categories: {},
        };
        existing.userCount = record.userCount;
        existing.categories[record.categoryKey] = {
          title: record.categoryTitle,
          polarity: record.polarity,
          avgScore: record.avgScore,
          usersWithData: record.usersWithData,
          usersAtOrAboveThreshold: record.usersAtOrAboveThreshold,
          pctAtOrAboveThreshold: record.pctAtOrAboveThreshold,
          suppressed: record.suppressed,
        };
        byKey.set(id, existing);
      }
      return [...byKey.values()].sort(
        (a, b) => a.orgName.localeCompare(b.orgName) || a.month - b.month,
      );
    },
    [orgNameByTid],
  );

  const wellbeingTableTotals = useMemo(() => {
    if (!rows.length) return null;
    let wellbeingWeighted = 0;
    let wellbeingWeight = 0;
    let brewWeighted = 0;
    let brewWeight = 0;
    let gratitudeWeighted = 0;
    let gratitudeWeight = 0;
    let mmWeighted = 0;
    let mmWeight = 0;
    let brewCount = 0;
    let gratitudeCount = 0;
    let mmCount = 0;
    let totalCount = 0;
    let helpful = 0;
    let notHelpful = 0;
    for (const row of rows) {
      if (row.wellbeingIndex != null) {
        wellbeingWeighted += row.wellbeingIndex;
        wellbeingWeight += 1;
      }
      if (row.brew != null) {
        brewWeighted += row.brew;
        brewWeight += 1;
      }
      if (row.gratitude != null) {
        gratitudeWeighted += row.gratitude;
        gratitudeWeight += 1;
      }
      if (row.mm != null) {
        mmWeighted += row.mm;
        mmWeight += 1;
      }
      brewCount += row.brewCount || 0;
      gratitudeCount += row.gratitudeCount || 0;
      mmCount += row.mmCount || 0;
      totalCount += row.totalCount || 0;
      helpful += row.helpful || 0;
      notHelpful += row.notHelpful || 0;
    }
    const feedbackTotal = helpful + notHelpful;
    return {
      wellbeingIndex:
        wellbeingWeight > 0 ? Number((wellbeingWeighted / wellbeingWeight).toFixed(1)) : null,
      brew: brewWeight > 0 ? Number((brewWeighted / brewWeight).toFixed(1)) : null,
      brewCount: brewCount || null,
      gratitude:
        gratitudeWeight > 0 ? Number((gratitudeWeighted / gratitudeWeight).toFixed(1)) : null,
      gratitudeCount: gratitudeCount || null,
      mm: mmWeight > 0 ? Number((mmWeighted / mmWeight).toFixed(1)) : null,
      mmCount: mmCount || null,
      totalCount: totalCount || null,
      helpful: helpful || null,
      notHelpful: notHelpful || null,
      effectiveness:
        feedbackTotal > 0 ? Number(((helpful / feedbackTotal) * 100).toFixed(1)) : null,
    };
  }, [rows]);

  const driverTableTotals = useMemo(() => {
    if (!driverRows.length) return null;
    const drivers: Record<string, { avgScore: number | null; usersWithData: number }> = {};
    for (const key of DRIVER_ORDER) {
      let scoreWeighted = 0;
      let scoreUsers = 0;
      let usersWithData = 0;
      for (const row of driverRows) {
        const metric = row.drivers[key];
        if (!metric) continue;
        usersWithData += metric.usersWithData || 0;
        if (metric.avgScore != null && metric.usersWithData > 0) {
          scoreWeighted += metric.avgScore * metric.usersWithData;
          scoreUsers += metric.usersWithData;
        }
      }
      drivers[key] = {
        avgScore: scoreUsers > 0 ? Number((scoreWeighted / scoreUsers).toFixed(2)) : null,
        usersWithData,
      };
    }
    const orgUsersByTid = new Map<string, number>();
    for (const row of driverRows) {
      orgUsersByTid.set(row.tId, Math.max(orgUsersByTid.get(row.tId) || 0, row.userCount || 0));
    }
    let orgUsers = 0;
    for (const count of orgUsersByTid.values()) orgUsers += count;
    return { drivers, orgUsers };
  }, [driverRows]);

  const categoryTableTotals = useMemo(() => {
    if (!categoryRows.length) return null;
    const categories: Record<
      string,
      { avgScore: number | null; usersWithData: number; pctAtOrAboveThreshold: number | null }
    > = {};
    for (const key of CATEGORY_ORDER) {
      let scoreWeighted = 0;
      let scoreUsers = 0;
      let usersWithData = 0;
      let atOrAbove = 0;
      for (const row of categoryRows) {
        const metric = row.categories[key];
        if (!metric) continue;
        usersWithData += metric.usersWithData || 0;
        atOrAbove += metric.usersAtOrAboveThreshold || 0;
        if (metric.avgScore != null && metric.usersWithData > 0) {
          scoreWeighted += metric.avgScore * metric.usersWithData;
          scoreUsers += metric.usersWithData;
        }
      }
      categories[key] = {
        avgScore: scoreUsers > 0 ? Number((scoreWeighted / scoreUsers).toFixed(2)) : null,
        usersWithData,
        pctAtOrAboveThreshold:
          usersWithData >= 25 ? Number(((atOrAbove / usersWithData) * 100).toFixed(1)) : null,
      };
    }
    const orgUsersByTid = new Map<string, number>();
    for (const row of categoryRows) {
      orgUsersByTid.set(row.tId, Math.max(orgUsersByTid.get(row.tId) || 0, row.userCount || 0));
    }
    let orgUsers = 0;
    for (const count of orgUsersByTid.values()) orgUsers += count;
    return { categories, orgUsers };
  }, [categoryRows]);

  const summaryTotalsRow = useMemo(() => {
    if (!orgSummaryRows.length) return null;

    let registeredUsers = 0;
    let activeUsers = 0;
    let repeatUsers = 0;
    let totalActivity = 0;
    let detailedRowsCount = 0;

    for (const row of orgSummaryRows) {
      const summary = row.summaryRow;
      if (!summary) continue;
      registeredUsers += summary.registeredUsers ?? 0;
      activeUsers += summary.activeUsers ?? 0;
      repeatUsers += summary.repeatUsers ?? 0;
      totalActivity += summary.totalActivity ?? 0;
      detailedRowsCount += summary.detailedRowsCount ?? 0;
    }

    return {
      orgName: "Total",
      tId: "—",
      status: "—",
      registeredUsers,
      activeUsers,
      repeatUsers,
      totalActivity,
      detailedRowsCount,
      activePercent: registeredUsers > 0 ? Math.trunc((activeUsers / registeredUsers) * 100) : 0,
      repeatPercent: activeUsers > 0 ? Math.trunc((repeatUsers / activeUsers) * 100) : 0,
      activityPerUser:
        repeatUsers > 0 ? Number(((totalActivity - activeUsers) / repeatUsers).toFixed(2)) : 0,
    } as Record<string, string | number | null>;
  }, [orgSummaryRows]);

  const orgSummaryCellValue = (row: OrgSummaryResult, key: string): string | number | null => {
    if (key === "orgName") return row.orgName;
    if (key === "tId") return row.tId;
    if (key === "status") return row.status;
    const value = row.summaryRow?.[key];
    if (value == null || typeof value === "object") return null;
    return value as string | number;
  };

  const formatOrgSummaryCell = (key: string, value: string | number | null) => {
    if (key === "status" && typeof value === "string") return value;
    if (value == null || value === "") return "—";
    if (typeof value === "string") return value;
    if (SUMMARY_PERCENT_KEYS.has(key)) return formatOrgPercent(value);
    if (key === "activityPerUser") return Number(value).toFixed(2);
    return formatOrgNumber(value);
  };

  const handleLoad = useCallback(async () => {
    setError("");
    if (!platform || selectedOrgs.length === 0 || !year || months.length === 0) {
      setError("Select platform, one or more tenants, year, and at least one month");
      return;
    }

    const requestId = ++requestRef.current;
    setLoading(true);
    setRows([]);
    setDriverRows([]);
    setCategoryRows([]);
    setOrgSummaryRows([]);
    setHasLoaded(true);

    const batches = chunk(selectedOrgs, TENANT_BATCH_SIZE);
    const allRecords: WellbeingAnalyticsRecord[] = [];
    const allDriverRecords: EmotionalDriverAnalyticsRecord[] = [];
    const allCategoryRecords: EmotionalCategoryAnalyticsRecord[] = [];
    const allOrgSummary: OrgSummaryResult[] = [];
    const selectedMonths = months.map(Number).sort((a, b) => a - b);
    const selectedWeeks = isoWeeksForMonths(Number(year) || currentYear, selectedMonths);
    let completedTenants = 0;

    try {
      for (let i = 0; i < batches.length; i++) {
        if (requestId !== requestRef.current) return;

        if (batches.length > 1) {
          setTenantBatchProgress({ current: i + 1, total: batches.length });
        }

        const batch = batches[i];
        const tIds = batch.map((org) => org.tId);
        const yearNum = Number(year) || currentYear;
        const payloadBase = {
          platformKey: platform,
          tIds,
          year: yearNum,
          months: selectedMonths,
        };

        const requests: [
          Promise<WellbeingAnalyticsResponse>,
          Promise<EmotionalDriverAnalyticsResponse>,
          Promise<OrganizationAnalyticsResponse | null>,
        ] = [
          post<WellbeingAnalyticsResponse>("/admin/wellbeing-analytics", {
            ...payloadBase,
            viewMode: "organization",
          }),
          post<EmotionalDriverAnalyticsResponse>("/admin/emotional-drivers-analytics", payloadBase),
          selectedWeeks.length
            ? post<OrganizationAnalyticsResponse>("/admin/organization-analytics", {
                platformKey: platform,
                tIds,
                year: yearNum,
                weeks: selectedWeeks,
                includeSummary: true,
                trigger: false,
              }).catch((err) => {
                console.error("Org analytics summary fetch failed:", err);
                return null;
              })
            : Promise.resolve(null),
        ];

        const [wellbeingResponse, driversResponse, orgAnalyticsResponse] =
          await Promise.all(requests);

        allRecords.push(...(wellbeingResponse?.records || []));
        allDriverRecords.push(...(driversResponse?.records || []));
        allCategoryRecords.push(...(driversResponse?.categoryRecords || []));

        if (orgAnalyticsResponse) {
          const byTid = new Map(
            (orgAnalyticsResponse.results || []).map((result) => [result.tId, result]),
          );
          for (const org of batch) {
            const result = byTid.get(org.tId);
            const summaryRow =
              result?.summaryRow ?? (batch.length === 1 ? orgAnalyticsResponse.summaryRow : null);
            const summaryRecord = (result?.records || orgAnalyticsResponse.records || []).find(
              (record) => record.tId === org.tId && record.periodType === "summary",
            );
            allOrgSummary.push({
              orgId: org._id,
              orgName: org.name,
              tId: org.tId,
              summaryRow,
              status: summaryRow?.status || summaryRecord?.status || "—",
            });
          }
        }

        completedTenants += batch.length;

        if (requestId !== requestRef.current) return;
        setRows(mapRecords(allRecords));
        setDriverRows(mapDriverRecords(allDriverRecords));
        setCategoryRows(mapCategoryRecords(allCategoryRecords));
        setOrgSummaryRows([...allOrgSummary].sort((a, b) => a.orgName.localeCompare(b.orgName)));
      }

      if (requestId !== requestRef.current) return;
      setHasLoaded(true);
    } catch (e) {
      if (requestId !== requestRef.current) return;
      console.error(e);
      const base = e instanceof Error ? e.message : "Failed to load wellbeing analytics";
      setError(
        allRecords.length > 0 || allDriverRecords.length > 0
          ? `${base} (${completedTenants} of ${selectedOrgs.length} tenants loaded.)`
          : base,
      );
      if (allRecords.length === 0 && allDriverRecords.length === 0) {
        setRows([]);
        setDriverRows([]);
        setCategoryRows([]);
        setOrgSummaryRows([]);
        setHasLoaded(false);
      }
    } finally {
      if (requestId === requestRef.current) {
        setTenantBatchProgress(null);
        setLoading(false);
      }
    }
  }, [platform, selectedOrgs, year, months, mapRecords, mapDriverRecords, mapCategoryRecords]);

  return (
    <Layout
      title="Client Report"
      subtitle="Organization monthly wellbeing and emotional-driver metrics"
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
              Loads organization-level wellbeing and emotional-driver metrics for the selected year
              and month(s). Wellbeing from User_Wellbeing_Data; drivers from User_Emotional_Health
              (Brew + Mindful Minute).
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
              <CardTitle>Current Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-gray-500">
                Same columns as Org Analytics. Uses cached org-analytics summary for weeks that
                overlap the selected months (generate from Org Analytics if status is empty).
              </p>
              <div className="max-h-96 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {SUMMARY_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className={`whitespace-nowrap px-3 py-2 text-left text-xs font-semibold ${summaryHeaderClass(col.group)}`}
                        >
                          <span className="inline-flex items-center">
                            {col.label}
                            <ColumnInfoIcon
                              info={
                                COLUMN_INFO[col.key] ||
                                `${col.label} from Org Analytics current summary.`
                              }
                            />
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {summaryTotalsRow && orgSummaryRows.length > 0 && (
                      <tr className="border-y-2 border-[#1f00a3]/40 bg-[#1f00a3]/12">
                        {SUMMARY_COLUMNS.map((col) => (
                          <td
                            key={`total-${col.key}`}
                            className="whitespace-nowrap px-3 py-2.5 text-left text-sm font-bold text-[#1f00a3]"
                          >
                            {col.key === "status"
                              ? "—"
                              : formatOrgSummaryCell(col.key, summaryTotalsRow[col.key] ?? null)}
                          </td>
                        ))}
                      </tr>
                    )}
                    {orgSummaryRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={SUMMARY_COLUMNS.length}
                          className="px-3 py-8 text-center text-gray-500"
                        >
                          No org-analytics summary for this selection. Generate it on Org Analytics
                          first, then reload.
                        </td>
                      </tr>
                    ) : (
                      orgSummaryRows.map((row) => (
                        <tr key={row.tId} className="hover:bg-gray-50">
                          {SUMMARY_COLUMNS.map((col) => {
                            const value = orgSummaryCellValue(row, col.key);
                            return (
                              <td
                                key={`${row.tId}-${col.key}`}
                                className="whitespace-nowrap px-3 py-2 text-left text-gray-900"
                              >
                                {col.key === "status"
                                  ? renderStatusBadge(typeof value === "string" ? value : null)
                                  : formatOrgSummaryCell(col.key, value)}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

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
                        <HeaderWithInfo label="Wellbeing Index" infoKey="wellbeingIndex" />
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Brew
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Brew Count
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Gratitude
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Gratitude Count
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        <HeaderWithInfo label="Mindful Minute value" infoKey="mm" />
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        MM Count
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Total Count
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Helpful
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Not Helpful
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        <HeaderWithInfo label="Effectiveness %" infoKey="effectiveness" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="px-3 py-8 text-center text-gray-500">
                          No rows for this selection
                        </td>
                      </tr>
                    ) : (
                      <>
                        {rows.map((row, index) => (
                          <tr
                            key={row.id}
                            className={index % 2 === 0 ? "bg-white" : "bg-gray-50/80"}
                          >
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
                              {formatMetric(row.brew)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {formatCount(row.brewCount)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {formatMetric(row.gratitude)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {formatCount(row.gratitudeCount)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {formatMetric(row.mm)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {formatCount(row.mmCount)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {formatCount(row.totalCount)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {formatCount(row.helpful)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {formatCount(row.notHelpful)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {formatPercent(row.effectiveness)}
                            </td>
                          </tr>
                        ))}
                        {wellbeingTableTotals && (
                          <tr className="sticky bottom-0 z-[5] border-y-2 border-[#1f00a3]/40 bg-[#1f00a3]/12">
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              Total
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              —
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              —
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              {formatMetric(wellbeingTableTotals.wellbeingIndex)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              {formatMetric(wellbeingTableTotals.brew)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              {formatCount(wellbeingTableTotals.brewCount)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              {formatMetric(wellbeingTableTotals.gratitude)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              {formatCount(wellbeingTableTotals.gratitudeCount)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              {formatMetric(wellbeingTableTotals.mm)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              {formatCount(wellbeingTableTotals.mmCount)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              {formatCount(wellbeingTableTotals.totalCount)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              {formatCount(wellbeingTableTotals.helpful)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              {formatCount(wellbeingTableTotals.notHelpful)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              {formatPercent(wellbeingTableTotals.effectiveness)}
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {hasLoaded && (
          <Card>
            <CardHeader>
              <CardTitle>Emotional health — organization monthly metrics (10 indicators)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[32rem]">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50">
                    <tr>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Platform
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Organization
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        tId
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Month
                      </th>
                      {DRIVER_ORDER.map((key) => (
                        <th
                          key={`${key}-score`}
                          className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700"
                          colSpan={2}
                        >
                          {DRIVER_TITLES[key]}
                        </th>
                      ))}
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Org users
                      </th>
                    </tr>
                    <tr>
                      <th className="px-3 py-1" />
                      <th className="px-3 py-1" />
                      <th className="px-3 py-1" />
                      <th className="px-3 py-1" />
                      {DRIVER_ORDER.map((key) => (
                        <Fragment key={`${key}-sub`}>
                          <th className="whitespace-nowrap px-3 py-1 text-left text-[10px] font-medium text-gray-500">
                            Avg
                          </th>
                          <th className="whitespace-nowrap px-3 py-1 text-left text-[10px] font-medium text-gray-500">
                            Users
                          </th>
                        </Fragment>
                      ))}
                      <th className="px-3 py-1" />
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {driverRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4 + DRIVER_ORDER.length * 2 + 1}
                          className="px-3 py-8 text-center text-gray-500"
                        >
                          No emotional-driver rows for this selection
                        </td>
                      </tr>
                    ) : (
                      <>
                        {driverRows.map((row, index) => (
                          <tr
                            key={row.id}
                            className={index % 2 === 0 ? "bg-white" : "bg-gray-50/80"}
                          >
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {row.platformKey}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {row.orgName}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-700">{row.tId}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {formatMonth(row.month, row.year)}
                            </td>
                            {DRIVER_ORDER.map((key) => {
                              const metric = row.drivers[key];
                              return (
                                <Fragment key={`${row.id}-${key}`}>
                                  <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                                    {metric?.avgScore == null || Number.isNaN(metric.avgScore)
                                      ? "—"
                                      : Number(metric.avgScore).toFixed(2)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                                    {formatCount(metric?.usersWithData)}
                                  </td>
                                </Fragment>
                              );
                            })}
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {formatCount(row.userCount)}
                            </td>
                          </tr>
                        ))}
                        {driverTableTotals && (
                          <tr className="sticky bottom-0 z-[5] border-y-2 border-[#1f00a3]/40 bg-[#1f00a3]/12">
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              —
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              Total
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              —
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              —
                            </td>
                            {DRIVER_ORDER.map((key) => {
                              const metric = driverTableTotals.drivers[key];
                              return (
                                <Fragment key={`total-driver-${key}`}>
                                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                                    {metric?.avgScore == null
                                      ? "—"
                                      : Number(metric.avgScore).toFixed(2)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                                    {formatCount(metric?.usersWithData)}
                                  </td>
                                </Fragment>
                              );
                            })}
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              {formatCount(driverTableTotals.orgUsers)}
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {hasLoaded && (
          <Card>
            <CardHeader>
              <CardTitle>Emotional health — category indicators (4)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-xs text-gray-500">
                Negative: Burnout Risk, Stress. Positive: Belonging, Energy. Layer 1 needs ≥2 parent
                components. % ≥7.0 hidden when assessed users &lt; 25 (Layer 2).
              </p>
              <div className="overflow-x-auto max-h-[32rem]">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50">
                    <tr>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Platform
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Organization
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        tId
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Month
                      </th>
                      {CATEGORY_ORDER.map((key) => (
                        <th
                          key={`${key}-score`}
                          className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700"
                          colSpan={3}
                        >
                          {CATEGORY_TITLES[key]}
                          <span className="ml-1 font-normal text-gray-400">
                            {key === "burnoutRisk" || key === "stress" ? "(neg)" : "(pos)"}
                          </span>
                        </th>
                      ))}
                      <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700">
                        Org users
                      </th>
                    </tr>
                    <tr>
                      <th className="px-3 py-1" />
                      <th className="px-3 py-1" />
                      <th className="px-3 py-1" />
                      <th className="px-3 py-1" />
                      {CATEGORY_ORDER.map((key) => (
                        <Fragment key={`${key}-sub`}>
                          <th className="whitespace-nowrap px-3 py-1 text-left text-[10px] font-medium text-gray-500">
                            Avg
                          </th>
                          <th className="whitespace-nowrap px-3 py-1 text-left text-[10px] font-medium text-gray-500">
                            Users
                          </th>
                          <th className="whitespace-nowrap px-3 py-1 text-left text-[10px] font-medium text-gray-500">
                            % ≥7
                          </th>
                        </Fragment>
                      ))}
                      <th className="px-3 py-1" />
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {categoryRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4 + CATEGORY_ORDER.length * 3 + 1}
                          className="px-3 py-8 text-center text-gray-500"
                        >
                          No category rows for this selection
                        </td>
                      </tr>
                    ) : (
                      <>
                        {categoryRows.map((row, index) => (
                          <tr
                            key={row.id}
                            className={index % 2 === 0 ? "bg-white" : "bg-gray-50/80"}
                          >
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {row.platformKey}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {row.orgName}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-700">{row.tId}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {formatMonth(row.month, row.year)}
                            </td>
                            {CATEGORY_ORDER.map((key) => {
                              const metric = row.categories[key];
                              return (
                                <Fragment key={`${row.id}-${key}`}>
                                  <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                                    {metric?.avgScore == null || Number.isNaN(metric.avgScore)
                                      ? "—"
                                      : Number(metric.avgScore).toFixed(2)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                                    {formatCount(metric?.usersWithData)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                                    {metric?.suppressed || metric?.pctAtOrAboveThreshold == null
                                      ? "—"
                                      : `${Number(metric.pctAtOrAboveThreshold).toFixed(1)}%`}
                                  </td>
                                </Fragment>
                              );
                            })}
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {formatCount(row.userCount)}
                            </td>
                          </tr>
                        ))}
                        {categoryTableTotals && (
                          <tr className="sticky bottom-0 z-[5] border-y-2 border-[#1f00a3]/40 bg-[#1f00a3]/12">
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              —
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              Total
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              —
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              —
                            </td>
                            {CATEGORY_ORDER.map((key) => {
                              const metric = categoryTableTotals.categories[key];
                              return (
                                <Fragment key={`total-category-${key}`}>
                                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                                    {metric?.avgScore == null
                                      ? "—"
                                      : Number(metric.avgScore).toFixed(2)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                                    {formatCount(metric?.usersWithData)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                                    {metric?.pctAtOrAboveThreshold == null
                                      ? "—"
                                      : `${Number(metric.pctAtOrAboveThreshold).toFixed(1)}%`}
                                  </td>
                                </Fragment>
                              );
                            })}
                            <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold text-[#1f00a3]">
                              {formatCount(categoryTableTotals.orgUsers)}
                            </td>
                          </tr>
                        )}
                      </>
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
