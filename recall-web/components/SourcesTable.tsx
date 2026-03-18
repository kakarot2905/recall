"use client";

import { useState } from "react";

interface Props {
  sources: any[];
  selectedSourceId: string;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  api: (path: string, options?: RequestInit) => Promise<any>;
}

export default function SourcesTable({
  sources,
  selectedSourceId,
  onSelect,
  onRefresh,
  api,
}: Props) {
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [examDate, setExamDate] = useState("");
  const [error, setError] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      setError("Topic is required");
      return;
    }
    try {
      await api("/api/sources/manual", {
        method: "POST",
        body: JSON.stringify({
          topic: topic.trim(),
          notes: notes.trim(),
          examDate: examDate || null,
        }),
      });
      setTopic("");
      setNotes("");
      setExamDate("");
      setError("");
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to add source");
    }
  }

  async function handleDelete(sourceId: string) {
    if (!confirm("Delete this source and all its cards?")) return;
    try {
      await api(`/api/sources/${sourceId}`, { method: "DELETE" });
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete source");
    }
  }

  const statusColors: Record<string, string> = {
    pending: "#b06d00",
    processing: "#326fd1",
    done: "#2e8b57",
    failed: "#b42318",
  };

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "var(--foreground)" }}>Sources</h2>
        <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          {sources.length} source(s)
        </span>
      </div>

      <form
        onSubmit={handleAdd}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "20px",
          padding: "20px",
          background: "var(--sidebar-bg)",
          borderRadius: "8px",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <label
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              display: "block",
              marginBottom: "6px",
              fontWeight: "500",
            }}
          >
            Topic
          </label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Data Structures"
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "13px",
              boxSizing: "border-box",
              background: "var(--card-bg)",
              color: "var(--foreground)",
              transition: "all 0.2s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.outline = "none";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              display: "block",
              marginBottom: "6px",
              fontWeight: "500",
            }}
          >
            Exam Date
          </label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "13px",
              boxSizing: "border-box",
              background: "var(--card-bg)",
              color: "var(--foreground)",
              transition: "all 0.2s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.outline = "none";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              fontSize: "12px",
              color: "var(--text-secondary)",
              display: "block",
              marginBottom: "6px",
              fontWeight: "500",
            }}
          >
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            style={{
              width: "100%",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "13px",
              minHeight: "60px",
              boxSizing: "border-box",
              resize: "vertical",
              background: "var(--card-bg)",
              color: "var(--foreground)",
              transition: "all 0.2s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.outline = "none";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          />
        </div>
        <div>
          <button
            type="submit"
            style={{
              border: "none",
              background: "var(--primary)",
              color: "white",
              borderRadius: "6px",
              padding: "8px 16px",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "13px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--primary-dark)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--primary)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Add Source
          </button>
        </div>
        {error && (
          <p
            style={{
              color: "var(--error)",
              fontSize: "12px",
              margin: 0,
              gridColumn: "1 / -1",
            }}
          >
            {error}
          </p>
        )}
      </form>

      <div style={{ overflowX: "auto", maxHeight: "300px", overflowY: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}
        >
          <thead>
            <tr style={{ background: "var(--sidebar-bg)" }}>
              {["Topic", "Status", "Cards", "Exam", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "12px",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    fontWeight: "600",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "12px", color: "var(--text-secondary)", textAlign: "center" }}>
                  No sources yet.
                </td>
              </tr>
            )}
            {sources.map((source) => (
              <tr
                key={source._id}
                onClick={() => onSelect(source._id)}
                style={{
                  background: source._id === selectedSourceId ? "var(--sidebar-bg)" : undefined,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  borderBottom: "1px solid var(--border)",
                }}
                onMouseEnter={(e) => {
                  if (source._id !== selectedSourceId) {
                    e.currentTarget.style.background = "var(--sidebar-bg)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (source._id !== selectedSourceId) {
                    e.currentTarget.style.background = "";
                  }
                }}
              >
                <td style={{ padding: "12px", borderBottom: "1px solid var(--border)", color: "var(--foreground)" }}>
                  <strong>{source.topic}</strong>
                  <div style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "4px" }}>
                    {source.notes?.slice(0, 40)}
                  </div>
                </td>
                <td style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}>
                  <span
                    style={{
                      fontWeight: "700",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      color: statusColors[source.status] || "var(--text-secondary)",
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background: statusColors[source.status] ? `${statusColors[source.status]}15` : "transparent",
                    }}
                  >
                    {source.status}
                  </span>
                </td>
                <td style={{ padding: "12px", borderBottom: "1px solid var(--border)", color: "var(--foreground)" }}>
                  {source.cardCount || 0}
                </td>
                <td
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid var(--border)",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
                >
                  {source.examDate
                    ? new Date(source.examDate).toLocaleDateString()
                    : "—"}
                </td>
                <td
                  style={{ padding: "12px", borderBottom: "1px solid var(--border)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleDelete(source._id)}
                    style={{
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      color: "var(--error)",
                      background: "rgba(239, 68, 68, 0.1)",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                      e.currentTarget.style.borderColor = "var(--error)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                      e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
