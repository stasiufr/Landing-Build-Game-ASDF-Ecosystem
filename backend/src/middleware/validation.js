/**
 * Request Validation Middleware
 * Zod-based schema validation for all API endpoints
 */

import { z } from 'zod';
import config from '../config/index.js';

// ============================================
// Common Schemas
// ============================================

const walletAddressSchema = z.string()
    .min(32)
    .max(44)
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana wallet address');

const transactionSignatureSchema = z.string()
    .min(86)
    .max(88)
    .regex(/^[1-9A-HJ-NP-Za-km-z]{86,88}$/, 'Invalid transaction signature');

const gameIdSchema = z.enum(config.game.validGameIds, {
    errorMap: () => ({ message: `Game ID must be one of: ${config.game.validGameIds.join(', ')}` })
});

const scoreSchema = z.number()
    .int()
    .min(0)
    .max(999999999);

const limitSchema = z.coerce.number()
    .int()
    .min(1)
    .max(100)
    .default(10);

// ============================================
// Scores Schemas
// ============================================

export const schemas = {
    // POST /api/scores/submit
    scoreSubmit: z.object({
        gameId: gameIdSchema,
        score: scoreSchema,
        isCompetitive: z.boolean().default(false),
        sessionData: z.object({
            duration: z.number().optional(),
            actions: z.number().optional(),
            checksum: z.string().optional()
        }).optional()
    }),

    // GET /api/scores/best/:gameId - params
    scoreBestParams: z.object({
        gameId: gameIdSchema
    }),

    // GET /api/scores/leaderboard/* - query
    leaderboardQuery: z.object({
        limit: limitSchema
    }),

    // ============================================
    // Tickets Schemas
    // ============================================

    // POST /api/tickets/purchase
    ticketPurchase: z.object({
        ticketType: z.enum(Object.keys(config.tickets), {
            errorMap: () => ({ message: `Ticket type must be one of: ${Object.keys(config.tickets).join(', ')}` })
        }),
        transactionSignature: transactionSignatureSchema
    }),

    // GET /api/tickets/history - query
    ticketHistoryQuery: z.object({
        limit: z.coerce.number().int().min(1).max(50).default(10)
    }),

    // ============================================
    // Betting Schemas
    // ============================================

    // POST /api/betting/place
    betPlace: z.object({
        betAmount: z.number()
            .int()
            .min(10000, 'Minimum bet is 10,000 tokens')
            .max(1000000000, 'Maximum bet is 1,000,000,000 tokens'),
        transactionSignature: transactionSignatureSchema
    }),

    // POST /api/betting/settle
    betSettle: z.object({
        betId: z.number().int().positive(),
        finalScore: scoreSchema,
        sessionHash: z.string().max(64).optional()
    }),

    // GET /api/betting/history - query
    betHistoryQuery: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(20)
    }),

    // POST /api/betting/retry-payout/:betId - params
    retryPayoutParams: z.object({
        betId: z.coerce.number().int().positive()
    }),

    // ============================================
    // Users Schemas
    // ============================================

    // GET /api/users/check/:wallet - params
    userCheckParams: z.object({
        wallet: walletAddressSchema
    })
};

// ============================================
// Validation Middleware Factory
// ============================================

/**
 * Creates a validation middleware for request body
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
export function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));

            return res.status(400).json({
                error: 'Validation failed',
                message: errors[0].message,
                details: errors
            });
        }

        // Replace body with parsed/transformed data
        req.body = result.data;
        next();
    };
}

/**
 * Creates a validation middleware for URL params
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
export function validateParams(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.params);

        if (!result.success) {
            const errors = result.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));

            return res.status(400).json({
                error: 'Invalid parameters',
                message: errors[0].message,
                details: errors
            });
        }

        req.params = result.data;
        next();
    };
}

/**
 * Creates a validation middleware for query params
 * @param {z.ZodSchema} schema - Zod schema to validate against
 */
export function validateQuery(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.query);

        if (!result.success) {
            const errors = result.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));

            return res.status(400).json({
                error: 'Invalid query parameters',
                message: errors[0].message,
                details: errors
            });
        }

        req.query = result.data;
        next();
    };
}

export default schemas;
