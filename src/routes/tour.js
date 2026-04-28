// ─── Tour Data Routes ────────────────────────────────────
// Task 1.9: GET /api/tour/panoramas — cached panorama data
const express = require('express');
const router = express.Router();
const { getPanoramas, getGuidedTourPlans } = require('../services/knowledge');

// In-memory cache
let panoramaCache = null;
let panoramaCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// GET /api/tour/panoramas
router.get('/tour/panoramas', async (req, res) => {
    try {
        const now = Date.now();

        // Use cache if fresh
        if (panoramaCache && (now - panoramaCacheTime) < CACHE_TTL) {
            return res.json(panoramaCache);
        }

        const panoramas = await getPanoramas();
        panoramaCache = panoramas;
        panoramaCacheTime = now;

        res.json(panoramas);
    } catch (err) {
        console.error('[Tour] Panoramas fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch panoramas' });
    }
});

// GET /api/tour/plans — guided tour plans
router.get('/tour/plans', async (req, res) => {
    try {
        const plans = await getGuidedTourPlans();
        res.json(plans);
    } catch (err) {
        console.error('[Tour] Plans fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch tour plans' });
    }
});

module.exports = router;
