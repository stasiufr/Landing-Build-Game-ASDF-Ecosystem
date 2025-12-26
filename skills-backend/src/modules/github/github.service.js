import { octokit, repoInfo } from '../../config/github.js';
import { cached } from '../../utils/cache.js';
import config from '../../config/index.js';
import { GitHubError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import { parseIssueTemplate, detectTemplateType } from './github.templates.js';

/**
 * GitHub API Service
 * Wraps Octokit with caching and error handling
 */
class GitHubService {
  constructor() {
    this.owner = repoInfo.owner;
    this.repo = repoInfo.repo;
  }

  /**
   * Get issues by label
   * @param {string} label - Label to filter by
   * @param {string} state - Issue state (open/closed/all)
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Array of issues
   */
  async getIssuesByLabel(label, state = 'open', options = {}) {
    const cacheKey = `issues:${label}:${state}:${JSON.stringify(options)}`;

    return cached(
      cacheKey,
      async () => {
        try {
          const response = await octokit.issues.listForRepo({
            owner: this.owner,
            repo: this.repo,
            labels: label,
            state,
            per_page: options.perPage || 100,
            page: options.page || 1,
            sort: options.sort || 'created',
            direction: options.direction || 'desc',
          });

          return response.data;
        } catch (error) {
          logger.error('Failed to fetch issues by label', {
            label,
            error: error.message,
          });
          throw new GitHubError(`Failed to fetch issues: ${error.message}`);
        }
      },
      config.cache.challengesTtl
    );
  }

  /**
   * Get single issue by number
   * @param {number} issueNumber - Issue number
   * @returns {Promise<Object>} Issue data
   */
  async getIssueById(issueNumber) {
    const cacheKey = `issue:${issueNumber}`;

    return cached(
      cacheKey,
      async () => {
        try {
          const response = await octokit.issues.get({
            owner: this.owner,
            repo: this.repo,
            issue_number: issueNumber,
          });

          return response.data;
        } catch (error) {
          if (error.status === 404) {
            return null;
          }
          logger.error('Failed to fetch issue', {
            issueNumber,
            error: error.message,
          });
          throw new GitHubError(`Failed to fetch issue: ${error.message}`);
        }
      },
      config.cache.challengesTtl
    );
  }

  /**
   * Create a new issue
   * @param {string} title - Issue title
   * @param {string} body - Issue body
   * @param {string[]} labels - Issue labels
   * @returns {Promise<Object>} Created issue
   */
  async createIssue(title, body, labels = []) {
    try {
      const response = await octokit.issues.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        labels,
      });

      logger.info('Issue created', { issueNumber: response.data.number });
      return response.data;
    } catch (error) {
      logger.error('Failed to create issue', { error: error.message });
      throw new GitHubError(`Failed to create issue: ${error.message}`);
    }
  }

  /**
   * Close an issue
   * @param {number} issueNumber - Issue number
   * @returns {Promise<Object>} Updated issue
   */
  async closeIssue(issueNumber) {
    try {
      const response = await octokit.issues.update({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        state: 'closed',
      });

      logger.info('Issue closed', { issueNumber });
      return response.data;
    } catch (error) {
      logger.error('Failed to close issue', {
        issueNumber,
        error: error.message,
      });
      throw new GitHubError(`Failed to close issue: ${error.message}`);
    }
  }

  /**
   * Get reactions for an issue
   * @param {number} issueNumber - Issue number
   * @returns {Promise<Array>} Array of reactions
   */
  async getReactionsForIssue(issueNumber) {
    const cacheKey = `reactions:${issueNumber}`;

    return cached(
      cacheKey,
      async () => {
        try {
          const response = await octokit.reactions.listForIssue({
            owner: this.owner,
            repo: this.repo,
            issue_number: issueNumber,
            per_page: 100,
          });

          return response.data;
        } catch (error) {
          logger.error('Failed to fetch reactions', {
            issueNumber,
            error: error.message,
          });
          throw new GitHubError(`Failed to fetch reactions: ${error.message}`);
        }
      },
      config.cache.challengesTtl / 2 // Shorter TTL for votes
    );
  }

  /**
   * Get vote count (thumbs up reactions) for an issue
   * @param {number} issueNumber - Issue number
   * @returns {Promise<number>} Vote count
   */
  async getVoteCount(issueNumber) {
    const reactions = await this.getReactionsForIssue(issueNumber);
    return reactions.filter((r) => r.content === '+1').length;
  }

  /**
   * Get comments for an issue
   * @param {number} issueNumber - Issue number
   * @returns {Promise<Array>} Array of comments
   */
  async getCommentsForIssue(issueNumber) {
    const cacheKey = `comments:${issueNumber}`;

    return cached(
      cacheKey,
      async () => {
        try {
          const response = await octokit.issues.listComments({
            owner: this.owner,
            repo: this.repo,
            issue_number: issueNumber,
            per_page: 100,
          });

          return response.data;
        } catch (error) {
          logger.error('Failed to fetch comments', {
            issueNumber,
            error: error.message,
          });
          throw new GitHubError(`Failed to fetch comments: ${error.message}`);
        }
      },
      config.cache.challengesTtl
    );
  }

  /**
   * Add comment to an issue
   * @param {number} issueNumber - Issue number
   * @param {string} body - Comment body
   * @returns {Promise<Object>} Created comment
   */
  async addComment(issueNumber, body) {
    try {
      const response = await octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body,
      });

      logger.info('Comment added', {
        issueNumber,
        commentId: response.data.id,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to add comment', {
        issueNumber,
        error: error.message,
      });
      throw new GitHubError(`Failed to add comment: ${error.message}`);
    }
  }

  /**
   * Add label to an issue
   * @param {number} issueNumber - Issue number
   * @param {string[]} labels - Labels to add
   * @returns {Promise<Array>} Updated labels
   */
  async addLabels(issueNumber, labels) {
    try {
      const response = await octokit.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        labels,
      });

      logger.info('Labels added', { issueNumber, labels });
      return response.data;
    } catch (error) {
      logger.error('Failed to add labels', {
        issueNumber,
        error: error.message,
      });
      throw new GitHubError(`Failed to add labels: ${error.message}`);
    }
  }

  /**
   * Parse issue content based on detected template
   * @param {Object} issue - GitHub issue object
   * @returns {Object|null} Parsed data or null
   */
  parseIssue(issue) {
    const templateType = detectTemplateType(issue.labels);
    if (!templateType) {
      return null;
    }

    return {
      type: templateType,
      data: parseIssueTemplate(issue.body, templateType),
      issue: {
        number: issue.number,
        url: issue.html_url,
        createdAt: issue.created_at,
        author: {
          login: issue.user.login,
          avatar: issue.user.avatar_url,
        },
      },
    };
  }

  /**
   * Get repository info
   * @returns {Promise<Object>} Repository data
   */
  async getRepoInfo() {
    const cacheKey = 'repo:info';

    return cached(
      cacheKey,
      async () => {
        try {
          const response = await octokit.repos.get({
            owner: this.owner,
            repo: this.repo,
          });

          return response.data;
        } catch (error) {
          logger.error('Failed to fetch repo info', { error: error.message });
          throw new GitHubError(`Failed to fetch repo info: ${error.message}`);
        }
      },
      config.cache.creatorsTtl
    );
  }
}

// Export singleton instance
const githubService = new GitHubService();
export { githubService, GitHubService };
export default githubService;
