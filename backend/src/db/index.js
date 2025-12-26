/**
 * Database Connection Pool
 * PostgreSQL connection with proper error handling
 */

import pg from 'pg';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

// SSL configuration for production
const getSslConfig = () => {
    if (!config.isProduction) return false;

    // If a CA certificate is provided, use it for proper verification
    if (process.env.DATABASE_SSL_CA) {
        return {
            rejectUnauthorized: true,
            ca: process.env.DATABASE_SSL_CA
        };
    }

    // Fallback: log warning about insecure connection
    logger.warn('Database SSL verification disabled. Set DATABASE_SSL_CA for secure connections.');
    return { rejectUnauthorized: false };
};

// Create connection pool
const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: getSslConfig()
});

// Test connection on startup
pool.on('connect', () => {
    logger.info('Database connected');
});

pool.on('error', (err) => {
    logger.error('Unexpected database error', err);
    process.exit(-1);
});

/**
 * Execute a query with error handling
 */
export async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        // Only log in development, never log query text in production
        logger.debug('Query executed', { duration, rows: result.rowCount });
        return result;
    } catch (error) {
        // Log error without query details to prevent SQL leakage
        logger.error('Database query error', { message: error.message });
        throw error;
    }
}

/**
 * Get a client for transactions
 */
export async function getClient() {
    const client = await pool.connect();
    const originalQuery = client.query.bind(client);
    const originalRelease = client.release.bind(client);

    // Timeout to prevent hanging connections
    const timeout = setTimeout(() => {
        logger.warn('Client has been checked out for more than 5 seconds');
    }, 5000);

    client.release = () => {
        clearTimeout(timeout);
        return originalRelease();
    };

    client.query = (...args) => originalQuery(...args);

    return client;
}

/**
 * Transaction helper
 */
export async function transaction(callback) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export default { query, getClient, transaction, pool };
