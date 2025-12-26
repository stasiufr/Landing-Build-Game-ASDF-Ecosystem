// Categories for skills marketplace
export const CATEGORIES = {
  GAMING: 'gaming',
  STRATEGY: 'strategy',
  TECH: 'tech',
  COOKING: 'cooking',
  BUILDING: 'building',
  FITNESS: 'fitness',
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export const CATEGORY_LABELS = {
  [CATEGORIES.GAMING]: { emoji: '🎮', label: 'Gaming' },
  [CATEGORIES.STRATEGY]: { emoji: '♟️', label: 'Strategy' },
  [CATEGORIES.TECH]: { emoji: '💻', label: 'Tech' },
  [CATEGORIES.COOKING]: { emoji: '🍳', label: 'Cooking' },
  [CATEGORIES.BUILDING]: { emoji: '🔨', label: 'Building' },
  [CATEGORIES.FITNESS]: { emoji: '🏋️', label: 'Fitness' },
};

// GitHub Labels
export const GITHUB_LABELS = {
  // Challenges
  CHALLENGE_ACTIVE: 'challenge-active',
  CHALLENGE_ENTRY: 'challenge-entry',
  CHALLENGE_COMPLETED: 'challenge-completed',

  // Creators
  CREATOR_APPLICATION: 'creator-application',
  CREATOR_VERIFIED: 'creator-verified',
  CREATOR_FEATURED: 'creator-featured',

  // Status
  PENDING_REVIEW: 'pending-review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Challenge statuses
export const CHALLENGE_STATUS = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  VOTING: 'voting',
  COMPLETED: 'completed',
};

// Wallet address regex (Solana)
export const WALLET_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Reaction types for voting
export const VOTE_REACTION = '+1'; // thumbs up

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  GITHUB_ERROR: 'GITHUB_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};
