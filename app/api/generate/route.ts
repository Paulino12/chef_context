export const runtime = "nodejs";

export async function POST(req: Request) {
  const api = process.env.FASTAPI_URL!;
  const target = api.replace(/\/+$/, "") + "/generate";

  const form = await req.formData();
  const upstream = await fetch(target, {
    method: "POST",
    body: form,
    // @ts-expect-error: Node fetch streaming
    duplex: "half",
  });

  if (!upstream.ok) {
    return new Response(await upstream.text(), { status: upstream.status });
  }

  // Pass through headers and force no-store
  const headers = new Headers();
  upstream.headers.forEach((v, k) => headers.set(k, v));
  if (!headers.get("content-type")) headers.set("content-type", "application/zip");
  headers.set("cache-control", "no-store");  // <-- important in prod

  return new Response(upstream.body, { status: upstream.status, headers });
}
