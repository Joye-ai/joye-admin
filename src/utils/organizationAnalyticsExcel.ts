import type ExcelJS from "exceljs";

export type OrgAnalyticsColumnGroup = "meta" | "core" | "derived" | "week" | "month";

export type OrgAnalyticsExportColumn = {
  key: string;
  label: string;
  group: OrgAnalyticsColumnGroup | string;
};

export type OrgAnalyticsSummaryExportRow = Record<string, string | number | null | undefined>;

export type OrgAnalyticsPeriodExportRow = {
  orgName: string;
  tId: string;
  period: number | null;
  status: string;
  registeredUsers?: number | null;
  activeUsers?: number | null;
  repeatUsers?: number | null;
  totalActivity?: number | null;
};

const PERCENT_KEYS = new Set(["activePercent", "repeatPercent"]);

/** Match UI header groups (Tailwind → Excel ARGB). */
const HEADER_FILL: Record<string, string> = {
  meta: "FFF3F4F6", // gray-100
  core: "FFD1FAE5", // emerald-100
  derived: "FFE0F2FE", // sky-100
  week: "FFFEF3C7", // amber-100
  month: "FFEDE9FE", // violet-100
};

const HEADER_FONT: Record<string, string> = {
  meta: "FF1F2937", // gray-800
  core: "FF064E3B", // emerald-900
  derived: "FF0C4A6E", // sky-900
  week: "FF78350F", // amber-900
  month: "FF4C1D95", // violet-900
};

const BRAND = "FF1F00A3";
const TOTAL_FILL = "FFE8E0F7"; // ~#1f00a3 @ 12%
const ZEBRA_FILL = "FFF5F3FF";
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFE5E7EB" } },
  left: { style: "thin", color: { argb: "FFE5E7EB" } },
  bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
  right: { style: "thin", color: { argb: "FFE5E7EB" } },
};

const TOTAL_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "medium", color: { argb: "FFB8A8E8" } },
  left: { style: "thin", color: { argb: "FFB8A8E8" } },
  bottom: { style: "medium", color: { argb: "FFB8A8E8" } },
  right: { style: "thin", color: { argb: "FFB8A8E8" } },
};

function statusFill(status: string): { fill: string; font: string } {
  const s = status.toLowerCase();
  if (s === "complete") return { fill: "FFDCFCE7", font: "FF166534" };
  if (s === "failed") return { fill: "FFFEE2E2", font: "FF991B1B" };
  if (s === "generating" || s === "processing" || s === "pending") {
    return { fill: "FFE8E0F7", font: BRAND };
  }
  return { fill: "FFF3F4F6", font: "FF374151" };
}

function displayStatus(status: string): string {
  if (status === "processing" || status === "pending") return "generating";
  return status || "—";
}

function applyHeaderCell(cell: ExcelJS.Cell, group: string): void {
  const fill = HEADER_FILL[group] || HEADER_FILL.meta;
  const font = HEADER_FONT[group] || HEADER_FONT.meta;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  cell.font = { bold: true, color: { argb: font }, size: 11, name: "Calibri" };
  cell.border = THIN_BORDER;
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
}

function applyDataCell(
  cell: ExcelJS.Cell,
  opts?: { total?: boolean; status?: string; zebra?: boolean },
): void {
  cell.alignment = { vertical: "middle", horizontal: "left" };
  if (opts?.total) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } };
    cell.font = { bold: true, color: { argb: BRAND }, size: 11, name: "Calibri" };
    cell.border = TOTAL_BORDER;
    return;
  }
  cell.border = THIN_BORDER;
  if (opts?.status) {
    const colors = statusFill(opts.status);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.fill } };
    cell.font = { bold: true, color: { argb: colors.font }, size: 10, name: "Calibri" };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    return;
  }
  if (opts?.zebra) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA_FILL } };
  }
  cell.font = { size: 10, color: { argb: "FF111827" }, name: "Calibri" };
}

function autoFit(sheet: ExcelJS.Worksheet, columnCount: number): void {
  // Header-based widths only — scanning every cell is too slow for large tenant exports.
  for (let i = 1; i <= columnCount; i++) {
    const header = sheet.getRow(1).getCell(i).value;
    const len = header == null ? 12 : String(header).length + 4;
    sheet.getColumn(i).width = Math.min(40, Math.max(12, len));
  }
}

function writeSummarySheet(
  workbook: ExcelJS.Workbook,
  columns: OrgAnalyticsExportColumn[],
  rows: OrgAnalyticsSummaryExportRow[],
  totals: OrgAnalyticsSummaryExportRow | null,
): void {
  const sheet = workbook.addWorksheet("Summary", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const header = sheet.addRow(columns.map((c) => c.label));
  header.height = 24;
  columns.forEach((col, idx) => applyHeaderCell(header.getCell(idx + 1), col.group));

  if (totals) {
    const totalRow = sheet.addRow(
      columns.map((col) => {
        const value = totals[col.key];
        if (value == null || value === "") return "—";
        return value;
      }),
    );
    totalRow.height = 22;
    columns.forEach((col, idx) => {
      const cell = totalRow.getCell(idx + 1);
      applyDataCell(cell, { total: true });
      if (typeof totals[col.key] === "number") {
        cell.numFmt = PERCENT_KEYS.has(col.key) ? '0"%"' : "#,##0.##";
      }
    });
  }

  rows.forEach((row, rowIndex) => {
    const zebra = rowIndex % 2 === 1;
    const excelRow = sheet.addRow(
      columns.map((col) => {
        const value = row[col.key];
        if (col.key === "status" && typeof value === "string") return displayStatus(value);
        if (value == null || value === "") return "—";
        return value;
      }),
    );
    excelRow.height = 18;
    columns.forEach((col, idx) => {
      const cell = excelRow.getCell(idx + 1);
      const raw = row[col.key];
      if (col.key === "status" && typeof raw === "string") {
        applyDataCell(cell, { status: displayStatus(raw) });
      } else {
        applyDataCell(cell, { zebra });
        if (typeof raw === "number") {
          cell.numFmt = PERCENT_KEYS.has(col.key) ? '0"%"' : "#,##0.##";
        }
      }
    });
  });

  autoFit(sheet, columns.length);
}

function writePeriodSheet(
  workbook: ExcelJS.Workbook,
  name: "Week" | "Month",
  periodLabel: string,
  rows: OrgAnalyticsPeriodExportRow[],
): void {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const headers = [
    { label: "Organization", group: "meta" },
    { label: "tId", group: "meta" },
    { label: periodLabel, group: "meta" },
    { label: "Status", group: "meta" },
    { label: "Registered", group: "core" },
    { label: "Active", group: "core" },
    { label: "Repeat", group: "core" },
    { label: "Total Activity", group: "core" },
  ];

  const header = sheet.addRow(headers.map((h) => h.label));
  header.height = 24;
  headers.forEach((h, idx) => applyHeaderCell(header.getCell(idx + 1), h.group));

  rows.forEach((row, rowIndex) => {
    const zebra = rowIndex % 2 === 1;
    const status = displayStatus(row.status);
    const excelRow = sheet.addRow([
      row.orgName || "—",
      row.tId || "—",
      row.period ?? "—",
      status,
      row.registeredUsers ?? "—",
      row.activeUsers ?? "—",
      row.repeatUsers ?? "—",
      row.totalActivity ?? "—",
    ]);
    excelRow.height = 18;
    for (let i = 1; i <= 8; i++) {
      const cell = excelRow.getCell(i);
      if (i === 4) applyDataCell(cell, { status });
      else applyDataCell(cell, { zebra });
      if (i >= 5 && typeof excelRow.getCell(i).value === "number") {
        cell.numFmt = "#,##0";
      }
    }
  });

  autoFit(sheet, 8);
}

export type OrganizationAnalyticsExcelInput = {
  fileName: string;
  summaryColumns: OrgAnalyticsExportColumn[];
  summaryRows: OrgAnalyticsSummaryExportRow[];
  summaryTotals: OrgAnalyticsSummaryExportRow | null;
  weekRows: OrgAnalyticsPeriodExportRow[];
  monthRows: OrgAnalyticsPeriodExportRow[];
};

/** Build a 3-sheet workbook (Summary / Week / Month) and trigger a browser download. */
export async function downloadOrganizationAnalyticsExcel(
  input: OrganizationAnalyticsExcelInput,
): Promise<void> {
  const ExcelJSMod = await import("exceljs");
  const workbook = new ExcelJSMod.Workbook();
  workbook.creator = "Joye Admin";
  workbook.created = new Date();

  writeSummarySheet(workbook, input.summaryColumns, input.summaryRows, input.summaryTotals);
  writePeriodSheet(workbook, "Week", "Week", input.weekRows);
  writePeriodSheet(workbook, "Month", "Month", input.monthRows);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = input.fileName.endsWith(".xlsx") ? input.fileName : `${input.fileName}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
