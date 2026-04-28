// ─── Knowledge / RAG Service ─────────────────────────────
// Task 1.4: Fetch school knowledge from Supabase, build context for Groq
const supabase = require('./supabase');

let cachedContext = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getKnowledgeContext() {
    const now = Date.now();

    // Return cached if fresh
    if (cachedContext && (now - cacheTimestamp) < CACHE_TTL) {
        return cachedContext;
    }

    try {
        // Fetch all panoramas
        const { data: panoramas, error: panoErr } = await supabase
            .from('panoramas')
            .select('*')
            .order('playlist_index', { ascending: true });

        if (panoErr) console.error('[Knowledge] Panoramas fetch error:', panoErr.message);

        // Fetch active school info
        const { data: schoolInfo, error: infoErr } = await supabase
            .from('school_info')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: false });

        if (infoErr) console.error('[Knowledge] SchoolInfo fetch error:', infoErr.message);

        // Fetch guided tour plans
        const { data: tourPlans, error: tourErr } = await supabase
            .from('guided_tour_plans')
            .select('*');

        if (tourErr) console.error('[Knowledge] TourPlans fetch error:', tourErr.message);

        // Build context string
        let context = '';

        // Panorama locations
        if (panoramas && panoramas.length > 0) {
            context += 'CAMPUS LOCATIONS (available panoramas):\n';
            panoramas.forEach(p => {
                context += `- ${p.label} (playlist index ${p.playlist_index}): ${p.description}`;
                if (p.features && p.features.length > 0) {
                    context += ` Features: ${p.features.join(', ')}.`;
                }
                if (p.fun_facts && p.fun_facts.length > 0) {
                    context += ` Fun facts: ${p.fun_facts.join('; ')}.`;
                }
                if (p.tags && p.tags.length > 0) {
                    context += ` Tags: ${p.tags.join(', ')}.`;
                }
                context += '\n';
            });
            context += '\n';
        }

        // School FAQs
        if (schoolInfo && schoolInfo.length > 0) {
            context += 'SCHOOL INFORMATION:\n';
            schoolInfo.forEach(info => {
                context += `- [${info.category}] Q: ${info.question}\n  A: ${info.answer}\n`;
            });
            context += '\n';
        }

        // Guided tours
        if (tourPlans && tourPlans.length > 0) {
            context += 'GUIDED TOURS AVAILABLE:\n';
            tourPlans.forEach(plan => {
                const defaultTag = plan.is_default ? ' (DEFAULT)' : '';
                context += `- "${plan.name}"${defaultTag}: ${plan.description}. `;
                context += `Stops: ${plan.panorama_sequence.length}, Duration: ~${plan.estimated_duration_mins} min. `;
                context += `Sequence: [${plan.panorama_sequence.join(', ')}]\n`;
            });
            context += '\n';
        }

        cachedContext = context;
        cacheTimestamp = now;
        console.log(`[Knowledge] Context built: ${context.length} chars, ${panoramas?.length || 0} panoramas, ${schoolInfo?.length || 0} FAQs, ${tourPlans?.length || 0} tour plans`);

        return context;
    } catch (err) {
        console.error('[Knowledge] Failed to build context:', err.message);
        return cachedContext || 'No knowledge context available.';
    }
}

// Expose raw data fetchers for routes
async function getPanoramas() {
    const { data, error } = await supabase
        .from('panoramas')
        .select('*')
        .order('playlist_index', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
}

async function getGuidedTourPlans() {
    const { data, error } = await supabase
        .from('guided_tour_plans')
        .select('*');

    if (error) throw new Error(error.message);
    return data;
}

module.exports = {
    getKnowledgeContext,
    getPanoramas,
    getGuidedTourPlans
};
