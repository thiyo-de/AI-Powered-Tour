// ─── Conversation History Manager ────────────────────────
// Task 1.5: In-memory cache + Supabase persistence for chat history
const supabase = require('./supabase');

// In-memory store: Map<session_id, { messages: [], lastAccess: timestamp }>
const sessions = new Map();
const MAX_HISTORY = 20;
const SESSION_TTL = 60 * 60 * 1000; // 1 hour

// Get conversation history for a session
async function getHistory(sessionId) {
    // Check in-memory first
    if (sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        session.lastAccess = Date.now();
        return session.messages.slice(-MAX_HISTORY);
    }

    // Try fetching from Supabase
    try {
        const { data, error } = await supabase
            .from('conversations')
            .select('role, content, function_calls, panorama_context, created_at')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })
            .limit(MAX_HISTORY);

        if (error) {
            console.error('[Conversation] Supabase fetch error:', error.message);
            return [];
        }

        const messages = (data || []).map(row => ({
            role: row.role,
            content: row.content,
            function_calls: row.function_calls,
            panorama_context: row.panorama_context,
            timestamp: row.created_at
        }));

        // Cache in memory
        sessions.set(sessionId, { messages, lastAccess: Date.now() });
        return messages;
    } catch (err) {
        console.error('[Conversation] Failed to load history:', err.message);
        return [];
    }
}

// Add a message to conversation history
async function addMessage(sessionId, { role, content, function_calls = null, panorama_context = null }) {
    const message = {
        role,
        content,
        function_calls,
        panorama_context,
        timestamp: new Date().toISOString()
    };

    // Add to in-memory cache
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, { messages: [], lastAccess: Date.now() });
    }
    const session = sessions.get(sessionId);
    session.messages.push(message);
    session.lastAccess = Date.now();

    // Trim if too long
    if (session.messages.length > MAX_HISTORY * 2) {
        session.messages = session.messages.slice(-MAX_HISTORY);
    }

    // Async persist to Supabase (fire-and-forget)
    supabase
        .from('conversations')
        .insert({
            session_id: sessionId,
            role,
            content,
            function_calls: function_calls || null,
            panorama_context: panorama_context || null,
            metadata: null
        })
        .then(({ error }) => {
            if (error) console.error('[Conversation] Supabase insert error:', error.message);
        })
        .catch(err => {
            console.error('[Conversation] Supabase insert failed:', err.message);
        });
}

// Trim old sessions from memory (called periodically)
function trimOldSessions() {
    const now = Date.now();
    let trimmed = 0;
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.lastAccess > SESSION_TTL) {
            sessions.delete(sessionId);
            trimmed++;
        }
    }
    if (trimmed > 0) {
        console.log(`[Conversation] Trimmed ${trimmed} old sessions, ${sessions.size} remaining`);
    }
}

// Auto-trim every 10 minutes
setInterval(trimOldSessions, 10 * 60 * 1000);

module.exports = {
    getHistory,
    addMessage,
    trimOldSessions
};
