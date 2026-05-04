// ─── Text-to-Speech Route (msedge-tts Free API) ──
const express = require('express');
const router = express.Router();
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

// Available Neural Voices from Edge TTS (Free, high-quality)
const DEFAULT_VOICE = 'en-US-AriaNeural';

// POST /api/tts — convert text to natural speech audio
router.post('/tts', async (req, res) => {
    // FIX B5: fresh instance per request — no shared WebSocket, no race conditions
    const tts = new MsEdgeTTS();
    try {
        const { text, voice } = req.body;

        if (!text || text.trim() === '') {
            return res.status(400).json({ error: 'Text is required' });
        }

        const selectedVoice = voice || DEFAULT_VOICE;

        // Set TTS voice
        await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {});

        // We want to pipe the MP3 stream directly to the response
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Stream the synthesized audio
        const { audioStream } = tts.toStream(text);
        
        audioStream.on('data', (chunk) => {
            res.write(chunk);
        });

        audioStream.on('end', () => {
            res.end();
        });

        audioStream.on('error', (err) => {
            console.error('[TTS] Error generating audio stream:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'TTS Generation failed' });
            } else {
                res.end();
            }
        });

    } catch (error) {
        console.error('[TTS] Error processing request:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

module.exports = router;
