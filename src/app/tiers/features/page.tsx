"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Layout } from "@/components/layout";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { ROUTES } from "@/constants";
import { get, post } from "@/helpers/api";
import { useAppSelector } from "@/store";

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
};

type CatalogResponse = { features: Feature[] };

const KINDS = [
  { value: "page", label: "Page" },
  { value: "feature", label: "Feature" },
];

const GROUPS = ["Daily", "Account", "Chat", "Programs"];

function codeFromName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const emptyForm = {
  key: "",
  name: "",
  kind: "page",
  group: "",
  route: "",
  description: "",
  ai: false,
  chatAvailable: false,
  chatType: "",
  active: true,
  sort: 100,
};

export default function ManageFeaturesPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!isAuthenticated) router.replace(ROUTES.LOGIN);
  }, [isAuthenticated, router]);

  const load = useCallback(async (preferKey?: string) => {
    const data = await get<CatalogResponse>("/admin/tiers/catalog");
    const next = [...data.features].sort(
      (left, right) => left.sort - right.sort || left.name.localeCompare(right.name),
    );
    setFeatures(next);
    const nextKey =
      preferKey && next.some((feature) => feature.key === preferKey)
        ? preferKey
        : next[0]?.key || "";
    setSelectedKey(nextKey);
    setCreating(false);
    return next.find((feature) => feature.key === nextKey) || null;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    load()
      .then((feature) => {
        if (feature) fill(feature);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load features"));
  }, [isAuthenticated, load]);

  const fill = (feature: Feature) => {
    setCreating(false);
    setSelectedKey(feature.key);
    setForm({
      key: feature.key,
      name: feature.name,
      kind: feature.kind,
      group: feature.group,
      route: feature.route,
      description: feature.description,
      ai: feature.ai,
      chatAvailable: feature.chatAvailable,
      chatType: feature.chatType,
      active: feature.active,
      sort: feature.sort,
    });
  };

  const startNew = () => {
    const nextSort = features.reduce((highest, feature) => Math.max(highest, feature.sort), 0) + 10;
    setCreating(true);
    setSelectedKey("");
    setForm({ ...emptyForm, sort: nextSort });
    setError("");
    setNotice("");
  };

  const save = async () => {
    const wasNew = creating;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await post("/admin/tiers/features", {
        key: form.key.trim(),
        name: form.name.trim(),
        kind: form.kind,
        group: form.group.trim(),
        route: form.route.trim(),
        description: form.description.trim(),
        ai: form.ai,
        chatAvailable: form.chatAvailable,
        chatType: form.chatAvailable ? form.chatType.trim() : "",
        active: form.active,
        sort: Number(form.sort) || 0,
      });
      const savedKey = form.key.trim();
      const feature = await load(savedKey);
      if (feature) fill(feature);
      setNotice(wasNew ? "Feature added." : "Feature updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the feature");
    } finally {
      setBusy(false);
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, Feature[]>();
    features.forEach((feature) => {
      const list = map.get(feature.group) || [];
      list.push(feature);
      map.set(feature.group, list);
    });
    return Array.from(map.entries());
  }, [features]);

  const groupOptions = useMemo(() => {
    const extras = features
      .map((feature) => feature.group)
      .filter((group) => group && !GROUPS.includes(group));
    return Array.from(new Set([...GROUPS, ...extras]));
  }, [features]);
  const kindOptions = KINDS.some((item) => item.value === form.kind)
    ? KINDS
    : [...KINDS, { value: form.kind, label: form.kind }];

  return (
    <Layout
      title="Manage features"
      subtitle="Add a feature or update one. A saved key stays fixed, and features are not deleted from here."
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
          Back to assignments
        </Link>
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

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card padding="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Features</CardTitle>
                <Button
                  size="sm"
                  className="!border-transparent !bg-[#1f00a3] !text-white hover:!bg-[#1a0088] focus:!ring-[#1f00a3]"
                  onClick={startNew}
                >
                  New feature
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groups.map(([group, items]) => (
                  <div key={group}>
                    <p className="px-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                      {group}
                    </p>
                    <div className="mt-1 space-y-1">
                      {items.map((feature) => (
                        <button
                          key={feature.key}
                          type="button"
                          onClick={() => fill(feature)}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                            !creating && selectedKey === feature.key
                              ? "bg-[#1f00a3] text-white"
                              : "text-gray-800 hover:bg-gray-100"
                          }`}
                        >
                          <span>{feature.name}</span>
                          {!feature.active && <span className="text-xs opacity-80">Inactive</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {features.length === 0 && <p className="text-sm text-gray-500">No features yet.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{creating ? "New feature" : form.name || "Feature"}</CardTitle>
            </CardHeader>
            <CardContent>
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
                  disabled={!creating}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, key: event.target.value }))
                  }
                  helperText={
                    creating
                      ? "Filled from the name. You can change it before saving."
                      : "The key stays fixed after the feature is saved."
                  }
                />
                <label className="space-y-1 text-sm">
                  <span className="block font-medium text-gray-700">Kind</span>
                  <select
                    className="block w-full rounded-md border border-gray-300 px-3 py-2"
                    value={form.kind}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, kind: event.target.value }))
                    }
                  >
                    {kindOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="block font-medium text-gray-700">Group</span>
                  <select
                    className="block w-full rounded-md border border-gray-300 px-3 py-2"
                    value={form.group}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, group: event.target.value }))
                    }
                  >
                    <option value="">Select a group</option>
                    {groupOptions.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Route"
                  value={form.route}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, route: event.target.value }))
                  }
                  helperText="Required for a page, such as /daily-suggestion."
                />
                <Input
                  label="Sort"
                  type="number"
                  value={form.sort}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sort: Number(event.target.value) }))
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
                {form.chatAvailable && (
                  <Input
                    label="Chat type"
                    value={form.chatType}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, chatType: event.target.value }))
                    }
                    helperText="Used when this page can host chat."
                  />
                )}
              </div>

              <div className="mt-6 space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.ai}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, ai: event.target.checked }))
                    }
                  />
                  Uses AI
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.chatAvailable}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, chatAvailable: event.target.checked }))
                    }
                  />
                  This page can host chat
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, active: event.target.checked }))
                    }
                  />
                  Active
                </label>
              </div>

              <div className="mt-6">
                <Button
                  disabled={!form.key.trim() || !form.name.trim() || !form.group.trim()}
                  loading={busy}
                  onClick={save}
                >
                  {creating ? "Add feature" : "Update feature"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
