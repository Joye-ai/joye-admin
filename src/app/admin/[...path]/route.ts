import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminApiUrl = (process.env.ADMIN_API_URL || "http://localhost:8081").replace(/\/$/, "");

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const targetPath = path?.length ? path.join("/") : "";
  const url = new URL(req.url);
  const targetUrl = `${adminApiUrl}/admin/${targetPath}${url.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "host" || lower === "connection" || lower === "content-length") return;
    headers.set(key, value);
  });
  // Bypass ngrok free-tier browser interstitial when proxying server-side.
  headers.set("ngrok-skip-browser-warning", "true");

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(targetUrl, init);
  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "transfer-encoding" || lower === "connection") return;
    responseHeaders.set(key, value);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, context: RouteContext) {
  return proxy(req, context);
}

export async function POST(req: NextRequest, context: RouteContext) {
  return proxy(req, context);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return proxy(req, context);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return proxy(req, context);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  return proxy(req, context);
}

export async function OPTIONS(req: NextRequest, context: RouteContext) {
  return proxy(req, context);
}
