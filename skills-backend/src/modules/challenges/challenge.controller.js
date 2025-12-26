import challengeService from './challenge.service.js';
import { sendSuccess, sendPaginated } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

/**
 * Challenge Controller
 * HTTP handlers for challenge endpoints
 */

/**
 * GET /challenges/current
 * Get the current active challenge
 */
export const getCurrentChallenge = asyncHandler(async (_req, res) => {
  const challenge = await challengeService.getCurrentChallenge();

  if (!challenge) {
    return sendSuccess(res, null, 200);
  }

  sendSuccess(res, challenge);
});

/**
 * GET /challenges/:id
 * Get challenge by ID
 */
export const getChallengeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const challenge = await challengeService.getChallengeById(id);

  sendSuccess(res, challenge);
});

/**
 * GET /challenges/:id/entries
 * Get entries for a challenge
 */
export const getChallengeEntries = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page, limit, sort, category } = req.query;

  const result = await challengeService.getEntriesForChallenge(id, {
    page,
    limit,
    sort,
    category,
  });

  sendPaginated(res, result.entries, result.pagination);
});

/**
 * GET /challenges/:id/stats
 * Get challenge statistics
 */
export const getChallengeStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const stats = await challengeService.getChallengeStats(id);

  sendSuccess(res, stats);
});

/**
 * GET /challenges/history
 * Get completed challenges
 */
export const getChallengeHistory = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const result = await challengeService.getChallengeHistory({ page, limit });

  sendPaginated(res, result.challenges, result.pagination);
});

/**
 * GET /challenges/hall-of-fame
 * Get past winners
 */
export const getHallOfFame = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  const hallOfFame = await challengeService.getHallOfFame({ limit: parseInt(limit, 10) || 10 });

  sendSuccess(res, hallOfFame);
});

export default {
  getCurrentChallenge,
  getChallengeById,
  getChallengeEntries,
  getChallengeStats,
  getChallengeHistory,
  getHallOfFame,
};
