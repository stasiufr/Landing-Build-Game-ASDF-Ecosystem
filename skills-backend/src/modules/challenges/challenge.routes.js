import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import {
  challengeIdSchema,
  listEntriesQuerySchema,
  historyQuerySchema,
} from './challenge.validator.js';
import {
  getCurrentChallenge,
  getChallengeById,
  getChallengeEntries,
  getChallengeStats,
  getChallengeHistory,
  getHallOfFame,
} from './challenge.controller.js';

const router = Router();

/**
 * @route GET /api/challenges/current
 * @desc Get the current active challenge
 * @access Public
 */
router.get('/current', getCurrentChallenge);

/**
 * @route GET /api/challenges/history
 * @desc Get completed challenges
 * @access Public
 */
router.get('/history', validate({ query: historyQuerySchema }), getChallengeHistory);

/**
 * @route GET /api/challenges/hall-of-fame
 * @desc Get past winners
 * @access Public
 */
router.get('/hall-of-fame', getHallOfFame);

/**
 * @route GET /api/challenges/:id
 * @desc Get challenge by ID
 * @access Public
 */
router.get('/:id', validate({ params: challengeIdSchema }), getChallengeById);

/**
 * @route GET /api/challenges/:id/entries
 * @desc Get entries for a challenge
 * @access Public
 */
router.get(
  '/:id/entries',
  validate({
    params: challengeIdSchema,
    query: listEntriesQuerySchema,
  }),
  getChallengeEntries
);

/**
 * @route GET /api/challenges/:id/stats
 * @desc Get challenge statistics
 * @access Public
 */
router.get('/:id/stats', validate({ params: challengeIdSchema }), getChallengeStats);

export default router;
