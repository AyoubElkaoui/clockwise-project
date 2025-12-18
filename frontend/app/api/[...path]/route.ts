// app/api/[...path]/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RAW_BACKEND = process.env.BACKEND_URL || process.env.INTERNAL_API_URL || "";

function normalizeBase(url: string) {
  // Remove trailing slash and optional trailing /api
  return url.replace(/\/$/, "").replace(/\/api$/, "");
}

function filterResponseHeaders(headers: Headers) {
  // Avoid invalid hop-by-hop headers
  const out = new Headers(headers);
  out.delete("content-encoding"); // Vercel may recompress
  out.delete("content-length");
  out.delete("transfer-encoding");
  out.delete("connection");
  return out;
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  if (!RAW_BACKEND) {
    console.error("BACKEND_URL / INTERNAL_API_URL not set, cannot proxy");
    return NextResponse.json({ error: "Configuration error" }, { status: 500 });
  }

  const base = normalizeBase(RAW_BACKEND);
  console.log('RAW_BACKEND:', RAW_BACKEND);
  console.log('base:', base);
  const path = params.path?.join("/") ?? "";
  const search = new URL(req.url).search; // includes ?...
  const upstreamUrl = `${base}/api/${path}${search}`;

  // Build upstream headers (forward only what you need)
  const headers = new Headers();
  headers.set("ngrok-skip-browser-warning", "1");

  const medew = req.headers.get("x-medew-gc-id");
  if (medew) headers.set("x-medew-gc-id", medew);

  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);

  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  console.log("[proxy]", req.method, req.nextUrl.pathname + req.nextUrl.search, "->", upstreamUrl);

  const upstreamRes = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
    cache: "no-store",
    redirect: "manual",
  });

  console.error("[proxy debug] Upstream failed?", upstreamRes.status, upstreamRes.headers.get("content-type"));
  if (!upstreamRes.ok) {
    const bodyText = await upstreamRes.text();
    console.error("[proxy debug] Upstream body:", bodyText.substring(0, 500));
  }

  console.log(
    "[proxy upstream]",
    upstreamRes.status,
    upstreamRes.headers.get("content-type") || "(no content-type)"
  );

  // Return upstream body as-is (no .json() / .text() parsing)
  const resHeaders = filterResponseHeaders(upstreamRes.headers);
  resHeaders.set("cache-control", "no-store");

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: resHeaders,
  });
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}
export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}
export async function PUT(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}
export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params);
}

// Herhaal voor PUT, DELETE, etc. als nodig