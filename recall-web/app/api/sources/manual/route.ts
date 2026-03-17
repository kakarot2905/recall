import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { authMiddleware } from '@/lib/auth'
import Source from '@/models/Source'
import { toTrimmedString, parseOptionalExamDate } from '@/lib/sources.helpers'

export async function POST(req: NextRequest) {
    const { error, status, user } = await authMiddleware(req)
    if (error) return NextResponse.json({ error }, { status })

    const body = await req.json()
    const topic = toTrimmedString(body.topic)
    const notes = toTrimmedString(body.notes) || 'Added from dashboard'
    const examDate = parseOptionalExamDate(body.examDate)

    if (!topic) {
        return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    await connectDB()

    const source = new Source({
        userId: user._id,
        topic, notes, examDate,
        status: 'done'
    })

    await source.save()
    return NextResponse.json({ source })
}