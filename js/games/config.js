/**
 * ASDF Games - Configuration
 */

'use strict';

const CONFIG = {
    // Development mode - set to false for production with real payments
    DEV_MODE: window.location.hostname === 'localhost',

    // Token configuration - $ASDFASDFA on Solana
    ASDF_TOKEN_MINT: '9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump',
    TOKEN_DECIMALS: 6,
    MIN_HOLDER_BALANCE: 1000000,

    // Payment wallets
    TREASURY_WALLET: '5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa',
    ESCROW_WALLET: 'AR3Rcr8o4iZwGwTUG5LEx7uhcenCCZNrbgkLrjVC1v6y',

    // API endpoints
    API_BASE: window.location.hostname === 'localhost'
        ? 'http://localhost:3001/api'
        : 'https://api.asdf-games.com/api',

    // Solana RPC
    SOLANA_RPC: window.location.hostname === 'localhost'
        ? 'https://api.devnet.solana.com'
        : 'https://api.mainnet-beta.solana.com',

    // Rotation settings
    ROTATION_EPOCH: new Date('2024-01-01T00:00:00Z'),
    CYCLE_WEEKS: 9
};

// Games definition
const GAMES = [
    {
        id: 'burnrunner',
        name: 'Burn Runner',
        icon: '🔥',
        type: 'Endless Runner',
        description: 'Run through the blockchain, collect tokens, avoid obstacles. Every token collected gets burned!'
    },
    {
        id: 'scamblaster',
        name: 'Scam Blaster',
        icon: '🔫',
        type: 'Shooter',
        description: 'Shoot down scam tokens and rug projects before they hit your wallet!'
    },
    {
        id: 'hodlhero',
        name: 'Hold Hero',
        icon: '💎',
        type: 'Tower Defense',
        description: 'Protect your wallet from waves of FUD and scammers. Hold the line!'
    },
    {
        id: 'cryptoheist',
        name: 'Crypto Heist',
        icon: '🦹',
        type: 'Action',
        description: 'Navigate the crypto underworld! Steal tokens, evade the SEC, and escape with your loot!'
    },
    {
        id: 'rugpull',
        name: 'Rug Pull Escape',
        icon: '🏃',
        type: 'Reaction Game',
        description: 'Spot the warning signs and withdraw before the rug gets pulled!'
    },
    {
        id: 'whalewatch',
        name: 'Whale Watch',
        icon: '🐋',
        type: 'Pattern Memory',
        description: 'Track whale movements and predict their next trade patterns.'
    },
    {
        id: 'stakestacker',
        name: 'Stake Stacker',
        icon: '📦',
        type: 'Puzzle',
        description: 'Stack and arrange staking blocks for maximum APY rewards.'
    },
    {
        id: 'dexdash',
        name: 'DEX Dash',
        icon: '🏁',
        type: 'Racing',
        description: 'Race across DEX platforms. Fastest route to the best swap wins!'
    },
    {
        id: 'burnorhold',
        name: 'Token Archer',
        icon: '🏹',
        type: 'Turn-based',
        description: 'Take turns shooting arrows at your enemy! Aim with drag, release to fire. Defeat the enemy to win!'
    }
];

// Ticket types configuration
const TICKET_TYPES = {
    standard: {
        name: 'Standard Ticket',
        priceSOL: 0.1,
        duration: 4 * 60 * 60 * 1000,
        type: 'realtime',
        description: '4 hours of competitive play (real time)',
        icon: ''
    },
    premium: {
        name: 'Premium Ticket',
        priceSOL: 0.5,
        duration: 24 * 60 * 60 * 1000,
        type: 'realtime',
        description: '24 hours of competitive access',
        icon: ''
    },
    donator: {
        name: 'Donator Ticket',
        priceSOL: 2.0,
        duration: 7 * 24 * 60 * 60 * 1000,
        type: 'weekly',
        description: 'Full week access + 1/3 chance for bonus airdrop slot',
        icon: '',
        bonusChance: 0.333
    }
};

// Airdrop slots per rank
const AIRDROP_SLOTS = { 1: 5, 2: 2, 3: 1 };
