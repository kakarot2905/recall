import express from 'express';
import UserProgress from '../models/UserProgress.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

function toPlainObject(value) {
    if (!value) {
        return {};
    }

    if (value instanceof Map) {
        return Object.fromEntries(value.entries());
    }

    if (typeof value.toObject === 'function') {
        return value.toObject();
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
        return { ...value };
    }

    return {};
}

function toDateTimestamp(value) {
    if (!value) {
        return null;
    }

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
}

router.get('/progress', authMiddleware, async (req, res) => {
    try {
        const progress = await UserProgress.findOne({ userId: req.user._id });

        if (!progress) {
            return res.json({
                sm2State: {},
                todayStats: [],
                ghostCardShown: {},
                seenFirstCardPerSource: {}
            });
        }

        return res.json({
            sm2State: toPlainObject(progress.sm2State),
            todayStats: Array.isArray(progress.todayStats) ? progress.todayStats : [],
            ghostCardShown: toPlainObject(progress.ghostCardShown),
            seenFirstCardPerSource: toPlainObject(progress.seenFirstCardPerSource)
        });
    } catch (error) {
        console.error('GET /api/progress error:', error);
        return res.status(500).json({ error: 'Failed to fetch progress' });
    }
});

router.put('/progress', authMiddleware, async (req, res) => {
    try {
        const payload = req.body || {};
        const existing = await UserProgress.findOne({ userId: req.user._id }).lean();

        const existingSm2State = toPlainObject(existing?.sm2State);
        const existingTodayStats = Array.isArray(existing?.todayStats) ? existing.todayStats : [];
        const existingGhostCardShown = toPlainObject(existing?.ghostCardShown);
        const existingSeenFirstCardPerSource = toPlainObject(existing?.seenFirstCardPerSource);

        const mergedSm2State = { ...existingSm2State };
        if (payload.sm2State && typeof payload.sm2State === 'object' && !Array.isArray(payload.sm2State)) {
            Object.entries(payload.sm2State).forEach(([cardId, incomingEntry]) => {
                const existingEntry = mergedSm2State[cardId];

                if (!existingEntry) {
                    mergedSm2State[cardId] = incomingEntry;
                    return;
                }

                const existingLastReviewed = toDateTimestamp(existingEntry.lastReviewed);
                const incomingLastReviewed = toDateTimestamp(incomingEntry?.lastReviewed);

                if (existingLastReviewed === null) {
                    mergedSm2State[cardId] = incomingEntry;
                    return;
                }

                if (incomingLastReviewed === null) {
                    return;
                }

                if (incomingLastReviewed >= existingLastReviewed) {
                    mergedSm2State[cardId] = incomingEntry;
                }
            });
        }

        const todayStatsByDate = new Map();
        existingTodayStats.forEach((entry) => {
            const date = typeof entry?.date === 'string' ? entry.date : '';
            if (!date) {
                return;
            }

            todayStatsByDate.set(date, {
                date,
                count: Number(entry?.count) || 0
            });
        });

        if (Array.isArray(payload.todayStats)) {
            payload.todayStats.forEach((entry) => {
                const date = typeof entry?.date === 'string' ? entry.date : '';
                if (!date) {
                    return;
                }

                const incomingCount = Number(entry?.count) || 0;
                const existingEntry = todayStatsByDate.get(date);

                if (!existingEntry) {
                    todayStatsByDate.set(date, { date, count: incomingCount });
                    return;
                }

                todayStatsByDate.set(date, {
                    date,
                    count: Math.max(existingEntry.count, incomingCount)
                });
            });
        }

        const mergedGhostCardShown = { ...existingGhostCardShown };
        if (payload.ghostCardShown && typeof payload.ghostCardShown === 'object' && !Array.isArray(payload.ghostCardShown)) {
            Object.entries(payload.ghostCardShown).forEach(([key, incomingValue]) => {
                mergedGhostCardShown[key] = mergedGhostCardShown[key] === true
                    ? true
                    : Boolean(incomingValue);
            });
        }

        const mergedSeenFirstCardPerSource = { ...existingSeenFirstCardPerSource };
        if (payload.seenFirstCardPerSource && typeof payload.seenFirstCardPerSource === 'object' && !Array.isArray(payload.seenFirstCardPerSource)) {
            Object.entries(payload.seenFirstCardPerSource).forEach(([key, incomingValue]) => {
                mergedSeenFirstCardPerSource[key] = mergedSeenFirstCardPerSource[key] === true
                    ? true
                    : Boolean(incomingValue);
            });
        }

        await UserProgress.findOneAndUpdate(
            { userId: req.user._id },
            {
                $set: {
                    userId: req.user._id,
                    sm2State: mergedSm2State,
                    todayStats: Array.from(todayStatsByDate.values()),
                    ghostCardShown: mergedGhostCardShown,
                    seenFirstCardPerSource: mergedSeenFirstCardPerSource,
                    lastSyncedAt: Date.now()
                }
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        return res.json({ success: true });
    } catch (error) {
        console.error('PUT /api/progress error:', error);
        return res.status(500).json({ error: 'Failed to save progress' });
    }
});

export default router;