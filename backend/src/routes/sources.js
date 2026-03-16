import express from 'express';
import Source from '../models/Source.js';
import Card from '../models/Card.js';
import { runAgents } from '../agents/agents.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const CARD_TYPES = new Set(['mcq', 'short_answer', 'fill_blank', 'fact']);

function toTrimmedString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function parseOptionalExamDate(value) {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function normalizeCardPayload(body) {
    const type = toTrimmedString(body.type);
    const question = toTrimmedString(body.question);
    const content = toTrimmedString(body.content);
    const correct = toTrimmedString(body.correct);
    const answer = toTrimmedString(body.answer) || correct;
    const difficultyNum = Number(body.difficulty);
    const difficulty = Number.isFinite(difficultyNum) ? Math.max(1, Math.min(5, Math.round(difficultyNum))) : 3;
    const options = Array.isArray(body.options)
        ? body.options.map((option) => toTrimmedString(option)).filter(Boolean)
        : toTrimmedString(body.options)
            ? toTrimmedString(body.options).split(',').map((option) => option.trim()).filter(Boolean)
            : [];

    return {
        type,
        question,
        content,
        correct,
        answer,
        difficulty,
        options,
        youtubeQuery: toTrimmedString(body.youtubeQuery),
        googleQuery: toTrimmedString(body.googleQuery)
    };
}

function buildCardUpdate(normalized) {
    const update = {
        type: normalized.type,
        question: normalized.question || undefined,
        content: normalized.content || undefined,
        correct: normalized.correct || undefined,
        answer: normalized.answer || undefined,
        difficulty: normalized.difficulty,
        youtubeQuery: normalized.youtubeQuery || undefined,
        googleQuery: normalized.googleQuery || undefined
    };

    if (normalized.options.length) {
        update.options = normalized.options;
    } else {
        update.options = undefined;
    }

    if (normalized.type === 'fact') {
        update.question = undefined;
        update.correct = undefined;
        update.answer = undefined;
        update.options = undefined;
    }

    return update;
}

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
        if (!CARD_TYPES.has(normalized.type)) {
            return res.status(400).json({ error: 'Invalid card type' });
        }

        if (normalized.type === 'fact' && !normalized.content) {
            return res.status(400).json({ error: 'Fact cards require content' });
        }

        if (normalized.type !== 'fact' && !normalized.question) {
            return res.status(400).json({ error: 'This card type requires a question' });
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

        if (!CARD_TYPES.has(normalized.type)) {
            return res.status(400).json({ error: 'Invalid card type' });
        }

        if (normalized.type === 'fact' && !normalized.content) {
            return res.status(400).json({ error: 'Fact cards require content' });
        }

        if (normalized.type !== 'fact' && !normalized.question) {
            return res.status(400).json({ error: 'This card type requires a question' });
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
