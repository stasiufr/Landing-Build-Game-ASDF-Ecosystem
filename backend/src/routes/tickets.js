/**
 * Tickets API Routes
 * Endpoints for ticket purchase and verification
 */

import { Router } from 'express';
import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import { authenticateWallet } from '../middleware/security.js';
import { schemas, validateBody, validateQuery } from '../middleware/validation.js';
import { verifySOLPayment } from '../utils/solana.js';
import config from '../config/index.js';

const router = Router();

/**
 * GET /api/tickets/types
 * Get available ticket types and prices
 */
router.get('/types', (req, res) => {
    const types = Object.entries(config.tickets).map(([id, ticket]) => ({
        id,
        name: ticket.name,
        priceSOL: ticket.priceSOL,
        duration: ticket.durationMs,
        durationHuman: formatDuration(ticket.durationMs),
        icon: ticket.icon,
        bonusChance: ticket.bonusChance || null
    }));

    res.json({ tickets: types });
});

/**
 * POST /api/tickets/purchase
 * Purchase a ticket with transaction verification
 */
router.post('/purchase',
    authenticateWallet,
    validateBody(schemas.ticketPurchase),
    async (req, res, next) => {
        try {
            const { ticketType, transactionSignature } = req.body;
            const walletAddress = req.wallet.address;

            const ticketConfig = config.tickets[ticketType];

            // Verify SOL payment on-chain
            const paymentVerification = await verifySOLPayment(
                transactionSignature,
                walletAddress,
                config.solana.treasuryWallet,
                ticketConfig.priceSOL,
                2 // 2% tolerance for rounding
            );

            if (!paymentVerification.valid) {
                return res.status(400).json({
                    error: 'Payment verification failed',
                    message: paymentVerification.error,
                    details: 'Please ensure you sent the correct amount to the treasury wallet'
                });
            }

            // Get or create user
            const user = await User.findOrCreate(walletAddress);

            // Check if this transaction was already used
            const existingTicket = await Ticket.findByTransaction(transactionSignature);
            if (existingTicket) {
                return res.status(400).json({
                    error: 'Transaction already used',
                    message: 'This transaction has already been used to purchase a ticket'
                });
            }

            // Purchase ticket
            const ticket = await Ticket.purchase(user.id, ticketType, transactionSignature);

            res.json({
                success: true,
                ticket: {
                    id: ticket.id,
                    type: ticket.ticket_type,
                    expiresAt: ticket.expires_at,
                    bonusSlot: ticket.bonusSlot || false,
                    verifiedAmount: paymentVerification.actualAmount
                },
                message: ticket.bonusSlot
                    ? 'Ticket purchased! You also won a bonus airdrop slot!'
                    : 'Ticket purchased successfully!'
            });
        } catch (error) {
            if (error.message.includes('Transaction')) {
                return res.status(400).json({
                    error: 'Transaction error',
                    message: error.message
                });
            }
            next(error);
        }
    }
);

/**
 * GET /api/tickets/active
 * Get user's currently active ticket
 */
router.get('/active',
    authenticateWallet,
    async (req, res, next) => {
        try {
            const walletAddress = req.wallet.address;

            const user = await User.findByWallet(walletAddress);
            if (!user) {
                return res.json({ ticket: null });
            }

            const ticket = await Ticket.getActive(user.id);

            if (!ticket) {
                return res.json({ ticket: null });
            }

            res.json({
                ticket: {
                    id: ticket.id,
                    type: ticket.ticket_type,
                    name: ticket.config.name,
                    icon: ticket.config.icon,
                    expiresAt: ticket.expires_at,
                    remainingTime: ticket.remainingTime,
                    remainingTimeHuman: formatDuration(ticket.remainingTime)
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/tickets/verify
 * Check if user has competitive access
 */
router.get('/verify',
    authenticateWallet,
    async (req, res, next) => {
        try {
            const walletAddress = req.wallet.address;

            const user = await User.findByWallet(walletAddress);
            if (!user) {
                return res.json({ hasAccess: false });
            }

            const hasAccess = await Ticket.hasCompetitiveAccess(user.id);

            res.json({ hasAccess });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/tickets/history
 * Get user's ticket purchase history
 */
router.get('/history',
    authenticateWallet,
    validateQuery(schemas.ticketHistoryQuery),
    async (req, res, next) => {
        try {
            const walletAddress = req.wallet.address;
            const { limit } = req.query;

            const user = await User.findByWallet(walletAddress);
            if (!user) {
                return res.json({ tickets: [] });
            }

            const tickets = await Ticket.getHistory(user.id, limit);

            res.json({
                tickets: tickets.map(t => ({
                    id: t.id,
                    type: t.ticket_type,
                    priceSOL: parseFloat(t.price_sol),
                    purchasedAt: t.purchased_at,
                    expiresAt: t.expires_at,
                    isActive: t.is_active && new Date(t.expires_at) > new Date()
                }))
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Helper: Format duration to human readable
 */
function formatDuration(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''}`;
}

export default router;
