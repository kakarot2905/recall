"use client";

import { motion } from "framer-motion";
import {
  Trash2,
  MoreHorizontal,
  BookOpen,
  Calendar,
  FileText,
} from "lucide-react";

interface Source {
  _id: string;
  topic: string;
  status: string;
  cardCount?: number;
  examDate?: string;
  notes?: string;
}

interface DashboardSourcesTableProps {
  sources: Source[];
  selectedSourceId: string;
  onSelect: (id: string) => void;
  onDelete: (sourceId: string) => void;
}

const statusColors: Record<string, string> = {
  pending: "#b06d00",
  processing: "#326fd1",
  done: "#2e8b57",
  failed: "#b42318",
};

export default function DashboardSourcesTable({
  sources,
  selectedSourceId,
  onSelect,
  onDelete,
}: DashboardSourcesTableProps) {
  const handleDelete = (sourceId: string) => {
    if (confirm("Delete this source and all its cards?")) {
      onDelete(sourceId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">Sources</h2>
        <span className="text-sm text-muted-foreground">
          {sources.length} source(s)
        </span>
      </div>

      <div className="space-y-4">
        {sources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No sources yet.</p>
          </div>
        ) : (
          sources.map((source) => (
            <motion.div
              key={source._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                source._id === selectedSourceId
                  ? "bg-primary/10 border-primary"
                  : "bg-background border-border hover:bg-muted/50"
              }`}
              onClick={() => onSelect(source._id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-medium text-foreground truncate">
                      {source.topic}
                    </h3>
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: `${statusColors[source.status] || "#6b7280"}20`,
                        color: statusColors[source.status] || "#6b7280",
                      }}
                    >
                      {source.status}
                    </span>
                  </div>

                  {source.notes && (
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {source.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{source.cardCount || 0} cards</span>
                    {source.examDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(source.examDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // No-op for now
                    }}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(source._id);
                    }}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
