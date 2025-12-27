/**
 * ASDF Games - Main Entry Point
 * Initialization and event listeners
 */

'use strict';

/**
 * Initialize Solana Web3 global
 */
function initSolanaWeb3() {
    if (typeof solanaWeb3 !== 'undefined') {
        window.solanaWeb3 = solanaWeb3;
    }
}

/**
 * Attach all event listeners
 */
function initEventListeners() {
    // Wallet button
    const walletBtn = document.getElementById('wallet-btn');
    if (walletBtn) {
        walletBtn.addEventListener('click', handleWalletClick);
    }

    // Featured game buttons
    const playFeaturedBtn = document.getElementById('play-featured-btn');
    if (playFeaturedBtn) {
        playFeaturedBtn.addEventListener('click', playFeaturedGame);
    }

    const viewAllGamesBtn = document.getElementById('view-all-games-btn');
    if (viewAllGamesBtn) {
        viewAllGamesBtn.addEventListener('click', scrollToGames);
    }

    // Pump Arena buttons
    const pumpClassicBtn = document.getElementById('pump-classic-btn');
    if (pumpClassicBtn) {
        pumpClassicBtn.addEventListener('click', () => openPumpArena('classic'));
    }

    const pumpBetBtn = document.getElementById('pump-bet-btn');
    if (pumpBetBtn) {
        pumpBetBtn.addEventListener('click', () => openPumpArena('betting'));
    }

    // Pump Arena modal controls
    const closePumpArenaBtn = document.getElementById('close-pumparena-btn');
    if (closePumpArenaBtn) {
        closePumpArenaBtn.addEventListener('click', () => closeGame('pumparena'));
    }

    const startPumpArenaBtn = document.getElementById('start-pumparena-btn');
    if (startPumpArenaBtn) {
        startPumpArenaBtn.addEventListener('click', () => startGame('pumparena'));
    }

    // Leaderboard tabs
    document.querySelectorAll('.leaderboard-tab[data-board]').forEach(tab => {
        tab.addEventListener('click', () => {
            const board = tab.dataset.board;
            const filter = tab.dataset.filter;
            switchLeaderboard(board, filter);

            tab.closest('.leaderboard-tabs').querySelectorAll('.leaderboard-tab').forEach(t => {
                t.classList.remove('active');
            });
            tab.classList.add('active');
        });
    });

    // Test mode button
    const testModeBtn = document.getElementById('test-mode-btn');
    if (testModeBtn) {
        testModeBtn.addEventListener('click', toggleTestMode);
    }

    // Tickets buttons
    const buyTicketsBtn = document.getElementById('buy-tickets-btn');
    if (buyTicketsBtn) {
        buyTicketsBtn.addEventListener('click', openBuyTickets);
    }

    const closeTicketModalBtn = document.getElementById('close-ticket-modal-btn');
    if (closeTicketModalBtn) {
        closeTicketModalBtn.addEventListener('click', closeTicketModal);
    }

    // Buy ticket buttons
    document.querySelectorAll('.buy-ticket-btn[data-ticket]').forEach(btn => {
        btn.addEventListener('click', () => {
            buyTicket(btn.dataset.ticket);
        });
    });

    // Pack modal
    const closePackModalBtn = document.getElementById('close-pack-modal-btn');
    if (closePackModalBtn) {
        closePackModalBtn.addEventListener('click', closePackModal);
    }
}

/**
 * Main initialization
 */
function init() {
    initSolanaWeb3();
    initEventListeners();

    loadState();
    updateFeaturedGame();
    renderGamesGrid();
    generateGameModals();
    renderLeaderboards();
    updateCountdown();
    updateAirdropCountdown();

    // Update countdowns
    setInterval(updateCountdown, 1000);
    setInterval(updateAirdropCountdown, 60000);

    // Update Pump Arena betting button
    updatePumpBetButton();

    // Reconnect wallet if previously connected
    if (appState.wallet) {
        updateWalletUI(appState.wallet);
        updateAccessUI();

        const provider = getPhantomProvider();
        if (provider) {
            provider.connect({ onlyIfTrusted: true })
                .then(response => {
                    if (response.publicKey.toString() === appState.wallet) {
                        checkTokenBalance(appState.wallet);
                    }
                })
                .catch(() => {});
        }
    }

    // Listen for Phantom events
    const provider = getPhantomProvider();
    if (provider) {
        provider.on('disconnect', () => {
            appState.wallet = null;
            appState.isHolder = false;
            saveState();
            updateWalletUI(null);
            updateAccessUI();
            renderGamesGrid();
        });

        provider.on('accountChanged', (publicKey) => {
            if (publicKey) {
                appState.wallet = publicKey.toString();
                saveState();
                updateWalletUI(appState.wallet);
                checkTokenBalance(appState.wallet);
            } else {
                disconnectWallet();
            }
        });
    }
}

// Run on DOM ready
document.addEventListener('DOMContentLoaded', init);

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        GAMES.forEach(game => {
            const modal = document.getElementById(`modal-${game.id}`);
            if (modal && modal.classList.contains('active')) {
                closeGame(game.id);
            }
        });
    }
});

// Event delegation for dynamically generated game buttons
document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const gameId = target.dataset.game;
    const ticketType = target.dataset.ticket;

    switch (action) {
        case 'open-game':
            if (gameId) openGame(gameId);
            break;
        case 'close-game':
            if (gameId) closeGame(gameId);
            break;
        case 'start-game':
            if (gameId) startGame(gameId);
            break;
        case 'restart-game':
            if (gameId) restartGame(gameId);
            break;
        case 'toggle-competitive':
            if (gameId) toggleCompetitive(gameId);
            break;
        case 'buy-ticket':
            if (ticketType) buyTicket(ticketType);
            break;
    }
});
