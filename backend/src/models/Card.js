import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema({
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Source',
        required: true
    },
    type: {
        type: String,
        enum: ['mcq', 'short_answer', 'fill_blank', 'fact'],
        required: true
    },
    question: {
        type: String
    },
    options: {
        type: [String]
    },
    correct: {
        type: String
    },
    answer: {
        type: String
    },
    content: {
        type: String
    },
    difficulty: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    youtubeQuery: {
        type: String
    },
    googleQuery: {
        type: String
    }
});

export default mongoose.model('Card', cardSchema);
