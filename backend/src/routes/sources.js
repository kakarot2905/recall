import express from 'express';
import Source from '../models/Source.js';
import Card from '../models/Card.js';
import { runAgents } from '../agents/agents.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

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
