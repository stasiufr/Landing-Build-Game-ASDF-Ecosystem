import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';

/**
 * Simple in-memory cache with optional file persistence
 */
class Cache {
  constructor() {
    this.store = new Map();
    this.cacheDir = path.join(process.cwd(), '.cache');
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if expired/missing
   */
  get(key) {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });
  }

  /**
   * Delete cached value
   * @param {string} key - Cache key
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear() {
    this.store.clear();
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  stats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const entry of this.store.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.store.size,
      valid,
      expired,
    };
  }

  /**
   * Persist cache to file
   * @param {string} filename - File name (without extension)
   */
  async persistToFile(filename) {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });

      const data = {};
      for (const [key, entry] of this.store.entries()) {
        if (Date.now() < entry.expiresAt) {
          data[key] = entry;
        }
      }

      const filePath = path.join(this.cacheDir, `${filename}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));

      logger.debug(`Cache persisted to ${filename}.json`);
    } catch (error) {
      logger.error('Failed to persist cache', { error: error.message });
    }
  }

  /**
   * Load cache from file
   * @param {string} filename - File name (without extension)
   */
  async loadFromFile(filename) {
    try {
      const filePath = path.join(this.cacheDir, `${filename}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      let loaded = 0;
      for (const [key, entry] of Object.entries(data)) {
        if (Date.now() < entry.expiresAt) {
          this.store.set(key, entry);
          loaded++;
        }
      }

      logger.debug(`Cache loaded from ${filename}.json: ${loaded} entries`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.warn('Failed to load cache', { error: error.message });
      }
    }
  }
}

// Singleton instance
const cache = new Cache();

// Run cleanup every 5 minutes
setInterval(
  () => {
    cache.cleanup();
  },
  5 * 60 * 1000
);

/**
 * Cache wrapper function for async operations
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch data if not cached
 * @param {number} ttl - Time to live in milliseconds
 * @returns {any} Cached or fetched value
 */
export async function cached(key, fetchFn, ttl) {
  const cachedValue = cache.get(key);

  if (cachedValue !== null) {
    logger.debug(`Cache hit: ${key}`);
    return cachedValue;
  }

  logger.debug(`Cache miss: ${key}`);
  const value = await fetchFn();
  cache.set(key, value, ttl);

  return value;
}

export { cache };
export default cache;
