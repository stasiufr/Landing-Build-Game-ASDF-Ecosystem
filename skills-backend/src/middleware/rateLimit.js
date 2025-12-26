import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import { ERROR_CODES } from '../config/constants.js';

/**
 * Create rate limiter with custom options
 */
function createLimiter(options) {
  return rateLimit({
    windowMs: options.windowMs || config.rateLimit.windowMs,
    max: options.max || config.rateLimit.maxRequests,
    message: {
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message: options.message || 'Too many requests, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use wallet address if available, otherwise IP
      return req.headers['x-wallet-address'] || req.ip;
    },
    skip: (_req) => {
      // Skip rate limiting in test environment
      return process.env.NODE_ENV === 'test';
    },
    handler: (_req, res, _next, options) => {
      res.status(429).json(options.message);
    },
  });
}

/**
 * General API rate limiter
 * 100 requests per minute
 */
export const apiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: config.rateLimit.maxRequests,
  message: 'Too many API requests, please slow down',
});

/**
 * Strict rate limiter for sensitive endpoints
 * 10 requests per minute
 */
export const strictLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: config.rateLimit.sensitiveMax,
  message: 'Rate limit exceeded for this action',
});

/**
 * Very strict limiter for submissions
 * 5 requests per 5 minutes
 */
export const submissionLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: 'Too many submissions, please wait before trying again',
});

export default {
  apiLimiter,
  strictLimiter,
  submissionLimiter,
};
