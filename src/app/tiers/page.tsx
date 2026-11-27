"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Layout } from "@/components/layout";
import {
  Alert,
  FloatingAlerts,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  LevelFilter,
  Loader,
  MultiSelect,
  SearchableSelect,
} from "@/components/ui";
import type { AssignmentLevel } from "@/components/ui";
import { ROUTES } from "@/constants";
import { get, patch, post } from "@/helpers/api";
import { useAppSelector } from "@/store";
import {
  dateInputFromIst,
  DEFAULT_TIME_ZONE,
  endOfIstDay,
  formatIstDate,
  formatIstDateTime,
  startOfIstDay,
  todayIstInput,
} from "@/utils/istDate";

type Feature = {
  key: string;
  name: string;
  kind: string;
  group: string;
  route: string;
  description: string;
  ai: boolean;
  chatAvailable: boolean;
  chatType: string;
  active: boolean;
  sort: number;
  grantedBy?: string[];
  chatOnPage?: boolean;
};

type Tier = {
  key: string;
  name: string;
  description: string;
  rank: number;
  sort: number;
  includesTierKeys: string[];
  featureKeys: string[];
  expandedTierKeys: string[];
  active: boolean;
  highlighted: boolean;
  addon?: boolean;
};

type Entitlement = {
  id: string;
  platformKey: string;
  tId: string;
  userId: string;
  tierKey: string;
  status: string;
  startsAt: number;
  endsAt: number | null;
  source: string;
  scope: "platform" | "tenant" | "user";
  inForce: boolean;
  assigneeName?: string;
};

type TrialPolicy = {
  id: string;
  platformKey: string;
  tId: string;
  durationDays: number;
  tierKeys: string[];
  postTrialTierKeys: string[];
  grantTierKeys: string[];
  startsOn: string;
  active: boolean;
};

type HistoryEvent = {
  id: string;
  tId: string;
  userId: string;
  subject: string;
  action: string;
  summary: string;
  at: number;
  scope: "platform" | "tenant" | "user";
};

type Overview = {
  catalogReady: boolean;
  timeZone?: string;
  features: Feature[];
  tiers: Tier[];
  entitlements: Entitlement[];
  history?: HistoryEvent[];
  policies: {
    platform: TrialPolicy | null;
    tenant: TrialPolicy | null;
    effective: TrialPolicy | null;
  };
  resolved: {
    blockedReason: string | null;
    usingDefault?: boolean;
    tierKeys: string[];
    features: Feature[];
    chatOnPages: string[];
  };
  context: {
    platform: { key: string; name: string; subscriptionEndDate: number | null };
    tenant: { id: string; tId: string; name: string; inactive: boolean } | null;
    user: { id: string; displayName: string; email: string; employeeId: string } | null;
  };
};

type CatalogResponse = {
  catalogReady: boolean;
  timeZone?: string;
  features: Feature[];
  tiers: Tier[];
};

type PlatformOption = { key: string; name: string };
type TenantOption = { _id: string; name: string; tId: string; inactive?: boolean };
type UserOption = { _id: string; displayName?: string; email?: string; employeeId?: string };

const SOURCES = [
  { value: "admin", label: "Admin" },
  { value: "contract", label: "Contract" },
  { value: "purchase", label: "Purchase" },
  { value: "comp", label: "Comp" },
  { value: "trial", label: "Trial" },
];

function isAddonTier(tier?: { key: string; addon?: boolean } | null) {
  return Boolean(tier?.addon) || Boolean(tier?.key.endsWith("_addon"));
}

function grantsForFilter(data: Overview, nextTenant: string, nextUser: string) {
  const now = Date.now();
  const scopes: Array<Entitlement["scope"]> = nextUser
    ? ["user", "tenant", "platform"]
    : nextTenant
      ? ["tenant", "platform"]
      : ["platform"];
  const weight = (key: string) => {
    const tier = data.tiers.find((item) => item.key === key);
    return (tier?.expandedTierKeys.length || 0) * 1000 + (tier?.rank || 0);
  };
  const addonRow = (row: Entitlement) =>
    isAddonTier(data.tiers.find((tier) => tier.key === row.tierKey) || { key: row.tierKey });
  const pick = (plans: Entitlement[]) => {
    for (const scope of scopes) {
      const matches = plans.filter((row) => row.scope === scope);
      if (!matches.length) continue;
      matches.sort(
        (left, right) =>
          weight(right.tierKey) - weight(left.tierKey) ||
          (right.startsAt || 0) - (left.startsAt || 0),
      );
      return matches[0];
    }
    return null;
  };
  const inForce = data.entitlements.filter((row) => row.inForce);
  const plans = inForce.filter((row) => scopes.includes(row.scope) && !addonRow(row));
  let plan: { tierKey: string } | null =
    pick(plans.filter((row) => row.source !== "trial")) ||
    pick(plans.filter((row) => row.source === "trial"));
  const addons = inForce.filter((row) => scopes.includes(row.scope) && addonRow(row));
  if (!plan) {
    const trialEnded = data.entitlements.some(
      (row) =>
        row.source === "trial" &&
        row.status === "active" &&
        scopes.includes(row.scope) &&
        !addonRow(row) &&
        Boolean(row.endsAt && row.endsAt > 0 && row.endsAt <= now) &&
        (!row.startsAt || row.startsAt <= now),
    );
    const afterKeys = data.policies.effective?.postTrialTierKeys || [];
    const isAfterAddon = (key: string) => {
      const tier = data.tiers.find((item) => item.key === key);
      return tier ? isAddonTier(tier) : key.endsWith("_addon");
    };
    const after = afterKeys.filter((key) => !isAfterAddon(key));
    if (trialEnded && after.length) {
      after.sort((left, right) => weight(right) - weight(left));
      plan = { tierKey: after[0] };
      afterKeys.filter(isAfterAddon).forEach((key) => {
        if (!addons.some((row) => row.tierKey === key)) {
          addons.push({ tierKey: key, status: "active" } as Entitlement);
        }
      });
    }
  }
  return { plan, addons };
}

function dateInput(value: number | null, timeZone: string) {
  return dateInputFromIst(value, timeZone);
}

const STARTS_ON = [
  { value: "created", label: "Account created" },
  { value: "first_login", label: "First login" },
  { value: "consent", label: "Consent" },
];

function todayInput(timeZone: string) {
  return todayIstInput(timeZone);
}

function formatWhen(value: number | null, timeZone: string) {
  return formatIstDate(value, timeZone);
}

function formatWhenWithTime(value: number | null, timeZone: string) {
  return formatIstDateTime(value, timeZone);
}

function userLabel(user: UserOption) {
  return user.displayName || user.email || user.employeeId || user._id;
}

function scopeSearch(platform: string, tenant: string, user: string) {
  const params = new URLSearchParams();
  if (platform) params.set("platformKey", platform);
  if (tenant) params.set("tId", tenant);
  if (tenant && user) params.set("userId", user);
  return params.toString();
}

function TiersPageContent() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [platformKey, setPlatformKey] = useState("");
  const [tId, setTId] = useState("");
  const [userId, setUserId] = useState("");

  const [features, setFeatures] = useState<Feature[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [catalogReady, setCatalogReady] = useState(true);

  const [selectedTier, setSelectedTier] = useState("");
  const [selectedAddon, setSelectedAddon] = useState("");
  const [startsOn, setStartsOn] = useState(todayInput(DEFAULT_TIME_ZONE));
  const [endsOn, setEndsOn] = useState("");
  const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
  const [source, setSource] = useState("admin");
  const [listMode, setListMode] = useState<"applies" | "exact">("exact");
  const [levelFilter, setLevelFilter] = useState<AssignmentLevel>("all");
  const [showRetired, setShowRetired] = useState(false);

  const [policyDays, setPolicyDays] = useState("30");
  const [policyTiers, setPolicyTiers] = useState<string[]>(["base", "premium_1"]);
  const [policyAfter, setPolicyAfter] = useState<string[]>(["base"]);
  const [policyStarts, setPolicyStarts] = useState("created");
  const [policyActive, setPolicyActive] = useState(true);
  const [extendDays, setExtendDays] = useState("7");
  const [pendingCancel, setPendingCancel] = useState<Entitlement | null>(null);
  const [pendingTrialCancel, setPendingTrialCancel] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTitle, setHistoryTitle] = useState("");
  const [historyMode, setHistoryMode] = useState<"scope" | "grant">("scope");
  const [historyScope, setHistoryScope] = useState<"all" | "platform" | "tenant" | "user">("all");
  const [historyRows, setHistoryRows] = useState<HistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!isAuthenticated) router.replace(ROUTES.LOGIN);
  }, [isAuthenticated, router]);

  const applyCatalog = useCallback((data: CatalogResponse) => {
    setFeatures(data.features);
    setTiers(data.tiers);
    setCatalogReady(data.catalogReady);
    if (data.timeZone) setTimeZone(data.timeZone);
  }, []);

  const loadCatalog = useCallback(async () => {
    const data = await get<CatalogResponse>("/admin/tiers/catalog");
    applyCatalog(data);
  }, [applyCatalog]);

  const loadOverview = useCallback(
    async (nextPlatform: string, nextTenant: string, nextUser: string) => {
      if (!nextPlatform) {
        setOverview(null);
        setSelectedTier("");
        setSelectedAddon("");
        setStartsOn(todayInput(timeZone));
        setEndsOn("");
        setSource("admin");
        setListMode("exact");
        setPolicyDays("30");
        setPolicyTiers(["base", "premium_1"]);
        setPolicyAfter(["base"]);
        setPolicyStarts("created");
        setPolicyActive(true);
        return;
      }
      const params: Record<string, string> = { platformKey: nextPlatform };
      if (nextTenant) params.tId = nextTenant;
      if (nextUser) params.userId = nextUser;
      const data = await get<Overview>("/admin/tiers/overview", params);
      applyCatalog(data);
      setOverview(data);
      setListMode("exact");
      const zone = data.timeZone || timeZone;
      if (data.timeZone) setTimeZone(data.timeZone);
      const exactScope = nextUser ? "user" : nextTenant ? "tenant" : "platform";
      const { plan, addons } = grantsForFilter(data, nextTenant, nextUser);
      const ownPlan = plan && plan.scope === exactScope ? plan : null;
      const ownAddons = addons.filter((row) => row.scope === exactScope);
      if (ownPlan) {
        setSelectedTier(ownPlan.tierKey);
        setStartsOn(dateInput(ownPlan.startsAt, zone) || todayInput(zone));
        setEndsOn(dateInput(ownPlan.endsAt, zone));
        setSource(SOURCES.some((item) => item.value === ownPlan.source) ? ownPlan.source : "admin");
      } else if (plan) {
        setSelectedTier("");
        setStartsOn(todayInput(zone));
        setEndsOn("");
        setSource("admin");
      } else {
        setSelectedTier(data.resolved.blockedReason ? "" : "base");
        setStartsOn(todayInput(zone));
        setEndsOn("");
        setSource("admin");
      }
      setSelectedAddon(ownAddons.length === 1 ? ownAddons[0].tierKey : "");
      const ownPolicy = nextTenant ? data.policies.tenant : data.policies.platform;
      const shownPolicy = ownPolicy || data.policies.platform;
      if (shownPolicy) {
        setPolicyDays(String(shownPolicy.durationDays));
        setPolicyTiers(shownPolicy.tierKeys);
        setPolicyAfter(shownPolicy.postTrialTierKeys);
        setPolicyStarts(shownPolicy.startsOn);
        setPolicyActive(shownPolicy.active);
      } else {
        setPolicyDays("30");
        setPolicyTiers(["base", "premium_1"]);
        setPolicyAfter(["base"]);
        setPolicyStarts("created");
        setPolicyActive(true);
      }
    },
    [applyCatalog, timeZone],
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const platformData = await get<PlatformOption[]>("/admin/platform-data");
        if (!cancelled) setPlatforms(platformData);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load platforms");
      }
      try {
        await loadCatalog();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load tiers");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loadCatalog]);

  const routerParams = useSearchParams();
  const queryKey = scopeSearch(
    routerParams.get("platformKey") || "",
    routerParams.get("tId") || "",
    routerParams.get("userId") || "",
  );
  const writtenQuery = useRef<string | null>(null);
  const applyGeneration = useRef(0);
  const loadOverviewRef = useRef(loadOverview);
  loadOverviewRef.current = loadOverview;

  const replaceScopeUrl = (platform: string, tenant: string, user: string) => {
    const next = scopeSearch(platform, tenant, user);
    writtenQuery.current = next;
    applyGeneration.current += 1;
    const current = window.location.search.replace(/^\?/, "");
    if (current === next) return;
    router.replace(next ? `${ROUTES.TIERS}?${next}` : ROUTES.TIERS, { scroll: false });
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    if (writtenQuery.current === queryKey) return;
    const params = new URLSearchParams(queryKey);
    const nextPlatform = params.get("platformKey") || "";
    const nextTenant = params.get("tId") || "";
    const nextUser = params.get("userId") || "";
    if (!nextPlatform) {
      writtenQuery.current = "";
      return;
    }
    const generation = ++applyGeneration.current;
    let cancelled = false;
    const stale = () => cancelled || applyGeneration.current !== generation;
    (async () => {
      setLoading(true);
      setNotice("");
      setError("");
      setSelectedTier("");
      setSelectedAddon("");
      try {
        let orgs: TenantOption[] = [];
        try {
          orgs = await get<TenantOption[]>(`/admin/organization/${nextPlatform}`);
        } catch {
          orgs = [];
        }
        if (stale()) return;
        const tenant = nextTenant ? orgs.find((item) => item.tId === nextTenant) : undefined;
        if (nextTenant && !tenant) {
          setError("That tenant is not on this platform, so nothing was selected.");
          writtenQuery.current = queryKey;
          return;
        }
        if (nextUser && !nextTenant) {
          setError("A user needs a tenant, so nothing was selected.");
          writtenQuery.current = queryKey;
          return;
        }
        setTenants(orgs);
        setPlatformKey(nextPlatform);
        setTId(nextTenant);
        setUserId("");
        setUsers([]);
        let nextUsers: UserOption[] = [];
        if (tenant) {
          const data = await get<{ users: UserOption[] }>(`/admin/users/${tenant._id}`);
          if (stale()) return;
          nextUsers = data.users || [];
          if (nextUser && !nextUsers.some((user) => String(user._id) === nextUser)) {
            setPlatformKey("");
            setTId("");
            setTenants([]);
            setError("That user is not in this tenant, so nothing was selected.");
            writtenQuery.current = queryKey;
            return;
          }
        }
        setUsers(nextUsers);
        setUserId(nextUser);
        writtenQuery.current = queryKey;
        await loadOverviewRef.current(nextPlatform, nextTenant, nextUser);
      } catch (err) {
        if (!stale()) {
          setPlatformKey("");
          setTId("");
          setUserId("");
          setTenants([]);
          setUsers([]);
          setSelectedTier("");
          setSelectedAddon("");
          writtenQuery.current = queryKey;
          setError(err instanceof Error ? err.message : "Could not open this assignment");
        }
      } finally {
        if (!stale()) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, queryKey]);

  const onPlatform = async (value: string) => {
    replaceScopeUrl(value, "", "");
    setPlatformKey(value);
    setTId("");
    setUserId("");
    setTenants([]);
    setUsers([]);
    setSelectedTier("");
    setSelectedAddon("");
    setNotice("");
    setError("");
    if (!value) {
      await loadOverview("", "", "");
      return;
    }
    setLoading(true);
    try {
      try {
        const orgs = await get<TenantOption[]>(`/admin/organization/${value}`);
        setTenants(orgs);
      } catch {
        setTenants([]);
      }
      await loadOverview(value, "", "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this platform");
    } finally {
      setLoading(false);
    }
  };

  const onTenant = async (value: string) => {
    replaceScopeUrl(platformKey, value, "");
    setTId(value);
    setUserId("");
    setUsers([]);
    setSelectedTier("");
    setSelectedAddon("");
    setNotice("");
    setError("");
    if (!value) {
      setLoading(true);
      try {
        await loadOverview(platformKey, "", "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load assignments");
      } finally {
        setLoading(false);
      }
      return;
    }
    const tenant = tenants.find((item) => item.tId === value);
    setLoading(true);
    try {
      if (tenant) {
        const data = await get<{ users: UserOption[] }>(`/admin/users/${tenant._id}`);
        setUsers(data.users || []);
      }
      await loadOverview(platformKey, value, "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  };

  const onUser = async (value: string) => {
    replaceScopeUrl(platformKey, tId, value);
    setUserId(value);
    setSelectedTier("");
    setSelectedAddon("");
    setNotice("");
    setError("");
    setLoading(true);
    try {
      await loadOverview(platformKey, tId, value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this user");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadOverview(platformKey, tId, userId);
  };

  const importCatalog = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await post<CatalogResponse>("/admin/tiers/catalog/import");
      applyCatalog(data);
      setNotice("Feature and tier catalog loaded.");
      if (platformKey) await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const assign = async (tierKey: string) => {
    if (!platformKey || !tierKey || loading) return;
    if (userId && !tId) {
      setError("Choose the tenant before assigning a user.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await post<{
        replaced?: string[];
        updated?: boolean;
        unchanged?: boolean;
        endsAt?: number | null;
      }>("/admin/tiers/entitlements", {
        platformKey,
        tId: tId || undefined,
        userId: userId || undefined,
        tierKey,
        startsAt: startOfIstDay(startsOn || todayInput(timeZone), timeZone),
        endsAt: endsOn ? endOfIstDay(endsOn, timeZone) : undefined,
        source,
      });
      const name = tiers.find((tier) => tier.key === tierKey)?.name || tierKey;
      const replaced = saved.replaced || [];
      const until = saved.endsAt ? formatWhen(saved.endsAt, timeZone) : "it is cancelled";
      const replacedNote = replaced.length
        ? ` ${replaced.join(", ")} ${replaced.length === 1 ? "is" : "are"} no longer in force at this level.`
        : "";
      if (saved.unchanged) {
        setNotice(`${name} already runs until ${until}.`);
      } else if (saved.updated) {
        setNotice(`${name} keeps the same grant. It now runs until ${until}.${replacedNote}`);
      } else if (replaced.length) {
        setNotice(`${name} is now the plan.${replacedNote}`);
      } else {
        setNotice(`${name} saved as its own grant.`);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setBusy(false);
    }
  };

  const cancelAssignment = async () => {
    const row = pendingCancel;
    if (!row) return;
    setBusy(true);
    setError("");
    try {
      await patch(`/admin/tiers/entitlements/${row.id}`, { status: "cancelled" });
      setNotice("Assignment cancelled.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel");
    } finally {
      setBusy(false);
      setPendingCancel(null);
    }
  };

  const savePolicy = async () => {
    if (!platformKey) return;
    setBusy(true);
    setError("");
    try {
      await post("/admin/tiers/policies", {
        platformKey,
        tId: tId || undefined,
        durationDays: Number(policyDays),
        tierKeys: policyTiers,
        postTrialTierKeys: policyAfter,
        startsOn: policyStarts,
        active: policyActive,
      });
      setNotice(tId ? "Tenant trial policy saved." : "Platform trial policy saved.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the trial policy");
    } finally {
      setBusy(false);
    }
  };

  const extendPolicy = async () => {
    if (!platformKey) return;
    const saved = tId ? overview?.policies.tenant : overview?.policies.platform;
    const days = Number(extendDays);
    if (!saved) {
      setError("Save a trial before extending it.");
      return;
    }
    if (!days || days < 1) {
      setError("Extend by at least one day.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/admin/tiers/policies/extend", {
        platformKey,
        tId: tId || undefined,
        days,
      });
      setNotice(
        tId ? `Tenant trial extended by ${days} days.` : `Platform trial extended by ${days} days.`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not extend the trial");
    } finally {
      setBusy(false);
    }
  };

  const openHistory = async (title: string, query: Record<string, string> = {}) => {
    if (!platformKey) return;
    setHistoryOpen(true);
    setHistoryTitle(title);
    setHistoryMode(query.refId ? "grant" : "scope");
    setHistoryScope("all");
    setHistoryRows([]);
    setHistoryError("");
    setHistoryLoading(true);
    try {
      const data = await get<{ history: HistoryEvent[] }>("/admin/tiers/history", {
        platformKey,
        ...query,
      });
      setHistoryRows(data.history || []);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Could not load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const reducePolicy = async () => {
    if (!platformKey) return;
    const saved = tId ? overview?.policies.tenant : overview?.policies.platform;
    const days = Number(extendDays);
    if (!saved) {
      setError("Save a trial before shortening it.");
      return;
    }
    if (!days || days < 1) {
      setError("Reduce by at least one day.");
      return;
    }
    if (saved.durationDays - days < 1) {
      setError("A trial has to keep at least one day. Cancel it to stop it.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post("/admin/tiers/policies/reduce", {
        platformKey,
        tId: tId || undefined,
        days,
      });
      setNotice(
        tId ? `Tenant trial reduced by ${days} days.` : `Platform trial reduced by ${days} days.`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not shorten the trial");
    } finally {
      setBusy(false);
    }
  };

  const cancelPolicy = async () => {
    if (!platformKey) return;
    setBusy(true);
    setError("");
    try {
      await post("/admin/tiers/policies/cancel", {
        platformKey,
        tId: tId || undefined,
      });
      setNotice(tId ? "Tenant trial cancelled." : "Platform trial cancelled.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel the trial");
    } finally {
      setBusy(false);
      setPendingTrialCancel(false);
    }
  };

  const extendAssignment = async (row: Entitlement) => {
    const days = Number(extendDays);
    if (!days || days < 1) {
      setError("Extend by at least one day.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post(`/admin/tiers/entitlements/${row.id}/extend`, { days });
      setNotice(`Trial grant extended by ${days} days.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not extend the trial grant");
    } finally {
      setBusy(false);
    }
  };

  const reduceAssignment = async (row: Entitlement) => {
    const days = Number(extendDays);
    if (!days || days < 1) {
      setError("Reduce by at least one day.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post(`/admin/tiers/entitlements/${row.id}/reduce`, { days });
      setNotice(`Trial grant reduced by ${days} days.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not shorten the trial grant");
    } finally {
      setBusy(false);
    }
  };

  const featureByKey = useMemo(
    () => new Map(features.map((feature) => [feature.key, feature])),
    [features],
  );
  const tierByKey = useMemo(() => new Map(tiers.map((tier) => [tier.key, tier])), [tiers]);
  const visibleTiers = tiers.filter((tier) => showRetired || tier.active);
  const planTiers = visibleTiers.filter((tier) => !isAddonTier(tier));
  const addonTiers = visibleTiers.filter((tier) => isAddonTier(tier));
  const selectedPlan = tierByKey.get(selectedTier);
  const selectedAddonTier = tierByKey.get(selectedAddon);
  const applicable = overview
    ? grantsForFilter(overview, tId, userId)
    : { plan: null, addons: [] as Entitlement[] };
  const inForceKeys = new Set([
    ...(applicable.plan ? [applicable.plan.tierKey] : []),
    ...applicable.addons.map((row) => row.tierKey),
  ]);

  const scopeLabel = !platformKey
    ? "Select a platform"
    : userId
      ? `User · ${overview?.context.user?.displayName || overview?.context.user?.email || "Selected user"}`
      : tId
        ? `Tenant · ${overview?.context.tenant?.name || tId}`
        : `Platform · ${overview?.context.platform?.name || platformKey}`;

  const exactScope: Entitlement["scope"] = userId ? "user" : tId ? "tenant" : "platform";
  const activeAtThisLevel = (key: string) =>
    Boolean(key) &&
    (overview?.entitlements || []).some(
      (row) => row.status === "active" && row.scope === exactScope && row.tierKey === key,
    );
  const ownInForce = (overview?.entitlements || []).some(
    (row) => row.inForce && row.scope === exactScope,
  );
  const higherGrant = ownInForce
    ? undefined
    : (overview?.entitlements || []).find(
        (row) => row.inForce && exactScope === "user" && row.scope === "tenant",
      ) ||
      (overview?.entitlements || []).find(
        (row) => row.inForce && row.scope === "platform" && exactScope !== "platform",
      );
  const rows = (overview?.entitlements || []).filter((row) => {
    if (listMode !== "applies" && row.scope !== exactScope) return false;
    if (levelFilter !== "all" && row.scope !== levelFilter) return false;
    return true;
  });
  const levelName = exactScope === "user" ? "user" : "tenant";
  const higherName = higherGrant?.scope === "tenant" ? "tenant" : "platform";
  const ownTrial = tId ? overview?.policies.tenant : overview?.policies.platform;
  const platformTrial = overview?.policies.platform || null;

  const usingDefault = Boolean(
    overview &&
      !overview.resolved.blockedReason &&
      (overview.resolved.usingDefault ||
        (overview.resolved.tierKeys.length === 0 && tierByKey.has("base"))),
  );
  const resolvedFeatures =
    overview && overview.resolved.features.length > 0
      ? overview.resolved.features
      : usingDefault
        ? (
            (tierByKey.get("base")?.featureKeys || [])
              .map((key) => featureByKey.get(key))
              .filter(Boolean) as Feature[]
          ).map((feature) => ({
            ...feature,
            chatOnPage: false,
          }))
        : [];
  const chatPages = resolvedFeatures.filter((feature) => feature.chatOnPage);
  const historyScopeLabel = (event: HistoryEvent) => {
    if (event.scope === "user") {
      const person = users.find((user) => user._id === event.userId);
      return person ? `User · ${userLabel(person)}` : "User";
    }
    if (event.scope === "tenant") {
      const tenant = tenants.find((item) => item.tId === event.tId);
      return `Tenant · ${tenant?.name || event.tId || "Tenant"}`;
    }
    return `Platform · ${overview?.context.platform?.name || platformKey}`;
  };
  const visibleHistory = historyRows.filter(
    (event) => historyScope === "all" || event.scope === historyScope,
  );
  const historyScopeCount = (scope: HistoryEvent["scope"]) =>
    historyRows.filter((event) => event.scope === scope).length;
  const historyHint =
    historyMode === "grant"
      ? "This grant only. Newest change first."
      : userId
        ? "Platform, this tenant, and this user. Newest change first."
        : tId
          ? "Platform, this tenant, and its users. Newest change first."
          : "This platform, including every tenant and user. Newest change first.";

  return (
    <Layout
      title="Tiers"
      subtitle="Assign a plan, and an add-on beside it when one extra feature is needed. Each one is its own grant."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={ROUTES.TIER_ASSIGNMENTS}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#1f00a3] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1a0088]"
          >
            View assignments
          </Link>
          <Button variant="outline" onClick={importCatalog} loading={busy}>
            Load catalog
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {(error || notice) && (
          <FloatingAlerts>
            {error && (
              <Alert
                variant="error"
                dismissible
                className="shadow-lg"
                onDismiss={() => setError("")}
              >
                {error}
              </Alert>
            )}
            {notice && (
              <Alert
                key={notice}
                variant="success"
                duration={5}
                dismissible
                className="shadow-lg"
                onDismiss={() => setNotice("")}
              >
                {notice}
              </Alert>
            )}
          </FloatingAlerts>
        )}
        {!catalogReady && (
          <Alert variant="warning">
            The feature catalog is empty on this database. Load catalog to import the app pages,
            chat hosts, and tiers.
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Who is this for?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <SearchableSelect
                label="Platform"
                placeholder="Select a platform"
                value={platformKey}
                onChange={onPlatform}
                options={platforms.map((platform) => ({
                  value: platform.key,
                  label: platform.name,
                }))}
              />
              <SearchableSelect
                label="Tenant"
                placeholder="Whole platform"
                value={tId}
                onChange={onTenant}
                disabled={!platformKey}
                options={tenants.map((tenant) => ({
                  value: tenant.tId,
                  label: `${tenant.name}${tenant.inactive ? " (inactive)" : ""}`,
                }))}
              />
              <SearchableSelect
                label="User"
                placeholder="All users"
                emptyMessage={tId ? "No users in this tenant" : "Select a tenant to see its users"}
                value={userId}
                onChange={onUser}
                disabled={!tId}
                options={[
                  { value: "", label: "All users" },
                  ...[...users]
                    .sort((left, right) => userLabel(left).localeCompare(userLabel(right)))
                    .map((user) => ({ value: user._id, label: userLabel(user) })),
                ]}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#1f00a3]">{scopeLabel}</p>
              {loading && <Loader size="sm" inline />}
            </div>
          </CardContent>
        </Card>

        {overview && (
          <Card>
            <CardHeader>
              <CardTitle>On today</CardTitle>
            </CardHeader>
            <CardContent>
              {overview.resolved.blockedReason === "platform_contract_ended" && (
                <Alert variant="warning">
                  The platform contract has ended, so every tier is off, including Base.
                </Alert>
              )}
              {overview.resolved.blockedReason === "tenant_inactive" && (
                <Alert variant="warning">This tenant is inactive, so no tier is on.</Alert>
              )}
              {usingDefault && (
                <p className="mb-3 text-sm text-gray-600">
                  Base is on for this platform, its tenants, and its users until a tier is assigned.
                </p>
              )}
              {!usingDefault && higherGrant && (
                <p className="mb-3 text-sm text-gray-600">
                  Nothing is assigned to this {levelName}. The {higherName} grant for{" "}
                  {tierByKey.get(higherGrant.tierKey)?.name || higherGrant.tierKey} applies.
                </p>
              )}
              {!overview.resolved.blockedReason && resolvedFeatures.length === 0 && (
                <p className="text-sm text-gray-600">Nothing is in force for this selection yet.</p>
              )}
              {resolvedFeatures.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {resolvedFeatures.map((feature) => (
                    <span
                      key={feature.key}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-800"
                      title={feature.route || feature.description}
                    >
                      {feature.name}
                      {feature.ai && <span className="text-[#1f00a3]">AI</span>}
                      {feature.chatOnPage && (
                        <span className="rounded bg-[#1f00a3] px-1.5 py-0.5 text-[10px] text-white">
                          Chat
                        </span>
                      )}
                      {feature.chatAvailable && !feature.chatOnPage && (
                        <span className="text-gray-400">Chat off</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {chatPages.length > 0 && (
                <p className="mt-3 text-sm text-gray-600">
                  Chat is on for {chatPages.map((feature) => feature.name).join(", ")}.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Choose a plan</h2>
            <p className="mt-1 text-sm text-gray-600">
              This is the main grant. Selecting a plan leaves the add-on selection as it is.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showRetired}
                onChange={(event) => setShowRetired(event.target.checked)}
              />
              Show retired
            </label>
            <Link
              href={ROUTES.TIER_MANAGE}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#1f00a3] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1a0088]"
            >
              Manage tiers
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {planTiers.map((tier) => {
            const included = tier.expandedTierKeys.filter((key) => key !== tier.key);
            const added = tier.featureKeys
              .map((key) => featureByKey.get(key))
              .filter(Boolean) as Feature[];
            const inherited = included.flatMap((key) => tierByKey.get(key)?.featureKeys || []);
            const inheritedFeatures = Array.from(new Set(inherited))
              .map((key) => featureByKey.get(key))
              .filter(Boolean) as Feature[];
            const chatHosts = [...added, ...inheritedFeatures].filter(
              (feature) => feature.active && feature.chatAvailable,
            );
            const hasChat =
              tier.expandedTierKeys.some((key) =>
                tierByKey.get(key)?.featureKeys.includes("chat"),
              ) || tier.featureKeys.includes("chat");
            const selectedCard = selectedTier === tier.key;
            const inForce = inForceKeys.has(tier.key);
            return (
              <button
                key={tier.key}
                type="button"
                onClick={() => setSelectedTier(tier.key)}
                className={`flex h-full flex-col rounded-xl border bg-white p-5 text-left shadow-sm transition ${
                  selectedCard
                    ? "border-[#1f00a3] ring-2 ring-[#1f00a3]"
                    : "border-gray-200 hover:border-[#1f00a3]/40"
                } ${tier.active ? "" : "opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{tier.name}</p>
                    <p className="mt-1 text-sm text-gray-600">{tier.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {tier.key === "base" && (
                      <span className="rounded-full bg-[#1f00a3] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Default
                      </span>
                    )}
                    {inForce && tier.key !== "base" && (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-green-800">
                        In force
                      </span>
                    )}
                  </div>
                </div>
                {included.length > 0 && (
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Contains {included.map((key) => tierByKey.get(key)?.name || key).join(", ")}
                  </p>
                )}
                <ul className="mt-3 space-y-1.5">
                  {added.map((feature) => (
                    <li
                      key={feature.key}
                      className={`flex items-start gap-2 text-sm ${feature.active ? "text-gray-800" : "text-gray-400"}`}
                    >
                      <span
                        className={`mt-0.5 ${feature.active ? "text-[#1f00a3]" : "text-gray-300"}`}
                      >
                        ✓
                      </span>
                      <span>
                        {feature.name}
                        {!feature.active && (
                          <span className="ml-2 text-xs font-medium uppercase tracking-wide">
                            Inactive
                          </span>
                        )}
                        {feature.active && feature.chatAvailable && hasChat && (
                          <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-[#1f00a3]">
                            Chat on page
                          </span>
                        )}
                        {feature.active && feature.chatAvailable && !hasChat && (
                          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                            Chat not enabled
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                {inheritedFeatures.length > 0 && (
                  <p className="mt-3 text-xs leading-5 text-gray-500">
                    Also includes{" "}
                    {inheritedFeatures.map((feature, index) => (
                      <span key={feature.key}>
                        {index > 0 ? ", " : ""}
                        {feature.active ? feature.name : `${feature.name} (inactive)`}
                        {feature.active && feature.chatAvailable && !hasChat
                          ? " (chat not enabled)"
                          : ""}
                      </span>
                    ))}
                    .
                  </p>
                )}
                {chatHosts.length > 0 && (
                  <p className="mt-3 text-xs text-gray-600">
                    {hasChat
                      ? `Chat opens on ${chatHosts.map((feature) => feature.name).join(", ")}.`
                      : `Chat stays off on ${chatHosts.map((feature) => feature.name).join(", ")} until Chat is granted.`}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">Add-ons</h2>
          <p className="mt-1 text-sm text-gray-600">
            An add-on adds one feature beside the plan. It is a separate grant, so choosing one here
            does not change the selected plan.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {addonTiers.map((tier) => {
            const added = tier.featureKeys
              .map((key) => featureByKey.get(key))
              .filter(Boolean) as Feature[];
            const selectedCard = selectedAddon === tier.key;
            const assignedGrant = applicable.addons.find(
              (row) => row.tierKey === tier.key && row.status === "active",
            );
            const inForce = Boolean(assignedGrant);
            return (
              <div
                key={tier.key}
                role="button"
                tabIndex={0}
                onClick={() =>
                  setSelectedAddon((current) => (current === tier.key ? "" : tier.key))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedAddon((current) => (current === tier.key ? "" : tier.key));
                  }
                }}
                className={`flex h-full cursor-pointer flex-col rounded-xl border bg-white p-5 text-left shadow-sm transition ${
                  selectedCard
                    ? "border-[#1f00a3] ring-2 ring-[#1f00a3]"
                    : "border-gray-200 hover:border-[#1f00a3]/40"
                } ${tier.active ? "" : "opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{tier.name}</p>
                    <p className="mt-1 text-sm text-gray-600">{tier.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {inForce && (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-green-800">
                        In force
                      </span>
                    )}
                    {assignedGrant && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="!border-red-200 !text-red-700 hover:!bg-red-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingCancel(assignedGrant);
                        }}
                      >
                        Remove
                        {assignedGrant.scope === exactScope ? "" : ` ${assignedGrant.scope} grant`}
                      </Button>
                    )}
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {added.map((feature) => (
                    <li key={feature.key} className="flex items-start gap-2 text-sm text-gray-800">
                      <span className="mt-0.5 text-[#1f00a3]">✓</span>
                      <span>{feature.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {addonTiers.length === 0 && (
            <p className="text-sm text-gray-600">No add-ons in the catalog.</p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assign</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              {platformKey
                ? `Each button writes a grant for ${scopeLabel}. Assigning a tier that is already active here updates that grant's end date. A new plan replaces the other plan at this level. An add-on stays beside the plan.`
                : "Select a platform, then a plan. An add-on can be saved beside it as a second grant."}
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Starts"
                type="date"
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
              />
              <Input
                label="Ends"
                type="date"
                value={endsOn}
                onChange={(event) => setEndsOn(event.target.value)}
                helperText={`Dates use ${timeZone}. Leave empty to keep it until cancelled. A date ends at 23:59.`}
              />
              <label className="space-y-1 text-sm">
                <span className="block font-medium text-gray-700">Source</span>
                <select
                  className="block h-[42px] w-full rounded-md border border-gray-300 px-3 py-2"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                >
                  {SOURCES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                disabled={loading || !platformKey || !selectedTier}
                loading={busy}
                onClick={() => assign(selectedTier)}
              >
                {selectedPlan
                  ? activeAtThisLevel(selectedTier)
                    ? `Update ${selectedPlan.name} end date`
                    : `Assign ${selectedPlan.name}`
                  : "Assign plan"}
              </Button>
              <Button
                variant="outline"
                disabled={loading || !platformKey || !selectedAddon}
                loading={busy}
                onClick={() => assign(selectedAddon)}
              >
                {selectedAddonTier
                  ? activeAtThisLevel(selectedAddon)
                    ? `Update ${selectedAddonTier.name} end date`
                    : `Assign ${selectedAddonTier.name}`
                  : "Assign add-on"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Assignments</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={listMode === "applies" ? "primary" : "outline"}
                  onClick={() => setListMode("applies")}
                >
                  Everything that applies
                </Button>
                <Button
                  size="sm"
                  variant={listMode === "exact" ? "primary" : "outline"}
                  onClick={() => setListMode("exact")}
                >
                  This scope only
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!platformKey}
                  onClick={() =>
                    openHistory(`${scopeLabel} history`, {
                      ...(tId ? { tId } : {}),
                      ...(userId ? { userId } : {}),
                    })
                  }
                >
                  History
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!platformKey && (
              <p className="text-sm text-gray-600">Select a platform to see grants.</p>
            )}
            {platformKey && listMode === "applies" && higherGrant && (
              <p className="mb-3 text-sm text-gray-600">
                Nothing is assigned to this {levelName}. The {higherName} grant is listed because it
                still applies.
              </p>
            )}
            {platformKey && (
              <div className="mb-3">
                <LevelFilter value={levelFilter} onChange={setLevelFilter} />
              </div>
            )}
            {platformKey && rows.length === 0 && !(usingDefault && levelFilter === "all") && (
              <p className="text-sm text-gray-600">No grants in this view.</p>
            )}
            {(rows.length > 0 || (platformKey && usingDefault && levelFilter === "all")) && (
              <div className="max-h-80 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(229,231,235)]">
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2">Scope</th>
                      <th className="px-3 py-2">Tier</th>
                      <th className="px-3 py-2">From</th>
                      <th className="px-3 py-2">Until</th>
                      <th className="px-3 py-2">Source</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usingDefault && levelFilter === "all" && (
                      <tr className="bg-gray-50">
                        <td className="px-3 py-3">Everyone</td>
                        <td className="px-3 py-3">Base</td>
                        <td className="px-3 py-3">—</td>
                        <td className="px-3 py-3">Until a tier is assigned</td>
                        <td className="px-3 py-3">Default</td>
                        <td className="px-3 py-3 text-green-700">In force</td>
                        <td className="px-3 py-3"></td>
                      </tr>
                    )}
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          row.scope === "user"
                            ? "bg-emerald-50"
                            : row.scope === "tenant"
                              ? "bg-sky-50"
                              : "bg-violet-50"
                        }
                      >
                        <td className="px-3 py-3">
                          <div className="capitalize">{row.scope}</div>
                          {row.assigneeName && (
                            <div className="text-xs text-gray-500">{row.assigneeName}</div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {tierByKey.get(row.tierKey)?.name || row.tierKey}
                        </td>
                        <td className="px-3 py-3">{formatWhen(row.startsAt, timeZone)}</td>
                        <td className="px-3 py-3">{formatWhen(row.endsAt, timeZone)}</td>
                        <td className="px-3 py-3 capitalize">{row.source}</td>
                        <td className="px-3 py-3">
                          <span className={row.inForce ? "text-green-700" : "text-gray-500"}>
                            {row.status === "cancelled"
                              ? "Cancelled"
                              : row.inForce
                                ? "In force"
                                : "Not in force"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openHistory(
                                  `${tierByKey.get(row.tierKey)?.name || row.tierKey} history`,
                                  { subject: "entitlement", refId: row.id },
                                )
                              }
                            >
                              History
                            </Button>
                            {row.status === "active" && row.source === "trial" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => extendAssignment(row)}
                                >
                                  Extend
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy || !row.endsAt}
                                  onClick={() => reduceAssignment(row)}
                                >
                                  Reduce
                                </Button>
                              </>
                            )}
                            {row.status === "active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPendingCancel(row)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{tId ? "Tenant trial" : "Platform trial"}</CardTitle>
              <div className="flex items-center gap-2">
                {platformKey && (
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      ownTrial?.active
                        ? "bg-green-100 text-green-800"
                        : ownTrial
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ownTrial?.active ? "Saved" : ownTrial ? "Cancelled" : "Not saved"}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!platformKey || !(ownTrial || platformTrial)}
                  onClick={() => {
                    const policy = ownTrial || platformTrial;
                    if (!policy) return;
                    const label = policy.tId ? "Tenant trial" : "Platform trial";
                    openHistory(`${label} history`, { subject: "trial", refId: policy.id });
                  }}
                >
                  History
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600">
              {!platformKey && "Select a platform to see its trial."}
              {platformKey &&
                !tId &&
                ownTrial?.active &&
                "This platform trial is saved. It applies to every tenant that does not have its own trial."}
              {platformKey &&
                !tId &&
                ownTrial &&
                !ownTrial.active &&
                "This platform trial is cancelled. It does not apply until it is saved as active again."}
              {platformKey &&
                !tId &&
                !ownTrial &&
                "No platform trial is saved yet. These are the defaults."}
              {platformKey &&
                tId &&
                ownTrial?.active &&
                "A trial is saved for this tenant. It replaces the platform trial. A user selection still uses this tenant trial."}
              {platformKey &&
                tId &&
                ownTrial &&
                !ownTrial.active &&
                "This tenant trial is cancelled. The platform trial applies again while this one stays off."}
              {platformKey &&
                tId &&
                !ownTrial &&
                platformTrial &&
                "No trial is saved for this tenant. The platform trial is shown because it applies to this tenant and its users."}
              {platformKey &&
                tId &&
                !ownTrial &&
                !platformTrial &&
                "No trial is saved for this tenant or the platform. These are the defaults."}
              {overview?.policies.effective && (
                <>
                  {" "}
                  The clock that applies writes{" "}
                  {overview.policies.effective.grantTierKeys
                    .map((key) => tierByKey.get(key)?.name || key)
                    .join(", ") || "no tier"}
                  .
                </>
              )}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Days"
                type="number"
                min={1}
                value={policyDays}
                onChange={(event) => setPolicyDays(event.target.value)}
              />
              <label className="space-y-1 text-sm">
                <span className="block font-medium text-gray-700">Clock starts</span>
                <select
                  className="block w-full rounded-md border border-gray-300 px-3 py-2"
                  value={policyStarts}
                  onChange={(event) => setPolicyStarts(event.target.value)}
                >
                  {STARTS_ON.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <MultiSelect
                label="Tiers opened"
                value={policyTiers}
                onChange={setPolicyTiers}
                options={tiers
                  .filter((tier) => tier.active)
                  .map((tier) => ({ value: tier.key, label: tier.name }))}
              />
              <MultiSelect
                label="After the trial"
                value={policyAfter}
                onChange={setPolicyAfter}
                options={tiers
                  .filter((tier) => tier.active)
                  .map((tier) => ({ value: tier.key, label: tier.name }))}
              />
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={policyActive}
                onChange={(event) => setPolicyActive(event.target.checked)}
              />
              Policy is active
            </label>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <Button disabled={loading || !platformKey} loading={busy} onClick={savePolicy}>
                Save trial
              </Button>
              <Button
                variant="outline"
                className="!border-red-200 !text-red-700 hover:!bg-red-50"
                disabled={!platformKey || !ownTrial?.active || busy}
                onClick={() => setPendingTrialCancel(true)}
              >
                Cancel trial
              </Button>
              <div className="w-28">
                <Input
                  label="Days"
                  type="number"
                  min={1}
                  value={extendDays}
                  onChange={(event) => setExtendDays(event.target.value)}
                />
              </div>
              <Button
                variant="outline"
                disabled={!platformKey || !ownTrial || busy}
                onClick={extendPolicy}
              >
                Extend trial
              </Button>
              <Button
                variant="outline"
                disabled={!platformKey || !ownTrial || ownTrial.durationDays <= 1 || busy}
                onClick={reducePolicy}
              >
                Reduce trial
              </Button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Extend adds these days to the saved trial. Reduce takes them off and leaves at least
              one day. Cancel stops the trial, and saving it as active turns it back on. A trial
              grant in Assignments uses the same day count.
            </p>
          </CardContent>
        </Card>
      </div>
      {pendingTrialCancel && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => !busy && setPendingTrialCancel(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Cancel trial"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              Cancel this {tId ? "tenant" : "platform"} trial?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              It stops applying. The saved length and tiers stay, so it can be turned on again by
              saving it as active.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setPendingTrialCancel(false)}
              >
                Keep trial
              </Button>
              <Button
                className="!bg-red-600 !text-white hover:!bg-red-700"
                loading={busy}
                onClick={cancelPolicy}
              >
                Cancel trial
              </Button>
            </div>
          </div>
        </div>
      )}
      {pendingCancel && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => !busy && setPendingCancel(null)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Cancel assignment"
          >
            <h3 className="text-lg font-semibold text-gray-900">
              Cancel {tierByKey.get(pendingCancel.tierKey)?.name || pendingCancel.tierKey}?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This stops the {pendingCancel.scope} grant. The plan or add-on stays in the catalog.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" disabled={busy} onClick={() => setPendingCancel(null)}>
                Keep assignment
              </Button>
              <Button
                className="!bg-red-600 !text-white hover:!bg-red-700"
                loading={busy}
                onClick={cancelAssignment}
              >
                Cancel assignment
              </Button>
            </div>
          </div>
        </div>
      )}
      {historyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-lg"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label={historyTitle}
          >
            <div className="shrink-0 border-b border-gray-200 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{historyTitle}</h3>
                  <p className="mt-1 text-sm text-gray-600">{historyHint}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setHistoryOpen(false)}>
                  Close
                </Button>
              </div>
              {historyMode === "scope" && historyRows.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      ["all", "All", historyRows.length],
                      ["platform", "Platform", historyScopeCount("platform")],
                      ["tenant", "Tenant", historyScopeCount("tenant")],
                      ["user", "User", historyScopeCount("user")],
                    ] as const
                  ).map(([value, label, count]) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={historyScope === value ? "primary" : "outline"}
                      onClick={() => setHistoryScope(value)}
                    >
                      {label} ({count})
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="max-h-[calc(85vh-9rem)] overflow-auto px-5 py-4">
              {historyLoading && <Loader size="sm" inline />}
              {historyError && (
                <div className="mb-3">
                  <Alert variant="error">{historyError}</Alert>
                </div>
              )}
              {!historyLoading && !historyError && historyRows.length === 0 && (
                <p className="text-sm text-gray-600">No changes recorded yet.</p>
              )}
              {!historyLoading && historyRows.length > 0 && visibleHistory.length === 0 && (
                <p className="text-sm text-gray-600">No changes for this scope.</p>
              )}
              {visibleHistory.length > 0 && (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-3 py-2">When</th>
                      <th className="px-3 py-2">Scope</th>
                      <th className="px-3 py-2">Change</th>
                      <th className="px-3 py-2">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleHistory.map((event) => (
                      <tr key={event.id}>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {formatWhenWithTime(event.at, timeZone)}
                        </td>
                        <td className="px-3 py-3">{historyScopeLabel(event)}</td>
                        <td className="px-3 py-3 capitalize">{event.action}</td>
                        <td className="px-3 py-3">{event.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default function TiersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader />
        </div>
      }
    >
      <TiersPageContent />
    </Suspense>
  );
}
