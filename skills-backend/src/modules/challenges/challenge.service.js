import githubService from '../github/github.service.js';
import { GITHUB_LABELS, CHALLENGE_STATUS } from '../../config/constants.js';
import { parseChallengeEntry } from '../github/github.templates.js';
import { NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

/**
 * Challenge Service
 * Business logic for challenges and entries
 */
class ChallengeService {
  /**
   * Get the current active challenge
   * @returns {Promise<Object|null>} Current challenge or null
   */
  async getCurrentChallenge() {
    const issues = await githubService.getIssuesByLabel(GITHUB_LABELS.CHALLENGE_ACTIVE, 'open');

    if (issues.length === 0) {
      return null;
    }

    // Get the most recent active challenge
    const issue = issues[0];
    return this.formatChallenge(issue);
  }

  /**
   * Get challenge by ID (issue number)
   * @param {string} id - Challenge ID
   * @returns {Promise<Object>} Challenge data
   */
  async getChallengeById(id) {
    const issueNumber = parseInt(id, 10);
    const issue = await githubService.getIssueById(issueNumber);

    if (!issue) {
      throw new NotFoundError('Challenge not found', { challengeId: id });
    }

    return this.formatChallenge(issue);
  }

  /**
   * Get entries for a challenge
   * @param {string} challengeId - Challenge ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Entries with pagination
   */
  async getEntriesForChallenge(challengeId, options = {}) {
    const { page = 1, limit = 20, sort = 'votes', category } = options;

    // Get all entry issues
    const issues = await githubService.getIssuesByLabel(GITHUB_LABELS.CHALLENGE_ENTRY, 'all');

    // Parse and filter entries
    let entries = [];
    for (const issue of issues) {
      const parsed = parseChallengeEntry(issue.body);
      if (!parsed) {
        continue;
      }

      // Get vote count
      const voteCount = await githubService.getVoteCount(issue.number);

      const entry = {
        id: String(issue.number),
        challengeId,
        creator: {
          wallet: parsed.wallet,
          name: issue.user.login,
          avatar: issue.user.avatar_url,
        },
        title: parsed.title,
        submissionUrl: parsed.submissionUrl,
        description: parsed.description,
        category: parsed.category,
        submittedAt: issue.created_at,
        voteCount,
        githubUrl: issue.html_url,
      };

      // Filter by category if specified
      if (category && entry.category !== category.toLowerCase()) {
        continue;
      }

      entries.push(entry);
    }

    // Sort entries
    if (sort === 'votes') {
      entries.sort((a, b) => b.voteCount - a.voteCount);
    } else if (sort === 'date') {
      entries.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    } else if (sort === 'random') {
      entries = this.shuffleArray(entries);
    }

    // Paginate
    const total = entries.length;
    const startIndex = (page - 1) * limit;
    const paginatedEntries = entries.slice(startIndex, startIndex + limit);

    return {
      entries: paginatedEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: startIndex + limit < total,
      },
    };
  }

  /**
   * Get challenge history (completed challenges)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} History with pagination
   */
  async getChallengeHistory(options = {}) {
    const { page = 1, limit = 10 } = options;

    const issues = await githubService.getIssuesByLabel(GITHUB_LABELS.CHALLENGE_COMPLETED, 'closed');

    const challenges = await Promise.all(
      issues.map(async (issue) => {
        const challenge = await this.formatChallenge(issue);
        challenge.status = CHALLENGE_STATUS.COMPLETED;
        return challenge;
      })
    );

    // Paginate
    const total = challenges.length;
    const startIndex = (page - 1) * limit;
    const paginatedChallenges = challenges.slice(startIndex, startIndex + limit);

    return {
      challenges: paginatedChallenges,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: startIndex + limit < total,
      },
    };
  }

  /**
   * Get hall of fame (past winners)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Hall of fame entries
   */
  async getHallOfFame(options = {}) {
    const { limit = 10 } = options;

    const issues = await githubService.getIssuesByLabel(GITHUB_LABELS.CHALLENGE_COMPLETED, 'closed');

    const hallOfFame = [];

    for (const issue of issues.slice(0, limit)) {
      // Extract winner from issue (could be in comments or title)
      const winnerComment = await this.findWinnerComment(issue.number);

      if (winnerComment) {
        hallOfFame.push({
          week: this.getWeekNumber(issue.closed_at),
          winner: winnerComment.winner,
          challenge: issue.title,
          prize: this.extractPrize(issue.body),
          timestamp: issue.closed_at,
        });
      }
    }

    return hallOfFame;
  }

  /**
   * Get challenge stats
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Object>} Challenge stats
   */
  async getChallengeStats(challengeId) {
    const entries = await this.getEntriesForChallenge(challengeId, { limit: 1000 });

    const totalVotes = entries.entries.reduce((sum, e) => sum + e.voteCount, 0);

    return {
      entriesCount: entries.pagination.total,
      votesCount: totalVotes,
      topCategories: this.getTopCategories(entries.entries),
    };
  }

  /**
   * Format issue to challenge object
   * @param {Object} issue - GitHub issue
   * @returns {Object} Formatted challenge
   */
  async formatChallenge(issue) {
    const status = this.determineStatus(issue);
    const { title, theme, prizePool, endDate } = this.parseChallengeMeta(issue);

    // Get entry count
    const entries = await githubService.getIssuesByLabel(GITHUB_LABELS.CHALLENGE_ENTRY, 'all');
    const entriesCount = entries.length;

    // Calculate total votes
    let votesCount = 0;
    for (const entry of entries.slice(0, 50)) {
      // Limit to first 50 for performance
      votesCount += await githubService.getVoteCount(entry.number);
    }

    return {
      id: String(issue.number),
      title: title || issue.title,
      description: issue.body?.slice(0, 500) || '',
      theme: theme || 'Weekly Challenge',
      prizePool: prizePool || 50000,
      startDate: issue.created_at,
      endDate: endDate || this.calculateEndDate(issue.created_at),
      status,
      entriesCount,
      votesCount,
      githubUrl: issue.html_url,
    };
  }

  /**
   * Parse challenge metadata from issue body
   * @param {Object} issue - GitHub issue
   * @returns {Object} Parsed metadata
   */
  parseChallengeMeta(issue) {
    const body = issue.body || '';

    // Extract title
    const titleMatch = body.match(/##\s*(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : null;

    // Extract theme
    const themeMatch = body.match(/Theme:\s*(.+)/i);
    const theme = themeMatch ? themeMatch[1].trim() : null;

    // Extract prize pool
    const prizeMatch = body.match(/Prize:\s*(\d+)/i);
    const prizePool = prizeMatch ? parseInt(prizeMatch[1], 10) : null;

    // Extract end date
    const endMatch = body.match(/Ends?:\s*(.+)/i);
    const endDate = endMatch ? new Date(endMatch[1].trim()).toISOString() : null;

    return { title, theme, prizePool, endDate };
  }

  /**
   * Determine challenge status
   * @param {Object} issue - GitHub issue
   * @returns {string} Status
   */
  determineStatus(issue) {
    const labels = issue.labels.map((l) => l.name);

    if (issue.state === 'closed') {
      return CHALLENGE_STATUS.COMPLETED;
    }

    if (labels.includes(GITHUB_LABELS.CHALLENGE_ACTIVE)) {
      return CHALLENGE_STATUS.ACTIVE;
    }

    return CHALLENGE_STATUS.UPCOMING;
  }

  /**
   * Calculate default end date (7 days from start)
   * @param {string} startDate - Start date
   * @returns {string} End date ISO string
   */
  calculateEndDate(startDate) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + 7);
    return date.toISOString();
  }

  /**
   * Find winner comment in issue
   * @param {number} issueNumber - Issue number
   * @returns {Promise<Object|null>} Winner info or null
   */
  async findWinnerComment(issueNumber) {
    try {
      const comments = await githubService.getCommentsForIssue(issueNumber);

      for (const comment of comments) {
        if (comment.body.toLowerCase().includes('winner:')) {
          const winnerMatch = comment.body.match(/winner:\s*@?(\w+)/i);
          if (winnerMatch) {
            return { winner: `@${winnerMatch[1]}` };
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to find winner comment', { issueNumber });
    }

    return null;
  }

  /**
   * Get week number from date
   * @param {string} dateStr - Date string
   * @returns {number} Week number
   */
  getWeekNumber(dateStr) {
    const date = new Date(dateStr);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
  }

  /**
   * Extract prize from challenge body
   * @param {string} body - Issue body
   * @returns {number} Prize amount
   */
  extractPrize(body) {
    const match = body?.match(/(\d+)\s*\$asdfasdfa/i);
    return match ? parseInt(match[1], 10) : 50000;
  }

  /**
   * Get top categories from entries
   * @param {Array} entries - Entries array
   * @returns {Array} Top categories
   */
  getTopCategories(entries) {
    const counts = {};
    for (const entry of entries) {
      counts[entry.category] = (counts[entry.category] || 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));
  }

  /**
   * Shuffle array (Fisher-Yates)
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

const challengeService = new ChallengeService();
export { challengeService, ChallengeService };
export default challengeService;
