// ─── Chat Route — Main AI Endpoint ───────────────────────
// Task 1.11: POST /api/chat — accept message, call Groq, return text + function_calls
const express = require('express');
const router = express.Router();
const { chat } = require('../services/groq');
const { addMessage, getHistory } = require('../services/conversation');

// Generate a simple session ID if not provided
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

// POST /api/chat
router.post('/chat', async (req, res) => {
    try {
        const { message, current_panorama, tour_active } = req.body;
        let { session_id } = req.body;

        // Validate
        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({
                text: 'Please provide a message.',
                function_calls: [],
                suggestions: [],
                error: true
            });
        }

        // Generate session ID if missing
        if (!session_id) {
            session_id = generateSessionId();
        }

        // Save user message to conversation history
        await addMessage(session_id, {
            role: 'user',
            content: message.trim(),
            panorama_context: current_panorama || null
        });

        // Call Groq AI (pass tour_active so the system prompt adapts)
        const response = await chat(message.trim(), session_id, current_panorama, !!tour_active);

        // Save assistant response to conversation history
        await addMessage(session_id, {
            role: 'assistant',
            content: response.text,
            function_calls: response.function_calls.length > 0 ? response.function_calls : null,
            panorama_context: current_panorama || null
        });

        // Return response
        res.json({
            text: response.text,
            function_calls: response.function_calls,
            suggestions: response.suggestions,
            session_id
        });

    } catch (err) {
        console.error('[Chat] Error:', err.message);

        // Graceful error response
        res.status(500).json({
            text: "I'm having a bit of trouble right now. Could you please try again in a moment?",
            function_calls: [],
            suggestions: ['Try again', 'Show me the Library', 'Start a guided tour'],
            error: true
        });
    }
});

module.exports = router;
