"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import BudgetAnalyzerUploads from "./components/BudgetAnalyzerUploads";

export default function BudgetAnalyzerPage() {
  return (
    <AnimatePresence>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 1,
          delay: 0.1,
          ease: "easeInOut",
        }}
        className="container mx-auto max-w-5xl "
      >
        <BudgetAnalyzerUploads />
      </motion.main>
    </AnimatePresence>
  );
}
