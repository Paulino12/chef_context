import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // must be node runtime for file streaming

const BACKEND_URL = process.env.BUDGET_BACKEND_URL!; // e.g. http://localhost:10001
const API_KEY = process.env.BUDGET_BACKEND_KEY || ""; // optional

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded (field 'file')." }, { status: 400 });
    }

    // Forward to FastAPI export endpoint
    const upstream = await fetch(`${BACKEND_URL}/invoices/export-xlsx`, {
      method: "POST",
      headers: API_KEY ? { "x-api-key": API_KEY } : undefined,
      body: (() => {
        const fd = new FormData();
        fd.append("file", file, file.name);
        return fd;
      })(),
    });

    if (!upstream.ok) {
      // Try read JSON error; fallback to text
      const contentType = upstream.headers.get("content-type") || "";
      const errBody = contentType.includes("application/json")
        ? await upstream.json().catch(() => ({}))
        : { error: await upstream.text().catch(() => "Export failed.") };

      return NextResponse.json(
        { error: errBody?.detail || errBody?.error || "Export failed." },
        { status: upstream.status }
      );
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const filename =
      upstream.headers
        .get("content-disposition")
        ?.match(/filename="?(.*?)"?$/i)?.[1] || "invoices_export.xlsx";

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
