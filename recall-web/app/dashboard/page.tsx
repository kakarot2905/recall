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
      <div style={{ padding: 40, fontFamily: "system-ui, sans-serif", color: "var(--text-secondary)" }}>
        Loading...
      </div>
    );

  if (error)
    return (
      <div
        style={{
          padding: 40,
          fontFamily: "system-ui, sans-serif",
          color: "var(--error)",
        }}
      >
        {error}
      </div>
    );

  return (
    <>
      <Navbar user={user} onRefresh={loadAll} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main
          style={{
            flex: 1,
            padding: "24px",
            background: "var(--background)",
            marginLeft: sidebarOpen ? "240px" : "80px",
            transition: "margin-left 0.3s ease",
          }}
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Page Header */}
            <div style={{ marginBottom: "32px" }}>
              <h2
                style={{
                  margin: "0 0 8px",
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "var(--foreground)",
                }}
              >
                Dashboard
              </h2>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
                Track your spaced repetition progress and manage learning sources
              </p>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
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

            {/* Full Width Sections */}
            <div style={{ display: "grid", gap: "24px" }}>
              <div
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "24px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: "600", color: "var(--foreground)" }}>
                  Retention Graph
                </h2>
                <p style={{ margin: "0 0 16px", color: "var(--text-secondary)", fontSize: "13px" }}>
                  Ebbinghaus forgetting curves per topic — past 7 days to exam
                </p>
                <RetentionChart cards={cards} sources={sources} sm2State={sm2State} />
              </div>

              <div
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "24px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: "600", color: "var(--foreground)" }}>
                  Backend Data Snapshot
                </h2>
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
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
