import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { CreatorService } from '../../src/modules/creators/creator.service.js';
import { CATEGORY_LABELS } from '../../src/config/constants.js';

describe('CreatorService', () => {
  let creatorService;

  beforeEach(() => {
    creatorService = new CreatorService();
    jest.clearAllMocks();
  });

  describe('calculateRating', () => {
    it('should return default rating for no reactions', () => {
      const issue = { reactions: {} };
      const rating = creatorService.calculateRating(issue);
      expect(rating).toBe(4.5);
    });

    it('should return high rating for all positive reactions', () => {
      const issue = {
        reactions: {
          '+1': 10,
          heart: 5,
          rocket: 3,
          '-1': 0,
        },
      };

      const rating = creatorService.calculateRating(issue);
      expect(rating).toBe(5);
    });

    it('should return lower rating for mixed reactions', () => {
      const issue = {
        reactions: {
          '+1': 5,
          '-1': 5,
        },
      };

      const rating = creatorService.calculateRating(issue);
      expect(rating).toBe(3); // 50% positive = middle rating
    });

    it('should handle missing reactions object', () => {
      const issue = {};
      const rating = creatorService.calculateRating(issue);
      expect(rating).toBe(4.5);
    });
  });

  describe('getAvatarForCategory', () => {
    it('should return correct emoji for gaming', () => {
      const avatar = creatorService.getAvatarForCategory('gaming');
      expect(avatar).toBe(CATEGORY_LABELS.gaming.emoji);
    });

    it('should return correct emoji for tech', () => {
      const avatar = creatorService.getAvatarForCategory('tech');
      expect(avatar).toBe(CATEGORY_LABELS.tech.emoji);
    });

    it('should return default for unknown category', () => {
      const avatar = creatorService.getAvatarForCategory('unknown');
      expect(avatar).toBe('🎯');
    });

    it('should handle null category', () => {
      const avatar = creatorService.getAvatarForCategory(null);
      expect(avatar).toBe('🎯');
    });

    it('should be case-insensitive', () => {
      const avatar = creatorService.getAvatarForCategory('GAMING');
      expect(avatar).toBe(CATEGORY_LABELS.gaming.emoji);
    });
  });

  describe('sortCreators', () => {
    const creators = [
      { displayName: 'Zack', rating: 4.5, joinedAt: '2024-01-01', stats: { totalVotes: 100 } },
      { displayName: 'Alice', rating: 4.9, joinedAt: '2024-01-15', stats: { totalVotes: 50 } },
      { displayName: 'Bob', rating: 4.2, joinedAt: '2024-01-10', stats: { totalVotes: 200 } },
    ];

    it('should sort by rating descending', () => {
      const sorted = creatorService.sortCreators([...creators], 'rating');
      expect(sorted[0].displayName).toBe('Alice');
      expect(sorted[1].displayName).toBe('Zack');
      expect(sorted[2].displayName).toBe('Bob');
    });

    it('should sort by name alphabetically', () => {
      const sorted = creatorService.sortCreators([...creators], 'name');
      expect(sorted[0].displayName).toBe('Alice');
      expect(sorted[1].displayName).toBe('Bob');
      expect(sorted[2].displayName).toBe('Zack');
    });

    it('should sort by newest first', () => {
      const sorted = creatorService.sortCreators([...creators], 'newest');
      expect(sorted[0].displayName).toBe('Alice');
      expect(sorted[1].displayName).toBe('Bob');
      expect(sorted[2].displayName).toBe('Zack');
    });

    it('should sort by votes descending', () => {
      const sorted = creatorService.sortCreators([...creators], 'votes');
      expect(sorted[0].displayName).toBe('Bob');
      expect(sorted[1].displayName).toBe('Zack');
      expect(sorted[2].displayName).toBe('Alice');
    });

    it('should handle unknown sort field', () => {
      const sorted = creatorService.sortCreators([...creators], 'unknown');
      expect(sorted.length).toBe(creators.length);
    });
  });

  describe('formatCreator', () => {
    it('should format issue to creator object', async () => {
      const issue = {
        labels: [{ name: 'creator-verified' }],
        created_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/test/issues/1',
        reactions: { '+1': 5, heart: 3 },
      };

      const parsed = {
        displayName: 'TestCreator',
        wallet: 'TestWallet123',
        primaryCategory: 'tech',
        bio: 'A test bio',
        twitter: 'testcreator',
        portfolioUrl: 'https://test.com',
      };

      const creator = await creatorService.formatCreator(issue, parsed);

      expect(creator.wallet).toBe('TestWallet123');
      expect(creator.displayName).toBe('TestCreator');
      expect(creator.verified).toBe(true);
      expect(creator.featured).toBe(false);
      expect(creator.categories).toContain('tech');
      expect(creator.links.twitter).toContain('testcreator');
    });

    it('should detect featured status from labels', async () => {
      const issue = {
        labels: [{ name: 'creator-verified' }, { name: 'creator-featured' }],
        created_at: '2024-01-01T00:00:00Z',
        html_url: 'https://github.com/test/issues/1',
        reactions: {},
      };

      const parsed = {
        displayName: 'Featured',
        wallet: 'Wallet123',
        primaryCategory: 'gaming',
        bio: 'Bio',
        portfolioUrl: 'https://test.com',
      };

      const creator = await creatorService.formatCreator(issue, parsed);

      expect(creator.verified).toBe(true);
      expect(creator.featured).toBe(true);
    });
  });
});
