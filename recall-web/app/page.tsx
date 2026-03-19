"use client";

import { motion } from "framer-motion";
import DashboardPreview from "@/components/landing/DashboardPreview";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center pt-16 pb-8 px-4"
      >
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-lg font-bold">R</span>
          </div>
          <span className="text-xl font-bold text-foreground tracking-tightest">RECALL</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tightest max-w-2xl mx-auto">
          Study smarter with spaced repetition
        </h1>
        <div className="text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
          Generate personalized MCQs and flash cards from your notes. Review at the optimal time for maximum retention.
        </div>
      </motion.div>
      <div className="flex-1 flex items-start justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl"
        >
          <DashboardPreview />
        </motion.div>
      </div>
    </div>
  );
}