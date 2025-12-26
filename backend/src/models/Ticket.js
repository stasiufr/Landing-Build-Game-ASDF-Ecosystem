/**
 * Ticket Model
 * Database operations for ticket management
 */

import { query, transaction } from '../db/index.js';
import { verifyTransaction, getCurrentPeriod } from '../utils/solana.js';
import config from '../config/index.js';

export const Ticket = {
    /**
     * Purchase a ticket
     */
    async purchase(userId, ticketType, transactionSignature) {
        const ticketConfig = config.tickets[ticketType];
        if (!ticketConfig) {
            throw new Error('Invalid ticket type');
        }

        // Verify the transaction on-chain
        const txVerification = await verifyTransaction(transactionSignature);
        if (!txVerification.valid) {
            throw new Error(`Transaction verification failed: ${txVerification.error}`);
        }

        // Check if transaction was already used
        const existingTx = await query(
            'SELECT id FROM tickets WHERE transaction_signature = $1',
            [transactionSignature]
        );

        if (existingTx.rows.length > 0) {
            throw new Error('Transaction already used for a ticket');
        }

        // Calculate expiration
        const expiresAt = new Date(Date.now() + ticketConfig.durationMs);

        // Deactivate any existing active tickets
        await query(
            `UPDATE tickets SET is_active = false WHERE user_id = $1 AND is_active = true`,
            [userId]
        );

        // Create new ticket
        const result = await query(
            `INSERT INTO tickets (user_id, ticket_type, transaction_signature, price_sol, expires_at)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, ticketType, transactionSignature, ticketConfig.priceSOL, expiresAt]
        );

        const ticket = result.rows[0];

        // If donator ticket, check for bonus slot
        if (ticketType === 'donator' && Math.random() < ticketConfig.bonusChance) {
            const { weekNumber, cycleNumber } = getCurrentPeriod();

            await query(
                `INSERT INTO airdrop_slots (user_id, cycle_number, week_number, slots_earned, source)
                 VALUES ($1, $2, $3, 1, 'donator_bonus')
                 ON CONFLICT (user_id, cycle_number, week_number, source)
                 DO UPDATE SET slots_earned = airdrop_slots.slots_earned + 1`,
                [userId, cycleNumber, weekNumber]
            );

            ticket.bonusSlot = true;
        }

        return ticket;
    },

    /**
     * Get user's active ticket
     */
    async getActive(userId) {
        const result = await query(
            `SELECT * FROM tickets
             WHERE user_id = $1
               AND is_active = true
               AND expires_at > CURRENT_TIMESTAMP
             ORDER BY expires_at DESC
             LIMIT 1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const ticket = result.rows[0];
        const ticketConfig = config.tickets[ticket.ticket_type];

        return {
            ...ticket,
            config: ticketConfig,
            remainingTime: new Date(ticket.expires_at).getTime() - Date.now()
        };
    },

    /**
     * Check if user has active competitive access
     */
    async hasCompetitiveAccess(userId) {
        const result = await query(
            `SELECT COUNT(*) as count FROM tickets
             WHERE user_id = $1
               AND is_active = true
               AND expires_at > CURRENT_TIMESTAMP`,
            [userId]
        );

        return parseInt(result.rows[0].count) > 0;
    },

    /**
     * Get ticket history for a user
     */
    async getHistory(userId, limit = 10) {
        const result = await query(
            `SELECT * FROM tickets
             WHERE user_id = $1
             ORDER BY purchased_at DESC
             LIMIT $2`,
            [userId, limit]
        );

        return result.rows;
    },

    /**
     * Expire old tickets (cleanup job)
     */
    async expireOldTickets() {
        const result = await query(
            `UPDATE tickets
             SET is_active = false
             WHERE is_active = true AND expires_at < CURRENT_TIMESTAMP
             RETURNING id`
        );

        return result.rowCount;
    },

    /**
     * Get ticket statistics
     */
    async getStats() {
        const result = await query(
            `SELECT
                ticket_type,
                COUNT(*) as total_sold,
                SUM(price_sol) as total_revenue,
                COUNT(*) FILTER (WHERE is_active AND expires_at > CURRENT_TIMESTAMP) as currently_active
             FROM tickets
             GROUP BY ticket_type`
        );

        return result.rows;
    },

    /**
     * Find ticket by transaction signature
     * Used to prevent double-spending
     */
    async findByTransaction(transactionSignature) {
        const result = await query(
            `SELECT * FROM tickets WHERE transaction_signature = $1`,
            [transactionSignature]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }
};

export default Ticket;
