"use client";

import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  Fragment,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { Button } from "@/components/ui";

const MONTH_SHORT = [
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

export type DashboardWellbeingRow = {
  month: number;
  year: number;
  wellbeingIndex: number | null;
  helpful: number | null;
  notHelpful: number | null;
  effectiveness: number | null;
  starRating: number | null;
  starRatingCount: number | null;
};

export type DashboardCategoryRow = {
  month: number;
  year: number;
  categories: Record<
    string,
    {
      avgScore: number | null;
      pctAtOrAboveThreshold: number | null;
      usersWithData: number;
      usersAtOrAboveThreshold?: number;
    }
  >;
};

export type DashboardFeatureRow = {
  month: number;
  year: number;
  page: string;
  label: string;
  usersWithFeature: number;
  totalViews: number | null;
};

export type DashboardSummaryRow = {
  summaryRow: {
    registeredUsers: number | null;
    activeUsers: number | null;
    repeatUsers: number | null;
    [key: string]: number | string | null | undefined;
  } | null;
};

export type DashboardChatMonthlyRow = {
  year: number;
  month: number;
  type: string;
  sessionCount: number;
};

export type DashboardMauMonthRow = {
  year: number;
  month: number;
  activeUsers: number;
};

type Props = {
  year: number;
  months: number[];
  platformName: string;
  wellbeingRows: DashboardWellbeingRow[];
  categoryRows: DashboardCategoryRow[];
  featureRows: DashboardFeatureRow[];
  orgSummaryRows: DashboardSummaryRow[];
  chatMonthlyRows?: DashboardChatMonthlyRow[];
  mauMonthlyRows?: DashboardMauMonthRow[];
};

function formatMonthsTenure(year: number, months: number[]): string {
  const sorted = [...months].map(Number).sort((a, b) => a - b);
  if (!sorted.length) return String(year);
  const labels = sorted.map((m) => MONTH_SHORT[m - 1] || String(m));
  const contiguous =
    sorted.length > 1 && sorted.every((m, i) => i === 0 || m === sorted[i - 1] + 1);
  if (sorted.length === 1) return `${labels[0]} ${year}`;
  if (contiguous) return `${labels[0]} – ${labels[labels.length - 1]} ${year}`;
  return `${labels.join(", ")} ${year}`;
}

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
}

/** Inclusive lookback window ending at selected year/month (handles year wrap). */
function monthsEndingAt(
  year: number,
  month: number,
  count: number,
): Array<{ year: number; month: number; label: string; key: string }> {
  const out: Array<{ year: number; month: number; label: string; key: string }> = [];
  let y = year;
  let m = month;
  for (let i = 0; i < count; i++) {
    out.unshift({
      year: y,
      month: m,
      label: MONTH_SHORT[m - 1] || `M${m}`,
      key: `${y}-${m}`,
    });
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

/** Make Today Great + Better Week roll up as a single Top Features row. */
const MTG_FEATURE_PAGES = new Set([
  "make-today-great",
  "today-great",
  "better-week",
  "better_week",
  "bw",
]);

function normalizeFeaturePage(page: string): { page: string; label: string } {
  const key = String(page || "")
    .trim()
    .toLowerCase();
  if (MTG_FEATURE_PAGES.has(key)) {
    return { page: "mtg", label: "Make Today Great" };
  }
  if (key === "insight" || key === "insights") {
    return { page: "insight", label: "Trends" };
  }
  return { page: key || page, label: "" };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * RISKS avg score (lower is better) — opposite of Drivers:
 * ≤3.9 green, ≥4 & <7 orange, ≥7 red.
 */
function riskAvgBarColor(score: number | null): string {
  if (score == null) return "#cbd5e1";
  if (score <= 3.9) return "#16a34a";
  if (score < 7) return "#eab308";
  return "#dc2626";
}

/**
 * RISKS color from % of users with score ≥7.
 * <33.3 Caution (orange) · 33.3–66.6 Urgent (light red) · >66.6 Crisis (red).
 */
function riskPctBarColor(pctAtOrAbove7: number | null): string {
  if (pctAtOrAbove7 == null) return "#cbd5e1";
  if (pctAtOrAbove7 < 33.3) return "#eab308";
  if (pctAtOrAbove7 < 66.6) return "#f87171";
  return "#dc2626";
}

/**
 * DRIVERS avg score (higher is better):
 * ≤3.9 red, ≥4 & <7 orange, ≥7 green.
 */
function driverAvgBarColor(score: number | null): string {
  if (score == null) return "#cbd5e1";
  if (score <= 3.9) return "#dc2626";
  if (score < 7) return "#eab308";
  return "#16a34a";
}

/**
 * DRIVERS color from % of users with score ≥7.
 * <33.3 Concern (orange) · 33.3–66.6 Positive (light green) · >66.6 Excellent (dark green).
 */
function driverPctBarColor(pctAtOrAbove7: number | null): string {
  if (pctAtOrAbove7 == null) return "#cbd5e1";
  if (pctAtOrAbove7 < 33.3) return "#eab308";
  if (pctAtOrAbove7 < 66.6) return "#84cc16";
  return "#16a34a";
}

function Panel({
  label,
  children,
  className = "",
  panelRef,
  headerAction,
  exportAttr,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  panelRef?: RefObject<HTMLDivElement | null>;
  headerAction?: ReactNode;
  /** Sets data-export-{exportAttr} for PDF-only layout targeting. */
  exportAttr?: string;
}) {
  return (
    <div
      ref={panelRef}
      {...(exportAttr ? ({ [`data-export-${exportAttr}`]: "true" } as Record<string, string>) : {})}
      className={`flex min-h-0 flex-col overflow-hidden rounded-md border border-sky-300/80 bg-white shadow-sm ${className}`}
    >
      <div className="relative flex shrink-0 items-center justify-center px-3 pb-2 pt-2.5">
        <p className="text-center text-[12px] font-semibold tracking-[0.08em] text-slate-800">
          {label}
        </p>
        {headerAction ? (
          <div className="absolute right-3 top-2.5 shrink-0">{headerAction}</div>
        ) : null}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 pb-3 pt-0">{children}</div>
    </div>
  );
}

/** Polar helper: score 0–10 maps left→right across a semicircle. */
function gaugePoint(cx: number, cy: number, radius: number, score: number) {
  const t = clamp(score, 0, 10) / 10;
  const angle = Math.PI * (1 - t);
  return {
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  };
}

function gaugeArc(cx: number, cy: number, radius: number, from: number, to: number) {
  const start = gaugePoint(cx, cy, radius, from);
  const end = gaugePoint(cx, cy, radius, to);
  const large = to - from > 5 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`;
}

/** Full-scale zones: red → amber → light green (6–7) → full green (>7). */
const GAUGE_ZONES: Array<{ from: number; to: number; color: string }> = [
  { from: 0, to: 2, color: "#dc2626" },
  { from: 2, to: 4, color: "#ea580c" },
  { from: 4, to: 6, color: "#eab308" },
  { from: 6, to: 7, color: "#84cc16" },
  { from: 7, to: 10, color: "#16a34a" },
];

function SemiGauge({ value, caption }: { value: number | null; caption: string }) {
  const r = 40;
  const stroke = 9;
  const cx = 64;
  const cy = 54;
  // Stop short of the arc's inner edge (arc is centered on r with stroke width).
  const tip = value == null ? null : gaugePoint(cx, cy, r - stroke / 2 - 3, value);
  const labelR = r + stroke / 2 + 9;
  const scaleLabels = [0, 2, 4, 6, 7, 10];

  return (
    <div className="flex w-[8.5rem] shrink-0 flex-col items-center">
      <svg viewBox="0 0 128 72" className="h-[5rem] w-[8.5rem]">
        {GAUGE_ZONES.map((zone) => (
          <path
            key={`${zone.from}-${zone.to}`}
            d={gaugeArc(cx, cy, r, zone.from, zone.to)}
            fill="none"
            stroke={zone.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
          />
        ))}

        {scaleLabels.map((n) => {
          const p = gaugePoint(cx, cy, labelR, n);
          return (
            <text
              key={n}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#64748b"
              style={{ fontSize: 8.5, fontWeight: 600 }}
            >
              {n}
            </text>
          );
        })}

        {tip ? (
          <g>
            <line
              x1={cx}
              y1={cy}
              x2={tip.x}
              y2={tip.y}
              stroke="#1e293b"
              strokeWidth="2.25"
              strokeLinecap="round"
            />
            <circle cx={cx} cy={cy} r="3.75" fill="#1e293b" />
            <circle cx={cx} cy={cy} r="1.6" fill="#fff" />
          </g>
        ) : null}
      </svg>
      <p className="-mt-0.5 text-center text-xl font-bold tracking-tight text-slate-900">
        {value == null ? "—" : value.toFixed(1)}
      </p>
      <p className="text-center text-[11px] font-semibold tracking-wide text-slate-600">
        {caption}
      </p>
    </div>
  );
}

function formatTrendValue(value: number, valueDomain: "auto" | "wellbeing" = "auto"): string {
  if (valueDomain === "wellbeing") return Number(value).toFixed(1);
  return Math.round(value).toLocaleString();
}

function AreaTrend({
  points,
  valueDomain = "auto",
}: {
  points: Array<{ label: string; value: number | null }>;
  /** "wellbeing" keeps the 0–10-ish padding used by wellbeing charts. */
  valueDomain?: "auto" | "wellbeing";
}) {
  const uid = useId().replace(/:/g, "");
  const fillId = `area-fill-${uid}`;
  const w = 320;
  const h = 96;
  const padX = 14;
  const padY = 16;
  const vals = points.map((p) => p.value).filter((v): v is number => v != null);
  let min: number;
  let max: number;
  if (!vals.length) {
    min = valueDomain === "wellbeing" ? 4 : 0;
    max = valueDomain === "wellbeing" ? 8 : 1;
  } else if (valueDomain === "wellbeing") {
    min = Math.min(...vals, 4) - 0.4;
    max = Math.max(...vals, 7) + 0.4;
  } else {
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max((hi - lo) * 0.08, hi * 0.02, 1);
    min = Math.max(0, lo - pad);
    max = hi + pad;
  }
  const usableW = w - padX * 2;
  const usableH = h - padY * 2;

  const coords = points.map((p, i) => {
    const x = padX + (points.length <= 1 ? usableW / 2 : (i / (points.length - 1)) * usableW);
    const y =
      p.value == null ? null : padY + usableH - ((p.value - min) / (max - min || 1)) * usableH;
    return { ...p, x, y };
  });

  const pathPts = coords.filter((c) => c.y != null) as Array<{
    x: number;
    y: number;
    value: number;
    label: string;
  }>;
  const line =
    pathPts.length > 1
      ? pathPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
      : "";
  const area =
    pathPts.length > 1
      ? `${line} L ${pathPts[pathPts.length - 1].x} ${h - padY} L ${pathPts[0].x} ${h - padY} Z`
      : "";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-24 w-full shrink-0">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${fillId})`} />}
      {line && <path d={line} fill="none" stroke="#0ea5e9" strokeWidth="2.25" />}
      {coords.map((c, i) => (
        <g key={`${c.label}-${i}`}>
          {c.y != null && (
            <>
              <circle cx={c.x} cy={c.y} r="3" fill="#0284c7" />
              <text
                x={c.x}
                y={c.y - 9}
                textAnchor="middle"
                fill="#334155"
                style={{ fontSize: 11, fontWeight: 700 }}
              >
                {formatTrendValue(Number(c.value), valueDomain)}
              </text>
            </>
          )}
          <text
            x={c.x}
            y={h - 2}
            textAnchor="middle"
            fill="#64748b"
            style={{ fontSize: 10, fontWeight: 600 }}
          >
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

type ZoneMeterItem = {
  title: string;
  /** Average score on 0–10 scale (first bar). */
  avgScore: number | null;
  avgColor: string;
  /** % of users with score ≥7 (second bar). */
  pctAtOrAbove7: number | null;
  pctColor: string;
  /** Short metric definition shown under the bars. */
  description?: string;
};

type ZoneMeterMarker = { at: number; color: string; label?: string };

function ZoneMeterBar({
  title,
  barPct,
  color,
  valueLabel,
  markers,
  minFill = 14,
  markerEdges = "both",
}: {
  title?: string;
  barPct: number;
  color: string;
  valueLabel: string;
  markers: ZoneMeterMarker[];
  minFill?: number;
  /** Which scale ticks to draw: first row uses top, last row uses bottom. */
  markerEdges?: "top" | "bottom" | "both" | "none";
}) {
  const onFill = barPct >= 88;
  const fillWidth = Math.max(barPct, barPct > 0 ? minFill : 0);
  const showTop = markerEdges === "top" || markerEdges === "both";
  const showBottom = markerEdges === "bottom" || markerEdges === "both";
  const hasMarkerLabels = showTop && markers.some((m) => m.label);
  return (
    <div className={`relative isolate h-6 ${hasMarkerLabels ? "mt-5" : ""}`}>
      {/* Track + fill clipped to the rounded bar */}
      <div className="absolute inset-0 z-0 overflow-hidden rounded-md">
        <div className="absolute inset-0" style={{ background: "#e2e8f0" }} />
        <div
          className={`absolute inset-y-0 left-0 z-10 flex items-center transition-all ${
            title ? "min-w-[3.5rem] px-2" : ""
          }`}
          style={{
            width: `${fillWidth}%`,
            background: color,
          }}
        >
          {title ? (
            <span className="truncate text-[9px] font-bold uppercase tracking-wide text-white drop-shadow-sm">
              {title}
            </span>
          ) : null}
        </div>
      </div>
      {/* Scale ticks sit on the bar border — top on first row, bottom on last row */}
      {markers.length > 0 && markerEdges !== "none" ? (
        <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden>
          {markers.map((m) => (
            <Fragment key={`${m.at}-${m.color}`}>
              {showTop && m.label ? (
                <span
                  className="absolute bottom-full mb-2.5 -translate-x-1/2 text-[9px] font-normal tabular-nums leading-none"
                  style={{ left: `${m.at}%`, color: m.color }}
                >
                  {m.label}
                </span>
              ) : null}
              {showTop ? (
                <div
                  className="absolute bottom-full h-1.5 w-0.5 opacity-55"
                  style={{ left: `${m.at}%`, background: m.color }}
                />
              ) : null}
              {showBottom ? (
                <div
                  className="absolute top-full h-1.5 w-0.5 opacity-55"
                  style={{ left: `${m.at}%`, background: m.color }}
                />
              ) : null}
            </Fragment>
          ))}
        </div>
      ) : null}
      <span
        className={`absolute right-1.5 top-1/2 z-20 -translate-y-1/2 text-[9px] font-bold tabular-nums ${
          onFill ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]" : "text-slate-900"
        }`}
      >
        {valueLabel}
      </span>
    </div>
  );
}

/** Map avg score on a 1–10 scale onto bar width (score 1 → 0%, score 10 → 100%). */
function avgScoreBarPct(score: number): number {
  return clamp(((score - 1) / 9) * 100, 0, 100);
}

/**
 * Each metric plots two adjacent bars: avg score (1–10) | % users with >7.
 * Left markers at score 4/7 (≈33.3%/66.7%); right markers at 33.3%/66.6%.
 */
function stripMarkerLabels(markers: ZoneMeterMarker[]): ZoneMeterMarker[] {
  return markers.map(({ at, color }) => ({ at, color }));
}

function ZoneMeterGroup({
  items,
  markers,
  zones,
  avgMarkers = [],
  avgZones = [],
  pctCaption = "% users with score >7",
}: {
  items: ZoneMeterItem[];
  /** Marker positions as % of the right-hand bar track (33.3 / 66.6). */
  markers: ZoneMeterMarker[];
  zones: Array<{ label: string; color: string }>;
  /** Marker positions on the average (left) bars — score 4 → ≈33.3%, score 7 → ≈66.7%. */
  avgMarkers?: ZoneMeterMarker[];
  /** Colored zone labels under the average (left) bars — same style as Caution/Urgent/etc. */
  avgZones?: Array<{ label: string; color: string }>;
  /** Caption under the right-hand (% users) bars. */
  pctCaption?: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col justify-center gap-1">
      <div className="space-y-2 py-0.5">
        {items.map((item, index) => {
          const avgPct = item.avgScore == null ? 0 : avgScoreBarPct(item.avgScore);
          const usersPct = item.pctAtOrAbove7 == null ? 0 : clamp(item.pctAtOrAbove7, 0, 100);
          const isFirst = index === 0;
          const isLast = index === items.length - 1;
          // Top ticks + numbers on first row; bottom ticks on last row; nothing between.
          const markerEdges: "top" | "bottom" | "both" | "none" =
            isFirst && isLast ? "both" : isFirst ? "top" : isLast ? "bottom" : "none";
          const rowAvgMarkers = isFirst ? avgMarkers : stripMarkerLabels(avgMarkers);
          const rowPctMarkers = isFirst ? markers : stripMarkerLabels(markers);
          return (
            <div key={item.title} className="space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <ZoneMeterBar
                  title={item.title}
                  barPct={avgPct}
                  color={item.avgColor}
                  markers={markerEdges === "none" ? [] : rowAvgMarkers}
                  markerEdges={markerEdges}
                  valueLabel={item.avgScore == null ? "—" : item.avgScore.toFixed(1)}
                  minFill={item.avgScore == null ? 0 : 28}
                />
                <ZoneMeterBar
                  barPct={usersPct}
                  color={item.pctColor}
                  markers={markerEdges === "none" ? [] : rowPctMarkers}
                  markerEdges={markerEdges}
                  valueLabel={
                    item.pctAtOrAbove7 == null ? "—" : `${Math.round(item.pctAtOrAbove7)}%`
                  }
                  minFill={item.pctAtOrAbove7 == null ? 0 : 22}
                />
              </div>
              {item.description ? (
                <p
                  className={`pt-1 text-[8px] font-medium leading-tight text-slate-500 ${
                    isLast ? "pb-0.5" : "pb-1"
                  }`}
                >
                  {item.description}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        {/* Zone scales — left avg bars (1–4 / 4–7 / 7–10) | right % users (equal thirds) */}
        <div className="grid grid-cols-2 gap-2">
          <div className="grid grid-cols-3 gap-1">
            {avgZones.map((zone) => (
              <p
                key={`avg-${zone.label}`}
                className="text-center text-[9px] font-medium leading-tight"
                style={{ color: zone.color }}
              >
                {zone.label}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {zones.map((zone) => (
              <p
                key={zone.label}
                className="text-center text-[9px] font-medium leading-tight"
                style={{ color: zone.color }}
              >
                {zone.label}
              </p>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <p className="text-center text-[10px] font-medium leading-none text-black">
            Average score
          </p>
          <p className="text-center text-[10px] font-medium leading-none text-black">
            {pctCaption}
          </p>
        </div>
      </div>
    </div>
  );
}

type DashboardChartType = "type1" | "type2";

const CHART_TYPE_OPTIONS: Array<{ value: DashboardChartType; label: string }> = [
  { value: "type1", label: "Type 1" },
  { value: "type2", label: "Type 2" },
];

export function WellbeingDashboard({
  year,
  months,
  platformName,
  wellbeingRows,
  categoryRows,
  featureRows,
  orgSummaryRows,
  chatMonthlyRows = [],
  mauMonthlyRows = [],
}: Props) {
  const dashboardExportRef = useRef<HTMLDivElement>(null);
  const [exportingDashboard, setExportingDashboard] = useState(false);
  const [chartType, setChartType] = useState<DashboardChartType>("type1");
  const showMauActivePctAndEnabled = chartType === "type1";

  const selectedMonths = useMemo(() => [...months].map(Number).sort((a, b) => a - b), [months]);

  // Dashboard always keys off a single selected month (last selected if multiple).
  const selectedMonth = selectedMonths[selectedMonths.length - 1] || null;

  const monthsTenure = useMemo(() => {
    if (selectedMonth == null) return String(year);
    return formatMonthsTenure(year, [selectedMonth]);
  }, [year, selectedMonth]);

  const wellbeingByYearMonth = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const row of wellbeingRows) {
      if (row.wellbeingIndex == null) continue;
      const key = `${row.year}-${row.month}`;
      const list = map.get(key) || [];
      list.push(row.wellbeingIndex);
      map.set(key, list);
    }
    return map;
  }, [wellbeingRows]);

  const valueFor = useCallback(
    (y: number, m: number) => avg(wellbeingByYearMonth.get(`${y}-${m}`) || []),
    [wellbeingByYearMonth],
  );

  /** 6-month chart: selected month + 5 prior months. */
  const sixMonthTrendPoints = useMemo(() => {
    if (selectedMonth == null) return [];
    return monthsEndingAt(year, selectedMonth, 6).map((slot) => ({
      label: slot.label,
      value: valueFor(slot.year, slot.month),
    }));
  }, [year, selectedMonth, valueFor]);

  /** MAU active-users trend over the same rolling 6 months. */
  const mauSixMonthTrendPoints = useMemo(() => {
    if (selectedMonth == null) return [];
    const byKey = new Map<string, number>();
    for (const row of mauMonthlyRows) {
      const key = `${row.year}-${row.month}`;
      byKey.set(key, (byKey.get(key) || 0) + (row.activeUsers || 0));
    }
    return monthsEndingAt(year, selectedMonth, 6).map((slot) => ({
      label: slot.label,
      value: byKey.has(slot.key) ? byKey.get(slot.key)! : null,
    }));
  }, [year, selectedMonth, mauMonthlyRows]);

  const latestWellbeing = selectedMonth == null ? null : valueFor(year, selectedMonth);

  const threeMonthAvg = useMemo(() => {
    if (selectedMonth == null) return null;
    const vals: number[] = [];
    for (const slot of monthsEndingAt(year, selectedMonth, 3)) {
      const a = valueFor(slot.year, slot.month);
      if (a != null) vals.push(a);
    }
    return avg(vals);
  }, [year, selectedMonth, valueFor]);

  const mau = useMemo(() => {
    let registered = 0;
    let active = 0;
    let repeat = 0;
    for (const row of orgSummaryRows) {
      registered += row.summaryRow?.registeredUsers ?? 0;
      active += row.summaryRow?.activeUsers ?? 0;
      repeat += row.summaryRow?.repeatUsers ?? 0;
    }
    const pct = registered > 0 ? Math.round((active / registered) * 100) : null;
    const repeatPct = active > 0 ? Math.round((repeat / active) * 100) : null;
    return { registered, active, repeat, pct, repeatPct };
  }, [orgSummaryRows]);

  const categoryScores = useMemo(() => {
    const pick = (key: string) => {
      const scores: number[] = [];
      let usersWithData = 0;
      let usersAtOrAbove = 0;
      let hasPct = false;
      for (const row of categoryRows) {
        if (selectedMonth != null && (row.month !== selectedMonth || row.year !== year)) continue;
        const metric = row.categories[key];
        if (!metric) continue;
        if (metric.avgScore != null) scores.push(metric.avgScore);
        const withData = metric.usersWithData || 0;
        usersWithData += withData;
        if (metric.usersAtOrAboveThreshold != null) {
          usersAtOrAbove += metric.usersAtOrAboveThreshold;
          hasPct = true;
        } else if (metric.pctAtOrAboveThreshold != null && withData > 0) {
          usersAtOrAbove += (metric.pctAtOrAboveThreshold / 100) * withData;
          hasPct = true;
        }
      }
      return {
        score: avg(scores),
        pctAtOrAbove7:
          hasPct && usersWithData > 0
            ? Number(((usersAtOrAbove / usersWithData) * 100).toFixed(1))
            : null,
      };
    };
    return {
      burnoutRisk: pick("burnoutRisk"),
      stress: pick("stress"),
      belonging: pick("belonging"),
      energy: pick("energy"),
    };
  }, [categoryRows, selectedMonth, year]);

  /** Top Features uses selected months only, capped at the most recent 6. */
  const topFeatureMonths = useMemo(() => new Set(selectedMonths.slice(-6)), [selectedMonths]);

  const topFeatures = useMemo(() => {
    // Exclude shell/session pages, dashboard/sliders, personalize (own panel), and errors.
    const EXCLUDED_TOP_FEATURE_PAGES = new Set([
      "home",
      "app-open",
      "error",
      "dashboard",
      "personalize",
    ]);
    const byPage = new Map<string, { label: string; users: number; views: number }>();
    for (const row of featureRows) {
      if (row.year !== year || !topFeatureMonths.has(row.month)) continue;
      const pageKey = String(row.page || "").toLowerCase();
      if (EXCLUDED_TOP_FEATURE_PAGES.has(pageKey) || pageKey.startsWith("error")) continue;
      const normalized = normalizeFeaturePage(row.page);
      const page = normalized.page;
      const label = normalized.label || row.label;
      const existing = byPage.get(page) || { label, users: 0, views: 0 };
      existing.users += row.usersWithFeature || 0;
      existing.views += row.totalViews || 0;
      if (normalized.label) existing.label = normalized.label;
      byPage.set(page, existing);
    }

    // Chat = total User_Chat_session sessions across the same selected months.
    let lifeCoachSessions = 0;
    for (const row of chatMonthlyRows) {
      if (row.year !== year || !topFeatureMonths.has(row.month)) continue;
      lifeCoachSessions += row.sessionCount || 0;
    }
    if (lifeCoachSessions > 0) {
      byPage.set("lifecoach-chat", {
        label: "Chat",
        users: lifeCoachSessions,
        views: 0,
      });
    }

    return [...byPage.entries()]
      .map(([page, v]) => ({ page, ...v }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 10);
  }, [featureRows, chatMonthlyRows, topFeatureMonths, year]);

  const maxFeatureUsers = Math.max(...topFeatures.map((f) => f.users), 1);
  /**
   * Feature / Personalize bar palette (light fill + dark label).
   * Swap FEATURE_BAR_PALETTE to try: "teal" | "slate" | "indigo" | "mint" | "sky"
   */
  const FEATURE_BAR_PALETTES = {
    teal: { fill: "#7eb6b5", text: "#1a3f3e" },
    slate: { fill: "#a8b4c4", text: "#243447" },
    indigo: { fill: "#a8b0e0", text: "#2a2f66" },
    mint: { fill: "#8fc9b0", text: "#1b4332" },
    sky: { fill: "#addaed", text: "#1e3a5f" },
  } as const;
  const FEATURE_BAR_PALETTE: keyof typeof FEATURE_BAR_PALETTES = "sky";
  const FEATURE_BAR_COLOR = FEATURE_BAR_PALETTES[FEATURE_BAR_PALETTE].fill;
  const FEATURE_BAR_TEXT = FEATURE_BAR_PALETTES[FEATURE_BAR_PALETTE].text;

  /** Rolling 6-month window ending at selected month (same as trend charts). */
  const sixMonthWindow = useMemo(() => {
    if (selectedMonth == null) return [] as Array<{ year: number; month: number }>;
    return monthsEndingAt(year, selectedMonth, 6);
  }, [year, selectedMonth]);

  const inSixMonthWindow = useCallback(
    (rowYear: number, rowMonth: number) =>
      sixMonthWindow.some((slot) => slot.year === rowYear && slot.month === rowMonth),
    [sixMonthWindow],
  );

  /** Effectiveness over rolling 6 months of helpful / not-helpful feedback. */
  const effectiveness = useMemo(() => {
    let helpful = 0;
    let notHelpful = 0;
    for (const row of wellbeingRows) {
      if (!inSixMonthWindow(row.year, row.month)) continue;
      helpful += row.helpful || 0;
      notHelpful += row.notHelpful || 0;
    }
    const total = helpful + notHelpful;
    return {
      helpful,
      notHelpful,
      pct: total > 0 ? Number(((helpful / total) * 100).toFixed(1)) : null,
    };
  }, [wellbeingRows, inSixMonthWindow]);

  /** Personalize adoption over rolling 6 months vs MAU active users. */
  const personalize = useMemo(() => {
    let users = 0;
    for (const row of featureRows) {
      if (!inSixMonthWindow(row.year, row.month)) continue;
      const key = String(row.page || "")
        .trim()
        .toLowerCase();
      if (key !== "personalize") continue;
      users += row.usersWithFeature || 0;
    }
    const active = mau.active;
    const rawPct = active > 0 ? (users / active) * 100 : null;
    const pct = rawPct == null ? null : Number(Math.min(rawPct, 100).toFixed(1));
    return { users, active, pct };
  }, [featureRows, inSixMonthWindow, mau.active]);

  const latestLabel = selectedMonth ? MONTH_SHORT[selectedMonth - 1] : "—";

  const handleExportDashboard = useCallback(async () => {
    const node = dashboardExportRef.current;
    if (!node || exportingDashboard) return;
    setExportingDashboard(true);

    // Exact 16:9 capture + page so the image can fill the PDF edge-to-edge
    // without stretching (same aspect ratio on both sides).
    const exportWidth = 1920;
    const exportHeight = 1080;
    const pageWmm = 338.67;
    const pageHmm = 190.5;

    const prev = {
      width: node.style.width,
      maxWidth: node.style.maxWidth,
      height: node.style.height,
      minHeight: node.style.minHeight,
      display: node.style.display,
      flexDirection: node.style.flexDirection,
      boxSizing: node.style.boxSizing,
      overflow: node.style.overflow,
      padding: node.style.padding,
    };

    try {
      node.style.width = `${exportWidth}px`;
      node.style.maxWidth = `${exportWidth}px`;
      node.style.height = `${exportHeight}px`;
      node.style.minHeight = `${exportHeight}px`;
      node.style.display = "flex";
      node.style.flexDirection = "column";
      node.style.boxSizing = "border-box";
      node.style.overflow = "hidden";
      node.style.padding = "12px";

      // PDF-only layout:
      // - MAU + Top Features bottoms align with Effectiveness (middle stack height)
      // - Highlights + Recommendations grow to fill remaining 16:9 height
      const restoreChildren: Array<{ el: HTMLElement; cssText: string }> = [];
      const remember = (el: HTMLElement) => {
        restoreChildren.push({ el, cssText: el.style.cssText });
      };

      const mainRow = node.querySelector<HTMLElement>("[data-export-main-row]");
      const midCol = node.querySelector<HTMLElement>("[data-export-mid-col]");
      const leftCol = node.querySelector<HTMLElement>("[data-export-left-col]");
      const rightCol = node.querySelector<HTMLElement>("[data-export-right-col]");
      const mauPanel = node.querySelector<HTMLElement>("[data-export-mau]");
      const featuresPanel = node.querySelector<HTMLElement>("[data-export-features]");
      const bottomRow = node.querySelector<HTMLElement>("[data-export-bottom-row]");
      const bottomPanels = Array.from(
        node.querySelectorAll<HTMLElement>("[data-export-bottom-panel]"),
      );

      if (mainRow) {
        remember(mainRow);
        mainRow.style.flex = "0 0 auto";
        mainRow.style.minHeight = "0";
        // Stretch columns so Effectiveness / Personalize bottoms can align.
        mainRow.style.alignItems = "stretch";
        // PDF widths: Wellbeing/MAU 30% | Risks/Drivers/Effectiveness 40% | Features+Personalize 30%
        // Use fr so gap doesn't push past 100% width.
        mainRow.style.display = "grid";
        mainRow.style.gridTemplateColumns = "minmax(0, 30fr) minmax(0, 40fr) minmax(0, 30fr)";
        mainRow.style.gap = "12px";
      }
      if (mauPanel) {
        remember(mauPanel);
        mauPanel.style.flex = "1 1 auto";
        mauPanel.style.minHeight = "0";
        mauPanel.style.display = "flex";
        mauPanel.style.flexDirection = "column";
      }
      if (featuresPanel) {
        remember(featuresPanel);
        featuresPanel.style.flex = "1 1 auto";
        featuresPanel.style.minHeight = "0";
        featuresPanel.style.display = "flex";
        featuresPanel.style.flexDirection = "column";
      }
      if (leftCol) {
        remember(leftCol);
        leftCol.style.display = "flex";
        leftCol.style.flexDirection = "column";
        leftCol.style.minHeight = "0";
        leftCol.style.overflow = "hidden";
        leftCol.style.width = "auto";
        leftCol.style.maxWidth = "none";
        leftCol.style.gridColumn = "1 / 2"; // override Tailwind col-span-*
      }
      if (midCol) {
        remember(midCol);
        midCol.style.display = "flex";
        midCol.style.flexDirection = "column";
        midCol.style.minHeight = "0";
        midCol.style.width = "auto";
        midCol.style.maxWidth = "none";
        midCol.style.gridColumn = "2 / 3";
      }
      if (rightCol) {
        remember(rightCol);
        rightCol.style.display = "flex";
        rightCol.style.flexDirection = "column";
        rightCol.style.minHeight = "0";
        rightCol.style.overflow = "hidden";
        rightCol.style.width = "auto";
        rightCol.style.maxWidth = "none";
        rightCol.style.gridColumn = "3 / 4";
      }
      if (bottomRow) {
        remember(bottomRow);
        bottomRow.style.flex = "1 1 auto";
        bottomRow.style.minHeight = "0";
        bottomRow.style.display = "grid";
        bottomRow.style.alignItems = "stretch";
      }
      bottomPanels.forEach((panel) => {
        remember(panel);
        panel.style.height = "100%";
        panel.style.minHeight = "0";
        panel.style.display = "flex";
        panel.style.flexDirection = "column";
      });

      try {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

        // Lock left/right columns to the middle stack height (Effectiveness bottom).
        if (midCol && leftCol && rightCol) {
          const midHeight = Math.ceil(midCol.getBoundingClientRect().height);
          if (midHeight > 0) {
            leftCol.style.height = `${midHeight}px`;
            rightCol.style.height = `${midHeight}px`;
          }
        }

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#f8fafc",
          width: exportWidth,
          height: exportHeight,
          style: {
            width: `${exportWidth}px`,
            maxWidth: `${exportWidth}px`,
            height: `${exportHeight}px`,
            transform: "scale(1)",
            transformOrigin: "top left",
          },
          filter: (el) => {
            if (!(el instanceof HTMLElement)) return true;
            return el.getAttribute("data-export-ignore") !== "true";
          },
        });

        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load export image"));
          img.src = dataUrl;
        });

        // Composite onto a true 16:9 canvas with cover scaling (no distortion).
        const canvas = document.createElement("canvas");
        canvas.width = exportWidth;
        canvas.height = exportHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create export canvas");
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, exportWidth, exportHeight);
        const coverScale = Math.max(exportWidth / img.width, exportHeight / img.height);
        const drawW = img.width * coverScale;
        const drawH = img.height * coverScale;
        ctx.drawImage(img, (exportWidth - drawW) / 2, (exportHeight - drawH) / 2, drawW, drawH);
        const coveredDataUrl = canvas.toDataURL("image/png");

        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: [pageWmm, pageHmm],
        });
        // Full-bleed: image and page share 16:9, so this fills without stretch.
        pdf.addImage(coveredDataUrl, "PNG", 0, 0, pageWmm, pageHmm);
        const stamp = new Date().toISOString().slice(0, 10);
        pdf.save(`wellbeing-dashboard-${year}-${latestLabel}-${stamp}.pdf`);
      } finally {
        restoreChildren.forEach(({ el, cssText }) => {
          el.style.cssText = cssText;
        });
      }
    } catch (e) {
      console.error("Wellbeing Dashboard export failed:", e);
    } finally {
      node.style.width = prev.width;
      node.style.maxWidth = prev.maxWidth;
      node.style.height = prev.height;
      node.style.minHeight = prev.minHeight;
      node.style.display = prev.display;
      node.style.flexDirection = prev.flexDirection;
      node.style.boxSizing = prev.boxSizing;
      node.style.overflow = prev.overflow;
      node.style.padding = prev.padding;
      setExportingDashboard(false);
    }
  }, [exportingDashboard, year, latestLabel]);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 md:p-4">
      <div className="overflow-x-auto">
        <div ref={dashboardExportRef} className="min-w-[1400px] space-y-3 bg-slate-50/80 p-3">
          <div className="relative rounded-md border border-sky-300/80 bg-gradient-to-r from-sky-50 to-white px-4 py-3 text-center">
            <p className="mb-1.5 text-sm font-semibold text-slate-800">Joye Insights</p>
            <p className="text-xs text-slate-500">{monthsTenure}</p>
            <div
              className="absolute right-3 top-3 flex items-center gap-2"
              data-export-ignore="true"
            >
              <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="font-medium">Chart</span>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as DashboardChartType)}
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-800 outline-none focus:border-sky-400"
                  title="Select dashboard chart layout"
                >
                  {CHART_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={exportingDashboard}
                onClick={handleExportDashboard}
                className="!h-8 !px-3 !text-[11px]"
                title="Export dashboard charts as 16:9 landscape PDF"
              >
                Export PDF
              </Button>
            </div>
          </div>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "minmax(0, 30fr) minmax(0, 40fr) minmax(0, 30fr)" }}
            data-export-main-row
          >
            {/* Left: Wellbeing Index + MAU (30%) */}
            <div className="flex min-w-0 flex-col gap-3" data-export-left-col>
              <Panel label="WELLBEING INDEX" className="!overflow-visible">
                <div className="relative mb-1 pr-5">
                  <div className="flex items-start justify-center gap-10">
                    <SemiGauge value={latestWellbeing} caption={latestLabel} />
                    <SemiGauge value={threeMonthAvg} caption="3-months" />
                  </div>
                  <AreaTrend points={sixMonthTrendPoints} valueDomain="wellbeing" />
                  <p className="absolute right-0 top-1/2 -translate-y-1/2 rotate-180 text-[9px] font-medium tracking-wide text-emerald-800 [writing-mode:vertical-rl]">
                    &gt;6 is good. &gt;7 is ideal.
                  </p>
                </div>
                <p className="pt-3 text-left text-[10px] font-medium leading-relaxed text-slate-500">
                  Consolidated unit of Wellbeing across Stress, Anxiety, Irritability, Motivation,
                  Relationships, Optimism and Psychological Safety
                </p>
              </Panel>

              <Panel
                label="Monthly Active Users (MAU)"
                className="flex-1 !overflow-visible"
                exportAttr="mau"
              >
                <div className="mb-2 space-y-1 text-[11px] text-slate-700">
                  <div
                    className={`grid gap-x-1 ${showMauActivePctAndEnabled ? "grid-cols-5" : "grid-cols-3"}`}
                  >
                    {(showMauActivePctAndEnabled
                      ? ["Active Users", "Active %", "Repeat Users", "Repeat %", "Enabled"]
                      : ["Active Users", "Repeat Users", "Repeat %"]
                    ).map((label) => (
                      <p
                        key={label}
                        className="text-center text-[9px] font-normal uppercase leading-tight text-slate-600"
                      >
                        {label}
                      </p>
                    ))}
                  </div>
                  <div
                    className={`grid gap-x-1 ${showMauActivePctAndEnabled ? "grid-cols-5" : "grid-cols-3"}`}
                  >
                    <p className="text-center font-bold tabular-nums">
                      {mau.active.toLocaleString()}
                    </p>
                    {showMauActivePctAndEnabled ? (
                      <p className="text-center font-bold tabular-nums">
                        {mau.pct == null ? "—" : `${mau.pct}%`}
                      </p>
                    ) : null}
                    <p className="text-center font-bold tabular-nums">
                      {mau.repeat.toLocaleString()}
                    </p>
                    <p className="text-center font-bold tabular-nums">
                      {mau.repeatPct == null ? "—" : `${mau.repeatPct}%`}
                    </p>
                    {showMauActivePctAndEnabled ? (
                      <p className="text-center font-bold tabular-nums">
                        {mau.registered.toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                </div>
                <AreaTrend points={mauSixMonthTrendPoints} />
              </Panel>
            </div>

            {/* Middle: Risks + Drivers share space evenly; Effectiveness matches Personalize height */}
            <div className="flex min-h-0 min-w-0 flex-col gap-3" data-export-mid-col>
              <Panel label="RISKS" className="flex-1">
                <ZoneMeterGroup
                  pctCaption="% of Higher Risk users (score >7)"
                  avgMarkers={[
                    { at: avgScoreBarPct(4), color: "#16a34a", label: "4" },
                    { at: avgScoreBarPct(7), color: "#dc2626", label: "7" },
                  ]}
                  avgZones={[
                    { label: "Ideal", color: "#16a34a" },
                    { label: "Cautiously Neutral", color: "#a16207" },
                    { label: "Needs Attention", color: "#dc2626" },
                  ]}
                  items={[
                    {
                      title: "Burnout Risk",
                      avgScore: categoryScores.burnoutRisk.score,
                      avgColor: riskAvgBarColor(categoryScores.burnoutRisk.score),
                      pctAtOrAbove7: categoryScores.burnoutRisk.pctAtOrAbove7,
                      pctColor: riskPctBarColor(categoryScores.burnoutRisk.pctAtOrAbove7),
                      description: "Metric of Workload, Pressure & Low Self-care",
                    },
                    {
                      title: "Stress",
                      avgScore: categoryScores.stress.score,
                      avgColor: riskAvgBarColor(categoryScores.stress.score),
                      pctAtOrAbove7: categoryScores.stress.pctAtOrAbove7,
                      pctColor: riskPctBarColor(categoryScores.stress.pctAtOrAbove7),
                      description: "Metric of Stress, Anxiety & Irritability",
                    },
                  ]}
                  markers={[
                    { at: 33.3, color: "#a16207", label: "33.3%" },
                    { at: 66.6, color: "#dc2626", label: "66.6%" },
                  ]}
                  zones={[
                    { label: "Caution", color: "#a16207" },
                    { label: "Urgent", color: "#f87171" },
                    { label: "Crisis", color: "#dc2626" },
                  ]}
                />
              </Panel>

              <Panel label="DRIVERS" className="flex-1">
                <ZoneMeterGroup
                  pctCaption="% of More Driven users (score >7)"
                  avgMarkers={[
                    { at: avgScoreBarPct(4), color: "#dc2626", label: "4" },
                    { at: avgScoreBarPct(7), color: "#16a34a", label: "7" },
                  ]}
                  avgZones={[
                    { label: "Needs Attention", color: "#dc2626" },
                    { label: "Cautiously Neutral", color: "#a16207" },
                    { label: "Ideal", color: "#16a34a" },
                  ]}
                  items={[
                    {
                      title: "Belonging",
                      avgScore: categoryScores.belonging.score,
                      avgColor: driverAvgBarColor(categoryScores.belonging.score),
                      pctAtOrAbove7: categoryScores.belonging.pctAtOrAbove7,
                      pctColor: driverPctBarColor(categoryScores.belonging.pctAtOrAbove7),
                      description:
                        "Metric of Good Relationships, Psychological Safety & Loneliness (inverse)",
                    },
                    {
                      title: "Energy",
                      avgScore: categoryScores.energy.score,
                      avgColor: driverAvgBarColor(categoryScores.energy.score),
                      pctAtOrAbove7: categoryScores.energy.pctAtOrAbove7,
                      pctColor: driverPctBarColor(categoryScores.energy.pctAtOrAbove7),
                      description: "Metric of Motivation & Positivity",
                    },
                  ]}
                  markers={[
                    { at: 33.3, color: "#a16207", label: "33.3%" },
                    { at: 66.6, color: "#16a34a", label: "66.6%" },
                  ]}
                  zones={[
                    { label: "Concern", color: "#a16207" },
                    { label: "Positive", color: "#65a30d" },
                    { label: "Excellent", color: "#16a34a" },
                  ]}
                />
              </Panel>

              <Panel
                label="Effectiveness"
                className="min-h-[6.75rem] shrink-0"
                exportAttr="effectiveness"
              >
                <div className="flex h-full flex-col justify-center space-y-2">
                  <p className="text-center text-[11px] font-semibold text-slate-800">
                    {effectiveness.pct == null ? "—" : `${effectiveness.pct}%`}
                  </p>
                  <div className="flex h-3 overflow-hidden rounded-sm bg-slate-100">
                    {effectiveness.pct != null ? (
                      <>
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${effectiveness.pct}%`,
                            background: "#16A34A",
                          }}
                          title={`Helpful: ${effectiveness.helpful.toLocaleString()}`}
                        />
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${100 - effectiveness.pct}%`,
                            background: "#f87171",
                          }}
                          title={`Not Helpful: ${effectiveness.notHelpful.toLocaleString()}`}
                        />
                      </>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm" style={{ background: "#16A34A" }} />
                      Helpful{" "}
                      <span className="font-semibold text-slate-700">
                        {effectiveness.helpful.toLocaleString()}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-sm" style={{ background: "#f87171" }} />
                      Not Helpful{" "}
                      <span className="font-semibold text-slate-700">
                        {effectiveness.notHelpful.toLocaleString()}
                      </span>
                    </span>
                  </div>
                </div>
              </Panel>
            </div>

            {/* Right: Top Features fills; Personalize same height band as Effectiveness */}
            <div className="flex min-h-0 min-w-0 flex-col gap-3" data-export-right-col>
              <Panel label="Top Features" className="flex-1" exportAttr="features">
                {topFeatures.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    No feature usage for selection
                  </p>
                ) : (
                  <div className="flex h-full flex-col justify-between gap-2">
                    {topFeatures.map((f) => {
                      // True proportional width vs top feature (no min clamp — that made post-#1 bars look identical).
                      const pct =
                        maxFeatureUsers > 0 ? clamp((f.users / maxFeatureUsers) * 100, 0, 100) : 0;
                      return (
                        <div
                          key={f.page}
                          className="relative h-7 overflow-hidden rounded-md"
                          style={{ background: "#e2e8f0" }}
                        >
                          <div
                            className="absolute inset-y-0 left-0 transition-all"
                            style={{
                              width: `${pct}%`,
                              background: FEATURE_BAR_COLOR,
                            }}
                          />
                          <span
                            className="absolute left-2.5 top-1/2 z-10 max-w-[55%] -translate-y-1/2 truncate text-[11px] font-semibold"
                            style={{ color: FEATURE_BAR_TEXT }}
                            title={f.label}
                          >
                            {f.label}
                          </span>
                          <span
                            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 text-[11px] font-bold tabular-nums"
                            style={{ color: FEATURE_BAR_TEXT }}
                          >
                            {f.users.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>

              <Panel
                label="Personalize"
                className="min-h-[6.75rem] shrink-0"
                exportAttr="personalize"
              >
                <div className="flex h-full flex-col justify-center space-y-1.5">
                  <div
                    className="relative h-7 overflow-hidden rounded-md"
                    style={{ background: "#e2e8f0" }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 transition-all"
                      style={{
                        width: `${Math.max(
                          personalize.pct == null ? 0 : clamp(personalize.pct, 0, 100),
                          personalize.pct == null ? 0 : 18,
                        )}%`,
                        background: FEATURE_BAR_COLOR,
                      }}
                    />
                    <span
                      className="absolute left-2.5 top-1/2 z-10 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold uppercase tracking-wide"
                      style={{ color: FEATURE_BAR_TEXT }}
                    >
                      Personalize
                    </span>
                    <span
                      className="absolute right-2 top-1/2 z-20 -translate-y-1/2 text-[11px] font-bold tabular-nums"
                      style={{ color: FEATURE_BAR_TEXT }}
                    >
                      {personalize.pct == null
                        ? "—"
                        : `${personalize.pct}% · ${personalize.users.toLocaleString()}`}
                    </span>
                  </div>
                  <p className="text-right text-[10px] text-slate-500">% of users - no. of users</p>
                </div>
              </Panel>
            </div>
          </div>

          {/* Bottom row: Highlights + Recommendations */}
          <div className="grid grid-cols-2 gap-3" data-export-bottom-row>
            <Panel label="Highlights" className="min-h-[7rem]" exportAttr="bottom-panel">
              <p className="py-8 text-center text-xs text-slate-400">Highlights coming soon</p>
            </Panel>
            <Panel label="Recommendations" className="min-h-[7rem]" exportAttr="bottom-panel">
              <p className="py-8 text-center text-xs text-slate-400">Recommendations coming soon</p>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
