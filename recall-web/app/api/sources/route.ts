import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { authMiddleware } from '@/lib/auth'
import Source from '@/models/Source'
import Card from '@/models/Card'
import { runAgents } from '@/lib/agents'

export async function GET(req: NextRequest) {
    const { error, status, user } = await authMiddleware(req)
    if (error) return NextResponse.json({ error }, { status })

    await connectDB()

    const sources = await Source.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .lean()

    const sourceIds = sources.map(s => s._id)
    const cardCounts = await Card.aggregate([
        { $match: { sourceId: { $in: sourceIds } } },
        { $group: { _id: '$sourceId', count: { $sum: 1 } } }
    ])

    const cardCountMap = new Map(cardCounts.map((item: any) => [item._id.toString(), item.count]))
    const result = sources.map(source => ({
        ...source,
        cardCount: cardCountMap.get(source._id.toString()) || 0
    }))

    return NextResponse.json({ sources: result })
}

export async function POST(req: NextRequest) {
    const { error, status, user } = await authMiddleware(req)
    if (error) return NextResponse.json({ error }, { status })

    const { topic, notes, examDate } = await req.json()

    if (!topic || !notes) {
        return NextResponse.json({ error: 'Topic and notes are required' }, { status: 400 })
    }

    await connectDB()

    const recentSource = await Source.findOne({ userId: user._id })
        .sort({ createdAt: -1 })
        .lean()

    if (recentSource && (Date.now() - new Date(recentSource.createdAt).getTime()) < 60000) {
        return NextResponse.json(
            { error: 'Please wait before generating another topic.' },
            { status: 429 }
        )
    }

    const source = new Source({
        userId: user._id,
        topic,
        notes,
        examDate: examDate ? new Date(examDate) : null,
        status: 'pending'
    })

    await source.save()

    // Fire and forget — do NOT await
    runAgents(source._id.toString(), topic, notes)

    return NextResponse.json({ sourceId: source._id })
}