"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TOOLS } from "../lib/tools";
import { NavLink } from "../components/nav-link";
import ToolCard from "../components/tool-card";
import { LAYOUT } from "../lib/ui";

const page = () => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 1,
          delay: 0.1,
          ease: "easeInOut",
        }}
        className={[
          "mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2",
          LAYOUT.CONTENT_MAX_W, // max width scales at lg
          LAYOUT.SECTION_GAP,
        ].join(" ")}
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
    </AnimatePresence>
  );
};

export default page;
