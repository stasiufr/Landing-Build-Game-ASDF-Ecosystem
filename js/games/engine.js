/**
 * ASDF Games - Game Engine
 * Core game logic and implementations
 */

'use strict';

let activeGames = {};
const activeGameModes = {};

/**
 * Sanitize number for security
 */
function sanitizeNumber(value, min, max, defaultValue) {
    const num = Number(value);
    if (!Number.isFinite(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
}

function startGame(gameId) {
    if (!isValidGameId(gameId)) return;

    const overlay = document.getElementById(`overlay-${gameId}`);
    if (overlay) overlay.classList.add('hidden');

    requestAnimationFrame(() => {
        initializeGame(gameId);
    });
}

function initializeGame(gameId) {
    switch(gameId) {
        case 'burnrunner':
            startBurnRunner(gameId);
            break;
        case 'scamblaster':
            startScamBlaster(gameId);
            break;
        case 'hodlhero':
            startHodlHero(gameId);
            break;
        case 'cryptoheist':
            startCryptoHeist(gameId);
            break;
        case 'pumparena':
            startPumpArena(gameId);
            break;
        case 'rugpull':
            startRugPull(gameId);
            break;
        case 'whalewatch':
            startWhaleWatch(gameId);
            break;
        case 'stakestacker':
            startStakeStacker(gameId);
            break;
        case 'dexdash':
            startDexDash(gameId);
            break;
        case 'burnorhold':
            startBurnOrHold(gameId);
            break;
        default:
            console.log('Game not implemented:', gameId);
    }
}

function stopGame(gameId) {
    if (activeGames[gameId]) {
        if (activeGames[gameId].interval) {
            clearInterval(activeGames[gameId].interval);
        }
        if (activeGames[gameId].cleanup) {
            activeGames[gameId].cleanup();
        }
        delete activeGames[gameId];
    }
}

function updateScore(gameId, score) {
    const scoreEl = document.getElementById(`score-${gameId}`);
    if (scoreEl) scoreEl.textContent = score;

    if (score > (appState.practiceScores[gameId] || 0)) {
        appState.practiceScores[gameId] = score;
        const bestEl = document.getElementById(`best-${gameId}`);
        if (bestEl) bestEl.textContent = score;
        saveState();
    }
}

async function endGame(gameId, finalScore) {
    if (!isValidGameId(gameId)) return;

    const safeScore = sanitizeNumber(finalScore, 0, 999999999, 0);
    updateScore(gameId, safeScore);
    stopGame(gameId);

    const isCompetitive = activeGameModes[gameId] === 'competitive';

    let apiResult = null;
    let submitError = null;

    if (appState.wallet) {
        try {
            apiResult = await ApiClient.submitScore(gameId, safeScore, isCompetitive);
            if (apiResult.isNewBest) {
                appState.practiceScores[gameId] = apiResult.bestScore;
                saveState();
                document.getElementById(`best-${gameId}`).textContent = apiResult.bestScore;
            }
        } catch (error) {
            console.error('Failed to submit score:', error);
            submitError = error.message;
            if (safeScore > (appState.practiceScores[gameId] || 0)) {
                appState.practiceScores[gameId] = safeScore;
                saveState();
            }
        }
    } else {
        if (safeScore > (appState.practiceScores[gameId] || 0)) {
            appState.practiceScores[gameId] = safeScore;
            saveState();
        }
    }

    const arena = document.getElementById(`arena-${gameId}`);
    if (arena) {
        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = `gameover-${gameId}`;
        gameOverDiv.style.cssText = `
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.85);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 15px;
            z-index: 1000;
        `;

        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-size: 32px; font-weight: bold; color: var(--accent-bright);';
        titleDiv.textContent = 'GAME OVER';

        const scoreDiv = document.createElement('div');
        scoreDiv.style.cssText = 'font-size: 24px; color: var(--gold);';
        scoreDiv.textContent = `Score: ${safeScore.toLocaleString()}`;

        if (apiResult?.isNewBest) {
            const newBestDiv = document.createElement('div');
            newBestDiv.style.cssText = 'font-size: 18px; color: var(--green); animation: pulse 0.5s infinite;';
            newBestDiv.textContent = '🎉 NEW BEST SCORE!';
            gameOverDiv.appendChild(titleDiv);
            gameOverDiv.appendChild(newBestDiv);
        } else {
            gameOverDiv.appendChild(titleDiv);
        }

        gameOverDiv.appendChild(scoreDiv);

        if (isCompetitive && apiResult?.rank) {
            const rankDiv = document.createElement('div');
            rankDiv.style.cssText = 'font-size: 16px; color: var(--purple);';
            rankDiv.textContent = `Weekly Rank: #${apiResult.rank}`;
            gameOverDiv.appendChild(rankDiv);
        }

        if (submitError) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'font-size: 12px; color: var(--text-muted);';
            errorDiv.textContent = `(Score saved locally - ${submitError})`;
            gameOverDiv.appendChild(errorDiv);
        }

        const restartBtn = document.createElement('button');
        restartBtn.className = 'btn btn-primary';
        restartBtn.style.marginTop = '10px';
        restartBtn.textContent = 'PLAY AGAIN';
        restartBtn.addEventListener('click', () => restartGame(gameId));

        gameOverDiv.appendChild(restartBtn);
        arena.appendChild(gameOverDiv);
    }
}

// ============================================
// GAME IMPLEMENTATIONS - Placeholder stubs
// Full implementations are in games-impl.js
// ============================================

function startBurnRunner(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);
    arena.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gold);">Loading Burn Runner...</div>';

    // Game will be implemented in games-impl.js
    if (typeof _startBurnRunner === 'function') {
        _startBurnRunner(gameId);
    }
}

function startScamBlaster(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);
    arena.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gold);">Loading Scam Blaster...</div>';

    if (typeof _startScamBlaster === 'function') {
        _startScamBlaster(gameId);
    }
}

function startHodlHero(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);
    arena.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gold);">Coming Soon...</div>';
}

function startCryptoHeist(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);
    arena.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gold);">Coming Soon...</div>';
}

function startPumpArena(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);
    arena.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gold);">Loading Pump Arena...</div>';

    if (typeof _startPumpArena === 'function') {
        _startPumpArena(gameId);
    }
}

function startRugPull(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);
    arena.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gold);">Coming Soon...</div>';
}

function startWhaleWatch(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);
    arena.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gold);">Coming Soon...</div>';
}

function startStakeStacker(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);
    arena.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gold);">Coming Soon...</div>';
}

function startDexDash(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);
    arena.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gold);">Coming Soon...</div>';
}

function startBurnOrHold(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);
    arena.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gold);">Coming Soon...</div>';
}

// Pump Arena betting
let currentBetId = null;
let pumpArenaMode = 'classic';

function openPumpArena(mode = 'classic') {
    pumpArenaMode = mode;
    if (mode === 'betting') {
        document.getElementById('pumparena-overlay').innerHTML = `
            <div style="text-align: center;">
                <h3 style="color: var(--gold);">💰 BETTING MODE</h3>
                <p>Bet your $ASDFASDFA tokens!</p>
            </div>
        `;
    }
    openGame('pumparena');
}

function updatePumpBetButton() {
    const btn = document.getElementById('pump-bet-btn');
    if (btn) {
        if (appState.wallet && appState.isHolder) {
            btn.disabled = false;
            btn.textContent = 'BET $ASDFASDFA';
        } else if (appState.wallet) {
            btn.disabled = true;
            btn.textContent = 'NEED 1M+ TOKENS';
        } else {
            btn.disabled = true;
            btn.textContent = 'CONNECT WALLET';
        }
    }
}
