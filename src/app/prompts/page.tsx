"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Layout } from "@/components/layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Loader,
  Alert,
  SearchableSelect,
} from "@/components/ui";
import { API_ENDPOINTS, ROUTES } from "@/constants";
import { get, post, patch } from "@/helpers/api";
import { useAppSelector } from "@/store";

type PromptLevel = "global" | "platform" | "tenant";

type PromptRow = {
  _id: string | null;
  sourceId: string;
  model: string;
  type: string;
  tokens: number;
  prompt?: string;
  level: PromptLevel;
  inherited: boolean;
  inheritedFrom: "global" | "platform" | null;
  platformKey: string | null;
  tId: string | null;
};

type PlatformOption = { key: string; name: string };
type OrganizationOption = {
  _id: string;
  key: string;
  name: string;
  tId: string;
  inactive: boolean;
};

const CATEGORY_OPTIONS = [
  { label: "Brew", value: "brew" },
  { label: "Mindful Minute", value: "mindful-minute" },
  { label: "BYB", value: "byb" },
  { label: "Inclusion", value: "inclusion" },
  { label: "Jumpstart", value: "jumpstart" },
  { label: "Transformation", value: "transformation" },
  { label: "Quick Joy Level", value: "quick-jl" },
  { label: "Make Today Great", value: "today-great" },
  { label: "Monday Insights", value: "monday-insights" },
  { label: "Daily Suggestions", value: "daily-suggestions" },
] as const;

const LEVEL_LABEL: Record<PromptLevel, string> = {
  global: "Global",
  platform: "Platform",
  tenant: "Tenant",
};

function sourceLabel(row: PromptRow): string {
  if (!row.inherited) return "This scope";
  if (row.inheritedFrom === "platform") return "Inherited from platform";
  return "Inherited from global";
}

export default function PromptsPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(ROUTES.LOGIN);
    }
  }, [router, isAuthenticated]);

  const [selectedCategory, setSelectedCategory] = useState<
    (typeof CATEGORY_OPTIONS)[number]["value"]
  >(CATEGORY_OPTIONS[0].value);
  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [platformKey, setPlatformKey] = useState("");
  const [tId, setTId] = useState("");
  const [rows, setRows] = useState<PromptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [editRow, setEditRow] = useState<PromptRow | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const fetchPlatforms = async () => {
    try {
      const data = await get<PlatformOption[]>("/admin/platform-data");
      setPlatforms(data || []);
    } catch (e) {
      console.error("Error fetching platforms:", e);
    }
  };

  const fetchOrganizations = async (nextPlatformKey: string) => {
    if (!nextPlatformKey) {
      setOrganizations([]);
      return;
    }
    try {
      const data = await get<OrganizationOption[]>(`/admin/organization/${nextPlatformKey}`);
      setOrganizations(data || []);
    } catch (e) {
      console.error("Error fetching organizations:", e);
      setOrganizations([]);
    }
  };

  const fetchData = async (category: string, nextPlatformKey: string, nextTId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await post<{ data: PromptRow[] }>(API_ENDPOINTS.PROMPTS.PROMPTS_DATA, {
        type: category,
        ...(nextPlatformKey ? { platformKey: nextPlatformKey } : {}),
        ...(nextPlatformKey && nextTId ? { tId: nextTId } : {}),
      });
      setRows(response.data || []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch data";
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchPlatforms();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData(selectedCategory, platformKey, tId);
  }, [selectedCategory, platformKey, tId, isAuthenticated]);

  const onPlatformChange = (value: string) => {
    setPlatformKey(value);
    setTId("");
    fetchOrganizations(value);
  };

  const saveEdit = async () => {
    if (!editRow || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await patch<{ message?: string }>(API_ENDPOINTS.PROMPTS.PROMPT_UPDATE, {
        type: editRow.type,
        model: editRow.model,
        prompt: editContent,
        ...(platformKey ? { platformKey } : {}),
        ...(platformKey && tId ? { tId } : {}),
      });
      if (response) {
        setSuccessMessage(response.message || "Prompt saved successfully!");
        closeEdit();
        await fetchData(selectedCategory, platformKey, tId);
      }
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Failed to save prompt";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const resetOverride = async (row: PromptRow) => {
    if (!platformKey || row.inherited) return;
    const confirmed = window.confirm(
      `Remove the ${row.level} prompt for ${row.model}? This scope will use the inherited prompt.`,
    );
    if (!confirmed) return;
    setError(null);
    try {
      const response = await post<{ message?: string }>(API_ENDPOINTS.PROMPTS.PROMPT_RESET, {
        type: row.type,
        model: row.model,
        platformKey,
        ...(tId ? { tId } : {}),
      });
      setSuccessMessage(response.message || "Prompt override removed");
      await fetchData(selectedCategory, platformKey, tId);
    } catch (resetError) {
      const message =
        resetError instanceof Error ? resetError.message : "Failed to remove override";
      setError(message);
    }
  };

  const openEdit = (row: PromptRow) => {
    setEditRow(row);
    setEditContent(row.prompt ?? "");
  };

  const closeEdit = () => {
    setEditRow(null);
    setEditContent("");
  };

  const platformOptions = [
    { value: "", label: "Global default" },
    ...platforms.map((platform) => ({ value: platform.key, label: platform.name || platform.key })),
  ];

  const tenantOptions = [
    { value: "", label: "Platform default" },
    ...organizations
      .filter((org) => org.tId)
      .map((org) => ({
        value: org.tId,
        label: `${org.name || org.tId}${org.inactive ? " (inactive)" : ""} (${org.tId})`,
      })),
  ];

  const scopeLabel = !platformKey
    ? "Global default"
    : tId
      ? `Tenant ${tId}`
      : `Platform ${platformKey}`;

  return (
    <Layout
      title="Prompts"
      subtitle="Global, platform, and tenant prompts"
      actions={
        <button
          onClick={() => fetchData(selectedCategory, platformKey, tId)}
          disabled={loading}
          className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Refresh data"
        >
          {loading ? (
            <Loader type="dots" size="sm" variant="primary" />
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
        </button>
      }
    >
      <div className="space-y-6">
        {successMessage && (
          <Alert variant="success" duration={3} onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" && (
          <Alert variant="warning">
            <strong>Mock Data Mode:</strong> Using sample data instead of real API calls. Set{" "}
            <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_USE_MOCK_DATA=false</code> to
            use real API.
          </Alert>
        )}

        <Card>
          <CardContent>
            <div className="py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label htmlFor="category" className="text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) =>
                    setSelectedCategory(
                      e.target.value as (typeof CATEGORY_OPTIONS)[number]["value"],
                    )
                  }
                  disabled={loading}
                  className="h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f00a3] disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <SearchableSelect
                label="Platform"
                options={platformOptions}
                value={platformKey}
                onChange={onPlatformChange}
                placeholder="Global default"
              />
              <SearchableSelect
                label="Tenant"
                options={tenantOptions}
                value={tId}
                onChange={setTId}
                placeholder="Platform default"
                disabled={!platformKey}
                emptyMessage="No tenants found"
              />
            </div>
            <p className="pb-4 text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{scopeLabel}</span>. A tenant row
              is used when both platform and tenant are set. A platform row is used when only the
              platform is set. Otherwise chat and Monday analytics use the global default.
            </p>
            {error && (
              <div className="mt-2">
                <Alert variant="error">{error}</Alert>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tokens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Loader
                          type="dots"
                          size="lg"
                          variant="primary"
                          text="Loading prompts..."
                          centered
                        />
                      </td>
                    </tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-sm text-gray-500">
                        No data
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    rows?.map((row) => (
                      <tr
                        key={`${row.type}:${row.model}:${row.sourceId}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row?.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row?.model || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {LEVEL_LABEL[row.level] || row.level}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sourceLabel(row)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Number(row?.tokens) || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                          <button
                            className="text-blue-600 hover:text-blue-900 cursor-pointer"
                            onClick={() => openEdit(row)}
                          >
                            {row.inherited ? "Customize" : "Edit"}
                          </button>
                          {!row.inherited && row.level !== "global" && (
                            <button
                              className="text-red-600 hover:text-red-800 cursor-pointer"
                              onClick={() => resetOverride(row)}
                            >
                              Reset
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {editRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={closeEdit} />
            <div className="relative z-10 w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editRow.inherited ? "Save prompt override" : "Edit prompt"}
              </h3>
              {editRow.inherited && (
                <p className="mt-2 text-sm text-gray-500">
                  Saving stores a {LEVEL_LABEL[editRow.level].toLowerCase()} prompt for{" "}
                  {editRow.model}. The prompt this scope currently inherits stays unchanged.
                </p>
              )}

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editRow.type}
                    readOnly
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={editRow.model || "N/A"}
                    readOnly
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">Scope</label>
                  <input
                    type="text"
                    value={scopeLabel}
                    readOnly
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Prompt Content
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={12}
                  className="w-full rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1f00a3]"
                  placeholder="Enter prompt content..."
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-md text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-md text-sm bg-[#1f00a3] text-white hover:opacity-90 cursor-pointer disabled:opacity-50"
                  onClick={saveEdit}
                  disabled={saving || !editContent.trim()}
                >
                  {saving ? "Saving..." : editRow.inherited ? "Save override" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
