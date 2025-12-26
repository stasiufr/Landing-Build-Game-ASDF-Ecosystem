import express from 'express';
import config from './config/index.js';
import {
  helmetMiddleware,
  corsMiddleware,
  additionalSecurityHeaders,
  sanitizeInput,
  httpsRedirect,
  csrfProtection,
} from './middleware/security.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { requestLogger, requestId } from './middleware/requestLogger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

// Import routes (will be added in later phases)
import challengeRoutes from './modules/challenges/challenge.routes.js';
import creatorRoutes from './modules/creators/creator.routes.js';
import voteRoutes from './modules/votes/vote.routes.js';

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// HTTPS redirect in production (must be first)
app.use(httpsRedirect);

// Security middleware
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(additionalSecurityHeaders);

// Request parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sanitization
app.use(sanitizeInput);

// CSRF protection for state-changing requests
app.use(csrfProtection);

// Request logging and ID
app.use(requestId);
app.use(requestLogger);

// Rate limiting (applied globally)
app.use(config.apiPrefix, apiLimiter);

// Health check (no rate limit)
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    },
  });
});

// API Routes
app.use(`${config.apiPrefix}/challenges`, challengeRoutes);
app.use(`${config.apiPrefix}/creators`, creatorRoutes);
app.use(`${config.apiPrefix}/votes`, voteRoutes);

// API info endpoint
app.get(config.apiPrefix, (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'ASDF Skills API',
      version: '1.0.0',
      description: 'Backend API for ASDF Skills Marketplace',
      endpoints: {
        challenges: `${config.apiPrefix}/challenges`,
        creators: `${config.apiPrefix}/creators`,
        votes: `${config.apiPrefix}/votes`,
      },
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
