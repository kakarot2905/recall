"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
    pending: "#64748b",
    processing: "#3b82f6",
    done: "#10b981",
    failed: "#ef4444",
  };

  const getStatusVariant = (
    status: string,
  ):
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning" => {
    switch (status) {
      case "done":
        return "success";
      case "processing":
        return "default";
      case "failed":
        return "destructive";
      case "pending":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sources</CardTitle>
            <CardDescription>Manage your learning sources</CardDescription>
          </div>
          <Badge variant="secondary">{sources.length} source(s)</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Source Form */}
        <div className="bg-muted/50 border border-border rounded-lg p-6">
          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add New Source
          </h4>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="topic"
                  className="text-sm font-medium text-foreground"
                >
                  Topic
                </label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Data Structures"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="examDate"
                  className="text-sm font-medium text-foreground"
                >
                  Exam Date
                </label>
                <Input
                  id="examDate"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="notes"
                className="text-sm font-medium text-foreground"
              >
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 md:flex-none">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add Source
              </Button>
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <svg
                    className="w-4 h-4"
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
                  {error}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Sources Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                  Topic
                </th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                  Cards
                </th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                  Exam Date
                </th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg
                        className="w-12 h-12 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                      <div>
                        <p className="text-muted-foreground font-medium">
                          No sources yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Add one above to get started!
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sources.map((source) => (
                  <tr
                    key={source._id}
                    onClick={() => onSelect(source._id)}
                    className={`border-b border-border cursor-pointer transition-all duration-200 hover:bg-accent/50 ${
                      source._id === selectedSourceId ? "bg-accent" : ""
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-foreground">
                          {source.topic}
                        </p>
                        {source.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {source.notes.slice(0, 60)}
                            {source.notes.length > 60 ? "..." : ""}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        variant={getStatusVariant(source.status)}
                        className="capitalize"
                      >
                        {source.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-foreground">
                        {source.cardCount || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {source.examDate
                        ? new Date(source.examDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td
                      className="py-4 px-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(source._id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
