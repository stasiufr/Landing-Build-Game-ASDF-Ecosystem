/**
 * Users API Routes
 * Endpoints for user management and wallet operations
 */

import { Router } from 'express';
import { User } from '../models/User.js';
import { getTokenBalance, getCurrentPeriod } from '../utils/solana.js';
import { authenticateWallet, optionalWalletAuth } from '../middleware/security.js';
import { schemas, validateParams } from '../middleware/validation.js';

const router = Router();

/**
 * GET /api/users/me
 * Get current user's profile
 */
router.get('/me',
    authenticateWallet,
    async (req, res, next) => {
        try {
            const walletAddress = req.wallet.address;

            // Get or create user
            const user = await User.findOrCreate(walletAddress);

            // Get full stats
            const stats = await User.getStats(user.id);

            res.json({
                user: {
                    id: user.id,
                    wallet: walletAddress,
                    walletShort: `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
                    balance: parseInt(stats.balance || 0),
                    isHolder: stats.is_holder,
                    totalGamesPlayed: stats.total_games_played,
                    bestScores: stats.best_scores || {},
                    totalAirdropSlots: parseInt(stats.total_airdrop_slots || 0),
                    activeTicket: stats.active_ticket,
                    createdAt: stats.created_at
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/users/refresh-balance
 * Refresh user's token balance from blockchain
 */
router.post('/refresh-balance',
    authenticateWallet,
    async (req, res, next) => {
        try {
            const walletAddress = req.wallet.address;

            // Get fresh balance from blockchain
            const { balance, isHolder, error } = await getTokenBalance(walletAddress);

            if (error) {
                return res.status(500).json({
                    error: 'Balance check failed',
                    message: error
                });
            }

            // Update user in database
            const user = await User.findOrCreate(walletAddress);
            const updatedUser = await User.updateBalance(walletAddress);

            res.json({
                balance,
                isHolder,
                previousBalance: parseInt(user.balance || 0),
                updated: true
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/users/check/:wallet
 * Check if a wallet address has holder status (public endpoint)
 */
router.get('/check/:wallet',
    validateParams(schemas.userCheckParams),
    async (req, res, next) => {
    try {
        const { wallet } = req.params;

        // Check balance
        const { balance, isHolder } = await getTokenBalance(wallet);

        res.json({
            wallet: `${wallet.slice(0, 4)}...${wallet.slice(-4)}`,
            isHolder,
            hasMinBalance: isHolder
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/users/airdrop-slots
 * Get user's airdrop slot details
 */
router.get('/airdrop-slots',
    authenticateWallet,
    async (req, res, next) => {
        try {
            const walletAddress = req.wallet.address;

            const user = await User.findByWallet(walletAddress);
            if (!user) {
                return res.json({
                    totalSlots: 0,
                    currentCycle: [],
                    history: []
                });
            }

            const { cycleNumber } = getCurrentPeriod();

            // Get current cycle slots
            const currentCycleResult = await import('../db/index.js').then(db =>
                db.query(
                    `SELECT week_number, slots_earned, rank_achieved, game_id, source, created_at
                     FROM airdrop_slots
                     WHERE user_id = $1 AND cycle_number = $2
                     ORDER BY week_number DESC`,
                    [user.id, cycleNumber]
                )
            );

            // Get historical cycles
            const historyResult = await import('../db/index.js').then(db =>
                db.query(
                    `SELECT cycle_number, SUM(slots_earned) as total_slots
                     FROM airdrop_slots
                     WHERE user_id = $1
                     GROUP BY cycle_number
                     ORDER BY cycle_number DESC
                     LIMIT 10`,
                    [user.id]
                )
            );

            const totalSlots = currentCycleResult.rows.reduce(
                (sum, row) => sum + row.slots_earned, 0
            );

            res.json({
                cycleNumber,
                totalSlots,
                currentCycle: currentCycleResult.rows,
                history: historyResult.rows
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/users/period
 * Get current game period information
 */
router.get('/period', (req, res) => {
    const period = getCurrentPeriod();

    res.json({
        weekNumber: period.weekNumber,
        cycleNumber: period.cycleNumber,
        weekInCycle: period.weekInCycle,
        nextRotation: period.nextRotation,
        timeUntilRotation: period.timeUntilRotation,
        currentGameIndex: period.currentGameIndex
    });
});

export default router;
