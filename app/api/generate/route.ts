export const runtime = "nodejs";

type NodeFetchInit = RequestInit & { duplex?: "half" };

export async function POST(req: Request) {
  const api = process.env.FASTAPI_URL as string;
  const target = `${api.replace(/\/+$/, "")}/generate`;

  const form: FormData = await req.formData();

  // include duplex in the type so TS/ESLint are happy
  const init: NodeFetchInit = {
    method: "POST",
    body: form,
    duplex: "half",
  };

  const res = await fetch(target, init);

  if (!res.ok) {
    const text = await res.text();
    return new Response(text || "Upstream error", { status: res.status });
  }

  const headers = new Headers(res.headers);
  if (!headers.get("Content-Type"))
    headers.set("Content-Type", "application/zip");
  if (!headers.get("Content-Disposition"))
    headers.set("Content-Disposition", 'attachment; filename="menus.zip"');

  return new Response(res.body, { status: res.status, headers });
}
