"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

import { fadeUp } from "@/app/lib/motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  buildBrowserRedirectUrl,
  clearServerAuthSession,
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
  syncServerAuthSession,
} from "@/lib/supabase/browserClient";

function getPostSignInStatus(nextPath: string) {
  if (nextPath.startsWith("/dashboard/tools")) {
    return "Opening your tool...";
  }

  if (nextPath.startsWith("/dashboard")) {
    return "Opening your dashboard...";
  }

  return "Opening Chef Context...";
}

function Notice({
  variant,
  children,
}: {
  variant: "success" | "error" | "neutral";
  children: React.ReactNode;
}) {
  const className =
    variant === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : variant === "error"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-border bg-muted/60 text-muted-foreground";

  return <div className={`rounded-lg border px-3 py-2 text-sm ${className}`}>{children}</div>;
}

export default function SignInClient() {
  const searchParams = useSearchParams();
  const reduced = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [redirectingMessage, setRedirectingMessage] = useState("");

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const confirmed = searchParams.get("confirmed") === "1";
  const resetStatus = (searchParams.get("reset") ?? "").trim();

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setRedirectingMessage("");

    if (!supabase || !isSupabaseBrowserConfigured()) {
      setError(
        "Missing Supabase env config. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    setLoading(true);
    let shouldReleaseLoading = true;
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message || "Failed to sign in");
        return;
      }

      if (!data.session?.access_token) {
        setError("Sign in succeeded but no access token was returned.");
        return;
      }

      await syncServerAuthSession(data.session);
      const requestedNext = searchParams.get("callbackUrl")?.trim() ?? "";
      const nextPath = requestedNext.startsWith("/") ? requestedNext : "/dashboard";
      setRedirectingMessage(`Signed in successfully. ${getPostSignInStatus(nextPath)}`);
      shouldReleaseLoading = false;
      window.location.assign(nextPath);
    } finally {
      if (shouldReleaseLoading) setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setMessage("");
    setError("");

    if (!supabase || !isSupabaseBrowserConfigured()) {
      setError(
        "Missing Supabase env config. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    if (!email.trim()) {
      setError("Enter your email address first, then request a password reset.");
      return;
    }

    setRecoveryLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: buildBrowserRedirectUrl("/reset-password"),
        },
      );

      if (resetError) {
        setError(resetError.message || "Failed to send password reset email");
        return;
      }

      await clearServerAuthSession();
      setMessage("Password reset email sent. Check your inbox for the secure reset link.");
    } finally {
      setRecoveryLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-10 sm:px-6">
      <motion.div initial="hidden" animate="show" variants={fadeUp(reduced)}>
        <Card className="surface-panel border-white/40">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl">Sign in</CardTitle>
            <CardDescription>
              Use your email and password to open the tools dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {confirmed ? (
              <Notice variant="success">Email confirmed. You can sign in now.</Notice>
            ) : null}
            {resetStatus === "success" ? (
              <Notice variant="success">
                Password updated. Sign in with your new password.
              </Notice>
            ) : null}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={loading} aria-busy={loading || undefined}>
                  {redirectingMessage
                    ? "Opening..."
                    : loading
                      ? "Signing in..."
                      : "Sign in"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || recoveryLoading}
                  aria-busy={recoveryLoading || undefined}
                  onClick={handleForgotPassword}
                >
                  {recoveryLoading ? "Sending reset..." : "Forgot password?"}
                </Button>
                <Link href="/signup" className="link-hover text-sm">
                  Create account
                </Link>
              </div>
            </form>

            {redirectingMessage ? (
              <Notice variant="neutral">{redirectingMessage}</Notice>
            ) : null}
            {!redirectingMessage && message ? (
              <Notice variant="success">{message}</Notice>
            ) : null}
            {error ? <Notice variant="error">{error}</Notice> : null}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
