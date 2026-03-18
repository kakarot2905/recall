"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const PALETTE = [
  "#C5BAFF",
  "#7EC8E3",
  "#A8D5A2",
  "#FFB347",
  "#FF9AA2",
  "#B5EAD7",
];
const DAYS_PAST = 7;

interface Props {
  cards: any[];
  sources: any[];
  sm2State: Record<string, any>;
}

function buildSourceTopicMap(sources: any[]) {
  const map: Record<string, string> = {};
  for (const source of sources) {
    if (source?._id)
      map[String(source._id)] = source.topic || String(source._id);
  }
  return map;
}

function topicForCard(card: any, sourceTopicMap: Record<string, string>) {
  if (card.topic) return card.topic;
  const sid = card.sourceId != null ? String(card.sourceId) : null;
  if (!sid) return "Unknown";
  return sourceTopicMap[sid] || sid;
}

function isReviewed(sm2State: Record<string, any>, id: string) {
  const key = String(id);
  return (
    key in sm2State &&
    sm2State[key].lastReviewed != null &&
    typeof sm2State[key].lastReviewed === "string"
  );
}

function resolveExamDate(sources: any[]): Date | null {
  const now = Date.now();
  let earliest: Date | null = null;
  for (const source of sources) {
    if (!source.examDate) continue;
    const d = new Date(source.examDate);
    if (isNaN(d.getTime()) || d.getTime() <= now) continue;
    if (!earliest || d < earliest) earliest = d;
  }
  return earliest;
}

function mean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

function computeRetentionSeries(
  cards: any[],
  sm2State: Record<string, any>,
  sources: any[],
) {
  const sourceTopicMap = buildSourceTopicMap(sources);

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const start = new Date(todayMidnight);
  start.setDate(start.getDate() - DAYS_PAST);

  const examDate = resolveExamDate(sources);
  const endFallback = new Date(todayMidnight);
  endFallback.setDate(endFallback.getDate() + 7);
  const isValidFutureDate =
    examDate instanceof Date &&
    !isNaN(examDate.getTime()) &&
    examDate > todayMidnight;
  const end = isValidFutureDate ? examDate : endFallback;

  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const todayMs = todayMidnight.getTime();
  const dayOffsets = days.map((d) =>
    Math.round((d.getTime() - todayMs) / 86400000),
  );
  const labels = days.map((d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  );

  // Group reviewed cards by topic
  const byTopic: Record<string, any[]> = {};
  for (const card of cards) {
    if (!isReviewed(sm2State, card._id)) continue;
    const topic = topicForCard(card, sourceTopicMap);
    if (!byTopic[topic]) byTopic[topic] = [];
    byTopic[topic].push(card);
  }

  const series: Record<string, (number | null)[]> = {};

  for (const [topic, topicCards] of Object.entries(byTopic)) {
    if (!topicCards.length) continue;

    series[topic] = days.map((day) => {
      const dayEndMs = day.getTime() + 86399999;

      const perCard = topicCards
        .map((card) => {
          const state = sm2State[String(card._id)];
          if (!state) return null;
          const lastReviewedMs = new Date(state.lastReviewed).getTime();
          if (lastReviewedMs > dayEndMs) return null;

          const S = Math.max((state.interval || 600000) / 86400000, 1);
          const t = (dayEndMs - lastReviewedMs) / 86400000;
          return Math.exp(-t / S) * 100;
        })
        .filter((v): v is number => v !== null);

      if (!perCard.length) return null;
      return Math.round(mean(perCard) * 10) / 10;
    });
  }

  return { labels, series, dayOffsets };
}

export default function DashboardRetentionChart({
  cards,
  sources,
  sm2State,
}: Props) {
  const [selectedTopic, setSelectedTopic] = useState<string>("");

  if (!cards.length || !Object.keys(sm2State).length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>
          No reviewed cards yet. Complete a calibration quiz to see your curves.
        </p>
      </div>
    );
  }

  const { labels, series, dayOffsets } = computeRetentionSeries(
    cards,
    sm2State,
    sources,
  );
  const topics = Object.keys(series);
  const todayIndex = dayOffsets.indexOf(0);

  if (!topics.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>
          No reviewed cards yet. Complete a calibration quiz to see your curves.
        </p>
      </div>
    );
  }

  const topicsToShow = selectedTopic ? [selectedTopic] : topics;

  // Map to Recharts data format
  const data = labels.map((label, index) => {
    const entry: any = { day: label };
    topicsToShow.forEach((topic) => {
      const value = series[topic][index];
      entry[topic] = value === null ? NaN : value;
    });
    return entry;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{`Day: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.dataKey}: ${!isNaN(entry.value) ? entry.value.toFixed(1) + "%" : "—"}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-md">
      <h2 className="text-2xl font-bold text-foreground mb-6">Retention Curve</h2>
      <div className="mb-6">
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Filter by Topic
        </label>
        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all min-w-48"
        >
          <option value="">All Topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="rect" />
            {topicsToShow.map((topic, index) => (
              <Area
                key={topic}
                type="monotone"
                dataKey={topic}
                stackId="1"
                stroke={PALETTE[index % PALETTE.length]}
                fill={PALETTE[index % PALETTE.length]}
                fillOpacity={0.6}
                strokeWidth={2}
                connectNulls={false}
              />
            ))}
            {/* Today line */}
            {todayIndex >= 0 && (
              <line
                x1={todayIndex * (100 / (labels.length - 1)) + "%"}
                y1="0%"
                x2={todayIndex * (100 / (labels.length - 1)) + "%"}
                y2="100%"
                stroke="rgba(100,100,200,0.45)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
