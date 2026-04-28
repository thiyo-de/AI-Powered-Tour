// ─── Express Server Entry Point ──────────────────────────
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PORT, ALLOWED_ORIGINS, NODE_ENV, GROQ_KEYS } = require('./config');
const groqKeyPool = require('./services/groqKeyPool');

// Import routes
const healthRoutes = require('./routes/health');
const chatRoutes = require('./routes/chat');
const tourRoutes = require('./routes/tour');
const analyticsRoutes = require('./routes/analytics');
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
    max: 60,
    message: { text: 'Too many requests. Please wait.', function_calls: [], error: true },
    standardHeaders: true,
    legacyHeaders: false
}));

// ─── Routes ──────────────────────────────────────────────
app.use('/api', healthRoutes);
app.use('/api', chatRoutes);
app.use('/api', tourRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', ttsRoutes);

// Usage & key pool status endpoint
app.get('/api/usage', (req, res) => {
    const status = groqKeyPool.getStatus();
    res.json(status);
});

app.get('/', (req, res) => {
    res.json({ name: 'AI Tour Guide Backend', version: '2.0.0', engine: 'Groq', keys: GROQ_KEYS.length, docs: '/api/usage' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    console.error('[Server] Error:', err.message);
    res.status(500).json({ text: 'An internal error occurred.', function_calls: [], error: true });
});

// Daily reset check (runs every hour)
setInterval(() => {
    const today = new Date().toISOString().split('T')[0];
    if (groqKeyPool.keys[0]?._lastDate && groqKeyPool.keys[0]._lastDate !== today) {
        groqKeyPool.resetDaily();
    }
    groqKeyPool.keys.forEach(k => k._lastDate = today);
}, 3600000);
// Set initial date
groqKeyPool.keys.forEach(k => k._lastDate = new Date().toISOString().split('T')[0]);

// ─── Start Server ────────────────────────────────────────
app.listen(PORT, () => {
    const status = groqKeyPool.getStatus();
    console.log(`\n${'═'.repeat(55)}`);
    console.log(`  🤖 AI Tour Guide Backend — v2.0.0`);
    console.log(`  🌐 http://localhost:${PORT}`);
    console.log(`  📡 Environment: ${NODE_ENV}`);
    console.log(`  ⚡ Engine: Groq (${GROQ_KEYS.length} keys loaded)`);
    console.log(`  ─── Total Daily Limits ───`);
    console.log(`  💬 Chat: ${status.totals.chatLimit}/day (llama-3.3-70b-versatile)`);
    console.log(`  🎙️  TTS:  ${status.totals.ttsLimit}/day (orpheus-v1-english)`);
    console.log(`  🛡️  CORS: ${ALLOWED_ORIGINS.join(', ')}`);
    console.log(`${'═'.repeat(55)}\n`);
});
