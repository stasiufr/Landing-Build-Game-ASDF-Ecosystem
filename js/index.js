/**
 * ASDF Ecosystem - Index Page JavaScript
 * Security: Externalized from inline to comply with CSP
 */

'use strict';

// API endpoint - replace with your actual daemon URL
const API_URL = 'https://your-daemon-api.com'; // Update this

// Format numbers safely
function formatNumber(num) {
    const n = Number(num);
    if (!Number.isFinite(n)) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
    return n.toLocaleString();
}

// Sanitize string for display (prevent XSS)
function sanitizeText(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>&"']/g, char => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
    }[char]));
}

// Validate numeric input within bounds
function validateNumericInput(value, min, max, defaultValue) {
    const num = parseFloat(value);
    if (!Number.isFinite(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
}

// Fetch and display stats securely
async function fetchStats() {
    try {
        // Uncomment when API is available
        // const response = await fetch(`${API_URL}/stats`);
        // const data = await response.json();

        // Placeholder: Show loading states until API connected
        // Using textContent for security (no HTML injection)
        const statBurned = document.getElementById('stat-burned');
        const statCollected = document.getElementById('stat-collected');

        if (statBurned) {
            statBurned.textContent = 'Connect API';
            statBurned.style.color = 'var(--text-muted)';
        }
        if (statCollected) {
            statCollected.textContent = 'Connect API';
            statCollected.style.color = 'var(--text-muted)';
        }

        const liveBurned = document.getElementById('live-burned');
        const liveCollected = document.getElementById('live-collected');
        const liveRate = document.getElementById('live-rate');
        const liveCycles = document.getElementById('live-cycles');

        if (liveBurned) liveBurned.textContent = 'Connect API';
        if (liveCollected) liveCollected.textContent = 'Connect API';
        if (liveRate) liveRate.textContent = 'Connect API';
        if (liveCycles) liveCycles.textContent = 'Connect API';

        // Safe DOM creation instead of innerHTML
        const feedList = document.getElementById('feed-list');
        if (feedList) {
            feedList.textContent = '';
            const feedEmpty = document.createElement('div');
            feedEmpty.className = 'feed-empty';
            feedEmpty.textContent = 'Connect to daemon API to see live burns.';
            const feedSmall = document.createElement('small');
            feedSmall.style.color = 'var(--text-muted)';
            feedSmall.textContent = 'All data will be real, on-chain verifiable.';
            feedEmpty.appendChild(document.createElement('br'));
            feedEmpty.appendChild(feedSmall);
            feedList.appendChild(feedEmpty);
        }

        /*
        // When API is connected, use this secure version:
        document.getElementById('stat-burned').textContent = formatNumber(data.cycles.totalTokensBurned);
        document.getElementById('stat-collected').textContent = (data.cycles.totalFeesCollected / 1e9).toFixed(4) + ' SOL';

        document.getElementById('live-burned').textContent = formatNumber(data.cycles.totalTokensBurned);
        document.getElementById('live-collected').textContent = (data.cycles.totalFeesCollected / 1e9).toFixed(4) + ' SOL';
        document.getElementById('live-rate').textContent = data.cycles.successRate;
        document.getElementById('live-cycles').textContent = data.cycles.totalCycles;

        // Render feed - SECURE: using DOM API instead of innerHTML
        renderFeed(data.tokens);
        */

    } catch (error) {
        // Silent fail for API not connected
    }
}

// Render feed items securely using DOM API
function renderFeed(tokens) {
    const feedListEl = document.getElementById('feed-list');
    if (!feedListEl) return;

    feedListEl.textContent = ''; // Clear safely

    if (tokens && Array.isArray(tokens) && tokens.length > 0) {
        tokens.slice(0, 5).forEach(token => {
            const item = document.createElement('div');
            item.className = 'feed-item';

            const icon = document.createElement('div');
            icon.className = 'feed-icon';
            icon.textContent = '🔥';

            const content = document.createElement('div');
            content.className = 'feed-content';

            const name = document.createElement('div');
            name.className = 'feed-name';
            // Sanitize symbol - only allow alphanumeric
            const safeSymbol = String(token.symbol || '').replace(/[^a-zA-Z0-9]/g, '');
            name.textContent = safeSymbol;

            if (token.isRoot) {
                const badge = document.createElement('span');
                badge.style.cssText = 'background: var(--accent-fire); padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;';
                badge.textContent = 'ROOT';
                name.appendChild(badge);
            }

            const time = document.createElement('div');
            time.className = 'feed-time';
            time.textContent = parseInt(token.cyclesExecuted, 10) + ' cycles';

            const amount = document.createElement('div');
            amount.className = 'feed-amount';
            amount.textContent = '-' + formatNumber(parseInt(token.tokensBurned, 10));

            content.appendChild(name);
            content.appendChild(time);
            item.appendChild(icon);
            item.appendChild(content);
            item.appendChild(amount);
            feedListEl.appendChild(item);
        });
    } else {
        const empty = document.createElement('div');
        empty.className = 'feed-empty';
        empty.textContent = 'No burns yet';
        feedListEl.appendChild(empty);
    }
}

// Navigation scroll effect
function initNavScroll() {
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.nav');
        if (nav) {
            nav.style.background = window.scrollY > 50
                ? 'rgba(12, 12, 12, 0.98)'
                : 'rgba(12, 12, 12, 0.9)';
        }
    });
}

// Smooth scroll for anchor links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });
}

// Tool selector tabs
function initToolSelector() {
    const toolTabs = document.querySelectorAll('.tool-tab');
    const toolContents = document.querySelectorAll('.tool-content');

    toolTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all
            toolTabs.forEach(t => t.classList.remove('active'));
            toolContents.forEach(c => c.classList.remove('active'));

            // Add active to clicked
            tab.classList.add('active');
            const toolId = tab.dataset.tool;
            if (toolId) {
                const toolContent = document.getElementById('tool-' + toolId);
                if (toolContent) {
                    toolContent.classList.add('active');
                }
            }
        });
    });
}

// ROI Calculator with input validation
function initROICalculator() {
    const roiInputs = ['roi-position', 'roi-supply', 'roi-volume', 'roi-period'];

    function calculateROI() {
        // Validate inputs with bounds to prevent manipulation
        const position = validateNumericInput(
            document.getElementById('roi-position')?.value,
            0, 1e15, 0
        );
        const supply = validateNumericInput(
            document.getElementById('roi-supply')?.value,
            1, 1e15, 1
        );
        const dailyVolume = validateNumericInput(
            document.getElementById('roi-volume')?.value,
            0, 1e12, 0
        );
        const days = validateNumericInput(
            document.getElementById('roi-period')?.value,
            1, 3650, 90
        );

        // Assumptions:
        // - Creator fee rate: ~1% of volume goes to fees
        // - 44.8% of fees go to ASDF buyback
        // - Estimated burn per SOL (varies with price)
        const feeRate = 0.01;
        const burnRate = 0.448;
        const estimatedTokensPerSol = 10000; // Placeholder - depends on price

        // Current percentage
        const currentPct = (position / supply) * 100;

        // Estimated tokens burned over period
        const totalFees = dailyVolume * days * feeRate;
        const burnedTokens = totalFees * burnRate * estimatedTokensPerSol;

        // New supply after burns
        const newSupply = Math.max(supply - burnedTokens, position);

        // New percentage
        const newPct = (position / newSupply) * 100;

        // Update UI safely using textContent
        const roiCurrentPct = document.getElementById('roi-current-pct');
        const roiBurned = document.getElementById('roi-burned');
        const roiNewSupply = document.getElementById('roi-new-supply');
        const roiNewPct = document.getElementById('roi-new-pct');

        if (roiCurrentPct) roiCurrentPct.textContent = currentPct.toFixed(4) + '%';
        if (roiBurned) roiBurned.textContent = '~' + formatNumber(Math.round(burnedTokens));
        if (roiNewSupply) roiNewSupply.textContent = '~' + formatNumber(Math.round(newSupply));
        if (roiNewPct) roiNewPct.textContent = newPct.toFixed(4) + '%';
    }

    // Attach listeners
    roiInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', calculateROI);
            el.addEventListener('change', calculateROI);
        }
    });

    // Initial calculation
    calculateROI();
}

// Mobile navigation toggle
function initMobileNav() {
    const mobileToggle = document.querySelector('.mobile-nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-open');
            mobileToggle.setAttribute('aria-expanded',
                navLinks.classList.contains('mobile-open') ? 'true' : 'false'
            );
        });
    }
}

// Initialize all components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    fetchStats();
    initNavScroll();
    initSmoothScroll();
    initToolSelector();
    initROICalculator();
    initMobileNav();
});

// Refresh stats every 30s when API connected
// setInterval(fetchStats, 30000);
