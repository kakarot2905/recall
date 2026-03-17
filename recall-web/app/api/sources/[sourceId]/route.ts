import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { authMiddleware } from "@/lib/auth";
import Source from "@/models/Source";
import Card from "@/models/Card";
import { toTrimmedString, parseOptionalExamDate } from "@/lib/sources.helpers";

export async function PUT(
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
  const topic = toTrimmedString(body.topic);
  const notes = toTrimmedString(body.notes);
  const status2 = toTrimmedString(body.status);

  if (topic) source.topic = topic;
  if (typeof body.notes !== "undefined") source.notes = notes;
  if (typeof body.examDate !== "undefined")
    source.examDate = parseOptionalExamDate(body.examDate);
  if (status2 && ["pending", "processing", "done", "failed"].includes(status2))
    source.status = status2;

  await source.save();
  return NextResponse.json({ source });
}

export async function DELETE(
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

  await Card.deleteMany({ sourceId: source._id });
  await Source.deleteOne({ _id: source._id });

  return NextResponse.json({ success: true });
}
