'use strict';

// ============================================
// ASDF Learn - Interactive Learning Platform
// Extracted from learn.html for CSP compliance
// ============================================

// ============================================
// SECURITY UTILITIES
// ============================================

        // Escape HTML to prevent XSS attacks
        function escapeHtml(str) {
            if (typeof str !== 'string') return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        // Sanitize URL to prevent javascript: protocol attacks
        function sanitizeUrl(url) {
            if (typeof url !== 'string') return '';
            try {
                const parsed = new URL(url);
                if (!['http:', 'https:'].includes(parsed.protocol)) {
                    return '';
                }
                return url;
            } catch {
                return '';
            }
        }

        // ============================================
        // STATE MANAGEMENT
        // ============================================

        const STORAGE_KEY = 'asdf_learn_v2';

        const defaultState = {
            currentLevel: 1,
            completedLevels: [],
            totalXP: 0,
            startTime: null,
            wrongAnswers: 0,
            badges: [],
            courseCompleted: false
        };

        // Security: Validate localStorage data schema to prevent tampering
        function validateState(data) {
            if (typeof data !== 'object' || data === null) return false;
            if (typeof data.currentLevel !== 'number' || data.currentLevel < 1 || data.currentLevel > 5) return false;
            if (!Array.isArray(data.completedLevels)) return false;
            if (typeof data.totalXP !== 'number' || data.totalXP < 0 || data.totalXP > 100000) return false;
            if (typeof data.wrongAnswers !== 'number' || data.wrongAnswers < 0) return false;
            if (!Array.isArray(data.badges)) return false;
            if (typeof data.courseCompleted !== 'boolean') return false;
            // Validate array contents
            if (!data.completedLevels.every(l => typeof l === 'number' && l >= 1 && l <= 5)) return false;
            if (!data.badges.every(b => typeof b === 'string' && b.length < 50)) return false;
            return true;
        }

        function getState() {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const merged = { ...defaultState, ...parsed };
                    // Validate schema before returning
                    if (validateState(merged)) {
                        return merged;
                    }
                    console.warn('Invalid state schema, resetting to default');
                    localStorage.removeItem(STORAGE_KEY);
                }
                return { ...defaultState };
            } catch (e) {
                console.warn('Error reading state, resetting to default');
                localStorage.removeItem(STORAGE_KEY);
                return { ...defaultState };
            }
        }

        function saveState(state) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (e) {
                console.warn('Could not save state');
            }
        }

        // ============================================
        // XP SYSTEM
        // ============================================

        const XP_VALUES = {
            level1: 100,
            level2: 150,
            level3: 200,
            level4: 250,
            level5: 300,
            quiz: 25,
            speedBonus: 100,
            perfectBonus: 150
        };

        function addXP(amount) {
            const state = getState();
            state.totalXP += amount;
            saveState(state);
            updateXPDisplay();
        }

        function updateXPDisplay() {
            const state = getState();
            document.getElementById('total-xp').textContent = state.totalXP + ' XP';
        }

        // ============================================
        // BADGES SYSTEM
        // ============================================

        const BADGE_DEFINITIONS = {
            spark: { id: 'spark', icon: '🔥', name: 'The Spark', condition: 'Complete Level 1' },
            flames: { id: 'flames', icon: '🌋', name: 'The Flames', condition: 'Complete Level 2' },
            engine: { id: 'engine', icon: '⚙️', name: 'The Engine', condition: 'Complete Level 3' },
            forge: { id: 'forge', icon: '🛠️', name: 'The Forge', condition: 'Complete Level 4' },
            core: { id: 'core', icon: '💎', name: 'The Core', condition: 'Complete Level 5' },
            speed: { id: 'speed', icon: '⚡', name: 'Speed Runner', condition: 'Finish in <10 min' },
            perfect: { id: 'perfect', icon: '🎯', name: 'Perfect Score', condition: 'No wrong answers' },
            master: { id: 'master', icon: '👑', name: 'ASDF Master', condition: 'Earn all badges' }
        };

        function earnBadge(badgeId) {
            const state = getState();
            if (state.badges.includes(badgeId)) return;

            state.badges.push(badgeId);
            saveState(state);

            // Update UI
            const badgeEl = document.getElementById('badge-' + badgeId);
            if (badgeEl) {
                badgeEl.classList.remove('locked');
                badgeEl.classList.add('earned');
            }

            // Show popup
            showAchievement(BADGE_DEFINITIONS[badgeId]);

            // Check for master badge
            if (state.badges.length === 7 && !state.badges.includes('master')) {
                setTimeout(() => earnBadge('master'), 2000);
            }
        }

        function showAchievement(badge) {
            const popup = document.getElementById('achievement-popup');
            document.getElementById('achievement-icon').textContent = badge.icon;
            document.getElementById('achievement-title').textContent = badge.name;
            document.getElementById('achievement-subtitle').textContent = badge.condition;
            document.getElementById('achievement-xp').textContent = '+50 XP';

            popup.classList.add('show');
            addXP(50);

            setTimeout(() => {
                popup.classList.remove('show');
            }, 3500);
        }

        function updateBadges() {
            const state = getState();
            state.badges.forEach(badgeId => {
                const badgeEl = document.getElementById('badge-' + badgeId);
                if (badgeEl) {
                    badgeEl.classList.remove('locked');
                    badgeEl.classList.add('earned');
                }
            });
        }

        // ============================================
        // NAVIGATION
        // ============================================

        function updateNavigation() {
            const state = getState();
            const navLevels = document.querySelectorAll('.nav-level');
            const connectors = document.querySelectorAll('.nav-connector');

            navLevels.forEach((el, index) => {
                const level = index + 1;
                el.classList.remove('completed', 'current', 'locked');

                if (state.completedLevels.includes(level)) {
                    el.classList.add('completed');
                } else if (level === state.currentLevel) {
                    el.classList.add('current');
                } else if (level > state.currentLevel) {
                    el.classList.add('locked');
                }
            });

            connectors.forEach((el, index) => {
                el.classList.toggle('active', state.completedLevels.includes(index + 1));
            });
        }

        function goToLevel(level) {
            const state = getState();
            if (level > state.currentLevel && !state.completedLevels.includes(level)) return;

            document.querySelectorAll('.level-section').forEach(el => el.classList.remove('active'));
            const targetSection = document.getElementById('level-' + level);
            if (targetSection) targetSection.classList.add('active');

            state.currentLevel = level;
            saveState(state);
            updateNavigation();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function unlockLevel(level) {
            const state = getState();
            const prevLevel = level - 1;

            if (!state.completedLevels.includes(prevLevel)) {
                state.completedLevels.push(prevLevel);
                addXP(XP_VALUES['level' + prevLevel]);

                // Earn badge
                const badgeMap = { 1: 'spark', 2: 'flames', 3: 'engine', 4: 'forge', 5: 'core' };
                if (badgeMap[prevLevel]) {
                    earnBadge(badgeMap[prevLevel]);
                }
            }

            state.currentLevel = level;
            saveState(state);
            updateNavigation();
            goToLevel(level);
        }

        function completeCourse() {
            const state = getState();

            if (!state.completedLevels.includes(5)) {
                state.completedLevels.push(5);
                addXP(XP_VALUES.level5);
                earnBadge('core');
            }

            // Check speed bonus
            if (state.startTime) {
                const elapsed = (Date.now() - state.startTime) / 1000 / 60;
                if (elapsed < 10 && !state.badges.includes('speed')) {
                    earnBadge('speed');
                    addXP(XP_VALUES.speedBonus);
                }
            }

            // Check perfect score
            if (state.wrongAnswers === 0 && !state.badges.includes('perfect')) {
                earnBadge('perfect');
                addXP(XP_VALUES.perfectBonus);
            }

            state.courseCompleted = true;
            saveState(state);

            // Show completion banner
            document.getElementById('completion-banner').style.display = 'block';
            document.getElementById('level-5-actions').style.display = 'none';

            updateLeaderboard();
        }

        function resetProgress() {
            if (confirm('Reset all progress?')) {
                localStorage.removeItem(STORAGE_KEY);
                location.reload();
            }
        }

        // ============================================
        // VIEW SWITCHING
        // ============================================

        function switchView(view) {
            document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

            document.getElementById('view-' + view).classList.add('active');
            event.target.classList.add('active');
        }

        // ============================================
        // BUILD VIEW - Project Filters (Multi-dimensional)
        // ============================================
        const activeFilters = { status: 'all', skill: 'all', type: 'all' };

        function filterProjects(filterType, value) {
            activeFilters[filterType] = value;

            // Update active filter buttons
            document.querySelectorAll(`.filter-btn[data-filter="${filterType}"]`).forEach(btn => {
                const isActive = btn.dataset.value === value;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });

            // Filter project cards based on all active filters
            document.querySelectorAll('.project-card').forEach(card => {
                const statusMatch = activeFilters.status === 'all' || card.dataset.status === activeFilters.status;
                const skillMatch = activeFilters.skill === 'all' || (card.dataset.skills && card.dataset.skills.includes(activeFilters.skill));
                const typeMatch = activeFilters.type === 'all' || card.dataset.type === activeFilters.type;

                const isVisible = statusMatch && skillMatch && typeMatch;
                card.classList.toggle('hidden', !isVisible);
                card.setAttribute('aria-hidden', !isVisible ? 'true' : 'false');
            });
        }

        // ============================================
        // TECHNICAL DOCUMENTATION
        // ============================================
        const projectDocs = {
            'burn-engine': {
                title: '🔥 ASDF Burn Engine',
                sections: [
                    {
                        title: '📖 Overview',
                        content: 'Autonomous protocol that converts ecosystem activity into permanent token burns. The core deflationary mechanism of ASDF.'
                    },
                    {
                        title: '🏗️ Architecture',
                        content: `<ul>
                            <li><strong>Trading Volume:</strong> Pump.fun trades generate creator fees → automatic buyback → token burn</li>
                            <li><strong>Ecosystem Apps:</strong> Apps deposit SOL or $ASDF tokens → automatic or manual burn cycles</li>
                            <li><strong>Token Hierarchy:</strong> Secondary tokens contribute 44.8% of fees to root treasury</li>
                        </ul>`
                    },
                    {
                        title: '🛠️ Tech Stack',
                        content: 'TypeScript (74.1%), Rust (14.5%), JavaScript, Solana (Anchor framework)'
                    },
                    {
                        title: '📁 Project Structure',
                        content: `<div class="doc-code"><pre>/programs/asdf-burn-engine/ - Solana smart contract
/dashboard/ - Web interface
/docs/ - Developer guides (API Reference, Architecture)
/scripts/ - Automation tools
/tests/ - Test suite</pre></div>`
                    },
                    {
                        title: '⚙️ Installation',
                        content: `<div class="doc-code"><pre>git clone https://github.com/zeyxx/asdf-burn-engine
cd asdf-burn-engine
cp .env.template .env
# Configure environment variables
npm install
anchor build</pre></div>`
                    },
                    {
                        title: '🔗 Key Info',
                        content: 'Program ID: <code>ASDFc5hkEM2MF8mrAAtCPieV6x6h1B5BwjgztFt7Xbui</code><br>Philosophy: "Creation, not extraction. Flush. Burn. Verify."'
                    }
                ],
                contributors: [{ name: 'zeyxx', url: 'https://github.com/zeyxx' }],
                github: 'https://github.com/zeyxx/asdf-burn-engine'
            },
            'validator': {
                title: '✅ ASDF Validator',
                sections: [
                    {
                        title: '📖 Overview',
                        content: 'Real-time fee tracking system for Pump.fun token creators on Solana blockchain with WebSocket-based live updates (~400ms latency).'
                    },
                    {
                        title: '✨ Features',
                        content: `<ul>
                            <li>Real-time tracking via WebSocket</li>
                            <li>Per-token fee attribution and auto-discovery</li>
                            <li>Proof-of-History SHA-256 chain verification</li>
                            <li>Web dashboard with analytics</li>
                            <li>Dual vault monitoring (Bonding Curve + AMM)</li>
                        </ul>`
                    },
                    {
                        title: '🛠️ Tech Stack',
                        content: 'TypeScript (85.8%), JavaScript, Node.js, Express.js, Jest, React dashboard'
                    },
                    {
                        title: '📁 Project Structure',
                        content: `<div class="doc-code"><pre>asdf-validator/
├── cli.ts / daemon.ts / index.ts (entry points)
├── lib/
│   ├── fee-tracker.ts
│   ├── realtime-tracker.ts
│   ├── history-manager.ts
│   ├── token-manager.ts
│   └── websocket-manager.ts
├── dashboard/ (Express server + frontend)
└── tests/</pre></div>`
                    },
                    {
                        title: '⚙️ Installation & Usage',
                        content: `<div class="doc-code"><pre># Install
npm install && npm run build

# CLI Mode
npx ts-node cli.ts --creator YOUR_CREATOR_ADDRESS

# Dashboard
npx ts-node dashboard/server.ts CREATOR_ADDRESS [RPC_URL] [PORT]
# Access: http://localhost:3000</pre></div>`
                    }
                ],
                contributors: [{ name: 'zeyxx', url: 'https://github.com/zeyxx' }],
                github: 'https://github.com/zeyxx/asdf-validator'
            },
            'vanity-grinder': {
                title: '🎯 Vanity Grinder',
                sections: [
                    {
                        title: '📖 Overview',
                        content: 'High-performance Rust implementation for generating vanity Solana addresses with custom prefixes.'
                    },
                    {
                        title: '🛠️ Tech Stack',
                        content: 'Rust (95.1%), Shell (4.9%)'
                    },
                    {
                        title: '⚙️ Usage',
                        content: `<div class="doc-code"><pre># Clone and build
git clone https://github.com/zeyxx/asdf-vanity-grinder
cd asdf-vanity-grinder
cargo build --release

# Run
./start_grinder.sh</pre></div>`
                    }
                ],
                contributors: [{ name: 'zeyxx', url: 'https://github.com/zeyxx' }],
                github: 'https://github.com/zeyxx/asdf-vanity-grinder'
            },
            'holdex': {
                title: '📊 HolDex',
                sections: [
                    {
                        title: '📖 Overview',
                        content: 'An open-source DexScreener alternative, powered by ASDFASDFA. Track tokens, view charts, and monitor the ecosystem.'
                    },
                    {
                        title: '🛠️ Tech Stack',
                        content: 'HTML (66.1%), JavaScript (33.5%), Docker support'
                    },
                    {
                        title: '📁 Project Structure',
                        content: `<div class="doc-code"><pre>HolDex/
├── src/ (application code)
├── homepage.html
├── submissions.html
├── package.json
├── Dockerfile
└── docker-compose.yml</pre></div>`
                    },
                    {
                        title: '⚙️ Installation',
                        content: `<div class="doc-code"><pre># Using Docker
docker-compose up -d

# Or manual
npm install
npm start</pre></div>`
                    }
                ],
                contributors: [{ name: 'sollama58', url: 'https://github.com/sollama58' }],
                github: 'https://github.com/sollama58/HolDex'
            },
            'asdforecast': {
                title: '🔮 ASDForecast',
                sections: [
                    {
                        title: '📖 Overview',
                        content: 'Prediction market for Solana, built for ASDFASDFA. Fees go towards ASDF buybacks and burns.'
                    },
                    {
                        title: '🛠️ Tech Stack',
                        content: 'HTML (70%), JavaScript (30%), Node.js'
                    },
                    {
                        title: '📁 Project Structure',
                        content: `<div class="doc-code"><pre>ASDForecast/
├── frontend.html (main app)
├── control_panel.html
├── burnMonitorFrontend.html
├── status_monitor_widget.html
├── server.js
└── package.json</pre></div>`
                    },
                    {
                        title: '⚙️ Installation',
                        content: `<div class="doc-code"><pre>npm install
node server.js
# Open frontend.html in browser</pre></div>`
                    }
                ],
                contributors: [
                    { name: 'sollama58', url: 'https://github.com/sollama58' },
                    { name: 'zeyxx', url: 'https://github.com/zeyxx' }
                ],
                github: 'https://github.com/sollama58/ASDForecast'
            },
            'burntracker': {
                title: '📈 ASDFBurnTracker',
                sections: [
                    {
                        title: '📖 Overview',
                        content: 'Tracks ASDF BuyBacks and Burns in real-time. Visual proof of the deflationary mechanism at work.'
                    },
                    {
                        title: '🛠️ Tech Stack',
                        content: 'HTML (59.3%), JavaScript (40.7%), Node.js'
                    },
                    {
                        title: '📁 Project Structure',
                        content: `<div class="doc-code"><pre>ASDFBurnTracker/
├── originalHTMLwidget.html
├── server.js
└── package.json</pre></div>`
                    },
                    {
                        title: '⚙️ Installation',
                        content: `<div class="doc-code"><pre>npm install
node server.js</pre></div>`
                    }
                ],
                contributors: [{ name: 'sollama58', url: 'https://github.com/sollama58' }],
                github: 'https://github.com/sollama58/ASDFBurnTracker'
            },
            'asdev': {
                title: '🚀 ASDev',
                sections: [
                    {
                        title: '📖 Overview',
                        content: 'Token launcher for Solana. Ships tokens that end with "ASDF". Built-in airdrop rewards and holder tracking.'
                    },
                    {
                        title: '✨ Features',
                        content: `<ul>
                            <li>Token deployment queuing</li>
                            <li>Vanity address generation (ASDF suffix)</li>
                            <li>Metadata upload to IPFS via Pinata</li>
                            <li>Airdrop eligibility checking</li>
                            <li>Holder tracking (top 50 per token)</li>
                            <li>Leaderboard by volume</li>
                            <li>Real-time launch feed</li>
                        </ul>`
                    },
                    {
                        title: '🛠️ Tech Stack',
                        content: 'Node.js 18+, Rust (vanity grinder), Redis, Solana Web3.js, Express.js'
                    },
                    {
                        title: '🔒 Security',
                        content: `<ul>
                            <li>Rate limiting (100 req/15min on API, 3/min on deployment)</li>
                            <li>Helmet security headers</li>
                            <li>CORS configuration</li>
                            <li>Input validation for Solana addresses</li>
                            <li>Admin authentication for debug endpoints</li>
                        </ul>`
                    },
                    {
                        title: '⚙️ Installation',
                        content: `<div class="doc-code"><pre># Clone
git clone https://github.com/sollama58/ASDev
cd ASDev

# Install dependencies
npm install

# Install Rust for vanity grinder
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Configure environment
cp .env.template .env
# Edit .env with your settings

# Start
npm start</pre></div>`
                    }
                ],
                contributors: [
                    { name: 'sollama58', url: 'https://github.com/sollama58' },
                    { name: 'zeyxx', url: 'https://github.com/zeyxx' }
                ],
                github: 'https://github.com/sollama58/ASDev'
            },
            'grinder': {
                title: '⚙️ asdf_grinder',
                sections: [
                    {
                        title: '📖 Overview',
                        content: 'Grinder for ASDF pubkeys. Generate vanity Solana addresses with custom prefixes. Docker support included.'
                    },
                    {
                        title: '🛠️ Tech Stack',
                        content: 'Rust (89.5%), Docker (5.9%), Shell (4.6%)'
                    },
                    {
                        title: '⚙️ Installation',
                        content: `<div class="doc-code"><pre># Clone
git clone https://github.com/sollama58/asdf_grinder
cd asdf_grinder

# Build with Cargo
cargo build --release

# Or use Docker
docker build -t asdf-grinder .
docker run asdf-grinder

# Run
./start_grinder.sh</pre></div>`
                    }
                ],
                contributors: [{ name: 'sollama58', url: 'https://github.com/sollama58' }],
                github: 'https://github.com/sollama58/asdf_grinder'
            }
        };

        function openDocs(projectId) {
            const doc = projectDocs[projectId];
            if (!doc) return;

            const modal = document.getElementById('doc-modal');
            const title = document.getElementById('doc-modal-title');
            const body = document.getElementById('doc-modal-body');

            title.textContent = doc.title;

            let html = '';
            doc.sections.forEach(section => {
                html += `<div class="doc-section">
                    <h3>${escapeHtml(section.title)}</h3>
                    <p>${escapeHtml(section.content)}</p>
                </div>`;
            });

            html += '<div class="doc-section"><h3>👥 Contributors</h3><div class="doc-contributors">';
            doc.contributors.forEach(c => {
                const safeUrl = sanitizeUrl(c.url);
                const safeName = escapeHtml(c.name);
                html += `<div class="doc-contributor">
                    <img src="https://github.com/${safeName}.png" alt="${safeName}">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeName}</a>
                </div>`;
            });
            html += '</div></div>';

            html += `<div class="doc-links">
                <a href="${escapeHtml(doc.github)}" class="doc-link" target="_blank" rel="noopener noreferrer">View on GitHub</a>
                <button class="doc-link deep-learn" onclick="closeDocs(); openDeepLearn('${escapeHtml(projectId)}')">🎓 Deep Learn</button>
                <a href="${escapeHtml(doc.github)}/issues/new" class="doc-link secondary" target="_blank" rel="noopener noreferrer">Report Issue</a>
            </div>`;

            body.innerHTML = html;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeDocs() {
            document.getElementById('doc-modal').classList.remove('active');
            document.body.style.overflow = '';
        }

        // ============================================
        // DEEP LEARN - Complete Technical Documentation
        // ============================================
        const deepLearnDocs = {
            'burn-engine': {
                title: '🔥 ASDF Burn Engine - Deep Learn',
                tabs: ['Introduction', 'Architecture', 'Smart Contract', 'Integration', 'API Reference', 'Deployment'],
                content: {
                    'Introduction': `
                        <h3>What is the ASDF Burn Engine?</h3>
                        <p>The ASDF Burn Engine is an <strong>autonomous protocol</strong> that converts ecosystem activity into permanent token burns. It's the core deflationary mechanism that powers the entire ASDF ecosystem.</p>

                        <h4>Philosophy</h4>
                        <p>"Creation, not extraction. Flush. Burn. Verify." - Unlike traditional fee mechanisms that extract value from users, the Burn Engine creates value by permanently reducing token supply.</p>

                        <div class="deep-diagram">
                            <p style="margin-bottom: 16px; color: var(--text-cream);">The Deflationary Flywheel</p>
                            <div class="deep-diagram-flow">
                                <div class="deep-diagram-box">Trading Activity</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Fees Collected</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Auto Buyback</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Token Burn</div>
                            </div>
                        </div>

                        <h4>Key Benefits</h4>
                        <ul>
                            <li><strong>No staking required</strong> - Holders benefit automatically</li>
                            <li><strong>Zero inflation</strong> - Pure deflationary mechanics</li>
                            <li><strong>Transparent</strong> - All burns verifiable on-chain</li>
                            <li><strong>Autonomous</strong> - No manual intervention needed</li>
                        </ul>

                        <div class="deep-tip">
                            <strong>Pro Tip:</strong> Every transaction in the ASDF ecosystem contributes to burns. The more activity, the more tokens burned.
                        </div>
                    `,
                    'Architecture': `
                        <h3>System Architecture</h3>
                        <p>The Burn Engine operates through three distinct burn channels, each contributing to the deflationary mechanism.</p>

                        <h4>1. Trading Volume Channel</h4>
                        <p>When tokens are traded on Pump.fun, creator fees are automatically collected. These fees trigger an automatic buyback of ASDF tokens, which are then burned.</p>
                        <div class="deep-code">
<span class="comment">// Trading Flow</span>
User trades on Pump.fun
    → Creator fee (1%) collected
    → Fee sent to Burn Engine
    → Engine swaps SOL → ASDF
    → ASDF sent to burn address
    → Supply permanently reduced</div>

                        <h4>2. Ecosystem Apps Channel</h4>
                        <p>Third-party applications integrated with ASDF can deposit SOL or ASDF tokens directly into the burn cycle.</p>
                        <div class="deep-code">
<span class="comment">// For SOL deposits</span>
<span class="function">depositFeeSOL</span>(amount) {
    <span class="comment">// 100% converted to ASDF and burned</span>
}

<span class="comment">// For ASDF deposits</span>
<span class="function">depositFeeASDF</span>(amount) {
    <span class="comment">// 99.448% burned, 0.552% user rebate</span>
}</div>

                        <h4>3. Token Hierarchy Channel</h4>
                        <p>Secondary tokens in the ecosystem contribute a portion of their fees to the root treasury.</p>
                        <table class="deep-table">
                            <tr><th>Destination</th><th>Percentage</th></tr>
                            <tr><td>Root Treasury (Burns)</td><td>44.8%</td></tr>
                            <tr><td>Token's Own Burns</td><td>55.2%</td></tr>
                        </table>

                        <h4>Component Diagram</h4>
                        <div class="deep-code">
┌─────────────────────────────────────────────────────┐
│                   BURN ENGINE                        │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Daemon    │  │   Smart     │  │  Dashboard  │ │
│  │  (Node.js)  │  │  Contract   │  │   (React)   │ │
│  │             │  │  (Anchor)   │  │             │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │        │
│         └────────────────┼────────────────┘        │
│                          │                          │
│                    ┌─────▼─────┐                   │
│                    │  Solana   │                   │
│                    │ Blockchain│                   │
│                    └───────────┘                   │
└─────────────────────────────────────────────────────┘</div>
                    `,
                    'Smart Contract': `
                        <h3>Smart Contract Deep Dive</h3>
                        <p>The Burn Engine smart contract is built using the <strong>Anchor framework</strong> on Solana.</p>

                        <h4>Program ID</h4>
                        <div class="deep-code">ASDFc5hkEM2MF8mrAAtCPieV6x6h1B5BwjgztFt7Xbui</div>

                        <h4>Core Instructions</h4>
                        <div class="deep-code">
<span class="keyword">pub mod</span> burn_engine {
    <span class="keyword">use</span> anchor_lang::prelude::*;

    <span class="comment">// Initialize the burn engine</span>
    <span class="keyword">pub fn</span> <span class="function">initialize</span>(ctx: Context<Initialize>) -> Result<()> {
        <span class="comment">// Sets up treasury accounts and config</span>
    }

    <span class="comment">// Deposit SOL for burning</span>
    <span class="keyword">pub fn</span> <span class="function">deposit_sol</span>(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
        <span class="comment">// Swaps SOL to ASDF via Jupiter</span>
        <span class="comment">// Burns the ASDF tokens</span>
    }

    <span class="comment">// Deposit ASDF for burning</span>
    <span class="keyword">pub fn</span> <span class="function">deposit_asdf</span>(ctx: Context<DepositAsdf>, amount: u64) -> Result<()> {
        <span class="comment">// 99.448% burned</span>
        <span class="comment">// 0.552% returned as rebate</span>
    }

    <span class="comment">// Execute burn cycle</span>
    <span class="keyword">pub fn</span> <span class="function">execute_burn</span>(ctx: Context<ExecuteBurn>) -> Result<()> {
        <span class="comment">// Triggers accumulated burns</span>
    }
}</div>

                        <h4>Account Structure</h4>
                        <table class="deep-table">
                            <tr><th>Account</th><th>Purpose</th><th>Size</th></tr>
                            <tr><td>BurnConfig</td><td>Global configuration</td><td>128 bytes</td></tr>
                            <tr><td>Treasury</td><td>Holds pending burns</td><td>PDA</td></tr>
                            <tr><td>BurnHistory</td><td>Records all burns</td><td>Dynamic</td></tr>
                        </table>

                        <div class="deep-warning">
                            <strong>Security Note:</strong> The burn address has no private key. Tokens sent there are permanently irrecoverable.
                        </div>
                    `,
                    'Integration': `
                        <h3>Integrating with the Burn Engine</h3>
                        <p>Any application can integrate with the Burn Engine to contribute to the deflationary mechanism.</p>

                        <h4>JavaScript SDK</h4>
                        <div class="deep-code">
<span class="keyword">import</span> { BurnEngine } <span class="keyword">from</span> <span class="string">'@asdf/burn-engine-sdk'</span>;

<span class="comment">// Initialize</span>
<span class="keyword">const</span> engine = <span class="keyword">new</span> <span class="function">BurnEngine</span>({
    rpcUrl: <span class="string">'https://api.mainnet-beta.solana.com'</span>,
    wallet: yourWallet
});

<span class="comment">// Deposit SOL for burning</span>
<span class="keyword">await</span> engine.<span class="function">depositSOL</span>({
    amount: 0.1, <span class="comment">// SOL</span>
    memo: <span class="string">'App fee contribution'</span>
});

<span class="comment">// Deposit ASDF for burning</span>
<span class="keyword">await</span> engine.<span class="function">depositASDF</span>({
    amount: 1000, <span class="comment">// ASDF tokens</span>
    memo: <span class="string">'User burn'</span>
});

<span class="comment">// Check burn stats</span>
<span class="keyword">const</span> stats = <span class="keyword">await</span> engine.<span class="function">getStats</span>();
console.log(<span class="string">\`Total burned: \${stats.totalBurned}\`</span>);</div>

                        <h4>Direct RPC Integration</h4>
                        <div class="deep-code">
<span class="comment">// Build transaction manually</span>
<span class="keyword">const</span> tx = <span class="keyword">new</span> Transaction().<span class="function">add</span>(
    <span class="keyword">await</span> program.methods
        .<span class="function">depositSol</span>(<span class="keyword">new</span> BN(amount))
        .<span class="function">accounts</span>({
            depositor: wallet.publicKey,
            treasury: treasuryPDA,
            systemProgram: SystemProgram.programId
        })
        .<span class="function">instruction</span>()
);

<span class="keyword">await</span> <span class="function">sendAndConfirmTransaction</span>(connection, tx, [wallet]);</div>

                        <h4>Integration Checklist</h4>
                        <ul>
                            <li>Install the SDK: <code>npm install @asdf/burn-engine-sdk</code></li>
                            <li>Configure your RPC endpoint</li>
                            <li>Set up wallet connection</li>
                            <li>Implement deposit calls in your fee logic</li>
                            <li>Display burn contribution to users (optional)</li>
                        </ul>

                        <div class="deep-tip">
                            <strong>Best Practice:</strong> Show users their contribution to burns. It builds trust and community engagement.
                        </div>
                    `,
                    'API Reference': `
                        <h3>API Reference</h3>
                        <p>The Burn Engine daemon exposes public APIs for monitoring and verification.</p>

                        <h4>Endpoints</h4>
                        <table class="deep-table">
                            <tr><th>Endpoint</th><th>Method</th><th>Description</th></tr>
                            <tr><td>/stats</td><td>GET</td><td>Current burn statistics</td></tr>
                            <tr><td>/health</td><td>GET</td><td>Daemon health check</td></tr>
                            <tr><td>/burns</td><td>GET</td><td>Recent burn history</td></tr>
                            <tr><td>/burns/:txId</td><td>GET</td><td>Specific burn details</td></tr>
                        </table>

                        <h4>GET /stats</h4>
                        <div class="deep-code">
<span class="comment">// Response</span>
{
    <span class="string">"totalBurned"</span>: <span class="string">"1,234,567,890"</span>,
    <span class="string">"totalBurnedUSD"</span>: <span class="string">"$45,678"</span>,
    <span class="string">"burnCount"</span>: 1547,
    <span class="string">"last24hBurned"</span>: <span class="string">"12,345,678"</span>,
    <span class="string">"avgBurnSize"</span>: <span class="string">"798,432"</span>,
    <span class="string">"supplyReduction"</span>: <span class="string">"2.34%"</span>
}</div>

                        <h4>GET /burns</h4>
                        <div class="deep-code">
<span class="comment">// Query parameters</span>
?limit=50         <span class="comment">// Max results (default 50)</span>
&offset=0         <span class="comment">// Pagination offset</span>
&from=1703980800  <span class="comment">// Unix timestamp start</span>
&to=1704067200    <span class="comment">// Unix timestamp end</span>

<span class="comment">// Response</span>
{
    <span class="string">"burns"</span>: [
        {
            <span class="string">"txId"</span>: <span class="string">"5Kj2..."</span>,
            <span class="string">"amount"</span>: <span class="string">"1,000,000"</span>,
            <span class="string">"source"</span>: <span class="string">"trading"</span>,
            <span class="string">"timestamp"</span>: 1703980800,
            <span class="string">"verified"</span>: <span class="keyword">true</span>
        }
    ],
    <span class="string">"total"</span>: 1547,
    <span class="string">"hasMore"</span>: <span class="keyword">true</span>
}</div>

                        <h4>Verification</h4>
                        <p>All burns can be independently verified on Solscan:</p>
                        <div class="deep-code">https://solscan.io/tx/{txId}</div>
                    `,
                    'Deployment': `
                        <h3>Deployment Guide</h3>
                        <p>How to deploy and run the Burn Engine components.</p>

                        <h4>Prerequisites</h4>
                        <ul>
                            <li>Node.js 18+</li>
                            <li>Rust & Cargo (latest stable)</li>
                            <li>Solana CLI tools</li>
                            <li>Anchor CLI v0.29+</li>
                        </ul>

                        <h4>1. Clone & Setup</h4>
                        <div class="deep-code">
git clone https://github.com/zeyxx/asdf-burn-engine
cd asdf-burn-engine
cp .env.template .env
<span class="comment"># Edit .env with your configuration</span></div>

                        <h4>2. Environment Variables</h4>
                        <div class="deep-code">
<span class="comment"># Required</span>
RPC_URL=https://api.mainnet-beta.solana.com
WALLET_PATH=/path/to/keypair.json

<span class="comment"># Optional</span>
BURN_INTERVAL=300000  <span class="comment"># 5 minutes</span>
MIN_BURN_AMOUNT=1000  <span class="comment"># Minimum tokens to trigger burn</span>
LOG_LEVEL=info</div>

                        <h4>3. Build Smart Contract</h4>
                        <div class="deep-code">
anchor build
anchor test  <span class="comment"># Run tests</span>
anchor deploy --provider.cluster mainnet</div>

                        <h4>4. Run Daemon</h4>
                        <div class="deep-code">
npm install
npm run build
npm run start:daemon</div>

                        <h4>5. Run Dashboard</h4>
                        <div class="deep-code">
cd dashboard
npm install
npm run build
npm run start</div>

                        <div class="deep-warning">
                            <strong>Production Warning:</strong> Always test on devnet first. Mainnet deployments involve real funds.
                        </div>

                        <h4>Monitoring</h4>
                        <p>The daemon exposes Prometheus metrics at <code>/metrics</code> for monitoring with Grafana.</p>
                    `
                }
            },
            'validator': {
                title: '✅ ASDF Validator - Deep Learn',
                tabs: ['Introduction', 'How It Works', 'Installation', 'CLI Usage', 'Dashboard', 'API'],
                content: {
                    'Introduction': `
                        <h3>What is the ASDF Validator?</h3>
                        <p>The ASDF Validator is a <strong>real-time fee tracking system</strong> for Pump.fun token creators on the Solana blockchain. It provides WebSocket-based live updates with approximately 400ms latency.</p>

                        <h4>Key Features</h4>
                        <ul>
                            <li><strong>Real-time tracking</strong> via WebSocket subscriptions</li>
                            <li><strong>Per-token fee attribution</strong> with auto-discovery</li>
                            <li><strong>Proof-of-History</strong> SHA-256 chain verification</li>
                            <li><strong>Web dashboard</strong> with analytics</li>
                            <li><strong>Dual vault monitoring</strong> (Bonding Curve + AMM)</li>
                        </ul>

                        <div class="deep-diagram">
                            <p style="margin-bottom: 16px; color: var(--text-cream);">Data Flow</p>
                            <div class="deep-diagram-flow">
                                <div class="deep-diagram-box">Solana RPC</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">WebSocket</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Fee Tracker</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Dashboard</div>
                            </div>
                        </div>

                        <h4>Use Cases</h4>
                        <ul>
                            <li>Track creator earnings in real-time</li>
                            <li>Verify fee distributions</li>
                            <li>Build analytics dashboards</li>
                            <li>Integrate with burn mechanisms</li>
                        </ul>
                    `,
                    'How It Works': `
                        <h3>Technical Architecture</h3>

                        <h4>WebSocket Subscription</h4>
                        <p>The validator subscribes to account changes on Solana using WebSocket connections:</p>
                        <div class="deep-code">
<span class="comment">// Subscribe to vault account changes</span>
connection.<span class="function">onAccountChange</span>(vaultPubkey, (accountInfo) => {
    <span class="comment">// Detect balance modifications</span>
    <span class="keyword">const</span> newBalance = accountInfo.lamports;
    <span class="keyword">if</span> (newBalance > previousBalance) {
        <span class="comment">// Fee detected!</span>
        <span class="function">processFeeEvent</span>(newBalance - previousBalance);
    }
});</div>

                        <h4>Fee Attribution</h4>
                        <p>When a fee is detected, the system:</p>
                        <ul>
                            <li>Fetches the full transaction data</li>
                            <li>Parses token balances and transfers</li>
                            <li>Attributes the fee to specific token mints</li>
                            <li>Records with cryptographic hash chain</li>
                        </ul>

                        <h4>Proof-of-History Chain</h4>
                        <div class="deep-code">
<span class="keyword">interface</span> FeeRecord {
    txId: <span class="keyword">string</span>;
    amount: <span class="keyword">number</span>;
    tokenMint: <span class="keyword">string</span>;
    timestamp: <span class="keyword">number</span>;
    previousHash: <span class="keyword">string</span>;
    hash: <span class="keyword">string</span>;  <span class="comment">// SHA-256(txId + amount + previousHash)</span>
}

<span class="comment">// Each record links to the previous, creating tamper-proof history</span></div>

                        <h4>Component Overview</h4>
                        <table class="deep-table">
                            <tr><th>Component</th><th>File</th><th>Purpose</th></tr>
                            <tr><td>Fee Tracker</td><td>fee-tracker.ts</td><td>Core tracking logic</td></tr>
                            <tr><td>Realtime Tracker</td><td>realtime-tracker.ts</td><td>WebSocket handler</td></tr>
                            <tr><td>History Manager</td><td>history-manager.ts</td><td>Proof-of-History chain</td></tr>
                            <tr><td>Token Manager</td><td>token-manager.ts</td><td>Token discovery</td></tr>
                            <tr><td>RPC Manager</td><td>rpc-manager.ts</td><td>Connection handling</td></tr>
                        </table>
                    `,
                    'Installation': `
                        <h3>Installation Guide</h3>

                        <h4>Prerequisites</h4>
                        <ul>
                            <li>Node.js 18 or higher</li>
                            <li>npm or yarn</li>
                            <li>A Solana RPC endpoint (mainnet)</li>
                        </ul>

                        <h4>Quick Start</h4>
                        <div class="deep-code">
<span class="comment"># Clone the repository</span>
git clone https://github.com/zeyxx/asdf-validator
cd asdf-validator

<span class="comment"># Install dependencies</span>
npm install

<span class="comment"># Build the project</span>
npm run build

<span class="comment"># Run tests</span>
npm test</div>

                        <h4>Environment Configuration</h4>
                        <div class="deep-code">
<span class="comment"># Create .env file</span>
RPC_URL=https://api.mainnet-beta.solana.com
<span class="comment"># Or use a private RPC for better performance:</span>
<span class="comment"># RPC_URL=https://your-rpc-provider.com</span></div>

                        <div class="deep-tip">
                            <strong>Performance Tip:</strong> Use a dedicated RPC endpoint (Helius, QuickNode, etc.) for production. Public endpoints have rate limits.
                        </div>

                        <h4>Project Structure</h4>
                        <div class="deep-code">
asdf-validator/
├── cli.ts              <span class="comment"># Command-line interface</span>
├── daemon.ts           <span class="comment"># Background service</span>
├── index.ts            <span class="comment"># Library exports</span>
├── lib/
│   ├── fee-tracker.ts
│   ├── realtime-tracker.ts
│   ├── history-manager.ts
│   ├── token-manager.ts
│   ├── rpc-manager.ts
│   └── websocket-manager.ts
├── dashboard/
│   ├── server.ts       <span class="comment"># Express server</span>
│   └── public/         <span class="comment"># Frontend assets</span>
└── tests/</div>
                    `,
                    'CLI Usage': `
                        <h3>Command Line Interface</h3>

                        <h4>Basic Usage</h4>
                        <div class="deep-code">
<span class="comment"># Track a specific creator address</span>
npx ts-node cli.ts --creator YOUR_CREATOR_ADDRESS

<span class="comment"># With verbose output</span>
npx ts-node cli.ts -c ADDRESS -v

<span class="comment"># Save history to file</span>
npx ts-node cli.ts -c ADDRESS -H history.json</div>

                        <h4>CLI Options</h4>
                        <table class="deep-table">
                            <tr><th>Option</th><th>Alias</th><th>Description</th></tr>
                            <tr><td>--creator</td><td>-c</td><td>Creator address to track (required)</td></tr>
                            <tr><td>--history</td><td>-H</td><td>Path to save/load history JSON</td></tr>
                            <tr><td>--verbose</td><td>-v</td><td>Enable verbose logging</td></tr>
                            <tr><td>--rpc</td><td>-r</td><td>Custom RPC endpoint</td></tr>
                        </table>

                        <h4>Example Output</h4>
                        <div class="deep-code">
$ npx ts-node cli.ts -c 7xKX...abc -v

[INFO] Connecting to Solana mainnet...
[INFO] Subscribing to creator: 7xKX...abc
[INFO] Found 3 active tokens

[FEE] Token: ASDF | Amount: 0.125 SOL | Tx: 5Kj2...
[FEE] Token: PUMP | Amount: 0.089 SOL | Tx: 8Mn4...

<span class="comment">--- Running totals ---</span>
Total fees collected: 2.456 SOL
Tokens tracked: 3
Uptime: 4h 32m</div>

                        <h4>Daemon Mode</h4>
                        <div class="deep-code">
<span class="comment"># Run as background daemon</span>
npx ts-node daemon.ts CREATOR_ADDRESS

<span class="comment"># With PM2 for production</span>
pm2 start daemon.ts -- CREATOR_ADDRESS</div>
                    `,
                    'Dashboard': `
                        <h3>Web Dashboard</h3>
                        <p>The validator includes a React-based web dashboard for visualizing fee data.</p>

                        <h4>Starting the Dashboard</h4>
                        <div class="deep-code">
<span class="comment"># Start dashboard server</span>
npx ts-node dashboard/server.ts CREATOR_ADDRESS [RPC_URL] [PORT]

<span class="comment"># Example</span>
npx ts-node dashboard/server.ts 7xKX...abc https://api.mainnet-beta.solana.com 3000

<span class="comment"># Access at http://localhost:3000</span></div>

                        <h4>Dashboard Features</h4>
                        <ul>
                            <li><strong>Real-time feed</strong> - Live fee events as they happen</li>
                            <li><strong>Charts</strong> - Historical fee visualization</li>
                            <li><strong>Token breakdown</strong> - Per-token fee attribution</li>
                            <li><strong>Export</strong> - Download data as CSV/JSON</li>
                        </ul>

                        <h4>Customization</h4>
                        <p>The dashboard is built with React and can be customized:</p>
                        <div class="deep-code">
cd dashboard
npm install
<span class="comment"># Edit components in src/</span>
npm run build</div>

                        <div class="deep-tip">
                            <strong>Embedding:</strong> The dashboard can be embedded in other applications via iframe or integrated as a React component.
                        </div>
                    `,
                    'API': `
                        <h3>Programmatic API</h3>
                        <p>Use the validator as a library in your own applications.</p>

                        <h4>Basic Usage</h4>
                        <div class="deep-code">
<span class="keyword">import</span> { ValidatorDaemon } <span class="keyword">from</span> <span class="string">'./daemon'</span>;

<span class="keyword">const</span> daemon = <span class="keyword">new</span> <span class="function">ValidatorDaemon</span>({
    creatorAddress: <span class="string">'7xKX...abc'</span>,
    rpcUrl: <span class="string">'https://api.mainnet-beta.solana.com'</span>,
    onFeeDetected: (fee) => {
        console.log(<span class="string">\`Fee: \${fee.amount} SOL from \${fee.tokenMint}\`</span>);
    },
    onError: (error) => {
        console.error(<span class="string">'Error:'</span>, error);
    }
});

<span class="keyword">await</span> daemon.<span class="function">start</span>();

<span class="comment">// Later...</span>
<span class="keyword">await</span> daemon.<span class="function">stop</span>();</div>

                        <h4>RealtimeTracker Class</h4>
                        <div class="deep-code">
<span class="keyword">import</span> { RealtimeTracker } <span class="keyword">from</span> <span class="string">'./lib/realtime-tracker'</span>;

<span class="keyword">const</span> tracker = <span class="keyword">new</span> <span class="function">RealtimeTracker</span>(connection, creatorPubkey);

tracker.<span class="function">on</span>(<span class="string">'fee'</span>, (event) => {
    console.log(event.amount, event.tokenMint, event.txId);
});

tracker.<span class="function">on</span>(<span class="string">'newToken'</span>, (mint) => {
    console.log(<span class="string">'New token discovered:'</span>, mint);
});

<span class="keyword">await</span> tracker.<span class="function">subscribe</span>();</div>

                        <h4>HistoryManager Class</h4>
                        <div class="deep-code">
<span class="keyword">import</span> { HistoryManager } <span class="keyword">from</span> <span class="string">'./lib/history-manager'</span>;

<span class="keyword">const</span> history = <span class="keyword">new</span> <span class="function">HistoryManager</span>(<span class="string">'./history.json'</span>);

<span class="comment">// Add record with automatic hash chaining</span>
history.<span class="function">addRecord</span>({
    txId: <span class="string">'5Kj2...'</span>,
    amount: 0.125,
    tokenMint: <span class="string">'ASDF...'</span>
});

<span class="comment">// Verify chain integrity</span>
<span class="keyword">const</span> isValid = history.<span class="function">verifyChain</span>();
console.log(<span class="string">'History valid:'</span>, isValid);</div>
                    `
                }
            },
            'vanity-grinder': {
                title: '🎯 Vanity Grinder - Deep Learn',
                tabs: ['Introduction', 'How It Works', 'Usage', 'Performance'],
                content: {
                    'Introduction': `
                        <h3>What is the Vanity Grinder?</h3>
                        <p>The Vanity Grinder is a high-performance <strong>Rust application</strong> for generating Solana keypairs with custom prefixes (vanity addresses).</p>

                        <h4>What are Vanity Addresses?</h4>
                        <p>A vanity address is a cryptocurrency address that contains a specific pattern or prefix. For example:</p>
                        <div class="deep-code">
<span class="comment">// Normal Solana address</span>
7xKXmR5qN8vZT3wP2LkB9sFgYc1dHjE4aUoW6rMnCp

<span class="comment">// Vanity address with "ASDF" prefix</span>
ASDF7xKXmR5qN8vZT3wP2LkB9sFgYc1dHjE4aUoW6</div>

                        <h4>Use Cases</h4>
                        <ul>
                            <li><strong>Branding</strong> - Create memorable project addresses</li>
                            <li><strong>Verification</strong> - Easily identify official addresses</li>
                            <li><strong>Integration</strong> - Required for ASDev token launches</li>
                        </ul>
                    `,
                    'How It Works': `
                        <h3>Technical Details</h3>

                        <h4>Generation Process</h4>
                        <p>The grinder uses brute-force generation with parallel processing:</p>
                        <div class="deep-code">
<span class="keyword">loop</span> {
    <span class="comment">// 1. Generate random keypair</span>
    <span class="keyword">let</span> keypair = Keypair::<span class="function">new</span>();

    <span class="comment">// 2. Get base58 public key</span>
    <span class="keyword">let</span> pubkey = keypair.pubkey().<span class="function">to_string</span>();

    <span class="comment">// 3. Check if it matches target prefix</span>
    <span class="keyword">if</span> pubkey.<span class="function">starts_with</span>(<span class="string">"ASDF"</span>) {
        <span class="comment">// Found! Save and exit</span>
        <span class="function">save_keypair</span>(keypair);
        <span class="keyword">break</span>;
    }
}</div>

                        <h4>Probability</h4>
                        <p>Solana addresses use Base58 encoding (58 possible characters). The probability of finding a match:</p>
                        <table class="deep-table">
                            <tr><th>Prefix Length</th><th>Probability</th><th>Avg. Attempts</th></tr>
                            <tr><td>1 char</td><td>1/58</td><td>~58</td></tr>
                            <tr><td>2 chars</td><td>1/3,364</td><td>~3,364</td></tr>
                            <tr><td>3 chars</td><td>1/195,112</td><td>~195K</td></tr>
                            <tr><td>4 chars (ASDF)</td><td>1/11,316,496</td><td>~11.3M</td></tr>
                        </table>

                        <div class="deep-warning">
                            <strong>Time Warning:</strong> Finding a 4-character prefix can take minutes to hours depending on hardware.
                        </div>
                    `,
                    'Usage': `
                        <h3>Using the Grinder</h3>

                        <h4>Installation</h4>
                        <div class="deep-code">
<span class="comment"># Clone repository</span>
git clone https://github.com/zeyxx/asdf-vanity-grinder
cd asdf-vanity-grinder

<span class="comment"># Build with optimizations</span>
cargo build --release</div>

                        <h4>Running</h4>
                        <div class="deep-code">
<span class="comment"># Using the start script</span>
./start_grinder.sh

<span class="comment"># Or directly</span>
./target/release/asdf-vanity-grinder --prefix ASDF</div>

                        <h4>Output</h4>
                        <p>When a matching keypair is found, it's saved to a JSON file:</p>
                        <div class="deep-code">
{
    "publicKey": "ASDF7xKXmR5qN8vZT3wP2LkB9sFgYc1dHjE4aUoW6",
    "secretKey": [/* 64 bytes */]
}</div>

                        <div class="deep-warning">
                            <strong>Security:</strong> Never share your secret key! Store it securely and back it up.
                        </div>
                    `,
                    'Performance': `
                        <h3>Performance Optimization</h3>

                        <h4>Hardware Requirements</h4>
                        <ul>
                            <li><strong>CPU:</strong> Multi-core recommended (scales with threads)</li>
                            <li><strong>RAM:</strong> Minimal (~100MB)</li>
                            <li><strong>Storage:</strong> Minimal</li>
                        </ul>

                        <h4>Expected Performance</h4>
                        <table class="deep-table">
                            <tr><th>CPU</th><th>Keys/Second</th><th>4-char Time</th></tr>
                            <tr><td>4-core laptop</td><td>~50,000</td><td>~4 minutes</td></tr>
                            <tr><td>8-core desktop</td><td>~150,000</td><td>~75 seconds</td></tr>
                            <tr><td>32-core server</td><td>~500,000</td><td>~23 seconds</td></tr>
                        </table>

                        <h4>Tips</h4>
                        <ul>
                            <li>Use <code>--release</code> build for 10x+ speedup</li>
                            <li>Run on a server for long prefix searches</li>
                            <li>Case-insensitive matching is faster</li>
                        </ul>

                        <div class="deep-tip">
                            <strong>Cloud Option:</strong> For very long prefixes, consider renting a high-CPU cloud instance temporarily.
                        </div>
                    `
                }
            },
            'holdex': {
                title: '📊 HolDex - Deep Learn',
                tabs: ['Introduction', 'Architecture', 'Setup', 'Customization'],
                content: {
                    'Introduction': `
                        <h3>What is HolDex?</h3>
                        <p>HolDex is an <strong>open-source DexScreener alternative</strong> built for the ASDF ecosystem. It provides token tracking, charts, and ecosystem monitoring.</p>

                        <h4>Features</h4>
                        <ul>
                            <li>Real-time token price tracking</li>
                            <li>Interactive price charts</li>
                            <li>Token search and discovery</li>
                            <li>Ecosystem overview dashboard</li>
                            <li>Docker deployment support</li>
                        </ul>

                        <h4>Why HolDex?</h4>
                        <p>Unlike centralized alternatives, HolDex is:</p>
                        <ul>
                            <li><strong>Open source</strong> - Full transparency</li>
                            <li><strong>Self-hostable</strong> - Run your own instance</li>
                            <li><strong>ASDF-integrated</strong> - Native ecosystem support</li>
                            <li><strong>No tracking</strong> - Privacy-respecting</li>
                        </ul>
                    `,
                    'Architecture': `
                        <h3>Technical Architecture</h3>

                        <h4>Stack Overview</h4>
                        <table class="deep-table">
                            <tr><th>Layer</th><th>Technology</th></tr>
                            <tr><td>Frontend</td><td>HTML, CSS, JavaScript</td></tr>
                            <tr><td>Backend</td><td>Node.js (optional)</td></tr>
                            <tr><td>Data Source</td><td>Solana RPC, Jupiter API</td></tr>
                            <tr><td>Deployment</td><td>Docker, Static hosting</td></tr>
                        </table>

                        <h4>File Structure</h4>
                        <div class="deep-code">
HolDex/
├── src/
│   ├── js/
│   │   ├── app.js        <span class="comment"># Main application</span>
│   │   ├── charts.js     <span class="comment"># Chart rendering</span>
│   │   └── api.js        <span class="comment"># Data fetching</span>
│   └── css/
│       └── styles.css
├── homepage.html         <span class="comment"># Main page</span>
├── submissions.html      <span class="comment"># Token submissions</span>
├── package.json
├── Dockerfile
└── docker-compose.yml</div>

                        <h4>Data Flow</h4>
                        <div class="deep-diagram">
                            <div class="deep-diagram-flow">
                                <div class="deep-diagram-box">User Request</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Jupiter/RPC API</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Process Data</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Render UI</div>
                            </div>
                        </div>
                    `,
                    'Setup': `
                        <h3>Setup Guide</h3>

                        <h4>Option 1: Docker (Recommended)</h4>
                        <div class="deep-code">
<span class="comment"># Clone the repository</span>
git clone https://github.com/sollama58/HolDex
cd HolDex

<span class="comment"># Start with Docker Compose</span>
docker-compose up -d

<span class="comment"># Access at http://localhost:3000</span></div>

                        <h4>Option 2: Manual Setup</h4>
                        <div class="deep-code">
<span class="comment"># Install dependencies</span>
npm install

<span class="comment"># Start development server</span>
npm run dev

<span class="comment"># Or build for production</span>
npm run build</div>

                        <h4>Option 3: Static Hosting</h4>
                        <p>HolDex can run as static files on any web server:</p>
                        <div class="deep-code">
<span class="comment"># Just serve the HTML files</span>
npx serve .

<span class="comment"># Or upload to Vercel, Netlify, GitHub Pages, etc.</span></div>

                        <div class="deep-tip">
                            <strong>Quick Deploy:</strong> Fork the repo and connect to Vercel for instant deployment.
                        </div>
                    `,
                    'Customization': `
                        <h3>Customizing HolDex</h3>

                        <h4>Theming</h4>
                        <p>Modify CSS variables in <code>styles.css</code>:</p>
                        <div class="deep-code">
:root {
    --primary-color: #ea580c;  <span class="comment">/* ASDF orange */</span>
    --bg-color: #0a0a0f;
    --text-color: #ffedd5;
    <span class="comment">/* ... more variables */</span>
}</div>

                        <h4>Adding Tokens</h4>
                        <p>Edit the token list in <code>src/js/tokens.js</code>:</p>
                        <div class="deep-code">
<span class="keyword">export const</span> tokens = [
    {
        symbol: <span class="string">'ASDF'</span>,
        mint: <span class="string">'ASDF...'</span>,
        name: <span class="string">'ASDFASDFA'</span>,
        logo: <span class="string">'/images/asdf.png'</span>
    },
    <span class="comment">// Add more tokens...</span>
];</div>

                        <h4>API Integration</h4>
                        <p>To use different data sources, modify <code>src/js/api.js</code>:</p>
                        <div class="deep-code">
<span class="keyword">export async function</span> <span class="function">getPrice</span>(mint) {
    <span class="comment">// Default: Jupiter Price API</span>
    <span class="keyword">const</span> response = <span class="keyword">await</span> <span class="function">fetch</span>(
        <span class="string">\`https://price.jup.ag/v4/price?ids=\${mint}\`</span>
    );
    <span class="keyword">return</span> response.<span class="function">json</span>();
}</div>
                    `
                }
            },
            'asdforecast': {
                title: '🔮 ASDForecast - Deep Learn',
                tabs: ['Introduction', 'How It Works', 'Setup', 'Creating Markets'],
                content: {
                    'Introduction': `
                        <h3>What is ASDForecast?</h3>
                        <p>ASDForecast is a <strong>prediction market platform</strong> built on Solana for the ASDF ecosystem. All trading fees contribute to ASDF buybacks and burns.</p>

                        <h4>How Prediction Markets Work</h4>
                        <ul>
                            <li>Users bet on future outcomes (Yes/No questions)</li>
                            <li>Prices reflect the crowd's probability estimates</li>
                            <li>Winners receive payouts; losers lose their stakes</li>
                            <li>Platform fees go to ASDF burns</li>
                        </ul>

                        <div class="deep-diagram">
                            <p style="margin-bottom: 16px; color: var(--text-cream);">Market Lifecycle</p>
                            <div class="deep-diagram-flow">
                                <div class="deep-diagram-box">Create Market</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Trading Open</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Resolution</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Payout</div>
                            </div>
                        </div>

                        <h4>Fee Structure</h4>
                        <table class="deep-table">
                            <tr><th>Action</th><th>Fee</th><th>Destination</th></tr>
                            <tr><td>Trade</td><td>1%</td><td>ASDF BBB</td></tr>
                            <tr><td>Market Creation</td><td>0.1 SOL</td><td>ASDF BBB</td></tr>
                            <tr><td>Payout</td><td>0%</td><td>N/A</td></tr>
                        </table>
                    `,
                    'How It Works': `
                        <h3>Technical Details</h3>

                        <h4>Market Mechanics</h4>
                        <p>Each market has two outcome tokens: YES and NO. Their prices are determined by an automated market maker (AMM).</p>
                        <div class="deep-code">
<span class="comment">// Price formula (CPMM-like)</span>
YES_price = YES_pool / (YES_pool + NO_pool)
NO_price = NO_pool / (YES_pool + NO_pool)

<span class="comment">// Always: YES_price + NO_price = 1</span></div>

                        <h4>Trading Example</h4>
                        <div class="deep-code">
<span class="comment">// Initial state</span>
YES_pool: 1000, NO_pool: 1000
YES_price: 0.50 (50%), NO_price: 0.50 (50%)

<span class="comment">// User buys 100 YES tokens</span>
YES_pool: 1100, NO_pool: 909  <span class="comment">// Constant product</span>
YES_price: 0.55 (55%), NO_price: 0.45 (45%)</div>

                        <h4>Resolution</h4>
                        <p>Markets are resolved by designated oracles or admin after the event occurs:</p>
                        <ul>
                            <li><strong>YES wins:</strong> YES holders get full payout</li>
                            <li><strong>NO wins:</strong> NO holders get full payout</li>
                            <li><strong>Invalid:</strong> All stakes returned</li>
                        </ul>
                    `,
                    'Setup': `
                        <h3>Running ASDForecast</h3>

                        <h4>Installation</h4>
                        <div class="deep-code">
<span class="comment"># Clone repository</span>
git clone https://github.com/sollama58/ASDForecast
cd ASDForecast

<span class="comment"># Install dependencies</span>
npm install

<span class="comment"># Start the server</span>
node server.js</div>

                        <h4>File Overview</h4>
                        <table class="deep-table">
                            <tr><th>File</th><th>Purpose</th></tr>
                            <tr><td>frontend.html</td><td>Main trading interface</td></tr>
                            <tr><td>control_panel.html</td><td>Admin controls</td></tr>
                            <tr><td>burnMonitorFrontend.html</td><td>Fee tracking widget</td></tr>
                            <tr><td>server.js</td><td>Backend API server</td></tr>
                        </table>

                        <h4>Configuration</h4>
                        <div class="deep-code">
<span class="comment">// In server.js</span>
<span class="keyword">const</span> config = {
    port: 3000,
    rpcUrl: <span class="string">'https://api.mainnet-beta.solana.com'</span>,
    burnEngineAddress: <span class="string">'ASDF...'</span>,
    adminWallet: <span class="string">'YOUR_ADMIN_WALLET'</span>
};</div>

                        <div class="deep-warning">
                            <strong>Note:</strong> The control panel requires admin wallet authentication.
                        </div>
                    `,
                    'Creating Markets': `
                        <h3>Creating Prediction Markets</h3>

                        <h4>Via Control Panel</h4>
                        <ol>
                            <li>Open <code>control_panel.html</code></li>
                            <li>Connect admin wallet</li>
                            <li>Fill in market details:
                                <ul>
                                    <li>Question (e.g., "Will BTC reach $100k in 2025?")</li>
                                    <li>Resolution date</li>
                                    <li>Initial liquidity</li>
                                </ul>
                            </li>
                            <li>Submit and sign transaction</li>
                        </ol>

                        <h4>Programmatically</h4>
                        <div class="deep-code">
<span class="keyword">const</span> market = <span class="keyword">await</span> <span class="function">createMarket</span>({
    question: <span class="string">"Will ASDF burn 1B tokens by EOY?"</span>,
    resolutionDate: <span class="keyword">new</span> Date(<span class="string">'2025-12-31'</span>),
    initialLiquidity: 10, <span class="comment">// SOL</span>
    oracle: adminWallet.publicKey
});

console.log(<span class="string">'Market created:'</span>, market.address);</div>

                        <h4>Best Practices</h4>
                        <ul>
                            <li>Use clear, unambiguous questions</li>
                            <li>Set realistic resolution dates</li>
                            <li>Provide sufficient initial liquidity</li>
                            <li>Choose trusted oracles for resolution</li>
                        </ul>
                    `
                }
            },
            'burntracker': {
                title: '📈 ASDFBurnTracker - Deep Learn',
                tabs: ['Introduction', 'Setup', 'Embedding', 'API'],
                content: {
                    'Introduction': `
                        <h3>What is ASDFBurnTracker?</h3>
                        <p>ASDFBurnTracker is a real-time monitoring widget that <strong>tracks ASDF buybacks and burns</strong>. It provides visual proof of the deflationary mechanism in action.</p>

                        <h4>Features</h4>
                        <ul>
                            <li>Live burn event feed</li>
                            <li>Total burned counter</li>
                            <li>24-hour statistics</li>
                            <li>Embeddable widget</li>
                        </ul>

                        <h4>Data Sources</h4>
                        <p>The tracker monitors:</p>
                        <ul>
                            <li>Burn Engine transactions</li>
                            <li>Burn address balance changes</li>
                            <li>Trading fee accumulation</li>
                        </ul>
                    `,
                    'Setup': `
                        <h3>Running the Tracker</h3>

                        <h4>Quick Start</h4>
                        <div class="deep-code">
<span class="comment"># Clone repository</span>
git clone https://github.com/sollama58/ASDFBurnTracker
cd ASDFBurnTracker

<span class="comment"># Install dependencies</span>
npm install

<span class="comment"># Start server</span>
node server.js

<span class="comment"># Open in browser</span>
<span class="comment"># http://localhost:3000</span></div>

                        <h4>Project Files</h4>
                        <table class="deep-table">
                            <tr><th>File</th><th>Description</th></tr>
                            <tr><td>server.js</td><td>Backend server with WebSocket</td></tr>
                            <tr><td>originalHTMLwidget.html</td><td>Widget frontend</td></tr>
                            <tr><td>package.json</td><td>Dependencies</td></tr>
                        </table>
                    `,
                    'Embedding': `
                        <h3>Embedding the Widget</h3>
                        <p>Add the burn tracker to your website with a simple iframe:</p>

                        <h4>Basic Embed</h4>
                        <div class="deep-code">
&lt;iframe
    src="https://your-tracker-url.com/widget"
    width="400"
    height="300"
    frameborder="0"
&gt;&lt;/iframe&gt;</div>

                        <h4>Responsive Embed</h4>
                        <div class="deep-code">
&lt;div style="position: relative; padding-bottom: 75%; height: 0;"&gt;
    &lt;iframe
        src="https://your-tracker-url.com/widget"
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
        frameborder="0"
    &gt;&lt;/iframe&gt;
&lt;/div&gt;</div>

                        <h4>Customization Parameters</h4>
                        <div class="deep-code">
<span class="comment">// URL parameters</span>
?theme=dark      <span class="comment">// dark or light</span>
&compact=true    <span class="comment">// minimal mode</span>
&showTotal=true  <span class="comment">// show total burned</span></div>
                    `,
                    'API': `
                        <h3>API Endpoints</h3>

                        <h4>GET /stats</h4>
                        <div class="deep-code">
{
    "totalBurned": "1,234,567,890",
    "burned24h": "12,345,678",
    "burnCount": 1547,
    "lastBurnTime": 1703980800
}</div>

                        <h4>GET /burns</h4>
                        <div class="deep-code">
{
    "burns": [
        {
            "txId": "5Kj2...",
            "amount": "1,000,000",
            "timestamp": 1703980800
        }
    ]
}</div>

                        <h4>WebSocket</h4>
                        <div class="deep-code">
<span class="keyword">const</span> ws = <span class="keyword">new</span> <span class="function">WebSocket</span>(<span class="string">'wss://your-tracker-url.com/ws'</span>);

ws.<span class="function">onmessage</span> = (event) => {
    <span class="keyword">const</span> burn = JSON.<span class="function">parse</span>(event.data);
    console.log(<span class="string">'New burn:'</span>, burn.amount);
};</div>
                    `
                }
            },
            'asdev': {
                title: '🚀 ASDev - Deep Learn',
                tabs: ['Introduction', 'Architecture', 'Installation', 'Token Launch', 'API Reference', 'Security'],
                content: {
                    'Introduction': `
                        <h3>What is ASDev?</h3>
                        <p>ASDev is a <strong>token launcher platform for Solana</strong> that creates tokens with addresses ending in "ASDF". It includes built-in airdrop rewards and holder tracking.</p>

                        <h4>Key Features</h4>
                        <ul>
                            <li><strong>Vanity addresses</strong> - All tokens end with "ASDF"</li>
                            <li><strong>Airdrop integration</strong> - Automatic eligibility checking</li>
                            <li><strong>Holder tracking</strong> - Top 50 holders per token</li>
                            <li><strong>Leaderboards</strong> - Volume-based rankings</li>
                            <li><strong>Real-time feed</strong> - Live launch notifications</li>
                        </ul>

                        <div class="deep-diagram">
                            <p style="margin-bottom: 16px; color: var(--text-cream);">Launch Flow</p>
                            <div class="deep-diagram-flow">
                                <div class="deep-diagram-box">Submit</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Queue</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Grind Key</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Deploy</div>
                            </div>
                        </div>
                    `,
                    'Architecture': `
                        <h3>System Architecture</h3>

                        <h4>Components</h4>
                        <table class="deep-table">
                            <tr><th>Component</th><th>Technology</th><th>Purpose</th></tr>
                            <tr><td>API Server</td><td>Node.js/Express</td><td>Handle requests</td></tr>
                            <tr><td>Vanity Grinder</td><td>Rust</td><td>Generate ASDF keys</td></tr>
                            <tr><td>Job Queue</td><td>Redis</td><td>Manage deployments</td></tr>
                            <tr><td>Frontend</td><td>HTML/JS</td><td>User interface</td></tr>
                        </table>

                        <h4>Directory Structure</h4>
                        <div class="deep-code">
ASDev/
├── src/
│   ├── index.js           <span class="comment"># Entry point</span>
│   ├── config/            <span class="comment"># Configuration</span>
│   ├── services/
│   │   ├── solana.js      <span class="comment"># Blockchain ops</span>
│   │   ├── redis.js       <span class="comment"># Cache/queue</span>
│   │   └── grinder.js     <span class="comment"># Vanity service</span>
│   ├── routes/            <span class="comment"># API endpoints</span>
│   └── tasks/             <span class="comment"># Background jobs</span>
├── grinder/               <span class="comment"># Rust vanity grinder</span>
├── public/                <span class="comment"># Frontend</span>
└── docker-compose.yml</div>

                        <h4>Request Flow</h4>
                        <div class="deep-code">
1. User submits token launch request
2. Request validated and added to Redis queue
3. Background worker picks up job
4. Rust grinder generates ASDF keypair
5. Token deployed to Solana
6. Metadata uploaded to IPFS (Pinata)
7. User notified of success</div>
                    `,
                    'Installation': `
                        <h3>Installation Guide</h3>

                        <h4>Prerequisites</h4>
                        <ul>
                            <li>Node.js 18+</li>
                            <li>Rust (latest stable)</li>
                            <li>Redis</li>
                            <li>Solana CLI</li>
                        </ul>

                        <h4>Step 1: Clone & Dependencies</h4>
                        <div class="deep-code">
git clone https://github.com/sollama58/ASDev
cd ASDev
npm install</div>

                        <h4>Step 2: Build Grinder</h4>
                        <div class="deep-code">
<span class="comment"># Install Rust if needed</span>
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

<span class="comment"># Build grinder</span>
cd grinder
cargo build --release
cd ..</div>

                        <h4>Step 3: Configure Environment</h4>
                        <div class="deep-code">
cp .env.template .env

<span class="comment"># Edit .env with your settings:</span>
RPC_URL=https://api.mainnet-beta.solana.com
REDIS_URL=redis://localhost:6379
PINATA_JWT=your_pinata_jwt
DEPLOYER_WALLET=/path/to/keypair.json</div>

                        <h4>Step 4: Start Services</h4>
                        <div class="deep-code">
<span class="comment"># Start Redis (if not running)</span>
redis-server

<span class="comment"># Start ASDev</span>
npm start

<span class="comment"># Or with Docker</span>
docker-compose up -d</div>
                    `,
                    'Token Launch': `
                        <h3>Launching Tokens</h3>

                        <h4>Via Web Interface</h4>
                        <ol>
                            <li>Navigate to the ASDev frontend</li>
                            <li>Connect your Solana wallet</li>
                            <li>Fill in token details:
                                <ul>
                                    <li>Name</li>
                                    <li>Symbol</li>
                                    <li>Description</li>
                                    <li>Image</li>
                                    <li>Initial supply</li>
                                </ul>
                            </li>
                            <li>Submit and wait for ASDF keypair generation</li>
                            <li>Confirm deployment transaction</li>
                        </ol>

                        <h4>Via API</h4>
                        <div class="deep-code">
<span class="keyword">const</span> response = <span class="keyword">await</span> <span class="function">fetch</span>(<span class="string">'/api/launch'</span>, {
    method: <span class="string">'POST'</span>,
    headers: { <span class="string">'Content-Type'</span>: <span class="string">'application/json'</span> },
    body: JSON.<span class="function">stringify</span>({
        name: <span class="string">'My Token'</span>,
        symbol: <span class="string">'MTK'</span>,
        description: <span class="string">'A cool token'</span>,
        image: imageFile, <span class="comment">// Base64 or URL</span>
        supply: 1000000000,
        creator: walletAddress
    })
});

<span class="keyword">const</span> { jobId } = <span class="keyword">await</span> response.<span class="function">json</span>();

<span class="comment">// Poll for status</span>
<span class="keyword">const</span> status = <span class="keyword">await</span> <span class="function">fetch</span>(<span class="string">\`/api/status/\${jobId}\`</span>);</div>

                        <h4>Launch Statuses</h4>
                        <table class="deep-table">
                            <tr><th>Status</th><th>Meaning</th></tr>
                            <tr><td>queued</td><td>Waiting in queue</td></tr>
                            <tr><td>grinding</td><td>Generating ASDF keypair</td></tr>
                            <tr><td>deploying</td><td>Submitting to Solana</td></tr>
                            <tr><td>complete</td><td>Token live!</td></tr>
                            <tr><td>failed</td><td>Error occurred</td></tr>
                        </table>
                    `,
                    'API Reference': `
                        <h3>API Reference</h3>

                        <h4>POST /api/launch</h4>
                        <p>Submit a new token launch request.</p>
                        <div class="deep-code">
<span class="comment">// Request</span>
{
    "name": "Token Name",
    "symbol": "TKN",
    "description": "Description",
    "image": "https://... or base64",
    "supply": 1000000000,
    "creator": "wallet_address"
}

<span class="comment">// Response</span>
{
    "jobId": "job_abc123",
    "status": "queued",
    "position": 5
}</div>

                        <h4>GET /api/status/:jobId</h4>
                        <div class="deep-code">
{
    "jobId": "job_abc123",
    "status": "complete",
    "tokenAddress": "ASDF...",
    "txId": "5Kj2..."
}</div>

                        <h4>GET /api/leaderboard</h4>
                        <div class="deep-code">
{
    "tokens": [
        {
            "address": "ASDF...",
            "name": "Top Token",
            "volume24h": 50000,
            "rank": 1
        }
    ]
}</div>

                        <h4>GET /api/holders/:tokenAddress</h4>
                        <div class="deep-code">
{
    "holders": [
        {
            "address": "7xKX...",
            "balance": 1000000,
            "percentage": 10.5
        }
    ],
    "total": 50
}</div>
                    `,
                    'Security': `
                        <h3>Security Measures</h3>

                        <h4>Rate Limiting</h4>
                        <table class="deep-table">
                            <tr><th>Endpoint</th><th>Limit</th></tr>
                            <tr><td>API routes</td><td>100 req / 15 min</td></tr>
                            <tr><td>Token deployment</td><td>3 req / min</td></tr>
                            <tr><td>Admin endpoints</td><td>10 req / min</td></tr>
                        </table>

                        <h4>Input Validation</h4>
                        <ul>
                            <li>All Solana addresses validated</li>
                            <li>Token names sanitized (DOMPurify)</li>
                            <li>Image size/type restrictions</li>
                            <li>Supply limits enforced</li>
                        </ul>

                        <h4>Authentication</h4>
                        <div class="deep-code">
<span class="comment">// Admin endpoints require API key</span>
headers: {
    <span class="string">'X-API-Key'</span>: process.env.ADMIN_API_KEY
}</div>

                        <div class="deep-warning">
                            <strong>Security:</strong> Never expose your admin API key or deployer wallet in client-side code.
                        </div>

                        <h4>Best Practices</h4>
                        <ul>
                            <li>Use environment variables for secrets</li>
                            <li>Run behind a reverse proxy (nginx)</li>
                            <li>Enable HTTPS in production</li>
                            <li>Monitor logs for suspicious activity</li>
                            <li>Keep dependencies updated</li>
                        </ul>
                    `
                }
            },
            'grinder': {
                title: '⚙️ asdf_grinder - Deep Learn',
                tabs: ['Introduction', 'Installation', 'Usage', 'Docker'],
                content: {
                    'Introduction': `
                        <h3>What is asdf_grinder?</h3>
                        <p>asdf_grinder is a <strong>Rust-based vanity address generator</strong> for Solana. It creates keypairs with custom prefixes, particularly "ASDF" for ecosystem projects.</p>

                        <h4>Features</h4>
                        <ul>
                            <li>High-performance Rust implementation</li>
                            <li>Multi-threaded processing</li>
                            <li>Docker support</li>
                            <li>Simple CLI interface</li>
                        </ul>

                        <h4>Performance</h4>
                        <p>The grinder leverages Rust's speed and multi-threading to maximize key generation rate.</p>
                    `,
                    'Installation': `
                        <h3>Installation</h3>

                        <h4>From Source</h4>
                        <div class="deep-code">
<span class="comment"># Install Rust</span>
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

<span class="comment"># Clone and build</span>
git clone https://github.com/sollama58/asdf_grinder
cd asdf_grinder
cargo build --release</div>

                        <h4>Binary Location</h4>
                        <div class="deep-code">./target/release/asdf_grinder</div>

                        <div class="deep-tip">
                            <strong>Important:</strong> Always use <code>--release</code> for production. Debug builds are 10-50x slower.
                        </div>
                    `,
                    'Usage': `
                        <h3>Using the Grinder</h3>

                        <h4>Basic Usage</h4>
                        <div class="deep-code">
<span class="comment"># Run with start script</span>
./start_grinder.sh

<span class="comment"># Or run binary directly</span>
./target/release/asdf_grinder</div>

                        <h4>Output</h4>
                        <p>When a matching keypair is found:</p>
                        <div class="deep-code">
Found matching keypair!
Public Key: ASDF7xKXmR5qN8vZT3wP2LkB9sFgYc1dHjE4aUoW6
Saved to: keypair.json

<span class="comment"># keypair.json contains the full keypair</span>
{
    "publicKey": "ASDF...",
    "secretKey": [/* 64 bytes */]
}</div>

                        <div class="deep-warning">
                            <strong>Security:</strong> The keypair.json file contains your private key. Store it securely!
                        </div>
                    `,
                    'Docker': `
                        <h3>Docker Deployment</h3>

                        <h4>Build Image</h4>
                        <div class="deep-code">
docker build -t asdf-grinder .</div>

                        <h4>Run Container</h4>
                        <div class="deep-code">
<span class="comment"># Run and output to current directory</span>
docker run -v $(pwd):/output asdf-grinder

<span class="comment"># Run in background</span>
docker run -d -v $(pwd):/output asdf-grinder</div>

                        <h4>Dockerfile</h4>
                        <div class="deep-code">
FROM rust:latest as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:slim
COPY --from=builder /app/target/release/asdf_grinder /usr/local/bin/
CMD ["asdf_grinder"]</div>

                        <div class="deep-tip">
                            <strong>Cloud Deployment:</strong> For faster results, run on a high-CPU cloud instance (AWS c5.4xlarge, etc.).
                        </div>
                    `
                }
            }
        };

        let currentDeepLearnProject = null;

        function openDeepLearn(projectId) {
            const doc = deepLearnDocs[projectId];
            if (!doc) return;

            currentDeepLearnProject = projectId;

            const modal = document.getElementById('deep-learn-modal');
            const title = document.getElementById('deep-learn-title');
            const nav = document.getElementById('deep-learn-nav');
            const body = document.getElementById('deep-learn-body');

            title.textContent = doc.title;

            // Build navigation tabs
            let navHtml = '';
            doc.tabs.forEach((tab, index) => {
                const safeTab = escapeHtml(tab);
                const safeProjectId = escapeHtml(projectId);
                navHtml += `<button class="deep-nav-btn ${index === 0 ? 'active' : ''}" onclick="switchDeepTab('${safeProjectId}', '${safeTab}')">${safeTab}</button>`;
            });
            nav.innerHTML = navHtml;

            // Build content sections
            let contentHtml = '';
            doc.tabs.forEach((tab, index) => {
                contentHtml += `<div class="deep-section ${index === 0 ? 'active' : ''}" id="deep-section-${tab.replace(/\s+/g, '-')}">${doc.content[tab]}</div>`;
            });
            body.innerHTML = contentHtml;

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function switchDeepTab(projectId, tabName) {
            const doc = deepLearnDocs[projectId];
            if (!doc) return;

            // Update nav buttons
            document.querySelectorAll('.deep-nav-btn').forEach(btn => {
                btn.classList.toggle('active', btn.textContent === tabName);
            });

            // Update sections
            doc.tabs.forEach(tab => {
                const section = document.getElementById(`deep-section-${tab.replace(/\s+/g, '-')}`);
                if (section) {
                    section.classList.toggle('active', tab === tabName);
                }
            });
        }

        function closeDeepLearn() {
            document.getElementById('deep-learn-modal').classList.remove('active');
            document.body.style.overflow = '';
            currentDeepLearnProject = null;
        }

        // Close modals on escape or click outside
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                closeDocs();
                closeDeepLearn();
            }
        });

        document.getElementById('doc-modal')?.addEventListener('click', e => {
            if (e.target.id === 'doc-modal') closeDocs();
        });

        document.getElementById('deep-learn-modal')?.addEventListener('click', e => {
            if (e.target.id === 'deep-learn-modal') closeDeepLearn();
        });

        // ============================================
        // INTERACTIVE ELEMENTS
        // ============================================

        function toggleReveal(element) {
            element.classList.toggle('open');
        }

        function toggleFaq(element) {
            element.classList.toggle('open');
        }

        function checkAnswer(element, level, isCorrect) {
            const state = getState();
            const container = element.closest('.quiz-container');
            const options = container.querySelectorAll('.quiz-option');
            const feedback = container.querySelector('.quiz-feedback') || document.getElementById('quiz-feedback-' + level);

            options.forEach(opt => opt.style.pointerEvents = 'none');

            if (isCorrect) {
                element.classList.add('correct');
                feedback.className = 'quiz-feedback show success';
                feedback.textContent = '✓ Correct! +25 XP';
                addXP(XP_VALUES.quiz);

                const nextBtn = document.getElementById('unlock-level-' + (level + 1)) ||
                               document.getElementById('complete-course');
                if (nextBtn) nextBtn.disabled = false;
            } else {
                element.classList.add('wrong');
                feedback.className = 'quiz-feedback show error';
                feedback.textContent = '✗ Try again!';
                state.wrongAnswers++;
                saveState(state);

                setTimeout(() => {
                    options.forEach(opt => {
                        opt.style.pointerEvents = 'auto';
                        opt.classList.remove('wrong');
                    });
                    feedback.classList.remove('show');
                }, 1500);
            }
        }

        // ============================================
        // GLOSSARY FILTER
        // ============================================

        function filterGlossary() {
            const search = document.getElementById('glossary-search').value.toLowerCase();
            const items = document.querySelectorAll('.glossary-item');

            items.forEach(item => {
                const term = item.getAttribute('data-term').toLowerCase();
                const text = item.textContent.toLowerCase();
                item.style.display = (term.includes(search) || text.includes(search)) ? 'block' : 'none';
            });
        }

        // ============================================
        // CALCULATOR
        // ============================================

        function calculateBurn() {
            const position = parseFloat(document.getElementById('calc-position').value) || 0;
            const supply = parseFloat(document.getElementById('calc-supply').value) || 1;
            const dailyVolume = parseFloat(document.getElementById('calc-volume').value) || 0;
            const days = parseInt(document.getElementById('calc-period').value) || 90;

            const feeRate = 0.01;
            const burnRate = 0.448;
            const tokensPerSol = 10000;

            const currentPct = (position / supply) * 100;
            const totalFees = dailyVolume * days * feeRate;
            const burnedTokens = totalFees * burnRate * tokensPerSol;
            const newSupply = Math.max(supply - burnedTokens, position);
            const newPct = (position / newSupply) * 100;
            const increase = ((newPct / currentPct) - 1) * 100;

            document.getElementById('result-current').textContent = currentPct.toFixed(4) + '%';
            document.getElementById('result-burned').textContent = '~' + formatNumber(Math.round(burnedTokens));
            document.getElementById('result-supply').textContent = '~' + formatNumber(Math.round(newSupply));
            document.getElementById('result-new').textContent = newPct.toFixed(4) + '%';
            document.getElementById('result-increase').textContent = '+' + increase.toFixed(2) + '%';
        }

        function formatNumber(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
            return num.toLocaleString();
        }

        // ============================================
        // LEADERBOARD
        // ============================================

        function updateLeaderboard() {
            const state = getState();
            const leaderboardData = [
                { name: 'diamond_hands.sol', xp: 1250, you: false },
                { name: 'fire_believer.sol', xp: 1100, you: false },
                { name: 'burn_master.sol', xp: 950, you: false },
                { name: 'asdf_fan.sol', xp: 875, you: false },
                { name: 'You', xp: state.totalXP, you: true }
            ];

            leaderboardData.sort((a, b) => b.xp - a.xp);

            const container = document.getElementById('leaderboard-list');
            // Security: Use DOM API instead of innerHTML to prevent XSS
            container.textContent = '';
            leaderboardData.slice(0, 5).forEach((entry, index) => {
                const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'normal';

                const item = document.createElement('div');
                item.className = 'leaderboard-item' + (entry.you ? ' you' : '');

                const rank = document.createElement('div');
                rank.className = 'leaderboard-rank ' + rankClass;
                rank.textContent = index + 1;

                const name = document.createElement('div');
                name.className = 'leaderboard-name';
                name.textContent = entry.you ? '🔥 You' : entry.name;

                const xp = document.createElement('div');
                xp.className = 'leaderboard-xp';
                xp.textContent = entry.xp + ' XP';

                item.appendChild(rank);
                item.appendChild(name);
                item.appendChild(xp);
                container.appendChild(item);
            });
        }

        // ============================================
        // SOCIAL SHARING
        // ============================================

        function shareCompletion() {
            const state = getState();
            const text = `🔥 I just completed the ASDF Learning Path and earned ${state.badges.length} badges with ${state.totalXP} XP!\n\nLearn about the Optimistic Burn Protocol:\n`;
            const url = window.location.href;
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
        }

        // ============================================
        // MINI-GAMES SYSTEM
        // ============================================

        const GAMES_STORAGE_KEY = 'asdf_games_v1';

        // Security: Validate game state schema to prevent tampering
        function validateGameState(data, defaultState) {
            if (typeof data !== 'object' || data === null) return false;
            // Validate highScores
            if (typeof data.highScores !== 'object' || data.highScores === null) return false;
            const validScoreKeys = Object.keys(defaultState.highScores);
            for (const key of validScoreKeys) {
                if (typeof data.highScores[key] !== 'number' || data.highScores[key] < 0 || data.highScores[key] > 1e9) return false;
            }
            // Validate numeric fields with reasonable limits
            if (typeof data.totalClicks !== 'number' || data.totalClicks < 0 || data.totalClicks > 1e12) return false;
            if (typeof data.clickerPower !== 'number' || data.clickerPower < 1 || data.clickerPower > 1000) return false;
            if (typeof data.clickerMulti !== 'number' || data.clickerMulti < 1 || data.clickerMulti > 100) return false;
            if (typeof data.hasAuto !== 'boolean') return false;
            if (typeof data.dailyXPEarned !== 'number' || data.dailyXPEarned < 0 || data.dailyXPEarned > 10000) return false;
            if (typeof data.streak !== 'number' || data.streak < 0 || data.streak > 1000) return false;
            return true;
        }

        function getGameState() {
            const defaultState = {
                highScores: {
                    catcher: 0, sequence: 0, match: 999, clicker: 0,
                    fighter: 0, racer: 0, blaster: 0, defense: 0, stacker: 0
                },
                totalClicks: 0,
                clickerPower: 1,
                clickerMulti: 1,
                hasAuto: false,
                dailyXPEarned: 0,
                lastPlayDate: null,
                streak: 0
            };
            try {
                const saved = localStorage.getItem(GAMES_STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Merge with defaults for new properties
                    const merged = { ...defaultState, ...parsed, highScores: { ...defaultState.highScores, ...parsed.highScores } };
                    // Validate schema before returning
                    if (validateGameState(merged, defaultState)) {
                        return merged;
                    }
                    console.warn('Invalid game state schema, resetting to default');
                    localStorage.removeItem(GAMES_STORAGE_KEY);
                    return defaultState;
                }
                return defaultState;
            } catch (e) {
                return defaultState;
            }
        }

        function saveGameState(state) {
            try { localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
        }

        function openGame(gameId) {
            document.getElementById('game-' + gameId).classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeGame(gameId) {
            document.getElementById('game-' + gameId).classList.remove('active');
            document.body.style.overflow = '';
            // Reset game states
            stopGameById(gameId);
        }

        function stopGameById(gameId) {
            if (gameId === 'catcher') stopCatcher();
            if (gameId === 'sequence') stopSequence();
            if (gameId === 'match') stopMatch();
            if (gameId === 'fighter') { fighterActive = false; clearInterval(fighterInterval); document.removeEventListener('keydown', fighterKeyHandler); document.removeEventListener('keyup', fighterKeyUpHandler); const a = document.getElementById('fighter-arena'); if(a) a.removeEventListener('mousedown', fighterMouseHandler); }
            if (gameId === 'racer') { racerActive = false; clearInterval(racerInterval); clearInterval(racerSpawnInterval); clearInterval(racerMoveInterval); racerMoveInterval = null; document.removeEventListener('keydown', racerKeyDown); document.removeEventListener('keyup', racerKeyUp); }
            if (gameId === 'blaster') { blasterActive = false; clearInterval(blasterSpawnInterval); }
            if (gameId === 'defense') { defenseActive = false; defensePrepPhase = false; clearInterval(defenseInterval); clearInterval(defensePrepTimer); }
            if (gameId === 'stacker') { stackerActive = false; clearInterval(stackerInterval); document.removeEventListener('keydown', stackerKeyHandler); }
        }

        function resetGame(gameId) {
            // Stop current game
            stopGameById(gameId);

            // Reset UI and start fresh
            switch(gameId) {
                case 'catcher':
                    document.querySelectorAll('.falling-token').forEach(t => t.remove());
                    document.getElementById('catcher-start').style.display = 'block';
                    document.getElementById('catcher-start').textContent = 'START GAME';
                    document.getElementById('catcher-score').textContent = '0';
                    document.getElementById('catcher-time').textContent = '30';
                    break;
                case 'sequence':
                    document.getElementById('sequence-start').style.display = 'block';
                    document.getElementById('sequence-start').textContent = 'START GAME';
                    document.getElementById('sequence-level').textContent = '1';
                    document.getElementById('sequence-score').textContent = '0';
                    document.getElementById('sequence-display').textContent = 'Press START to begin';
                    break;
                case 'match':
                    document.getElementById('match-start').style.display = 'block';
                    document.getElementById('match-start').textContent = 'START GAME';
                    document.getElementById('match-pairs').textContent = '0/8';
                    document.getElementById('match-time').textContent = '0:00';
                    document.getElementById('match-grid').innerHTML = '';
                    break;
                case 'clicker': {
                    // Clicker - refresh display from saved state
                    document.querySelectorAll('.click-effect').forEach(e => e.remove());
                    initClicker();
                    // Flash effect to show refresh happened
                    const clickerBtn = document.getElementById('clicker-btn');
                    if (clickerBtn) {
                        clickerBtn.style.transform = 'scale(1.1)';
                        setTimeout(() => { clickerBtn.style.transform = ''; }, 200);
                    }
                    break;
                }
                case 'fighter':
                    document.querySelectorAll('.fighter-attack').forEach(a => a.remove());
                    document.getElementById('fighter-start').style.display = 'block';
                    document.getElementById('fighter-start').textContent = 'START FIGHT';
                    document.getElementById('fighter-wave').textContent = '1';
                    document.getElementById('fighter-combo').textContent = '0';
                    document.getElementById('fighter-player-health').style.width = '100%';
                    document.getElementById('fighter-enemy-health').style.width = '100%';
                    break;
                case 'racer':
                    racerMoveDir = 0;
                    racerCarPos = 50;
                    document.querySelectorAll('.racer-obstacle, .racer-coin').forEach(o => o.remove());
                    document.getElementById('racer-start').style.display = 'block';
                    document.getElementById('racer-start').textContent = 'START RACE';
                    document.getElementById('racer-distance').textContent = '0m';
                    document.getElementById('racer-coins').textContent = '0';
                    document.getElementById('racer-speed').textContent = '0 km/h';
                    document.getElementById('racer-car').style.left = 'calc(50% - 20px)';
                    break;
                case 'blaster':
                    document.querySelectorAll('.blaster-target').forEach(t => t.remove());
                    document.getElementById('blaster-start').style.display = 'block';
                    document.getElementById('blaster-start').textContent = 'START BLASTING';
                    document.getElementById('blaster-score').textContent = '0';
                    document.getElementById('blaster-wave').textContent = '1';
                    document.getElementById('blaster-wave-display').textContent = '1';
                    break;
                case 'defense':
                    document.querySelectorAll('.defense-enemy, .defense-projectile, .damage-number').forEach(e => e.remove());
                    defenseGrid.fill(null);
                    defenseTowers = [];
                    defenseEnemies = [];
                    initDefenseField();
                    document.getElementById('defense-start').style.display = 'block';
                    document.getElementById('defense-start').textContent = 'START DEFENSE';
                    document.getElementById('defense-start').disabled = false;
                    document.getElementById('defense-wave').textContent = '1';
                    document.getElementById('defense-gold').textContent = '150';
                    document.getElementById('defense-lives').innerHTML = '<span>❤️</span><span>❤️</span><span>❤️</span><span>❤️</span><span>❤️</span>';
                    break;
                case 'stacker': {
                    const viewport = document.getElementById('stacker-viewport');
                    if (viewport) {
                        viewport.style.transform = '';
                        document.querySelectorAll('.stacker-block, .stacker-moving, .stacker-perfect-text').forEach(b => b.remove());
                    }
                    document.getElementById('stacker-start').style.display = 'block';
                    document.getElementById('stacker-start').textContent = 'START STACKING';
                    document.getElementById('stacker-height').textContent = '0';
                    document.getElementById('stacker-height-display').textContent = '0';
                    document.getElementById('stacker-score').textContent = '0';
                    break;
                }
            }
        }

        function updateHighScores() {
            const gs = getGameState();
            // Sidebar scores
            document.getElementById('hs-catcher').textContent = gs.highScores.catcher;
            document.getElementById('hs-sequence').textContent = 'Lvl ' + gs.highScores.sequence;
            document.getElementById('hs-match').textContent = gs.highScores.match === 999 ? '--' : gs.highScores.match + 's';
            document.getElementById('hs-clicker').textContent = formatNumber(gs.totalClicks);
            document.getElementById('hs-fighter').textContent = 'Wave ' + gs.highScores.fighter;
            document.getElementById('hs-racer').textContent = gs.highScores.racer + 'm';
            document.getElementById('hs-blaster').textContent = 'Wave ' + gs.highScores.blaster;
            document.getElementById('hs-defense').textContent = 'Wave ' + gs.highScores.defense;
            document.getElementById('hs-stacker').textContent = gs.highScores.stacker;
            // Play section scores
            const updates = {
                'play-hs-catcher': gs.highScores.catcher,
                'play-hs-sequence': gs.highScores.sequence,
                'play-hs-match': gs.highScores.match === 999 ? '--' : gs.highScores.match + 's',
                'play-hs-clicker': formatNumber(gs.totalClicks),
                'play-hs-fighter': gs.highScores.fighter,
                'play-hs-racer': gs.highScores.racer,
                'play-hs-blaster': gs.highScores.blaster,
                'play-hs-defense': gs.highScores.defense,
                'play-hs-stacker': gs.highScores.stacker
            };
            for (const [id, value] of Object.entries(updates)) {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            }
        }

        // ============================================
        // TOKEN CATCHER GAME
        // ============================================

        let catcherInterval, catcherTimer, catcherScore, catcherTimeLeft;
        let basketPos = 50;
        let moveDirection = 0;
        let moveInterval = null;
        const tokens = ['🔥', '💰', '⭐', '💎', '🪙'];
        const scamTokens = ['💀', '🚨', '❌'];

        function startCatcher() {
            catcherScore = 0;
            catcherTimeLeft = 30;
            basketPos = 50;
            moveDirection = 0;
            document.getElementById('catcher-score').textContent = '0';
            document.getElementById('catcher-time').textContent = '30';
            document.getElementById('catcher-start').style.display = 'none';

            const basket = document.getElementById('catcher-basket');
            basket.style.left = 'calc(50% - 40px)';

            // Spawn tokens
            catcherInterval = setInterval(spawnToken, 600);

            // Timer
            catcherTimer = setInterval(() => {
                catcherTimeLeft--;
                document.getElementById('catcher-time').textContent = catcherTimeLeft;
                if (catcherTimeLeft <= 0) {
                    endCatcher();
                }
            }, 1000);

            // Key controls - continuous movement
            document.addEventListener('keydown', catcherKeyDown);
            document.addEventListener('keyup', catcherKeyUp);
            document.getElementById('catcher-area').addEventListener('touchmove', touchMoveCatcher);
        }

        function catcherKeyDown(e) {
            if (e.key === 'ArrowLeft' && moveDirection !== -1) {
                moveDirection = -1;
                startContinuousMove();
            } else if (e.key === 'ArrowRight' && moveDirection !== 1) {
                moveDirection = 1;
                startContinuousMove();
            }
        }

        function catcherKeyUp(e) {
            if ((e.key === 'ArrowLeft' && moveDirection === -1) ||
                (e.key === 'ArrowRight' && moveDirection === 1)) {
                moveDirection = 0;
                stopContinuousMove();
            }
        }

        function startContinuousMove() {
            if (moveInterval) clearInterval(moveInterval);
            // Move immediately on first press
            moveBasket();
            // Then continue moving every 16ms (60fps) for smooth movement
            moveInterval = setInterval(moveBasket, 16);
        }

        function stopContinuousMove() {
            if (moveInterval) {
                clearInterval(moveInterval);
                moveInterval = null;
            }
        }

        function moveBasket() {
            const step = 2; // Smaller step for smoother movement at 60fps
            basketPos += moveDirection * step;
            basketPos = Math.max(5, Math.min(95, basketPos));

            const basket = document.getElementById('catcher-basket');
            basket.style.left = `calc(${basketPos}% - 40px)`;
            checkCatch();
        }

        function spawnToken() {
            const area = document.getElementById('catcher-area');
            const token = document.createElement('div');
            token.className = 'falling-token';

            // 20% chance of scam token
            const isScam = Math.random() < 0.2;
            token.textContent = isScam ? scamTokens[Math.floor(Math.random() * scamTokens.length)] : tokens[Math.floor(Math.random() * tokens.length)];
            token.dataset.scam = isScam;

            const xPos = Math.random() * (area.offsetWidth - 40);
            token.style.left = xPos + 'px';
            token.style.animationDuration = (2 + Math.random()) + 's';

            area.appendChild(token);

            // Check for catch
            token.addEventListener('animationend', () => token.remove());
        }

        function touchMoveCatcher(e) {
            e.preventDefault();
            const area = document.getElementById('catcher-area');
            const basket = document.getElementById('catcher-basket');
            const touch = e.touches[0];
            const rect = area.getBoundingClientRect();
            basketPos = ((touch.clientX - rect.left) / rect.width) * 100;
            basketPos = Math.max(5, Math.min(95, basketPos));
            basket.style.left = `calc(${basketPos}% - 40px)`;
            checkCatch();
        }

        function checkCatch() {
            const basket = document.getElementById('catcher-basket');
            const basketRect = basket.getBoundingClientRect();
            const tokens = document.querySelectorAll('.falling-token');

            tokens.forEach(token => {
                const tokenRect = token.getBoundingClientRect();
                if (tokenRect.bottom >= basketRect.top &&
                    tokenRect.top <= basketRect.bottom &&
                    tokenRect.right >= basketRect.left &&
                    tokenRect.left <= basketRect.right) {

                    if (token.dataset.scam === 'true') {
                        catcherScore = Math.max(0, catcherScore - 20);
                        showCatchEffect(token, '-20', '#ef4444');
                    } else {
                        catcherScore += 10;
                        showCatchEffect(token, '+10', '#22c55e');
                    }
                    document.getElementById('catcher-score').textContent = catcherScore;
                    token.remove();
                }
            });
        }

        function showCatchEffect(element, text, color) {
            const effect = document.createElement('div');
            effect.className = 'click-effect';
            effect.textContent = text;
            effect.style.color = color;
            effect.style.left = element.style.left;
            effect.style.top = element.offsetTop + 'px';
            document.getElementById('catcher-area').appendChild(effect);
            setTimeout(() => effect.remove(), 800);
        }

        function endCatcher() {
            stopCatcher();
            const gs = getGameState();

            if (catcherScore > gs.highScores.catcher) {
                gs.highScores.catcher = catcherScore;
                saveGameState(gs);
            }

            // Award XP
            const xpEarned = Math.min(50, Math.floor(catcherScore / 10) * 5);
            if (xpEarned > 0) addXP(xpEarned);

            // Check badge
            if (catcherScore >= 500) {
                const state = getState();
                if (!state.badges.includes('catcher')) earnBadge('catcher');
            }

            updateHighScores();
            document.getElementById('catcher-start').textContent = `Score: ${catcherScore} (+${xpEarned} XP) - PLAY AGAIN`;
            document.getElementById('catcher-start').style.display = 'block';
        }

        function stopCatcher() {
            clearInterval(catcherInterval);
            clearInterval(catcherTimer);
            stopContinuousMove();
            moveDirection = 0;
            document.removeEventListener('keydown', catcherKeyDown);
            document.removeEventListener('keyup', catcherKeyUp);
            document.querySelectorAll('.falling-token').forEach(t => t.remove());
        }

        // ============================================
        // BURN SEQUENCE GAME (Simon Says)
        // ============================================

        let sequencePattern = [];
        let playerPattern = [];
        let sequenceLevel = 1;
        let sequenceScore = 0;
        let isShowingSequence = false;
        let sequenceTimeout;
        const steps = ['collect', 'swap', 'burn', 'verify'];

        function startSequence() {
            sequenceLevel = 1;
            sequenceScore = 0;
            sequencePattern = [];
            document.getElementById('sequence-level').textContent = '1';
            document.getElementById('sequence-score').textContent = '0';
            document.getElementById('sequence-start').style.display = 'none';
            nextSequenceRound();
        }

        function nextSequenceRound() {
            playerPattern = [];
            sequencePattern.push(steps[Math.floor(Math.random() * steps.length)]);
            document.getElementById('sequence-display').textContent = 'Watch carefully...';
            isShowingSequence = true;

            setTimeout(() => showSequence(0), 500);
        }

        function showSequence(index) {
            if (index >= sequencePattern.length) {
                isShowingSequence = false;
                document.getElementById('sequence-display').textContent = 'Your turn! Repeat the sequence';
                return;
            }

            const step = sequencePattern[index];
            const btn = document.querySelector(`.sequence-btn[data-step="${step}"]`);
            btn.classList.add('flash');

            setTimeout(() => {
                btn.classList.remove('flash');
                setTimeout(() => showSequence(index + 1), 300);
            }, 500);
        }

        function sequenceClick(step) {
            if (isShowingSequence) return;

            const btn = document.querySelector(`.sequence-btn[data-step="${step}"]`);
            btn.classList.add('flash');
            setTimeout(() => btn.classList.remove('flash'), 200);

            playerPattern.push(step);
            const currentIndex = playerPattern.length - 1;

            if (playerPattern[currentIndex] !== sequencePattern[currentIndex]) {
                // Wrong!
                endSequence();
                return;
            }

            if (playerPattern.length === sequencePattern.length) {
                // Correct sequence!
                sequenceScore += sequenceLevel * 10;
                sequenceLevel++;
                document.getElementById('sequence-level').textContent = sequenceLevel;
                document.getElementById('sequence-score').textContent = sequenceScore;
                document.getElementById('sequence-display').textContent = 'Correct! Level ' + sequenceLevel;

                setTimeout(nextSequenceRound, 1000);
            }
        }

        function endSequence() {
            document.getElementById('sequence-display').textContent = `Game Over! Level ${sequenceLevel}`;

            const gs = getGameState();
            if (sequenceLevel > gs.highScores.sequence) {
                gs.highScores.sequence = sequenceLevel;
                saveGameState(gs);
            }

            // Award XP
            const xpEarned = Math.min(75, sequenceLevel * 5);
            if (xpEarned > 0) addXP(xpEarned);

            // Check badge
            if (sequenceLevel >= 10) {
                const state = getState();
                if (!state.badges.includes('memory')) earnBadge('memory');
            }

            updateHighScores();
            document.getElementById('sequence-start').textContent = `Level ${sequenceLevel} (+${xpEarned} XP) - PLAY AGAIN`;
            document.getElementById('sequence-start').style.display = 'block';
        }

        function stopSequence() {
            clearTimeout(sequenceTimeout);
            sequencePattern = [];
            playerPattern = [];
            isShowingSequence = false;
        }

        // ============================================
        // SPEED MATCH GAME
        // ============================================

        const matchPairs = [
            { term: '🔥', meaning: 'Burn' },
            { term: '💰', meaning: 'Fees' },
            { term: '🔄', meaning: 'Cycle' },
            { term: '🤖', meaning: 'Daemon' },
            { term: '🏦', meaning: 'Treasury' },
            { term: '💱', meaning: 'Swap' },
            { term: '📉', meaning: 'Deflation' },
            { term: '🔍', meaning: 'Verify' }
        ];

        let matchCards = [];
        let flippedCards = [];
        let matchedPairs = 0;
        let matchStartTime;
        let matchTimerInterval;

        function startMatch() {
            matchedPairs = 0;
            flippedCards = [];
            document.getElementById('match-pairs').textContent = '0/8';
            document.getElementById('match-time').textContent = '0:00';
            document.getElementById('match-start').style.display = 'none';

            // Create cards array (terms + meanings)
            matchCards = [];
            matchPairs.forEach((pair, i) => {
                matchCards.push({ id: i, type: 'term', content: pair.term, pairId: i });
                matchCards.push({ id: i + 8, type: 'meaning', content: pair.meaning, pairId: i });
            });

            // Shuffle
            matchCards.sort(() => Math.random() - 0.5);

            // Render - Security: Use DOM API instead of innerHTML to prevent XSS
            const grid = document.getElementById('match-grid');
            grid.textContent = '';
            matchCards.forEach((card, idx) => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'match-card';
                cardDiv.dataset.index = idx;
                cardDiv.dataset.pair = card.pairId;
                cardDiv.onclick = () => flipCard(idx);

                const front = document.createElement('span');
                front.className = 'card-front';
                front.textContent = '?';

                const back = document.createElement('span');
                back.className = 'card-back';
                back.textContent = card.content;

                cardDiv.appendChild(front);
                cardDiv.appendChild(back);
                grid.appendChild(cardDiv);
            });

            matchStartTime = Date.now();
            matchTimerInterval = setInterval(updateMatchTimer, 100);
        }

        function updateMatchTimer() {
            const elapsed = Math.floor((Date.now() - matchStartTime) / 1000);
            const mins = Math.floor(elapsed / 60);
            const secs = elapsed % 60;
            document.getElementById('match-time').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        function flipCard(index) {
            const card = document.querySelector(`.match-card[data-index="${index}"]`);
            if (card.classList.contains('flipped') || card.classList.contains('matched') || flippedCards.length >= 2) return;

            card.classList.add('flipped');
            flippedCards.push({ index, pairId: matchCards[index].pairId, element: card });

            if (flippedCards.length === 2) {
                setTimeout(checkMatch, 500);
            }
        }

        function checkMatch() {
            const [card1, card2] = flippedCards;

            if (card1.pairId === card2.pairId) {
                // Match!
                card1.element.classList.add('matched');
                card2.element.classList.add('matched');
                matchedPairs++;
                document.getElementById('match-pairs').textContent = `${matchedPairs}/8`;

                if (matchedPairs === 8) {
                    endMatch();
                }
            } else {
                // No match
                card1.element.classList.remove('flipped');
                card2.element.classList.remove('flipped');
            }

            flippedCards = [];
        }

        function endMatch() {
            clearInterval(matchTimerInterval);
            const elapsed = Math.floor((Date.now() - matchStartTime) / 1000);

            const gs = getGameState();
            if (elapsed < gs.highScores.match) {
                gs.highScores.match = elapsed;
                saveGameState(gs);
            }

            // Award XP based on time
            let xpEarned = 60;
            if (elapsed > 30) xpEarned = 40;
            if (elapsed > 60) xpEarned = 20;
            if (elapsed > 90) xpEarned = 10;
            addXP(xpEarned);

            updateHighScores();
            document.getElementById('match-start').textContent = `Time: ${elapsed}s (+${xpEarned} XP) - PLAY AGAIN`;
            document.getElementById('match-start').style.display = 'block';
        }

        function stopMatch() {
            clearInterval(matchTimerInterval);
        }

        // ============================================
        // BURN CLICKER GAME
        // ============================================

        let clickerCount = 0;
        let clickerPower = 1;
        let clickerMulti = 1;
        let hasAutoClicker = false;
        let autoClickerInterval;
        let frenzyActive = false;
        let clickerXPAwarded = 0;

        function initClicker() {
            const gs = getGameState();
            clickerCount = gs.totalClicks || 0;
            clickerPower = gs.clickerPower || 1;
            clickerMulti = gs.clickerMulti || 1;
            hasAutoClicker = gs.hasAuto || false;

            document.getElementById('clicker-count').textContent = formatNumber(clickerCount);
            updateUpgradeButtons();

            if (hasAutoClicker && !autoClickerInterval) {
                autoClickerInterval = setInterval(() => {
                    addClicks(clickerPower * clickerMulti);
                }, 1000);
            }
        }

        function clickBurn(e) {
            const power = clickerPower * clickerMulti * (frenzyActive ? 5 : 1);
            addClicks(power);

            // Click effect
            const effect = document.createElement('div');
            effect.className = 'click-effect';
            effect.textContent = '+' + power;
            effect.style.left = (e.offsetX || 75) + 'px';
            effect.style.top = (e.offsetY || 75) + 'px';
            document.getElementById('clicker-btn').appendChild(effect);
            setTimeout(() => effect.remove(), 800);
        }

        function addClicks(amount) {
            clickerCount += amount;
            document.getElementById('clicker-count').textContent = formatNumber(clickerCount);

            const gs = getGameState();
            gs.totalClicks = clickerCount;
            saveGameState(gs);

            updateUpgradeButtons();

            // Award XP every 100 burns
            const xpMilestones = Math.floor(clickerCount / 100);
            if (xpMilestones > clickerXPAwarded && clickerXPAwarded < 10) {
                addXP(10);
                clickerXPAwarded = xpMilestones;
            }

            updateHighScores();
        }

        function buyUpgrade(type) {
            const gs = getGameState();

            if (type === 'power' && clickerCount >= 50) {
                clickerCount -= 50;
                clickerPower++;
                gs.clickerPower = clickerPower;
            }
            else if (type === 'auto' && clickerCount >= 200 && !hasAutoClicker) {
                clickerCount -= 200;
                hasAutoClicker = true;
                gs.hasAuto = true;
                autoClickerInterval = setInterval(() => {
                    addClicks(clickerPower * clickerMulti);
                }, 1000);
            }
            else if (type === 'multi' && clickerCount >= 500 && clickerMulti < 4) {
                clickerCount -= 500;
                clickerMulti *= 2;
                gs.clickerMulti = clickerMulti;
            }
            else if (type === 'frenzy' && clickerCount >= 1000 && !frenzyActive) {
                clickerCount -= 1000;
                frenzyActive = true;
                document.getElementById('clicker-btn').style.background = 'radial-gradient(circle at 30% 30%, #fbbf24, #f59e0b, #d97706)';
                setTimeout(() => {
                    frenzyActive = false;
                    document.getElementById('clicker-btn').style.background = '';
                }, 10000);
            }

            gs.totalClicks = clickerCount;
            saveGameState(gs);
            document.getElementById('clicker-count').textContent = formatNumber(clickerCount);
            updateUpgradeButtons();
        }

        function updateUpgradeButtons() {
            document.getElementById('upgrade-power').disabled = clickerCount < 50;
            document.getElementById('upgrade-auto').disabled = clickerCount < 200 || hasAutoClicker;
            document.getElementById('upgrade-multi').disabled = clickerCount < 500 || clickerMulti >= 4;
            document.getElementById('upgrade-frenzy').disabled = clickerCount < 1000 || frenzyActive;

            if (hasAutoClicker) document.querySelector('#upgrade-auto .up-name').textContent = 'Auto Burner ✓';
            if (clickerMulti >= 4) document.querySelector('#upgrade-multi .up-name').textContent = `${clickerMulti}x MAX`;
        }

        // ============================================
        // BURN FIGHTER GAME (2D Combat)
        // ============================================

        let fighterActive = false;
        let fighterWave = 1;
        let fighterCombo = 0;
        let fighterPlayerHP = 100;
        let fighterEnemyHP = 100;
        let fighterPlayerPos = 50;
        let fighterEnemyPos = 50;
        let fighterSpecialReady = true;
        let fighterJumping = false;
        let fighterBlocking = false;
        let fighterFacing = 'right';
        let fighterInterval;

        function startFighter() {
            fighterActive = true;
            fighterWave = 1;
            fighterCombo = 0;
            fighterPlayerHP = 100;
            fighterEnemyHP = 100;
            fighterPlayerPos = 50;
            fighterEnemyPos = 50;
            fighterSpecialReady = true;
            fighterJumping = false;
            fighterBlocking = false;
            fighterFacing = 'right';

            document.getElementById('fighter-wave').textContent = fighterWave;
            document.getElementById('fighter-combo').textContent = fighterCombo;
            document.getElementById('fighter-player-health').style.width = '100%';
            document.getElementById('fighter-enemy-health').style.width = '100%';
            document.getElementById('fighter-start').style.display = 'none';

            const player = document.getElementById('fighter-player');
            const enemy = document.getElementById('fighter-enemy');
            player.textContent = '🐕';
            player.style.left = '50px';
            player.style.transform = 'scaleX(1)';
            enemy.textContent = '🐱';
            enemy.style.right = '50px';
            enemy.style.transform = 'scaleX(-1)';

            document.addEventListener('keydown', fighterKeyHandler);
            document.addEventListener('keyup', fighterKeyUpHandler);

            // Mouse controls
            const arena = document.getElementById('fighter-arena');
            arena.addEventListener('mousedown', fighterMouseHandler);
            arena.addEventListener('contextmenu', e => e.preventDefault());

            // Enemy AI
            fighterInterval = setInterval(fighterEnemyAI, 1500);
        }

        function fighterKeyHandler(e) {
            if (!fighterActive) return;
            // AZERTY controls: Z=jump, Q=left, D=right, F=block
            if (e.key === 'q' || e.key === 'Q') fighterMove(-1);
            if (e.key === 'd' || e.key === 'D') fighterMove(1);
            if (e.key === 'z' || e.key === 'Z') fighterJump();
            if (e.key === 'f' || e.key === 'F') fighterBlock();
        }

        function fighterKeyUpHandler(e) {
            if (!fighterActive) return;
            if (e.key === 'f' || e.key === 'F') {
                fighterBlocking = false;
                document.getElementById('fighter-player').classList.remove('blocking');
            }
        }

        function fighterMouseHandler(e) {
            if (!fighterActive) return;
            e.preventDefault();
            // Update facing before attack to ensure correct direction
            fighterUpdateFacing();
            if (e.button === 0) {
                // Left click = attack in facing direction
                fighterAttack(fighterFacing);
            } else if (e.button === 2) {
                // Right click = special
                fighterSpecial();
            }
        }

        function fighterMove(dir) {
            if (!fighterActive || fighterBlocking) return;
            fighterPlayerPos = Math.max(20, Math.min(350, fighterPlayerPos + dir * 30));
            const player = document.getElementById('fighter-player');
            player.style.left = fighterPlayerPos + 'px';

            // Update facing direction based on enemy position
            fighterUpdateFacing();
        }

        function fighterUpdateFacing() {
            const player = document.getElementById('fighter-player');
            const enemy = document.getElementById('fighter-enemy');
            const enemyX = 500 - fighterEnemyPos;

            // Player faces enemy
            if (fighterPlayerPos < enemyX) {
                fighterFacing = 'right';
                player.style.transform = 'scaleX(1)';
            } else {
                fighterFacing = 'left';
                player.style.transform = 'scaleX(-1)';
            }

            // Enemy faces player
            if (enemyX > fighterPlayerPos) {
                enemy.style.transform = 'scaleX(-1)';
            } else {
                enemy.style.transform = 'scaleX(1)';
            }
        }

        function fighterJump() {
            if (!fighterActive || fighterJumping || fighterBlocking) return;
            fighterJumping = true;
            const player = document.getElementById('fighter-player');
            player.classList.add('jumping');
            setTimeout(() => {
                player.classList.remove('jumping');
                fighterJumping = false;
            }, 500);
        }

        function fighterBlock() {
            if (!fighterActive || fighterJumping) return;
            fighterBlocking = true;
            document.getElementById('fighter-player').classList.add('blocking');
        }

        function fighterAttack(direction = 'right') {
            if (!fighterActive || fighterBlocking) return;

            // Calculate distance between player and enemy
            const playerCenterX = fighterPlayerPos + 20;
            const enemyCenterX = 500 - fighterEnemyPos - 20;
            const dist = Math.abs(playerCenterX - enemyCenterX);

            // Show attack effect in facing direction (toward enemy)
            const attack = document.createElement('div');
            attack.className = 'fighter-attack ' + direction;
            attack.textContent = '💥';

            // Position attack between player and enemy
            if (direction === 'left') {
                attack.style.left = (fighterPlayerPos - 25) + 'px';
            } else {
                attack.style.left = (fighterPlayerPos + 45) + 'px';
            }
            attack.style.bottom = fighterJumping ? '110px' : '55px';

            document.getElementById('fighter-arena').appendChild(attack);
            setTimeout(() => attack.remove(), 300);

            // Simple hit detection - player always faces enemy, so just check range
            const hitRange = 200;
            if (dist < hitRange) {
                const damage = 12 + Math.floor(Math.random() * 10) + (fighterJumping ? 5 : 0);
                fighterEnemyHP = Math.max(0, fighterEnemyHP - damage);
                fighterCombo++;
                document.getElementById('fighter-combo').textContent = fighterCombo;
                updateFighterHealth();

                // Show hit effect on enemy
                const hitMarker = document.createElement('div');
                hitMarker.className = 'fighter-attack';
                hitMarker.textContent = '💢';
                hitMarker.style.left = enemyCenterX + 'px';
                hitMarker.style.bottom = '75px';
                document.getElementById('fighter-arena').appendChild(hitMarker);
                setTimeout(() => hitMarker.remove(), 200);

                if (fighterEnemyHP <= 0) {
                    fighterNextWave();
                }
            }
        }

        function fighterSpecial() {
            if (!fighterActive || !fighterSpecialReady || fighterBlocking) return;
            fighterSpecialReady = false;

            // Calculate distance
            const playerCenterX = fighterPlayerPos + 20;
            const enemyCenterX = 500 - fighterEnemyPos - 20;
            const dist = Math.abs(playerCenterX - enemyCenterX);

            const attack = document.createElement('div');
            attack.className = 'fighter-attack ' + fighterFacing;
            attack.textContent = '🔥';

            // Position special attack in facing direction
            if (fighterFacing === 'left') {
                attack.style.left = (fighterPlayerPos - 35) + 'px';
            } else {
                attack.style.left = (fighterPlayerPos + 50) + 'px';
            }
            attack.style.bottom = fighterJumping ? '110px' : '60px';
            attack.style.fontSize = '48px';
            document.getElementById('fighter-arena').appendChild(attack);
            setTimeout(() => attack.remove(), 400);

            // Special has longer range (250px)
            if (dist < 250) {
                const damage = 25 + Math.floor(Math.random() * 15);
                fighterEnemyHP = Math.max(0, fighterEnemyHP - damage);
                fighterCombo += 3;
                document.getElementById('fighter-combo').textContent = fighterCombo;
                updateFighterHealth();

                // Show hit effect on enemy
                const hitMarker = document.createElement('div');
                hitMarker.className = 'fighter-attack';
                hitMarker.textContent = '💥';
                hitMarker.style.left = enemyCenterX + 'px';
                hitMarker.style.bottom = '75px';
                hitMarker.style.fontSize = '32px';
                document.getElementById('fighter-arena').appendChild(hitMarker);
                setTimeout(() => hitMarker.remove(), 300);

                if (fighterEnemyHP <= 0) {
                    fighterNextWave();
                }
            }

            setTimeout(() => { fighterSpecialReady = true; }, 3000);
        }

        function fighterEnemyAI() {
            if (!fighterActive) return;

            // Move towards player
            const playerX = fighterPlayerPos;
            const enemyX = 500 - fighterEnemyPos;
            if (playerX < enemyX - 100) {
                fighterEnemyPos = Math.min(450, fighterEnemyPos + 25);
            } else if (playerX > enemyX + 100) {
                fighterEnemyPos = Math.max(50, fighterEnemyPos - 25);
            }
            document.getElementById('fighter-enemy').style.right = fighterEnemyPos + 'px';

            // Update facing after enemy moves
            fighterUpdateFacing();

            // Attack if close
            if (Math.abs(playerX - enemyX) < 120) {
                // Show enemy attack effect
                const attack = document.createElement('div');
                attack.className = 'fighter-attack left';
                attack.textContent = '😾';
                attack.style.right = fighterEnemyPos + 'px';
                attack.style.bottom = '60px';
                document.getElementById('fighter-arena').appendChild(attack);
                setTimeout(() => attack.remove(), 300);

                // Check if player is blocking
                if (fighterBlocking) {
                    // Blocked! Reduced damage
                    const damage = Math.floor((5 + fighterWave * 2) * 0.2);
                    fighterPlayerHP = Math.max(0, fighterPlayerHP - damage);
                } else if (fighterJumping) {
                    // Dodged by jumping!
                } else {
                    const damage = 5 + fighterWave * 2;
                    fighterPlayerHP = Math.max(0, fighterPlayerHP - damage);
                    fighterCombo = 0;
                    document.getElementById('fighter-combo').textContent = fighterCombo;
                }
                updateFighterHealth();

                if (fighterPlayerHP <= 0) {
                    endFighter();
                }
            }
        }

        function updateFighterHealth() {
            const playerBar = document.getElementById('fighter-player-health');
            const enemyBar = document.getElementById('fighter-enemy-health');
            playerBar.style.width = fighterPlayerHP + '%';
            enemyBar.style.width = fighterEnemyHP + '%';
            if (fighterPlayerHP < 30) playerBar.classList.add('low');
            else playerBar.classList.remove('low');
        }

        function fighterNextWave() {
            fighterWave++;
            fighterEnemyHP = 100 + fighterWave * 20;
            fighterEnemyPos = 50;  // Reset to right side (style.right = 50px)
            document.getElementById('fighter-wave').textContent = fighterWave;
            document.getElementById('fighter-enemy-health').style.width = '100%';

            // Reset enemy position and appearance
            const enemy = document.getElementById('fighter-enemy');
            enemy.style.right = fighterEnemyPos + 'px';
            enemy.style.transform = 'scaleX(-1)';  // Face left (towards player)

            // Change enemy appearance - all cats!
            const enemies = ['🐱', '😺', '😸', '😼', '🙀'];
            enemy.textContent = enemies[fighterWave % enemies.length];

            // Update facing directions
            fighterUpdateFacing();
        }

        function endFighter() {
            fighterActive = false;
            clearInterval(fighterInterval);
            document.removeEventListener('keydown', fighterKeyHandler);
            document.removeEventListener('keyup', fighterKeyUpHandler);
            const arena = document.getElementById('fighter-arena');
            if (arena) arena.removeEventListener('mousedown', fighterMouseHandler);

            const gs = getGameState();
            if (fighterWave > gs.highScores.fighter) {
                gs.highScores.fighter = fighterWave;
                saveGameState(gs);
            }

            const xpEarned = Math.min(80, fighterWave * 10 + fighterCombo);
            if (xpEarned > 0) addXP(xpEarned);

            updateHighScores();
            document.getElementById('fighter-start').textContent = `Wave ${fighterWave} (+${xpEarned} XP) - FIGHT AGAIN`;
            document.getElementById('fighter-start').style.display = 'block';
        }

        // ============================================
        // TOKEN RACER GAME (Car Game)
        // ============================================

        let racerActive = false;
        let racerDistance = 0;
        let racerCoins = 0;
        let racerSpeed = 0;
        let racerCarPos = 50;
        let racerInterval;
        let racerSpawnInterval;
        let racerMoveDir = 0;
        let racerMoveInterval;
        let racerSpawnRate = 800;

        function startRacer() {
            racerActive = true;
            racerDistance = 0;
            racerCoins = 0;
            racerSpeed = 60;
            racerCarPos = 50;
            racerMoveDir = 0;
            racerSpawnRate = 800;

            document.getElementById('racer-distance').textContent = '0m';
            document.getElementById('racer-coins').textContent = '0';
            document.getElementById('racer-speed').textContent = '60 km/h';
            document.getElementById('racer-car').style.left = 'calc(50% - 20px)';
            document.getElementById('racer-start').style.display = 'none';

            // Clear existing obstacles
            document.querySelectorAll('.racer-obstacle, .racer-coin').forEach(e => e.remove());

            document.addEventListener('keydown', racerKeyDown);
            document.addEventListener('keyup', racerKeyUp);

            racerInterval = setInterval(racerUpdate, 50);
            racerSpawnInterval = setInterval(racerSpawn, racerSpawnRate);
        }

        function racerKeyDown(e) {
            if (!racerActive) return;
            if (e.key === 'ArrowLeft' && racerMoveDir !== -1) {
                racerMoveDir = -1;
                if (!racerMoveInterval) racerMoveInterval = setInterval(racerMoveCar, 16);
            }
            if (e.key === 'ArrowRight' && racerMoveDir !== 1) {
                racerMoveDir = 1;
                if (!racerMoveInterval) racerMoveInterval = setInterval(racerMoveCar, 16);
            }
        }

        function racerKeyUp(e) {
            if ((e.key === 'ArrowLeft' && racerMoveDir === -1) || (e.key === 'ArrowRight' && racerMoveDir === 1)) {
                racerMoveDir = 0;
                clearInterval(racerMoveInterval);
                racerMoveInterval = null;
            }
        }

        function racerMoveCar() {
            const moveSpeed = 1.5 + racerSpeed / 100;
            // Keep car within road boundaries (road is 200px wide, centered)
            // Road spans roughly 35% to 65% of the container
            racerCarPos = Math.max(36, Math.min(64, racerCarPos + racerMoveDir * moveSpeed));
            document.getElementById('racer-car').style.left = `calc(${racerCarPos}% - 20px)`;
        }

        function racerUpdate() {
            if (!racerActive) return;

            // Progressive speed increase (more noticeable acceleration)
            racerSpeed = Math.min(400, racerSpeed + 0.4);
            racerDistance += Math.floor(racerSpeed / 20);

            document.getElementById('racer-distance').textContent = racerDistance + 'm';
            document.getElementById('racer-speed').textContent = Math.floor(racerSpeed) + ' km/h';

            // Update spawn rate based on speed
            const newSpawnRate = Math.max(300, 800 - racerSpeed * 2);
            if (Math.abs(newSpawnRate - racerSpawnRate) > 50) {
                racerSpawnRate = newSpawnRate;
                clearInterval(racerSpawnInterval);
                racerSpawnInterval = setInterval(racerSpawn, racerSpawnRate);
            }

            // Check collisions
            racerCheckCollisions();
        }

        function racerSpawn() {
            if (!racerActive) return;
            const track = document.getElementById('racer-track');
            const isObstacle = Math.random() < 0.35;
            const item = document.createElement('div');
            item.className = isObstacle ? 'racer-obstacle' : 'racer-coin';
            item.textContent = isObstacle ? (Math.random() < 0.5 ? '🚨' : '💀') : '🪙';
            item.dataset.type = isObstacle ? 'obstacle' : 'coin';

            const xPos = 30 + Math.random() * 40;
            item.style.left = `calc(${xPos}% - 14px)`;

            // Faster animation as speed increases
            const animDuration = Math.max(0.6, 2.5 - racerSpeed / 120);
            item.style.animationDuration = animDuration + 's';

            track.appendChild(item);
            item.addEventListener('animationend', () => item.remove());
        }

        function racerCheckCollisions() {
            const car = document.getElementById('racer-car');
            const carRect = car.getBoundingClientRect();

            // Shrink hitbox by margin (10px on each side)
            const margin = 10;
            const carHitbox = {
                left: carRect.left + margin,
                right: carRect.right - margin,
                top: carRect.top + margin,
                bottom: carRect.bottom - margin
            };

            document.querySelectorAll('.racer-obstacle, .racer-coin').forEach(item => {
                const itemRect = item.getBoundingClientRect();
                // Also shrink obstacle hitbox
                const itemMargin = item.dataset.type === 'obstacle' ? 8 : 0;
                const itemHitbox = {
                    left: itemRect.left + itemMargin,
                    right: itemRect.right - itemMargin,
                    top: itemRect.top + itemMargin,
                    bottom: itemRect.bottom - itemMargin
                };

                if (carHitbox.left < itemHitbox.right && carHitbox.right > itemHitbox.left &&
                    carHitbox.top < itemHitbox.bottom && carHitbox.bottom > itemHitbox.top) {

                    if (item.dataset.type === 'obstacle') {
                        endRacer();
                    } else {
                        racerCoins += 10;
                        document.getElementById('racer-coins').textContent = racerCoins;
                        item.remove();
                    }
                }
            });
        }

        function endRacer() {
            racerActive = false;
            clearInterval(racerInterval);
            clearInterval(racerSpawnInterval);
            clearInterval(racerMoveInterval);
            racerMoveInterval = null;
            document.removeEventListener('keydown', racerKeyDown);
            document.removeEventListener('keyup', racerKeyUp);

            const gs = getGameState();
            if (racerDistance > gs.highScores.racer) {
                gs.highScores.racer = racerDistance;
                saveGameState(gs);
            }

            const xpEarned = Math.min(70, Math.floor(racerDistance / 100) * 5 + racerCoins / 2);
            if (xpEarned > 0) addXP(xpEarned);

            updateHighScores();
            document.getElementById('racer-start').textContent = `${racerDistance}m (+${Math.floor(xpEarned)} XP) - RACE AGAIN`;
            document.getElementById('racer-start').style.display = 'block';
        }

        // ============================================
        // SCAM BLASTER GAME (Shooting)
        // ============================================

        let blasterActive = false;
        let blasterScore = 0;
        let blasterWave = 1;
        let blasterTargets = 0;
        let blasterMisses = 0;
        let blasterSpawnInterval;

        function startBlaster() {
            blasterActive = true;
            blasterScore = 0;
            blasterWave = 1;
            blasterTargets = 0;
            blasterMisses = 0;
            blasterMultiplier = 1;

            document.getElementById('blaster-score').textContent = '0';
            document.getElementById('blaster-wave').textContent = '1';
            document.getElementById('blaster-wave-display').textContent = '1';
            document.getElementById('blaster-start').style.display = 'none';

            document.querySelectorAll('.blaster-target').forEach(t => t.remove());

            blasterSpawnTargets();
            blasterSpawnInterval = setInterval(blasterCheckWave, 500);
        }

        let blasterMultiplier = 1;

        function blasterSpawnTargets() {
            const arena = document.getElementById('blaster-arena');
            const count = 3 + blasterWave * 2;

            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    if (!blasterActive) return;
                    const target = document.createElement('div');
                    target.className = 'blaster-target';

                    // 3 types: skull (danger), flame (multiplier), rug (points)
                    const rand = Math.random();
                    let type;
                    if (rand < 0.25) {
                        type = 'skull';
                        target.textContent = '💀';
                    } else if (rand < 0.45) {
                        type = 'flame';
                        target.textContent = '🔥';
                    } else {
                        type = 'rug';
                        target.textContent = '🚨';
                    }
                    target.dataset.type = type;

                    target.style.left = (20 + Math.random() * 60) + '%';
                    target.style.top = (20 + Math.random() * 60) + '%';
                    target.style.animationDelay = (Math.random() * 0.5) + 's';

                    target.onclick = (e) => {
                        e.stopPropagation();
                        blasterHitTarget(target);
                    };

                    arena.appendChild(target);
                    blasterTargets++;

                    // Auto-escape after time - rugs that escape = miss
                    setTimeout(() => {
                        if (target.parentNode && blasterActive) {
                            if (target.dataset.type === 'rug') {
                                blasterMisses++;
                                if (blasterMisses >= 5) endBlaster();
                            }
                            target.remove();
                            blasterTargets--;
                        }
                    }, 3000 - blasterWave * 200);
                }, i * 300);
            }
        }

        function blasterShoot(e) {
            if (!blasterActive) return;
            // Show explosion at click point
            const arena = document.getElementById('blaster-arena');
            const rect = arena.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const explosion = document.createElement('div');
            explosion.className = 'blaster-explosion';
            explosion.textContent = '💨';
            explosion.style.left = x + 'px';
            explosion.style.top = y + 'px';
            arena.appendChild(explosion);
            setTimeout(() => explosion.remove(), 400);
        }

        function blasterHitTarget(target) {
            if (!blasterActive) return;
            const type = target.dataset.type;

            const explosion = document.createElement('div');
            explosion.className = 'blaster-explosion';
            explosion.style.left = target.style.left;
            explosion.style.top = target.style.top;
            target.parentNode.appendChild(explosion);

            if (type === 'skull') {
                // Skull = GAME OVER!
                explosion.textContent = '💀💥';
                explosion.style.fontSize = '48px';
                setTimeout(() => explosion.remove(), 600);
                target.remove();
                blasterTargets--;
                endBlaster();
                return;
            } else if (type === 'flame') {
                // Flame = multiplier boost
                explosion.textContent = '🔥x2';
                blasterMultiplier = Math.min(8, blasterMultiplier + 1);
                document.getElementById('blaster-score').textContent = blasterScore + ' (x' + blasterMultiplier + ')';
            } else {
                // Rug = normal points
                explosion.textContent = '💥';
                const points = 10 * blasterWave * blasterMultiplier;
                blasterScore += points;
                document.getElementById('blaster-score').textContent = blasterScore + (blasterMultiplier > 1 ? ' (x' + blasterMultiplier + ')' : '');
            }

            setTimeout(() => explosion.remove(), 400);
            target.remove();
            blasterTargets--;
        }

        function blasterCheckWave() {
            if (!blasterActive) return;
            const rugTargets = document.querySelectorAll('.blaster-target[data-type="rug"]');
            const remainingTargets = document.querySelectorAll('.blaster-target');
            // Advance wave when all rugs are eliminated
            if (rugTargets.length === 0 && remainingTargets.length <= 2) {
                blasterWave++;
                document.getElementById('blaster-wave').textContent = blasterWave;
                document.getElementById('blaster-wave-display').textContent = blasterWave;
                // Clear remaining targets
                remainingTargets.forEach(t => t.remove());
                blasterTargets = 0;
                blasterSpawnTargets();
            }
        }

        function endBlaster() {
            blasterActive = false;
            clearInterval(blasterSpawnInterval);
            document.querySelectorAll('.blaster-target').forEach(t => t.remove());

            const gs = getGameState();
            if (blasterWave > gs.highScores.blaster) {
                gs.highScores.blaster = blasterWave;
                saveGameState(gs);
            }

            const xpEarned = Math.min(65, blasterWave * 8 + Math.floor(blasterScore / 50));
            if (xpEarned > 0) addXP(xpEarned);

            updateHighScores();
            document.getElementById('blaster-start').textContent = `Wave ${blasterWave} (+${xpEarned} XP) - BLAST AGAIN`;
            document.getElementById('blaster-start').style.display = 'block';
        }

        // ============================================
        // TREASURY DEFENSE GAME (Strategy)
        // ============================================

        let defenseActive = false;
        let defensePrepPhase = false;
        let defenseWave = 1;
        let defenseGold = 150;
        let defenseLives = 5;
        let defenseSelectedTower = 'fire';
        let defenseTowers = [];
        let defenseEnemies = [];
        let defenseInterval;
        let defensePrepTimer = null;
        const defenseGrid = Array(48).fill(null);
        // Grid 8x6: indices 0-7 (row1), 8-15 (row2), etc.
        let defensePath = [];
        const towerCosts = { fire: 40, ice: 60, lightning: 80 };
        const towerDamage = { fire: 25, ice: 15, lightning: 40 };

        // Generate a random path from left edge to treasury (bottom-right)
        function generateDefensePath() {
            const path = [];
            const cols = 8, rows = 6;

            // Start from a random row on the left edge
            let row = Math.floor(Math.random() * rows);
            let col = 0;
            path.push(row * cols + col);

            // Move towards the treasury at position 47 (row 5, col 7)
            while (col < 7 || row < 5) {
                const possibleMoves = [];

                // Prefer moving right
                if (col < 7) {
                    possibleMoves.push({ r: row, c: col + 1, weight: 3 });
                }
                // Can move down if not at bottom
                if (row < 5 && col > 0) {
                    possibleMoves.push({ r: row + 1, c: col, weight: 1 });
                }
                // Can move up if not at top and we're past the first column
                if (row > 0 && col > 0 && col < 6) {
                    possibleMoves.push({ r: row - 1, c: col, weight: 1 });
                }

                // If we're at the right edge, must go down to treasury
                if (col === 7 && row < 5) {
                    possibleMoves.length = 0;
                    possibleMoves.push({ r: row + 1, c: col, weight: 1 });
                }

                // Pick a move (weighted random)
                const totalWeight = possibleMoves.reduce((sum, m) => sum + m.weight, 0);
                let rand = Math.random() * totalWeight;
                let chosen = possibleMoves[0];
                for (const move of possibleMoves) {
                    rand -= move.weight;
                    if (rand <= 0) {
                        chosen = move;
                        break;
                    }
                }

                row = chosen.r;
                col = chosen.c;
                const cellIndex = row * cols + col;

                // Avoid revisiting cells
                if (!path.includes(cellIndex)) {
                    path.push(cellIndex);
                }

                // Safety check
                if (path.length > 20) break;
            }

            // Ensure treasury is the last cell
            if (path[path.length - 1] !== 47) {
                path.push(47);
            }

            return path;
        }

        function initDefenseField() {
            // Generate a new random path each game
            defensePath = generateDefensePath();
            const startCell = defensePath[0];

            const field = document.getElementById('defense-field');
            field.innerHTML = '';
            for (let i = 0; i < 48; i++) {
                const cell = document.createElement('div');
                cell.className = 'defense-cell';
                if (defensePath.includes(i)) cell.classList.add('path');
                if (i === 47) {
                    cell.classList.add('treasury');
                    cell.textContent = '🏦';
                }
                if (i === startCell) {
                    cell.classList.add('start');
                    cell.textContent = '🚪';
                }
                cell.dataset.index = i;
                cell.onclick = () => placeTower(i);
                field.appendChild(cell);
            }
        }

        function selectTower(type) {
            defenseSelectedTower = type;
            document.querySelectorAll('.defense-tower-btn').forEach(b => b.classList.remove('selected'));
            document.getElementById('tower-' + type).classList.add('selected');
        }

        function placeTower(index) {
            // Can place during prep phase or active phase
            if (!defensePrepPhase && !defenseActive) return;
            if (defensePath.includes(index) || defenseGrid[index]) return;
            const cost = towerCosts[defenseSelectedTower];
            if (defenseGold < cost) return;

            defenseGold -= cost;
            document.getElementById('defense-gold').textContent = defenseGold;

            const cell = document.querySelector(`.defense-cell[data-index="${index}"]`);
            cell.classList.add('tower');
            cell.textContent = defenseSelectedTower === 'fire' ? '🔥' : defenseSelectedTower === 'ice' ? '❄️' : '⚡';

            defenseGrid[index] = { type: defenseSelectedTower, damage: towerDamage[defenseSelectedTower] };
            defenseTowers.push({ index, type: defenseSelectedTower });
        }

        function startDefensePrep() {
            if (defenseActive || defensePrepPhase) return;
            defensePrepPhase = true;
            let countdown = 10;
            document.getElementById('defense-start').textContent = `PREP: ${countdown}s - Place towers!`;
            document.getElementById('defense-start').disabled = true;

            defensePrepTimer = setInterval(() => {
                countdown--;
                if (countdown <= 0) {
                    clearInterval(defensePrepTimer);
                    defensePrepPhase = false;
                    startDefenseWave();
                } else {
                    document.getElementById('defense-start').textContent = `PREP: ${countdown}s - Place towers!`;
                }
            }, 1000);
        }

        function startDefenseWave() {
            defenseActive = true;
            document.getElementById('defense-start').textContent = 'WAVE ' + defenseWave + ' IN PROGRESS...';

            // Spawn enemies with delay
            const enemyCount = 3 + defenseWave;
            for (let i = 0; i < enemyCount; i++) {
                setTimeout(() => {
                    if (!defenseActive) return;
                    spawnDefenseEnemy();
                }, i * 1200);
            }

            defenseInterval = setInterval(defenseUpdate, 150);
        }

        function spawnDefenseEnemy() {
            const field = document.getElementById('defense-field');
            const enemy = document.createElement('div');
            enemy.className = 'defense-enemy';
            enemy.textContent = ['💀', '👹', '🚨'][Math.floor(Math.random() * 3)];
            enemy.dataset.hp = 80 + defenseWave * 15;
            enemy.dataset.maxHp = enemy.dataset.hp;
            enemy.dataset.pathIndex = 0;
            enemy.dataset.slowTimer = 0;

            positionEnemyOnPath(enemy, 0, field);
            field.appendChild(enemy);
            defenseEnemies.push(enemy);
        }

        function positionEnemyOnPath(enemy, pathIdx, field) {
            const fieldRect = field.getBoundingClientRect();
            const cellIndex = defensePath[pathIdx];
            const cell = field.children[cellIndex];
            if (!cell) return;
            const cellRect = cell.getBoundingClientRect();
            enemy.style.left = (cellRect.left - fieldRect.left + cellRect.width / 2 - 12) + 'px';
            enemy.style.top = (cellRect.top - fieldRect.top + cellRect.height / 2 - 12) + 'px';
        }

        function defenseUpdate() {
            if (!defenseActive) return;
            const field = document.getElementById('defense-field');

            // Move enemies along path
            defenseEnemies.forEach((enemy, idx) => {
                if (!enemy.parentNode) return;

                // Check if slowed
                let slowTimer = parseInt(enemy.dataset.slowTimer) || 0;
                if (slowTimer > 0) {
                    enemy.dataset.slowTimer = slowTimer - 1;
                    if (slowTimer % 2 === 0) return; // Skip every other update when slowed
                }

                let pathIdx = parseInt(enemy.dataset.pathIndex);
                if (pathIdx < defensePath.length - 1) {
                    pathIdx++;
                    enemy.dataset.pathIndex = pathIdx;
                    positionEnemyOnPath(enemy, pathIdx, field);
                } else {
                    // Reached treasury
                    enemy.remove();
                    defenseEnemies.splice(idx, 1);
                    defenseLives--;
                    updateDefenseLives();
                    if (defenseLives <= 0) endDefense();
                }
            });

            // Tower attacks with visual effects
            const now = Date.now();
            const fieldRect = field.getBoundingClientRect();
            defenseTowers.forEach(tower => {
                // Check cooldown (faster for lightning)
                const cooldown = tower.type === 'lightning' ? 300 : 600;
                if (tower.lastShot && now - tower.lastShot < cooldown) return;

                const towerCell = field.children[tower.index];
                if (!towerCell) return;
                const towerRect = towerCell.getBoundingClientRect();
                const towerX = towerRect.left - fieldRect.left + towerRect.width / 2;
                const towerY = towerRect.top - fieldRect.top + towerRect.height / 2;

                // Find closest enemy in range (increased range)
                let closestEnemy = null;
                let closestDist = Infinity;
                const range = tower.type === 'lightning' ? 100 : 80;

                defenseEnemies.forEach(enemy => {
                    if (!enemy.parentNode) return;
                    const enemyRect = enemy.getBoundingClientRect();
                    const enemyX = enemyRect.left - fieldRect.left + enemyRect.width / 2;
                    const enemyY = enemyRect.top - fieldRect.top + enemyRect.height / 2;
                    const dist = Math.hypot(towerX - enemyX, towerY - enemyY);

                    if (dist < range && dist < closestDist) {
                        closestDist = dist;
                        closestEnemy = { el: enemy, x: enemyX, y: enemyY };
                    }
                });

                if (closestEnemy) {
                    tower.lastShot = now;
                    const towerData = defenseGrid[tower.index];

                    // Create projectile
                    const projectile = document.createElement('div');
                    projectile.className = 'defense-projectile ' + tower.type;
                    projectile.textContent = tower.type === 'fire' ? '🔥' : tower.type === 'ice' ? '❄️' : '⚡';
                    projectile.style.left = closestEnemy.x + 'px';
                    projectile.style.top = closestEnemy.y + 'px';
                    field.appendChild(projectile);
                    setTimeout(() => projectile.remove(), 300);

                    // Deal damage
                    let hp = parseInt(closestEnemy.el.dataset.hp) - towerData.damage;
                    closestEnemy.el.dataset.hp = hp;

                    // Show damage number
                    const dmgText = document.createElement('div');
                    dmgText.className = 'defense-damage';
                    dmgText.textContent = '-' + towerData.damage;
                    dmgText.style.left = closestEnemy.x + 'px';
                    dmgText.style.top = closestEnemy.y + 'px';
                    field.appendChild(dmgText);
                    setTimeout(() => dmgText.remove(), 600);

                    // Ice tower slows enemy
                    if (tower.type === 'ice') {
                        closestEnemy.el.dataset.slowTimer = 10;
                        closestEnemy.el.style.filter = 'hue-rotate(180deg)';
                        setTimeout(() => {
                            if (closestEnemy.el.parentNode) {
                                closestEnemy.el.style.filter = '';
                            }
                        }, 1500);
                    }

                    if (hp <= 0) {
                        closestEnemy.el.remove();
                        defenseEnemies = defenseEnemies.filter(e => e !== closestEnemy.el);
                        defenseGold += 15 + defenseWave * 3;
                        document.getElementById('defense-gold').textContent = defenseGold;
                    }
                }
            });

            // Check wave complete
            if (defenseEnemies.length === 0 && document.querySelectorAll('.defense-enemy').length === 0) {
                defenseActive = false;
                clearInterval(defenseInterval);
                defenseWave++;
                // Bonus gold for completing wave
                defenseGold += 50 + defenseWave * 10;
                document.getElementById('defense-gold').textContent = defenseGold;
                document.getElementById('defense-wave').textContent = defenseWave;
                document.getElementById('defense-start').textContent = 'PREP WAVE ' + defenseWave;
                document.getElementById('defense-start').disabled = false;
            }
        }

        function updateDefenseLives() {
            const livesEl = document.getElementById('defense-lives');
            livesEl.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                const span = document.createElement('span');
                span.textContent = i < defenseLives ? '❤️' : '🖤';
                livesEl.appendChild(span);
            }
        }

        function endDefense() {
            defenseActive = false;
            defensePrepPhase = false;
            clearInterval(defenseInterval);
            clearInterval(defensePrepTimer);
            defenseEnemies.forEach(e => e.remove());
            defenseEnemies = [];

            const gs = getGameState();
            if (defenseWave > gs.highScores.defense) {
                gs.highScores.defense = defenseWave;
                saveGameState(gs);
            }

            const xpEarned = Math.min(90, defenseWave * 12);
            if (xpEarned > 0) addXP(xpEarned);

            updateHighScores();
            document.getElementById('defense-start').textContent = `Wave ${defenseWave} (+${xpEarned} XP) - RESTART`;
            document.getElementById('defense-start').disabled = false;
            document.getElementById('defense-start').onclick = () => {
                defenseWave = 1;
                defenseGold = 150;
                defenseLives = 5;
                defenseTowers = [];
                defenseGrid.fill(null);
                document.getElementById('defense-wave').textContent = '1';
                document.getElementById('defense-gold').textContent = '150';
                updateDefenseLives();
                initDefenseField();
                document.getElementById('defense-start').textContent = 'START PREP';
                document.getElementById('defense-start').onclick = startDefensePrep;
            };
        }

        // ============================================
        // TOKEN STACKER GAME (Build)
        // ============================================

        let stackerActive = false;
        let stackerHeight = 0;
        let stackerScore = 0;
        let stackerBlocks = [];
        let stackerMovingBlock = null;
        let stackerDirection = 1;
        let stackerSpeed = 3;
        let stackerBlockWidth = 80;
        let stackerInterval;

        let stackerViewportOffset = 0;

        function startStacker() {
            stackerActive = true;
            stackerHeight = 0;
            stackerScore = 0;
            stackerBlocks = [];
            stackerBlockWidth = 80;
            stackerSpeed = 3;
            stackerViewportOffset = 0;

            document.getElementById('stacker-height').textContent = '0';
            document.getElementById('stacker-height-display').textContent = '0';
            document.getElementById('stacker-score').textContent = '0';
            document.getElementById('stacker-start').style.display = 'none';

            // Reset viewport
            const viewport = document.getElementById('stacker-viewport');
            viewport.style.transform = 'translateY(0)';

            // Clear blocks
            document.querySelectorAll('.stacker-block, .stacker-moving, .stacker-perfect-text').forEach(b => b.remove());

            document.addEventListener('keydown', stackerKeyHandler);
            spawnStackerBlock();
        }

        function stackerKeyHandler(e) {
            if (e.code === 'Space' && stackerActive) {
                e.preventDefault();
                stackerDrop();
            }
        }

        function spawnStackerBlock() {
            const viewport = document.getElementById('stacker-viewport');
            const block = document.createElement('div');
            block.className = 'stacker-moving';
            block.style.width = stackerBlockWidth + 'px';
            block.style.left = '0px';
            block.textContent = '🔥';

            // Position at landing height (on top of the current tower)
            const landingHeight = 20 + stackerHeight * 32;
            block.style.bottom = landingHeight + 'px';

            viewport.appendChild(block);
            stackerMovingBlock = block;
            stackerDirection = 1;

            stackerInterval = setInterval(moveStackerBlock, 16);
        }

        function moveStackerBlock() {
            if (!stackerMovingBlock) return;
            let left = parseFloat(stackerMovingBlock.style.left);
            const maxLeft = document.getElementById('stacker-viewport').offsetWidth - stackerBlockWidth;

            left += stackerDirection * stackerSpeed;
            if (left >= maxLeft) { left = maxLeft; stackerDirection = -1; }
            if (left <= 0) { left = 0; stackerDirection = 1; }

            stackerMovingBlock.style.left = left + 'px';
        }

        function stackerDrop() {
            if (!stackerActive || !stackerMovingBlock) return;
            clearInterval(stackerInterval);

            const area = document.getElementById('stacker-area');
            const viewport = document.getElementById('stacker-viewport');
            const areaWidth = area.offsetWidth;
            const blockLeft = parseFloat(stackerMovingBlock.style.left);
            const blockWidth = stackerBlockWidth;

            let newWidth = blockWidth;
            let newLeft = blockLeft;
            let isPerfect = false;

            if (stackerHeight === 0) {
                // First block - center it
                const centerLeft = (areaWidth - 80) / 2;
                if (Math.abs(blockLeft - centerLeft) < 5) {
                    isPerfect = true;
                    newLeft = centerLeft;
                }
            } else {
                // Compare with previous block
                const prevBlock = stackerBlocks[stackerBlocks.length - 1];
                const overlap = Math.min(blockLeft + blockWidth, prevBlock.left + prevBlock.width) -
                               Math.max(blockLeft, prevBlock.left);

                if (overlap <= 0) {
                    // Miss!
                    stackerMovingBlock.remove();
                    endStacker();
                    return;
                }

                newWidth = overlap;
                newLeft = Math.max(blockLeft, prevBlock.left);
                isPerfect = overlap >= blockWidth - 2;
            }

            // Create placed block in viewport
            const placedBlock = document.createElement('div');
            placedBlock.className = 'stacker-block placed' + (isPerfect ? ' perfect' : '');
            placedBlock.style.width = newWidth + 'px';
            placedBlock.style.left = newLeft + 'px';
            placedBlock.style.bottom = (20 + stackerHeight * 32) + 'px';
            placedBlock.textContent = '🔥';
            viewport.appendChild(placedBlock);

            stackerBlocks.push({ left: newLeft, width: newWidth });
            stackerMovingBlock.remove();
            stackerMovingBlock = null;

            stackerHeight++;
            stackerScore += isPerfect ? 20 : 10;
            stackerBlockWidth = newWidth;
            stackerSpeed = Math.min(8, 3 + stackerHeight * 0.3);

            document.getElementById('stacker-height').textContent = stackerHeight;
            document.getElementById('stacker-height-display').textContent = stackerHeight;
            document.getElementById('stacker-score').textContent = stackerScore;

            if (isPerfect) {
                const text = document.createElement('div');
                text.className = 'stacker-perfect-text';
                text.textContent = 'PERFECT!';
                text.style.top = (320 - stackerHeight * 32) + 'px';
                area.appendChild(text);
                setTimeout(() => text.remove(), 800);
                stackerBlockWidth = Math.min(80, stackerBlockWidth + 5);
            }

            // Check if too narrow
            if (stackerBlockWidth < 10) {
                endStacker();
                return;
            }

            // Scroll viewport to follow the tower growth starting at level 7
            if (stackerHeight >= 7) {
                stackerViewportOffset = (stackerHeight - 6) * 32;
                viewport.style.transform = `translateY(${stackerViewportOffset}px)`;
            }

            spawnStackerBlock();
        }

        function endStacker() {
            stackerActive = false;
            clearInterval(stackerInterval);
            document.removeEventListener('keydown', stackerKeyHandler);
            document.getElementById('stacker-viewport').style.transform = '';

            const gs = getGameState();
            if (stackerHeight > gs.highScores.stacker) {
                gs.highScores.stacker = stackerHeight;
                saveGameState(gs);
            }

            const xpEarned = Math.min(55, stackerHeight * 3 + Math.floor(stackerScore / 10));
            if (xpEarned > 0) addXP(xpEarned);

            updateHighScores();
            document.getElementById('stacker-start').textContent = `${stackerHeight} floors (+${xpEarned} XP) - STACK AGAIN`;
            document.getElementById('stacker-start').style.display = 'block';
        }

        // ============================================
        // DAILY STREAK
        // ============================================

        function updateStreak() {
            const gs = getGameState();
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();

            if (gs.lastPlayDate === today) {
                // Already played today
            } else if (gs.lastPlayDate === yesterday) {
                // Streak continues
                gs.streak = Math.min(7, gs.streak + 1);
                gs.lastPlayDate = today;
                saveGameState(gs);
            } else if (gs.lastPlayDate) {
                // Streak broken
                gs.streak = 1;
                gs.lastPlayDate = today;
                saveGameState(gs);
            } else {
                // First time
                gs.streak = 1;
                gs.lastPlayDate = today;
                saveGameState(gs);
            }

            // Update UI
            const streakDays = document.querySelectorAll('.streak-day');
            streakDays.forEach((day, i) => {
                day.classList.remove('active', 'today');
                if (i < gs.streak) day.classList.add('active');
                if (i === gs.streak - 1) day.classList.add('today');
            });
        }

        // ============================================
        // INITIALIZATION
        // ============================================

        document.addEventListener('DOMContentLoaded', () => {
            const state = getState();

            // Set start time if not set
            if (!state.startTime) {
                state.startTime = Date.now();
                saveState(state);
            }

            updateNavigation();
            updateXPDisplay();
            updateBadges();
            updateLeaderboard();
            calculateBurn();
            updateHighScores();
            updateStreak();
            initClicker();
            initDefenseField();

            // Go to current level
            goToLevel(state.currentLevel);

            // Re-enable buttons for completed quizzes
            state.completedLevels.forEach(level => {
                const nextBtn = document.getElementById('unlock-level-' + (level + 1));
                if (nextBtn) nextBtn.disabled = false;
            });

            // Show completion if already done
            if (state.courseCompleted) {
                document.getElementById('completion-banner').style.display = 'block';
                document.getElementById('level-5-actions').style.display = 'none';
            }

            // Catch check interval for Token Catcher
            setInterval(() => {
                if (document.getElementById('game-catcher').classList.contains('active')) {
                    checkCatch();
                }
            }, 50);
        });