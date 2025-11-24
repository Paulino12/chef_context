// app/signin/page.tsx (Server Component)
import type { Metadata } from "next";
import { Suspense } from "react";
import SignInClient from "./components/SignInClient";

export const metadata: Metadata = {
  title: "Sign in • Chef Context",
  description: "Secure sign in to Chef Context.",
};

// Optional: ensure this page is always dynamic (useful for auth flows)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
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
