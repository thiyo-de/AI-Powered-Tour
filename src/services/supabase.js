// ─── Supabase Client Singleton ───────────────────────────
// Task 1.2: Initialize and export Supabase client
const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('../config');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

module.exports = supabase;
