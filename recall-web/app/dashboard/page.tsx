"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      <div style={{ padding: 40, fontFamily: "Segoe UI, sans-serif" }}>
        Loading...
      </div>
    );

  if (error)
    return (
      <div
        style={{
          padding: 40,
          fontFamily: "Segoe UI, sans-serif",
          color: "#b42318",
        }}
      >
        {error}
      </div>
    );

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: 24,
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: "1px solid #d8deea",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
            Recall Dashboard
          </h1>
          <p style={{ margin: "4px 0 0", color: "#5e6678", fontSize: 14 }}>
            {user ? `Logged in as ${user.name} (${user.email})` : ""}
          </p>
        </div>
        <button
          onClick={loadAll}
          style={{
            border: "1px solid #d8deea",
            background: "#fff",
            borderRadius: 10,
            padding: "8px 16px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
        <div
          style={{
            gridColumn: "1 / -1",
            background: "#fff",
            border: "1px solid #d8deea",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <h2 style={{ margin: "0 0 16px" }}>Backend Data Snapshot</h2>
          <BackendSnapshot sources={sources} cards={cards} user={user} />
        </div>
        <div
          style={{
            gridColumn: "1 / -1",
            background: "#fff",
            border: "1px solid #d8deea",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <h2 style={{ margin: "0 0 4px" }}>Retention Graph</h2>
          <p style={{ margin: "0 0 16px", color: "#5e6678", fontSize: 13 }}>
            Ebbinghaus forgetting curves per topic — past 7 days to exam
          </p>
          <RetentionChart cards={cards} sources={sources} sm2State={sm2State} />
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
