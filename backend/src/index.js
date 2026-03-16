import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import sourcesRouter from './routes/sources.js';
import authRouter from './routes/auth.js';
import checkAnswerRouter from './routes/checkAnswer.js';

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashboardPath = path.join(__dirname, 'public', 'dashboard.html');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const durationMs = Date.now() - start;
        console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`);
    });

    next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✓ MongoDB connected');
    })
    .catch((error) => {
        console.error('✗ MongoDB connection error:', error);
        process.exit(1);
    });

// Routes
app.use('/api/auth', authRouter);
app.use('/api', sourcesRouter);
app.use('/api', checkAnswerRouter);

app.get('/', (_req, res) => {
    res.redirect('/dashboard');
});

app.get('/dashboard', (_req, res) => {
    res.sendFile(dashboardPath);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
    console.log(`[Boot] Environment: ${process.env.NODE_ENV || 'development'}`);
});
