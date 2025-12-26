/**
 * Type definitions for GitHub module
 * Using JSDoc for type documentation
 */

/**
 * @typedef {Object} GitHubIssue
 * @property {number} number - Issue number
 * @property {string} title - Issue title
 * @property {string} body - Issue body content
 * @property {string} state - Issue state (open/closed)
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Last update timestamp
 * @property {string} closed_at - Close timestamp (if closed)
 * @property {GitHubUser} user - Issue author
 * @property {GitHubLabel[]} labels - Issue labels
 * @property {GitHubReactions} reactions - Issue reactions
 */

/**
 * @typedef {Object} GitHubUser
 * @property {number} id - User ID
 * @property {string} login - Username
 * @property {string} avatar_url - Avatar URL
 * @property {string} html_url - Profile URL
 */

/**
 * @typedef {Object} GitHubLabel
 * @property {number} id - Label ID
 * @property {string} name - Label name
 * @property {string} color - Label color (hex without #)
 * @property {string} description - Label description
 */

/**
 * @typedef {Object} GitHubReactions
 * @property {number} total_count - Total reactions count
 * @property {number} '+1' - Thumbs up count
 * @property {number} '-1' - Thumbs down count
 * @property {number} laugh - Laugh count
 * @property {number} hooray - Hooray count
 * @property {number} confused - Confused count
 * @property {number} heart - Heart count
 * @property {number} rocket - Rocket count
 * @property {number} eyes - Eyes count
 */

/**
 * @typedef {Object} GitHubComment
 * @property {number} id - Comment ID
 * @property {string} body - Comment body
 * @property {GitHubUser} user - Comment author
 * @property {string} created_at - Creation timestamp
 * @property {string} updated_at - Last update timestamp
 */

/**
 * @typedef {Object} ParsedChallengeEntry
 * @property {string} title - Entry title
 * @property {string} submissionUrl - Submission URL
 * @property {string} description - Entry description
 * @property {string} wallet - Solana wallet address
 * @property {string} category - Entry category
 */

/**
 * @typedef {Object} ParsedCreatorApplication
 * @property {string} displayName - Display name
 * @property {string} wallet - Solana wallet address
 * @property {string} primaryCategory - Primary category
 * @property {string} bio - Creator bio
 * @property {string} [twitter] - Twitter handle
 * @property {string} portfolioUrl - Portfolio URL
 * @property {string} why - Reason for joining
 */

export const IssueTemplateTypes = {
  CHALLENGE_ENTRY: 'challenge-entry',
  CREATOR_APPLICATION: 'creator-application',
};

export default {
  IssueTemplateTypes,
};
