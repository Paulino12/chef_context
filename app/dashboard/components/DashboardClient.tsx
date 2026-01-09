"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import ToolCard from "@/app/components/tool-card"; // ok if ToolCard is client; if it's server-only, see note below.
import { LAYOUT } from "@/app/lib/ui";
import { fadeUp } from "../../lib/motion";

type Tool = {
  id: number;
  title: string;
  detail: string;
  href: string;
  description: string;
};

type Props = {
  name: string;
  tools: Tool[];
};

export default function DashboardClient({ tools }: Props) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={fadeUp(prefersReducedMotion)}
    >
      <div
        className={[
          "mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2",
          LAYOUT.CONTENT_MAX_W, // max width scales at lg
          LAYOUT.SECTION_GAP,
        ].join(" ")}
      >
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            title={tool.title}
            detail={tool.detail}
            href={tool.href}
            description={tool.description}
          />
        ))}
      </div>
    </motion.div>
  );
}
