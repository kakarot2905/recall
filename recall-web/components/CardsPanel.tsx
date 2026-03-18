"use client";

import { useState } from "react";

interface Props {
  cards: any[];
  sources: any[];
  selectedSourceId: string;
  onRefresh: () => void;
  api: (path: string, options?: RequestInit) => Promise<any>;
}

export default function CardsPanel({
  cards,
  sources,
  selectedSourceId,
  onRefresh,
  api,
}: Props) {
  const [error, setError] = useState("");

  const selectedCards = cards.filter(
    (c) => String(c.sourceId) === String(selectedSourceId),
  );

  async function handleDelete(cardId: string) {
    if (!confirm("Delete this card?")) return;
    try {
      await api(`/api/cards/${cardId}`, { method: "DELETE" });
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete card");
    }
  }

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
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "var(--foreground)" }}>Cards</h2>
        <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          {selectedSourceId
            ? `${selectedCards.length} card(s)`
            : "Pick a source"}
        </span>
      </div>

      {error && <p style={{ color: "var(--error)", fontSize: "12px", marginBottom: "12px" }}>{error}</p>}

      {!selectedSourceId && (
        <p style={{ color: "var(--text-secondary)", fontSize: "13px", textAlign: "center", padding: "24px", background: "var(--sidebar-bg)", borderRadius: "8px" }}>
          Select a source from the left panel.
        </p>
      )}

      <div
        style={{ display: "grid", gap: "12px", maxHeight: "500px", overflowY: "auto" }}
      >
        {selectedCards.map((card) => (
          <div
            key={card._id}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "12px",
              background: "var(--sidebar-bg)",
              transition: "all 0.2s",
              cursor: "default",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.background = "var(--card-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "var(--sidebar-bg)";
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                marginBottom: "8px",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", gap: "6px", flex: 1, flexWrap: "wrap" }}>
                <span
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "3px 10px",
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                    background: "var(--card-bg)",
                    fontWeight: "500",
                  }}
                >
                  {card.type}
                </span>
                <span
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "3px 10px",
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                    background: "var(--card-bg)",
                    fontWeight: "500",
                  }}
                >
                  Difficulty {card.difficulty}
                </span>
              </div>
              <button
                onClick={() => handleDelete(card._id)}
                style={{
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "var(--error)",
                  background: "rgba(239, 68, 68, 0.1)",
                  borderRadius: "6px",
                  padding: "3px 8px",
                  fontSize: "11px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                }}
              >
                Delete
              </button>
            </div>
            <p style={{ margin: "0 0 6px", fontWeight: "600", fontSize: "13px", color: "var(--foreground)" }}>
              {card.question || card.content || "—"}
            </p>
            {Array.isArray(card.options) && card.options.length > 0 && (
              <p style={{ margin: "0 0 3px", color: "var(--text-secondary)", fontSize: "12px" }}>
                <strong>Options:</strong> {card.options.join(" | ")}
              </p>
            )}
            {(card.correct || card.answer) && (
              <p style={{ margin: "0 0 0", color: "var(--text-secondary)", fontSize: "12px" }}>
                <strong>Answer:</strong> {card.correct || card.answer}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
