import type ExcelJS from "exceljs";

import {
  appendEmotionalHealthSheets,
  type EmotionalHealthExcelInput,
} from "@/utils/emotionalHealthExcel";

export type WellbeingMonthlyExcelRow = {
  orgName: string;
  tId: string;
  monthLabel: string;
  wellbeingIndex: number | null;
};

export type WellbeingMonthlyExcelInput = {
  fileName: string;
  rows: WellbeingMonthlyExcelRow[];
  totals: { wellbeingIndex: number | null } | null;
  /** Optional 10 + 4 indicator sheets included in the same workbook. */
  emotionalHealth?: Omit<EmotionalHealthExcelInput, "fileName"> | null;
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
};

function autoFit(sheet: ExcelJS.Worksheet, columnCount: number): void {
  for (let i = 1; i <= columnCount; i++) {
    const col = sheet.getColumn(i);
    let max = 10;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(Math.max(max + 2, 10), 36);
  }
}

function cellNum(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return value;
}

/**
 * Org monthly export:
 * 1) Wellbeing Index (Organization, tId, Month, Wellbeing Index)
 * 2) 10 Indicators (when emotionalHealth provided)
 * 3) 4 Indicators (when emotionalHealth provided)
 */
export async function downloadWellbeingMonthlyExcel(
  input: WellbeingMonthlyExcelInput,
): Promise<void> {
  const ExcelJSMod = await import("exceljs");
  const workbook = new ExcelJSMod.Workbook();
  workbook.creator = "Joye Admin";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Wellbeing Index");
  const headers = ["Organization", "tId", "Month", "Wellbeing Index"];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: "FF1E293B" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
  headerRow.eachCell((cell) => {
    cell.border = THIN_BORDER;
  });

  if (input.totals) {
    const totalRow = sheet.addRow(["Total", "—", "—", cellNum(input.totals.wellbeingIndex)]);
    totalRow.font = { bold: true, color: { argb: "FF1F00A3" } };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8E4FF" },
    };
    totalRow.eachCell((cell) => {
      cell.border = THIN_BORDER;
    });
  }

  for (const row of input.rows) {
    const excelRow = sheet.addRow([
      row.orgName,
      row.tId,
      row.monthLabel,
      cellNum(row.wellbeingIndex),
    ]);
    excelRow.eachCell((cell) => {
      cell.border = THIN_BORDER;
    });
  }

  autoFit(sheet, headers.length);

  if (input.emotionalHealth) {
    appendEmotionalHealthSheets(workbook, {
      ...input.emotionalHealth,
      fileName: input.fileName,
    });
  }

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
