// ─── Analytics Routes ────────────────────────────────────
// Task 1.10: POST /api/analytics — log user interaction events
const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

// POST /api/analytics
router.post('/analytics', async (req, res) => {
    try {
        const { session_id, event_type, event_data } = req.body;

        if (!session_id || !event_type) {
            return res.status(400).json({ error: 'session_id and event_type are required' });
        }

        const { error } = await supabase
            .from('analytics')
            .insert({
                session_id,
                event_type,
                event_data: event_data || {}
            });

        if (error) {
            console.error('[Analytics] Insert error:', error.message);
            return res.status(500).json({ error: 'Failed to log event' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[Analytics] Error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
