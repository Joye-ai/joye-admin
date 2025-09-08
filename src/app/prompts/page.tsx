"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardContent, Loader } from "@/components/ui";
import { API_ENDPOINTS, ROUTES } from "@/constants";
import { post, patch } from "@/helpers/api";
import { useAppSelector } from "@/store";

type PromptRow = {
  _id: string | number;
  model: string;
  type: string;
  tokens: number;
  prompt?: string;
};

const CATEGORY_OPTIONS = [
  { label: "Brew", value: "brew" },
  { label: "Mindful Minute", value: "mindful-minute" },
  { label: "Quick JL", value: "quick-jl" },
  { label: "BYB", value: "byb" },
] as const;

export default function PromptsPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(ROUTES.LOGIN);
    }
  }, [router, isAuthenticated]);

  const [selectedCategory, setSelectedCategory] = useState<
    (typeof CATEGORY_OPTIONS)[number]["value"]
  >(CATEGORY_OPTIONS[0].value);
  const [rows, setRows] = useState<PromptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editRow, setEditRow] = useState<PromptRow | null>(null);
  const [editContent, setEditContent] = useState<string>("");

  const fetchData = async (category: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await post<{ data: PromptRow[] }>(API_ENDPOINTS.PROMPTS.PROMPTS_DATA, {
        type: category,
      });
      setRows(response.data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch data";
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    try {
      const response = await patch(API_ENDPOINTS.PROMPTS.PROMPT_UPDATE, {
        _id: editRow._id,
        prompt: editContent,
      });
      setRows((prev) =>
        prev.map((r) => (r._id === editRow._id ? { ...r, prompt: editContent } : r)),
      );
      if (response) {
        closeEdit();
      }
    } catch (error) {
      console.log("SaveEdit Error: ", error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData(selectedCategory);
  }, [selectedCategory, isAuthenticated]);

  const openEdit = (row: PromptRow) => {
    setEditRow(row);
    setEditContent(row.prompt ?? "");
  };

  const closeEdit = () => {
    setEditRow(null);
    setEditContent("");
  };

  return (
    <Layout
      title="Prompts"
      subtitle="Filter and manage prompts"
      actions={
        <button
          onClick={() => fetchData(selectedCategory)}
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
        {/* Mock Data Indicator */}
        {process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Mock Data Mode:</strong> Using sample data instead of real API calls. Set{" "}
                  <code className="bg-yellow-100 px-1 rounded">
                    NEXT_PUBLIC_USE_MOCK_DATA=false
                  </code>{" "}
                  to use real API.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent>
            <div className="py-4">
              <div className="flex flex-col max-w-xs">
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
            </div>
            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          </CardContent>
        </Card>

        {/* Table */}
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
                      <td colSpan={4} className="px-6 py-12 text-center">
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
                      <td colSpan={4} className="px-6 py-6 text-center text-sm text-gray-500">
                        No data
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    rows?.map((row) => (
                      <tr key={row?._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row?.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row?.model || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Number(row?.tokens) || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            className="text-blue-600 hover:text-blue-900 cursor-pointer"
                            onClick={() => openEdit(row)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Modal */}
        {editRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={closeEdit} />
            <div className="relative z-10 w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900">Edit Prompt</h3>

              {/* Readonly Fields */}
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
                  <label className="text-sm font-medium text-gray-700 mb-1">Tokens</label>
                  <input
                    type="text"
                    value={Number(editRow.tokens) || 0}
                    readOnly
                    className="h-10 rounded-md border border-gray-300 px-3 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Editable Content */}
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
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-md text-sm bg-[#1f00a3] text-white hover:opacity-90 cursor-pointer"
                  onClick={saveEdit}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
