"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  createSupabaseBrowserClient,
  isSupabaseBrowserConfigured,
  syncServerAuthSession,
} from "@/lib/supabase/browserClient";

function Notice({
  variant,
  children,
}: {
  variant: "success" | "error";
  children: React.ReactNode;
}) {
  const className =
    variant === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : "border-destructive/30 bg-destructive/10 text-destructive";

  return <div className={`rounded-lg border px-3 py-2 text-sm ${className}`}>{children}</div>;
}

export default function SignUpPage() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!supabase || !isSupabaseBrowserConfigured()) {
      setError(
        "Missing Supabase env config. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: buildBrowserRedirectUrl("/signin?confirmed=1"),
        },
      });

      if (signUpError) {
        setError(signUpError.message || "Failed to create account");
        return;
      }

      if (data.session?.access_token) {
        await syncServerAuthSession(data.session);
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setMessage(
        "Account created. Check your email to confirm your address, then return here to sign in.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-10 sm:px-6">
      <motion.div initial="hidden" animate="show" variants={fadeUp(reduced)}>
        <Card className="surface-panel border-white/40">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl">Create account</CardTitle>
            <CardDescription>
              Create your Chef Context account, then open the tools dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
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
                  autoComplete="new-password"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={loading} aria-busy={loading || undefined}>
                  {loading ? "Creating..." : "Create account"}
                </Button>
                <Link href="/signin" className="link-hover text-sm">
                  Already have an account?
                </Link>
              </div>
            </form>

            {message ? <Notice variant="success">{message}</Notice> : null}
            {error ? <Notice variant="error">{error}</Notice> : null}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
