import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

export async function POST(req: NextRequest) {
    try {
        const { question, userAnswer, expectedAnswer } = await req.json()

        if (!question || !userAnswer || !expectedAnswer) {
            return NextResponse.json(
                { error: 'question, userAnswer, expectedAnswer required' },
                { status: 400 }
            )
        }

        const prompt = `
You are grading a flashcard response.

Question: ${question}
Expected Answer: ${expectedAnswer}
Student Answer: ${userAnswer}

Rules:
- Accept minor phrasing differences.
- Accept synonyms or equivalent meaning.
- Reject if meaning is wrong/incomplete.

Return ONLY JSON:
{"correct": true}
or
{"correct": false}
`

        const result = await model.generateContent(prompt)
        const text = result.response.text().trim()
        const match = text.match(/\{[\s\S]*\}/)

        if (!match) return NextResponse.json({ correct: false })

        const parsed = JSON.parse(match[0])
        return NextResponse.json({ correct: !!parsed.correct })
    } catch (error) {
        console.error('POST /api/check-answer error:', error)
        return NextResponse.json({ correct: false })
    }
}