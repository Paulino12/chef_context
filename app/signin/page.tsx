// app/signin/page.tsx (Server Component)
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getServerAccessSession } from "@/lib/supabase/serverSession";
import SignInClient from "./components/SignInClient";

export const metadata: Metadata = {
  title: "Sign in • Chef Context",
  description: "Secure sign in to Chef Context.",
};

// Optional: ensure this page is always dynamic (useful for auth flows)
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    callbackUrl?: string | string[];
  }>;
};

function getSafeCallbackUrl(callbackUrl: string | string[] | undefined) {
  const value = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;
  return value?.startsWith("/") ? value : "/dashboard";
}

export default async function Page({ searchParams }: PageProps) {
  const session = await getServerAccessSession();
  if (session) {
    const params = searchParams ? await searchParams : {};
    redirect(getSafeCallbackUrl(params.callbackUrl));
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <SignInClient />
    </Suspense>
  );
}
