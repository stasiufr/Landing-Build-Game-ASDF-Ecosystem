/**
 * Type definitions for Creators module
 */

/**
 * @typedef {Object} Creator
 * @property {string} wallet - Solana wallet address (unique identifier)
 * @property {string} displayName - Display name
 * @property {string} avatar - Avatar URL or emoji
 * @property {string} bio - Creator bio
 * @property {string[]} categories - Creator categories
 * @property {CreatorLinks} links - Social links
 * @property {boolean} verified - Verification status
 * @property {boolean} featured - Featured status
 * @property {string} joinedAt - Join date
 * @property {CreatorStats} stats - Creator statistics
 * @property {string} githubIssueUrl - Application issue URL
 */

/**
 * @typedef {Object} CreatorLinks
 * @property {string} [twitter] - Twitter handle
 * @property {string} [github] - GitHub username
 * @property {string} [website] - Website URL
 * @property {string} [youtube] - YouTube channel
 */

/**
 * @typedef {Object} CreatorStats
 * @property {number} challengesWon - Number of challenges won
 * @property {number} totalVotes - Total votes received
 * @property {number} [rating] - Average rating (1-5)
 * @property {number} [reviewCount] - Number of reviews
 */

/**
 * @typedef {Object} CreatorListItem
 * @property {string} wallet - Wallet address
 * @property {string} displayName - Display name
 * @property {string} avatar - Avatar
 * @property {string} primaryCategory - Primary category
 * @property {string} bio - Short bio
 * @property {number} rating - Rating
 * @property {boolean} verified - Verified status
 */

/**
 * @typedef {Object} CategoryInfo
 * @property {string} id - Category ID
 * @property {string} label - Category label
 * @property {string} emoji - Category emoji
 * @property {number} count - Number of creators
 */

export default {};
