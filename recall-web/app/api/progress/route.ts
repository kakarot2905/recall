import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { authMiddleware } from '@/lib/auth'
import UserProgress from '@/models/UserProgress'

function toPlainObject(value: any): Record<string, any> {
    if (!value) return {}
    if (value instanceof Map) return Object.fromEntries(value.entries())
    if (typeof value.toObject === 'function') return value.toObject()
    if (typeof value === 'object' && !Array.isArray(value)) return { ...value }
    return {}
}

function toDateTimestamp(value: any): number | null {
    if (!value) return null
    const timestamp = new Date(value).getTime()
    return Number.isNaN(timestamp) ? null : timestamp
}

export async function GET(req: NextRequest) {
    const { error, status, user } = await authMiddleware(req)
    if (error) return NextResponse.json({ error }, { status })

    await connectDB()

    const progress = await UserProgress.findOne({ userId: user._id })

    if (!progress) {
        return NextResponse.json({
            sm2State: {},
            todayStats: [],
            ghostCardShown: {},
            seenFirstCardPerSource: {}
        })
    }

    return NextResponse.json({
        sm2State: toPlainObject(progress.sm2State),
        todayStats: Array.isArray(progress.todayStats) ? progress.todayStats : [],
        ghostCardShown: toPlainObject(progress.ghostCardShown),
        seenFirstCardPerSource: toPlainObject(progress.seenFirstCardPerSource)
    })
}

export async function PUT(req: NextRequest) {
    const { error, status, user } = await authMiddleware(req)
    if (error) return NextResponse.json({ error }, { status })

    await connectDB()

    const payload = await req.json()
    const existing = await UserProgress.findOne({ userId: user._id }).lean()

    const existingSm2State = toPlainObject(existing?.sm2State)
    const existingTodayStats = Array.isArray(existing?.todayStats) ? existing.todayStats : []
    const existingGhostCardShown = toPlainObject(existing?.ghostCardShown)
    const existingSeenFirstCardPerSource = toPlainObject(existing?.seenFirstCardPerSource)

    // Merge SM2 state — keep most recently reviewed entry per card
    const mergedSm2State = { ...existingSm2State }
    if (payload.sm2State && typeof payload.sm2State === 'object' && !Array.isArray(payload.sm2State)) {
        Object.entries(payload.sm2State).forEach(([cardId, incomingEntry]: [string, any]) => {
            const existingEntry = mergedSm2State[cardId]

            if (!existingEntry) {
                mergedSm2State[cardId] = incomingEntry
                return
            }

            const existingLastReviewed = toDateTimestamp(existingEntry.lastReviewed)
            const incomingLastReviewed = toDateTimestamp(incomingEntry?.lastReviewed)

            if (existingLastReviewed === null) {
                mergedSm2State[cardId] = incomingEntry
                return
            }

            if (incomingLastReviewed === null) return

            if (incomingLastReviewed >= existingLastReviewed) {
                mergedSm2State[cardId] = incomingEntry
            }
        })
    }

    // Merge today stats — keep highest count per date
    const todayStatsByDate = new Map<string, { date: string; count: number }>()
    existingTodayStats.forEach((entry: any) => {
        const date = typeof entry?.date === 'string' ? entry.date : ''
        if (!date) return
        todayStatsByDate.set(date, { date, count: Number(entry?.count) || 0 })
    })

    if (Array.isArray(payload.todayStats)) {
        payload.todayStats.forEach((entry: any) => {
            const date = typeof entry?.date === 'string' ? entry.date : ''
            if (!date) return
            const incomingCount = Number(entry?.count) || 0
            const existingEntry = todayStatsByDate.get(date)

            if (!existingEntry) {
                todayStatsByDate.set(date, { date, count: incomingCount })
                return
            }

            todayStatsByDate.set(date, {
                date,
                count: Math.max(existingEntry.count, incomingCount)
            })
        })
    }

    // Merge ghost card shown — once true, always true
    const mergedGhostCardShown = { ...existingGhostCardShown }
    if (payload.ghostCardShown && typeof payload.ghostCardShown === 'object' && !Array.isArray(payload.ghostCardShown)) {
        Object.entries(payload.ghostCardShown).forEach(([key, incomingValue]: [string, any]) => {
            mergedGhostCardShown[key] = mergedGhostCardShown[key] === true
                ? true
                : Boolean(incomingValue)
        })
    }

    // Merge seen first card per source — once true, always true
    const mergedSeenFirstCardPerSource = { ...existingSeenFirstCardPerSource }
    if (payload.seenFirstCardPerSource && typeof payload.seenFirstCardPerSource === 'object' && !Array.isArray(payload.seenFirstCardPerSource)) {
        Object.entries(payload.seenFirstCardPerSource).forEach(([key, incomingValue]: [string, any]) => {
            mergedSeenFirstCardPerSource[key] = mergedSeenFirstCardPerSource[key] === true
                ? true
                : Boolean(incomingValue)
        })
    }

    await UserProgress.findOneAndUpdate(
        { userId: user._id },
        {
            $set: {
                userId: user._id,
                sm2State: mergedSm2State,
                todayStats: Array.from(todayStatsByDate.values()),
                ghostCardShown: mergedGhostCardShown,
                seenFirstCardPerSource: mergedSeenFirstCardPerSource,
                lastSyncedAt: Date.now()
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return NextResponse.json({ success: true })
}