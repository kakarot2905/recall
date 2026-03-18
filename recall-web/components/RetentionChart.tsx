"use client";

import { useEffect, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

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

export default function RetentionChart({ cards, sources, sm2State }: Props) {
  const [selectedTopic, setSelectedTopic] = useState<string>("");

  if (!cards.length || !Object.keys(sm2State).length) {
    return (
      <p style={{ color: "#5e6678", fontSize: 13 }}>
        No reviewed cards yet. Complete a calibration quiz to see your curves.
      </p>
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
      <p style={{ color: "#5e6678", fontSize: 13 }}>
        No reviewed cards yet. Complete a calibration quiz to see your curves.
      </p>
    );
  }

  const topicsToShow = selectedTopic ? [selectedTopic] : topics;

  // THE FIX: null → NaN so Chart.js renders gaps instead of 0%
  const datasets = topicsToShow
    .filter((t) => series[t])
    .map((topic, idx) => ({
      label: topic,
      data: series[topic].map((v) => (v === null ? NaN : v)),
      borderColor: PALETTE[idx % PALETTE.length],
      backgroundColor: PALETTE[idx % PALETTE.length] + "22",
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.35,
      spanGaps: true,
      fill: false,
    }));

  

  // Custom plugin to draw "Today" vertical line
  const todayLinePlugin = {
    id: "recallTodayLine",
    afterDraw(chart: any) {
      if (todayIndex < 0) return;
      const ctx = chart.ctx;
      const xPos = chart.scales.x.getPixelForValue(todayIndex);
      const top = chart.scales.y.top;
      const bottom = chart.scales.y.bottom;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(xPos, top);
      ctx.lineTo(xPos, bottom);
      ctx.strokeStyle = "rgba(100,100,200,0.45)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.font = "10px Segoe UI, sans-serif";
      ctx.fillStyle = "rgba(100,100,200,0.7)";
      ctx.textAlign = "center";
      ctx.fillText("Today", xPos, top - 4);
      ctx.restore();
    },
  };

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
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
        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          style={{
            border: "1px solid #d8deea",
            borderRadius: 8,
            padding: "6px 8px",
            fontSize: 13,
            fontFamily: "inherit",
            background: "#fff",
            minWidth: 180,
          }}
        >
          <option value="">All Topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div style={{ position: "relative", height: 300 }}>
        <Line
          data={{
            labels,
            datasets
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
              legend: {
                display: true,
                position: "bottom",
                labels: { font: { size: 11 }, boxWidth: 12, padding: 10 },
              },
              tooltip: {
                callbacks: {
                  label: (ctx: any) =>
                    `${ctx.dataset.label}: ${!isNaN(ctx.parsed.y) ? ctx.parsed.y.toFixed(1) + "%" : "—"}`,
                },
              },
            },
            scales: {
              x: {
                ticks: { font: { size: 10 }, maxRotation: 45 },
                grid: { color: "rgba(0,0,0,0.04)" },
              },
              y: {
                min: 0,
                max: 100,
                ticks: { font: { size: 10 }, callback: (v: any) => v + "%" },
                grid: { color: "rgba(0,0,0,0.06)" },
              },
            },
          }}
          plugins={[todayLinePlugin]}
        />
      </div>
    </div>
  );
}
