import { z } from 'zod';
import { CATEGORY_LIST, PAGINATION, WALLET_REGEX } from '../../config/constants.js';

/**
 * Validation schemas for Creators module
 */

// Wallet param
export const walletParamSchema = z.object({
  wallet: z.string().regex(WALLET_REGEX, 'Invalid Solana wallet address'),
});

// List creators query params
export const listCreatorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  category: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === 'all' || CATEGORY_LIST.includes(val.toLowerCase()),
      `Category must be 'all' or one of: ${CATEGORY_LIST.join(', ')}`
    ),
  sort: z.enum(['rating', 'name', 'newest', 'votes']).default('rating'),
  verified: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  featured: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  search: z.string().max(100).optional(),
});

// Category param
export const categoryParamSchema = z.object({
  category: z.enum([...CATEGORY_LIST, 'all'], {
    errorMap: () => ({
      message: `Category must be 'all' or one of: ${CATEGORY_LIST.join(', ')}`,
    }),
  }),
});

// Creator application body (for future API submission)
export const creatorApplicationSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name too long'),
  wallet: z.string().regex(WALLET_REGEX, 'Invalid Solana wallet address'),
  primaryCategory: z.enum(CATEGORY_LIST, {
    errorMap: () => ({ message: `Category must be one of: ${CATEGORY_LIST.join(', ')}` }),
  }),
  bio: z
    .string()
    .min(10, 'Bio must be at least 10 characters')
    .max(500, 'Bio must be under 500 characters'),
  twitter: z
    .string()
    .regex(/^@?[A-Za-z0-9_]{1,15}$/, 'Invalid Twitter handle')
    .optional()
    .transform((val) => (val ? val.replace('@', '') : null)),
  portfolioUrl: z.string().url('Invalid portfolio URL'),
  why: z.string().max(1000, 'Response too long').optional(),
});

export default {
  walletParamSchema,
  listCreatorsQuerySchema,
  categoryParamSchema,
  creatorApplicationSchema,
};
