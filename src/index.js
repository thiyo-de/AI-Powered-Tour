// ─── Express Server Entry Point ──────────────────────────
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PORT, ALLOWED_ORIGINS, NODE_ENV } = require('./config');

// Import routes
const healthRoutes = require('./routes/health');
const ttsRoutes = require('./routes/tts');

const app = express();

// ─── Middleware ───────────────────────────────────────────

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        if (NODE_ENV === 'development') return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));

app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 120, // Increased limit for TTS
    message: { text: 'Too many requests. Please wait.', error: true },
    standardHeaders: true,
    legacyHeaders: false
}));

// ─── Routes ──────────────────────────────────────────────
app.use('/api', healthRoutes);
app.use('/api', ttsRoutes);

app.get('/', (req, res) => {
    res.json({ name: 'AI Tour Guide Backend (TTS Only)', version: '3.0.0', engine: 'msedge-tts' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    console.error('[Server] Error:', err.message);
    res.status(500).json({ text: 'An internal error occurred.', error: true });
});

// ─── Start Server ────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`  🗣️ Free TTS Backend — v3.0.0`);
    console.log(`  🌐 http://localhost:${PORT}`);
    console.log(`  📡 Environment: ${NODE_ENV}`);
    console.log(`  ⚡ Engine: msedge-tts (Neural)`);
    console.log(`  🛡️  CORS: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log(`${'═'.repeat(55)}\n`);
});

