import { GoogleGenerativeAI } from '@google/generative-ai'
import Source from '@/models/Source'
import Card from '@/models/Card'
import { connectDB } from './mongoose'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

async function withRetry(fn: () => Promise<any>, maxAttempts = 3, delayMs = 1500) {
    let lastError: any
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
            }
        }
    }
    throw lastError
}

export async function agent1(topic: string, notes: string) {
    const prompt = `Score the notes 1-10. If score is below 5 or notes are sparse, enrich the content using your own knowledge about the topic "${topic}". Return only the final enriched content as plain text, nothing else.\n\nNotes:\n${notes}`
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
}

export async function agent2(topic: string, enrichedContent: string) {
    const prompt = `Based on the following content about "${topic}", generate 10 MCQ questions. Each must have exactly 4 options and 1 correct answer. Assign difficulty 1-5. For each card also include a short youtubeQuery and googleQuery. Return ONLY a valid JSON array, no markdown, no explanation. Schema: [{ type: "mcq", question, options: [4 strings], correct, difficulty, youtubeQuery, googleQuery }]\n\nContent:\n${enrichedContent}`
    const result = await model.generateContent(prompt)
    let text = result.response.text().trim()
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    return JSON.parse(text)
}

export async function agent3(topic: string, enrichedContent: string) {
    const prompt = `Based on the following content about "${topic}", generate:\n- 5 short answer questions with a single word answer\n- 5 fill in the blank questions with a single word answer\n- 5 one-line facts\n\nAssign difficulty 1-5. Include youtubeQuery and googleQuery for each. Return ONLY a valid JSON array, no markdown. Schema: [{ type: "short_answer"|"fill_blank"|"fact", question, answer, content, difficulty, youtubeQuery, googleQuery }]\n\nFor facts: populate content only. For others: populate question and answer only.\n\nContent:\n${enrichedContent}`
    const result = await model.generateContent(prompt)
    let text = result.response.text().trim()
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    return JSON.parse(text)
}

export async function runAgents(sourceId: string, topic: string, notes: string) {
    try {
        await connectDB()
        await Source.findByIdAndUpdate(sourceId, { status: 'processing' })

        const enrichedContent = await withRetry(() => agent1(topic, notes))
        const mcqCards = await withRetry(() => agent2(topic, enrichedContent))
        const shortCards = await withRetry(() => agent3(topic, enrichedContent))

        const allCards = [...mcqCards, ...shortCards]
        const cardDocuments = allCards.map(card => ({ sourceId, ...card }))

        await Card.insertMany(cardDocuments)
        await Source.findByIdAndUpdate(sourceId, { status: 'done' })

        console.log('[Pipeline] Completed', { sourceId, cardCount: cardDocuments.length })
    } catch (error) {
        console.error('[Pipeline] Failed:', error)
        await Source.findByIdAndUpdate(sourceId, { status: 'failed' })
    }
}