import { NextRequest, NextResponse } from "next/server";
import { getServerAccessSession } from "@/lib/supabase/serverSession";

const BACKEND_URL = process.env.BUDGET_BACKEND_URL!;
const API_KEY = process.env.BUDGET_BACKEND_KEY || "";
const JOBS_PATH = process.env.BUDGET_BACKEND_JOBS_PATH || "/jobs";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const session = await getServerAccessSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { jobId } = await context.params;
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");

  const base = BACKEND_URL.replace(/\/+$/, "");
  const jobsPath = JOBS_PATH.startsWith("/") ? JOBS_PATH : `/${JOBS_PATH}`;
  const target = new URL(`${base}${jobsPath}/${encodeURIComponent(jobId)}`);
  if (kind) target.searchParams.set("kind", kind);

  try {
    const res = await fetch(target, {
      method: "GET",
      headers: API_KEY ? { "x-api-key": API_KEY } : undefined,
      cache: "no-store",
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { error: body?.error || body?.detail || "Backend job status error" },
        { status: res.status }
      );
    }

    return NextResponse.json(body);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: `${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
