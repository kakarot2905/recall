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
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    label: "Total Cards",
    value: (props: DashboardStatsProps) => props.cards.length,
    icon: Database,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    label: "Avg Cards/Source",
    value: (props: DashboardStatsProps) =>
      props.sources.length > 0
        ? Math.round(props.cards.length / props.sources.length)
        : 0,
    icon: TrendingUp,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    label: "Study Progress",
    value: (props: DashboardStatsProps) =>
      `${Math.round((props.cards.length / Math.max(props.sources.length * 10, 1)) * 100)}%`,
    icon: Calendar,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    gradient: "from-amber-500 to-orange-500",
  },
];

export default function DashboardStats(props: DashboardStatsProps) {
  const { user } = props;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded-xl p-8 shadow-lg"
    >
      <h2 className="text-3xl font-bold text-foreground mb-8">Statistics</h2>

      {user && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-5 mb-8 hover:shadow-lg transition-all"
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30`}>
              <User className={`w-6 h-6 text-primary`} />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const value = stat.value(props);
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="relative bg-background border border-border/50 rounded-xl p-6 hover:shadow-xl transition-all duration-300 overflow-hidden group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
