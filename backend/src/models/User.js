/**
 * User Model
 * Database operations for user management
 */

import { query, transaction } from '../db/index.js';
import { getTokenBalance } from '../utils/solana.js';

export const User = {
    /**
     * Find or create a user by wallet address
     */
    async findOrCreate(walletAddress) {
        // Try to find existing user
        const existing = await query(
            'SELECT * FROM users WHERE wallet_address = $1',
            [walletAddress]
        );

        if (existing.rows.length > 0) {
            return existing.rows[0];
        }

        // Create new user
        const result = await query(
            `INSERT INTO users (wallet_address)
             VALUES ($1)
             RETURNING *`,
            [walletAddress]
        );

        return result.rows[0];
    },

    /**
     * Find user by wallet address
     */
    async findByWallet(walletAddress) {
        const result = await query(
            'SELECT * FROM users WHERE wallet_address = $1',
            [walletAddress]
        );
        return result.rows[0] || null;
    },

    /**
     * Find user by ID
     */
    async findById(id) {
        const result = await query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    /**
     * Update user's token balance and holder status
     */
    async updateBalance(walletAddress) {
        const { balance, isHolder } = await getTokenBalance(walletAddress);

        const result = await query(
            `UPDATE users
             SET balance = $1, is_holder = $2, updated_at = CURRENT_TIMESTAMP
             WHERE wallet_address = $3
             RETURNING *`,
            [balance, isHolder, walletAddress]
        );

        return result.rows[0];
    },

    /**
     * Increment games played counter
     */
    async incrementGamesPlayed(userId) {
        await query(
            `UPDATE users
             SET total_games_played = total_games_played + 1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [userId]
        );
    },

    /**
     * Get user stats including scores and airdrop slots
     */
    async getStats(userId) {
        const stats = await query(
            `SELECT
                u.*,
                COALESCE(s.best_scores, '{}'::jsonb) as best_scores,
                COALESCE(a.total_slots, 0) as total_airdrop_slots,
                COALESCE(t.active_ticket, null) as active_ticket
             FROM users u
             LEFT JOIN LATERAL (
                SELECT jsonb_object_agg(game_id, max_score) as best_scores
                FROM (
                    SELECT game_id, MAX(score) as max_score
                    FROM scores
                    WHERE user_id = u.id
                    GROUP BY game_id
                ) sub
             ) s ON true
             LEFT JOIN LATERAL (
                SELECT SUM(slots_earned) as total_slots
                FROM airdrop_slots
                WHERE user_id = u.id
             ) a ON true
             LEFT JOIN LATERAL (
                SELECT jsonb_build_object(
                    'type', ticket_type,
                    'expires_at', expires_at
                ) as active_ticket
                FROM tickets
                WHERE user_id = u.id AND is_active = true AND expires_at > CURRENT_TIMESTAMP
                ORDER BY expires_at DESC
                LIMIT 1
             ) t ON true
             WHERE u.id = $1`,
            [userId]
        );

        return stats.rows[0];
    },

    /**
     * Get all holders (for airdrop distribution)
     */
    async getAllHolders() {
        const result = await query(
            `SELECT id, wallet_address, balance
             FROM users
             WHERE is_holder = true
             ORDER BY balance DESC`
        );
        return result.rows;
    }
};

export default User;
