import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { authMiddleware } from "@/lib/auth";
import Source from "@/models/Source";
import Card from "@/models/Card";
import {
  normalizeCardPayload,
  buildCardUpdate,
  validateNormalizedCardPayload,
} from "@/lib/sources.helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const { sourceId } = await params;
  const { error, status, user } = await authMiddleware(req);
  if (error) return NextResponse.json({ error }, { status });

  await connectDB();

  const source = await Source.findOne({
    _id: sourceId,
    userId: user._id,
  });
  if (!source)
    return NextResponse.json({ error: "Source not found" }, { status: 404 });

  const cards = await Card.find({ sourceId: source._id });
  return NextResponse.json({ cards });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const { sourceId } = await params;
  const { error, status, user } = await authMiddleware(req);
  if (error) return NextResponse.json({ error }, { status });

  await connectDB();

  const source = await Source.findOne({
    _id: sourceId,
    userId: user._id,
  });
  if (!source)
    return NextResponse.json({ error: "Source not found" }, { status: 404 });

  const body = await req.json();
  const normalized = normalizeCardPayload(body);
  const validationError = validateNormalizedCardPayload(normalized);
  if (validationError)
    return NextResponse.json({ error: validationError }, { status: 400 });

  const card = new Card({
    sourceId: source._id,
    ...buildCardUpdate(normalized),
  });
  await card.save();

  return NextResponse.json({ card });
}
