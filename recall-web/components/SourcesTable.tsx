"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    pending: "#b06d00",
    processing: "#326fd1",
    done: "#2e8b57",
    failed: "#b42318",
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "done":
        return "default";
      case "processing":
        return "secondary";
      case "failed":
        return "destructive";
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
        <form onSubmit={handleAdd} className="space-y-4 p-4 bg-muted rounded-lg border border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="topic" className="text-sm font-medium">Topic</label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Data Structures"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="examDate" className="text-sm font-medium">Exam Date</label>
              <Input
                id="examDate"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="w-full md:w-auto">
              Add Source
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </form>

        {/* Sources Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Topic</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cards</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Exam Date</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No sources yet. Add one to get started!
                  </td>
                </tr>
              ) : (
                sources.map((source) => (
                  <tr
                    key={source._id}
                    onClick={() => onSelect(source._id)}
                    className={`border-b border-border cursor-pointer transition-colors hover:bg-accent ${
                      source._id === selectedSourceId ? "bg-accent" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold">{source.topic}</p>
                        {source.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {source.notes.slice(0, 40)}
                            {source.notes.length > 40 ? "..." : ""}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getStatusVariant(source.status)}>
                        {source.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{source.cardCount || 0}</td>
                    <td className="py-3 px-4 text-sm">
                      {source.examDate
                        ? new Date(source.examDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(source._id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2 py-1 rounded text-sm"
                      >
                        🗑️ Delete
                      </button>
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
