import { ERROR_CODES } from '../config/constants.js';

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(message, code = ERROR_CODES.INTERNAL_ERROR, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 - Validation Error
 */
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400, details);
  }
}

/**
 * 404 - Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = null) {
    super(message, ERROR_CODES.NOT_FOUND, 404, details);
  }
}

/**
 * 401 - Unauthorized Error
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details = null) {
    super(message, ERROR_CODES.UNAUTHORIZED, 401, details);
  }
}

/**
 * 403 - Forbidden Error
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', details = null) {
    super(message, ERROR_CODES.FORBIDDEN, 403, details);
  }
}

/**
 * 429 - Rate Limited Error
 */
export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests', details = null) {
    super(message, ERROR_CODES.RATE_LIMITED, 429, details);
  }
}

/**
 * GitHub API Error
 */
export class GitHubError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.GITHUB_ERROR, 502, details);
  }
}
