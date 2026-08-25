"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui";
import {
  downloadOrganizationAnalyticsExcel,
  type OrganizationAnalyticsExcelInput,
} from "@/utils/organizationAnalyticsExcel";

type OrgAnalyticsExportButtonProps = {
  disabled?: boolean;
  /** Build payload lazily after the spinner is painted (keeps click feedback instant). */
  getPayload: () => OrganizationAnalyticsExcelInput;
  onError?: (message: string) => void;
};

/**
 * Owns export loading state locally so toggling the spinner does not re-render
 * the large Org Analytics tables (which previously delayed feedback).
 */
export function OrgAnalyticsExportButton({
  disabled = false,
  getPayload,
  onError,
}: OrgAnalyticsExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  // Warm exceljs while results are on screen so click is not blocked by the import.
  useEffect(() => {
    void import("exceljs");
  }, []);

  const handleClick = useCallback(async () => {
    if (disabled || exporting) return;
    setExporting(true);
    // Let this small component paint the spinner before heavy Excel work.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    try {
      await downloadOrganizationAnalyticsExcel(getPayload());
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Failed to export Excel");
    } finally {
      setExporting(false);
    }
  }, [disabled, exporting, getPayload, onError]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold tracking-wide text-[#1f00a3]">Export data</span>
      <Button
        variant="primary"
        size="sm"
        className="!flex !h-9 !w-9 !min-w-9 !cursor-pointer !items-center !justify-center !border-transparent !bg-[#1f00a3] !p-0 !text-white shadow-md hover:!bg-[#16007a] focus:!ring-[#1f00a3] disabled:!cursor-wait"
        onClick={handleClick}
        disabled={disabled || exporting}
        aria-label="Export data"
        title="Export data"
      >
        {exporting ? (
          <svg
            className="h-4 w-4 shrink-0 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5L16.5 12M12 3v13.5"
            />
          </svg>
        )}
      </Button>
    </div>
  );
}
