/**
 * Score Model
 * Database operations for score management and leaderboards
 */

import { query } from '../db/index.js';
import { getCurrentPeriod, hashGameSession } from '../utils/solana.js';
import config from '../config/index.js';

export const Score = {
    /**
     * Submit a new score
     */
    async submit(userId, gameId, score, isCompetitive = false, sessionData = null) {
        const { weekNumber, cycleNumber } = getCurrentPeriod();

        // Generate session hash for anti-cheat
        const sessionHash = sessionData ? hashGameSession({
            userId,
            gameId,
            score,
            timestamp: Date.now(),
            ...sessionData
        }) : null;

        const result = await query(
            `INSERT INTO scores (user_id, game_id, score, is_competitive, session_hash, week_number, cycle_number)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [userId, gameId, score, isCompetitive, sessionHash, weekNumber, cycleNumber]
        );

        return result.rows[0];
    },

    /**
     * Get user's best score for a game
     */
    async getBestScore(userId, gameId) {
        const result = await query(
            `SELECT MAX(score) as best_score
             FROM scores
             WHERE user_id = $1 AND game_id = $2`,
            [userId, gameId]
        );
        return result.rows[0]?.best_score || 0;
    },

    /**
     * Get user's best scores for all games
     */
    async getAllBestScores(userId) {
        const result = await query(
            `SELECT game_id, MAX(score) as best_score
             FROM scores
             WHERE user_id = $1
             GROUP BY game_id`,
            [userId]
        );

        return result.rows.reduce((acc, row) => {
            acc[row.game_id] = row.best_score;
            return acc;
        }, {});
    },

    /**
     * Get weekly leaderboard for a game
     */
    async getWeeklyLeaderboard(gameId, limit = 10) {
        const { weekNumber } = getCurrentPeriod();

        const result = await query(
            `SELECT
                u.wallet_address as player,
                MAX(s.score) as score,
                ROW_NUMBER() OVER (ORDER BY MAX(s.score) DESC) as rank
             FROM scores s
             JOIN users u ON s.user_id = u.id
             WHERE s.game_id = $1
               AND s.week_number = $2
               AND s.is_competitive = true
             GROUP BY u.id, u.wallet_address
             ORDER BY score DESC
             LIMIT $3`,
            [gameId, weekNumber, limit]
        );

        // Add airdrop slots info
        return result.rows.map(row => ({
            ...row,
            rank: parseInt(row.rank),
            slots: config.game.airdropSlots[row.rank] || 0,
            player: `${row.player.slice(0, 4)}...${row.player.slice(-4)}`
        }));
    },

    /**
     * Get cycle leaderboard (accumulated slots)
     */
    async getCycleLeaderboard(limit = 10) {
        const { cycleNumber } = getCurrentPeriod();

        const result = await query(
            `SELECT
                u.wallet_address as player,
                SUM(a.slots_earned) as total_slots,
                ROW_NUMBER() OVER (ORDER BY SUM(a.slots_earned) DESC) as rank
             FROM airdrop_slots a
             JOIN users u ON a.user_id = u.id
             WHERE a.cycle_number = $1
             GROUP BY u.id, u.wallet_address
             HAVING SUM(a.slots_earned) > 0
             ORDER BY total_slots DESC
             LIMIT $2`,
            [cycleNumber, limit]
        );

        return result.rows.map(row => ({
            ...row,
            rank: parseInt(row.rank),
            slots: parseInt(row.total_slots),
            player: `${row.player.slice(0, 4)}...${row.player.slice(-4)}`
        }));
    },

    /**
     * Get all-time leaderboard
     */
    async getAllTimeLeaderboard(gameId, limit = 10) {
        const result = await query(
            `SELECT
                u.wallet_address as player,
                MAX(s.score) as score,
                ROW_NUMBER() OVER (ORDER BY MAX(s.score) DESC) as rank
             FROM scores s
             JOIN users u ON s.user_id = u.id
             WHERE s.game_id = $1
             GROUP BY u.id, u.wallet_address
             ORDER BY score DESC
             LIMIT $2`,
            [gameId, limit]
        );

        return result.rows.map(row => ({
            ...row,
            rank: parseInt(row.rank),
            player: `${row.player.slice(0, 4)}...${row.player.slice(-4)}`
        }));
    },

    /**
     * Get user's rank in weekly leaderboard
     */
    async getUserWeeklyRank(userId, gameId) {
        const { weekNumber } = getCurrentPeriod();

        const result = await query(
            `WITH ranked AS (
                SELECT
                    user_id,
                    MAX(score) as score,
                    ROW_NUMBER() OVER (ORDER BY MAX(score) DESC) as rank
                FROM scores
                WHERE game_id = $1
                  AND week_number = $2
                  AND is_competitive = true
                GROUP BY user_id
             )
             SELECT rank, score FROM ranked WHERE user_id = $3`,
            [gameId, weekNumber, userId]
        );

        return result.rows[0] || { rank: null, score: 0 };
    },

    /**
     * Process end of week - calculate airdrop slots
     */
    async processWeekEnd(weekNumber) {
        const { cycleNumber } = getCurrentPeriod();

        // Get all games and their top 3 players
        for (const gameId of config.game.validGameIds) {
            const topPlayers = await query(
                `SELECT
                    user_id,
                    MAX(score) as score,
                    ROW_NUMBER() OVER (ORDER BY MAX(score) DESC) as rank
                 FROM scores
                 WHERE game_id = $1
                   AND week_number = $2
                   AND is_competitive = true
                 GROUP BY user_id
                 ORDER BY score DESC
                 LIMIT 3`,
                [gameId, weekNumber]
            );

            // Award airdrop slots
            for (const player of topPlayers.rows) {
                const slots = config.game.airdropSlots[player.rank] || 0;
                if (slots > 0) {
                    await query(
                        `INSERT INTO airdrop_slots (user_id, cycle_number, week_number, slots_earned, rank_achieved, game_id, source)
                         VALUES ($1, $2, $3, $4, $5, $6, 'leaderboard')
                         ON CONFLICT (user_id, cycle_number, week_number, source)
                         DO UPDATE SET slots_earned = GREATEST(airdrop_slots.slots_earned, $4)`,
                        [player.user_id, cycleNumber, weekNumber, slots, player.rank, gameId]
                    );
                }
            }
        }

        return { processed: true, weekNumber };
    }
};

export default Score;
