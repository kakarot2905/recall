"use client";

import { motion } from "framer-motion";
import { BookOpen, BarChart3, TrendingUp, Database } from "lucide-react";

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
    <div className="w-64 bg-card border-r border-border h-full">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">
          Dashboard
        </h2>
        <nav className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
