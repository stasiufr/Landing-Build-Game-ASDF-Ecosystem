/**
 * Secure Logger Utility
 * Prevents sensitive data leakage in production logs
 */

import config from '../config/index.js';

// Patterns to redact from logs
const SENSITIVE_PATTERNS = [
    /password/i,
    /secret/i,
    /private_?key/i,
    /api_?key/i,
    /token/i,
    /authorization/i,
    /bearer/i,
    /signature/i
];

// Fields to always redact
const REDACTED_FIELDS = [
    'password',
    'secret',
    'privateKey',
    'private_key',
    'apiKey',
    'api_key',
    'token',
    'authorization',
    'signature'
];

/**
 * Redact sensitive values from an object
 */
function redactSensitive(obj, depth = 0) {
    if (depth > 10) return '[MAX_DEPTH]';
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => redactSensitive(item, depth + 1));
    }

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        // Check if key matches sensitive patterns
        const isSensitive = REDACTED_FIELDS.some(field =>
            lowerKey.includes(field.toLowerCase())
        ) || SENSITIVE_PATTERNS.some(pattern => pattern.test(key));

        if (isSensitive && value) {
            result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
            result[key] = redactSensitive(value, depth + 1);
        } else {
            result[key] = value;
        }
    }
    return result;
}

/**
 * Format log message
 */
function formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const sanitizedData = data ? redactSensitive(data) : undefined;

    return {
        timestamp,
        level,
        message,
        ...(sanitizedData && { data: sanitizedData })
    };
}

/**
 * Logger object with conditional logging based on environment
 */
export const logger = {
    /**
     * Debug level - only in development
     */
    debug(message, data) {
        if (!config.isProduction) {
            console.log(JSON.stringify(formatMessage('DEBUG', message, data)));
        }
    },

    /**
     * Info level - always logged but sanitized in production
     */
    info(message, data) {
        const formatted = formatMessage('INFO', message, data);
        if (config.isProduction) {
            console.log(JSON.stringify(formatted));
        } else {
            console.log(formatted.message, data || '');
        }
    },

    /**
     * Warning level - always logged
     */
    warn(message, data) {
        const formatted = formatMessage('WARN', message, data);
        if (config.isProduction) {
            console.warn(JSON.stringify(formatted));
        } else {
            console.warn(formatted.message, data || '');
        }
    },

    /**
     * Error level - always logged with stack trace redaction
     */
    error(message, error) {
        const errorData = error instanceof Error ? {
            name: error.name,
            message: error.message,
            // Only include stack in development
            ...(config.isProduction ? {} : { stack: error.stack })
        } : error;

        const formatted = formatMessage('ERROR', message, errorData);
        console.error(JSON.stringify(formatted));
    },

    /**
     * Security event - always logged
     */
    security(event, data) {
        const formatted = formatMessage('SECURITY', event, {
            ...data,
            timestamp: Date.now()
        });
        console.log(JSON.stringify(formatted));
    }
};

export default logger;
