import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { authMiddleware } from "@/lib/auth";
import Source from "@/models/Source";

export async function GET(
  req: NextRequest,
  { params }: { params: { sourceId: string } },
) {
  const { error, status, user } = await authMiddleware(req);
  if (error) return NextResponse.json({ error }, { status });

  await connectDB();

  const source = await Source.findOne({
    _id: params.sourceId,
    userId: user._id,
  });
  if (!source)
    return NextResponse.json({ error: "Source not found" }, { status: 404 });

  return NextResponse.json({ status: source.status });
}
