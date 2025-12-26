/**
 * Security Middleware
 * Rate limiting, CORS, input validation, and wallet authentication
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import config from '../config/index.js';
import { verifyWalletSignature } from '../utils/solana.js';
import logger from '../utils/logger.js';

/**
 * Helmet security headers
 */
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", ...config.allowedOrigins]
        }
    },
    crossOriginEmbedderPolicy: false
});

/**
 * CORS configuration
 */
export const corsMiddleware = cors({
    origin: (origin, callback) => {
        // In production, be stricter about no-origin requests
        if (!origin) {
            // Allow no-origin only in development or if explicitly configured
            if (!config.isProduction || process.env.ALLOW_NO_ORIGIN === 'true') {
                return callback(null, true);
            }
            // In production, reject no-origin requests by default for browser security
            // Server-to-server or mobile apps should use API keys instead
            return callback(new Error('Origin header required'));
        }

        if (config.allowedOrigins.includes(origin)) {
            callback(null, true);
        } else if (!config.isProduction && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
            // In development, allow localhost variants (strict regex to prevent bypass)
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Wallet-Address', 'X-Signature', 'X-Message']
});

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use wallet address if available, otherwise IP
        return req.headers['x-wallet-address'] || req.ip;
    }
});

/**
 * Strict rate limiter for score submissions
 */
export const scoreSubmitLimiter = rateLimit({
    windowMs: 60000, // 1 minute
    max: 10, // 10 submissions per minute max
    message: {
        error: 'Score submission rate limit exceeded',
        message: 'You can only submit 10 scores per minute'
    },
    keyGenerator: (req) => req.headers['x-wallet-address'] || req.ip
});

/**
 * Very strict rate limiter for betting
 */
export const bettingLimiter = rateLimit({
    windowMs: 10000, // 10 seconds
    max: 1, // 1 bet per 10 seconds
    message: {
        error: 'Betting rate limit exceeded',
        message: 'Please wait before placing another bet'
    },
    keyGenerator: (req) => req.headers['x-wallet-address'] || req.ip
});

/**
 * Wallet authentication middleware
 * Verifies that the request is signed by the claimed wallet
 */
export async function authenticateWallet(req, res, next) {
    const walletAddress = req.headers['x-wallet-address'];
    const signature = req.headers['x-signature'];
    const message = req.headers['x-message'];

    if (!walletAddress || !signature || !message) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Missing wallet address, signature, or message'
        });
    }

    // Validate wallet address format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
        return res.status(400).json({
            error: 'Invalid wallet address',
            message: 'Wallet address format is invalid'
        });
    }

    try {
        const isValid = await verifyWalletSignature(walletAddress, message, signature);

        if (!isValid) {
            return res.status(401).json({
                error: 'Invalid signature',
                message: 'The signature could not be verified'
            });
        }

        // Attach wallet to request
        req.wallet = {
            address: walletAddress,
            verified: true
        };

        next();
    } catch (error) {
        logger.error('Wallet verification error', error);
        return res.status(500).json({
            error: 'Verification failed',
            message: 'Could not verify wallet signature'
        });
    }
}

/**
 * Optional wallet authentication (doesn't fail if not provided)
 */
export async function optionalWalletAuth(req, res, next) {
    const walletAddress = req.headers['x-wallet-address'];

    if (walletAddress && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
        req.wallet = { address: walletAddress, verified: false };
    }

    next();
}

/**
 * Validate game ID
 */
export function validateGameId(req, res, next) {
    const gameId = req.params.gameId || req.body.gameId;

    if (!gameId) {
        return res.status(400).json({
            error: 'Missing game ID',
            message: 'Game ID is required'
        });
    }

    if (!config.game.validGameIds.includes(gameId)) {
        return res.status(400).json({
            error: 'Invalid game ID',
            message: `Game ID must be one of: ${config.game.validGameIds.join(', ')}`
        });
    }

    next();
}

/**
 * Input sanitization middleware
 */
export function sanitizeInput(req, res, next) {
    // Recursively sanitize object
    function sanitize(obj) {
        if (typeof obj === 'string') {
            // Remove potential XSS vectors
            return obj
                .replace(/<[^>]*>/g, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+=/gi, '')
                .trim()
                .substring(0, 1000); // Limit string length
        }
        if (typeof obj === 'number') {
            if (!Number.isFinite(obj)) return 0;
            return obj;
        }
        if (Array.isArray(obj)) {
            return obj.slice(0, 100).map(sanitize); // Limit array length
        }
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj).slice(0, 50)) { // Limit keys
                const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50);
                sanitized[safeKey] = sanitize(value);
            }
            return sanitized;
        }
        return obj;
    }

    if (req.body) {
        req.body = sanitize(req.body);
    }
    if (req.query) {
        req.query = sanitize(req.query);
    }

    next();
}

/**
 * Admin authentication middleware
 * Verifies that the wallet is in the admin whitelist
 */
export function requireAdmin(req, res, next) {
    if (!req.wallet || !req.wallet.address) {
        logger.security('Unauthorized admin access attempt', {
            ip: req.ip,
            endpoint: req.originalUrl
        });
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Wallet authentication is required for admin endpoints'
        });
    }

    if (!config.adminWallets.includes(req.wallet.address)) {
        logger.security('Forbidden admin access attempt', {
            wallet: req.wallet.address,
            ip: req.ip,
            endpoint: req.originalUrl
        });
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Admin access required'
        });
    }

    next();
}

/**
 * Error handler middleware
 */
export function errorHandler(err, req, res, next) {
    logger.error('Request error', err);

    // Don't leak error details in production
    const message = config.isProduction
        ? 'An unexpected error occurred'
        : err.message;

    res.status(err.status || 500).json({
        error: err.name || 'Error',
        message,
        ...(config.isProduction ? {} : { stack: err.stack })
    });
}

/**
 * HTTPS redirect middleware for production
 * Redirects HTTP requests to HTTPS
 */
export function httpsRedirect(req, res, next) {
    // Skip in development
    if (!config.isProduction) {
        return next();
    }

    // Check if request is already HTTPS
    // x-forwarded-proto is set by reverse proxies (nginx, cloudflare, etc.)
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

    if (!isHttps) {
        // Redirect to HTTPS
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }

    next();
}

/**
 * CSRF protection middleware
 * Requires X-Requested-With header for state-changing requests
 * This prevents simple CSRF attacks as browsers don't send custom headers cross-origin
 */
export function csrfProtection(req, res, next) {
    // Skip for safe methods (GET, HEAD, OPTIONS)
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // Skip in development if explicitly disabled
    if (!config.isProduction && process.env.DISABLE_CSRF === 'true') {
        return next();
    }

    // For wallet-authenticated requests, the signature itself provides CSRF protection
    // because the attacker cannot forge a valid signature
    if (req.headers['x-signature'] && req.headers['x-wallet-address']) {
        return next();
    }

    // For non-authenticated requests, require X-Requested-With header
    const requestedWith = req.headers['x-requested-with'];
    if (!requestedWith || requestedWith.toLowerCase() !== 'xmlhttprequest') {
        return res.status(403).json({
            error: 'CSRF validation failed',
            message: 'Missing or invalid X-Requested-With header'
        });
    }

    // Additional check: verify Origin matches allowed origins
    const origin = req.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin)) {
        return res.status(403).json({
            error: 'CSRF origin mismatch',
            message: 'Request origin not allowed'
        });
    }

    next();
}
