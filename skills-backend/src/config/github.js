import { Octokit } from '@octokit/rest';
import config from './index.js';
import logger from '../utils/logger.js';

// Create Octokit instance
const octokit = new Octokit({
  auth: config.github.token,
  userAgent: 'asdf-skills-api/1.0.0',
  timeZone: 'UTC',
  log: {
    debug: (message) => logger.debug('Octokit debug', { message }),
    info: (message) => logger.info('Octokit info', { message }),
    warn: (message) => logger.warn('Octokit warn', { message }),
    error: (message) => logger.error('Octokit error', { message }),
  },
  throttle: {
    onRateLimit: (retryAfter, options) => {
      logger.warn('GitHub rate limit hit', {
        retryAfter,
        method: options.method,
        url: options.url,
      });
      // Retry once after rate limit
      return options.request.retryCount < 1;
    },
    onSecondaryRateLimit: (retryAfter, options) => {
      logger.warn('GitHub secondary rate limit hit', {
        retryAfter,
        method: options.method,
        url: options.url,
      });
      return false;
    },
  },
});

// Repository info helper
export const repoInfo = {
  owner: config.github.owner,
  repo: config.github.repo,
};

export { octokit };
export default octokit;
