import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('GET /health should return healthy status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.timestamp).toBeDefined();
    });
  });

  describe('API Info', () => {
    it('GET /api should return API info', async () => {
      const res = await request(app).get('/api');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('ASDF Skills API');
      expect(res.body.data.version).toBe('1.0.0');
      expect(res.body.data.endpoints).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/unknown-route');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const res = await request(app).get('/health');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('Challenges Endpoints', () => {
    it('GET /api/challenges/current should return current challenge or null', async () => {
      const res = await request(app).get('/api/challenges/current');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Data can be null if no active challenge
    });

    it('GET /api/challenges/history should return paginated history', async () => {
      const res = await request(app).get('/api/challenges/history');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('GET /api/challenges/hall-of-fame should return hall of fame', async () => {
      const res = await request(app).get('/api/challenges/hall-of-fame');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Creators Endpoints', () => {
    it('GET /api/creators should return paginated creators', async () => {
      const res = await request(app).get('/api/creators');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('GET /api/creators/categories should return categories', async () => {
      const res = await request(app).get('/api/creators/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/creators with invalid category should still work', async () => {
      const res = await request(app).get('/api/creators?category=all');

      expect(res.status).toBe(200);
    });

    it('GET /api/creators/:wallet with invalid wallet should return 400', async () => {
      const res = await request(app).get('/api/creators/invalid-wallet');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Votes Endpoints', () => {
    it('GET /api/votes/entry/:entryId should validate entryId', async () => {
      const res = await request(app).get('/api/votes/entry/123');

      // Will either succeed or return not found (depending on if issue exists)
      expect([200, 404, 502]).toContain(res.status);
    });

    it('GET /api/votes/leaderboard/:challengeId should return leaderboard', async () => {
      const res = await request(app).get('/api/votes/leaderboard/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const res = await request(app).get('/api/challenges/current');

      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('should validate pagination params', async () => {
      const res = await request(app).get('/api/creators?page=-1');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate limit max', async () => {
      const res = await request(app).get('/api/creators?limit=500');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept valid query params', async () => {
      const res = await request(app).get('/api/creators?page=1&limit=20&sort=rating');

      expect(res.status).toBe(200);
    });
  });

  describe('CORS', () => {
    it('should handle preflight requests', async () => {
      const res = await request(app)
        .options('/api/challenges/current')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(res.status).toBe(204);
    });
  });
});
