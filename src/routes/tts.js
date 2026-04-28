// ─── Text-to-Speech Route (Groq Orpheus + Key Rotation + Browser Fallback) ──
const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const groqKeyPool = require('../services/groqKeyPool');

// Available Orpheus voices: autumn, diana, hannah, austin, daniel, troy
const DEFAULT_VOICE = 'autumn';

// POST /api/tts — convert text to natural speech audio
router.post('/tts', async (req, res) => {
    try {
        const { text, voice } = req.body;

        if (!text || text.trim() === '') {
            return res.status(400).json({ error: 'Text is required' });
        }

        const selectedVoice = voice || DEFAULT_VOICE;

        // Try each key until one works
        for (let attempt = 0; attempt < groqKeyPool.keys.length; attempt++) {
            const keyEntry = groqKeyPool.getKey('tts');

            if (!keyEntry) {
                // All keys exhausted — tell frontend to use browser TTS
                const status = groqKeyPool.getStatus();
                console.log(`[TTS] ⚠️ All keys exhausted (${status.totals.ttsUsed}/${status.totals.ttsLimit}). Browser fallback.`);
                return res.status(429).json({
                    error: 'All TTS keys exhausted',
                    fallback: 'browser',
                    used: status.totals.ttsUsed,
                    limit: status.totals.ttsLimit
                });
            }

            try {
                const groq = new Groq({ apiKey: keyEntry.key });
                console.log(`[TTS] Using ${keyEntry.label}`);

                const response = await groq.audio.speech.create({
                    model: 'canopylabs/orpheus-v1-english',
                    input: text.trim(),
                    voice: selectedVoice,
                    response_format: 'wav'
                });

                const buffer = Buffer.from(await response.arrayBuffer());
                groqKeyPool.recordUsage(keyEntry, 'tts');

                res.set({
                    'Content-Type': 'audio/wav',
                    'Content-Length': buffer.length,
                    'Cache-Control': 'no-cache'
                });

                res.send(buffer);

                const status = groqKeyPool.getStatus();
                console.log(`[TTS] ✅ ${buffer.length} bytes | voice: ${selectedVoice} | total: ${status.totals.ttsUsed}/${status.totals.ttsLimit}`);
                return;

            } catch (err) {
                // Rate limit — cooldown and try next key
                if (err.status === 429 || err.message?.includes('429') || err.message?.includes('rate_limit')) {
                    groqKeyPool.handleRateLimit(keyEntry, 'tts');
                    continue;
                }
                // Terms not accepted or model error — skip this key for TTS
                if (err.status === 400 || err.message?.includes('model_terms_required')) {
                    console.log(`[TTS] ${keyEntry.label} needs terms acceptance — skipping`);
                    groqKeyPool.markExhausted(keyEntry, 'tts');
                    continue;
                }
                throw err;
            }
        }

        // All keys failed
        console.log('[TTS] ⚠️ All keys failed. Browser fallback.');
        return res.status(429).json({ error: 'TTS failed', fallback: 'browser' });

    } catch (err) {
        console.error('[TTS] ❌ Error:', err.message);
        res.status(500).json({ error: 'TTS failed', fallback: 'browser' });
    }
});

module.exports = router;
