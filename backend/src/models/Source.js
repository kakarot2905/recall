import mongoose from 'mongoose';

const sourceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    topic: {
        type: String,
        required: true
    },
    notes: {
        type: String,
        required: true
    },
    examDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'done', 'failed'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Source', sourceSchema);
