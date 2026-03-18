"use client";

import { motion } from "framer-motion";
import { BookOpen, BarChart3, TrendingUp, Database } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export type DashboardTab = "sources" | "cards" | "retention" | "stats";

interface DashboardSidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const tabs = [
  { id: "sources" as const, label: "Sources", icon: BookOpen },
  { id: "cards" as const, label: "Cards", icon: Database },
  { id: "retention" as const, label: "Retention", icon: TrendingUp },
  { id: "stats" as const, label: "Stats", icon: BarChart3 },
];

export default function DashboardSidebar({
  activeTab,
  onTabChange,
}: DashboardSidebarProps) {
  return (
    <div className="w-64 bg-gradient-to-b from-card to-card/90 border-r border-border/50 h-full flex flex-col">
      <div className="p-8 flex-1">
        <div className="mb-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Recall
          </h2>
          <p className="text-xs text-muted-foreground">Learning Dashboard</p>
        </div>
        <nav className="space-y-1 mt-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
                whileHover={{ scale: 1.03, x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>
      <div className="p-6 border-t border-border/50 flex items-center justify-center bg-secondary/30">
        <ThemeToggle />
      </div>
    </div>
  );
}
