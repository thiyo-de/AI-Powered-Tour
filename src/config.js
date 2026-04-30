// ─── Config — Environment Variable Loader ───────────────
require('dotenv').config();

const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS origins — env var supplements the hardcoded production hosts
const _envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3002'];

// These are ALWAYS allowed
const ALWAYS_ALLOWED = [
    'https://ai-powered-tour.netlify.app',
    'https://ai-powered-tour.onrender.com',
];

const ALLOWED_ORIGINS = [...new Set([..._envOrigins, ...ALWAYS_ALLOWED])];

module.exports = {
    PORT,
    NODE_ENV,
    ALLOWED_ORIGINS
};
