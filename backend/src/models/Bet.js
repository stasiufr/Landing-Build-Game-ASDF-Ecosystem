/**
 * Bet Model
 * Database operations for Pump Arena betting system
 */

import { query, transaction } from '../db/index.js';
import config from '../config/index.js';

// Betting configuration
const BETTING_CONFIG = {
    minBet: 10000,           // Minimum 10,000 tokens
    maxBet: 1000000000,      // Maximum 1 billion tokens
    winMultiplier: 1.8,      // Win pays 1.8x
    targetScore: 100000,     // Score needed to win
    houseEdge: 0.1           // 10% house edge
};

export const Bet = {
    /**
     * Place a new bet
     */
    async place(userId, betAmount, transactionSignature = null) {
        // Validate bet amount
        if (betAmount < BETTING_CONFIG.minBet) {
            throw new Error(`Minimum bet is ${BETTING_CONFIG.minBet.toLocaleString()} tokens`);
        }

        if (betAmount > BETTING_CONFIG.maxBet) {
            throw new Error(`Maximum bet is ${BETTING_CONFIG.maxBet.toLocaleString()} tokens`);
        }

        // Check for pending bets (only one allowed at a time)
        const pendingBet = await query(
            `SELECT id FROM bets
             WHERE user_id = $1 AND result = 'pending'`,
            [userId]
        );

        if (pendingBet.rows.length > 0) {
            throw new Error('You already have a pending bet. Complete your current game first.');
        }

        // Create bet
        const result = await query(
            `INSERT INTO bets (user_id, bet_amount, result, transaction_signature)
             VALUES ($1, $2, 'pending', $3)
             RETURNING *`,
            [userId, betAmount, transactionSignature]
        );

        return result.rows[0];
    },

    /**
     * Settle a bet based on game result
     */
    async settle(betId, finalScore, won) {
        const bet = await query('SELECT * FROM bets WHERE id = $1', [betId]);

        if (bet.rows.length === 0) {
            throw new Error('Bet not found');
        }

        if (bet.rows[0].result !== 'pending') {
            throw new Error('Bet already settled');
        }

        const betData = bet.rows[0];
        const result = won ? 'win' : 'loss';
        const payoutAmount = won
            ? Math.floor(betData.bet_amount * BETTING_CONFIG.winMultiplier)
            : 0;

        const updateResult = await query(
            `UPDATE bets
             SET result = $1, payout_amount = $2, final_score = $3, settled_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [result, payoutAmount, finalScore, betId]
        );

        return updateResult.rows[0];
    },

    /**
     * Get user's pending bet
     */
    async getPending(userId) {
        const result = await query(
            `SELECT * FROM bets
             WHERE user_id = $1 AND result = 'pending'
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        return result.rows[0] || null;
    },

    /**
     * Get user's betting history
     */
    async getHistory(userId, limit = 20) {
        const result = await query(
            `SELECT * FROM bets
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        return result.rows;
    },

    /**
     * Get user's betting statistics
     */
    async getUserStats(userId) {
        const result = await query(
            `SELECT
                COUNT(*) as total_bets,
                COUNT(*) FILTER (WHERE result = 'win') as wins,
                COUNT(*) FILTER (WHERE result = 'loss') as losses,
                COALESCE(SUM(bet_amount), 0) as total_wagered,
                COALESCE(SUM(payout_amount), 0) as total_won,
                COALESCE(MAX(payout_amount), 0) as biggest_win,
                COALESCE(AVG(final_score) FILTER (WHERE result IS NOT NULL), 0) as avg_score
             FROM bets
             WHERE user_id = $1 AND result != 'pending'`,
            [userId]
        );

        const stats = result.rows[0];
        return {
            totalBets: parseInt(stats.total_bets),
            wins: parseInt(stats.wins),
            losses: parseInt(stats.losses),
            winRate: stats.total_bets > 0
                ? ((stats.wins / stats.total_bets) * 100).toFixed(1)
                : '0.0',
            totalWagered: parseInt(stats.total_wagered),
            totalWon: parseInt(stats.total_won),
            netProfit: parseInt(stats.total_won) - parseInt(stats.total_wagered),
            biggestWin: parseInt(stats.biggest_win),
            avgScore: Math.round(parseFloat(stats.avg_score))
        };
    },

    /**
     * Get global betting statistics
     */
    async getGlobalStats() {
        const result = await query(
            `SELECT
                COUNT(*) as total_bets,
                COUNT(DISTINCT user_id) as unique_players,
                COALESCE(SUM(bet_amount), 0) as total_volume,
                COALESCE(SUM(payout_amount), 0) as total_payouts,
                MAX(payout_amount) as biggest_payout
             FROM bets
             WHERE result != 'pending'`
        );

        const stats = result.rows[0];
        return {
            totalBets: parseInt(stats.total_bets),
            uniquePlayers: parseInt(stats.unique_players),
            totalVolume: parseInt(stats.total_volume),
            totalPayouts: parseInt(stats.total_payouts),
            houseProfit: parseInt(stats.total_volume) - parseInt(stats.total_payouts),
            biggestPayout: parseInt(stats.biggest_payout || 0)
        };
    },

    /**
     * Cancel a pending bet (admin function)
     */
    async cancel(betId, reason = 'cancelled') {
        const result = await query(
            `UPDATE bets
             SET result = 'cancelled', settled_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND result = 'pending'
             RETURNING *`,
            [betId]
        );

        return result.rows[0] || null;
    },

    /**
     * Get configuration
     */
    getConfig() {
        return { ...BETTING_CONFIG };
    },

    /**
     * Find bet by transaction signature
     * Used to prevent double-spending
     */
    async findByTransaction(transactionSignature) {
        const result = await query(
            `SELECT * FROM bets WHERE transaction_signature = $1`,
            [transactionSignature]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    },

    /**
     * Update bet with payout transaction signature
     */
    async updatePayoutSignature(betId, payoutSignature) {
        const result = await query(
            `UPDATE bets
             SET payout_signature = $1, payout_status = 'completed', payout_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [payoutSignature, betId]
        );

        return result.rows[0];
    },

    /**
     * Mark bet as needing manual payout
     */
    async markPendingPayout(betId) {
        const result = await query(
            `UPDATE bets
             SET payout_status = 'pending'
             WHERE id = $1
             RETURNING *`,
            [betId]
        );

        return result.rows[0];
    },

    /**
     * Get all bets with pending payouts (for admin/cron job)
     */
    async getPendingPayouts() {
        const result = await query(
            `SELECT b.*, u.wallet_address
             FROM bets b
             JOIN users u ON b.user_id = u.id
             WHERE b.result = 'win' AND b.payout_status = 'pending'
             ORDER BY b.settled_at ASC`
        );

        return result.rows;
    },

    /**
     * Retry payout for a specific bet
     */
    async retryPayout(betId) {
        // Just return the bet info, actual payout handled by caller
        const result = await query(
            `SELECT b.*, u.wallet_address
             FROM bets b
             JOIN users u ON b.user_id = u.id
             WHERE b.id = $1 AND b.result = 'win' AND b.payout_status = 'pending'`,
            [betId]
        );

        return result.rows[0] || null;
    }
};

export default Bet;
