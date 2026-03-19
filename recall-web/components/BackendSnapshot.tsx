"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Source {
  _id: string;
  topic?: string;
  status?: string;
  examDate?: string;
  notes?: string;
}

type CardType = "mcq" | "short_answer" | "fill_blank" | "fact";

interface Card {
  sourceId?: string;
  type?: CardType;
}

interface User {
  name?: string;
  email?: string;
}

interface Props {
  sources: Source[];
  cards: Card[];
  user: User | null;
}

function countCardTypes(cards: Card[]) {
  const counts: Record<CardType, number> = {
    mcq: 0,
    short_answer: 0,
    fill_blank: 0,
    fact: 0,
  };
  for (const card of cards) {
    if (card?.type && counts[card.type] !== undefined) counts[card.type]++;
  }
  return counts;
}

function StatRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-b-0">
      <div className="min-w-30 text-xs font-semibold text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "text-sm leading-relaxed",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export default function BackendSnapshot({ sources, cards, user }: Props) {
  const totalCounts = countCardTypes(cards);
  const cardsBySource: Record<string, Card[]> = {};
  for (const card of cards) {
    const sid = String(card?.sourceId || "");
    if (!cardsBySource[sid]) cardsBySource[sid] = [];
    cardsBySource[sid].push(card);
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <StatRow
            label="User"
            value={
              user ? (
                <span className="font-medium">
                  {user.name}{" "}
                  <span className="text-muted-foreground">({user.email})</span>
                </span>
              ) : (
                "—"
              )
            }
          />
          <StatRow label="Total Sources" value={sources.length} />
          <StatRow
            label="Total Cards"
            value={`$${cards.length} — mcq: ${totalCounts.mcq}, short_answer: ${totalCounts.short_answer}, fill_blank: ${totalCounts.fill_blank}, fact: ${totalCounts.fact}`}
            muted
          />
        </CardContent>
      </Card>

      {sources.map((source) => {
        const sourceCards = cardsBySource[String(source._id)] || [];
        const counts = countCardTypes(sourceCards);
        return (
          <Card key={source._id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex-1">
                  {source.topic || "Untitled"}
                  {source.status && (
                    <span className="ml-2 text-xs font-medium text-muted-foreground">
                      • {source.status}
                    </span>
                  )}
                </span>
                <span className="text-xs font-semibold text-primary">
                  {sourceCards.length} cards
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <StatRow
                label="Exam Date"
                value={
                  source.examDate
                    ? new Date(source.examDate).toLocaleDateString()
                    : "—"
                }
              />
              <StatRow
                label="Notes"
                value={source.notes ? source.notes.slice(0, 80) : "—"}
                muted
              />
              <StatRow
                label="Card Types"
                value={`mcq: ${counts.mcq}, short_answer: ${counts.short_answer}, fill_blank: ${counts.fill_blank}, fact: ${counts.fact}`}
                muted
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
