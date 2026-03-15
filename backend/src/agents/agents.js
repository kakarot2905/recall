import { GoogleGenerativeAI } from '@google/generative-ai';
import Source from '../models/Source.js';
import Card from '../models/Card.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function withRetry(fn, maxAttempts = 3, delayMs = 1500) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            console.warn(`[Retry] Attempt ${attempt}/${maxAttempts} failed:`, error.message);
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
            }
        }
    }
    throw lastError;
}

/**
 * Agent 1: Quality & Enrichment
 * Scores notes and enriches if needed
 */
export async function agent1(topic, notes) {
    try {
        const startedAt = Date.now();
        console.log('[Agent1] Started', { topic, notesLength: notes.length });

        const prompt = `Score the notes 1-10. If score is below 5 or notes are sparse, enrich the content using your own knowledge about the topic "${topic}". Return only the final enriched content as plain text, nothing else.

Notes:
${notes}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const enrichedContent = response.text();

        console.log('[Agent1] Completed', {
            topic,
            enrichedLength: enrichedContent.trim().length,
            durationMs: Date.now() - startedAt
        });

        return enrichedContent.trim();
    } catch (error) {
        console.error('Agent 1 error:', error);
        throw new Error('Failed to enrich content');
    }
}

/**
 * Agent 2: MCQ Generator
 * Generates 10 MCQ questions
 */
export async function agent2(topic, enrichedContent) {
    try {
        const startedAt = Date.now();
        console.log('[Agent2] Started', { topic, contentLength: enrichedContent.length });

        const prompt = `Based on the following content about "${topic}", generate 10 MCQ questions. Each must have exactly 4 options and 1 correct answer. Assign difficulty 1-5. For each card also include a short youtubeQuery (YouTube search terms) and googleQuery (Google search terms) to help the learner explore the concept further. Return ONLY a valid JSON array, no markdown, no explanation. Schema: [{ type: "mcq", question, options: [4 strings], correct, difficulty, youtubeQuery, googleQuery }]

Content:
${enrichedContent}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // Strip markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        const mcqCards = JSON.parse(text);
        console.log('[Agent2] Completed', {
            topic,
            cardCount: Array.isArray(mcqCards) ? mcqCards.length : 0,
            durationMs: Date.now() - startedAt
        });
        return mcqCards;
    } catch (error) {
        console.error('Agent 2 error:', error);
        throw new Error('Failed to generate MCQ cards');
    }
}

/**
 * Agent 3: Short Cards Generator
 * Generates short answer, fill blank, and fact cards
 */
export async function agent3(topic, enrichedContent) {
    try {
        const startedAt = Date.now();
        console.log('[Agent3] Started', { topic, contentLength: enrichedContent.length });

        const prompt = `Based on the following content about "${topic}", generate:
- 5 short answer questions with a single word answer
- 5 fill in the blank questions with a single word answer
- 5 one-line facts (informative statements, not questions)

Assign difficulty 1-5 to each. For each card also include a short youtubeQuery (YouTube search terms) and googleQuery (Google search terms) to help the learner explore the concept further. Return ONLY a valid JSON array, no markdown, no explanation. Schema: [{ type: "short_answer"|"fill_blank"|"fact", question, answer, content, difficulty, youtubeQuery, googleQuery }]

For facts: populate content only. For others: populate question and answer only.

Content:
${enrichedContent}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // Strip markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        const shortCards = JSON.parse(text);
        console.log('[Agent3] Completed', {
            topic,
            cardCount: Array.isArray(shortCards) ? shortCards.length : 0,
            durationMs: Date.now() - startedAt
        });
        return shortCards;
    } catch (error) {
        console.error('Agent 3 error:', error);
        throw new Error('Failed to generate short cards');
    }
}

/**
 * Run all agents sequentially and save cards
 */
export async function runAgents(sourceId, topic, notes) {
    try {
        const startedAt = Date.now();
        console.log('[Pipeline] Agent run started', { sourceId, topic });

        // Update status to processing
        await Source.findByIdAndUpdate(sourceId, { status: 'processing' });
        console.log('[Pipeline] Source status updated', { sourceId, status: 'processing' });

        // Run agents sequentially
        const enrichedContent = await withRetry(() => agent1(topic, notes));
        const mcqCards = await withRetry(() => agent2(topic, enrichedContent));
        const shortCards = await withRetry(() => agent3(topic, enrichedContent));

        // Combine all cards
        const allCards = [...mcqCards, ...shortCards];

        // Save all cards to MongoDB
        const cardDocuments = allCards.map(card => ({
            sourceId,
            ...card
        }));

        await Card.insertMany(cardDocuments);
        console.log('[Pipeline] Cards saved', { sourceId, cardCount: cardDocuments.length });

        // Update status to done
        await Source.findByIdAndUpdate(sourceId, { status: 'done' });
        console.log('[Pipeline] Agent run completed', {
            sourceId,
            status: 'done',
            durationMs: Date.now() - startedAt
        });

        return allCards;
    } catch (error) {
        console.error('Run agents error:', error);

        // Update status to failed
        await Source.findByIdAndUpdate(sourceId, { status: 'failed' });
        console.error('[Pipeline] Source status updated', { sourceId, status: 'failed' });

        throw error;
    }
}
