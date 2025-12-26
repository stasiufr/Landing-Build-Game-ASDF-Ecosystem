/**
 * Scores API Routes
 * Endpoints for score submission and leaderboards
 */

import { Router } from 'express';
import { Score } from '../models/Score.js';
import { User } from '../models/User.js';
import { Ticket } from '../models/Ticket.js';
import { authenticateWallet, validateGameId, scoreSubmitLimiter } from '../middleware/security.js';
import { schemas, validateBody, validateParams, validateQuery } from '../middleware/validation.js';

const router = Router();

/**
 * POST /api/scores/submit
 * Submit a game score
 */
router.post('/submit',
    scoreSubmitLimiter,
    authenticateWallet,
    validateBody(schemas.scoreSubmit),
    async (req, res, next) => {
        try {
            const { gameId, score, isCompetitive, sessionData } = req.body;
            const walletAddress = req.wallet.address;

            // Get or create user
            const user = await User.findOrCreate(walletAddress);

            // Check competitive access if submitting competitive score
            if (isCompetitive) {
                const hasAccess = await Ticket.hasCompetitiveAccess(user.id);
                if (!hasAccess) {
                    return res.status(403).json({
                        error: 'No competitive access',
                        message: 'Purchase a ticket to submit competitive scores'
                    });
                }
            }

            // Submit score
            const submittedScore = await Score.submit(
                user.id,
                gameId,
                Math.floor(score),
                isCompetitive,
                sessionData
            );

            // Update games played counter
            await User.incrementGamesPlayed(user.id);

            // Get updated best score
            const bestScore = await Score.getBestScore(user.id, gameId);

            // Get rank if competitive
            let rank = null;
            if (isCompetitive) {
                const rankData = await Score.getUserWeeklyRank(user.id, gameId);
                rank = rankData.rank;
            }

            res.json({
                success: true,
                score: submittedScore,
                bestScore,
                isNewBest: score >= bestScore,
                rank,
                message: isCompetitive
                    ? 'Competitive score submitted!'
                    : 'Practice score recorded'
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/scores/best/:gameId
 * Get user's best score for a game
 */
router.get('/best/:gameId',
    authenticateWallet,
    validateParams(schemas.scoreBestParams),
    async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const walletAddress = req.wallet.address;

            const user = await User.findByWallet(walletAddress);
            if (!user) {
                return res.json({ bestScore: 0 });
            }

            const bestScore = await Score.getBestScore(user.id, gameId);
            const rank = await Score.getUserWeeklyRank(user.id, gameId);

            res.json({
                bestScore,
                weeklyRank: rank.rank,
                weeklyScore: rank.score
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/scores/all
 * Get all best scores for authenticated user
 */
router.get('/all',
    authenticateWallet,
    async (req, res, next) => {
        try {
            const walletAddress = req.wallet.address;

            const user = await User.findByWallet(walletAddress);
            if (!user) {
                return res.json({ scores: {} });
            }

            const scores = await Score.getAllBestScores(user.id);
            res.json({ scores });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/scores/leaderboard/weekly/:gameId
 * Get weekly leaderboard for a game
 */
router.get('/leaderboard/weekly/:gameId',
    validateParams(schemas.scoreBestParams),
    validateQuery(schemas.leaderboardQuery),
    async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const { limit } = req.query;

            const leaderboard = await Score.getWeeklyLeaderboard(gameId, limit);

            res.json({
                type: 'weekly',
                gameId,
                leaderboard
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/scores/leaderboard/cycle
 * Get cycle leaderboard (accumulated airdrop slots)
 */
router.get('/leaderboard/cycle',
    validateQuery(schemas.leaderboardQuery),
    async (req, res, next) => {
    try {
        const { limit } = req.query;

        const leaderboard = await Score.getCycleLeaderboard(limit);

        res.json({
            type: 'cycle',
            leaderboard
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/scores/leaderboard/alltime/:gameId
 * Get all-time leaderboard for a game
 */
router.get('/leaderboard/alltime/:gameId',
    validateParams(schemas.scoreBestParams),
    validateQuery(schemas.leaderboardQuery),
    async (req, res, next) => {
        try {
            const { gameId } = req.params;
            const { limit } = req.query;

            const leaderboard = await Score.getAllTimeLeaderboard(gameId, limit);

            res.json({
                type: 'alltime',
                gameId,
                leaderboard
            });
        } catch (error) {
            next(error);
        }
    }
);

export default router;
