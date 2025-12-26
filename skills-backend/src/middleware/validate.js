import { ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

/**
 * Validation middleware factory for Zod schemas
 *
 * @param {object} schemas - Object containing body, query, and/or params schemas
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/users/:id',
 *   validate({
 *     params: z.object({ id: z.string().min(1) }),
 *     query: z.object({ include: z.string().optional() })
 *   }),
 *   controller.getUser
 * );
 */
export function validate(schemas) {
  return async (req, _res, next) => {
    try {
      const errors = [];

      // Validate params
      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'params'));
        } else {
          req.params = result.data;
        }
      }

      // Validate query
      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'query'));
        } else {
          req.query = result.data;
        }
      }

      // Validate body
      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          errors.push(...formatZodErrors(result.error, 'body'));
        } else {
          req.body = result.data;
        }
      }

      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        next(error);
      } else if (error instanceof ZodError) {
        next(new ValidationError('Validation failed', formatZodErrors(error, 'unknown')));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Format Zod errors into a consistent structure
 *
 * @param {ZodError} zodError - Zod validation error
 * @param {string} source - Source of validation (body, query, params)
 * @returns {Array} Formatted error array
 */
function formatZodErrors(zodError, source) {
  return zodError.errors.map((err) => ({
    source,
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Pagination query params
  pagination: (z) =>
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),

  // Sort query params
  sort: (z, allowedFields) =>
    z.object({
      sortBy: z.enum(allowedFields).optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),

  // ID param
  id: (z) =>
    z.object({
      id: z.string().min(1),
    }),

  // Wallet address
  wallet: (z) =>
    z.object({
      wallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid wallet address'),
    }),
};

export default validate;
