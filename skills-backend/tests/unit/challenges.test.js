import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ChallengeService } from '../../src/modules/challenges/challenge.service.js';
import { CHALLENGE_STATUS } from '../../src/config/constants.js';

// Mock the GitHub service
jest.unstable_mockModule('../../src/modules/github/github.service.js', () => ({
  default: {
    getIssuesByLabel: jest.fn(),
    getIssueById: jest.fn(),
    getVoteCount: jest.fn(),
  },
  githubService: {
    getIssuesByLabel: jest.fn(),
    getIssueById: jest.fn(),
    getVoteCount: jest.fn(),
  },
}));

describe('ChallengeService', () => {
  let challengeService;

  beforeEach(() => {
    challengeService = new ChallengeService();
    jest.clearAllMocks();
  });

  describe('determineStatus', () => {
    it('should return COMPLETED for closed issues', () => {
      const issue = {
        state: 'closed',
        labels: [],
      };

      const status = challengeService.determineStatus(issue);
      expect(status).toBe(CHALLENGE_STATUS.COMPLETED);
    });

    it('should return ACTIVE for issues with challenge-active label', () => {
      const issue = {
        state: 'open',
        labels: [{ name: 'challenge-active' }],
      };

      const status = challengeService.determineStatus(issue);
      expect(status).toBe(CHALLENGE_STATUS.ACTIVE);
    });

    it('should return UPCOMING for open issues without active label', () => {
      const issue = {
        state: 'open',
        labels: [{ name: 'challenge' }],
      };

      const status = challengeService.determineStatus(issue);
      expect(status).toBe(CHALLENGE_STATUS.UPCOMING);
    });
  });

  describe('parseChallengeMeta', () => {
    it('should extract title from issue body', () => {
      const issue = {
        body: '## Weekly Chess Challenge\n\nTheme: Best opening tutorial',
      };

      const meta = challengeService.parseChallengeMeta(issue);
      expect(meta.title).toBe('Weekly Chess Challenge');
    });

    it('should extract theme from issue body', () => {
      const issue = {
        body: 'Theme: Best Beginner Tutorial',
      };

      const meta = challengeService.parseChallengeMeta(issue);
      expect(meta.theme).toBe('Best Beginner Tutorial');
    });

    it('should extract prize from issue body', () => {
      const issue = {
        body: 'Prize: 50000 $asdfasdfa tokens',
      };

      const meta = challengeService.parseChallengeMeta(issue);
      expect(meta.prizePool).toBe(50000);
    });

    it('should handle missing fields', () => {
      const issue = {
        body: 'Just some text without structured data',
      };

      const meta = challengeService.parseChallengeMeta(issue);
      expect(meta.title).toBeNull();
      expect(meta.theme).toBeNull();
      expect(meta.prizePool).toBeNull();
    });

    it('should handle empty body', () => {
      const issue = { body: '' };
      const meta = challengeService.parseChallengeMeta(issue);

      expect(meta.title).toBeNull();
      expect(meta.theme).toBeNull();
    });
  });

  describe('calculateEndDate', () => {
    it('should return date 7 days from start', () => {
      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = challengeService.calculateEndDate(startDate);

      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = (end - start) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBe(7);
    });
  });

  describe('getWeekNumber', () => {
    it('should return correct week number', () => {
      // January 8, 2024 is week 2
      const weekNum = challengeService.getWeekNumber('2024-01-08T00:00:00.000Z');
      expect(weekNum).toBeGreaterThan(0);
      expect(weekNum).toBeLessThanOrEqual(53);
    });
  });

  describe('extractPrize', () => {
    it('should extract prize amount from body', () => {
      const body = 'Win 50000 $asdfasdfa tokens!';
      const prize = challengeService.extractPrize(body);
      expect(prize).toBe(50000);
    });

    it('should return default for missing prize', () => {
      const body = 'No prize mentioned';
      const prize = challengeService.extractPrize(body);
      expect(prize).toBe(50000); // default
    });

    it('should handle null body', () => {
      const prize = challengeService.extractPrize(null);
      expect(prize).toBe(50000);
    });
  });

  describe('getTopCategories', () => {
    it('should return top categories sorted by count', () => {
      const entries = [
        { category: 'gaming' },
        { category: 'gaming' },
        { category: 'tech' },
        { category: 'gaming' },
        { category: 'cooking' },
      ];

      const top = challengeService.getTopCategories(entries);

      expect(top[0].category).toBe('gaming');
      expect(top[0].count).toBe(3);
      expect(top[1].category).toBe('tech');
      expect(top[1].count).toBe(1);
    });

    it('should limit to 5 categories', () => {
      const entries = [
        { category: 'a' },
        { category: 'b' },
        { category: 'c' },
        { category: 'd' },
        { category: 'e' },
        { category: 'f' },
        { category: 'g' },
      ];

      const top = challengeService.getTopCategories(entries);
      expect(top.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty entries', () => {
      const top = challengeService.getTopCategories([]);
      expect(top).toEqual([]);
    });
  });

  describe('shuffleArray', () => {
    it('should return array of same length', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = challengeService.shuffleArray(arr);
      expect(shuffled.length).toBe(arr.length);
    });

    it('should contain same elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = challengeService.shuffleArray(arr);
      expect(shuffled.sort()).toEqual(arr.sort());
    });

    it('should not modify original array', () => {
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      challengeService.shuffleArray(arr);
      expect(arr).toEqual(original);
    });
  });
});
