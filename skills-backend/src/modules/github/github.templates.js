import { IssueTemplateTypes } from './github.types.js';

/**
 * Parse GitHub Issue body based on template type
 * Extracts structured data from issue templates
 */

/**
 * Field patterns for parsing YAML-style issue templates
 */
const FIELD_PATTERNS = {
  // Challenge Entry fields
  title: /###\s*Entry Title\s*\n\n([^\n]+)/i,
  submissionUrl: /###\s*Submission URL\s*\n\n([^\n]+)/i,
  description: /###\s*Description\s*\n\n([\s\S]*?)(?=\n###|$)/i,
  wallet: /###\s*Solana Wallet\s*\n\n([^\n]+)/i,
  category: /###\s*Category\s*\n\n([^\n]+)/i,

  // Creator Application fields
  displayName: /###\s*Display Name\s*\n\n([^\n]+)/i,
  primaryCategory: /###\s*Primary Category\s*\n\n([^\n]+)/i,
  bio: /###\s*Bio\s*\n\n([\s\S]*?)(?=\n###|$)/i,
  twitter: /###\s*Twitter\/X\s*\n\n([^\n]*)/i,
  portfolioUrl: /###\s*Portfolio\/Proof of Work\s*\n\n([^\n]+)/i,
  why: /###\s*Why do you want to join\?\s*\n\n([\s\S]*?)(?=\n###|$)/i,
};

/**
 * Extract field value from issue body
 * @param {string} body - Issue body
 * @param {string} fieldName - Field name to extract
 * @returns {string|null} Extracted value or null
 */
function extractField(body, fieldName) {
  const pattern = FIELD_PATTERNS[fieldName];
  if (!pattern) {
    return null;
  }

  const match = body.match(pattern);
  if (!match || !match[1]) {
    return null;
  }

  const value = match[1].trim();

  // Check for empty/placeholder values
  if (!value || value === '_No response_' || value === 'None') {
    return null;
  }

  return value;
}

/**
 * Parse challenge entry from issue body
 * @param {string} body - Issue body
 * @returns {import('./github.types.js').ParsedChallengeEntry|null}
 */
export function parseChallengeEntry(body) {
  if (!body) {
    return null;
  }

  const title = extractField(body, 'title');
  const submissionUrl = extractField(body, 'submissionUrl');
  const description = extractField(body, 'description');
  const wallet = extractField(body, 'wallet');
  const category = extractField(body, 'category');

  // Validate required fields
  if (!title || !submissionUrl || !wallet) {
    return null;
  }

  return {
    title,
    submissionUrl,
    description: description || '',
    wallet,
    category: category?.toLowerCase() || 'other',
  };
}

/**
 * Parse creator application from issue body
 * @param {string} body - Issue body
 * @returns {import('./github.types.js').ParsedCreatorApplication|null}
 */
export function parseCreatorApplication(body) {
  if (!body) {
    return null;
  }

  const displayName = extractField(body, 'displayName');
  const wallet = extractField(body, 'wallet');
  const primaryCategory = extractField(body, 'primaryCategory');
  const bio = extractField(body, 'bio');
  const twitter = extractField(body, 'twitter');
  const portfolioUrl = extractField(body, 'portfolioUrl');
  const why = extractField(body, 'why');

  // Validate required fields
  if (!displayName || !wallet || !primaryCategory || !bio || !portfolioUrl) {
    return null;
  }

  return {
    displayName,
    wallet,
    primaryCategory: primaryCategory.toLowerCase(),
    bio: bio.slice(0, 500), // Limit bio length
    twitter: twitter ? twitter.replace('@', '') : null,
    portfolioUrl,
    why: why || '',
  };
}

/**
 * Parse issue body based on template type
 * @param {string} body - Issue body
 * @param {string} templateType - Template type
 * @returns {Object|null} Parsed data or null
 */
export function parseIssueTemplate(body, templateType) {
  switch (templateType) {
    case IssueTemplateTypes.CHALLENGE_ENTRY:
      return parseChallengeEntry(body);
    case IssueTemplateTypes.CREATOR_APPLICATION:
      return parseCreatorApplication(body);
    default:
      return null;
  }
}

/**
 * Detect template type from issue labels
 * @param {Array<{name: string}>} labels - Issue labels
 * @returns {string|null} Template type or null
 */
export function detectTemplateType(labels) {
  const labelNames = labels.map((l) => l.name.toLowerCase());

  if (labelNames.includes('challenge-entry')) {
    return IssueTemplateTypes.CHALLENGE_ENTRY;
  }

  if (labelNames.includes('creator-application')) {
    return IssueTemplateTypes.CREATOR_APPLICATION;
  }

  return null;
}

export default {
  parseIssueTemplate,
  parseChallengeEntry,
  parseCreatorApplication,
  detectTemplateType,
};
