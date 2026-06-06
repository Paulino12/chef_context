"use client";

import { motion, useReducedMotion } from "framer-motion";

import ToolCard from "@/app/components/tool-card";
import { Tool } from "@/app/lib/tools";
import { fadeUp } from "@/app/lib/motion";

type Props = {
  name: string;
  tools: Tool[];
};

export default function DashboardClient({ name, tools }: Props) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={fadeUp(prefersReducedMotion)}
      className="space-y-8"
    >
      <section className="surface-panel rounded-xl border border-white/40 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex w-fit rounded-full border border-border/70 bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Tools dashboard
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold sm:text-4xl">
                Welcome, {name}
              </h1>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                Launch the chef tools in your workspace from one consistent
                control point.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/75 px-4 py-3 text-sm text-muted-foreground">
            {tools.length} tools connected
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
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
      </section>
    </motion.div>
  );
}
