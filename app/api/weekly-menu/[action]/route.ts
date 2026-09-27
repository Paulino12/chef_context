import { NextRequest } from "next/server";
import { getServerAccessSession } from "@/lib/supabase/serverSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// An explicit allowlist prevents this route becoming a general-purpose proxy.
// The existing daily API settings and routes are intentionally independent.
const endpoints: Record<string, { path: string; method: string }> = {
  editor: { path: "/", method: "GET" }, example: { path: "/example", method: "GET" },
  health: { path: "/health", method: "GET" }, parse: { path: "/parse", method: "POST" },
  export: { path: "/export", method: "POST" },
};
const noStore = { "Cache-Control": "private, no-store" };
function failure(detail: string, status: number) { return Response.json({ detail }, { status, headers: noStore }); }

async function proxy(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  if (!(await getServerAccessSession())) return failure("Please sign in to Chef Context again.", 401);
  const { action } = await context.params;
  const endpoint = endpoints[action];
  if (!endpoint || endpoint.method !== request.method) return failure("Unknown weekly menu action.", 404);
  const origin = request.headers.get("origin");
  if (request.method === "POST" && origin && origin !== request.nextUrl.origin) return failure("Request origin not allowed.", 403);
  const configured = process.env.WEEKLY_MENU_API_URL?.trim();
  const base = configured || (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8001" : "");
  if (!base) return failure("The weekly generator has not been connected yet.", 503);
  const key = process.env.WEEKLY_MENU_API_KEY?.trim() || "";
  if (process.env.NODE_ENV === "production" && !key) return failure("The weekly generator connection is not configured.", 503);
  try {
    const body = request.method === "POST" ? await request.text() : undefined;
    // Bound the payload before forwarding it. A complete week is well below 1 MB.
    if (body && Buffer.byteLength(body, "utf8") > 1_000_000) return failure("Menu text is too large.", 413);
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (key) headers["x-weekly-menu-key"] = key;
    const upstream = await fetch(base.replace(/\/+$/, "") + endpoint.path, {
      method: endpoint.method, body, headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(50000),
    });
    if (!upstream.ok && upstream.status !== 422) return failure("The weekly generator is unavailable. Please try again shortly.", 503);
    // Forward only required headers. Never copy backend cookies or credentials.
    const responseHeaders = new Headers(noStore);
    for (const name of ["content-type", "content-disposition"]) {
      const value = upstream.headers.get(name); if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    if (action === "editor") responseHeaders.set("X-Frame-Options", "SAMEORIGIN");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return failure("The weekly generator could not be reached. Please try again shortly.", 503);
  }
}
export const GET = proxy;
export const POST = proxy;
