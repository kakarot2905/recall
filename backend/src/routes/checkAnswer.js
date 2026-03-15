import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

router.post('/check-answer', async (req, res) => {
    try {
        const { question, userAnswer, expectedAnswer } = req.body;

        if (!question || !userAnswer || !expectedAnswer) {
            return res.status(400).json({ error: 'question, userAnswer, expectedAnswer required' });
        }

        const prompt = `
You are grading a flashcard response.

Question: ${question}
Expected Answer: ${expectedAnswer}
Student Answer: ${userAnswer}

Rules:
- Accept minor phrasing differences.
- Accept synonyms or equivalent meaning.
- Reject if meaning is wrong/incomplete.

Return ONLY JSON:
{"correct": true}
or
{"correct": false}
`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const match = text.match(/\{[\s\S]*\}/);

        if (!match) {
            return res.json({ correct: false });
        }

        const parsed = JSON.parse(match[0]);
        return res.json({ correct: !!parsed.correct });
    } catch (error) {
        console.error('POST /api/check-answer error:', error);
        return res.json({ correct: false });
    }
});

export default router;
