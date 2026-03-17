export const CARD_TYPES = new Set([
  "mcq",
  "short_answer",
  "fill_blank",
  "fact",
]);

export function toTrimmedString(value: any): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseOptionalExamDate(value: any): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function normalizeCardPayload(body: any) {
  const type = toTrimmedString(body.type);
  const question = toTrimmedString(body.question);
  const content = toTrimmedString(body.content);
  const correct = toTrimmedString(body.correct);
  const answer = toTrimmedString(body.answer) || correct;
  const difficultyNum = Number(body.difficulty);
  const difficulty = Number.isFinite(difficultyNum)
    ? Math.max(1, Math.min(5, Math.round(difficultyNum)))
    : 3;
  const options = Array.isArray(body.options)
    ? body.options.map((o: any) => toTrimmedString(o)).filter(Boolean)
    : toTrimmedString(body.options)
      ? toTrimmedString(body.options)
          .split(",")
          .map((o: string) => o.trim())
          .filter(Boolean)
      : [];

  return {
    type,
    question,
    content,
    correct,
    answer,
    difficulty,
    options,
    youtubeQuery: toTrimmedString(body.youtubeQuery),
    googleQuery: toTrimmedString(body.googleQuery),
  };
}

export function buildCardUpdate(normalized: any) {
  const update: any = {
    type: normalized.type,
    question: normalized.question || undefined,
    content: normalized.content || undefined,
    correct: normalized.correct || undefined,
    answer: normalized.answer || undefined,
    difficulty: normalized.difficulty,
    youtubeQuery: normalized.youtubeQuery || undefined,
    googleQuery: normalized.googleQuery || undefined,
  };

  if (normalized.options.length) {
    update.options = normalized.options;
  } else {
    update.options = undefined;
  }

  if (normalized.type === "fact") {
    update.question = undefined;
    update.correct = undefined;
    update.answer = undefined;
    update.options = undefined;
  }

  return update;
}

export function validateNormalizedCardPayload(normalized: any): string | null {
  if (!CARD_TYPES.has(normalized.type)) return "Invalid card type";
  if (normalized.type === "fact" && !normalized.content)
    return "Fact cards require content";
  if (normalized.type !== "fact" && !normalized.question)
    return "This card type requires a question";
  return null;
}
