// Forwards the uploaded ZIP to the FastAPI backend on Render.
// Uses edge-compatible fetch with streaming FormData passthrough.

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.INVOICE_BACKEND_URL!; // e.g. https://your-service.onrender.com
const API_KEY = process.env.INVOICE_BACKEND_KEY || ""; // optional

export const runtime = "nodejs"; // ensure Node runtime for FormData/file

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded (field 'file')." }, { status: 400 });
    }

    const fdata = new FormData();
    fdata.append("file", file, file.name);

    const res = await fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      headers: API_KEY ? { "x-api-key": API_KEY } : undefined,
      body: fdata,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || "Backend error" }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (e: unknown) {
    return NextResponse.json({ error: `${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
  }
}
