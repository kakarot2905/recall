import mongoose from 'mongoose'

const userProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    sm2State: { type: Map, of: mongoose.Schema.Types.Mixed, default: () => new Map() },
    todayStats: {
        type: [{ date: { type: String }, count: { type: Number, default: 0 } }],
        default: []
    },
    ghostCardShown: { type: Map, of: Boolean, default: () => new Map() },
    seenFirstCardPerSource: { type: Map, of: Boolean, default: () => new Map() },
    lastSyncedAt: { type: Date, default: Date.now }
})

export default mongoose.models.UserProgress || mongoose.model('UserProgress', userProgressSchema)