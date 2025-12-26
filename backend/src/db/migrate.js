/**
 * Database Migration Script
 * Creates all necessary tables for the ASDF Games platform
 */

import db, { query } from './index.js';
const { pool } = db;

const migrations = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(44) UNIQUE NOT NULL,
        balance BIGINT DEFAULT 0,
        is_holder BOOLEAN DEFAULT FALSE,
        total_games_played INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // Create index on wallet_address
    `CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address)`,

    // Scores table
    `CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        game_id VARCHAR(50) NOT NULL,
        score INTEGER NOT NULL,
        is_competitive BOOLEAN DEFAULT FALSE,
        session_hash VARCHAR(64),
        verified BOOLEAN DEFAULT FALSE,
        week_number INTEGER NOT NULL,
        cycle_number INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // Indexes for scores
    `CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game_id)`,
    `CREATE INDEX IF NOT EXISTS idx_scores_week ON scores(week_number)`,
    `CREATE INDEX IF NOT EXISTS idx_scores_competitive ON scores(is_competitive, week_number, game_id)`,

    // Tickets table
    `CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ticket_type VARCHAR(20) NOT NULL,
        transaction_signature VARCHAR(88),
        price_sol DECIMAL(10, 4) NOT NULL,
        purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
    )`,

    // Index for active tickets
    `CREATE INDEX IF NOT EXISTS idx_tickets_active ON tickets(user_id, is_active, expires_at)`,

    // Airdrop slots table
    `CREATE TABLE IF NOT EXISTS airdrop_slots (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        cycle_number INTEGER NOT NULL,
        week_number INTEGER NOT NULL,
        slots_earned INTEGER DEFAULT 0,
        rank_achieved INTEGER,
        game_id VARCHAR(50),
        source VARCHAR(20) NOT NULL, -- 'leaderboard', 'donator_bonus'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, cycle_number, week_number, source)
    )`,

    // Index for airdrop slots
    `CREATE INDEX IF NOT EXISTS idx_airdrop_cycle ON airdrop_slots(cycle_number)`,

    // Bets table (for Pump Arena)
    `CREATE TABLE IF NOT EXISTS bets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        game_id VARCHAR(50) NOT NULL DEFAULT 'pumparena',
        bet_amount BIGINT NOT NULL,
        result VARCHAR(10), -- 'win', 'loss', 'pending', 'cancelled'
        payout_amount BIGINT DEFAULT 0,
        final_score INTEGER,
        transaction_signature VARCHAR(88),
        payout_signature VARCHAR(88),
        payout_status VARCHAR(20) DEFAULT 'none', -- 'none', 'pending', 'completed', 'failed'
        payout_at TIMESTAMP WITH TIME ZONE,
        settled_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // Index for bets
    `CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_bets_pending ON bets(result) WHERE result = 'pending'`,
    `CREATE INDEX IF NOT EXISTS idx_bets_payout_pending ON bets(payout_status) WHERE payout_status = 'pending'`,

    // Leaderboard cache table (for performance)
    `CREATE TABLE IF NOT EXISTS leaderboard_cache (
        id SERIAL PRIMARY KEY,
        leaderboard_type VARCHAR(20) NOT NULL, -- 'weekly', 'cycle', 'alltime'
        game_id VARCHAR(50),
        week_number INTEGER,
        cycle_number INTEGER,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(leaderboard_type, game_id, week_number, cycle_number)
    )`,

    // Game sessions table (for anti-cheat)
    `CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        game_id VARCHAR(50) NOT NULL,
        session_token VARCHAR(64) UNIQUE NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP WITH TIME ZONE,
        final_score INTEGER,
        is_valid BOOLEAN DEFAULT TRUE,
        metadata JSONB
    )`,

    // Index for game sessions
    `CREATE INDEX IF NOT EXISTS idx_sessions_token ON game_sessions(session_token)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_user ON game_sessions(user_id, started_at)`,

    // Function to update updated_at timestamp
    `CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql'`,

    // Trigger for users table
    `DROP TRIGGER IF EXISTS update_users_updated_at ON users`,
    `CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()`
];

async function migrate() {
    console.log('🚀 Starting database migration...');

    for (const sql of migrations) {
        try {
            await query(sql);
            console.log('✅ Executed:', sql.substring(0, 60).replace(/\n/g, ' ') + '...');
        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            console.error('SQL:', sql.substring(0, 100));
            throw error;
        }
    }

    console.log('✅ All migrations completed successfully!');
    await pool.end();
}

// Run if called directly
migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
