import { z } from 'zod';
import { CATEGORY_LIST, PAGINATION } from '../../config/constants.js';

/**
 * Validation schemas for Challenges module
 */

// Challenge ID param
export const challengeIdSchema = z.object({
  id: z.string().min(1, 'Challenge ID is required'),
});

// Entry ID param
export const entryIdSchema = z.object({
  entryId: z.string().min(1, 'Entry ID is required'),
});

// List entries query params
export const listEntriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  sort: z.enum(['votes', 'date', 'random']).default('votes'),
  category: z.string().optional(),
});

// History query params
export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// Submit entry body (for future use with direct API submission)
export const submitEntrySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  submissionUrl: z.string().url('Invalid submission URL'),
  description: z.string().max(1000, 'Description too long').optional(),
  wallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana wallet address'),
  category: z.enum(CATEGORY_LIST, {
    errorMap: () => ({ message: `Category must be one of: ${CATEGORY_LIST.join(', ')}` }),
  }),
});

export default {
  challengeIdSchema,
  entryIdSchema,
  listEntriesQuerySchema,
  historyQuerySchema,
  submitEntrySchema,
};
