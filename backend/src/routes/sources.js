import express from 'express';
import Source from '../models/Source.js';
import Card from '../models/Card.js';
import { runAgents } from '../agents/agents.js';
import { authMiddleware } from '../middleware/auth.js';
import {
    CARD_TYPES,
    toTrimmedString,
    parseOptionalExamDate,
    normalizeCardPayload,
    buildCardUpdate,
    validateNormalizedCardPayload
} from './sources.helpers.js';

import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const notesModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const NOTE_LENGTH_CONFIG = {
    short:  { wordRange: '200–350',  label: 'concise overview' },
    medium: { wordRange: '500–800',  label: 'detailed summary' },
    long:   { wordRange: '1000–1500', label: 'comprehensive deep-dive' },
};

/**
 * POST /api/generate-notes
 * Generates AI study notes for a given topic and length.
 */
router.post('/generate-notes', authMiddleware, async (req, res) => {
    try {
        const topic = toTrimmedString(req.body.topic);
        const length = (req.body.length || 'medium').toLowerCase();

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        const config = NOTE_LENGTH_CONFIG[length] || NOTE_LENGTH_CONFIG.medium;

        const prompt = `You are an expert study material creator. Generate a ${config.label} of study notes on the topic: "${topic}".

Requirements:
- Target length: ${config.wordRange} words
- Structure the notes with clear headings and sub-sections
- Include key definitions, core concepts, and important facts
- Use bullet points for lists of related items
- Add brief real-world examples or analogies where helpful
- Focus on exam-relevant, high-retention content
- Write in clear, student-friendly language

Return ONLY the notes as plain text with markdown formatting (headings, bullets, bold for key terms). Do not add any preamble or meta-commentary.`;

        console.log('[GenerateNotes] Started', { topic, length, userId: req.user._id });
        const startedAt = Date.now();

        const result = await notesModel.generateContent(prompt);
        const response = await result.response;
        const notes = response.text().trim();

        console.log('[GenerateNotes] Completed', {
            topic,
            length,
            notesLength: notes.length,
            durationMs: Date.now() - startedAt,
        });

        res.json({ notes });
    } catch (error) {
        console.error('POST /api/generate-notes error:', error);
        res.status(500).json({ error: 'Failed to generate notes' });
    }
});

/**
 * GET /api/dashboard-data
 * Returns user, sources, and cards in one payload for dashboard management
 */
router.get('/dashboard-data', authMiddleware, async (req, res) => {
    try {
        const sources = await Source.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        const sourceIds = sources.map((source) => source._id);
        const cards = await Card.find({ sourceId: { $in: sourceIds } }).lean();
        const cardCountBySourceId = new Map();

        cards.forEach((card) => {
            const key = card.sourceId?.toString();
            if (!key) {
                return;
            }
            cardCountBySourceId.set(key, (cardCountBySourceId.get(key) || 0) + 1);
        });

        const sourcesWithCounts = sources.map((source) => ({
            ...source,
            cardCount: cardCountBySourceId.get(source._id.toString()) || 0
        }));

        res.json({
            user: {
                id: req.user._id,
                email: req.user.email,
                name: req.user.name
            },
            sources: sourcesWithCounts,
            cards
        });
    } catch (error) {
        console.error('GET /api/dashboard-data error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

/**
 * GET /api/sources
 * Returns all sources with card counts
 */
router.get('/sources', authMiddleware, async (req, res) => {
    try {
        console.log('[API] GET /api/sources', { userId: req.user._id });

        const sources = await Source.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        const sourceIds = sources.map((source) => source._id);
        const cardCounts = await Card.aggregate([
            { $match: { sourceId: { $in: sourceIds } } },
            { $group: { _id: '$sourceId', count: { $sum: 1 } } }
        ]);

        const cardCountBySourceId = new Map(
            cardCounts.map((item) => [item._id.toString(), item.count])
        );

        const result = sources.map((source) => ({
            ...source,
            cardCount: cardCountBySourceId.get(source._id.toString()) || 0
        }));

        console.log('[API] Sources fetched', { sourceCount: result.length });
        res.json({ sources: result });
    } catch (error) {
        console.error('GET /api/sources error:', error);
        res.status(500).json({ error: 'Failed to fetch sources' });
    }
});

/**
 * POST /api/sources
 * Creates a source and starts agent processing in background
 */
router.post('/sources', authMiddleware, async (req, res) => {
    try {
        const { topic, notes, examDate } = req.body;
        console.log('[API] POST /api/sources received', {
            userId: req.user._id,
            hasTopic: Boolean(topic),
            notesLength: typeof notes === 'string' ? notes.length : 0
        });

        if (!topic || !notes) {
            console.warn('[API] POST /api/sources validation failed');
            return res.status(400).json({ error: 'Topic and notes are required' });
        }

        const recentSource = await Source.findOne({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        if (recentSource && (Date.now() - new Date(recentSource.createdAt).getTime()) < 60000) {
            return res.status(429).json({ error: 'Please wait before generating another topic.' });
        }

        // Create source document
        const source = new Source({
            userId: req.user._id,
            topic,
            notes,
            examDate: examDate ? new Date(examDate) : null,
            status: 'pending'
        });

        await source.save();
        console.log('[API] Source created', {
            sourceId: source._id.toString(),
            topic
        });

        // Fire agents in background (do NOT await)
        runAgents(source._id.toString(), topic, notes).catch(err => {
            console.error('Background agent processing failed:', err);
        });

        // Return immediately
        res.json({ sourceId: source._id });
    } catch (error) {
        console.error('POST /api/sources error:', error);
        res.status(500).json({ error: 'Failed to create source' });
    }
});

/**
 * POST /api/sources/manual
 * Creates a source without running agents (dashboard add)
 */
router.post('/sources/manual', authMiddleware, async (req, res) => {
    try {
        const topic = toTrimmedString(req.body.topic);
        const notes = toTrimmedString(req.body.notes) || 'Added from dashboard';
        const examDate = parseOptionalExamDate(req.body.examDate);

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        const source = new Source({
            userId: req.user._id,
            topic,
            notes,
            examDate,
            status: 'done'
        });

        await source.save();
        res.json({ source });
    } catch (error) {
        console.error('POST /api/sources/manual error:', error);
        res.status(500).json({ error: 'Failed to create source' });
    }
});

/**
 * PUT /api/sources/:sourceId
 * Updates a source owned by current user
 */
router.put('/sources/:sourceId', authMiddleware, async (req, res) => {
    try {
        const { sourceId } = req.params;
        const source = await Source.findOne({ _id: sourceId, userId: req.user._id });

        if (!source) {
            return res.status(404).json({ error: 'Source not found' });
        }

        const topic = toTrimmedString(req.body.topic);
        const notes = toTrimmedString(req.body.notes);
        const status = toTrimmedString(req.body.status);

        if (topic) {
            source.topic = topic;
        }

        if (typeof req.body.notes !== 'undefined') {
            source.notes = notes;
        }

        if (typeof req.body.examDate !== 'undefined') {
            source.examDate = parseOptionalExamDate(req.body.examDate);
        }

        if (status && ['pending', 'processing', 'done', 'failed'].includes(status)) {
            source.status = status;
        }

        await source.save();
        res.json({ source });
    } catch (error) {
        console.error('PUT /api/sources/:sourceId error:', error);
        res.status(500).json({ error: 'Failed to update source' });
    }
});

/**
 * GET /api/sources/:sourceId/status
 * Returns the status of a source
 */
router.get('/sources/:sourceId/status', authMiddleware, async (req, res) => {
    try {
        const { sourceId } = req.params;
        console.log('[API] GET /api/sources/:sourceId/status', { sourceId, userId: req.user._id });

        const source = await Source.findOne({ _id: sourceId, userId: req.user._id });

        if (!source) {
            return res.status(404).json({ error: 'Source not found' });
        }

        console.log('[API] Source status fetched', { sourceId, status: source.status });
        res.json({ status: source.status });
    } catch (error) {
        console.error('GET /api/sources/:sourceId/status error:', error);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
});

/**
 * GET /api/sources/:sourceId/cards
 * Returns all cards for a source
 */
router.get('/sources/:sourceId/cards', authMiddleware, async (req, res) => {
    try {
        const { sourceId } = req.params;
        console.log('[API] GET /api/sources/:sourceId/cards', { sourceId, userId: req.user._id });

        const source = await Source.findOne({ _id: sourceId, userId: req.user._id });

        if (!source) {
            return res.status(404).json({ error: 'Source not found' });
        }

        const cards = await Card.find({ sourceId: source._id });

        console.log('[API] Cards fetched', { sourceId, cardCount: cards.length });
        res.json({ cards });
    } catch (error) {
        console.error('GET /api/sources/:sourceId/cards error:', error);
        res.status(500).json({ error: 'Failed to fetch cards' });
    }
});

/**
 * DELETE /api/sources/:sourceId
 * Deletes a source and all related cards (topic delete)
 */
router.delete('/sources/:sourceId', authMiddleware, async (req, res) => {
    try {
        const { sourceId } = req.params;
        console.log('[API] DELETE /api/sources/:sourceId', { sourceId, userId: req.user._id });

        const source = await Source.findOne({ _id: sourceId, userId: req.user._id });

        if (!source) {
            return res.status(404).json({ error: 'Source not found' });
        }

        await Card.deleteMany({ sourceId: source._id });
        await Source.deleteOne({ _id: source._id });

        console.log('[API] Source deleted', { sourceId });
        res.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/sources/:sourceId error:', error);
        res.status(500).json({ error: 'Failed to delete source' });
    }
});

/**
 * POST /api/sources/:sourceId/cards
 * Adds a card to a source
 */
router.post('/sources/:sourceId/cards', authMiddleware, async (req, res) => {
    try {
        const { sourceId } = req.params;
        const source = await Source.findOne({ _id: sourceId, userId: req.user._id });

        if (!source) {
            return res.status(404).json({ error: 'Source not found' });
        }

        const normalized = normalizeCardPayload(req.body);
        const validationError = validateNormalizedCardPayload(normalized);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const cardData = buildCardUpdate(normalized);
        const card = new Card({
            sourceId: source._id,
            ...cardData
        });

        await card.save();
        res.json({ card });
    } catch (error) {
        console.error('POST /api/sources/:sourceId/cards error:', error);
        res.status(500).json({ error: 'Failed to add card' });
    }
});

/**
 * PUT /api/cards/:cardId
 * Updates one card that belongs to the current user's source
 */
router.put('/cards/:cardId', authMiddleware, async (req, res) => {
    try {
        const { cardId } = req.params;
        const card = await Card.findById(cardId);

        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }

        const source = await Source.findOne({ _id: card.sourceId, userId: req.user._id });
        if (!source) {
            return res.status(404).json({ error: 'Card not found' });
        }

        const normalized = normalizeCardPayload({
            type: req.body.type || card.type,
            question: typeof req.body.question === 'undefined' ? card.question : req.body.question,
            content: typeof req.body.content === 'undefined' ? card.content : req.body.content,
            correct: typeof req.body.correct === 'undefined' ? card.correct : req.body.correct,
            answer: typeof req.body.answer === 'undefined' ? card.answer : req.body.answer,
            difficulty: typeof req.body.difficulty === 'undefined' ? card.difficulty : req.body.difficulty,
            options: typeof req.body.options === 'undefined' ? card.options : req.body.options,
            youtubeQuery: typeof req.body.youtubeQuery === 'undefined' ? card.youtubeQuery : req.body.youtubeQuery,
            googleQuery: typeof req.body.googleQuery === 'undefined' ? card.googleQuery : req.body.googleQuery
        });

        const validationError = validateNormalizedCardPayload(normalized);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const update = buildCardUpdate(normalized);
        Object.assign(card, update);
        await card.save();

        res.json({ card });
    } catch (error) {
        console.error('PUT /api/cards/:cardId error:', error);
        res.status(500).json({ error: 'Failed to update card' });
    }
});

/**
 * DELETE /api/cards/:cardId
 * Deletes one card that belongs to the current user's source
 */
router.delete('/cards/:cardId', authMiddleware, async (req, res) => {
    try {
        const { cardId } = req.params;
        console.log('[API] DELETE /api/cards/:cardId', { cardId, userId: req.user._id });

        const card = await Card.findById(cardId);

        if (!card) {
            return res.status(404).json({ error: 'Card not found' });
        }

        const source = await Source.findOne({ _id: card.sourceId, userId: req.user._id });

        if (!source) {
            return res.status(404).json({ error: 'Card not found' });
        }

        await Card.deleteOne({ _id: card._id });

        console.log('[API] Card deleted', { cardId, sourceId: card.sourceId.toString() });
        res.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/cards/:cardId error:', error);
        res.status(500).json({ error: 'Failed to delete card' });
    }
});

export default router;
