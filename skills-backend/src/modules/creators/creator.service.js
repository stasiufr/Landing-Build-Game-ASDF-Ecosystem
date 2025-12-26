import githubService from '../github/github.service.js';
import { GITHUB_LABELS, CATEGORY_LIST, CATEGORY_LABELS } from '../../config/constants.js';
import { parseCreatorApplication } from '../github/github.templates.js';
import { NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

/**
 * Creator Service
 * Business logic for creator profiles
 */
class CreatorService {
  /**
   * Get all creators with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Creators with pagination
   */
  async getCreators(options = {}) {
    const {
      page = 1,
      limit = 20,
      category,
      sort = 'rating',
      verified,
      featured,
      search,
    } = options;

    // Get verified creator issues
    const issues = await githubService.getIssuesByLabel(GITHUB_LABELS.CREATOR_VERIFIED, 'all');

    // Parse and transform creators
    let creators = [];
    for (const issue of issues) {
      const parsed = parseCreatorApplication(issue.body);
      if (!parsed) {
        continue;
      }

      const creator = await this.formatCreator(issue, parsed);
      creators.push(creator);
    }

    // Apply filters
    if (category && category !== 'all') {
      creators = creators.filter((c) =>
        c.categories.map((cat) => cat.toLowerCase()).includes(category.toLowerCase())
      );
    }

    if (verified !== undefined) {
      creators = creators.filter((c) => c.verified === verified);
    }

    if (featured !== undefined) {
      creators = creators.filter((c) => c.featured === featured);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      creators = creators.filter(
        (c) =>
          c.displayName.toLowerCase().includes(searchLower) ||
          c.bio.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    creators = this.sortCreators(creators, sort);

    // Paginate
    const total = creators.length;
    const startIndex = (page - 1) * limit;
    const paginatedCreators = creators.slice(startIndex, startIndex + limit);

    return {
      creators: paginatedCreators,
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
   * Get creator by wallet address
   * @param {string} wallet - Wallet address
   * @returns {Promise<Object>} Creator profile
   */
  async getCreatorByWallet(wallet) {
    const issues = await githubService.getIssuesByLabel(GITHUB_LABELS.CREATOR_VERIFIED, 'all');

    for (const issue of issues) {
      const parsed = parseCreatorApplication(issue.body);
      if (parsed && parsed.wallet.toLowerCase() === wallet.toLowerCase()) {
        return this.formatCreator(issue, parsed, true);
      }
    }

    throw new NotFoundError('Creator not found', { wallet });
  }

  /**
   * Get all categories with creator counts
   * @returns {Promise<Array>} Categories with counts
   */
  async getCategories() {
    const issues = await githubService.getIssuesByLabel(GITHUB_LABELS.CREATOR_VERIFIED, 'all');

    const counts = {};
    for (const category of CATEGORY_LIST) {
      counts[category] = 0;
    }

    for (const issue of issues) {
      const parsed = parseCreatorApplication(issue.body);
      if (parsed && parsed.primaryCategory) {
        const cat = parsed.primaryCategory.toLowerCase();
        if (counts[cat] !== undefined) {
          counts[cat]++;
        }
      }
    }

    return CATEGORY_LIST.map((id) => ({
      id,
      label: CATEGORY_LABELS[id]?.label || id,
      emoji: CATEGORY_LABELS[id]?.emoji || '',
      count: counts[id],
    }));
  }

  /**
   * Get creators by category
   * @param {string} category - Category ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Creators with pagination
   */
  async getCreatorsByCategory(category, options = {}) {
    return this.getCreators({ ...options, category });
  }

  /**
   * Get featured creators
   * @param {number} limit - Max number to return
   * @returns {Promise<Array>} Featured creators
   */
  async getFeaturedCreators(limit = 6) {
    const issues = await githubService.getIssuesByLabel(GITHUB_LABELS.CREATOR_FEATURED, 'open');

    const creators = [];
    for (const issue of issues.slice(0, limit)) {
      const parsed = parseCreatorApplication(issue.body);
      if (parsed) {
        creators.push(await this.formatCreator(issue, parsed));
      }
    }

    return creators;
  }

  /**
   * Format issue and parsed data into creator object
   * @param {Object} issue - GitHub issue
   * @param {Object} parsed - Parsed application data
   * @param {boolean} detailed - Include detailed stats
   * @returns {Promise<Object>} Formatted creator
   */
  async formatCreator(issue, parsed, detailed = false) {
    const labels = issue.labels.map((l) => l.name);
    const verified = labels.includes(GITHUB_LABELS.CREATOR_VERIFIED);
    const featured = labels.includes(GITHUB_LABELS.CREATOR_FEATURED);

    const creator = {
      wallet: parsed.wallet,
      displayName: parsed.displayName,
      avatar: this.getAvatarForCategory(parsed.primaryCategory),
      bio: parsed.bio,
      categories: [parsed.primaryCategory],
      links: {
        twitter: parsed.twitter ? `https://twitter.com/${parsed.twitter}` : null,
        portfolio: parsed.portfolioUrl,
      },
      verified,
      featured,
      joinedAt: issue.created_at,
      rating: this.calculateRating(issue),
      githubIssueUrl: issue.html_url,
    };

    if (detailed) {
      // Get additional stats for detailed view
      creator.stats = await this.getCreatorStats(parsed.wallet);
      creator.why = parsed.why;
    }

    return creator;
  }

  /**
   * Get creator statistics
   * @param {string} wallet - Wallet address
   * @returns {Promise<Object>} Creator stats
   */
  async getCreatorStats(wallet) {
    // Get entries by this creator
    const entries = await githubService.getIssuesByLabel(GITHUB_LABELS.CHALLENGE_ENTRY, 'all');

    let challengesWon = 0;
    let totalVotes = 0;

    for (const entry of entries) {
      const body = entry.body || '';
      if (body.toLowerCase().includes(wallet.toLowerCase())) {
        const voteCount = await githubService.getVoteCount(entry.number);
        totalVotes += voteCount;

        // Check if winner (has specific label or comment)
        const labels = entry.labels.map((l) => l.name);
        if (labels.includes('winner')) {
          challengesWon++;
        }
      }
    }

    return {
      challengesWon,
      totalVotes,
      entriesSubmitted: entries.filter((e) =>
        e.body?.toLowerCase().includes(wallet.toLowerCase())
      ).length,
    };
  }

  /**
   * Calculate rating from issue reactions
   * @param {Object} issue - GitHub issue
   * @returns {number} Rating (1-5)
   */
  calculateRating(issue) {
    const reactions = issue.reactions || {};
    const positive = (reactions['+1'] || 0) + (reactions.heart || 0) + (reactions.rocket || 0);
    const negative = reactions['-1'] || 0;

    if (positive === 0 && negative === 0) {
      return 4.5; // Default rating
    }

    const total = positive + negative;
    const ratio = positive / total;

    // Scale to 1-5
    return Math.round((ratio * 4 + 1) * 10) / 10;
  }

  /**
   * Get avatar emoji for category
   * @param {string} category - Category ID
   * @returns {string} Avatar emoji
   */
  getAvatarForCategory(category) {
    return CATEGORY_LABELS[category?.toLowerCase()]?.emoji || '🎯';
  }

  /**
   * Sort creators by field
   * @param {Array} creators - Creators array
   * @param {string} sort - Sort field
   * @returns {Array} Sorted creators
   */
  sortCreators(creators, sort) {
    switch (sort) {
      case 'rating':
        return creators.sort((a, b) => b.rating - a.rating);
      case 'name':
        return creators.sort((a, b) => a.displayName.localeCompare(b.displayName));
      case 'newest':
        return creators.sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));
      case 'votes':
        return creators.sort((a, b) => (b.stats?.totalVotes || 0) - (a.stats?.totalVotes || 0));
      default:
        return creators;
    }
  }
}

const creatorService = new CreatorService();
export { creatorService, CreatorService };
export default creatorService;
