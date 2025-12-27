/**
 * ASDF Games - UI Components
 * Grid, leaderboard, modals, tickets
 */

'use strict';

// ============================================
// ROTATION SYSTEM
// ============================================

function getCurrentWeekIndex() {
    const now = Date.now();
    const epochMs = CONFIG.ROTATION_EPOCH.getTime();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceEpoch = Math.floor((now - epochMs) / weekMs);
    return weeksSinceEpoch % CONFIG.CYCLE_WEEKS;
}

function getCurrentGame() {
    return GAMES[getCurrentWeekIndex()];
}

function getNextRotationTime() {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);

    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(0, 0, 0, 0);

    return nextMonday;
}

function updateCountdown() {
    const now = Date.now();
    const target = getNextRotationTime().getTime();
    const diff = Math.max(0, target - now);

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    const secs = Math.floor((diff % (60 * 1000)) / 1000);

    document.getElementById('countdown-days').textContent = days;
    document.getElementById('countdown-hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('countdown-mins').textContent = mins.toString().padStart(2, '0');
    document.getElementById('countdown-secs').textContent = secs.toString().padStart(2, '0');
}

function getNextAirdropTime() {
    const now = new Date();
    const currentWeek = getCurrentWeekIndex();
    const weeksUntilCycleEnd = CONFIG.CYCLE_WEEKS - currentWeek;
    const nextCycleEnd = getNextRotationTime();
    nextCycleEnd.setUTCDate(nextCycleEnd.getUTCDate() + (weeksUntilCycleEnd - 1) * 7);
    return nextCycleEnd;
}

function updateAirdropCountdown() {
    const now = Date.now();
    const target = getNextAirdropTime().getTime();
    const diff = Math.max(0, target - now);

    const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
    const days = Math.floor((diff % (7 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    document.getElementById('airdrop-weeks').textContent = weeks;
    document.getElementById('airdrop-days').textContent = days;
    document.getElementById('airdrop-hours').textContent = hours;
}

// ============================================
// GAMES GRID
// ============================================

function renderGamesGrid() {
    const grid = document.getElementById('games-grid');
    const currentGame = getCurrentGame();

    grid.innerHTML = GAMES.map(game => {
        const isFeatured = game.id === currentGame.id;
        const isLocked = !testMode && !isFeatured && !appState.isHolder;
        const highScore = appState.practiceScores[game.id] || 0;

        return `
            <div class="game-card ${isFeatured ? 'featured' : ''} ${isLocked ? 'locked' : ''}" data-game="${game.id}">
                <div class="game-icon">${game.icon}</div>
                <h3 class="game-name">${escapeHtml(game.name)}</h3>
                <p class="game-type">${escapeHtml(game.type)}</p>
                <div class="game-highscore">
                    Best: ${highScore}
                </div>
                <button class="btn game-play-btn" data-action="open-game" data-game="${game.id}" ${isLocked ? 'disabled' : ''}>
                    ${isLocked ? 'Locked' : 'Play'}
                </button>
            </div>
        `;
    }).join('');
}

function updateFeaturedGame() {
    const game = getCurrentGame();
    document.getElementById('featured-game-icon').textContent = game.icon;
    document.getElementById('featured-game-name').textContent = game.name;
    document.getElementById('featured-game-desc').textContent = game.description;
}

// ============================================
// LEADERBOARD
// ============================================

async function renderLeaderboards() {
    const currentGame = getCurrentGame();

    const weeklyEl = document.getElementById('weekly-leaderboard');
    const cycleEl = document.getElementById('cycle-leaderboard');

    if (weeklyEl) weeklyEl.innerHTML = '<div class="leaderboard-loading">Loading...</div>';
    if (cycleEl) cycleEl.innerHTML = '<div class="leaderboard-loading">Loading...</div>';

    try {
        const [weeklyResponse, cycleResponse] = await Promise.all([
            ApiClient.getWeeklyLeaderboard(currentGame.id, 10).catch(() => ({ leaderboard: [] })),
            ApiClient.getCycleLeaderboard(10).catch(() => ({ leaderboard: [] }))
        ]);

        const weeklyData = weeklyResponse.leaderboard || [];
        const cycleData = cycleResponse.leaderboard || [];

        if (weeklyEl) {
            weeklyEl.innerHTML = weeklyData.length > 0
                ? renderWeeklyLeaderboard(weeklyData)
                : '<div class="leaderboard-empty">No scores yet this week. Be the first!</div>';
        }

        if (cycleEl) {
            cycleEl.innerHTML = cycleData.length > 0
                ? renderCycleLeaderboard(cycleData)
                : '<div class="leaderboard-empty">No airdrop slots earned yet.</div>';
        }
    } catch (error) {
        console.error('Failed to load leaderboards:', error);

        const mockWeeklyData = [{ rank: 1, player: 'Connect to see...', score: 0 }];
        const mockCycleData = [{ rank: 1, player: 'Connect to see...', slots: 0 }];

        if (weeklyEl) weeklyEl.innerHTML = renderWeeklyLeaderboard(mockWeeklyData);
        if (cycleEl) cycleEl.innerHTML = renderCycleLeaderboard(mockCycleData);
    }
}

function renderWeeklyLeaderboard(data) {
    return data.map(entry => {
        // Validate numeric values from API (defense-in-depth)
        const rank = Number.isFinite(entry.rank) ? Math.floor(entry.rank) : 0;
        const score = Number.isFinite(entry.score) ? Math.floor(entry.score) : 0;
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const isYou = appState.wallet && typeof entry.player === 'string' && entry.player.includes(appState.wallet.slice(0, 4));
        const slots = AIRDROP_SLOTS[rank] || 0;
        const slotBadge = slots > 0 ? `<span style="color: var(--gold); font-size: 11px; margin-left: 8px;">+${slots} slots</span>` : '';

        return `
            <div class="leaderboard-item ${isYou ? 'you' : ''}">
                <div class="leaderboard-rank ${rankClass}">${rank}</div>
                <div class="leaderboard-player" style="flex: 1;">
                    ${isYou ? ' You' : escapeHtml(String(entry.player || ''))}
                    ${slotBadge}
                </div>
                <div class="leaderboard-score">${score.toLocaleString()}</div>
            </div>
        `;
    }).join('');
}

function renderCycleLeaderboard(data) {
    return data.map(entry => {
        // Validate numeric values from API (defense-in-depth)
        const rank = Number.isFinite(entry.rank) ? Math.floor(entry.rank) : 0;
        const slots = Number.isFinite(entry.slots) ? Math.floor(entry.slots) : 0;
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const isYou = appState.wallet && typeof entry.player === 'string' && entry.player.includes(appState.wallet.slice(0, 4));

        return `
            <div class="leaderboard-item ${isYou ? 'you' : ''}">
                <div class="leaderboard-rank ${rankClass}">${rank}</div>
                <div class="leaderboard-player">${isYou ? ' You' : escapeHtml(String(entry.player || ''))}</div>
                <div class="leaderboard-score" style="color: var(--gold);">${slots} slots</div>
            </div>
        `;
    }).join('');
}

function switchLeaderboard(type, filter) {
    // TODO: Implement tab switching and API calls
}

// ============================================
// GAME MODALS
// ============================================

function generateGameModals() {
    const container = document.getElementById('game-modals');

    container.innerHTML = GAMES.map(game => `
        <div class="game-modal" id="modal-${game.id}">
            <div class="game-modal-content">
                <div class="game-modal-header">
                    <h2 class="game-modal-title">
                        <span>${game.icon}</span>
                        <span>${escapeHtml(game.name)}</span>
                    </h2>
                    <button class="game-modal-close" data-action="close-game" data-game="${game.id}">&times;</button>
                </div>
                <div class="game-modal-body">
                    <div class="game-arena" id="arena-${game.id}">
                        <div class="game-start-overlay" id="overlay-${game.id}">
                            <div class="game-instructions">
                                <h3>${escapeHtml(game.name)}</h3>
                                <p>${escapeHtml(game.description)}</p>
                            </div>
                            <button class="btn btn-primary" data-action="start-game" data-game="${game.id}">
                                START GAME
                            </button>
                        </div>
                    </div>
                </div>
                <div class="game-controls">
                    <div class="game-stats">
                        <div class="game-stat">
                            <div class="game-stat-value" id="score-${game.id}">0</div>
                            <div class="game-stat-label">Score</div>
                        </div>
                        <div class="game-stat">
                            <div class="game-stat-value" id="best-${game.id}">${appState.practiceScores[game.id] || 0}</div>
                            <div class="game-stat-label">Best</div>
                        </div>
                        <div class="game-stat" id="timer-stat-${game.id}" style="display: none;">
                            <div class="game-stat-value" id="timer-${game.id}">--:--</div>
                            <div class="game-stat-label">Time Left</div>
                        </div>
                    </div>
                    <div class="game-mode-toggle">
                        <button class="mode-btn" data-action="restart-game" data-game="${game.id}" title="Restart Game">Restart</button>
                        <button class="mode-btn active" id="practice-btn-${game.id}">Practice</button>
                        <button class="mode-btn" id="competitive-btn-${game.id}" data-action="toggle-competitive" data-game="${game.id}">
                            Competitive
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function openGame(gameId) {
    if (!isValidGameId(gameId)) return;
    const game = GAMES.find(g => g.id === gameId);
    if (!game) return;

    const currentGame = getCurrentGame();
    const isFeatured = game.id === currentGame.id;

    if (!testMode && !isFeatured && !appState.isHolder) {
        alert('This game is locked. Connect your wallet and hold 1M+ $asdfasdfa to unlock all games!');
        return;
    }

    document.getElementById(`modal-${gameId}`).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeGame(gameId) {
    if (!isValidGameId(gameId)) return;

    const modal = document.getElementById(`modal-${gameId}`);
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';

    const overlay = document.getElementById(`overlay-${gameId}`);
    if (overlay) overlay.classList.remove('hidden');

    const arena = document.getElementById(`arena-${gameId}`);
    if (arena) arena.innerHTML = '';

    stopGame(gameId);
}

function playFeaturedGame() {
    const game = getCurrentGame();
    openGame(game.id);
}

function scrollToGames() {
    document.getElementById('games-section').scrollIntoView({ behavior: 'smooth' });
}

function restartGame(gameId) {
    if (!isValidGameId(gameId)) return;

    stopGame(gameId);
    document.getElementById(`score-${gameId}`).textContent = '0';

    const gameOver = document.getElementById(`gameover-${gameId}`);
    if (gameOver) gameOver.remove();

    const arena = document.getElementById(`arena-${gameId}`);
    if (arena) arena.innerHTML = '';

    startGame(gameId);
}

// ============================================
// TICKET SYSTEM UI
// ============================================

function openBuyTickets() {
    document.getElementById('ticket-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeTicketModal() {
    document.getElementById('ticket-modal').classList.remove('active');
    document.body.style.overflow = '';
}

function isDevelopmentMode() {
    return CONFIG.TREASURY_WALLET === 'YOUR_TREASURY_WALLET_ADDRESS_HERE' ||
           CONFIG.ASDF_TOKEN_MINT === 'YOUR_TOKEN_MINT_ADDRESS_HERE' ||
           window.location.hostname === 'localhost';
}

async function simulatePayment(type, ticket) {
    console.warn('DEVELOPMENT MODE: Simulating payment. Configure wallet addresses for production.');

    const confirmed = confirm(
        `[DEV MODE] Simulated Payment\n\n` +
        `Ticket: ${ticket.name}\n` +
        `Price: ${ticket.priceSOL} SOL\n\n` +
        `Note: Configure TREASURY_WALLET and ASDF_TOKEN_MINT for real payments.\n\n` +
        `Click OK to simulate successful payment.`
    );

    if (!confirmed) return null;

    const mockSig = Array.from({ length: 88 }, () =>
        '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[Math.floor(Math.random() * 58)]
    ).join('');

    return mockSig;
}

async function buyTicket(type) {
    const ticket = TICKET_TYPES[type];
    if (!ticket) return;

    if (!appState.wallet) {
        alert('Please connect your wallet first!');
        return;
    }

    const provider = getPhantomProvider();
    if (!provider) {
        alert('Phantom wallet not found!');
        return;
    }

    if (typeof solanaWeb3 === 'undefined') {
        alert('Solana Web3 not loaded. Please refresh the page.');
        return;
    }

    try {
        const buyBtn = document.querySelector(`[data-action="buy-ticket"][data-ticket="${type}"]`);
        if (buyBtn) {
            buyBtn.disabled = true;
            buyBtn.textContent = 'Processing...';
        }

        const confirmed = confirm(
            `Purchase ${ticket.name}\n\n` +
            `Price: ${ticket.priceSOL} SOL\n` +
            `Duration: ${ticket.description}\n\n` +
            `Click OK to proceed with payment.`
        );

        if (!confirmed) {
            throw new Error('Payment cancelled');
        }

        if (buyBtn) {
            buyBtn.textContent = 'Awaiting wallet...';
        }

        let transactionSignature;

        if (CONFIG.DEV_MODE) {
            console.log('[DEV MODE] Simulating payment for', type);
            transactionSignature = await simulatePayment(type, ticket);
            if (!transactionSignature) {
                throw new Error('Payment cancelled');
            }
        } else {
            try {
                transactionSignature = await SolanaPayment.transferSOL(ticket.priceSOL);
            } catch (paymentError) {
                if (paymentError.message.includes('User rejected') ||
                    paymentError.message.includes('cancelled')) {
                    throw new Error('Transaction cancelled by user');
                }
                throw paymentError;
            }
        }

        if (buyBtn) {
            buyBtn.textContent = 'Confirming...';
        }

        const result = await ApiClient.purchaseTicket(type, transactionSignature);

        if (result.success) {
            appState.activeTicket = {
                type: type,
                expiresAt: new Date(result.ticket.expiresAt).getTime(),
                remainingTime: new Date(result.ticket.expiresAt).getTime() - Date.now(),
                isActive: false
            };
            saveState();
            closeTicketModal();

            if (type === 'donator') {
                if (result.ticket.bonusSlot) {
                    openPackAnimation(true);
                } else {
                    openPackAnimation(false);
                }
            } else {
                updateTicketUI();
                alert(`${result.message}\n\nTransaction: ${transactionSignature.slice(0, 20)}...`);
            }
        }
    } catch (error) {
        console.error('Ticket purchase failed:', error);
        alert(`Purchase failed: ${error.message}`);
    } finally {
        const buyBtn = document.querySelector(`[data-action="buy-ticket"][data-ticket="${type}"]`);
        if (buyBtn) {
            buyBtn.disabled = false;
            buyBtn.textContent = `Buy ${ticket.name}`;
        }
    }
}

function updateTicketUI() {
    const ticketInfo = document.getElementById('ticket-info');
    const ticketBar = document.getElementById('tickets-bar');

    if (appState.activeTicket) {
        const ticket = appState.activeTicket;
        const ticketType = TICKET_TYPES[ticket.type];

        ticketBar.style.display = 'flex';

        if (ticket.type === 'standard') {
            const remaining = Math.max(0, ticket.expiresAt - Date.now());
            if (remaining <= 0) {
                appState.activeTicket = null;
                saveState();
                updateTicketUI();
                return;
            }
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            document.getElementById('ticket-count').innerHTML = `<span style="color: var(--gold);">${ticketType.icon} ${mins}:${secs.toString().padStart(2, '0')}</span>`;
        } else if (ticket.type === 'premium') {
            const mins = Math.floor(ticket.remainingTime / 60000);
            document.getElementById('ticket-count').innerHTML = `<span style="color: var(--purple);">${ticketType.icon} ${mins} min left</span>`;
        } else if (ticket.type === 'donator') {
            const days = Math.floor((ticket.expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
            document.getElementById('ticket-count').innerHTML = `<span style="color: var(--gold);">${ticketType.icon} ${days}d left</span>`;
        }
    } else {
        document.getElementById('ticket-count').textContent = 'No active ticket';
    }
}

// Timer for standard ticket
setInterval(() => {
    if (appState.activeTicket && appState.activeTicket.type === 'standard') {
        updateTicketUI();
    }
}, 1000);

let premiumTimerInterval = null;

function startPremiumTimer(gameId) {
    if (appState.activeTicket && appState.activeTicket.type === 'premium') {
        appState.activeTicket.isActive = true;
        document.getElementById(`timer-stat-${gameId}`).style.display = 'block';

        premiumTimerInterval = setInterval(() => {
            if (appState.activeTicket && appState.activeTicket.remainingTime > 0) {
                appState.activeTicket.remainingTime -= 1000;
                const mins = Math.floor(appState.activeTicket.remainingTime / 60000);
                const secs = Math.floor((appState.activeTicket.remainingTime % 60000) / 1000);
                document.getElementById(`timer-${gameId}`).textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

                if (appState.activeTicket.remainingTime <= 0) {
                    appState.activeTicket = null;
                    saveState();
                    clearInterval(premiumTimerInterval);
                    alert('Your premium ticket has expired!');
                }
            }
        }, 1000);
    }
}

function stopPremiumTimer(gameId) {
    if (premiumTimerInterval) {
        clearInterval(premiumTimerInterval);
        premiumTimerInterval = null;
    }
    if (appState.activeTicket) {
        appState.activeTicket.isActive = false;
        saveState();
    }
    const timerStat = document.getElementById(`timer-stat-${gameId}`);
    if (timerStat) timerStat.style.display = 'none';
}

// ============================================
// PACK OPENING ANIMATION
// ============================================

function openPackAnimation() {
    const modal = document.getElementById('pack-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const packCard = document.getElementById('pack-card');
    const packResult = document.getElementById('pack-result');

    packCard.style.display = 'block';
    packResult.style.display = 'none';
    packCard.classList.remove('flip');

    packCard.onclick = () => {
        packCard.classList.add('flip');

        setTimeout(() => {
            packCard.style.display = 'none';
            packResult.style.display = 'flex';

            const won = Math.random() < TICKET_TYPES.donator.bonusChance;

            if (won) {
                packResult.innerHTML = `
                    <div class="pack-win">
                        <div style="font-size: 80px; animation: bounce 0.5s infinite;">🎉</div>
                        <h2 style="color: var(--gold); font-family: var(--font-display);">WINNER!</h2>
                        <p>You won +1 BONUS AIRDROP SLOT!</p>
                        <p style="color: var(--text-muted); font-size: 12px;">This slot is added to your weekly earnings</p>
                    </div>
                `;
                appState.bonusAirdropSlots = (appState.bonusAirdropSlots || 0) + 1;
                saveState();
            } else {
                packResult.innerHTML = `
                    <div class="pack-lose">
                        <div style="font-size: 80px;">😔</div>
                        <h2 style="color: var(--text-muted); font-family: var(--font-display);">No Bonus</h2>
                        <p>Better luck next time!</p>
                        <p style="color: var(--text-muted); font-size: 12px;">You still have full week competitive access</p>
                    </div>
                `;
            }
        }, 600);
    };
}

function closePackModal() {
    document.getElementById('pack-modal').classList.remove('active');
    document.body.style.overflow = '';
    updateTicketUI();
}

function toggleCompetitive(gameId) {
    if (!appState.activeTicket && !testMode) {
        openBuyTickets();
        return;
    }

    const practiceBtn = document.getElementById(`practice-btn-${gameId}`);
    const competitiveBtn = document.getElementById(`competitive-btn-${gameId}`);

    if (competitiveBtn.classList.contains('active')) {
        competitiveBtn.classList.remove('active');
        practiceBtn.classList.add('active');
        stopPremiumTimer(gameId);
    } else {
        practiceBtn.classList.remove('active');
        competitiveBtn.classList.add('active');
        if (appState.activeTicket && appState.activeTicket.type === 'premium') {
            startPremiumTimer(gameId);
        }
    }
}

function hasCompetitiveAccess() {
    if (testMode) return true;
    if (!appState.activeTicket) return false;

    const ticket = appState.activeTicket;
    if (ticket.type === 'standard') {
        return ticket.expiresAt > Date.now();
    } else if (ticket.type === 'premium') {
        return ticket.remainingTime > 0;
    } else if (ticket.type === 'donator') {
        return ticket.expiresAt > Date.now();
    }
    return false;
}
