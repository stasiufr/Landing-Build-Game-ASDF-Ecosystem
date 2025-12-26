/**
 * ASDF Games API Server
 * Main entry point
 */

import express from 'express';
import config from './config/index.js';
import {
    securityHeaders,
    corsMiddleware,
    apiLimiter,
    sanitizeInput,
    errorHandler,
    httpsRedirect,
    csrfProtection
} from './middleware/security.js';

// Import routes
import scoresRouter from './routes/scores.js';
import ticketsRouter from './routes/tickets.js';
import bettingRouter from './routes/betting.js';
import usersRouter from './routes/users.js';

// Create Express app
const app = express();

// Trust proxy for rate limiting behind reverse proxy
// In production, configure the exact number of proxies or trusted IPs
// 1 = trust first proxy only (typical for single reverse proxy like nginx)
// 'loopback' = trust loopback addresses only
// For higher security, use: app.set('trust proxy', 'loopback, 123.123.123.123')
app.set('trust proxy', process.env.TRUST_PROXY || 1);

// HTTPS redirect in production (must be first)
app.use(httpsRedirect);

// Security middleware
app.use(securityHeaders);
app.use(corsMiddleware);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Input sanitization
app.use(sanitizeInput);

// CSRF protection for state-changing requests
app.use(csrfProtection);

// Rate limiting
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'ASDF Games API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /health',
            scores: {
                submit: 'POST /api/scores/submit',
                best: 'GET /api/scores/best/:gameId',
                all: 'GET /api/scores/all',
                weeklyLeaderboard: 'GET /api/scores/leaderboard/weekly/:gameId',
                cycleLeaderboard: 'GET /api/scores/leaderboard/cycle',
                allTimeLeaderboard: 'GET /api/scores/leaderboard/alltime/:gameId'
            },
            tickets: {
                types: 'GET /api/tickets/types',
                purchase: 'POST /api/tickets/purchase',
                active: 'GET /api/tickets/active',
                verify: 'GET /api/tickets/verify',
                history: 'GET /api/tickets/history'
            },
            betting: {
                config: 'GET /api/betting/config',
                place: 'POST /api/betting/place',
                settle: 'POST /api/betting/settle',
                pending: 'GET /api/betting/pending',
                history: 'GET /api/betting/history',
                stats: 'GET /api/betting/stats',
                global: 'GET /api/betting/global'
            },
            users: {
                me: 'GET /api/users/me',
                refreshBalance: 'POST /api/users/refresh-balance',
                check: 'GET /api/users/check/:wallet',
                airdropSlots: 'GET /api/users/airdrop-slots',
                period: 'GET /api/users/period'
            }
        }
    });
});

// Mount routes
app.use('/api/scores', scoresRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/betting', bettingRouter);
app.use('/api/users', usersRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Endpoint ${req.method} ${req.path} not found`
    });
});

// Error handler
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🎮 ASDF Games API Server                                 ║
║                                                              ║
║     Environment: ${config.nodeEnv.padEnd(40)}║
║     Port: ${config.port.toString().padEnd(48)}║
║     Time: ${new Date().toISOString().padEnd(46)}║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);

    console.log('📡 Available endpoints:');
    console.log('   GET  /health');
    console.log('   GET  /api');
    console.log('   *    /api/scores/*');
    console.log('   *    /api/tickets/*');
    console.log('   *    /api/betting/*');
    console.log('   *    /api/users/*');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

export default app;
