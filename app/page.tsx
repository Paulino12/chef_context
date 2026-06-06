"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import ToolCard from "@/app/components/tool-card";
import { TOOLS } from "@/app/lib/tools";
import { fadeUp } from "@/app/lib/motion";
import { Button } from "@/components/ui/button";

export default function Home() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <motion.section
        initial="hidden"
        animate="show"
        variants={fadeUp(prefersReducedMotion)}
        className="surface-panel overflow-hidden rounded-xl border border-white/40 shadow-xl shadow-black/5"
      >
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:items-end">
          <div className="max-w-2xl space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border/70 bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                Head chef tools
              </span>
              <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                Scalable workspace
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
                Chef Context
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                A single workspace for the chef tools you use now, and the
                ones you add next.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/signin">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {TOOLS.slice(0, 2).map((tool) => (
              <div
                key={tool.id}
                className="rounded-xl border border-border/70 bg-background/75 p-4 shadow-sm"
              >
                <p className="text-sm font-medium">{tool.title}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {tool.detail}
                </p>
              </div>
            ))}
            <div className="rounded-xl border border-primary/20 bg-secondary/70 p-4 shadow-sm sm:col-span-2">
              <p className="text-sm font-medium">Recipe Platform</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Connected as a launch card for the wider tools ecosystem.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        animate="show"
        variants={fadeUp(prefersReducedMotion)}
        className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        {TOOLS.map((tool) => (
          <ToolCard
            key={tool.id}
            title={tool.title}
            detail={tool.detail}
            href={tool.href}
            description={tool.description}
            cta={tool.cta}
            external={tool.external}
            status={tool.status}
          />
        ))}
      </motion.section>
    </main>
  );
}
