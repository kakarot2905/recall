import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { authMiddleware } from "@/lib/auth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const NOTE_LENGTH_CONFIG: Record<
  string,
  { wordRange: string; label: string }
> = {
  short: { wordRange: "200–350", label: "concise overview" },
  medium: { wordRange: "500–800", label: "detailed summary" },
  long: { wordRange: "1000–1500", label: "comprehensive deep-dive" },
};

export async function POST(req: NextRequest) {
  const { error, status, user } = await authMiddleware(req);
  if (error) return NextResponse.json({ error }, { status });

  try {
    const body = await req.json();
    const topic = (body.topic || "").trim();
    const length = ((body.length || "medium") as string).toLowerCase();

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 },
      );
    }

    const config = NOTE_LENGTH_CONFIG[length] || NOTE_LENGTH_CONFIG.medium;

    const prompt = `You are an expert study material creator. Generate a ${config.label} of study notes on the topic: "${topic}".

Requirements:
- Target length: ${config.wordRange} words
- Structure the notes with clear headings and sub-sections
- Include key definitions, core concepts, and important facts
- Use bullet points for lists of related items
- Add brief real-world examples or analogies where helpful
- Focus on exam-relevant, high-retention content
- Write in clear, student-friendly language

Return ONLY the notes as plain text with markdown formatting (headings, bullets, bold for key terms). Do not add any preamble or meta-commentary.`;

    console.log("[GenerateNotes] Started", {
      topic,
      length,
      userId: user._id,
    });
    const startedAt = Date.now();

    let notes = "";
    let lastError;
    // Retry logic for 503 "High Demand" errors
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        notes = result.response.text().trim();
        break; // Success, exit loop
      } catch (err: any) {
        lastError = err;
        console.warn(`[GenerateNotes] Attempt ${attempt} failed:`, err?.message);
        if (attempt < 3 && err?.message?.includes("503")) {
          // Wait 1.5 seconds before retrying
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } else {
          throw err; // Not a 503 or max retries reached
        }
      }
    }

    console.log("[GenerateNotes] Completed", {
      topic,
      length,
      notesLength: notes.length,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ notes });
  } catch (err: any) {
    console.error("POST /api/generate-notes error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate notes" },
      { status: 500 },
    );
  }
}
