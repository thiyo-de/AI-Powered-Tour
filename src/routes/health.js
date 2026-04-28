// ─── Health Check Routes ─────────────────────────────────
const express = require('express');
const router = express.Router();

// Basic health check
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '1.0.0',
        engine: 'Groq'
    });
});

module.exports = router;
