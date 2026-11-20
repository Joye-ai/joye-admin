"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Layout } from "@/components/layout";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { ROUTES } from "@/constants";
import { del, get, post } from "@/helpers/api";
import { useAppSelector } from "@/store";

type Feature = {
  key: string;
  name: string;
  group: string;
  description: string;
  chatAvailable: boolean;
  active: boolean;
};

type Tier = {
  key: string;
  name: string;
  description: string;
  rank: number;
  sort: number;
  includesTierKeys: string[];
  featureKeys: string[];
  active: boolean;
  highlighted: boolean;
  addon?: boolean;
  entitled?: boolean;
};

type CatalogResponse = { catalogReady: boolean; features: Feature[]; tiers: Tier[] };

type DeleteResult = {
  deleted: boolean;
  retired: boolean;
  grantCount: number;
  usedBy: string[];
};

const emptyForm = {
  key: "",
  name: "",
  description: "",
  includesTierKeys: [] as string[],
  featureKeys: [] as string[],
  active: true,
  highlighted: false,
  addon: false,
  rank: 40,
  sort: 50,
};

const PROTECTED_TIER_KEYS = new Set(["base", "premium_1", "premium_2", "premium_3"]);

function codeFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function ManageTiersPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace(ROUTES.LOGIN);
  }, [isAuthenticated, router]);

  const load = useCallback(async (preferKey?: string) => {
    const data = await get<CatalogResponse>("/admin/tiers/catalog");
    setFeatures(data.features);
    setTiers(data.tiers);
    const nextKey =
      preferKey && data.tiers.some((tier) => tier.key === preferKey)
        ? preferKey
        : data.tiers[0]?.key || "";
    setSelectedKey(nextKey);
    setCreating(false);
    return data.tiers.find((tier) => tier.key === nextKey) || null;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    load()
      .then((tier) => {
        if (tier) fill(tier);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load tiers"));
  }, [isAuthenticated, load]);

  const fill = (tier: Tier) => {
    setConfirmRemove(false);
    setCreating(false);
    setSelectedKey(tier.key);
    setForm({
      key: tier.key,
      name: tier.name,
      description: tier.description,
      includesTierKeys: [...tier.includesTierKeys],
      featureKeys: [...tier.featureKeys],
      active: tier.active,
      highlighted: tier.highlighted,
      addon: Boolean(tier.addon) || tier.key.endsWith("_addon"),
      rank: tier.rank,
      sort: tier.sort,
    });
  };

  const startNew = (addon: boolean) => {
    setConfirmRemove(false);
    setCreating(true);
    setSelectedKey("");
    setForm({ ...emptyForm, addon });
    setError("");
    setNotice("");
  };

  const toggleFeature = (key: string) => {
    setForm((current) => ({
      ...current,
      featureKeys: current.featureKeys.includes(key)
        ? current.featureKeys.filter((item) => item !== key)
        : [...current.featureKeys, key],
    }));
  };

  const toggleContains = (key: string) => {
    setForm((current) => ({
      ...current,
      includesTierKeys: current.includesTierKeys.includes(key)
        ? current.includesTierKeys.filter((item) => item !== key)
        : [...current.includesTierKeys, key],
    }));
  };

  const save = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const key = form.key.trim();
      await post("/admin/tiers", {
        key,
        ...(!creating && selectedKey && selectedKey !== key ? { previousKey: selectedKey } : {}),
        name: form.name.trim(),
        description: form.description.trim(),
        includesTierKeys: form.addon ? [] : form.includesTierKeys,
        featureKeys: form.featureKeys,
        rank: form.rank,
        sort: form.sort,
        active: form.active,
        highlighted: form.highlighted,
        addon: form.addon,
      });
      const savedKey = form.key.trim();
      const tier = await load(savedKey);
      if (tier) fill(tier);
      setNotice(form.addon ? "Add-on saved." : "Plan saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the tier");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!form.key || creating || PROTECTED_TIER_KEYS.has(form.key)) return;
    if (tiers.find((tier) => tier.key === selectedKey)?.entitled) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await del<DeleteResult>(`/admin/tiers/${form.key}`);
      const removedName = form.name;
      const tier = await load();
      if (tier) fill(tier);
      else setForm(emptyForm);
      if (result.retired) {
        const where = [
          result.grantCount
            ? `${result.grantCount} active grant${result.grantCount === 1 ? "" : "s"}`
            : "",
          result.usedBy.length ? `used by ${result.usedBy.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join(", ");
        setNotice(`${removedName} was retired${where ? ` (${where})` : ""}.`);
      } else {
        setNotice(`${removedName} was deleted.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the tier");
    } finally {
      setBusy(false);
      setConfirmRemove(false);
    }
  };

  const tierByKey = useMemo(() => new Map(tiers.map((tier) => [tier.key, tier])), [tiers]);
  const includesTierKeys = form.addon ? [] : form.includesTierKeys;
  const inherited = includesTierKeys.flatMap((key) =>
    (tierByKey.get(key)?.featureKeys || []).map((featureKey) => ({ featureKey, from: key })),
  );
  const groups = useMemo(() => {
    const map = new Map<string, Feature[]>();
    features.forEach((feature) => {
      const list = map.get(feature.group) || [];
      list.push(feature);
      map.set(feature.group, list);
    });
    return Array.from(map.entries());
  }, [features]);
  const containedTiers = includesTierKeys
    .map((key) => tierByKey.get(key))
    .filter((tier): tier is Tier => Boolean(tier));
  const broughtIn = inherited.filter(
    (item, index, all) => all.findIndex((other) => other.featureKey === item.featureKey) === index,
  );

  return (
    <Layout
      title="Manage tiers"
      subtitle="Add or remove the features a tier turns on. A tier can also contain another tier."
      actions={
        <div className="flex items-center gap-4">
          <Link
            href={ROUTES.FEATURE_MANAGE}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#1f00a3] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1a0088]"
          >
            Manage features
          </Link>
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
            Back to assignments
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError("")}>
            {error}
          </Alert>
        )}
        {notice && (
          <Alert variant="success" dismissible onDismiss={() => setNotice("")}>
            {notice}
          </Alert>
        )}

        <div className="grid items-start gap-4 lg:grid-cols-[300px_1fr]">
          <Card padding="sm" className="lg:sticky lg:top-4">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Tiers</CardTitle>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="!border-transparent !bg-[#1f00a3] !text-white hover:!bg-[#1a0088] focus:!ring-[#1f00a3]"
                  onClick={() => startNew(false)}
                >
                  New plan
                </Button>
                <Button
                  size="sm"
                  className="!border-transparent !bg-[#0f766e] !text-white hover:!bg-[#115e59] focus:!ring-[#0f766e]"
                  onClick={() => startNew(true)}
                >
                  New add-on
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    label: "Plans",
                    items: tiers.filter((tier) => !(tier.addon || tier.key.endsWith("_addon"))),
                  },
                  {
                    label: "Add-ons",
                    items: tiers.filter((tier) => tier.addon || tier.key.endsWith("_addon")),
                  },
                ].map((group) => (
                  <div key={group.label}>
                    <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {group.label}
                    </p>
                    <div className="mt-1 space-y-1">
                      {group.items.map((tier) => {
                        const selected = !creating && selectedKey === tier.key;
                        return (
                          <button
                            key={tier.key}
                            type="button"
                            onClick={() => fill(tier)}
                            className={`w-full rounded-md px-3 py-2 text-left ${selected ? "bg-[#1f00a3] text-white" : "text-gray-800 hover:bg-gray-100"}`}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">{tier.name}</span>
                              {!tier.active && (
                                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                                  Retired
                                </span>
                              )}
                            </span>
                            <span
                              className={`mt-0.5 block font-mono text-xs ${selected ? "text-white/80" : "text-gray-500"}`}
                            >
                              {tier.key}
                            </span>
                          </button>
                        );
                      })}
                      {group.items.length === 0 && (
                        <p className="px-3 text-sm text-gray-500">None yet.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {creating ? (form.addon ? "New add-on" : "New plan") : "Details"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-gray-900">
                  {creating ? "What are you creating?" : "Kind"}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!creating}
                    onClick={() => setForm((current) => ({ ...current, addon: false }))}
                    className={`rounded-lg border px-3 py-3 text-left disabled:cursor-not-allowed ${form.addon ? "border-gray-200" : "border-[#1f00a3] ring-2 ring-[#1f00a3]"} ${creating ? "" : "bg-gray-100"}`}
                  >
                    <span className="block text-sm font-semibold text-gray-900">Plan</span>
                    <span className="mt-1 block text-xs text-gray-600">
                      Base or a Premium. This is the main grant.
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!creating}
                    onClick={() => setForm((current) => ({ ...current, addon: true }))}
                    className={`rounded-lg border px-3 py-3 text-left disabled:cursor-not-allowed ${form.addon ? "border-[#1f00a3] ring-2 ring-[#1f00a3]" : "border-gray-200"} ${creating ? "" : "bg-gray-100"}`}
                  >
                    <span className="block text-sm font-semibold text-gray-900">Add-on</span>
                    <span className="mt-1 block text-xs text-gray-600">
                      One extra feature saved as its own grant beside a plan.
                    </span>
                  </button>
                </div>
                {!creating && (
                  <p className="mt-2 text-sm text-gray-600">
                    The kind stays fixed after this is saved.
                  </p>
                )}
                <p className="mb-4 mt-4 text-sm text-gray-600">
                  {creating
                    ? "The key is filled from the name. Change it before saving if you want a different one."
                    : `${form.name || "This tier"} is ${form.addon ? "an add-on" : "a plan"}. It adds ${form.featureKeys.length} feature${form.featureKeys.length === 1 ? "" : "s"}${
                        containedTiers.length
                          ? ` and contains ${containedTiers.map((tier) => tier.name).join(", ")}`
                          : ""
                      }.`}
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Name"
                    value={form.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      setForm((current) => {
                        const generated = codeFromName(current.name);
                        const keepManual =
                          !creating || (current.key !== "" && current.key !== generated);
                        return {
                          ...current,
                          name,
                          key: keepManual ? current.key : codeFromName(name),
                        };
                      });
                    }}
                  />
                  <Input
                    label="Key"
                    value={form.key}
                    disabled={!creating && form.key === "base"}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, key: event.target.value }))
                    }
                    helperText={
                      creating
                        ? "Filled from the name. You can change it before saving."
                        : form.key === "base"
                          ? "Base stays fixed. It is the default plan."
                          : "Lowercase letters, numbers, and underscores. Changing a saved key updates grants, tiers that contain it, and trial policies."
                    }
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Description"
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, description: event.target.value }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {!form.addon && (
              <Card>
                <CardHeader>
                  <CardTitle>Contains</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Select a tier to include every feature it already grants. Select it again to
                    leave those features out.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tiers
                      .filter((tier) => tier.key !== form.key)
                      .map((tier) => {
                        const on = form.includesTierKeys.includes(tier.key);
                        return (
                          <button
                            key={tier.key}
                            type="button"
                            onClick={() => toggleContains(tier.key)}
                            className={`rounded-full border px-3 py-1 text-sm ${
                              on
                                ? "border-[#1f00a3] bg-[#1f00a3] text-white"
                                : "border-gray-300 bg-white text-gray-700"
                            }`}
                          >
                            {tier.name}
                          </button>
                        );
                      })}
                  </div>
                  {broughtIn.length > 0 && (
                    <p className="mt-3 text-sm text-gray-600">
                      {`Brought in: ${broughtIn.map((item) => features.find((feature) => feature.key === item.featureKey)?.name || item.featureKey).join(", ")}.`}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Features this tier adds</CardTitle>
                  <span className="text-sm text-gray-500">{form.featureKeys.length} selected</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-gray-600">
                  {form.addon
                    ? "These are the features this add-on turns on."
                    : "These are the features stored on this tier. Features brought in by a contained tier stay listed there."}
                </p>
                <div className="space-y-4">
                  {groups.map(([group, items]) => {
                    const selectedCount = items.filter((feature) =>
                      form.featureKeys.includes(feature.key),
                    ).length;
                    return (
                      <section
                        key={group}
                        className="overflow-hidden rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                            {group}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {selectedCount} of {items.length}
                          </span>
                        </div>
                        <div className="grid gap-2 p-3 sm:grid-cols-2">
                          {items.map((feature) => {
                            const on = form.featureKeys.includes(feature.key);
                            const fromParent = inherited.find(
                              (item) => item.featureKey === feature.key,
                            );
                            return (
                              <label
                                key={feature.key}
                                className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                                  feature.active
                                    ? "border-gray-200 bg-white"
                                    : "border-gray-100 bg-gray-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5"
                                  checked={on}
                                  disabled={!feature.active}
                                  onChange={() => toggleFeature(feature.key)}
                                />
                                <span>
                                  <span
                                    className={feature.active ? "text-gray-900" : "text-gray-400"}
                                  >
                                    {feature.name}
                                  </span>
                                  {!feature.active && (
                                    <span className="ml-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                                      Inactive
                                    </span>
                                  )}
                                  {feature.active && feature.chatAvailable && (
                                    <span className="ml-2 text-xs text-[#1f00a3]">
                                      Chat on page
                                    </span>
                                  )}
                                  {fromParent && !on && (
                                    <span className="mt-0.5 block text-xs text-gray-500">
                                      Included from{" "}
                                      {tierByKey.get(fromParent.from)?.name || fromParent.from}
                                    </span>
                                  )}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, active: event.target.checked }))
                    }
                  />
                  Active and available to assign
                </label>
                <p className="mt-2 text-sm text-gray-600">
                  A retired tier stays in place so existing grants can still be read. It is hidden
                  from new assignments.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    disabled={!form.key.trim() || !form.name.trim()}
                    loading={busy}
                    onClick={save}
                  >
                    Save tier
                  </Button>
                  {!creating && Boolean(selectedKey) && !PROTECTED_TIER_KEYS.has(selectedKey) && (
                    <Button
                      variant="outline"
                      disabled={
                        busy || Boolean(tiers.find((tier) => tier.key === selectedKey)?.entitled)
                      }
                      onClick={() => setConfirmRemove(true)}
                    >
                      Remove tier
                    </Button>
                  )}
                </div>
                {!creating &&
                  Boolean(selectedKey) &&
                  !PROTECTED_TIER_KEYS.has(selectedKey) &&
                  tiers.find((tier) => tier.key === selectedKey)?.entitled && (
                    <p className="mt-2 text-sm text-gray-600">
                      This tier is granted to a platform, tenant, or user, so it cannot be removed.
                    </p>
                  )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {confirmRemove && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => !busy && setConfirmRemove(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Remove tier"
          >
            <h3 className="text-lg font-semibold text-gray-900">Remove {form.name || form.key}?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This deletes the tier. It is not granted to any platform, tenant, or user.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" disabled={busy} onClick={() => setConfirmRemove(false)}>
                Cancel
              </Button>
              <Button
                className="!bg-red-600 !text-white hover:!bg-red-700"
                loading={busy}
                onClick={remove}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
