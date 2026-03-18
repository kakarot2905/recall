"use client";

import { useState } from "react";
import { Trash2, BookMarked } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookMarked className="w-5 h-5" />
              Cards
            </CardTitle>
            <CardDescription>
              {selectedSourceId
                ? `${selectedCards.length} card(s) from selected source`
                : "Select a source to view cards"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-destructive mb-4">{error}</p>
        )}

        {!selectedSourceId ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookMarked className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a source from the left panel to view its cards.</p>
          </div>
        ) : selectedCards.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No cards in this source yet.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedCards.map((card) => (
              <div
                key={card._id}
                className="border border-border rounded-lg p-4 bg-muted hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {card.type}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {`Level ${card.difficulty || 1}`}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(card._id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-sm">
                    {card.question || card.content || "—"}
                  </p>
                  {Array.isArray(card.options) && card.options.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Options:</span> {card.options.join(" | ")}
                    </p>
                  )}
                  {(card.correct || card.answer) && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Answer:</span> {card.correct || card.answer}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
