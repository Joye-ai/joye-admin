"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log full error for debugging
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  const stackLine = (error.stack || "").split("\n").find((l) => l.includes("src/")) || "";

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
          <div className="max-w-2xl w-full bg-white border border-red-200 rounded-lg p-6 shadow">
            <h2 className="text-lg font-semibold text-red-700">Something went wrong</h2>
            <p className="mt-2 text-sm text-gray-700 break-words">{error.message}</p>
            {stackLine && <p className="mt-2 text-xs text-gray-500">Source: {stackLine.trim()}</p>}
            {error.digest && <p className="mt-1 text-xs text-gray-400">Digest: {error.digest}</p>}
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="px-3 py-2 rounded-md text-sm bg-[#1f00a3] text-white hover:opacity-90"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = "/")}
                className="px-3 py-2 rounded-md text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
