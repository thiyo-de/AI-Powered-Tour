// ─── Config — Environment Variable Loader ───────────────
require('dotenv').config();

const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Groq API Keys — collect all non-empty keys into an array
// Naming: GROQ_API_KEY (key 1), GROQ_API_KEY_2, GROQ_API_KEY_3 ... unlimited
const GROQ_KEYS = [];

// Key 1: GROQ_API_KEY (no suffix)
const _baseKey = process.env['GROQ_API_KEY'];
if (_baseKey && _baseKey.startsWith('gsk_')) GROQ_KEYS.push(_baseKey.trim());

// Keys 2+: GROQ_API_KEY_2, GROQ_API_KEY_3 ... scan until 5 consecutive misses
let _miss = 0;
for (let i = 2; _miss < 5; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key && key.startsWith('gsk_') && key.trim() !== '') {
        GROQ_KEYS.push(key.trim());
        _miss = 0; // reset miss counter on hit
    } else {
        _miss++;   // allow gaps (e.g. _2 missing but _3 present)
    }
}

if (GROQ_KEYS.length === 0) {
    console.warn('[Config] ⚠️  No valid GROQ_API_KEY found in .env! TTS and Chat will fail.');
}

// CORS origins
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3002'];

module.exports = {
    PORT,
    NODE_ENV,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    GROQ_KEYS,
    ALLOWED_ORIGINS
};
