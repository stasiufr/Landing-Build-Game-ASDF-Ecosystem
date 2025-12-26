/**
 * Betting API Routes
 * Endpoints for Pump Arena betting system
 */

import { Router } from 'express';
import { Bet } from '../models/Bet.js';
import { User } from '../models/User.js';
import { authenticateWallet, bettingLimiter, requireAdmin } from '../middleware/security.js';
import { schemas, validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import { verifyTokenPayment, sendPayoutFromEscrow, getEscrowBalance } from '../utils/solana.js';
import config from '../config/index.js';

const router = Router();

/**
 * GET /api/betting/config
 * Get betting configuration
 */
router.get('/config', (req, res) => {
    const config = Bet.getConfig();
    res.json({
        minBet: config.minBet,
        maxBet: config.maxBet,
        winMultiplier: config.winMultiplier,
        targetScore: config.targetScore,
        houseEdge: config.houseEdge
    });
});

/**
 * POST /api/betting/place
 * Place a new bet
 */
router.post('/place',
    bettingLimiter,
    authenticateWallet,
    validateBody(schemas.betPlace),
    async (req, res, next) => {
        try {
            const { betAmount, transactionSignature } = req.body;
            const walletAddress = req.wallet.address;

            // Get or create user
            const user = await User.findOrCreate(walletAddress);

            // Check if user is a holder
            if (!user.is_holder) {
                return res.status(403).json({
                    error: 'Holder required',
                    message: 'You must hold tokens to place bets'
                });
            }

            // Verify token payment to escrow
            const paymentVerification = await verifyTokenPayment(
                transactionSignature,
                walletAddress,
                config.solana.escrowWallet,
                betAmount,
                2 // 2% tolerance
            );

            if (!paymentVerification.valid) {
                return res.status(400).json({
                    error: 'Payment verification failed',
                    message: paymentVerification.error,
                    details: 'Please ensure you sent the correct token amount to the escrow wallet'
                });
            }

            // Check if transaction was already used
            const existingBet = await Bet.findByTransaction(transactionSignature);
            if (existingBet) {
                return res.status(400).json({
                    error: 'Transaction already used',
                    message: 'This transaction has already been used for a bet'
                });
            }

            // Place bet with verified amount
            const bet = await Bet.place(user.id, paymentVerification.actualAmount, transactionSignature);

            res.json({
                success: true,
                bet: {
                    id: bet.id,
                    amount: parseInt(bet.bet_amount),
                    potentialPayout: Math.floor(bet.bet_amount * Bet.getConfig().winMultiplier),
                    targetScore: Bet.getConfig().targetScore,
                    verifiedAmount: paymentVerification.actualAmount
                },
                message: 'Bet placed! Good luck!'
            });
        } catch (error) {
            if (error.message.includes('Minimum') || error.message.includes('Maximum') || error.message.includes('pending')) {
                return res.status(400).json({
                    error: 'Betting error',
                    message: error.message
                });
            }
            next(error);
        }
    }
);

/**
 * POST /api/betting/settle
 * Settle a bet after game completion
 */
router.post('/settle',
    authenticateWallet,
    validateBody(schemas.betSettle),
    async (req, res, next) => {
        try {
            const { betId, finalScore, sessionHash } = req.body;
            const walletAddress = req.wallet.address;

            // Get user
            const user = await User.findByWallet(walletAddress);
            if (!user) {
                return res.status(404).json({
                    error: 'User not found'
                });
            }

            // Get pending bet
            const pendingBet = await Bet.getPending(user.id);
            if (!pendingBet || pendingBet.id !== betId) {
                return res.status(400).json({
                    error: 'Invalid bet',
                    message: 'No matching pending bet found'
                });
            }

            // Determine if won
            const bettingConfig = Bet.getConfig();
            const won = finalScore >= bettingConfig.targetScore;

            // Calculate payout
            const payoutAmount = won ? Math.floor(pendingBet.bet_amount * bettingConfig.winMultiplier) : 0;

            // Settle bet in database
            const settledBet = await Bet.settle(betId, finalScore, won);

            // If won, send payout from escrow
            let payoutResult = null;
            if (won && payoutAmount > 0) {
                console.log(`Processing payout of ${payoutAmount} tokens to ${walletAddress}`);

                payoutResult = await sendPayoutFromEscrow(walletAddress, payoutAmount);

                if (payoutResult.success) {
                    // Update bet with payout transaction signature
                    await Bet.updatePayoutSignature(betId, payoutResult.signature);
                } else {
                    // Mark bet as needing manual payout
                    await Bet.markPendingPayout(betId);
                    console.error(`Payout failed for bet ${betId}:`, payoutResult.error);
                }
            }

            res.json({
                success: true,
                result: {
                    won,
                    finalScore,
                    betAmount: parseInt(settledBet.bet_amount),
                    payout: payoutAmount,
                    targetScore: bettingConfig.targetScore,
                    payoutSent: payoutResult?.success || false,
                    payoutSignature: payoutResult?.signature || null,
                    payoutPending: payoutResult?.pendingPayout || false
                },
                message: won
                    ? payoutResult?.success
                        ? `Congratulations! You won ${payoutAmount.toLocaleString()} tokens! Payout sent.`
                        : `You won ${payoutAmount.toLocaleString()} tokens! Payout processing...`
                    : `Better luck next time! Target was ${bettingConfig.targetScore.toLocaleString()}`
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/betting/pending
 * Get user's pending bet
 */
router.get('/pending',
    authenticateWallet,
    async (req, res, next) => {
        try {
            const walletAddress = req.wallet.address;

            const user = await User.findByWallet(walletAddress);
            if (!user) {
                return res.json({ bet: null });
            }

            const pendingBet = await Bet.getPending(user.id);

            res.json({
                bet: pendingBet ? {
                    id: pendingBet.id,
                    amount: parseInt(pendingBet.bet_amount),
                    potentialPayout: Math.floor(pendingBet.bet_amount * Bet.getConfig().winMultiplier),
                    placedAt: pendingBet.created_at
                } : null
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/betting/history
 * Get user's betting history
 */
router.get('/history',
    authenticateWallet,
    validateQuery(schemas.betHistoryQuery),
    async (req, res, next) => {
        try {
            const walletAddress = req.wallet.address;
            const { limit } = req.query;

            const user = await User.findByWallet(walletAddress);
            if (!user) {
                return res.json({ bets: [] });
            }

            const history = await Bet.getHistory(user.id, limit);

            res.json({
                bets: history.map(b => ({
                    id: b.id,
                    amount: parseInt(b.bet_amount),
                    result: b.result,
                    payout: parseInt(b.payout_amount || 0),
                    score: b.final_score,
                    placedAt: b.created_at,
                    settledAt: b.settled_at
                }))
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/betting/stats
 * Get user's betting statistics
 */
router.get('/stats',
    authenticateWallet,
    async (req, res, next) => {
        try {
            const walletAddress = req.wallet.address;

            const user = await User.findByWallet(walletAddress);
            if (!user) {
                return res.json({
                    stats: {
                        totalBets: 0,
                        wins: 0,
                        losses: 0,
                        winRate: '0.0',
                        totalWagered: 0,
                        totalWon: 0,
                        netProfit: 0
                    }
                });
            }

            const stats = await Bet.getUserStats(user.id);
            res.json({ stats });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/betting/global
 * Get global betting statistics
 */
router.get('/global', async (req, res, next) => {
    try {
        const stats = await Bet.getGlobalStats();
        res.json({ stats });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/betting/escrow-balance
 * Get escrow wallet balance (for monitoring)
 */
router.get('/escrow-balance', async (req, res, next) => {
    try {
        const balance = await getEscrowBalance();
        res.json({
            escrowWallet: config.solana.escrowWallet,
            balance: balance.balance,
            sufficient: balance.sufficient
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/betting/pending-payouts
 * Get all bets with pending payouts (admin endpoint)
 */
router.get('/pending-payouts',
    authenticateWallet,
    requireAdmin,
    async (req, res, next) => {
        try {
            const pendingPayouts = await Bet.getPendingPayouts();

            res.json({
                count: pendingPayouts.length,
                payouts: pendingPayouts.map(p => ({
                    betId: p.id,
                    wallet: p.wallet_address,
                    amount: parseInt(p.payout_amount),
                    settledAt: p.settled_at,
                    score: p.final_score
                }))
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/betting/retry-payout/:betId
 * Retry a failed payout (admin endpoint)
 */
router.post('/retry-payout/:betId',
    authenticateWallet,
    requireAdmin,
    validateParams(schemas.retryPayoutParams),
    async (req, res, next) => {
        try {
            const { betId } = req.params;

            const bet = await Bet.retryPayout(betId);

            if (!bet) {
                return res.status(404).json({
                    error: 'Not found',
                    message: 'No pending payout found for this bet'
                });
            }

            // Attempt payout
            const payoutResult = await sendPayoutFromEscrow(
                bet.wallet_address,
                parseInt(bet.payout_amount)
            );

            if (payoutResult.success) {
                await Bet.updatePayoutSignature(bet.id, payoutResult.signature);
                res.json({
                    success: true,
                    message: 'Payout successful',
                    signature: payoutResult.signature
                });
            } else {
                res.json({
                    success: false,
                    message: 'Payout failed',
                    error: payoutResult.error,
                    retryable: payoutResult.retryable
                });
            }
        } catch (error) {
            next(error);
        }
    }
);

export default router;
