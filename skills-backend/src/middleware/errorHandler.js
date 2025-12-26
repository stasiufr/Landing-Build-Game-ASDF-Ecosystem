import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import { ERROR_CODES } from '../config/constants.js';

/**
 * Not found handler - 404
 */
export const notFoundHandler = (req, _res, next) => {
  const error = new AppError(`Route not found: ${req.method} ${req.path}`, ERROR_CODES.NOT_FOUND, 404);
  next(error);
};

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, _next) => {
  // Log the error
  logger.logError(err, req);

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', err.errors);
  }

  // Handle operational errors (our AppError instances)
  if (err instanceof AppError && err.isOperational) {
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  // Handle syntax errors (bad JSON)
  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'Invalid JSON in request body');
  }

  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return sendError(res, 403, ERROR_CODES.FORBIDDEN, 'CORS policy violation');
  }

  // Handle GitHub API errors
  if (err.status && err.response?.data?.message) {
    const statusCode = err.status >= 400 && err.status < 600 ? err.status : 502;
    return sendError(
      res,
      statusCode,
      ERROR_CODES.GITHUB_ERROR,
      err.response.data.message,
      config.isDevelopment ? { originalError: err.message } : null
    );
  }

  // Unknown/unexpected errors - don't expose details in production
  const message = config.isProduction ? 'An unexpected error occurred' : err.message;

  const details = config.isProduction
    ? null
    : {
        name: err.name,
        stack: err.stack?.split('\n').slice(0, 5),
      };

  return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, message, details);
};

/**
 * Async handler wrapper to catch errors in async routes
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default {
  notFoundHandler,
  errorHandler,
  asyncHandler,
};
