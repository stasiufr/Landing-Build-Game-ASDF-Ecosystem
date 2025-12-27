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

    const state = {
        score: 0,
        lives: 3,
        wave: 1,
        gameOver: false,
        crosshair: { x: 0, y: 0 },
        enemies: [],
        explosions: [],
        spawnTimer: 0,
        spawnRate: 60,
        enemySpeed: 2
    };

    const enemyTypes = [
        { icon: '🪙', name: 'SCAM COIN', points: 10, speed: 1, size: 35 },
        { icon: '🔴', name: 'RUG TOKEN', points: 25, speed: 1.5, size: 40 },
        { icon: '💀', name: 'HONEYPOT', points: 50, speed: 2, size: 45 },
        { icon: '🦠', name: 'MALWARE', points: 75, speed: 2.5, size: 35 },
        { icon: '👤', name: 'FAKE DEV', points: 100, speed: 1.2, size: 50 }
    ];

    arena.innerHTML = `
        <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#0a0a1a 0%,#1a1a3a 100%);cursor:crosshair;">
            <canvas id="sb-canvas" style="width:100%;height:100%;"></canvas>
            <div style="position:absolute;top:15px;left:15px;display:flex;gap:20px;">
                <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--text-muted);font-size:12px;">SCORE</span>
                    <div style="color:var(--gold);font-size:20px;font-weight:bold;" id="sb-score">0</div>
                </div>
                <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--text-muted);font-size:12px;">WAVE</span>
                    <div style="color:var(--purple);font-size:20px;font-weight:bold;" id="sb-wave">1</div>
                </div>
            </div>
            <div style="position:absolute;top:15px;right:15px;" id="sb-lives">❤️❤️❤️</div>
            <div style="position:absolute;bottom:60px;left:50%;transform:translateX(-50%);width:80%;height:60px;background:linear-gradient(90deg,rgba(139,92,246,0.3),rgba(251,191,36,0.3));border:2px solid var(--gold);border-radius:8px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:24px;">💼</span>
                <span style="margin-left:10px;color:var(--gold);">YOUR WALLET</span>
            </div>
        </div>
    `;

    const canvas = document.getElementById('sb-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('sb-score');
    const waveEl = document.getElementById('sb-wave');
    const livesEl = document.getElementById('sb-lives');

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    resizeCanvas();

    const walletZone = { y: canvas.height - 120, height: 60 };

    function spawnEnemy() {
        const type = enemyTypes[Math.min(Math.floor(Math.random() * (state.wave + 1)), enemyTypes.length - 1)];
        state.enemies.push({
            x: Math.random() * (canvas.width - 60) + 30,
            y: -50,
            vy: type.speed * state.enemySpeed,
            ...type
        });
    }

    function shoot(x, y) {
        if (state.gameOver) return;

        let hit = false;
        state.enemies = state.enemies.filter(enemy => {
            const dx = x - enemy.x;
            const dy = y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < enemy.size) {
                state.score += enemy.points;
                hit = true;
                state.explosions.push({ x: enemy.x, y: enemy.y, life: 20, icon: '💥' });
                return false;
            }
            return true;
        });

        if (!hit) {
            state.explosions.push({ x, y, life: 10, icon: '💨' });
        }
    }

    function update() {
        if (state.gameOver) return;

        state.spawnTimer++;
        if (state.spawnTimer >= state.spawnRate) {
            spawnEnemy();
            state.spawnTimer = 0;
        }

        // Update enemies
        state.enemies = state.enemies.filter(enemy => {
            enemy.y += enemy.vy;

            // Hit wallet
            if (enemy.y > walletZone.y) {
                state.lives--;
                state.explosions.push({ x: enemy.x, y: enemy.y, life: 25, icon: '💔' });
                livesEl.textContent = '❤️'.repeat(Math.max(0, state.lives));

                if (state.lives <= 0) {
                    state.gameOver = true;
                    endGame(gameId, state.score);
                }
                return false;
            }
            return true;
        });

        // Wave progression
        if (state.score >= state.wave * 500) {
            state.wave++;
            state.spawnRate = Math.max(20, 60 - state.wave * 5);
            state.enemySpeed = 2 + state.wave * 0.3;
            waveEl.textContent = state.wave;
        }

        // Update explosions
        state.explosions = state.explosions.filter(exp => {
            exp.life--;
            return exp.life > 0;
        });

        scoreEl.textContent = state.score;
        updateScore(gameId, state.score);
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw enemies
        ctx.font = '35px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        state.enemies.forEach(enemy => {
            ctx.fillText(enemy.icon, enemy.x, enemy.y);
        });

        // Draw explosions
        state.explosions.forEach(exp => {
            ctx.globalAlpha = exp.life / 25;
            const scale = 1 + (25 - exp.life) * 0.05;
            ctx.font = `${30 * scale}px Arial`;
            ctx.fillText(exp.icon, exp.x, exp.y);
        });
        ctx.globalAlpha = 1;

        // Draw crosshair
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(state.crosshair.x, state.crosshair.y, 15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(state.crosshair.x - 20, state.crosshair.y);
        ctx.lineTo(state.crosshair.x + 20, state.crosshair.y);
        ctx.moveTo(state.crosshair.x, state.crosshair.y - 20);
        ctx.lineTo(state.crosshair.x, state.crosshair.y + 20);
        ctx.stroke();
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    function handleMove(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        state.crosshair.x = x * (canvas.width / rect.width);
        state.crosshair.y = y * (canvas.height / rect.height);
    }

    function handleClick(e) {
        handleMove(e);
        shoot(state.crosshair.x, state.crosshair.y);
    }

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchmove', handleMove);
    canvas.addEventListener('touchstart', handleClick);

    gameLoop();

    activeGames[gameId] = {
        cleanup: () => {
            state.gameOver = true;
            canvas.removeEventListener('mousemove', handleMove);
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('touchmove', handleMove);
            canvas.removeEventListener('touchstart', handleClick);
        }
    };
}

function startHodlHero(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    const state = {
        score: 0,
        coins: 50,
        health: 100,
        wave: 1,
        gameOver: false,
        towers: [],
        enemies: [],
        projectiles: [],
        effects: [],
        waveTimer: 0,
        enemiesInWave: 0,
        spawned: 0
    };

    const towerTypes = [
        { id: 'basic', icon: '🔫', name: 'Laser', cost: 25, damage: 10, range: 100, rate: 30, color: '#22c55e' },
        { id: 'slow', icon: '❄️', name: 'Freeze', cost: 40, damage: 5, range: 80, rate: 45, color: '#3b82f6', slow: 0.5 },
        { id: 'aoe', icon: '💣', name: 'Bomb', cost: 60, damage: 25, range: 60, rate: 90, color: '#f59e0b', aoe: 50 }
    ];

    const enemyTypes = [
        { icon: '📉', name: 'FUD', hp: 30, speed: 1.5, reward: 10 },
        { icon: '🐻', name: 'BEAR', hp: 60, speed: 1, reward: 20 },
        { icon: '💀', name: 'SCAMMER', hp: 100, speed: 0.8, reward: 35 },
        { icon: '🐋', name: 'WHALE', hp: 200, speed: 0.5, reward: 75 }
    ];

    arena.innerHTML = `
        <div style="width:100%;height:100%;position:relative;overflow:hidden;background:#1a1a2e;">
            <canvas id="hh-canvas" style="width:100%;height:100%;"></canvas>
            <div style="position:absolute;top:10px;left:10px;display:flex;gap:15px;flex-wrap:wrap;">
                <div style="background:rgba(0,0,0,0.7);padding:6px 12px;border-radius:6px;">
                    <span style="color:var(--gold);">💰 <span id="hh-coins">50</span></span>
                </div>
                <div style="background:rgba(0,0,0,0.7);padding:6px 12px;border-radius:6px;">
                    <span style="color:var(--green);">💎 <span id="hh-health">100</span>%</span>
                </div>
                <div style="background:rgba(0,0,0,0.7);padding:6px 12px;border-radius:6px;">
                    <span style="color:var(--purple);">Wave <span id="hh-wave">1</span></span>
                </div>
            </div>
            <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:10px;" id="hh-shop"></div>
        </div>
    `;

    const canvas = document.getElementById('hh-canvas');
    const ctx = canvas.getContext('2d');
    const shopEl = document.getElementById('hh-shop');

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    resizeCanvas();

    // Create path
    const path = [];
    const pathPoints = [
        { x: 0, y: canvas.height * 0.3 },
        { x: canvas.width * 0.3, y: canvas.height * 0.3 },
        { x: canvas.width * 0.3, y: canvas.height * 0.7 },
        { x: canvas.width * 0.7, y: canvas.height * 0.7 },
        { x: canvas.width * 0.7, y: canvas.height * 0.4 },
        { x: canvas.width, y: canvas.height * 0.4 }
    ];

    // Build shop
    towerTypes.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.style.cssText = 'padding:8px 12px;font-size:12px;';
        btn.innerHTML = `${t.icon} ${t.cost}`;
        btn.onclick = () => selectTower(t);
        shopEl.appendChild(btn);
    });

    let selectedTower = null;
    let placingTower = false;
    let mousePos = { x: 0, y: 0 };

    function selectTower(type) {
        if (state.coins >= type.cost) {
            selectedTower = type;
            placingTower = true;
        }
    }

    function placeTower(x, y) {
        if (!selectedTower || state.coins < selectedTower.cost) return;

        state.towers.push({
            x, y,
            ...selectedTower,
            cooldown: 0
        });
        state.coins -= selectedTower.cost;
        document.getElementById('hh-coins').textContent = state.coins;
        placingTower = false;
        selectedTower = null;
    }

    function spawnEnemy() {
        const typeIndex = Math.min(Math.floor(Math.random() * (1 + state.wave * 0.5)), enemyTypes.length - 1);
        const type = enemyTypes[typeIndex];
        state.enemies.push({
            x: pathPoints[0].x,
            y: pathPoints[0].y,
            pathIndex: 0,
            hp: type.hp * (1 + state.wave * 0.2),
            maxHp: type.hp * (1 + state.wave * 0.2),
            speed: type.speed,
            slowTimer: 0,
            ...type
        });
    }

    function startWave() {
        state.enemiesInWave = 5 + state.wave * 2;
        state.spawned = 0;
        state.waveTimer = 0;
    }

    function update() {
        if (state.gameOver) return;

        // Spawn enemies
        state.waveTimer++;
        if (state.spawned < state.enemiesInWave && state.waveTimer % 40 === 0) {
            spawnEnemy();
            state.spawned++;
        }

        // Next wave
        if (state.spawned >= state.enemiesInWave && state.enemies.length === 0) {
            state.wave++;
            state.coins += 20 + state.wave * 5;
            document.getElementById('hh-wave').textContent = state.wave;
            document.getElementById('hh-coins').textContent = state.coins;
            startWave();
        }

        // Update enemies
        state.enemies = state.enemies.filter(enemy => {
            if (enemy.slowTimer > 0) enemy.slowTimer--;
            const speed = enemy.slowTimer > 0 ? enemy.speed * 0.5 : enemy.speed;

            const target = pathPoints[enemy.pathIndex + 1];
            if (!target) {
                state.health -= 10;
                document.getElementById('hh-health').textContent = state.health;
                if (state.health <= 0) {
                    state.gameOver = true;
                    endGame(gameId, state.score);
                }
                return false;
            }

            const dx = target.x - enemy.x;
            const dy = target.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < speed) {
                enemy.pathIndex++;
            } else {
                enemy.x += (dx / dist) * speed;
                enemy.y += (dy / dist) * speed;
            }

            return enemy.hp > 0;
        });

        // Tower shooting
        state.towers.forEach(tower => {
            if (tower.cooldown > 0) {
                tower.cooldown--;
                return;
            }

            const target = state.enemies.find(e => {
                const dx = e.x - tower.x;
                const dy = e.y - tower.y;
                return Math.sqrt(dx * dx + dy * dy) < tower.range;
            });

            if (target) {
                state.projectiles.push({
                    x: tower.x, y: tower.y,
                    tx: target.x, ty: target.y,
                    damage: tower.damage,
                    color: tower.color,
                    aoe: tower.aoe,
                    slow: tower.slow
                });
                tower.cooldown = tower.rate;
            }
        });

        // Update projectiles
        state.projectiles = state.projectiles.filter(p => {
            const dx = p.tx - p.x;
            const dy = p.ty - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 10) {
                if (p.aoe) {
                    state.enemies.forEach(e => {
                        const edx = e.x - p.tx;
                        const edy = e.y - p.ty;
                        if (Math.sqrt(edx * edx + edy * edy) < p.aoe) {
                            e.hp -= p.damage;
                            if (e.hp <= 0) {
                                state.score += e.reward;
                                state.coins += e.reward;
                            }
                        }
                    });
                    state.effects.push({ x: p.tx, y: p.ty, r: p.aoe, life: 15 });
                } else {
                    const hit = state.enemies.find(e => {
                        const edx = e.x - p.tx;
                        const edy = e.y - p.ty;
                        return Math.sqrt(edx * edx + edy * edy) < 25;
                    });
                    if (hit) {
                        hit.hp -= p.damage;
                        if (p.slow) hit.slowTimer = 60;
                        if (hit.hp <= 0) {
                            state.score += hit.reward;
                            state.coins += hit.reward;
                        }
                    }
                }
                return false;
            }

            p.x += (dx / dist) * 8;
            p.y += (dy / dist) * 8;
            return true;
        });

        // Update effects
        state.effects = state.effects.filter(e => {
            e.life--;
            return e.life > 0;
        });

        document.getElementById('hh-coins').textContent = state.coins;
        updateScore(gameId, state.score);
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw path
        ctx.strokeStyle = '#3d2b5a';
        ctx.lineWidth = 40;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        pathPoints.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();

        // Draw wallet at end
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('💎', pathPoints[pathPoints.length - 1].x - 20, pathPoints[pathPoints.length - 1].y);

        // Draw towers
        state.towers.forEach(t => {
            ctx.font = '28px Arial';
            ctx.fillText(t.icon, t.x, t.y);
            ctx.strokeStyle = t.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        });

        // Draw enemies
        state.enemies.forEach(e => {
            ctx.font = '25px Arial';
            ctx.fillText(e.icon, e.x, e.y);
            // HP bar
            ctx.fillStyle = '#333';
            ctx.fillRect(e.x - 15, e.y - 20, 30, 4);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(e.x - 15, e.y - 20, 30 * (e.hp / e.maxHp), 4);
        });

        // Draw projectiles
        state.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw effects
        state.effects.forEach(e => {
            ctx.globalAlpha = e.life / 15;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.r * (1 - e.life / 15), 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        });

        // Tower placement preview
        if (placingTower && selectedTower) {
            ctx.globalAlpha = 0.5;
            ctx.font = '28px Arial';
            ctx.fillText(selectedTower.icon, mousePos.x, mousePos.y);
            ctx.strokeStyle = selectedTower.color;
            ctx.beginPath();
            ctx.arc(mousePos.x, mousePos.y, selectedTower.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = (e.clientX - rect.left) * (canvas.width / rect.width);
        mousePos.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    });

    canvas.addEventListener('click', () => {
        if (placingTower) placeTower(mousePos.x, mousePos.y);
    });

    startWave();
    gameLoop();

    activeGames[gameId] = {
        cleanup: () => { state.gameOver = true; }
    };
}

function startCryptoHeist(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    const state = {
        score: 0,
        level: 1,
        loot: 0,
        gameOver: false,
        player: { x: 50, y: 0, size: 20, speed: 4 },
        guards: [],
        tokens: [],
        exit: { x: 0, y: 0, size: 30 },
        keys: { up: false, down: false, left: false, right: false },
        detected: false,
        escaped: false
    };

    arena.innerHTML = `
        <div style="width:100%;height:100%;position:relative;overflow:hidden;background:#0a0a0a;">
            <canvas id="ch-canvas" style="width:100%;height:100%;"></canvas>
            <div style="position:absolute;top:15px;left:15px;display:flex;gap:20px;">
                <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--gold);">💰 LOOT: <span id="ch-loot">0</span></span>
                </div>
                <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--purple);">🏛️ LEVEL <span id="ch-level">1</span></span>
                </div>
            </div>
            <div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:12px;">
                WASD or Arrow Keys to move | Collect tokens, avoid guards, reach exit!
            </div>
        </div>
    `;

    const canvas = document.getElementById('ch-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        state.player.y = canvas.height / 2;
        setupLevel();
    }

    function setupLevel() {
        state.guards = [];
        state.tokens = [];
        state.detected = false;
        state.escaped = false;
        state.player.x = 50;
        state.player.y = canvas.height / 2;

        // Exit on right side
        state.exit.x = canvas.width - 50;
        state.exit.y = canvas.height / 2;

        // Spawn guards
        const guardCount = 2 + state.level;
        for (let i = 0; i < guardCount; i++) {
            const x = 150 + Math.random() * (canvas.width - 300);
            const y = 50 + Math.random() * (canvas.height - 100);
            state.guards.push({
                x, y,
                startX: x,
                startY: y,
                size: 25,
                angle: Math.random() * Math.PI * 2,
                visionRange: 80 + state.level * 10,
                visionAngle: Math.PI / 3,
                patrolRadius: 50 + Math.random() * 50,
                patrolSpeed: 0.02 + Math.random() * 0.01,
                patrolAngle: Math.random() * Math.PI * 2
            });
        }

        // Spawn tokens
        const tokenCount = 3 + state.level;
        for (let i = 0; i < tokenCount; i++) {
            state.tokens.push({
                x: 100 + Math.random() * (canvas.width - 200),
                y: 50 + Math.random() * (canvas.height - 100),
                size: 15,
                value: 10 + state.level * 5
            });
        }
    }

    resizeCanvas();

    function canGuardSee(guard, target) {
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > guard.visionRange) return false;

        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = angleToTarget - guard.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        return Math.abs(angleDiff) < guard.visionAngle / 2;
    }

    function update() {
        if (state.gameOver || state.escaped) return;

        // Player movement
        let dx = 0, dy = 0;
        if (state.keys.up) dy -= 1;
        if (state.keys.down) dy += 1;
        if (state.keys.left) dx -= 1;
        if (state.keys.right) dx += 1;

        if (dx || dy) {
            const len = Math.sqrt(dx * dx + dy * dy);
            state.player.x += (dx / len) * state.player.speed;
            state.player.y += (dy / len) * state.player.speed;
        }

        // Bounds
        state.player.x = Math.max(state.player.size, Math.min(canvas.width - state.player.size, state.player.x));
        state.player.y = Math.max(state.player.size, Math.min(canvas.height - state.player.size, state.player.y));

        // Update guards
        state.guards.forEach(guard => {
            guard.patrolAngle += guard.patrolSpeed;
            guard.x = guard.startX + Math.cos(guard.patrolAngle) * guard.patrolRadius;
            guard.y = guard.startY + Math.sin(guard.patrolAngle) * guard.patrolRadius;
            guard.angle = guard.patrolAngle + Math.PI / 2;

            // Detection
            if (canGuardSee(guard, state.player)) {
                state.detected = true;
                state.gameOver = true;
                endGame(gameId, state.score);
            }
        });

        // Collect tokens
        state.tokens = state.tokens.filter(token => {
            const dx = token.x - state.player.x;
            const dy = token.y - state.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < state.player.size + token.size) {
                state.loot += token.value;
                state.score += token.value;
                document.getElementById('ch-loot').textContent = state.loot;
                return false;
            }
            return true;
        });

        // Check exit
        const exitDx = state.exit.x - state.player.x;
        const exitDy = state.exit.y - state.player.y;
        if (Math.sqrt(exitDx * exitDx + exitDy * exitDy) < state.player.size + state.exit.size) {
            if (state.tokens.length === 0) {
                state.score += state.level * 100;
                state.level++;
                document.getElementById('ch-level').textContent = state.level;
                setupLevel();
            }
        }

        updateScore(gameId, state.score);
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw exit
        ctx.font = '35px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(state.tokens.length === 0 ? '🚪' : '🔒', state.exit.x, state.exit.y);

        // Draw tokens
        state.tokens.forEach(token => {
            ctx.font = '20px Arial';
            ctx.fillText('🪙', token.x, token.y);
        });

        // Draw guard vision cones
        state.guards.forEach(guard => {
            ctx.fillStyle = state.detected ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.2)';
            ctx.beginPath();
            ctx.moveTo(guard.x, guard.y);
            ctx.arc(guard.x, guard.y, guard.visionRange,
                guard.angle - guard.visionAngle / 2,
                guard.angle + guard.visionAngle / 2);
            ctx.closePath();
            ctx.fill();

            // Guard
            ctx.font = '25px Arial';
            ctx.fillText('👮', guard.x, guard.y);
        });

        // Draw player
        ctx.font = '25px Arial';
        ctx.fillText('🦹', state.player.x, state.player.y);

        // Detection alert
        if (state.detected) {
            ctx.fillStyle = 'rgba(239,68,68,0.8)';
            ctx.font = 'bold 40px Arial';
            ctx.fillText('🚨 DETECTED!', canvas.width / 2, canvas.height / 2);
        }
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    function handleKeyDown(e) {
        if (['ArrowUp', 'KeyW'].includes(e.code)) state.keys.up = true;
        if (['ArrowDown', 'KeyS'].includes(e.code)) state.keys.down = true;
        if (['ArrowLeft', 'KeyA'].includes(e.code)) state.keys.left = true;
        if (['ArrowRight', 'KeyD'].includes(e.code)) state.keys.right = true;
    }

    function handleKeyUp(e) {
        if (['ArrowUp', 'KeyW'].includes(e.code)) state.keys.up = false;
        if (['ArrowDown', 'KeyS'].includes(e.code)) state.keys.down = false;
        if (['ArrowLeft', 'KeyA'].includes(e.code)) state.keys.left = false;
        if (['ArrowRight', 'KeyD'].includes(e.code)) state.keys.right = false;
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    gameLoop();

    activeGames[gameId] = {
        cleanup: () => {
            state.gameOver = true;
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        }
    };
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

    const state = {
        score: 0,
        level: 1,
        gameOver: false,
        sequence: [],
        playerSequence: [],
        phase: 'watch', // watch, repeat, success, fail
        currentShow: 0,
        showTimer: 0,
        patterns: ['🐋', '🦈', '🐬', '🐙'],
        colors: ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b']
    };

    arena.innerHTML = `
        <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(180deg,#0a1628 0%,#1a2744 100%);padding:20px;box-sizing:border-box;">
            <div style="margin-bottom:20px;display:flex;gap:20px;">
                <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--gold);">Score: <span id="ww-score">0</span></span>
                </div>
                <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--purple);">Level: <span id="ww-level">1</span></span>
                </div>
            </div>
            <div style="font-size:24px;margin-bottom:30px;color:var(--text-muted);" id="ww-status">Watch the whales...</div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-bottom:30px;" id="ww-grid"></div>
        </div>
    `;

    const gridEl = document.getElementById('ww-grid');
    const statusEl = document.getElementById('ww-status');

    // Create buttons
    state.patterns.forEach((icon, i) => {
        const btn = document.createElement('button');
        btn.className = 'whale-btn';
        btn.dataset.index = i;
        btn.style.cssText = `
            width:100px;height:100px;font-size:50px;
            background:rgba(0,0,0,0.3);border:3px solid ${state.colors[i]};
            border-radius:16px;cursor:pointer;transition:all 0.2s;
            display:flex;align-items:center;justify-content:center;
        `;
        btn.textContent = icon;
        btn.onclick = () => handleClick(i);
        gridEl.appendChild(btn);
    });

    const buttons = gridEl.querySelectorAll('.whale-btn');

    function flashButton(index, duration = 500) {
        const btn = buttons[index];
        btn.style.background = state.colors[index];
        btn.style.transform = 'scale(1.1)';
        btn.style.boxShadow = `0 0 30px ${state.colors[index]}`;
        setTimeout(() => {
            btn.style.background = 'rgba(0,0,0,0.3)';
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = 'none';
        }, duration * 0.8);
    }

    function addToSequence() {
        state.sequence.push(Math.floor(Math.random() * 4));
    }

    function showSequence() {
        state.phase = 'watch';
        state.currentShow = 0;
        statusEl.textContent = 'Watch the whales...';
        buttons.forEach(b => b.style.pointerEvents = 'none');

        const showNext = () => {
            if (state.currentShow < state.sequence.length) {
                flashButton(state.sequence[state.currentShow], 600);
                state.currentShow++;
                setTimeout(showNext, 800);
            } else {
                state.phase = 'repeat';
                state.playerSequence = [];
                statusEl.textContent = 'Your turn! Repeat the pattern';
                buttons.forEach(b => b.style.pointerEvents = 'auto');
            }
        };

        setTimeout(showNext, 500);
    }

    function handleClick(index) {
        if (state.phase !== 'repeat' || state.gameOver) return;

        flashButton(index, 300);
        state.playerSequence.push(index);

        const currentIndex = state.playerSequence.length - 1;

        if (state.playerSequence[currentIndex] !== state.sequence[currentIndex]) {
            // Wrong!
            state.phase = 'fail';
            state.gameOver = true;
            statusEl.textContent = '❌ Wrong pattern!';
            statusEl.style.color = '#ef4444';
            buttons.forEach(b => b.style.pointerEvents = 'none');
            setTimeout(() => endGame(gameId, state.score), 1500);
            return;
        }

        if (state.playerSequence.length === state.sequence.length) {
            // Success!
            state.phase = 'success';
            state.score += state.level * 10;
            state.level++;
            document.getElementById('ww-score').textContent = state.score;
            document.getElementById('ww-level').textContent = state.level;
            statusEl.textContent = '✅ Correct!';
            statusEl.style.color = '#22c55e';
            updateScore(gameId, state.score);

            setTimeout(() => {
                statusEl.style.color = '';
                addToSequence();
                showSequence();
            }, 1000);
        }
    }

    function startGame() {
        state.sequence = [];
        addToSequence();
        showSequence();
    }

    startGame();

    activeGames[gameId] = {
        cleanup: () => { state.gameOver = true; }
    };
}

function startStakeStacker(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    const state = {
        score: 0,
        level: 1,
        gameOver: false,
        blocks: [],
        currentBlock: null,
        baseWidth: 200,
        blockHeight: 25,
        direction: 1,
        speed: 3,
        perfectStreak: 0
    };

    arena.innerHTML = `
        <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#1a0a2e 0%,#2d1b4e 50%,#1a1a2e 100%);">
            <canvas id="ss-canvas" style="width:100%;height:100%;"></canvas>
            <div style="position:absolute;top:15px;left:50%;transform:translateX(-50%);display:flex;gap:20px;">
                <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--gold);">Score: <span id="ss-score">0</span></span>
                </div>
                <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--purple);">Height: <span id="ss-level">0</span></span>
                </div>
            </div>
            <div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:12px;">
                CLICK or SPACE to drop block
            </div>
        </div>
    `;

    const canvas = document.getElementById('ss-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        initGame();
    }

    function initGame() {
        state.blocks = [];
        state.level = 0;

        // Base block
        state.blocks.push({
            x: canvas.width / 2 - state.baseWidth / 2,
            y: canvas.height - 50,
            width: state.baseWidth,
            height: state.blockHeight,
            color: getBlockColor(0)
        });

        spawnBlock();
    }

    function getBlockColor(index) {
        const colors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];
        return colors[index % colors.length];
    }

    function spawnBlock() {
        const lastBlock = state.blocks[state.blocks.length - 1];
        state.level++;

        state.currentBlock = {
            x: 0,
            y: lastBlock.y - state.blockHeight - 5,
            width: lastBlock.width,
            height: state.blockHeight,
            color: getBlockColor(state.level)
        };

        state.direction = 1;
        state.speed = Math.min(8, 3 + state.level * 0.3);

        document.getElementById('ss-level').textContent = state.level;

        // Check if tower is too high, scroll down
        if (state.currentBlock.y < 150) {
            const shift = 100;
            state.blocks.forEach(b => b.y += shift);
            state.currentBlock.y += shift;
        }
    }

    function dropBlock() {
        if (!state.currentBlock || state.gameOver) return;

        const current = state.currentBlock;
        const last = state.blocks[state.blocks.length - 1];

        // Calculate overlap
        const overlapStart = Math.max(current.x, last.x);
        const overlapEnd = Math.min(current.x + current.width, last.x + last.width);
        const overlapWidth = overlapEnd - overlapStart;

        if (overlapWidth <= 0) {
            // Missed completely
            state.gameOver = true;
            endGame(gameId, state.score);
            return;
        }

        // Perfect or partial?
        const isPerfect = Math.abs(current.x - last.x) < 5;

        if (isPerfect) {
            state.perfectStreak++;
            state.score += 50 + state.perfectStreak * 10;
            current.x = last.x;
            current.width = last.width;
        } else {
            state.perfectStreak = 0;
            state.score += Math.floor(overlapWidth / 2);
            current.x = overlapStart;
            current.width = overlapWidth;
        }

        state.blocks.push({ ...current });
        document.getElementById('ss-score').textContent = state.score;
        updateScore(gameId, state.score);

        if (current.width < 10) {
            state.gameOver = true;
            endGame(gameId, state.score);
            return;
        }

        spawnBlock();
    }

    function update() {
        if (state.gameOver || !state.currentBlock) return;

        state.currentBlock.x += state.speed * state.direction;

        if (state.currentBlock.x + state.currentBlock.width > canvas.width) {
            state.direction = -1;
        } else if (state.currentBlock.x < 0) {
            state.direction = 1;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw stacked blocks
        state.blocks.forEach((block, i) => {
            ctx.fillStyle = block.color;
            ctx.fillRect(block.x, block.y, block.width, block.height);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.strokeRect(block.x, block.y, block.width, block.height);

            // APY label
            if (i > 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${(i * 2.5).toFixed(1)}% APY`, block.x + block.width / 2, block.y + 16);
            }
        });

        // Draw current block
        if (state.currentBlock) {
            ctx.fillStyle = state.currentBlock.color;
            ctx.globalAlpha = 0.8;
            ctx.fillRect(state.currentBlock.x, state.currentBlock.y, state.currentBlock.width, state.currentBlock.height);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(state.currentBlock.x, state.currentBlock.y, state.currentBlock.width, state.currentBlock.height);
        }

        // Perfect streak indicator
        if (state.perfectStreak > 1) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`🔥 ${state.perfectStreak}x PERFECT!`, canvas.width / 2, 80);
        }
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    function handleInput(e) {
        if (e.type === 'keydown' && e.code !== 'Space') return;
        e.preventDefault();
        dropBlock();
    }

    resizeCanvas();

    document.addEventListener('keydown', handleInput);
    canvas.addEventListener('click', handleInput);

    gameLoop();

    activeGames[gameId] = {
        cleanup: () => {
            state.gameOver = true;
            document.removeEventListener('keydown', handleInput);
            canvas.removeEventListener('click', handleInput);
        }
    };
}

function startDexDash(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    const state = {
        score: 0,
        gameOver: false,
        player: { x: 0, y: 0, lane: 1, speed: 0 },
        obstacles: [],
        boosts: [],
        distance: 0,
        maxSpeed: 12,
        acceleration: 0.05,
        roadOffset: 0,
        lanes: 3,
        laneWidth: 80
    };

    arena.innerHTML = `
        <div style="width:100%;height:100%;position:relative;overflow:hidden;background:#0a0a1a;">
            <canvas id="dd-canvas" style="width:100%;height:100%;"></canvas>
            <div style="position:absolute;top:15px;left:50%;transform:translateX(-50%);display:flex;gap:20px;">
                <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--gold);">Distance: <span id="dd-distance">0</span>m</span>
                </div>
                <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--green);">Speed: <span id="dd-speed">0</span></span>
                </div>
            </div>
            <div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:12px;">
                ← → or A/D to change lanes
            </div>
        </div>
    `;

    const canvas = document.getElementById('dd-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        state.player.x = canvas.width / 2;
        state.player.y = canvas.height - 100;
        state.laneWidth = canvas.width / 5;
    }
    resizeCanvas();

    const dexLogos = ['🦄', '🥞', '🍣', '☀️', '🌊'];
    const obstacleTypes = [
        { icon: '🚧', name: 'High Gas' },
        { icon: '⛔', name: 'Failed TX' },
        { icon: '🐌', name: 'Slow Block' }
    ];

    function getLaneX(lane) {
        const roadWidth = state.laneWidth * state.lanes;
        const roadStart = (canvas.width - roadWidth) / 2;
        return roadStart + lane * state.laneWidth + state.laneWidth / 2;
    }

    function spawnObstacle() {
        const lane = Math.floor(Math.random() * state.lanes);
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        state.obstacles.push({
            x: getLaneX(lane),
            y: -50,
            lane,
            width: 40,
            height: 40,
            ...type
        });
    }

    function spawnBoost() {
        const lane = Math.floor(Math.random() * state.lanes);
        state.boosts.push({
            x: getLaneX(lane),
            y: -50,
            lane,
            icon: dexLogos[Math.floor(Math.random() * dexLogos.length)],
            value: 50
        });
    }

    function changeLane(dir) {
        state.player.lane = Math.max(0, Math.min(state.lanes - 1, state.player.lane + dir));
    }

    function update() {
        if (state.gameOver) return;

        // Speed up
        state.player.speed = Math.min(state.maxSpeed, state.player.speed + state.acceleration);
        state.distance += state.player.speed * 0.5;
        state.roadOffset = (state.roadOffset + state.player.speed) % 50;

        // Move player to lane
        const targetX = getLaneX(state.player.lane);
        state.player.x += (targetX - state.player.x) * 0.2;

        // Spawn
        if (Math.random() < 0.02 + state.distance * 0.00001) spawnObstacle();
        if (Math.random() < 0.01) spawnBoost();

        // Update obstacles
        state.obstacles = state.obstacles.filter(obs => {
            obs.y += state.player.speed;

            // Collision
            if (obs.lane === state.player.lane &&
                obs.y > state.player.y - 30 &&
                obs.y < state.player.y + 30) {
                state.player.speed = Math.max(2, state.player.speed - 3);
                state.score = Math.max(0, state.score - 25);
                return false;
            }

            return obs.y < canvas.height + 50;
        });

        // Update boosts
        state.boosts = state.boosts.filter(boost => {
            boost.y += state.player.speed;

            // Collect
            if (boost.lane === state.player.lane &&
                boost.y > state.player.y - 30 &&
                boost.y < state.player.y + 30) {
                state.score += boost.value;
                state.player.speed = Math.min(state.maxSpeed, state.player.speed + 1);
                return false;
            }

            return boost.y < canvas.height + 50;
        });

        // Update UI
        document.getElementById('dd-distance').textContent = Math.floor(state.distance);
        document.getElementById('dd-speed').textContent = Math.floor(state.player.speed * 10) + ' km/h';
        state.score = Math.floor(state.distance);
        updateScore(gameId, state.score);
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const roadWidth = state.laneWidth * state.lanes;
        const roadStart = (canvas.width - roadWidth) / 2;

        // Road
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(roadStart, 0, roadWidth, canvas.height);

        // Lane lines
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.setLineDash([30, 20]);
        for (let i = 1; i < state.lanes; i++) {
            const x = roadStart + i * state.laneWidth;
            ctx.beginPath();
            ctx.moveTo(x, -state.roadOffset);
            for (let y = -state.roadOffset; y < canvas.height; y += 50) {
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Road edges
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(roadStart, 0);
        ctx.lineTo(roadStart, canvas.height);
        ctx.moveTo(roadStart + roadWidth, 0);
        ctx.lineTo(roadStart + roadWidth, canvas.height);
        ctx.stroke();

        // Obstacles
        ctx.font = '35px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        state.obstacles.forEach(obs => {
            ctx.fillText(obs.icon, obs.x, obs.y);
        });

        // Boosts
        ctx.font = '30px Arial';
        state.boosts.forEach(boost => {
            const float = Math.sin(Date.now() * 0.01 + boost.y) * 3;
            ctx.fillText(boost.icon, boost.x, boost.y + float);
        });

        // Player car
        ctx.font = '45px Arial';
        ctx.fillText('🏎️', state.player.x, state.player.y);

        // Speed lines at high speed
        if (state.player.speed > 8) {
            ctx.strokeStyle = 'rgba(251,191,36,0.3)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
                const x = Math.random() * canvas.width;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
        }
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    function handleKeyDown(e) {
        if (['ArrowLeft', 'KeyA'].includes(e.code)) changeLane(-1);
        if (['ArrowRight', 'KeyD'].includes(e.code)) changeLane(1);
    }

    document.addEventListener('keydown', handleKeyDown);

    // Touch controls
    let touchStartX = 0;
    canvas.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
    });
    canvas.addEventListener('touchend', e => {
        const diff = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(diff) > 30) changeLane(diff > 0 ? 1 : -1);
    });

    state.player.speed = 3;
    gameLoop();

    activeGames[gameId] = {
        cleanup: () => {
            state.gameOver = true;
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
}

function startBurnOrHold(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    const state = {
        score: 0,
        round: 1,
        gameOver: false,
        playerTurn: true,
        player: { x: 80, y: 0, hp: 100, maxHp: 100 },
        enemy: { x: 0, y: 0, hp: 100, maxHp: 100 },
        arrow: null,
        aiming: false,
        aimStart: { x: 0, y: 0 },
        aimEnd: { x: 0, y: 0 },
        wind: 0,
        gravity: 0.3,
        particles: []
    };

    arena.innerHTML = `
        <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#1a2744 0%,#0a1628 100%);">
            <canvas id="ta-canvas" style="width:100%;height:100%;"></canvas>
            <div style="position:absolute;top:15px;left:50%;transform:translateX(-50%);display:flex;gap:20px;">
                <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--gold);">Round: <span id="ta-round">1</span></span>
                </div>
                <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--text-muted);">Wind: <span id="ta-wind">→ 0</span></span>
                </div>
            </div>
            <div style="position:absolute;top:15px;left:15px;">
                <div style="color:var(--green);font-size:14px;">YOU</div>
                <div style="background:#333;width:100px;height:10px;border-radius:5px;overflow:hidden;">
                    <div id="ta-player-hp" style="background:var(--green);height:100%;width:100%;transition:width 0.3s;"></div>
                </div>
            </div>
            <div style="position:absolute;top:15px;right:15px;text-align:right;">
                <div style="color:var(--accent-fire);font-size:14px;">ENEMY</div>
                <div style="background:#333;width:100px;height:10px;border-radius:5px;overflow:hidden;">
                    <div id="ta-enemy-hp" style="background:var(--accent-fire);height:100%;width:100%;transition:width 0.3s;"></div>
                </div>
            </div>
            <div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50);color:var(--text-muted);font-size:12px;" id="ta-status">
                Drag to aim, release to fire!
            </div>
        </div>
    `;

    const canvas = document.getElementById('ta-canvas');
    const ctx = canvas.getContext('2d');
    const statusEl = document.getElementById('ta-status');

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        state.player.y = canvas.height - 80;
        state.enemy.x = canvas.width - 80;
        state.enemy.y = canvas.height - 80;
    }
    resizeCanvas();

    function setWind() {
        state.wind = (Math.random() - 0.5) * 0.3;
        const windDisplay = state.wind > 0 ? `→ ${Math.abs(state.wind * 100).toFixed(0)}` : `← ${Math.abs(state.wind * 100).toFixed(0)}`;
        document.getElementById('ta-wind').textContent = windDisplay;
    }
    setWind();

    function fireArrow(startX, startY, vx, vy, isPlayer) {
        state.arrow = { x: startX, y: startY, vx, vy, isPlayer };
    }

    function enemyTurn() {
        statusEl.textContent = 'Enemy is aiming...';
        setTimeout(() => {
            const dx = state.player.x - state.enemy.x;
            const dy = state.player.y - state.enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Add some randomness to enemy aim
            const accuracy = 0.7 + Math.random() * 0.3;
            const power = 12 + Math.random() * 4;
            const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.3;

            fireArrow(
                state.enemy.x,
                state.enemy.y - 20,
                Math.cos(angle) * power * accuracy,
                Math.sin(angle) * power * accuracy - 5,
                false
            );
        }, 1000);
    }

    function nextRound() {
        state.round++;
        state.enemy.hp = state.enemy.maxHp;
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 30);
        state.enemy.maxHp += 20;
        state.enemy.hp = state.enemy.maxHp;
        document.getElementById('ta-round').textContent = state.round;
        document.getElementById('ta-player-hp').style.width = (state.player.hp / state.player.maxHp * 100) + '%';
        document.getElementById('ta-enemy-hp').style.width = '100%';
        setWind();
        state.playerTurn = true;
        statusEl.textContent = 'Drag to aim, release to fire!';
    }

    function addParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            state.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30,
                color
            });
        }
    }

    function update() {
        if (state.gameOver) return;

        // Update arrow
        if (state.arrow) {
            state.arrow.x += state.arrow.vx;
            state.arrow.y += state.arrow.vy;
            state.arrow.vy += state.gravity;
            state.arrow.vx += state.wind;

            // Check hit
            const target = state.arrow.isPlayer ? state.enemy : state.player;
            const dx = state.arrow.x - target.x;
            const dy = state.arrow.y - (target.y - 20);

            if (Math.sqrt(dx * dx + dy * dy) < 30) {
                const damage = 15 + Math.floor(Math.random() * 15);
                target.hp -= damage;
                addParticles(state.arrow.x, state.arrow.y, state.arrow.isPlayer ? '#ef4444' : '#22c55e');
                state.arrow = null;

                if (state.arrow?.isPlayer || !state.arrow) {
                    document.getElementById('ta-enemy-hp').style.width = Math.max(0, state.enemy.hp / state.enemy.maxHp * 100) + '%';
                } else {
                    document.getElementById('ta-player-hp').style.width = Math.max(0, state.player.hp / state.player.maxHp * 100) + '%';
                }

                if (target.hp <= 0) {
                    if (target === state.enemy) {
                        state.score += state.round * 100;
                        updateScore(gameId, state.score);
                        statusEl.textContent = '🎉 Enemy defeated! Next round...';
                        setTimeout(nextRound, 1500);
                    } else {
                        state.gameOver = true;
                        statusEl.textContent = '💀 You were defeated!';
                        endGame(gameId, state.score);
                    }
                } else {
                    state.playerTurn = !state.playerTurn;
                    if (!state.playerTurn) {
                        enemyTurn();
                    } else {
                        statusEl.textContent = 'Your turn! Drag to aim.';
                    }
                }
                return;
            }

            // Out of bounds
            if (state.arrow.x < -50 || state.arrow.x > canvas.width + 50 ||
                state.arrow.y > canvas.height + 50) {
                state.arrow = null;
                state.playerTurn = !state.playerTurn;
                if (!state.playerTurn) {
                    enemyTurn();
                } else {
                    statusEl.textContent = 'Missed! Your turn.';
                }
            }
        }

        // Update particles
        state.particles = state.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.life--;
            return p.life > 0;
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Ground
        ctx.fillStyle = '#2d1b4e';
        ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

        // Platforms
        ctx.fillStyle = '#3d2b5a';
        ctx.fillRect(state.player.x - 30, state.player.y + 10, 60, 30);
        ctx.fillRect(state.enemy.x - 30, state.enemy.y + 10, 60, 30);

        // Player
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏹', state.player.x, state.player.y - 10);

        // Enemy
        ctx.fillText('👹', state.enemy.x, state.enemy.y - 10);

        // Aim line
        if (state.aiming && state.playerTurn) {
            const power = Math.min(20, Math.sqrt(
                Math.pow(state.aimStart.x - state.aimEnd.x, 2) +
                Math.pow(state.aimStart.y - state.aimEnd.y, 2)
            ) * 0.15);

            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(state.player.x, state.player.y - 20);

            const angle = Math.atan2(
                state.aimStart.y - state.aimEnd.y,
                state.aimStart.x - state.aimEnd.x
            );

            // Trajectory preview
            let px = state.player.x;
            let py = state.player.y - 20;
            let pvx = Math.cos(angle) * power;
            let pvy = Math.sin(angle) * power;

            for (let i = 0; i < 30; i++) {
                px += pvx;
                py += pvy;
                pvy += state.gravity;
                pvx += state.wind;
                ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Arrow
        if (state.arrow) {
            ctx.save();
            ctx.translate(state.arrow.x, state.arrow.y);
            ctx.rotate(Math.atan2(state.arrow.vy, state.arrow.vx));
            ctx.font = '20px Arial';
            ctx.fillText('➔', 0, 0);
            ctx.restore();
        }

        // Particles
        state.particles.forEach(p => {
            ctx.globalAlpha = p.life / 30;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        return {
            x: x * (canvas.width / rect.width),
            y: y * (canvas.height / rect.height)
        };
    }

    function handleStart(e) {
        if (!state.playerTurn || state.arrow || state.gameOver) return;
        const pos = getPos(e);
        state.aiming = true;
        state.aimStart = pos;
        state.aimEnd = pos;
    }

    function handleMove(e) {
        if (!state.aiming) return;
        state.aimEnd = getPos(e);
    }

    function handleEnd(e) {
        if (!state.aiming || !state.playerTurn) return;
        state.aiming = false;

        const power = Math.min(20, Math.sqrt(
            Math.pow(state.aimStart.x - state.aimEnd.x, 2) +
            Math.pow(state.aimStart.y - state.aimEnd.y, 2)
        ) * 0.15);

        if (power < 2) return;

        const angle = Math.atan2(
            state.aimStart.y - state.aimEnd.y,
            state.aimStart.x - state.aimEnd.x
        );

        fireArrow(
            state.player.x,
            state.player.y - 20,
            Math.cos(angle) * power,
            Math.sin(angle) * power,
            true
        );

        statusEl.textContent = 'Arrow fired!';
    }

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('touchstart', handleStart);
    canvas.addEventListener('touchmove', handleMove);
    canvas.addEventListener('touchend', handleEnd);

    gameLoop();

    activeGames[gameId] = {
        cleanup: () => {
            state.gameOver = true;
            canvas.removeEventListener('mousedown', handleStart);
            canvas.removeEventListener('mousemove', handleMove);
            canvas.removeEventListener('mouseup', handleEnd);
            canvas.removeEventListener('touchstart', handleStart);
            canvas.removeEventListener('touchmove', handleMove);
            canvas.removeEventListener('touchend', handleEnd);
        }
    };
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
