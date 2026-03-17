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
        background: "#fff",
        border: "1px solid #d8deea",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Sources</h2>
        <span style={{ color: "#5e6678", fontSize: 13 }}>
          {sources.length} source(s)
        </span>
      </div>

      <form
        onSubmit={handleAdd}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div>
          <label
            style={{
              fontSize: 12,
              color: "#5e6678",
              display: "block",
              marginBottom: 4,
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
              border: "1px solid #d8deea",
              borderRadius: 8,
              padding: "7px 8px",
              fontSize: 13,
              boxSizing: "border-box",
            }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 12,
              color: "#5e6678",
              display: "block",
              marginBottom: 4,
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
              border: "1px solid #d8deea",
              borderRadius: 8,
              padding: "7px 8px",
              fontSize: 13,
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              fontSize: 12,
              color: "#5e6678",
              display: "block",
              marginBottom: 4,
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
              border: "1px solid #d8deea",
              borderRadius: 8,
              padding: "7px 8px",
              fontSize: 13,
              minHeight: 60,
              boxSizing: "border-box",
              resize: "vertical",
            }}
          />
        </div>
        <div>
          <button
            type="submit"
            style={{
              border: "1px solid #c0cdfb",
              background: "#edf2ff",
              color: "#1f3eaa",
              borderRadius: 10,
              padding: "8px 14px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Add Source
          </button>
        </div>
        {error && (
          <p
            style={{
              color: "#b42318",
              fontSize: 12,
              margin: 0,
              gridColumn: "1 / -1",
            }}
          >
            {error}
          </p>
        )}
      </form>

      <div style={{ overflowX: "auto", maxHeight: 300, overflowY: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr>
              {["Topic", "Status", "Cards", "Exam", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: 10,
                    borderBottom: "1px solid #edf0f7",
                    color: "#5e6678",
                    fontWeight: 600,
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
                <td colSpan={5} style={{ padding: 10, color: "#5e6678" }}>
                  No sources yet.
                </td>
              </tr>
            )}
            {sources.map((source) => (
              <tr
                key={source._id}
                onClick={() => onSelect(source._id)}
                style={{
                  background:
                    source._id === selectedSourceId ? "#edf1ff" : undefined,
                  cursor: "pointer",
                }}
              >
                <td style={{ padding: 10, borderBottom: "1px solid #edf0f7" }}>
                  <strong>{source.topic}</strong>
                  <div style={{ color: "#5e6678", fontSize: 12 }}>
                    {source.notes?.slice(0, 40)}
                  </div>
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #edf0f7" }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 12,
                      textTransform: "uppercase",
                      color: statusColors[source.status] || "#5e6678",
                    }}
                  >
                    {source.status}
                  </span>
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #edf0f7" }}>
                  {source.cardCount || 0}
                </td>
                <td
                  style={{
                    padding: 10,
                    borderBottom: "1px solid #edf0f7",
                    fontSize: 12,
                  }}
                >
                  {source.examDate
                    ? new Date(source.examDate).toLocaleDateString()
                    : "—"}
                </td>
                <td
                  style={{ padding: 10, borderBottom: "1px solid #edf0f7" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleDelete(source._id)}
                    style={{
                      border: "1px solid #f1b7b5",
                      color: "#8f1f1b",
                      background: "#fff5f4",
                      borderRadius: 8,
                      padding: "4px 8px",
                      fontSize: 12,
                      cursor: "pointer",
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
