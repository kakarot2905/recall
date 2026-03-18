"use client";

import { motion } from "framer-motion";
import {
  User,
  BookOpen,
  CheckCircle,
  TrendingUp,
  Calendar,
  Database,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
}

interface DashboardStatsProps {
  sources: any[];
  cards: any[];
  user: User | null;
}

const stats = [
  {
    label: "Total Sources",
    value: (props: DashboardStatsProps) => props.sources.length,
    icon: BookOpen,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    label: "Total Cards",
    value: (props: DashboardStatsProps) => props.cards.length,
    icon: Database,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    label: "Avg Cards/Source",
    value: (props: DashboardStatsProps) =>
      props.sources.length > 0
        ? Math.round(props.cards.length / props.sources.length)
        : 0,
    icon: TrendingUp,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    label: "Study Progress",
    value: (props: DashboardStatsProps) =>
      `${Math.round((props.cards.length / Math.max(props.sources.length * 10, 1)) * 100)}%`,
    icon: Calendar,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
];

export default function DashboardStats(props: DashboardStatsProps) {
  const { user } = props;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-6"
    >
      <h2 className="text-xl font-semibold text-foreground mb-6">Statistics</h2>

      {user && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-background border border-border rounded-lg p-4 mb-6"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${"bg-gray-100"}`}>
              <User className={`w-5 h-5 text-gray-600`} />
            </div>
            <div>
              <p className="font-medium text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const value = stat.value(props);
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-background border border-border rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
