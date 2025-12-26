/**
 * Application Configuration
 * Loads and validates environment variables
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, '../../.env') });

// Validate required environment variables
const requiredEnvVars = [
    'DATABASE_URL',
    'SOLANA_RPC_URL',
    'ASDF_TOKEN_MINT'
];

// Security-critical variables required in production
const requiredSecurityVars = [
    'JWT_SECRET',
    'API_KEY_SALT'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
const missingSecurityVars = requiredSecurityVars.filter(v => !process.env[v]);

if (process.env.NODE_ENV === 'production') {
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    if (missingSecurityVars.length > 0) {
        throw new Error(`CRITICAL: Missing required security variables: ${missingSecurityVars.join(', ')}. Never use default secrets in production!`);
    }
}

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',

    // Database
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/asdf_games',

    // Solana
    solana: {
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
        tokenMint: process.env.ASDF_TOKEN_MINT || '9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump',
        tokenDecimals: parseInt(process.env.TOKEN_DECIMALS || '6', 10), // pump.fun tokens use 6 decimals
        minHolderBalance: parseInt(process.env.MIN_HOLDER_BALANCE || '1000000', 10),
        treasuryWallet: process.env.TREASURY_WALLET || '5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa',
        escrowWallet: process.env.ESCROW_WALLET || 'AR3Rcr8o4iZwGwTUG5LEx7uhcenCCZNrbgkLrjVC1v6y',
        escrowPrivateKey: process.env.ESCROW_PRIVATE_KEY || null // Required for payouts
    },

    // Security
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    apiKeySalt: process.env.API_KEY_SALT || 'dev-salt',
    adminWallets: (process.env.ADMIN_WALLETS || '').split(',').map(w => w.trim()).filter(Boolean),

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
    },

    // CORS
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),

    // Game Configuration
    game: {
        cycleWeeks: parseInt(process.env.CYCLE_WEEKS || '9', 10),
        rotationEpoch: new Date(process.env.ROTATION_EPOCH || '2024-01-01T00:00:00Z'),
        validGameIds: [
            'burnrunner', 'scamblaster', 'hodlhero', 'cryptoheist',
            'rugpull', 'whalewatch', 'stakestacker', 'dexdash', 'burnorhold', 'pumparena'
        ],
        airdropSlots: { 1: 5, 2: 2, 3: 1 } // Slots per rank
    },

    // Ticket Configuration
    tickets: {
        standard: {
            name: 'Standard Ticket',
            priceSOL: 0.1,
            durationMs: 4 * 60 * 60 * 1000, // 4 hours
            icon: '🎟️'
        },
        premium: {
            name: 'Premium Ticket',
            priceSOL: 0.5,
            durationMs: 24 * 60 * 60 * 1000, // 24 hours
            icon: '🎫'
        },
        donator: {
            name: 'Donator Ticket',
            priceSOL: 2.0,
            durationMs: 7 * 24 * 60 * 60 * 1000, // 1 week
            bonusChance: 0.33,
            icon: '👑'
        }
    }
};

export default config;
