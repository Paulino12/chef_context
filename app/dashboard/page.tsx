"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TOOLS } from "../lib/tools";
import { NavLink } from "../components/nav-link";
import ToolCard from "../components/tool-card";

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
        className="w-full mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {TOOLS.map((Tool) => (
          <NavLink
            key={Tool.id}
            href={Tool.href}
            className="border rounded-md hover:bg-accent/50 transition-colors flex-1"
          >
            <ToolCard title={Tool.title} description={Tool.description} />
          </NavLink>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default page;
