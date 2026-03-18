"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import RetentionChart from "@/components/RetentionChart";
import SourcesTable from "@/components/SourcesTable";
import CardsPanel from "@/components/CardsPanel";
import BackendSnapshot from "@/components/BackendSnapshot";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [sm2State, setSm2State] = useState<Record<string, any>>({});
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) {
      sessionStorage.setItem("recallDashboardToken", tokenFromUrl);
      router.replace("/dashboard");
    }
    const storedToken =
      tokenFromUrl || sessionStorage.getItem("recallDashboardToken");
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
      // setLoading(true);
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
      // setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  if (loading)
    return (
      <div style={{ padding: 40, fontFamily: "system-ui, sans-serif", color: "#64748b" }}>
        Loading...
      </div>
    );

  if (error)
    return (
      <div
        style={{
          padding: 40,
          fontFamily: "system-ui, sans-serif",
          color: "#dc2626",
        }}
      >
        {error}
      </div>
    );

  return (
    <>
      <Navbar user={user} onRefresh={loadAll} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex min-h-screen pt-16">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className={`flex-1 p-6 bg-white transition-all duration-300 ${sidebarOpen ? "pl-56" : "pl-20"}`}>
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Page Header */}
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h2>
              <p className="text-slate-600">Track your spaced repetition progress and manage learning sources</p>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SourcesTable
                sources={sources}
                selectedSourceId={selectedSourceId}
                onSelect={setSelectedSourceId}
                onRefresh={loadAll}
                api={api}
              />
              <CardsPanel
                cards={cards}
                sources={sources}
                selectedSourceId={selectedSourceId}
                onRefresh={loadAll}
                api={api}
              />
            </div>

            {/* Charts Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Retention Graph</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Ebbinghaus forgetting curves per topic — past 7 days to exam
                </p>
                <RetentionChart cards={cards} sources={sources} sm2State={sm2State} />
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Backend Data Snapshot</h3>
                <BackendSnapshot sources={sources} cards={cards} user={user} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
