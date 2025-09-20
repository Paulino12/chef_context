export const runtime = "nodejs";
type NodeFetchInit = RequestInit & { duplex?: "half" };

export async function POST(req: Request) {
  const api = process.env.FASTAPI_URL!;
  const target = `${api.replace(/\/+$/, "")}/generate`;

  const form = await req.formData();
  const res = await fetch(target, {
    method: "POST",
    body: form,
    duplex: "half",
  } as NodeFetchInit);

  if (!res.ok) return new Response(await res.text(), { status: res.status });

  // Pass upstream headers straight through
  const headers = new Headers();
  // copy all headers from upstream
  res.headers.forEach((v, k) => headers.set(k, v));
  // ensure content-type at least
  if (!headers.get("content-type"))
    headers.set("content-type", "application/zip");
  // DO NOT set a default content-disposition here if upstream provided it

  return new Response(res.body, { status: res.status, headers });
}
