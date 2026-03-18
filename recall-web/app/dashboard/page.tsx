"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import DashboardSidebar, { DashboardTab } from "@/components/DashboardSidebar";
import DashboardSourcesTable from "@/components/DashboardSourcesTable";
import DashboardCardsPanel from "@/components/DashboardCardsPanel";
import DashboardRetentionChart from "@/components/DashboardRetentionChart";
import DashboardStats from "@/components/DashboardStats";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [sm2State, setSm2State] = useState<Record<string, any>>({});
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<DashboardTab>("sources");

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      sessionStorage.setItem("recallDashboardToken", tokenFromUrl);
      router.replace("/dashboard");
    }
    const storedToken =
      tokenFromUrl || sessionStorage.getItem("recallDashboardToken") || "";
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token === null) return;
    if (!token) {
      // setError("Missing auth token. Open dashboard from extension popup.");
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
    const res = await fetch(path, {
      ...options,
      headers,
    });
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
      setSources(
        Array.isArray(dashboardData.sources) ? dashboardData.sources : [],
      );
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

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );

  if (error)
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-destructive text-center">
          <p className="text-lg font-semibold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );

  const renderContent = () => {
    switch (activeTab) {
      case "sources":
        return (
          <DashboardSourcesTable
            sources={sources}
            selectedSourceId={selectedSourceId}
            onSelect={(id) => {
              setSelectedSourceId(id);
              setActiveTab("cards");
            }}
            onDelete={async (id) => {
              await api(`/api/sources/${id}`, { method: "DELETE" });
              loadAll();
            }}
          />
        );
      case "cards":
        return (
          <DashboardCardsPanel
            cards={cards}
            sources={sources}
            selectedSourceId={selectedSourceId}
            onSelectSource={setSelectedSourceId}
            onDelete={async (id) => {
              await api(`/api/cards/${id}`, { method: "DELETE" });
              loadAll();
            }}
          />
        );
      case "retention":
        return (
          <DashboardRetentionChart
            cards={cards}
            sources={sources}
            sm2State={sm2State}
          />
        );
      case "stats":
        return <DashboardStats sources={sources} cards={cards} user={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-card to-background">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-sm text-muted-foreground font-mono">
              {sources.length} sources • {cards.length} cards
            </p>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <button
                onClick={loadAll}
                className="px-4 py-2 border border-border rounded-lg bg-background hover:bg-muted text-foreground text-sm font-medium transition-all duration-200 hover:shadow-md"
              >
                Refresh
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 p-8 overflow-auto bg-gradient-to-b from-background to-background/50">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
