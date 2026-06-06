"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { fadeUp } from "../../lib/motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignInClient() {
  const sp = useSearchParams();
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
    <main className="mx-auto max-w-xl px-4 pb-16 pt-10 sm:px-6">
      <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp(reduced)}
        >
        <Card className="surface-panel border-white/40">
          <CardHeader className="space-y-2">
            <CardTitle className="text-3xl">Sign in</CardTitle>
            <CardDescription>
              Use your Chef Context account to open the tools dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorText ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorText}
              </div>
            ) : null}

            <Button
              onClick={() =>
                signIn("google", {
                  callbackUrl: "/dashboard",
                  prompt: "select_account",
                })
              }
              className="w-full"
            >
              <GoogleIcon className="h-4 w-4" />
              Sign in with Google
            </Button>

            <p className="text-xs leading-5 text-muted-foreground">
              By continuing you agree to the{" "}
              <Link href="/docs" className="link-hover">
                usage guidelines
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </motion.div>
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
