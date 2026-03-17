import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { authMiddleware } from '@/lib/auth'
import Source from '@/models/Source'
import Card from '@/models/Card'
import { normalizeCardPayload, buildCardUpdate, validateNormalizedCardPayload } from '@/lib/sources.helpers'

export async function PUT(req: NextRequest, { params }: { params: { cardId: string } }) {
    const { error, status, user } = await authMiddleware(req)
    if (error) return NextResponse.json({ error }, { status })

    await connectDB()

    const card = await Card.findById(params.cardId)
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

    const source = await Source.findOne({ _id: card.sourceId, userId: user._id })
    if (!source) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

    const body = await req.json()
    const normalized = normalizeCardPayload({
        type: body.type || card.type,
        question: typeof body.question === 'undefined' ? card.question : body.question,
        content: typeof body.content === 'undefined' ? card.content : body.content,
        correct: typeof body.correct === 'undefined' ? card.correct : body.correct,
        answer: typeof body.answer === 'undefined' ? card.answer : body.answer,
        difficulty: typeof body.difficulty === 'undefined' ? card.difficulty : body.difficulty,
        options: typeof body.options === 'undefined' ? card.options : body.options,
        youtubeQuery: typeof body.youtubeQuery === 'undefined' ? card.youtubeQuery : body.youtubeQuery,
        googleQuery: typeof body.googleQuery === 'undefined' ? card.googleQuery : body.googleQuery,
    })

    const validationError = validateNormalizedCardPayload(normalized)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    Object.assign(card, buildCardUpdate(normalized))
    await card.save()

    return NextResponse.json({ card })
}

export async function DELETE(req: NextRequest, { params }: { params: { cardId: string } }) {
    const { error, status, user } = await authMiddleware(req)
    if (error) return NextResponse.json({ error }, { status })

    await connectDB()

    const card = await Card.findById(params.cardId)
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

    const source = await Source.findOne({ _id: card.sourceId, userId: user._id })
    if (!source) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

    await Card.deleteOne({ _id: card._id })
    return NextResponse.json({ success: true })
}