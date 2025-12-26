import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import {
  walletParamSchema,
  listCreatorsQuerySchema,
  categoryParamSchema,
} from './creator.validator.js';
import {
  getCreators,
  getCategories,
  getFeaturedCreators,
  getCreatorsByCategory,
  getCreatorByWallet,
  getCreatorStats,
} from './creator.controller.js';

const router = Router();

/**
 * @route GET /api/creators
 * @desc Get all creators with filtering
 * @access Public
 */
router.get('/', validate({ query: listCreatorsQuerySchema }), getCreators);

/**
 * @route GET /api/creators/categories
 * @desc Get all categories with counts
 * @access Public
 */
router.get('/categories', getCategories);

/**
 * @route GET /api/creators/featured
 * @desc Get featured creators
 * @access Public
 */
router.get('/featured', getFeaturedCreators);

/**
 * @route GET /api/creators/category/:category
 * @desc Get creators by category
 * @access Public
 */
router.get(
  '/category/:category',
  validate({
    params: categoryParamSchema,
    query: listCreatorsQuerySchema,
  }),
  getCreatorsByCategory
);

/**
 * @route GET /api/creators/:wallet
 * @desc Get creator by wallet address
 * @access Public
 */
router.get('/:wallet', validate({ params: walletParamSchema }), getCreatorByWallet);

/**
 * @route GET /api/creators/:wallet/stats
 * @desc Get creator statistics
 * @access Public
 */
router.get('/:wallet/stats', validate({ params: walletParamSchema }), getCreatorStats);

export default router;
