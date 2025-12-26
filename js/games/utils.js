/**
 * ASDF Games - Utility Functions
 * Security, validation, and rate limiting utilities
 */

'use strict';

// ============================================
// SECURITY UTILITIES
// ============================================

/**
 * Sanitize string for safe HTML rendering
 * Prevents XSS attacks when using innerHTML
 */
function sanitizeHTML(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Sanitize an object's string values recursively
 */
function sanitizeObject(obj) {
    if (typeof obj === 'string') return sanitizeHTML(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (obj && typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                result[key] = sanitizeObject(obj[key]);
            }
        }
        return result;
    }
    return obj;
}

/**
 * Escape HTML entities for safe display
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================
// INPUT VALIDATION UTILITIES
// ============================================

/**
 * Validate numeric input with bounds checking
 * @param {string|number} value - Input value to validate
 * @param {Object} options - Validation options
 * @returns {Object} - { valid: boolean, value: number|null, error: string|null }
 */
function validateNumericInput(value, options = {}) {
    const {
        min = 0,
        max = Number.MAX_SAFE_INTEGER,
        allowDecimals = false,
        fieldName = 'Value'
    } = options;

    let numValue;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') {
            return { valid: false, value: null, error: `${fieldName} is required` };
        }
        numValue = allowDecimals ? parseFloat(trimmed) : parseInt(trimmed, 10);
    } else {
        numValue = value;
    }

    if (!Number.isFinite(numValue)) {
        return { valid: false, value: null, error: `${fieldName} must be a valid number` };
    }

    if (Number.isNaN(numValue) || !Number.isFinite(numValue)) {
        return { valid: false, value: null, error: `${fieldName} contains an invalid value` };
    }

    if (numValue < min) {
        return { valid: false, value: null, error: `${fieldName} must be at least ${min.toLocaleString()}` };
    }

    if (numValue > max) {
        return { valid: false, value: null, error: `${fieldName} must be at most ${max.toLocaleString()}` };
    }

    if (!allowDecimals && !Number.isInteger(numValue)) {
        return { valid: false, value: null, error: `${fieldName} must be a whole number` };
    }

    return { valid: true, value: numValue, error: null };
}

/**
 * Validate wallet address format (Solana base58)
 */
function isValidWalletAddress(address) {
    if (typeof address !== 'string') return false;
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Validate transaction signature format (Solana)
 */
function isValidTransactionSignature(signature) {
    if (typeof signature !== 'string') return false;
    return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(signature);
}

/**
 * Validate Solana public key format
 */
function isValidSolanaAddress(address) {
    if (typeof address !== 'string') return false;
    if (address.length < 32 || address.length > 44) return false;
    return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

// Valid game IDs - whitelist for validation
const VALID_GAME_IDS = new Set([
    'burnrunner', 'scamblaster', 'hodlhero', 'cryptoheist',
    'rugpull', 'whalewatch', 'stakestacker', 'dexdash',
    'burnorhold', 'pumparena'
]);

/**
 * Validate game ID against whitelist
 */
function isValidGameId(gameId) {
    return typeof gameId === 'string' && VALID_GAME_IDS.has(gameId.toLowerCase());
}

// ============================================
// RATE LIMITING FOR RPC CALLS
// ============================================

const RateLimiter = {
    calls: new Map(),
    maxCalls: 5,
    windowMs: 60000,

    canMakeCall(endpoint) {
        const now = Date.now();
        const callTimes = this.calls.get(endpoint) || [];
        const recentCalls = callTimes.filter(time => now - time < this.windowMs);

        if (recentCalls.length >= this.maxCalls) {
            console.warn(`Rate limit exceeded for ${endpoint}`);
            return false;
        }

        recentCalls.push(now);
        this.calls.set(endpoint, recentCalls);
        return true;
    },

    reset(endpoint) {
        this.calls.delete(endpoint);
    }
};
