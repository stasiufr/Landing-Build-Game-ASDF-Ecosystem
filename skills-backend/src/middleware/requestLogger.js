import logger from '../utils/logger.js';

/**
 * Request logging middleware
 * Logs incoming requests and their completion time
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request start (only in development for verbose logging)
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Request started', {
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      ip: req.ip,
    });
  }

  // Override res.end to log when response is sent
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - startTime;

    // Log request completion
    logger.logRequest(req, duration);

    // Call original end
    return originalEnd.apply(this, args);
  };

  next();
};

/**
 * Request ID middleware
 * Adds a unique ID to each request for tracing
 */
export const requestId = (req, _res, next) => {
  req.id = generateRequestId();
  next();
};

/**
 * Generate a simple request ID
 */
function generateRequestId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

export default {
  requestLogger,
  requestId,
};
