import dotenv from 'dotenv';

dotenv.config();

const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // Server
  port: parseInt(process.env.PORT, 10) || 3001,
  apiPrefix: process.env.API_PREFIX || '/api',

  // GitHub
  github: {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER || 'your-org',
    repo: process.env.GITHUB_REPO || 'asdf-skills',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    sensitiveMax: parseInt(process.env.RATE_LIMIT_SENSITIVE_MAX, 10) || 10,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : ['http://localhost:3000', 'http://localhost:5500'],
    credentials: true,
  },

  // Cache TTL (milliseconds)
  cache: {
    challengesTtl: parseInt(process.env.CACHE_TTL_CHALLENGES, 10) || 300000, // 5 min
    creatorsTtl: parseInt(process.env.CACHE_TTL_CREATORS, 10) || 900000, // 15 min
  },
};

// Validate required env vars in production
if (config.isProduction) {
  const required = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export default config;
