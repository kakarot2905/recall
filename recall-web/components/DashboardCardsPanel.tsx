"use client";

import { motion } from "framer-motion";
import {
  MoreHorizontal,
  FileQuestion,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Card {
  _id: string;
  type: string;
  difficulty: number;
  question?: string;
  content?: string;
  options?: string[];
  correct?: string;
  answer?: string;
  sourceId: string;
}

interface Source {
  _id: string;
  topic: string;
}

interface DashboardCardsPanelProps {
  cards: Card[];
  sources: Source[];
  selectedSourceId: string;
  onSelectSource: (sourceId: string) => void;
  onDelete: (cardId: string) => void;
}

export default function DashboardCardsPanel({
  cards,
  sources,
  selectedSourceId,
  onSelectSource,
  onDelete,
}: DashboardCardsPanelProps) {
  const filteredCards = selectedSourceId
    ? cards.filter((card) => String(card.sourceId) === String(selectedSourceId))
    : cards;

  const handleDelete = (cardId: string) => {
    if (confirm("Delete this card?")) {
      onDelete(cardId);
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "text-green-600 bg-green-100";
    if (difficulty <= 4) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Cards</h2>
        <div className="flex items-center gap-4">
          <select
            value={selectedSourceId}
            onChange={(e) => onSelectSource(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Sources</option>
            {sources.map((source) => (
              <option key={source._id} value={source._id}>
                {source.topic}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">
            {filteredCards.length} card(s)
          </span>
        </div>
      </div>

      {!selectedSourceId && (
        <div className="text-center py-8 text-muted-foreground">
          <FileQuestion className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a source to view cards.</p>
        </div>
      )}

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {filteredCards.map((card) => (
          <motion.div
            key={card._id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-background border border-border rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                  {card.type}
                </span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(
                    card.difficulty,
                  )}`}
                >
                  Difficulty {card.difficulty}
                </span>
              </div>
              <button
                onClick={() => handleDelete(card._id)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-foreground">
                {card.question || card.content || "—"}
              </p>

              {Array.isArray(card.options) && card.options.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Options:</span>{" "}
                  {card.options.join(" | ")}
                </p>
              )}

              {(card.correct || card.answer) && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Answer:</span>{" "}
                    {card.correct || card.answer}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
