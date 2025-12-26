/**
 * ASDF Games - API Client
 */

'use strict';

const ApiClient = {
    /**
     * Get authentication headers with wallet signature
     */
    async getAuthHeaders() {
        if (!appState.wallet) {
            return {};
        }

        const message = `ASDF Games Auth: ${Date.now()}`;

        try {
            const provider = getPhantomProvider();
            if (!provider) {
                return { 'X-Wallet-Address': appState.wallet };
            }

            const encodedMessage = new TextEncoder().encode(message);
            const signedMessage = await provider.signMessage(encodedMessage, 'utf8');
            const signature = btoa(String.fromCharCode(...signedMessage.signature));

            return {
                'X-Wallet-Address': appState.wallet,
                'X-Message': message,
                'X-Signature': signature
            };
        } catch (error) {
            console.warn('Could not sign message:', error);
            return { 'X-Wallet-Address': appState.wallet };
        }
    },

    /**
     * Make an API request
     */
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE}${endpoint}`;

        if (!RateLimiter.canMakeCall(endpoint)) {
            throw new Error('Rate limit exceeded. Please wait.');
        }

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (options.auth !== false && appState.wallet) {
            const authHeaders = await this.getAuthHeaders();
            Object.assign(headers, authHeaders);
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    // Score endpoints
    async submitScore(gameId, score, isCompetitive = false, sessionData = null) {
        return this.request('/scores/submit', {
            method: 'POST',
            body: JSON.stringify({ gameId, score, isCompetitive, sessionData })
        });
    },

    async getBestScore(gameId) {
        return this.request(`/scores/best/${gameId}`);
    },

    async getAllBestScores() {
        return this.request('/scores/all');
    },

    async getWeeklyLeaderboard(gameId, limit = 10) {
        return this.request(`/scores/leaderboard/weekly/${gameId}?limit=${limit}`, { auth: false });
    },

    async getCycleLeaderboard(limit = 10) {
        return this.request(`/scores/leaderboard/cycle?limit=${limit}`, { auth: false });
    },

    // Ticket endpoints
    async getTicketTypes() {
        return this.request('/tickets/types', { auth: false });
    },

    async purchaseTicket(ticketType, transactionSignature) {
        return this.request('/tickets/purchase', {
            method: 'POST',
            body: JSON.stringify({ ticketType, transactionSignature })
        });
    },

    async getActiveTicket() {
        return this.request('/tickets/active');
    },

    async verifyTicketAccess() {
        return this.request('/tickets/verify');
    },

    // Betting endpoints
    async getBettingConfig() {
        return this.request('/betting/config', { auth: false });
    },

    async placeBet(betAmount, transactionSignature = null) {
        return this.request('/betting/place', {
            method: 'POST',
            body: JSON.stringify({ betAmount, transactionSignature })
        });
    },

    async settleBet(betId, finalScore, sessionHash = null) {
        return this.request('/betting/settle', {
            method: 'POST',
            body: JSON.stringify({ betId, finalScore, sessionHash })
        });
    },

    async getPendingBet() {
        return this.request('/betting/pending');
    },

    async getBettingStats() {
        return this.request('/betting/stats');
    },

    // User endpoints
    async getUserProfile() {
        return this.request('/users/me');
    },

    async refreshBalance() {
        return this.request('/users/refresh-balance', { method: 'POST' });
    },

    async getAirdropSlots() {
        return this.request('/users/airdrop-slots');
    },

    async getPeriodInfo() {
        return this.request('/users/period', { auth: false });
    }
};
