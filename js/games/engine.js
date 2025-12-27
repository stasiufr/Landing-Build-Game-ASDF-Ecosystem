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

    // Game state
    const state = {
        score: 0,
        distance: 0,
        tokens: 0,
        speed: 5,
        gravity: 0.6,
        jumpForce: -12,
        isJumping: false,
        gameOver: false,
        player: { x: 80, y: 0, vy: 0, width: 40, height: 50 },
        ground: 0,
        obstacles: [],
        collectibles: [],
        particles: [],
        lastObstacle: 0,
        lastCollectible: 0
    };

    // Render game UI
    arena.innerHTML = `
        <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#1a0a2e 0%,#2d1b4e 50%,#1a1a2e 100%);">
            <canvas id="br-canvas" style="width:100%;height:100%;"></canvas>
            <div style="position:absolute;top:15px;left:15px;display:flex;gap:20px;">
                <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--text-muted);font-size:12px;">DISTANCE</span>
                    <div style="color:var(--gold);font-size:20px;font-weight:bold;" id="br-distance">0m</div>
                </div>
                <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--text-muted);font-size:12px;">TOKENS BURNED</span>
                    <div style="color:var(--accent-fire);font-size:20px;font-weight:bold;" id="br-tokens">0 🔥</div>
                </div>
            </div>
            <div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:12px;">
                SPACE or CLICK to jump
            </div>
        </div>
    `;

    const canvas = document.getElementById('br-canvas');
    const ctx = canvas.getContext('2d');
    const distanceEl = document.getElementById('br-distance');
    const tokensEl = document.getElementById('br-tokens');

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        state.ground = canvas.height - 60;
        state.player.y = state.ground - state.player.height;
    }
    resizeCanvas();

    const obstacleTypes = [
        { icon: '💀', name: 'SCAM', width: 35, height: 45 },
        { icon: '🔴', name: 'RUG', width: 40, height: 35 },
        { icon: '📉', name: 'FUD', width: 35, height: 40 },
        { icon: '🦠', name: 'VIRUS', width: 30, height: 35 }
    ];

    function jump() {
        if (state.gameOver) return;
        if (state.player.y >= state.ground - state.player.height - 5) {
            state.player.vy = state.jumpForce;
            state.isJumping = true;
        }
    }

    function spawnObstacle() {
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        state.obstacles.push({
            x: canvas.width + 50,
            y: state.ground - type.height,
            ...type
        });
    }

    function spawnCollectible() {
        const height = 30 + Math.random() * 80;
        state.collectibles.push({
            x: canvas.width + 50,
            y: state.ground - height - 25,
            width: 25,
            height: 25,
            icon: '🪙'
        });
    }

    function addBurnParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            state.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 4 - 2,
                life: 30,
                icon: ['🔥', '✨', '💫'][Math.floor(Math.random() * 3)]
            });
        }
    }

    function checkCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    function update() {
        if (state.gameOver) return;

        // Update distance and speed
        state.distance += state.speed * 0.1;
        state.speed = Math.min(15, 5 + state.distance * 0.002);

        // Player physics
        state.player.vy += state.gravity;
        state.player.y += state.player.vy;

        if (state.player.y >= state.ground - state.player.height) {
            state.player.y = state.ground - state.player.height;
            state.player.vy = 0;
            state.isJumping = false;
        }

        // Spawn obstacles
        if (state.distance - state.lastObstacle > 80 + Math.random() * 60) {
            spawnObstacle();
            state.lastObstacle = state.distance;
        }

        // Spawn collectibles
        if (state.distance - state.lastCollectible > 40 + Math.random() * 30) {
            spawnCollectible();
            state.lastCollectible = state.distance;
        }

        // Update obstacles
        state.obstacles = state.obstacles.filter(obs => {
            obs.x -= state.speed;

            if (checkCollision(state.player, obs)) {
                state.gameOver = true;
                const finalScore = Math.floor(state.distance) + state.tokens * 10;
                endGame(gameId, finalScore);
            }

            return obs.x > -50;
        });

        // Update collectibles
        state.collectibles = state.collectibles.filter(col => {
            col.x -= state.speed;

            if (checkCollision(state.player, col)) {
                state.tokens++;
                addBurnParticles(col.x, col.y);
                return false;
            }

            return col.x > -50;
        });

        // Update particles
        state.particles = state.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life--;
            return p.life > 0;
        });

        // Update UI
        distanceEl.textContent = Math.floor(state.distance) + 'm';
        tokensEl.textContent = state.tokens + ' 🔥';
        state.score = Math.floor(state.distance) + state.tokens * 10;
        updateScore(gameId, state.score);
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw ground
        ctx.fillStyle = '#3d2b5a';
        ctx.fillRect(0, state.ground, canvas.width, 60);

        // Draw blockchain pattern on ground
        ctx.strokeStyle = '#5a4080';
        ctx.lineWidth = 1;
        const offset = (state.distance * 5) % 40;
        for (let x = -offset; x < canvas.width; x += 40) {
            ctx.strokeRect(x, state.ground + 5, 35, 15);
        }

        // Draw player
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const playerCenterX = state.player.x + state.player.width / 2;
        const playerCenterY = state.player.y + state.player.height / 2;

        // Player shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(playerCenterX, state.ground + 5, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Running animation
        const bounce = state.isJumping ? 0 : Math.sin(state.distance * 0.3) * 3;
        ctx.fillText('🏃', playerCenterX, playerCenterY + bounce);

        // Trail effect when running fast
        if (state.speed > 8) {
            ctx.globalAlpha = 0.3;
            ctx.fillText('🏃', playerCenterX - 20, playerCenterY + bounce);
            ctx.globalAlpha = 0.15;
            ctx.fillText('🏃', playerCenterX - 40, playerCenterY + bounce);
            ctx.globalAlpha = 1;
        }

        // Draw obstacles
        ctx.font = '35px Arial';
        state.obstacles.forEach(obs => {
            ctx.fillText(obs.icon, obs.x + obs.width / 2, obs.y + obs.height / 2);
        });

        // Draw collectibles
        ctx.font = '25px Arial';
        state.collectibles.forEach(col => {
            // Floating animation
            const float = Math.sin(Date.now() * 0.005 + col.x) * 5;
            ctx.fillText(col.icon, col.x + col.width / 2, col.y + col.height / 2 + float);
        });

        // Draw particles
        ctx.font = '16px Arial';
        state.particles.forEach(p => {
            ctx.globalAlpha = p.life / 30;
            ctx.fillText(p.icon, p.x, p.y);
        });
        ctx.globalAlpha = 1;
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    // Event listeners
    function handleInput(e) {
        if (e.type === 'keydown' && e.code !== 'Space') return;
        e.preventDefault();
        jump();
    }

    document.addEventListener('keydown', handleInput);
    canvas.addEventListener('click', handleInput);
    canvas.addEventListener('touchstart', handleInput);

    // Start game loop
    gameLoop();

    activeGames[gameId] = {
        cleanup: () => {
            state.gameOver = true;
            document.removeEventListener('keydown', handleInput);
            canvas.removeEventListener('click', handleInput);
            canvas.removeEventListener('touchstart', handleInput);
        }
    };
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

    // Game state
    const state = {
        multiplier: 1.00,
        speed: 0.02,
        warnings: 0,
        maxWarnings: 5,
        isRugged: false,
        hasWithdrawn: false,
        round: 1,
        totalScore: 0,
        rugTime: 3000 + Math.random() * 7000, // Rug between 3-10 seconds
        startTime: Date.now(),
        warningTypes: [
            { icon: '🚩', text: 'Dev wallet moving!' },
            { icon: '🐋', text: 'Whale dumping!' },
            { icon: '📉', text: 'Liquidity dropping!' },
            { icon: '🔓', text: 'LP unlocked!' },
            { icon: '💀', text: 'Honeypot detected!' },
            { icon: '🏃', text: 'Team going quiet!' }
        ],
        activeWarnings: []
    };

    // Render game UI
    arena.innerHTML = `
        <div style="width:100%;height:100%;display:flex;flex-direction:column;padding:20px;box-sizing:border-box;background:linear-gradient(180deg,#1a1a2e 0%,#0f0f1a 100%);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <div style="font-size:14px;color:var(--text-muted);">Round <span id="rp-round">1</span>/5</div>
                <div style="font-size:14px;color:var(--gold);">Total: <span id="rp-total">0</span></div>
            </div>

            <div style="text-align:center;margin-bottom:20px;">
                <div style="font-size:48px;font-weight:bold;color:var(--green);font-family:var(--font-mono);" id="rp-multiplier">1.00x</div>
                <div style="font-size:14px;color:var(--text-muted);">Current Multiplier</div>
            </div>

            <div id="rp-chart" style="flex:1;background:rgba(0,0,0,0.3);border-radius:8px;position:relative;overflow:hidden;margin-bottom:15px;min-height:120px;">
                <canvas id="rp-canvas" style="width:100%;height:100%;"></canvas>
            </div>

            <div id="rp-warnings" style="min-height:60px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:15px;"></div>

            <button id="rp-withdraw" class="btn btn-primary" style="width:100%;padding:15px;font-size:18px;font-weight:bold;">
                💰 WITHDRAW (1.00x)
            </button>
        </div>
    `;

    const canvas = document.getElementById('rp-canvas');
    const ctx = canvas.getContext('2d');
    const multiplierEl = document.getElementById('rp-multiplier');
    const withdrawBtn = document.getElementById('rp-withdraw');
    const warningsEl = document.getElementById('rp-warnings');
    const roundEl = document.getElementById('rp-round');
    const totalEl = document.getElementById('rp-total');

    // Chart data
    const chartData = [1];

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    resizeCanvas();

    function drawChart() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (chartData.length < 2) return;

        const maxVal = Math.max(...chartData) * 1.1;
        const step = canvas.width / (chartData.length - 1);

        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = state.isRugged ? '#ef4444' : '#22c55e';
        ctx.lineWidth = 3;

        chartData.forEach((val, i) => {
            const x = i * step;
            const y = canvas.height - (val / maxVal) * canvas.height * 0.9;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Fill under line
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fillStyle = state.isRugged ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)';
        ctx.fill();
    }

    function addWarning() {
        if (state.warnings >= state.maxWarnings || state.isRugged || state.hasWithdrawn) return;

        const warning = state.warningTypes[Math.floor(Math.random() * state.warningTypes.length)];
        state.warnings++;
        state.activeWarnings.push(warning);

        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = 'background:rgba(239,68,68,0.2);border:1px solid #ef4444;padding:6px 12px;border-radius:6px;font-size:12px;animation:pulse 0.5s;';
        warningDiv.innerHTML = `${warning.icon} ${warning.text}`;
        warningsEl.appendChild(warningDiv);

        // Increase rug probability with each warning
        state.speed += 0.01;
    }

    function triggerRug() {
        state.isRugged = true;
        state.multiplier = 0;

        multiplierEl.textContent = '0.00x';
        multiplierEl.style.color = '#ef4444';
        withdrawBtn.disabled = true;
        withdrawBtn.textContent = '💀 RUGGED!';
        withdrawBtn.style.background = '#ef4444';

        // Crash the chart
        for (let i = 0; i < 10; i++) {
            chartData.push(chartData[chartData.length - 1] * 0.5);
        }
        drawChart();

        setTimeout(() => endRound(0), 1500);
    }

    function withdraw() {
        if (state.isRugged || state.hasWithdrawn) return;

        state.hasWithdrawn = true;
        const roundScore = Math.floor(state.multiplier * 100);

        withdrawBtn.disabled = true;
        withdrawBtn.textContent = `✅ SECURED ${state.multiplier.toFixed(2)}x!`;
        withdrawBtn.style.background = '#22c55e';

        setTimeout(() => endRound(roundScore), 1000);
    }

    function endRound(roundScore) {
        state.totalScore += roundScore;
        totalEl.textContent = state.totalScore;

        if (state.round >= 5) {
            // Game over
            endGame(gameId, state.totalScore);
        } else {
            // Next round
            state.round++;
            state.multiplier = 1.00;
            state.speed = 0.02 + (state.round * 0.005);
            state.warnings = 0;
            state.isRugged = false;
            state.hasWithdrawn = false;
            state.rugTime = 2000 + Math.random() * (8000 - state.round * 500);
            state.startTime = Date.now();
            state.activeWarnings = [];
            chartData.length = 0;
            chartData.push(1);

            roundEl.textContent = state.round;
            multiplierEl.textContent = '1.00x';
            multiplierEl.style.color = '#22c55e';
            withdrawBtn.disabled = false;
            withdrawBtn.textContent = '💰 WITHDRAW (1.00x)';
            withdrawBtn.style.background = '';
            warningsEl.innerHTML = '';
        }
    }

    withdrawBtn.addEventListener('click', withdraw);

    // Game loop
    const interval = setInterval(() => {
        if (state.isRugged || state.hasWithdrawn) return;

        const elapsed = Date.now() - state.startTime;

        // Increase multiplier
        state.multiplier += state.speed;
        state.speed += 0.001;

        chartData.push(state.multiplier);
        if (chartData.length > 100) chartData.shift();

        multiplierEl.textContent = state.multiplier.toFixed(2) + 'x';
        withdrawBtn.textContent = `💰 WITHDRAW (${state.multiplier.toFixed(2)}x)`;

        // Color changes based on risk
        if (state.multiplier > 5) {
            multiplierEl.style.color = '#f59e0b';
        }
        if (state.multiplier > 10) {
            multiplierEl.style.color = '#ef4444';
        }

        drawChart();

        // Random warnings
        if (Math.random() < 0.02 + (state.multiplier * 0.005)) {
            addWarning();
        }

        // Check for rug
        if (elapsed > state.rugTime || state.warnings >= state.maxWarnings) {
            triggerRug();
        }
    }, 50);

    activeGames[gameId] = {
        interval,
        cleanup: () => {
            clearInterval(interval);
        }
    };
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
