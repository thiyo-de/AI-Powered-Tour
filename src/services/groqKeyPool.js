// ─── Groq Key Pool — Independent cursors for Chat & TTS ──
// Chat and TTS each have their OWN key rotation.
// TTS rate limit does NOT affect Chat's key, and vice versa.
const { GROQ_KEYS } = require('../config');

// Per-key limits (Groq free tier per org/key)
const LIMITS_PER_KEY = {
    chat: { rpd: 1000 },
    tts:  { rpd: 100 }
};

class GroqKeyPool {
    constructor(keys) {
        this.keys = keys.map((key, i) => ({
            key,
            index: i,
            label: `Key${i + 1} ***${key.slice(-6)}`,
            status: 'active',       // active | exhausted | error
            chatUsed: 0,
            ttsUsed: 0,
            chatCooldownUntil: null, // Separate cooldowns per service
            ttsCooldownUntil: null,
            errors: 0
        }));
        // Independent cursors for each service
        this._chatIndex = 0;
        this._ttsIndex = 0;
        console.log(`[GroqPool] Initialized with ${this.keys.length} keys`);
    }

    // Get the next available key for a given type (chat or tts)
    getKey(type = 'chat') {
        const limit = type === 'tts' ? LIMITS_PER_KEY.tts.rpd : LIMITS_PER_KEY.chat.rpd;
        const usedField = type === 'tts' ? 'ttsUsed' : 'chatUsed';
        const cooldownField = type === 'tts' ? 'ttsCooldownUntil' : 'chatCooldownUntil';
        const startIndex = type === 'tts' ? this._ttsIndex : this._chatIndex;

        // Try each key starting from this service's own cursor
        for (let i = 0; i < this.keys.length; i++) {
            const idx = (startIndex + i) % this.keys.length;
            const entry = this.keys[idx];

            // Skip if cooldown active for THIS service
            if (entry[cooldownField] && Date.now() < entry[cooldownField]) continue;
            if (entry[cooldownField] && Date.now() >= entry[cooldownField]) {
                entry[cooldownField] = null; // Cooldown expired
            }

            // Skip if daily limit reached for this type
            if (entry[usedField] >= limit) continue;

            return entry;
        }

        return null; // All keys exhausted for this service
    }

    // Record successful usage
    recordUsage(entry, type = 'chat') {
        if (type === 'tts') {
            entry.ttsUsed++;
        } else {
            entry.chatUsed++;
        }
        entry.errors = 0;
        const usedField = type === 'tts' ? 'ttsUsed' : 'chatUsed';
        const limit = type === 'tts' ? LIMITS_PER_KEY.tts.rpd : LIMITS_PER_KEY.chat.rpd;
        console.log(`[GroqPool] ${entry.label} ${type}: ${entry[usedField]}/${limit}`);
    }

    // Handle rate limit (429) — cooldown this key FOR THIS SERVICE ONLY, advance that service's cursor
    handleRateLimit(entry, type = 'chat') {
        entry.errors++;
        const cooldownField = type === 'tts' ? 'ttsCooldownUntil' : 'chatCooldownUntil';
        entry[cooldownField] = Date.now() + 60000; // 60s cooldown for this service only
        console.log(`[GroqPool] ⚠️ ${entry.label} rate limited (${type}), cooling 60s`);
        
        // Advance ONLY this service's cursor — does NOT affect the other service
        const nextIndex = (entry.index + 1) % this.keys.length;
        if (type === 'tts') {
            this._ttsIndex = nextIndex;
        } else {
            this._chatIndex = nextIndex;
        }
    }

    // Mark key as exhausted for a type
    markExhausted(entry, type = 'chat') {
        const usedField = type === 'tts' ? 'ttsUsed' : 'chatUsed';
        const limit = type === 'tts' ? LIMITS_PER_KEY.tts.rpd : LIMITS_PER_KEY.chat.rpd;
        entry[usedField] = limit; // Max it out
        console.log(`[GroqPool] 🚫 ${entry.label} exhausted for ${type}`);

        // Advance ONLY this service's cursor
        const nextIndex = (entry.index + 1) % this.keys.length;
        if (type === 'tts') {
            this._ttsIndex = nextIndex;
        } else {
            this._chatIndex = nextIndex;
        }
    }

    // Reset daily counters (call at midnight)
    resetDaily() {
        for (const entry of this.keys) {
            entry.chatUsed = 0;
            entry.ttsUsed = 0;
            entry.chatCooldownUntil = null;
            entry.ttsCooldownUntil = null;
            entry.errors = 0;
        }
        this._chatIndex = 0;
        this._ttsIndex = 0;
        console.log('[GroqPool] 🔄 Daily reset — all keys restored');
    }

    // Get status summary
    getStatus() {
        return {
            totalKeys: this.keys.length,
            chatCursor: `Key${this._chatIndex + 1}`,
            ttsCursor: `Key${this._ttsIndex + 1}`,
            keys: this.keys.map(k => ({
                label: k.label,
                chat: `${k.chatUsed}/${LIMITS_PER_KEY.chat.rpd}`,
                tts: `${k.ttsUsed}/${LIMITS_PER_KEY.tts.rpd}`,
                chatCooldown: k.chatCooldownUntil ? `${Math.ceil((k.chatCooldownUntil - Date.now()) / 1000)}s` : 'none',
                ttsCooldown: k.ttsCooldownUntil ? `${Math.ceil((k.ttsCooldownUntil - Date.now()) / 1000)}s` : 'none'
            })),
            totals: {
                chatUsed: this.keys.reduce((s, k) => s + k.chatUsed, 0),
                chatLimit: this.keys.length * LIMITS_PER_KEY.chat.rpd,
                ttsUsed: this.keys.reduce((s, k) => s + k.ttsUsed, 0),
                ttsLimit: this.keys.length * LIMITS_PER_KEY.tts.rpd
            }
        };
    }
}

// Singleton instance
const pool = new GroqKeyPool(GROQ_KEYS);

module.exports = pool;
