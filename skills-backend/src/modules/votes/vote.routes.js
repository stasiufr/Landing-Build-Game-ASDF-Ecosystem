import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';
import {
  getVotesForEntry,
  getLeaderboard,
  getTopEntries,
  getVoteStats,
} from './vote.controller.js';

const router = Router();

// Validation schemas
const entryIdSchema = z.object({
  entryId: z.string().min(1, 'Entry ID is required'),
});

const challengeIdSchema = z.object({
  challengeId: z.string().min(1, 'Challenge ID is required'),
});

const leaderboardQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
});

/**
 * @route GET /api/votes/entry/:entryId
 * @desc Get votes for a specific entry
 * @access Public
 */
router.get('/entry/:entryId', validate({ params: entryIdSchema }), getVotesForEntry);

/**
 * @route GET /api/votes/leaderboard/:challengeId
 * @desc Get leaderboard for a challenge
 * @access Public
 */
router.get(
  '/leaderboard/:challengeId',
  validate({
    params: challengeIdSchema,
    query: leaderboardQuerySchema,
  }),
  getLeaderboard
);

/**
 * @route GET /api/votes/top/:challengeId
 * @desc Get top entries for a challenge
 * @access Public
 */
router.get('/top/:challengeId', validate({ params: challengeIdSchema }), getTopEntries);

/**
 * @route GET /api/votes/stats/:challengeId
 * @desc Get vote statistics
 * @access Public
 */
router.get('/stats/:challengeId', validate({ params: challengeIdSchema }), getVoteStats);

export default router;
