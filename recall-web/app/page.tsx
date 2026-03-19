"use client";

import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-8 w-full"
      >
        <div className="inline-flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-2xl font-bold">R</span>
          </div>
          <span className="text-2xl font-bold text-foreground tracking-tightest">RECALL</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tightest text-center max-w-xl">
          Study smarter with spaced repetition
        </h1>
        <div className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
          Generate personalized MCQs and flash cards from your notes.
        </div>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Open Dashboard &rarr;
        </a>
      </motion.div>
    </div>
  );
}