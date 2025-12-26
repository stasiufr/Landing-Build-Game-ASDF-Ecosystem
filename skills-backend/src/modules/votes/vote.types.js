/**
 * Type definitions for Votes module
 */

/**
 * @typedef {Object} VoteInfo
 * @property {string} entryId - Entry issue number
 * @property {number} voteCount - Total votes (thumbs up)
 * @property {string} lastUpdated - Last update timestamp
 */

/**
 * @typedef {Object} LeaderboardEntry
 * @property {number} rank - Ranking position
 * @property {string} entryId - Entry ID
 * @property {string} title - Entry title
 * @property {string} creatorName - Creator name
 * @property {string} creatorWallet - Creator wallet
 * @property {number} voteCount - Vote count
 * @property {string} category - Entry category
 * @property {string} submittedAt - Submission date
 */

/**
 * @typedef {Object} VoterInfo
 * @property {string} username - GitHub username
 * @property {string} avatar - Avatar URL
 * @property {string} votedAt - Vote timestamp
 */

export default {};
