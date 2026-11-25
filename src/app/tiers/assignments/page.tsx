"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Layout } from "@/components/layout";
import {
  Alert,
  Card,
  CardContent,
  FloatingAlerts,
  LevelFilter,
  Loader,
  SearchableSelect,
} from "@/components/ui";
import type { AssignmentLevel } from "@/components/ui";
import { ROUTES } from "@/constants";
import { get } from "@/helpers/api";
import { useAppSelector } from "@/store";
import { formatIstDate, DEFAULT_TIME_ZONE } from "@/utils/istDate";

type Assignment = {
  id: string;
  kind: "plan" | "addon" | "trial_grant" | "trial_policy";
  platformKey: string;
  platformName: string;
  tId: string;
  tenantName: string;
  userId: string;
  userName: string;
  scope: string;
  tierKey: string;
  tierName: string;
  tierKeys: string[];
  postTrialTierKeys: string[];
  status: string;
  startsAt: number | null;
  endsAt: number | null;
  source: string;
  startsOn: string;
  durationDays: number | null;
  inForce: boolean;
  expiringSoon: boolean;
  expired: boolean;
  daysLeft: number | null;
};

type AssignmentsResponse = {
  expiringSoonDays: number;
  trialExpiringSoonDays?: number;
  timeZone?: string;
  assignments: Assignment[];
};

const KIND_LABEL: Record<Assignment["kind"], string> = {
  plan: "Plan",
  addon: "Add-on",
  trial_grant: "Trial grant",
  trial_policy: "Trial policy",
};

function formatWhen(value: number | null, timeZone: string) {
  return formatIstDate(value, timeZone);
}

function assignedTo(row: Assignment) {
  if (row.userName) return row.userName;
  if (row.tenantName) return row.tenantName;
  return row.platformName;
}

function manageHref(row: Assignment) {
  const params = new URLSearchParams({ platformKey: row.platformKey });
  if (row.tId) params.set("tId", row.tId);
  if (row.tId && row.userId) params.set("userId", row.userId);
  return `${ROUTES.TIERS}?${params.toString()}`;
}

export default function TierAssignmentsPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [rows, setRows] = useState<Assignment[]>([]);
  const [soonDays, setSoonDays] = useState(15);
  const [trialSoonDays, setTrialSoonDays] = useState(3);
  const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
  const [tierKey, setTierKey] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("active");
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [level, setLevel] = useState<AssignmentLevel>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) router.replace(ROUTES.LOGIN);
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await get<AssignmentsResponse>("/admin/tiers/assignments");
        if (cancelled) return;
        setRows(data.assignments || []);
        setSoonDays(data.expiringSoonDays || 15);
        setTrialSoonDays(data.trialExpiringSoonDays || 3);
        if (data.timeZone) setTimeZone(data.timeZone);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load assignments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const tierOptions = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((row) => {
      row.tierKeys.forEach((key, index) => {
        if (!seen.has(key)) {
          const name =
            row.kind === "trial_policy" ? row.tierName.split(", ")[index] || key : row.tierName;
          seen.set(key, name || key);
        }
      });
      row.postTrialTierKeys.forEach((key) => {
        if (!seen.has(key)) seen.set(key, key);
      });
    });
    return [
      { value: "", label: "All tiers" },
      ...Array.from(seen.entries())
        .sort((left, right) => left[1].localeCompare(right[1]))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [rows]);

  const matches = (row: Assignment, includeExpiring: boolean) => {
    if (level !== "all" && row.scope !== level) return false;
    if (status !== "all" && row.status !== status) return false;
    if (includeExpiring && expiringOnly && !row.expiringSoon) return false;
    if (kind === "entitlement" && (row.kind === "trial_policy" || row.kind === "trial_grant"))
      return false;
    if (kind === "trial" && row.kind !== "trial_policy" && row.kind !== "trial_grant") return false;
    if (!tierKey) return true;
    return row.tierKeys.includes(tierKey) || row.postTrialTierKeys.includes(tierKey);
  };

  const visible = useMemo(
    () => rows.filter((row) => matches(row, true)),
    [rows, tierKey, kind, status, expiringOnly, level],
  );

  const expiringCount = rows.filter((row) => row.expiringSoon && matches(row, false)).length;

  return (
    <Layout
      title="Assignments"
      subtitle={`Plans, add-ons, and trials, and who they belong to. Expiring soon means a plan or add-on ends within ${soonDays} days, and a trial ends within ${trialSoonDays} days.`}
      actions={
        <Link
          href={ROUTES.TIERS}
          className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-[#1f00a3] hover:underline"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.61l2.72 2.72a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 1.06L5.61 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
          Back to tiers
        </Link>
      }
    >
      <div className="space-y-4">
        {error && (
          <FloatingAlerts>
            <Alert variant="error" dismissible className="shadow-lg" onDismiss={() => setError("")}>
              {error}
            </Alert>
          </FloatingAlerts>
        )}

        <Card>
          <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
            <SearchableSelect
              label="Tier"
              value={tierKey}
              onChange={setTierKey}
              options={tierOptions}
              placeholder="All tiers"
            />
            <SearchableSelect
              label="Type"
              value={kind}
              onChange={setKind}
              options={[
                { value: "", label: "Plans, add-ons, and trials" },
                { value: "entitlement", label: "Plans and add-ons" },
                { value: "trial", label: "Trials" },
              ]}
              placeholder="Plans, add-ons, and trials"
            />
            <SearchableSelect
              label="Status"
              value={status}
              onChange={(value) => setStatus(value || "all")}
              options={[
                { value: "active", label: "Active" },
                { value: "cancelled", label: "Cancelled" },
                { value: "inactive", label: "Inactive" },
                { value: "all", label: "All statuses" },
              ]}
              placeholder="All statuses"
            />
            <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={expiringOnly}
                onChange={(event) => setExpiringOnly(event.target.checked)}
              />
              Expiring soon ({expiringCount})
            </label>
            <div className="md:col-span-2 xl:col-span-4">
              <LevelFilter value={level} onChange={setLevel} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader />
              </div>
            ) : visible.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500">
                No assignments match these filters.
              </p>
            ) : (
              <div className="max-h-[min(32rem,calc(100vh-16rem))] overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 shadow-[0_1px_0_0_rgb(229,231,235)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Assigned to</th>
                      <th className="px-4 py-3 font-medium">Level</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Tier</th>
                      <th className="px-4 py-3 font-medium">Starts</th>
                      <th className="px-4 py-3 font-medium">Ends</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visible.map((row) => (
                      <tr
                        key={`${row.kind}-${row.id}`}
                        className={`${
                          row.scope === "user"
                            ? "bg-emerald-50"
                            : row.scope === "tenant"
                              ? "bg-sky-50"
                              : "bg-violet-50"
                        }${row.expiringSoon ? " shadow-[inset_3px_0_0_0_#d97706]" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{assignedTo(row)}</div>
                          <div className="text-xs text-gray-500">
                            {row.platformName}
                            {row.tenantName && row.userName ? ` · ${row.tenantName}` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize text-gray-700">{row.scope}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {KIND_LABEL[row.kind] || row.kind}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          <div>{row.tierName}</div>
                          {row.kind === "trial_policy" && (
                            <div className="text-xs text-gray-500">
                              {row.durationDays} days, starts on {row.startsOn.replaceAll("_", " ")}
                              {row.postTrialTierKeys.length
                                ? `. Then ${row.postTrialTierKeys.join(", ")}`
                                : ""}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.startsAt ? formatWhen(row.startsAt, timeZone) : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {row.endsAt
                            ? formatWhen(row.endsAt, timeZone)
                            : row.kind === "trial_policy"
                              ? "—"
                              : "Open"}
                          {row.expiringSoon && row.daysLeft !== null && (
                            <div className="text-xs font-medium text-amber-800">
                              {row.daysLeft <= 0
                                ? "Ends today"
                                : `${row.daysLeft} day${row.daysLeft === 1 ? "" : "s"} left`}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.expiringSoon && (
                            <span className="mr-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                              Expiring soon
                            </span>
                          )}
                          {row.expired && (
                            <span className="mr-2 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                              Ended
                            </span>
                          )}
                          <span className="text-gray-700">
                            {row.inForce
                              ? "In force"
                              : row.status === "cancelled"
                                ? "Cancelled"
                                : row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={manageHref(row)}
                            className="text-sm font-medium text-[#1f00a3] hover:underline"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
