"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Database,
  CreditCard,
  TrendingUp,
  BarChart3,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const MOCK_SOURCES = [
  {
    _id: "1",
    topic: "Data Structures",
    status: "done",
    examDate: "2026-04-15",
    cardCount: 24,
  },
  {
    _id: "2",
    topic: "Operating Systems",
    status: "processing",
    examDate: "2026-05-01",
    cardCount: 12,
  },
  {
    _id: "3",
    topic: "Machine Learning",
    status: "done",
    examDate: "2026-04-20",
    cardCount: 36,
  },
  {
    _id: "4",
    topic: "Computer Networks",
    status: "pending",
    examDate: null,
    cardCount: 0,
  },
];

const MOCK_CARDS = [
  {
    _id: "c1",
    sourceId: "1",
    type: "mcq",
    question: "What is the time complexity of inserting into a balanced BST?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correct: "O(log n)",
    difficulty: 3,
  },
  {
    _id: "c2",
    sourceId: "1",
    type: "short_answer",
    question: "Explain the difference between a stack and a queue.",
    answer: "A stack follows LIFO while a queue follows FIFO.",
    difficulty: 2,
  },
  {
    _id: "c3",
    sourceId: "1",
    type: "mcq",
    question: "Which traversal visits the root first?",
    options: ["Inorder", "Preorder", "Postorder", "Level-order"],
    correct: "Preorder",
    difficulty: 1,
  },
  {
    _id: "c4",
    sourceId: "3",
    type: "mcq",
    question: "What is the goal of gradient descent?",
    options: ["Maximize loss", "Minimize loss", "Find features", "Split data"],
    correct: "Minimize loss",
    difficulty: 2,
  },
  {
    _id: "c5",
    sourceId: "3",
    type: "fill_blank",
    question:
      "A neural network with multiple hidden layers is called a ___ network.",
    answer: "deep",
    difficulty: 1,
  },
  {
    _id: "c6",
    sourceId: "3",
    type: "fact",
    content:
      "Regularization helps prevent overfitting by adding a penalty term.",
    difficulty: 2,
  },
];

const COLORS = [
  "#6366f1",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];
type Tab = "sources" | "cards" | "retention" | "stats";

export default function DashboardPreview() {
  const [activeTab, setActiveTab] = useState<Tab>("sources");
  const [selectedSourceId, setSelectedSourceId] = useState("");

  // Retention chart data
  const retentionData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const label = date.toLocaleDateString("en", { weekday: "short" });
      const entry: Record<string, number | string> = { day: label };
      MOCK_SOURCES.forEach((s) => {
        const base = 40 + Math.random() * 40;
        const decay = Math.pow(0.92, 6 - i);
        entry[s.topic] = Math.round(base * decay + Math.random() * 15);
      });
      return entry;
    });
  }, []);

  // Stats for snapshot
  const totalCards = MOCK_CARDS.length;
  const types = useMemo(() => {
    return MOCK_CARDS.reduce(
      (acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, []);

  const stats = [
    { label: "Total Sources", value: MOCK_SOURCES.length },
    { label: "Total Cards", value: totalCards },
    { label: "MCQ", value: types.mcq || 0 },
    { label: "Short Answer", value: types.short_answer || 0 },
    { label: "Fill Blank", value: types.fill_blank || 0 },
    { label: "Fact", value: types.fact || 0 },
  ];

  // Tabs
  const tabs = [
    { id: "sources", label: "Sources", icon: <Database size={16} /> },
    { id: "cards", label: "Cards", icon: <CreditCard size={16} /> },
    { id: "retention", label: "Retention", icon: <TrendingUp size={16} /> },
    { id: "stats", label: "Snapshot", icon: <BarChart3 size={16} /> },
  ];

  // Card filtering
  const filteredCards = selectedSourceId
    ? MOCK_CARDS.filter((c) => c.sourceId === selectedSourceId)
    : MOCK_CARDS;

  return (
    <div className="flex h-[600px] bg-background rounded-xl border border-border overflow-hidden shadow-2xl">
      {/* Sidebar */}
      <div className="w-[200px] border-r border-border bg-card flex flex-col">
        <div className="px-4 py-4 border-b border-border flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-sm font-bold">R</span>
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tightest">
            RECALL
          </span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors relative ${
                activeTab === tab.id
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              onClick={() => setActiveTab(tab.id as Tab)}
              style={{ position: "relative" }}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-muted rounded-lg"
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              <span className="relative z-10">{tab.icon}</span>
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest-custom">
            v1.0.0
          </span>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tightest">
              Dashboard
            </h1>
            <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest-custom mt-0.5">
              {MOCK_SOURCES.length} sources · {MOCK_CARDS.length} cards · Last
              sync 2m ago
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-xs font-bold">U</span>
          </div>
        </div>
        <div className="h-[calc(100%-65px)] overflow-y-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {/* Tab: Sources */}
            {activeTab === "sources" && (
              <div className="p-6 space-y-4">
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    Sources
                  </span>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {MOCK_SOURCES.length} source(s)
                  </div>
                </div>
                <div className="space-y-2">
                  {MOCK_SOURCES.map((source, i) => {
                    const selected = selectedSourceId === source._id;
                    return (
                      <motion.div
                        key={source._id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.2 }}
                        onClick={() => {
                          setSelectedSourceId(source._id);
                          setActiveTab("cards");
                        }}
                        className={
                          selected
                            ? "group flex items-center gap-4 p-4 rounded-lg border border-primary/50 bg-primary/5 cursor-pointer transition-all duration-200"
                            : "group flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:border-accent/50 hover:bg-muted/30 cursor-pointer transition-all duration-200"
                        }
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {source.topic}
                            </span>
                            <span
                              className={`text-[10px] font-mono uppercase tracking-widest-custom px-1.5 py-0.5 rounded ${
                                source.status === "pending"
                                  ? "bg-warning/15 text-warning"
                                  : source.status === "processing"
                                    ? "bg-primary/15 text-primary"
                                    : source.status === "done"
                                      ? "bg-success/15 text-success"
                                      : source.status === "failed"
                                        ? "bg-destructive/15 text-destructive"
                                        : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {source.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                              {source.cardCount} cards
                            </span>
                            {source.examDate && (
                              <span className="text-[11px] font-mono text-muted-foreground">
                                Exam: {source.examDate}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight
                          size={14}
                          className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors"
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab: Cards */}
            {activeTab === "cards" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      Cards
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {filteredCards.length} card(s)
                    </span>
                  </div>
                  <select
                    className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={selectedSourceId}
                    onChange={(e) => setSelectedSourceId(e.target.value)}
                  >
                    <option value="">All sources</option>
                    {MOCK_SOURCES.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.topic}
                      </option>
                    ))}
                  </select>
                </div>
                {filteredCards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="text-sm text-muted-foreground">
                      No cards found
                    </span>
                    <span className="text-xs text-muted-foreground/60 mt-1">
                      Select a source or generate new cards
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredCards.map((card, i) => (
                      <motion.div
                        key={card._id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="group p-4 rounded-lg border border-border bg-card hover:border-accent/50 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`text-[10px] font-mono uppercase tracking-widest-custom px-1.5 py-0.5 rounded ${
                                  card.type === "mcq"
                                    ? "bg-primary/15 text-primary"
                                    : card.type === "short_answer"
                                      ? "bg-success/15 text-success"
                                      : card.type === "fill_blank"
                                        ? "bg-warning/15 text-warning"
                                        : card.type === "fact"
                                          ? "bg-muted text-muted-foreground"
                                          : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {card.type.replace("_", " ")}
                              </span>
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, idx) => (
                                  <span
                                    key={idx}
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      idx < card.difficulty
                                        ? "bg-primary"
                                        : "bg-border"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="text-sm text-foreground">
                              {card.question || card.content || "—"}
                            </div>
                            {card.options && (
                              <div className="text-xs text-muted-foreground mt-2 font-mono">
                                Options: {card.options.join(" | ")}
                              </div>
                            )}
                            {(card.correct || card.answer) && (
                              <div className="text-xs text-success mt-1 font-mono">
                                Answer: {card.correct || card.answer}
                              </div>
                            )}
                          </div>
                          <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Retention */}
            {activeTab === "retention" && (
              <div className="p-6 space-y-4">
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    Retention Over Time
                  </span>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    7-day retention estimate per topic
                  </div>
                </div>
                <div className="h-[300px] bg-card rounded-lg border border-border p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={retentionData}>
                      <defs>
                        {MOCK_SOURCES.map((s, i) => (
                          <linearGradient
                            key={s._id}
                            id={`grad-${s._id}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={COLORS[i % COLORS.length]}
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="100%"
                              stopColor={COLORS[i % COLORS.length]}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid
                        stroke="hsl(215 15% 20%)"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "hsl(215 15% 55%)",
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "hsl(215 15% 55%)",
                          fontSize: 11,
                          fontFamily: "monospace",
                        }}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(220 15% 13%)",
                          border: "1px solid hsl(215 15% 20%)",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "hsl(210 20% 98%)",
                        }}
                        labelStyle={{
                          color: "hsl(215 15% 55%)",
                          fontSize: 10,
                          fontFamily: "monospace",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      />
                      {MOCK_SOURCES.map((s, i) => (
                        <Area
                          key={s._id}
                          type="monotone"
                          dataKey={s.topic}
                          stroke={COLORS[i % COLORS.length]}
                          fill={`url(#grad-${s._id})`}
                          strokeWidth={2}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {MOCK_SOURCES.map((s, i) => (
                      <div key={s._id} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {s.topic}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Snapshot */}
            {activeTab === "stats" && (
              <div className="p-6 space-y-6">
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    Backend Snapshot
                  </span>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Overview of your data
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {stats.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-lg border border-border bg-card"
                    >
                      <div className="text-[10px] font-mono uppercase tracking-widest-custom text-muted-foreground">
                        {stat.label}
                      </div>
                      <div className="text-2xl font-semibold text-foreground tabular-nums mt-1">
                        {stat.value}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-widest-custom text-muted-foreground mb-2">
                    Per Source
                  </div>
                  <div className="space-y-2">
                    {MOCK_SOURCES.map((source, i) => {
                      const sourceCards = MOCK_CARDS.filter(
                        (c) => c.sourceId === source._id,
                      );
                      const typeBreakdown = sourceCards.reduce(
                        (acc, c) => {
                          acc[c.type] = (acc[c.type] || 0) + 1;
                          return acc;
                        },
                        {} as Record<string, number>,
                      );
                      return (
                        <motion.div
                          key={source._id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className="p-4 rounded-lg border border-border bg-card"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">
                              {source.topic}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                              {source.cardCount} cards
                            </span>
                          </div>
                          {sourceCards.length > 0 && (
                            <div className="flex gap-3 mt-2">
                              {Object.entries(typeBreakdown).map(
                                ([type, count]) => (
                                  <span
                                    key={type}
                                    className="text-[10px] font-mono text-muted-foreground"
                                  >
                                    {type.replace("_", " ")}: {count}
                                  </span>
                                ),
                              )}
                            </div>
                          )}
                          {source.examDate && (
                            <div className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                              Exam: {source.examDate}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
