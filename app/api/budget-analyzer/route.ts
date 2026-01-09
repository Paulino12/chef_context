// app/api/budget-analyzer/route.ts
//
// Budget Analyzer proxy route (Next.js -> FastAPI backend).
// - Uses NextAuth session check (same pattern as invoice-analyzer route.ts)
// - Accepts multipart/form-data with:
//    - file: File (required)
//    - kind: "outstanding-orders" | "invoices" (optional; defaults to "outstanding-orders")
// - Forwards the upload to your FastAPI backend endpoint:
//
//      POST {BACKEND_URL}{PATH}
//
// Where PATH depends on "kind".
// This keeps your Next.js app as a secure gateway (auth + optional API key),
// while the Python backend does the heavy parsing work.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// Use separate env vars so invoice analyzer + budget analyzer can evolve independently.
const BACKEND_URL = process.env.BUDGET_BACKEND_URL!; // e.g. https://your-budget-service.onrender.com
const API_KEY = process.env.BUDGET_BACKEND_KEY || ""; // optional

export const runtime = "nodejs"; // ensure Node runtime for FormData/file handling

// Map UI "kind" -> backend endpoint.
// Adjust these paths to match your FastAPI routes.
const KIND_TO_PATH: Record<string, string> = {
  "outstanding-orders": "/outstanding-orders/summary",
  outstanding_orders: "/outstanding-orders/summary",
  outstanding: "/outstanding-orders/summary",

  invoices: "/invoices/analyze", // placeholder for later
};

function normalizeKind(v: unknown): string {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s || "outstanding-orders";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  try {
    const formData = await req.formData();

    // "kind" lets ONE Next route support multiple analyzers without extra folders.
    const kind = normalizeKind(formData.get("kind"));
    const path = KIND_TO_PATH[kind] ?? KIND_TO_PATH["outstanding-orders"];

    // Expect a single uploaded file in field "file"
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded (field 'file')." },
        { status: 400 }
      );
    }

    // Important: re-create FormData so we control exactly what goes to backend
    // (and avoid leaking other fields you may add later).
    const fdata = new FormData();
    fdata.append("file", file, file.name);

    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: API_KEY ? { "x-api-key": API_KEY } : undefined,
      body: fdata,
    });

    if (!res.ok) {
      // Backend should return { error: "..." }, but keep this defensive.
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.error || "Backend error" },
        { status: res.status }
      );
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: `${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
