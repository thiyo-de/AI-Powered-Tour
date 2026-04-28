// ─── Persistent Usage Tracker with Real Groq Limits ──────
const fs = require('fs');
const path = require('path');

const USAGE_FILE = path.join(__dirname, '..', 'usage.json');

// Real Groq free-tier limits (from docs)
const LIMITS = {
    chat: { model: 'llama-3.3-70b-versatile', rpd: 1000, rpm: 30, tpm: 12000 },
    tts:  { model: 'orpheus-v1-english',       rpd: 100,  rpm: 10 },
    stt:  { model: 'whisper-large-v3',         rpd: 2000, rpm: 20 }
};

function loadUsage() {
    try {
        if (fs.existsSync(USAGE_FILE)) {
            const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
            const today = new Date().toISOString().split('T')[0];

            if (data.date !== today) {
                console.log(`[Usage] 🔄 New day (${data.date} → ${today}). Resetting counters.`);
                return createFresh(today);
            }

            console.log(`[Usage] 📂 Loaded — Chat: ${data.chat}/${LIMITS.chat.rpd} | TTS: ${data.tts}/${LIMITS.tts.rpd}`);
            return data;
        }
    } catch (e) {
        console.warn('[Usage] Failed to load:', e.message);
    }
    return createFresh();
}

function createFresh(date) {
    return {
        date: date || new Date().toISOString().split('T')[0],
        chat: 0,
        tts: 0,
        analytics: 0,
        total: 0,
        // Real remaining from Groq headers (updated per response)
        groq_remaining_chat: LIMITS.chat.rpd,
        groq_remaining_tts: LIMITS.tts.rpd
    };
}

let saveTimeout = null;
function saveUsage(usage) {
    if (saveTimeout) return;
    saveTimeout = setTimeout(() => {
        try {
            fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));
        } catch (e) { /* ignore */ }
        saveTimeout = null;
    }, 3000);
}

function forceSave(usage) {
    try {
        fs.writeFileSync(USAGE_FILE, JSON.stringify(usage, null, 2));
    } catch (e) { /* ignore */ }
}

// Update from Groq response headers (real data)
function updateFromHeaders(usage, type, headers) {
    if (!headers) return;
    const remaining = headers['x-ratelimit-remaining-requests'];
    if (remaining !== undefined) {
        if (type === 'chat') usage.groq_remaining_chat = parseInt(remaining);
        if (type === 'tts') usage.groq_remaining_tts = parseInt(remaining);
    }
}

function logUsage(usage, type) {
    const chatPct = ((usage.chat / LIMITS.chat.rpd) * 100).toFixed(1);
    const ttsPct = ((usage.tts / LIMITS.tts.rpd) * 100).toFixed(1);
    
    if (type === 'chat') {
        console.log(`[Usage] 💬 Chat: ${usage.chat}/${LIMITS.chat.rpd} (${chatPct}%) | Groq says remaining: ${usage.groq_remaining_chat}`);
    } else if (type === 'tts') {
        console.log(`[Usage] 🎙️  TTS: ${usage.tts}/${LIMITS.tts.rpd} (${ttsPct}%) | Groq says remaining: ${usage.groq_remaining_tts}`);
    }
}

module.exports = { loadUsage, saveUsage, forceSave, updateFromHeaders, logUsage, LIMITS };
