'use client';

import InvoiceAnalyzerUpload from "./components/InvoiceAnalyzerUpload";
import { motion, AnimatePresence } from "framer-motion";

export default function Page() {
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
        <InvoiceAnalyzerUpload />
      </motion.main>
    </AnimatePresence>
  );
}
