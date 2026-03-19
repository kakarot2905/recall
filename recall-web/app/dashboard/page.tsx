
"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Database,
  CreditCard,
  TrendingUp,
  BarChart3,
  ChevronRight,
  MoreHorizontal,
  RefreshCw,
  LogOut,
  Sun,
  Moon,
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
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

type Tab = "sources" | "cards" | "retention" | "stats";

interface Source {
  _id: string;
  topic: string;
  status: string;
  examDate?: string | null;
  cardCount?: number;
  notes?: string;
}

interface Card {
  _id: string;
  sourceId: string;
  type: string;
  question?: string;
  content?: string;
  options?: string[];
  correct?: string;
  answer?: string;
  difficulty: number;
}

const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  processing: "bg-primary/15 text-primary",
  done: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
};
const TYPE_CLASSES: Record<string, string> = {
  mcq: "bg-primary/15 text-primary",
  short_answer: "bg-success/15 text-success",
  fill_blank: "bg-warning/15 text-warning",
  fact: "bg-muted text-muted-foreground",
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [sm2State, setSm2State] = useState<Record<string, any>>({});
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("sources");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      sessionStorage.setItem("recallDashboardToken", tokenFromUrl);
      router.replace("/dashboard");
    }
    const storedToken = tokenFromUrl || sessionStorage.getItem("recallDashboardToken");
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token === null) return;
    if (!token) {
      setError("Missing auth token. Open dashboard from extension popup.");
      setLoading(false);
      return;
    }
    loadAll();
  }, [token]);

  async function api(path: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function loadAll() {
    try {
      setLoading(true);
      const [dashboardData, progressData] = await Promise.all([
        api("/api/dashboard-data"),
        api("/api/progress"),
      ]);
      setUser(dashboardData.user || null);
      setSources(Array.isArray(dashboardData.sources) ? dashboardData.sources : []);
      setCards(Array.isArray(dashboardData.cards) ? dashboardData.cards : []);
      setSm2State(progressData.sm2State || {});
      if (dashboardData.sources?.length) {
        setSelectedSourceId(dashboardData.sources[0]._id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("recallDashboardToken");
    window.location.href = "/";
  }

  const filteredCards = selectedSourceId
    ? cards.filter((c) => c.sourceId === selectedSourceId)
    : cards;

  const retentionData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const label = date.toLocaleDateString("en", { weekday: "short" });
      const entry: Record<string, number | string> = { day: label };
      sources.forEach((s) => {
        const state = sm2State;
        const sourceCards = cards.filter((c) => c.sourceId === s._id);
        const reviewed = sourceCards.filter((c) => state[c._id]?.lastReviewed);
        if (reviewed.length === 0) return;
        const avgRetention = reviewed.reduce((sum, c) => {
          const st = state[c._id];
          const lastReviewedMs = new Date(st.lastReviewed).getTime();
          const dayEndMs = date.getTime() + 86399999;
          if (lastReviewedMs > dayEndMs) return sum;
          const S = Math.max((st.interval || 600000) / 86400000, 1);
          const t = (dayEndMs - lastReviewedMs) / 86400000;
          return sum + Math.exp(-t / S) * 100;
        }, 0) / reviewed.length;
        entry[s.topic] = Math.round(avgRetention * 10) / 10;
      });
      return entry;
    });
  }, [sources, cards, sm2State]);

  const totalCards = cards.length;
  const cardTypes = useMemo(() => {
    return cards.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [cards]);

  const stats = [
    { label: "Total Sources", value: sources.length },
    { label: "Total Cards", value: totalCards },
    { label: "MCQ", value: cardTypes.mcq || 0 },
    { label: "Short Answer", value: cardTypes.short_answer || 0 },
    { label: "Fill Blank", value: cardTypes.fill_blank || 0 },
    { label: "Fact", value: cardTypes.fact || 0 },
  ];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "sources", label: "Sources", icon: <Database size={16} /> },
    { id: "cards", label: "Cards", icon: <CreditCard size={16} /> },
    { id: "retention", label: "Retention", icon: <TrendingUp size={16} /> },
    { id: "stats", label: "Snapshot", icon: <BarChart3 size={16} /> },
  ];

  // --- Loading State ---
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Loading dashboard...</p>
      </div>
    </div>
  );

  // --- Error State ---
  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md animate-fade-in">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Unable to Load Dashboard</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
      </div>
    </div>
  );

  // --- Main Layout ---
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-[200px] border-r border-border bg-card flex flex-col fixed left-0 top-0 h-screen z-40">
        <div className="px-4 py-4 border-b border-border flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-sm font-bold">R</span>
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tightest">RECALL</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors relative ${
                activeTab === tab.id
                  ? "text-foreground"
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
        <div className="p-3 border-t border-border space-y-1">
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 pl-[200px] flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tightest">Dashboard</h1>
            <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest-custom mt-0.5">
              {sources.length} sources · {cards.length} cards
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadAll}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
            <div className="relative">
              <div
                className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer"
                onClick={() => setDropdownOpen((v) => !v)}
              >
                <span className="text-primary text-sm font-semibold">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 top-full w-44 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                  <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
                    {user?.name}
                  </div>
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors text-foreground"
                  >
                    Settings
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
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
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-foreground">Sources</span>
                    <span className="text-xs text-muted-foreground ml-2">{sources.length} source(s)</span>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-8 px-3" disabled>
                    Add Source
                  </Button>
                </div>
                {/* Add Source Form */}
                <div className="bg-card border border-border rounded-lg p-4 space-y-3 mb-2">
                  <div className="text-xs font-semibold text-foreground mb-2">+ Add New Source</div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Topic e.g. Data Structures"
                      className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                    />
                    <input
                      type="date"
                      className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full"
                      value={newExamDate}
                      onChange={(e) => setNewExamDate(e.target.value)}
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Notes (optional)"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full resize-none"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                  />
                  <Button
                    className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    onClick={async () => {
                      setAddError("");
                      try {
                        await api("/api/sources/manual", {
                          method: "POST",
                          body: JSON.stringify({
                            topic: newTopic.trim(),
                            notes: newNotes.trim(),
                            examDate: newExamDate || null,
                          }),
                        });
                        setNewTopic("");
                        setNewExamDate("");
                        setNewNotes("");
                        loadAll();
                      } catch (err: any) {
                        setAddError(err.message || "Failed to add source");
                      }
                    }}
                  >
                    Add Source
                  </Button>
                  {addError && <div className="text-xs text-destructive">{addError}</div>}
                </div>
                {/* Source List */}
                <div className="space-y-2 mt-4">
                  {sources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <span className="text-sm text-muted-foreground">No sources yet</span>
                      <span className="text-xs text-muted-foreground/60 mt-1">Add one above to get started</span>
                    </div>
                  ) : (
                    sources.map((source, i) => {
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
                              <span className="text-sm font-medium text-foreground truncate">{source.topic}</span>
                              <span
                                className={`text-[10px] font-mono uppercase tracking-widest-custom px-1.5 py-0.5 rounded ${STATUS_CLASSES[source.status] || "bg-muted text-muted-foreground"}`}
                              >
                                {source.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                                {source.cardCount || 0} cards
                              </span>
                              {source.examDate && (
                                <span className="text-[11px] font-mono text-muted-foreground">
                                  Exam: {new Date(source.examDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm("Delete source and all its cards?")) {
                                await api(`/api/sources/${source._id}`, { method: "DELETE" });
                                loadAll();
                              }
                            }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          <ChevronRight size={14} className="text-muted-foreground/50" />
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Tab: Cards */}
            {activeTab === "cards" && (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-foreground">Cards</span>
                    <span className="text-xs text-muted-foreground ml-2">{filteredCards.length} card(s)</span>
                  </div>
                  <select
                    className="bg-muted border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={selectedSourceId}
                    onChange={(e) => setSelectedSourceId(e.target.value)}
                  >
                    <option value="">All sources</option>
                    {sources.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.topic}
                      </option>
                    ))}
                  </select>
                </div>
                {filteredCards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="text-sm text-muted-foreground">No cards found</span>
                    <span className="text-xs text-muted-foreground/60 mt-1">Select a source to view its cards</span>
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
                                className={`text-[10px] font-mono uppercase tracking-widest-custom px-1.5 py-0.5 rounded ${TYPE_CLASSES[card.type] || "bg-muted text-muted-foreground"}`}
                              >
                                {card.type.replace("_", " ")}
                              </span>
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, idx) => (
                                  <span
                                    key={idx}
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      idx < card.difficulty ? "bg-primary" : "bg-border"
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
                  <span className="text-sm font-semibold text-foreground">Retention Over Time</span>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    SM2 forgetting curves per topic
                  </div>
                </div>
                {Object.keys(sm2State).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No reviewed cards yet. Complete a study session to see your curves.
                  </p>
                ) : (
                  <div className="h-[300px] bg-card rounded-lg border border-border p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={retentionData}>
                        <defs>
                          {sources.map((s, i) => (
                            <linearGradient key={s._id} id={`grad-${s._id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid stroke="hsl(215 15% 20%)" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="day"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(215 15% 55%)", fontSize: 11, fontFamily: "monospace" }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(215 15% 55%)", fontSize: 11, fontFamily: "monospace" }}
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
                        {sources.map((s, i) => (
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
                    <div className="flex flex-wrap gap-4 mt-3">
                      {sources.map((s, i) => (
                        <div key={s._id} className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          <span className="text-xs text-muted-foreground">{s.topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Snapshot */}
            {activeTab === "stats" && (
              <div className="p-6 space-y-6">
                <div>
                  <span className="text-sm font-semibold text-foreground">Backend Snapshot</span>
                  <div className="text-xs text-muted-foreground mt-0.5">Live data from your account</div>
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
                    {sources.map((source, i) => {
                      const sourceCards = cards.filter((c) => c.sourceId === source._id);
                      const typeBreakdown = sourceCards.reduce((acc, c) => {
                        acc[c.type] = (acc[c.type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      return (
                        <motion.div
                          key={source._id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className="p-4 rounded-lg border border-border bg-card"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{source.topic}</span>
                            <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                              {source.cardCount || 0} cards
                            </span>
                          </div>
                          {Object.keys(typeBreakdown).length > 0 && (
                            <div className="flex gap-3 mt-2">
                              {Object.entries(typeBreakdown).map(([type, count]) => (
                                <span key={type} className="text-[10px] font-mono text-muted-foreground">
                                  {type.replace("_", " ")}: {count}
                                </span>
                              ))}
                            </div>
                          )}
                          {source.notes && (
                            <div className="text-[10px] font-mono text-muted-foreground/80 mt-1">
                              Notes: {source.notes.slice(0, 60)}{source.notes.length > 60 ? "..." : ""}
                            </div>
                          )}
                          {source.examDate && (
                            <div className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                              Exam: {new Date(source.examDate).toLocaleDateString()}
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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
