import type ExcelJS from "exceljs";

export type EmotionalHealthDriverExportRow = {
  platformKey: string;
  orgName: string;
  tId: string;
  monthLabel: string;
  userCount: number;
  drivers: Record<string, { avgScore: number | null; usersWithData: number }>;
};

export type EmotionalHealthCategoryExportRow = {
  platformKey: string;
  orgName: string;
  tId: string;
  monthLabel: string;
  userCount: number;
  categories: Record<
    string,
    {
      avgScore: number | null;
      usersWithData: number;
      pctAtOrAboveThreshold: number | null;
    }
  >;
};

export type EmotionalHealthExcelInput = {
  fileName: string;
  driverKeys: readonly string[];
  driverTitles: Record<string, string>;
  driverRows: EmotionalHealthDriverExportRow[];
  driverTotals: {
    orgUsers: number;
    drivers: Record<string, { avgScore: number | null; usersWithData: number }>;
  } | null;
  categoryKeys: readonly string[];
  categoryTitles: Record<string, string>;
  categoryRows: EmotionalHealthCategoryExportRow[];
  categoryTotals: {
    orgUsers: number;
    categories: Record<
      string,
      {
        avgScore: number | null;
        usersWithData: number;
        pctAtOrAboveThreshold: number | null;
      }
    >;
  } | null;
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

function cellNum(value: number | null | undefined): number | string {
  if (value == null || Number.isNaN(value)) return "—";
  return value;
}

function writeDriversSheet(workbook: ExcelJS.Workbook, input: EmotionalHealthExcelInput): void {
  const sheet = workbook.addWorksheet("10 Indicators");
  const headers = [
    "Platform",
    "Organization",
    "tId",
    "Month",
    ...input.driverKeys.flatMap((key) => [
      `${input.driverTitles[key] || key} Avg`,
      `${input.driverTitles[key] || key} Users`,
    ]),
    "Org users",
  ];
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

  if (input.driverTotals) {
    const totalValues: Array<string | number> = ["—", "Total", "—", "—"];
    for (const key of input.driverKeys) {
      const metric = input.driverTotals.drivers[key];
      totalValues.push(cellNum(metric?.avgScore));
      totalValues.push(cellNum(metric?.usersWithData));
    }
    totalValues.push(cellNum(input.driverTotals.orgUsers));
    const totalRow = sheet.addRow(totalValues);
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

  for (const row of input.driverRows) {
    const values: Array<string | number> = [row.platformKey, row.orgName, row.tId, row.monthLabel];
    for (const key of input.driverKeys) {
      const metric = row.drivers[key];
      values.push(cellNum(metric?.avgScore));
      values.push(cellNum(metric?.usersWithData));
    }
    values.push(cellNum(row.userCount));
    const excelRow = sheet.addRow(values);
    excelRow.eachCell((cell) => {
      cell.border = THIN_BORDER;
    });
  }

  autoFit(sheet, headers.length);
}

function writeCategoriesSheet(workbook: ExcelJS.Workbook, input: EmotionalHealthExcelInput): void {
  const sheet = workbook.addWorksheet("4 Indicators");
  const headers = [
    "Platform",
    "Organization",
    "tId",
    "Month",
    ...input.categoryKeys.flatMap((key) => [
      `${input.categoryTitles[key] || key} Avg`,
      `${input.categoryTitles[key] || key} Users`,
      `${input.categoryTitles[key] || key} % ≥7`,
    ]),
    "Org users",
  ];
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

  if (input.categoryTotals) {
    const totalValues: Array<string | number> = ["—", "Total", "—", "—"];
    for (const key of input.categoryKeys) {
      const metric = input.categoryTotals.categories[key];
      totalValues.push(cellNum(metric?.avgScore));
      totalValues.push(cellNum(metric?.usersWithData));
      totalValues.push(cellNum(metric?.pctAtOrAboveThreshold));
    }
    totalValues.push(cellNum(input.categoryTotals.orgUsers));
    const totalRow = sheet.addRow(totalValues);
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

  for (const row of input.categoryRows) {
    const values: Array<string | number> = [row.platformKey, row.orgName, row.tId, row.monthLabel];
    for (const key of input.categoryKeys) {
      const metric = row.categories[key];
      values.push(cellNum(metric?.avgScore));
      values.push(cellNum(metric?.usersWithData));
      values.push(cellNum(metric?.pctAtOrAboveThreshold));
    }
    values.push(cellNum(row.userCount));
    const excelRow = sheet.addRow(values);
    excelRow.eachCell((cell) => {
      cell.border = THIN_BORDER;
    });
  }

  autoFit(sheet, headers.length);
}

/** Build a 2-sheet workbook (10 Indicators / 4 Indicators) and download. */
export async function downloadEmotionalHealthExcel(
  input: EmotionalHealthExcelInput,
): Promise<void> {
  const ExcelJSMod = await import("exceljs");
  const workbook = new ExcelJSMod.Workbook();
  workbook.creator = "Joye Admin";
  workbook.created = new Date();

  writeDriversSheet(workbook, input);
  writeCategoriesSheet(workbook, input);

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
