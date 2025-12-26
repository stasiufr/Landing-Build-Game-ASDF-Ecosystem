import githubService from '../github/github.service.js';
import { GITHUB_LABELS } from '../../config/constants.js';
import { parseChallengeEntry } from '../github/github.templates.js';
import { NotFoundError } from '../../utils/errors.js';
import { cached } from '../../utils/cache.js';
import config from '../../config/index.js';

/**
 * Vote Service
 * Business logic for vote aggregation and leaderboards
 */
class VoteService {
  /**
   * Get votes for a specific entry
   * @param {string} entryId - Entry issue number
   * @returns {Promise<Object>} Vote info
   */
  async getVotesForEntry(entryId) {
    const issueNumber = parseInt(entryId, 10);
    const issue = await githubService.getIssueById(issueNumber);

    if (!issue) {
      throw new NotFoundError('Entry not found', { entryId });
    }

    const reactions = await githubService.getReactionsForIssue(issueNumber);
    const votes = reactions.filter((r) => r.content === '+1');

    return {
      entryId,
      voteCount: votes.length,
      voters: votes.map((v) => ({
        username: v.user.login,
        avatar: v.user.avatar_url,
        votedAt: v.created_at,
      })),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get leaderboard for a challenge
   * @param {string} challengeId - Challenge ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Leaderboard with pagination
   */
  async getLeaderboard(challengeId, options = {}) {
    const { page = 1, limit = 20, category } = options;

    const cacheKey = `leaderboard:${challengeId}:${category || 'all'}`;

    const entries = await cached(
      cacheKey,
      async () => {
        // Get all entries
        const issues = await githubService.getIssuesByLabel(
          GITHUB_LABELS.CHALLENGE_ENTRY,
          'all'
        );

        const entriesWithVotes = [];

        for (const issue of issues) {
          const parsed = parseChallengeEntry(issue.body);
          if (!parsed) {
            continue;
          }

          // Filter by category if specified
          if (category && parsed.category.toLowerCase() !== category.toLowerCase()) {
            continue;
          }

          const voteCount = await githubService.getVoteCount(issue.number);

          entriesWithVotes.push({
            entryId: String(issue.number),
            title: parsed.title,
            creatorName: issue.user.login,
            creatorWallet: parsed.wallet,
            voteCount,
            category: parsed.category,
            submittedAt: issue.created_at,
            githubUrl: issue.html_url,
          });
        }

        // Sort by votes descending
        return entriesWithVotes.sort((a, b) => b.voteCount - a.voteCount);
      },
      config.cache.challengesTtl / 2 // Shorter TTL for leaderboard
    );

    // Add rankings
    const rankedEntries = entries.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    // Paginate
    const total = rankedEntries.length;
    const startIndex = (page - 1) * limit;
    const paginatedEntries = rankedEntries.slice(startIndex, startIndex + limit);

    return {
      leaderboard: paginatedEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: startIndex + limit < total,
      },
      stats: {
        totalEntries: total,
        totalVotes: entries.reduce((sum, e) => sum + e.voteCount, 0),
        topVotes: entries[0]?.voteCount || 0,
      },
    };
  }

  /**
   * Get top entries (quick leaderboard)
   * @param {string} challengeId - Challenge ID
   * @param {number} limit - Number of entries
   * @returns {Promise<Array>} Top entries
   */
  async getTopEntries(challengeId, limit = 5) {
    const result = await this.getLeaderboard(challengeId, { limit });
    return result.leaderboard;
  }

  /**
   * Get vote statistics for a challenge
   * @param {string} challengeId - Challenge ID
   * @returns {Promise<Object>} Vote statistics
   */
  async getVoteStats(challengeId) {
    const result = await this.getLeaderboard(challengeId, { limit: 1000 });

    const voteCounts = result.leaderboard.map((e) => e.voteCount);
    const total = voteCounts.reduce((sum, v) => sum + v, 0);

    return {
      totalVotes: total,
      totalEntries: result.pagination.total,
      averageVotes: total / result.pagination.total || 0,
      maxVotes: Math.max(...voteCounts, 0),
      minVotes: Math.min(...voteCounts, 0),
      distribution: this.calculateDistribution(voteCounts),
    };
  }

  /**
   * Calculate vote distribution
   * @param {number[]} voteCounts - Array of vote counts
   * @returns {Object} Distribution by ranges
   */
  calculateDistribution(voteCounts) {
    const ranges = {
      '0': 0,
      '1-5': 0,
      '6-10': 0,
      '11-20': 0,
      '21-50': 0,
      '50+': 0,
    };

    for (const count of voteCounts) {
      if (count === 0) {
        ranges['0']++;
      } else if (count <= 5) {
        ranges['1-5']++;
      } else if (count <= 10) {
        ranges['6-10']++;
      } else if (count <= 20) {
        ranges['11-20']++;
      } else if (count <= 50) {
        ranges['21-50']++;
      } else {
        ranges['50+']++;
      }
    }

    return ranges;
  }

  /**
   * Check if entry exists
   * @param {string} entryId - Entry ID
   * @returns {Promise<boolean>} Entry exists
   */
  async entryExists(entryId) {
    try {
      const issue = await githubService.getIssueById(parseInt(entryId, 10));
      return issue !== null;
    } catch {
      return false;
    }
  }
}

const voteService = new VoteService();
export { voteService, VoteService };
export default voteService;
