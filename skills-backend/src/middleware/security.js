import helmet from 'helmet';
import cors from 'cors';
import config from '../config/index.js';

/**
 * Helmet security middleware with strict CSP
 */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.github.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: config.isProduction ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

/**
 * CORS middleware
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // In production, require Origin header for non-GET requests (CSRF protection)
    // Allow requests with no origin only in development or for safe methods
    if (!origin) {
      if (config.isDevelopment) {
        return callback(null, true);
      }
      // In production, allow no-origin only if explicitly configured
      if (process.env.ALLOW_NO_ORIGIN === 'true') {
        return callback(null, true);
      }
      // For production, reject requests without Origin (except for health checks handled separately)
      return callback(new Error('Origin header required'));
    }

    const allowedOrigins = config.cors.origin;

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow localhost variants (strict regex to prevent bypass)
    if (config.isDevelopment && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
});

/**
 * Additional security headers
 */
export const additionalSecurityHeaders = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};

/**
 * Sanitize request body - remove potentially dangerous content
 */
export const sanitizeInput = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
};

/**
 * Recursively sanitize object values
 */
function sanitizeObject(obj, depth = 0) {
  if (depth > 10) {
    return obj; // Prevent infinite recursion
  }

  if (Array.isArray(obj)) {
    return obj.slice(0, 100).map((item) => sanitizeObject(item, depth + 1));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    const keys = Object.keys(obj).slice(0, 50);

    for (const key of keys) {
      sanitized[sanitizeString(key)] = sanitizeObject(obj[key], depth + 1);
    }

    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  return obj;
}

/**
 * Sanitize string value
 * Comprehensive XSS prevention covering OWASP recommendations
 */
function sanitizeString(str) {
  if (typeof str !== 'string') {
    return str;
  }

  // Limit length
  const limited = str.slice(0, 1000);

  // Remove potential XSS vectors - comprehensive patterns
  return limited
    // Remove all HTML tags (not just script)
    .replace(/<[^>]*>/g, '')
    // Remove javascript: protocol
    .replace(/javascript\s*:/gi, '')
    // Remove vbscript: protocol
    .replace(/vbscript\s*:/gi, '')
    // Remove data: protocol (can contain scripts)
    .replace(/data\s*:/gi, '')
    // Remove event handlers (onclick, onerror, onload, etc.)
    .replace(/on\w+\s*=/gi, '')
    // Remove expression() CSS
    .replace(/expression\s*\(/gi, '')
    // Remove url() in potentially dangerous contexts
    .replace(/url\s*\(/gi, '')
    // Remove XML/HTML entities that could be used for encoding attacks
    .replace(/&#/g, '')
    // Remove null bytes
    .replace(/\x00/g, '')
    // Trim whitespace
    .trim();
}

/**
 * HTTPS redirect middleware for production
 * Redirects HTTP requests to HTTPS
 */
export const httpsRedirect = (req, res, next) => {
  // Skip in development
  if (config.isDevelopment) {
    return next();
  }

  // Check if request is already HTTPS
  // x-forwarded-proto is set by reverse proxies (nginx, cloudflare, etc.)
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

  if (!isHttps) {
    // Redirect to HTTPS
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }

  next();
};

/**
 * CSRF protection middleware
 * Requires X-Requested-With header for state-changing requests
 * This prevents simple CSRF attacks as browsers don't send custom headers cross-origin
 */
export const csrfProtection = (req, res, next) => {
  // Skip for safe methods (GET, HEAD, OPTIONS)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip in development if explicitly disabled
  if (config.isDevelopment && process.env.DISABLE_CSRF === 'true') {
    return next();
  }

  // Require X-Requested-With header for state-changing requests
  // Browsers don't send custom headers on cross-origin requests without CORS preflight
  const requestedWith = req.headers['x-requested-with'];
  if (!requestedWith || requestedWith.toLowerCase() !== 'xmlhttprequest') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_VALIDATION_FAILED',
        message: 'Missing or invalid X-Requested-With header',
      },
    });
  }

  // Additional check: verify Origin or Referer matches allowed origins
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const allowedOrigins = config.cors.origin;

  if (origin) {
    if (!allowedOrigins.includes(origin)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_ORIGIN_MISMATCH',
          message: 'Request origin not allowed',
        },
      });
    }
  } else if (referer && config.isProduction) {
    // In production, check referer if origin is not present
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      if (!allowedOrigins.includes(refererOrigin)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'CSRF_REFERER_MISMATCH',
            message: 'Request referer not allowed',
          },
        });
      }
    } catch {
      // Invalid referer URL
      return res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_INVALID_REFERER',
          message: 'Invalid referer header',
        },
      });
    }
  }

  next();
};
