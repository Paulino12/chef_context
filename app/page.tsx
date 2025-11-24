"use client";

// app/page.tsx
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TOOLS } from "./lib/tools";
import ToolCard from "./components/tool-card";
import { fadeUp } from "./lib/motion";

export default function Home() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <main className="relative min-h-[100dvh] bg-gradient-to-b from-background via-background to-muted/40">
      <section className="mx-auto flex max-w-6xl flex-col items-center px-6 pb-20 pt-24 text-center sm:pt-28">
        {/* Badge */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp(prefersReducedMotion)}
          className="mb-5 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
        >
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          Production-ready tools
        </motion.div>

        {/* Title */}
        <motion.h1
          variants={fadeUp(prefersReducedMotion)}
          initial="hidden"
          animate="show"
          className="text-balance bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl"
        >
          Chef Context
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp(prefersReducedMotion)}
          initial="hidden"
          animate="show"
          className="mt-4 max-w-2xl text-pretty text-muted-foreground sm:text-lg"
        >
          Your control room for Chefs: create daily menus and analyze supplier
          invoices — fast, accurate, and audit-friendly.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp(prefersReducedMotion)}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button asChild size="lg" className="px-6">
            <Link href="/dashboard">Open Dashboard</Link>
          </Button>

          <Button asChild size="lg" variant="outline" className="px-6">
            <Link
              href="https://github.com/Paulino12/generate-menus#readme"
              target="_blank"
            >
              View Docs
            </Link>
          </Button>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp(prefersReducedMotion)}
          className="mt-10 w-full max-w-3xl"
        >
          <Separator />
        </motion.div>

        {/* Feature cards (quick links) */}
        <motion.div
          variants={fadeUp(prefersReducedMotion)}
          initial="hidden"
          animate="show"
          className="mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2"
        >
          {TOOLS.map((tool) => (
            <ToolCard
              key={tool.id}
              title={tool.title}
              detail={tool.detail}
              href={tool.href}
              description={tool.description}
            />
          ))}
        </motion.div>

        {/* footer note */}
        <motion.p
          variants={fadeUp(prefersReducedMotion)}
          initial="hidden"
          animate="show"
          className="mt-10 text-xs text-muted-foreground"
        >
          © 2025 by Paulino @ MaryOctav Digital
        </motion.p>
      </section>
    </main>
  );
}
