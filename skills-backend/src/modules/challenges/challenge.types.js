/**
 * Type definitions for Challenges module
 */

/**
 * @typedef {Object} Challenge
 * @property {string} id - Challenge ID (issue number)
 * @property {string} title - Challenge title
 * @property {string} description - Challenge description
 * @property {string} theme - Challenge theme
 * @property {number} prizePool - Prize pool amount
 * @property {string} startDate - Start date ISO string
 * @property {string} endDate - End date ISO string
 * @property {ChallengeStatus} status - Challenge status
 * @property {number} entriesCount - Number of entries
 * @property {number} votesCount - Total votes
 * @property {Entry} [winner] - Winner (if completed)
 * @property {string} githubUrl - GitHub issue URL
 */

/**
 * @typedef {'upcoming'|'active'|'voting'|'completed'} ChallengeStatus
 */

/**
 * @typedef {Object} Entry
 * @property {string} id - Entry ID (issue number)
 * @property {string} challengeId - Parent challenge ID
 * @property {CreatorInfo} creator - Creator info
 * @property {string} title - Entry title
 * @property {string} submissionUrl - Submission URL
 * @property {string} description - Entry description
 * @property {string} category - Entry category
 * @property {string} submittedAt - Submission date
 * @property {number} voteCount - Vote count
 * @property {string} githubUrl - GitHub issue URL
 */

/**
 * @typedef {Object} CreatorInfo
 * @property {string} wallet - Wallet address
 * @property {string} name - Display name
 * @property {string} [avatar] - Avatar URL or emoji
 */

/**
 * @typedef {Object} HallOfFameEntry
 * @property {number} week - Week number
 * @property {string} winner - Winner username
 * @property {string} challenge - Challenge title
 * @property {number} [prize] - Prize amount
 * @property {string} timestamp - Win date
 */

export const ChallengeStatusValues = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  VOTING: 'voting',
  COMPLETED: 'completed',
};

export default {
  ChallengeStatusValues,
};
