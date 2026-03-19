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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Unable to Load Dashboard
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );

  return (
    <>
      <Navbar
        user={user}
        onRefresh={loadAll}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex min-h-screen pt-16 bg-background">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? "pl-[200px]" : "pl-[80px]"
          }`}
        >
          <div className="max-w-[1280px] mx-auto px-6 py-6 space-y-8">
            {/* Page Header */}
            <div className="animate-slide-up" style={{ animationDelay: "0s" }}>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Dashboard
              </h2>
              <p className="text-muted-foreground">
                Track your spaced repetition progress and manage learning
                sources
              </p>
            </div>

            {/* Main Content Grid */}
            <div
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
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
              <div
                className="bg-card border border-border rounded-lg p-6 shadow-sm animate-slide-up"
                style={{ animationDelay: "0.2s" }}
              >
                <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Retention Graph
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ebbinghaus forgetting curves per topic — past 7 days to exam
                </p>
                <RetentionChart
                  cards={cards}
                  sources={sources}
                  sm2State={sm2State}
                />
              </div>

              <div
                className="bg-card border border-border rounded-lg p-6 shadow-sm animate-slide-up"
                style={{ animationDelay: "0.4s" }}
              >
                <h3 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Backend Data Snapshot
                </h3>
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
    <Suspense
      fallback={
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          Loading...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
