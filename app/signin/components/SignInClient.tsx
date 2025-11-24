"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { fadeUp } from "../../lib/motion";

export default function SignInClient() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/dashboard";
  const error = sp.get("error");
  const reduced = useReducedMotion();

  const errorText =
    error === "AccessDenied"
      ? "Your account is not allowed to sign in."
      : error === "OAuthAccountNotLinked"
      ? "That email is already linked to a different sign-in method."
      : error
      ? "Sign in failed. Please try again."
      : null;

  return (
    <main className="relative min-h-[100dvh] bg-gradient-to-b from-background via-background to-muted/40">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
        initial="hidden"
        animate="show"
        variants={fadeUp(reduced)}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-purple-500/15 blur-3xl"
        initial="hidden"
        animate="show"
        variants={fadeUp(reduced)}
      />

      <section className="mx-auto flex min-h-[100dvh] max-w-6xl items-center justify-center px-6 py-16">
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp(reduced)}
          className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm backdrop-blur"
        >
          <div className="mb-4 text-center">
            <Link href="/" className="text-2xl font-bold">
              Chef Context
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to continue
            </p>
          </div>

          <Separator className="my-4" />

          {errorText ? (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorText}
            </div>
          ) : null}

          <div className="space-y-3">
            <Button
              onClick={() =>
                signIn("google", { callbackUrl: "/dashboard", prompt: "select_account" })
              }
              className="cursor-pointer w-full transition-all duration-150 hover:shadow-md active:translate-y-[1px] active:scale-[0.98]"
            >
              <GoogleIcon className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
          </div>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>
              By continuing you agree to our{" "}
              <Link href="/docs" className="underline underline-offset-4">
                usage guidelines
              </Link>
              .
            </p>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.82-.07-1.64-.22-2.43H12v4.6h6.46a5.51 5.51 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.56-5.15 3.56-8.79z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.22 0 5.93-1.07 7.91-2.9l-3.86-3a7.32 7.32 0 0 1-4.05 1.17 7.02 7.02 0 0 1-6.64-4.86H1.4v3.06A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.36 14.41a7.27 7.27 0 0 1 0-4.82V6.53H1.4a12.02 12.02 0 0 0 0 10.94l3.96-3.06z"
      />
      <path
        fill="#EA4335"
        d="M12 4.74c1.74 0 3.3.6 4.53 1.77l3.39-3.39C17.92 1.08 15.2 0 12 0A12 12 0 0 0 1.4 6.53l3.96 3.06A7.02 7.02 0 0 1 12 4.74z"
      />
    </svg>
  );
}
