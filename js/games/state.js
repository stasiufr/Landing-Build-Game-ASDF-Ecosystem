/**
 * ASDF Games - State Management & Wallet
 */

'use strict';

const STORAGE_KEY = 'asdf_gotw_v1';

let appState = {
    wallet: null,
    isHolder: false,
    balance: 0,
    tickets: 0,
    practiceScores: {},
    competitiveScores: {},
    activeTicket: null
};

let testMode = false;

/**
 * Validate state schema to prevent tampering
 */
function validateStateSchema(data) {
    if (typeof data !== 'object' || data === null) return false;
    if (data.wallet !== null && typeof data.wallet !== 'string') return false;
    if (typeof data.isHolder !== 'boolean') return false;
    if (typeof data.balance !== 'number' || !Number.isFinite(data.balance) || data.balance < 0) return false;
    if (typeof data.tickets !== 'number' || !Number.isInteger(data.tickets) || data.tickets < 0) return false;
    if (typeof data.practiceScores !== 'object' || data.practiceScores === null) return false;
    if (typeof data.competitiveScores !== 'object' || data.competitiveScores === null) return false;

    for (const [key, value] of Object.entries(data.practiceScores)) {
        if (!VALID_GAME_IDS.has(key) || typeof value !== 'number' || !Number.isFinite(value)) return false;
    }
    for (const [key, value] of Object.entries(data.competitiveScores)) {
        if (!VALID_GAME_IDS.has(key) || typeof value !== 'number' || !Number.isFinite(value)) return false;
    }
    return true;
}

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (validateStateSchema({ ...appState, ...parsed })) {
                appState = { ...appState, ...parsed };
            } else {
                console.warn('Invalid state schema, using defaults');
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    } catch (e) {
        console.warn('Failed to load state:', e);
        localStorage.removeItem(STORAGE_KEY);
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (e) {
        console.warn('Failed to save state:', e);
    }
}

// ============================================
// WALLET CONNECTION (PHANTOM)
// ============================================

function getPhantomProvider() {
    if ('phantom' in window) {
        const provider = window.phantom?.solana;
        if (provider?.isPhantom) {
            return provider;
        }
    }
    return null;
}

async function handleWalletClick() {
    if (appState.wallet) {
        await disconnectWallet();
    } else {
        await connectWallet();
    }
}

async function connectWallet() {
    try {
        const provider = getPhantomProvider();
        if (!provider) {
            alert('Please install Phantom wallet to connect.\n\nhttps://phantom.app/');
            return;
        }

        const response = await provider.connect();
        const publicKey = response.publicKey.toString();

        appState.wallet = publicKey;
        saveState();

        updateWalletUI(publicKey);
        await checkTokenBalance(publicKey);

    } catch (error) {
        console.error('Wallet connection failed:', error);
        if (error.code === 4001) {
            return;
        }
        alert('Failed to connect wallet. Please try again.');
    }
}

async function disconnectWallet() {
    try {
        const provider = getPhantomProvider();
        if (provider) {
            await provider.disconnect();
        }
    } catch (e) {
        console.warn('Disconnect error:', e);
    }

    appState.wallet = null;
    appState.isHolder = false;
    appState.balance = 0;
    saveState();

    updateWalletUI(null);
    updateAccessUI();
    renderGamesGrid();
}

async function checkTokenBalance(publicKey) {
    try {
        if (!isValidSolanaAddress(publicKey)) {
            console.warn('Invalid Solana address format');
            return;
        }

        if (!RateLimiter.canMakeCall('solana-rpc')) {
            console.warn('Rate limited - please wait before checking balance again');
            return;
        }

        const response = await fetch(CONFIG.SOLANA_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getTokenAccountsByOwner',
                params: [
                    publicKey,
                    { mint: CONFIG.ASDF_TOKEN_MINT },
                    { encoding: 'jsonParsed' }
                ]
            })
        });

        const data = await response.json();

        if (data.result?.value?.length > 0) {
            const tokenAccount = data.result.value[0];
            const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount || 0;

            appState.balance = balance;
            appState.isHolder = balance >= CONFIG.MIN_HOLDER_BALANCE;
        } else {
            appState.balance = 0;
            appState.isHolder = false;
        }

        saveState();
        updateAccessUI();
        renderGamesGrid();

    } catch (error) {
        console.error('Failed to check token balance:', error);
        updateAccessUI();
        renderGamesGrid();
    }
}

function updateWalletUI(publicKey) {
    const btn = document.getElementById('wallet-btn');
    const btnText = document.getElementById('wallet-btn-text');
    const badge = document.getElementById('user-badge');

    if (publicKey && typeof publicKey === 'string' && publicKey.length >= 8) {
        btn.classList.add('connected');
        btnText.textContent = '';
        const addrSpan = document.createElement('span');
        addrSpan.className = 'wallet-address';
        addrSpan.textContent = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;
        btnText.appendChild(addrSpan);
        badge.className = appState.isHolder ? 'holder-badge' : 'visitor-badge';
        badge.textContent = appState.isHolder ? 'HOLDER' : 'CONNECTED';
    } else {
        btn.classList.remove('connected');
        btnText.textContent = 'Connect Wallet';
        badge.className = 'visitor-badge';
        badge.textContent = 'VISITOR';
    }
}

function updateAccessUI() {
    const accessAll = document.getElementById('access-all');
    const accessTickets = document.getElementById('access-tickets');

    const hasFullAccess = appState.isHolder || testMode;

    if (hasFullAccess) {
        accessAll.classList.remove('locked');
        accessAll.classList.add('unlocked');
        accessAll.querySelector('strong').textContent = testMode ? 'Test Mode' : 'Unlocked';

        accessTickets.classList.remove('locked');
        accessTickets.classList.add('unlocked');
        accessTickets.querySelector('strong').textContent = 'Available';
    } else {
        accessAll.classList.add('locked');
        accessAll.classList.remove('unlocked');
        accessAll.querySelector('strong').textContent = 'Holders Only';

        accessTickets.classList.add('locked');
        accessTickets.classList.remove('unlocked');
        accessTickets.querySelector('strong').textContent = 'Holders Only';
    }

    updateTicketUI();
}

function toggleTestMode() {
    testMode = !testMode;
    const btn = document.getElementById('test-mode-btn');
    if (testMode) {
        btn.textContent = 'TEST MODE: ON';
        btn.style.background = 'var(--green)';
        btn.style.borderColor = 'var(--green-light)';
    } else {
        btn.textContent = 'TEST MODE: OFF';
        btn.style.background = 'var(--bg-burnt)';
        btn.style.borderColor = 'var(--border-rust)';
    }
    renderGamesGrid();
    updateAccessUI();
}
