import creatorService from './creator.service.js';
import { sendSuccess, sendPaginated } from '../../utils/response.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

/**
 * Creator Controller
 * HTTP handlers for creator endpoints
 */

/**
 * GET /creators
 * Get all creators with filtering
 */
export const getCreators = asyncHandler(async (req, res) => {
  const { page, limit, category, sort, verified, featured, search } = req.query;

  const result = await creatorService.getCreators({
    page,
    limit,
    category,
    sort,
    verified,
    featured,
    search,
  });

  sendPaginated(res, result.creators, result.pagination);
});

/**
 * GET /creators/categories
 * Get all categories with counts
 */
export const getCategories = asyncHandler(async (_req, res) => {
  const categories = await creatorService.getCategories();
  sendSuccess(res, categories);
});

/**
 * GET /creators/featured
 * Get featured creators
 */
export const getFeaturedCreators = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 6;
  const creators = await creatorService.getFeaturedCreators(limit);
  sendSuccess(res, creators);
});

/**
 * GET /creators/category/:category
 * Get creators by category
 */
export const getCreatorsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { page, limit, sort } = req.query;

  const result = await creatorService.getCreatorsByCategory(category, {
    page,
    limit,
    sort,
  });

  sendPaginated(res, result.creators, result.pagination);
});

/**
 * GET /creators/:wallet
 * Get creator by wallet address
 */
export const getCreatorByWallet = asyncHandler(async (req, res) => {
  const { wallet } = req.params;
  const creator = await creatorService.getCreatorByWallet(wallet);

  sendSuccess(res, creator);
});

/**
 * GET /creators/:wallet/stats
 * Get creator statistics
 */
export const getCreatorStats = asyncHandler(async (req, res) => {
  const { wallet } = req.params;
  const stats = await creatorService.getCreatorStats(wallet);

  sendSuccess(res, stats);
});

export default {
  getCreators,
  getCategories,
  getFeaturedCreators,
  getCreatorsByCategory,
  getCreatorByWallet,
  getCreatorStats,
};
