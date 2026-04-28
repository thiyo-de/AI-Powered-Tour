// ─── Groq Function Declarations ────────────────────────
// 28 total: 12 original + 16 new (F13–F28)

const functionDeclarations = [

    // ── ORIGINAL 12 ────────────────────────────────────────────────

    {
        name: 'navigate_to_panorama',
        description: 'Navigate the virtual tour to a specific panorama/location. Use when the user wants to go to, visit, or see a specific place in the school campus.',
        parameters: {
            type: 'object',
            properties: {
                location: {
                    type: 'string',
                    description: 'The name/label of the panorama to navigate to. Examples: "Library", "Computer Lab", "Entrance", "Sports Facility", "Chemistry Lab", "KG Classroom".'
                }
            },
            required: ['location']
        }
    },
    {
        name: 'control_camera',
        description: 'Pan the 360° camera view in a direction. Use when the user wants to look in a specific direction within the current panorama.',
        parameters: {
            type: 'object',
            properties: {
                direction: {
                    type: 'string',
                    enum: ['left', 'right', 'up', 'down', 'behind'],
                    description: 'The direction to pan the camera'
                },
                degrees: {
                    type: 'number',
                    description: 'How many degrees to pan (default: 45).'
                }
            },
            required: ['direction']
        }
    },
    {
        name: 'zoom_camera',
        description: 'Zoom the camera in or out within the current panorama view.',
        parameters: {
            type: 'object',
            properties: {
                direction: {
                    type: 'string',
                    enum: ['in', 'out'],
                    description: 'Zoom in for closer view, zoom out for wider view'
                },
                amount: {
                    type: 'number',
                    description: 'Zoom amount in degrees of field-of-view change (default: 20)'
                }
            },
            required: ['direction']
        }
    },
    {
        name: 'toggle_fullscreen',
        description: 'Enter or exit fullscreen mode for the virtual tour.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'toggle_music',
        description: 'Play or pause the background music in the virtual tour.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'get_current_location',
        description: 'Get information about the current panorama the user is viewing. Use when the user asks "where am I?" or wants to know their current location.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'start_guided_tour',
        description: 'Start a narrated guided tour of the campus. Available tours: "Full Campus Tour" (all stops), "Academic Facilities Tour", "Quick Campus Overview". If no specific tour is requested, start the default Full Campus Tour.',
        parameters: {
            type: 'object',
            properties: {
                tour_name: {
                    type: 'string',
                    description: 'Name of the guided tour to start. Options: "Full Campus Tour", "Academic Facilities Tour", "Quick Campus Overview". Leave empty for the default.'
                }
            }
        }
    },
    {
        name: 'stop_guided_tour',
        description: 'Stop the currently running guided tour.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'next_tour_stop',
        description: 'Skip to the next stop in the currently running guided tour.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'open_panorama_list',
        description: 'Open the panorama location explorer showing all available locations in the virtual tour. Use when the user wants to see all available places or browse locations.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'open_menu',
        description: 'Open the main navigation menu of the virtual tour.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'look_around',
        description: 'Perform a slow 360-degree auto-rotation in the current panorama so the user can see the full surroundings.',
        parameters: { type: 'object', properties: {} }
    },

    // ── NEW: F13–F20 — Component UI Controls ───────────────────────

    {
        name: 'close_panorama_list',
        description: 'Close the panorama location explorer modal. Use when user says "close the list", "hide locations", or "go back" after viewing the list.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'open_search',
        description: 'Open the search panel to find panoramas or external links. Optionally pre-fills a search query.',
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Optional search term to pre-fill, e.g. "Library" or "Computer Lab"'
                }
            }
        }
    },
    {
        name: 'open_contact',
        description: 'Open the school contact information panel showing WhatsApp, phone, email, and address. Use when user asks how to contact the school.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'close_contact',
        description: 'Close the school contact information panel.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'close_menu',
        description: 'Close the main navigation menu.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'open_street_view',
        description: 'Open the Google Street View popup showing the school\'s real-world location on Google Maps.',
        parameters: { type: 'object', properties: {} }
    },

    // ── NEW: F21–F23 — Navigation Enhancements ─────────────────────

    {
        name: 'go_back',
        description: 'Navigate to the previous panorama in the playlist. Use when user says "go back", "previous location", or "take me back".',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'go_to_start',
        description: 'Navigate to the very first panorama (main entrance) of the virtual tour. Use when user says "start from the beginning", "go to entrance", or "take me to the start".',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'random_panorama',
        description: 'Navigate to a random panorama for discovery. Use when user says "surprise me", "take me somewhere random", or "show me something different".',
        parameters: { type: 'object', properties: {} }
    },

    // ── NEW: F24–F25 — Guided Tour Enhancements ────────────────────

    {
        name: 'previous_tour_stop',
        description: 'Go back to the previous stop in the active guided tour and replay its narration. Use when user says "go back to the previous stop" or "repeat the last place".',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'jump_to_tour_stop',
        description: 'Jump directly to a specific named stop in the currently active guided tour. Use when user says "jump to the Library" or "skip to Chemistry Lab".',
        parameters: {
            type: 'object',
            properties: {
                location: {
                    type: 'string',
                    description: 'Name of the stop to jump to, e.g. "Library" or "Computer Lab"'
                }
            },
            required: ['location']
        }
    },

    // ── NEW: F26–F27 — Camera & Music Enhancements ─────────────────

    {
        name: 'reset_view',
        description: 'Reset the camera to the default forward-facing position and zoom level. Use when user says "reset the view", "default view", or "center the camera".',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'set_music_volume',
        description: 'Set the background music volume. Use when user says "turn it down", "louder", "set volume to 50%", or "mute the music".',
        parameters: {
            type: 'object',
            properties: {
                level: {
                    type: 'number',
                    description: 'Volume level from 0 (silent) to 100 (full). E.g. 0 = mute, 50 = half, 100 = full.'
                }
            },
            required: ['level']
        }
    },

    // ── NEW: F28 — Related Campuses ────────────────────────────────

    {
        name: 'open_related_campus',
        description: 'Open a related Mount Zion campus virtual tour in a new tab. Use when user asks about other campuses or schools. Available campus: "MOUNT ZION Matric Higher Secondary School".',
        parameters: {
            type: 'object',
            properties: {
                campus_name: {
                    type: 'string',
                    description: 'Name or partial name of the campus to open, e.g. "Matric" or "Matriculation"'
                }
            },
            required: ['campus_name']
        }
    }

];

module.exports = functionDeclarations;
