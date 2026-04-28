// ─── AI Chat Client (Groq with Key Rotation) ────────────
const Groq = require('groq-sdk');
const groqKeyPool = require('./groqKeyPool');
const { getKnowledgeContext } = require('./knowledge');
const { getHistory } = require('./conversation');
const functionDeclarations = require('../functions/declarations');

// ─── System Prompt Builder ───────────────────────────────
function buildSystemPrompt(knowledgeContext, currentPanorama, tourActive) {
    const tourSection = tourActive ? `

⚠️ GUIDED TOUR IN PROGRESS — CRITICAL RULES:
- A guided tour is currently active and running.
- If the user says ANYTHING affirmative like "okay", "yes", "sure", "next", "continue", "go", "go ahead", "proceed", "great", "fine", "alright", "ok", "yep", "yup" — you MUST call the next_tour_stop function. Do not just reply with text.
- If the user says "stop", "end", "quit", "cancel", "enough" — call stop_guided_tour.
- If the user asks a question about the current location, answer it but do NOT advance the tour.
- Always combine a short spoken reply with the function call (e.g., "Great! Moving on..." + next_tour_stop).` : '';

    return `You are an intelligent, friendly AI campus guide for Mount Zion International School (CBSE), Tamil Nadu, India. You are embedded inside a 360° virtual tour.

Your personality:
- Warm, welcoming, and enthusiastic about the school
- Speak naturally like a real campus guide, not a robot
- Keep responses concise (2-3 sentences max unless asked for detail)
- Use function calls to control the tour when appropriate
- Be helpful and informative

Your capabilities:
- Navigate to any panorama location, go back, go to start, or visit a random location
- Control the 360° camera (pan left/right/up/down/behind, zoom in/out, reset view)
- Toggle fullscreen mode; set background music volume (0–100) or toggle music
- Start, stop, advance, go back, or jump to a specific stop in guided tours
- Open/close UI panels: panorama list, search (with optional pre-fill), contact info, navigation menu, Google Street View
- Open related campuses (e.g. "MOUNT ZION Matric Higher Secondary School") in a new tab
- Answer questions about the school from your knowledge base
- Perform 360° look-around rotations

Rules:
- When a user wants to go somewhere, ALWAYS use navigate_to_panorama with the location label name
- When a user asks "where am I" or about their current location, use get_current_location
- When a user wants a guided tour, use start_guided_tour
- You can combine a text response WITH function calls (e.g., say something AND navigate)
- If you don't know something, say so honestly and suggest they contact the school
- Never hardcode panorama indices — always use location labels
- For volume requests: use set_music_volume with level 0-100. "Mute" = level 0, "half" = level 50.
- For "go back" navigation: use go_back. For "previous stop" in tour: use previous_tour_stop.
- For other campuses: use open_related_campus with the campus name.
- Current user location: ${currentPanorama || 'Unknown'}${tourSection}

Related campuses available via open_related_campus:
- MOUNT ZION Matric Higher Secondary School → https://mount-zion-matriculation.netlify.app/

${knowledgeContext}`;
}

// ─── Convert declarations to Groq tool format ────────────
function convertToGroqTools() {
    return functionDeclarations.map(decl => ({
        type: 'function',
        function: {
            name: decl.name,
            description: decl.description,
            parameters: decl.parameters
        }
    }));
}

// ─── Chat with Key Rotation ──────────────────────────────
async function chat(message, sessionId, currentPanorama, tourActive = false) {
    const knowledgeContext = await getKnowledgeContext();
    const systemPrompt = buildSystemPrompt(knowledgeContext, currentPanorama, tourActive);

    // Build message history
    const history = await getHistory(sessionId);
    const messages = [{ role: 'system', content: systemPrompt }];

    for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({ role: msg.role, content: msg.content || '' });
        }
    }
    messages.push({ role: 'user', content: message });

    const tools = convertToGroqTools();

    // Try each key until one works
    for (let attempt = 0; attempt < groqKeyPool.keys.length; attempt++) {
        const keyEntry = groqKeyPool.getKey('chat');
        if (!keyEntry) {
            throw new Error('All Groq API keys exhausted for chat today');
        }

        const groq = new Groq({ apiKey: keyEntry.key });
        console.log(`[AI] Using ${keyEntry.label} (llama-3.3-70b-versatile)`);

        let responseMessage;
        let failedText = null;

        try {
            const completion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: messages,
                tools: tools,
                tool_choice: 'auto',
                temperature: 0.7,
                max_tokens: 1024
            });
            responseMessage = completion.choices[0].message;
            groqKeyPool.recordUsage(keyEntry, 'chat');
        } catch (err) {
            // Handle tool_use_failed — recover from failed_generation
            if (err.error?.code === 'tool_use_failed' || err.message?.includes('tool_use_failed')) {
                failedText = err.error?.failed_generation || '';
                console.log('[AI] Groq tool_use_failed — recovering from failed_generation text');
                groqKeyPool.recordUsage(keyEntry, 'chat');

                if (!failedText) {
                    console.log('[AI] Retrying without tools...');
                    const retry = await groq.chat.completions.create({
                        model: 'llama-3.3-70b-versatile',
                        messages: messages,
                        temperature: 0.7,
                        max_tokens: 1024
                    });
                    responseMessage = retry.choices[0].message;
                }
            }
            // Handle rate limit — rotate to next key
            else if (err.status === 429 || err.message?.includes('429') || err.message?.includes('rate_limit')) {
                groqKeyPool.handleRateLimit(keyEntry, 'chat');
                continue; // Try next key
            }
            else {
                throw err;
            }
        }

        // Parse response
        let text = failedText || responseMessage?.content || '';
        const functionCalls = [];

        // Parse proper tool_calls
        if (!failedText && responseMessage?.tool_calls?.length > 0) {
            for (const toolCall of responseMessage.tool_calls) {
                if (toolCall.type === 'function') {
                    let args = {};
                    try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch (e) { args = {}; }
                    functionCalls.push({ name: toolCall.function.name, args });
                }
            }
        }

        // Parse inline function tags (Llama sometimes embeds these)
        // Pattern 1: <function=name>{json}</function>
        const inlineFnRegex = /<function=(\w+)>([\s\S]*?)<\/function>/g;
        let match;
        while ((match = inlineFnRegex.exec(text)) !== null) {
            let args = {};
            try { args = JSON.parse(match[2] || '{}'); } catch (e) { args = {}; }
            functionCalls.push({ name: match[1], args });
        }
        text = text.replace(/<function=\w+>[\s\S]*?<\/function>/g, '').trim();

        // Pattern 2: function_name("arg") — plain text function calls
        const plainFnRegex = /(\w+)\(["']([^"']+)["']\)/g;
        const knownFunctions = [
            'navigate_to_panorama', 'control_camera', 'zoom_camera',
            'get_current_location', 'toggle_fullscreen', 'toggle_music', 'look_around',
            'start_guided_tour', 'next_tour_stop', 'stop_guided_tour', 'open_panorama_list',
            'open_menu', 'close_menu', 'open_panorama_list', 'close_panorama_list',
            'open_search', 'open_contact', 'close_contact', 'open_street_view',
            'go_back', 'go_to_start', 'random_panorama',
            'previous_tour_stop', 'jump_to_tour_stop',
            'reset_view', 'set_music_volume', 'open_related_campus'
        ];
        
        while ((match = plainFnRegex.exec(text)) !== null) {
            if (knownFunctions.includes(match[1])) {
                // Map the argument to the correct parameter name
                let args = {};
                if (match[1] === 'navigate_to_panorama') args = { location: match[2] };
                else if (match[1] === 'control_camera') args = { direction: match[2] };
                else if (match[1] === 'zoom_camera') args = { direction: match[2] };
                else if (match[1] === 'start_guided_tour') args = { tour_name: match[2] };
                else args = { value: match[2] };
                
                functionCalls.push({ name: match[1], args });
                console.log(`[AI] Parsed inline call: ${match[1]}(${match[2]})`);
            }
        }
        // Strip plain-text function calls from displayed text
        text = text.replace(/\s*\w+\(["'][^"']+["']\)/g, '').trim();

        // Pattern 3: no-arg function calls — start_guided_tour(), next_tour_stop(), etc.
        // These are critical: the plainFnRegex above requires a quoted arg and misses them.
        const noArgFunctions = [
            'start_guided_tour', 'next_tour_stop', 'previous_tour_stop', 'stop_guided_tour',
            'get_current_location', 'toggle_fullscreen', 'toggle_music', 'look_around',
            'open_panorama_list', 'close_panorama_list', 'open_menu', 'close_menu',
            'open_contact', 'close_contact', 'open_street_view', 'go_back',
            'go_to_start', 'random_panorama', 'reset_view'
        ];
        const noArgFnRegex = new RegExp(`\\b(${noArgFunctions.join('|')})\\s*\\(\\s*\\)`, 'g');
        while ((match = noArgFnRegex.exec(text)) !== null) {
            if (!functionCalls.find(fc => fc.name === match[1])) { // avoid duplicates
                functionCalls.push({ name: match[1], args: {} });
                console.log(`[AI] Parsed no-arg inline call: ${match[1]}()`);
            }
        }
        text = text.replace(noArgFnRegex, '').trim();

        const suggestions = generateSuggestions(text, functionCalls, currentPanorama);
        return { text: text.trim(), function_calls: functionCalls, suggestions };
    }

    throw new Error('All Groq keys failed for chat');
}

// ─── Suggestion Generator ────────────────────────────────
function generateSuggestions(text, functionCalls, currentPanorama) {
    const suggestions = [];

    const navCall = functionCalls.find(fc => fc.name === 'navigate_to_panorama');
    if (navCall) {
        suggestions.push('Tell me more about this place', 'Where am I?', 'What\'s next?');
        return suggestions;
    }

    if (functionCalls.find(fc => fc.name === 'start_guided_tour')) {
        suggestions.push('Next stop', 'Stop the tour', 'Tell me more');
        return suggestions;
    }

    suggestions.push('Give me a campus tour', 'Show me the Library', 'Where am I?');
    return suggestions;
}

module.exports = { chat };
