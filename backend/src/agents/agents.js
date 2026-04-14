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
 * Agent 2: Mixed Cards Generator
 * Generates 5 mixed questions in a single API request
 */
export async function generateMixedCardsAgent(topic, enrichedContent) {
    try {
        const startedAt = Date.now();
        console.log('[Agent2] Started', { topic, contentLength: enrichedContent.length });

        const prompt = `Based on the following content about "${topic}", generate exactly 5 study cards.
Please provide a mix of different types:
- MCQ (type: "mcq", requires: question, options:[4 strings], correct)
- Short Answer (type: "short_answer", requires: question, answer)
- Fill in the Blank (type: "fill_blank", requires: question, answer)
- Fact (type: "fact", requires: content)

Assign difficulty 1-5 to each. For each card also include a short youtubeQuery (YouTube search terms) and googleQuery (Google search terms). Return ONLY a valid JSON array of 5 objects, no markdown, no explanation.

Content:
${enrichedContent}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

        const mixedCards = JSON.parse(text);
        console.log('[Agent2] Completed', {
            topic,
            cardCount: Array.isArray(mixedCards) ? mixedCards.length : 0,
            durationMs: Date.now() - startedAt
        });
        return mixedCards;
    } catch (error) {
        console.error('Agent 2 error:', error);
        throw new Error('Failed to generate mixed cards');
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

        // Step 1: Enrich notes
        const enrichedContent = await withRetry(() => agent1(topic, notes));
        
        // Step 2: Generate 5 mixed cards in a single API request
        const mixedCards = await withRetry(() => generateMixedCardsAgent(topic, enrichedContent));

        // Combine all cards (now just the mixed cards)
        const allCards = [...mixedCards];

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
