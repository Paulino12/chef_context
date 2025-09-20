// app/api/generate/route.ts
export const runtime = "nodejs"; // ensure Node runtime (not edge)

export async function POST(req: Request) {
  const FASTAPI_URL = process.env.FASTAPI_URL!;
  const target = `${FASTAPI_URL.replace(/\/+$/, "")}/generate`;

  // Parse the incoming multipart into FormData so we can resend it cleanly
  const form = await req.formData();

  // Forward to FastAPI. Important for Node/undici when sending a body stream:
  const res = await fetch(target, {
    method: "POST",
    body: form as any,
    // @ts-ignore - required by undici when streaming a request body
    duplex: "half",
  });

  if (!res.ok) {
    // surface FastAPI error details to your browser alert
    const text = await res.text();
    return new Response(text || "Upstream error", { status: res.status });
  }

  // Pass-through response (ZIP) + headers
  const headers = new Headers(res.headers);
  if (!headers.get("Content-Type"))
    headers.set("Content-Type", "application/zip");
  if (!headers.get("Content-Disposition"))
    headers.set("Content-Disposition", 'attachment; filename="menus.zip"');

  return new Response(res.body, { status: res.status, headers });
}
