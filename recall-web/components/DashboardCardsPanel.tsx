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
    if (difficulty <= 2) return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900";
    if (difficulty <= 4) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900";
    return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded-xl p-8 shadow-lg"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h2 className="text-3xl font-bold text-foreground">Cards</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <select
            value={selectedSourceId}
            onChange={(e) => onSelectSource(e.target.value)}
            className="px-4 py-2 border border-border/50 rounded-lg bg-secondary text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all hover:border-accent/50"
          >
            <option value="">All Sources</option>
            {sources.map((source) => (
              <option key={source._id} value={source._id}>
                {source.topic}
              </option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground font-medium">
            {filteredCards.length} card{filteredCards.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {!selectedSourceId && (
        <div className="text-center py-8 text-muted-foreground">
          <FileQuestion className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a source to view cards.</p>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {filteredCards.map((card) => (
          <motion.div
            key={card._id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="bg-background border border-border/50 rounded-lg p-5 hover:shadow-lg transition-all duration-300 group hover:border-accent/30"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 text-xs font-semibold bg-secondary text-secondary-foreground rounded-full">
                  {card.type}
                </span>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-lg ${getDifficultyColor(
                    card.difficulty,
                  )}`}
                >
                  Difficulty {card.difficulty}
                </span>
              </div>
              <button
                onClick={() => handleDelete(card._id)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
