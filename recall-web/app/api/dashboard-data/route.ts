import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { authMiddleware } from '@/lib/auth'
import Source from '@/models/Source'
import Card from '@/models/Card'

export async function GET(req: NextRequest) {
    const { error, status, user } = await authMiddleware(req)
    if (error) return NextResponse.json({ error }, { status })

    await connectDB()

    const sources = await Source.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .lean()

    const sourceIds = sources.map(s => s._id)
    const cards = await Card.find({ sourceId: { $in: sourceIds } }).lean()

    const cardCountBySourceId = new Map<string, number>()
    cards.forEach(card => {
        const key = card.sourceId?.toString()
        if (!key) return
        cardCountBySourceId.set(key, (cardCountBySourceId.get(key) || 0) + 1)
    })

    const sourcesWithCounts = sources.map(source => ({
        ...source,
        cardCount: cardCountBySourceId.get(source._id.toString()) || 0
    }))

    return NextResponse.json({
        user: { id: user._id, email: user.email, name: user.name },
        sources: sourcesWithCounts,
        cards
    })
}