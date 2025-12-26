import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  parseChallengeEntry,
  parseCreatorApplication,
  detectTemplateType,
} from '../../src/modules/github/github.templates.js';
import { IssueTemplateTypes } from '../../src/modules/github/github.types.js';

describe('GitHub Templates Parser', () => {
  describe('parseChallengeEntry', () => {
    it('should parse a valid challenge entry', () => {
      const body = `
### Entry Title

My Awesome Tutorial

### Submission URL

https://youtube.com/watch?v=abc123

### Description

This is a great tutorial for beginners.

### Solana Wallet

ABC123xyz456

### Category

Gaming
      `;

      const result = parseChallengeEntry(body);

      expect(result).not.toBeNull();
      expect(result.title).toBe('My Awesome Tutorial');
      expect(result.submissionUrl).toBe('https://youtube.com/watch?v=abc123');
      expect(result.description).toBe('This is a great tutorial for beginners.');
      expect(result.wallet).toBe('ABC123xyz456');
      expect(result.category).toBe('gaming');
    });

    it('should return null for missing required fields', () => {
      const body = `
### Entry Title

My Awesome Tutorial

### Description

This is a great tutorial.
      `;

      const result = parseChallengeEntry(body);
      expect(result).toBeNull();
    });

    it('should return null for empty body', () => {
      expect(parseChallengeEntry('')).toBeNull();
      expect(parseChallengeEntry(null)).toBeNull();
      expect(parseChallengeEntry(undefined)).toBeNull();
    });

    it('should handle _No response_ as empty value', () => {
      const body = `
### Entry Title

My Tutorial

### Submission URL

https://example.com

### Description

_No response_

### Solana Wallet

ABC123

### Category

Tech
      `;

      const result = parseChallengeEntry(body);
      expect(result).not.toBeNull();
      expect(result.description).toBe('');
    });
  });

  describe('parseCreatorApplication', () => {
    it('should parse a valid creator application', () => {
      const body = `
### Display Name

ChessMaster

### Solana Wallet

WalletAddress123456789

### Primary Category

Strategy

### Bio

I'm a 2200 ELO chess player with 5 years of coaching experience.

### Twitter/X

@chessmaster

### Portfolio/Proof of Work

https://youtube.com/chessmaster

### Why do you want to join?

I want to share my knowledge with the community.
      `;

      const result = parseCreatorApplication(body);

      expect(result).not.toBeNull();
      expect(result.displayName).toBe('ChessMaster');
      expect(result.wallet).toBe('WalletAddress123456789');
      expect(result.primaryCategory).toBe('strategy');
      expect(result.bio).toContain('2200 ELO');
      expect(result.twitter).toBe('chessmaster'); // @ removed
      expect(result.portfolioUrl).toBe('https://youtube.com/chessmaster');
      expect(result.why).toContain('share my knowledge');
    });

    it('should return null for missing required fields', () => {
      const body = `
### Display Name

ChessMaster

### Bio

Some bio
      `;

      const result = parseCreatorApplication(body);
      expect(result).toBeNull();
    });

    it('should handle optional twitter field', () => {
      const body = `
### Display Name

TestCreator

### Solana Wallet

TestWallet123

### Primary Category

Tech

### Bio

A tech creator bio

### Twitter/X

_No response_

### Portfolio/Proof of Work

https://github.com/test

### Why do you want to join?

To help others learn
      `;

      const result = parseCreatorApplication(body);
      expect(result).not.toBeNull();
      expect(result.twitter).toBeNull();
    });

    it('should limit bio length', () => {
      const longBio = 'A'.repeat(1000);
      const body = `
### Display Name

Test

### Solana Wallet

TestWallet123

### Primary Category

Tech

### Bio

${longBio}

### Portfolio/Proof of Work

https://test.com

### Why do you want to join?

Testing
      `;

      const result = parseCreatorApplication(body);
      expect(result).not.toBeNull();
      expect(result.bio.length).toBeLessThanOrEqual(500);
    });
  });

  describe('detectTemplateType', () => {
    it('should detect challenge-entry type', () => {
      const labels = [{ name: 'challenge-entry' }, { name: 'pending-review' }];
      expect(detectTemplateType(labels)).toBe(IssueTemplateTypes.CHALLENGE_ENTRY);
    });

    it('should detect creator-application type', () => {
      const labels = [{ name: 'creator-application' }];
      expect(detectTemplateType(labels)).toBe(IssueTemplateTypes.CREATOR_APPLICATION);
    });

    it('should return null for unknown labels', () => {
      const labels = [{ name: 'bug' }, { name: 'enhancement' }];
      expect(detectTemplateType(labels)).toBeNull();
    });

    it('should handle empty labels', () => {
      expect(detectTemplateType([])).toBeNull();
    });

    it('should be case-insensitive', () => {
      const labels = [{ name: 'Challenge-Entry' }];
      expect(detectTemplateType(labels)).toBe(IssueTemplateTypes.CHALLENGE_ENTRY);
    });
  });
});
