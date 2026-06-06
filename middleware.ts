import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function getRedirectResponse(req: NextRequest) {
  const signInUrl = req.nextUrl.clone();
  signInUrl.pathname = "/signin";
  signInUrl.search = "";
  signInUrl.searchParams.set(
    "callbackUrl",
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
  );
  return NextResponse.redirect(signInUrl);
}

function getUnauthorizedResponse(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return getRedirectResponse(req);
}

export default async function middleware(req: NextRequest) {
  const supabaseEnv = getSupabasePublicEnv();
  const accessToken = req.cookies.get("sb-access-token")?.value?.trim() || "";

  if (!supabaseEnv || !accessToken) {
    return getUnauthorizedResponse(req);
  }

  const supabase = createClient(supabaseEnv.url, supabaseEnv.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const userResult = await supabase.auth.getUser(accessToken);
  if (userResult.error || !userResult.data.user) {
    return getUnauthorizedResponse(req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/invoice-analyzer/:path*",
    "/api/generate/:path*",
    "/api/budget-analyzer/:path*",
  ],
};
