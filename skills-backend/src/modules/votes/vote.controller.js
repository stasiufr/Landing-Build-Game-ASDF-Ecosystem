import voteService from './vote.service.js';
import { sendSuccess, sendPaginated } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

/**
 * Vote Controller
 * HTTP handlers for vote endpoints
 */

/**
 * GET /votes/entry/:entryId
 * Get votes for a specific entry
 */
export const getVotesForEntry = asyncHandler(async (req, res) => {
  const { entryId } = req.params;
  const votes = await voteService.getVotesForEntry(entryId);

  sendSuccess(res, votes);
});

/**
 * GET /votes/leaderboard/:challengeId
 * Get leaderboard for a challenge
 */
export const getLeaderboard = asyncHandler(async (req, res) => {
  const { challengeId } = req.params;
  const { page, limit, category } = req.query;

  const result = await voteService.getLeaderboard(challengeId, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
    category,
  });

  res.json({
    success: true,
    data: result.leaderboard,
    pagination: result.pagination,
    stats: result.stats,
  });
});

/**
 * GET /votes/top/:challengeId
 * Get top entries for a challenge
 */
export const getTopEntries = asyncHandler(async (req, res) => {
  const { challengeId } = req.params;
  const limit = parseInt(req.query.limit, 10) || 5;

  const topEntries = await voteService.getTopEntries(challengeId, limit);

  sendSuccess(res, topEntries);
});

/**
 * GET /votes/stats/:challengeId
 * Get vote statistics for a challenge
 */
export const getVoteStats = asyncHandler(async (req, res) => {
  const { challengeId } = req.params;
  const stats = await voteService.getVoteStats(challengeId);

  sendSuccess(res, stats);
});

export default {
  getVotesForEntry,
  getLeaderboard,
  getTopEntries,
  getVoteStats,
};
