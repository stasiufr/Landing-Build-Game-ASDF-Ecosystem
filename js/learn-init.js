/**
 * learn-init.js
 * Event listener initialization for learn.html
 * Migrates onclick handlers to addEventListener for CSP compliance
 */

'use strict';

// This script must be loaded AFTER learn.js (which contains all the functions)
// It attaches event listeners to replace inline onclick handlers

document.addEventListener('DOMContentLoaded', function() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(function(btn) {
        const viewName = btn.textContent.toLowerCase().trim();
        btn.addEventListener('click', function() {
            switchView(viewName);
        });
    });

    // Level navigation
    document.querySelectorAll('.nav-level').forEach(function(el) {
        el.addEventListener('click', function() {
            const level = parseInt(this.dataset.level);
            if (level) goToLevel(level);
        });
    });

    // Reveal boxes
    document.querySelectorAll('.reveal-box').forEach(function(box) {
        box.addEventListener('click', function() {
            toggleReveal(this);
        });
    });

    // Quiz options - add data-level to parent .quiz and data-correct to options
    document.querySelectorAll('.quiz-option').forEach(function(opt) {
        opt.addEventListener('click', function() {
            const quiz = this.closest('.quiz-section, .quiz');
            const level = quiz ? parseInt(quiz.dataset.level) : 0;
            const correct = this.dataset.correct === 'true';
            checkAnswer(this, level, correct);
        });
    });

    // Unlock level buttons
    document.querySelectorAll('[id^="unlock-level-"]').forEach(function(btn) {
        const level = parseInt(btn.id.replace('unlock-level-', ''));
        btn.addEventListener('click', function() {
            unlockLevel(level);
        });
    });

    // Back buttons (go to previous level)
    document.querySelectorAll('.level-section .btn:not(.btn-primary):not(.btn-success)').forEach(function(btn) {
        if (btn.textContent.includes('Back')) {
            const section = btn.closest('.level-section');
            if (section) {
                const currentLevel = parseInt(section.id.replace('level-', ''));
                if (currentLevel > 1) {
                    btn.addEventListener('click', function() {
                        goToLevel(currentLevel - 1);
                    });
                }
            }
        }
    });

    // Complete course button
    const completeCourseBtn = document.getElementById('complete-course');
    if (completeCourseBtn) {
        completeCourseBtn.addEventListener('click', completeCourse);
    }

    // Share completion button
    document.querySelectorAll('.btn-share').forEach(function(btn) {
        btn.addEventListener('click', shareCompletion);
    });

    // Reset progress button
    document.querySelectorAll('.btn').forEach(function(btn) {
        if (btn.textContent.includes('Reset Progress')) {
            btn.addEventListener('click', resetProgress);
        }
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            const value = this.dataset.value;
            if (filter && value) filterProjects(filter, value);
        });
    });

    // Docs buttons
    document.querySelectorAll('.btn-docs').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const project = this.dataset.project || this.closest('.project-card')?.dataset.project;
            if (project) openDocs(project);
        });
    });

    // Close docs button
    document.querySelectorAll('.doc-close').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const modal = this.closest('#doc-modal');
            if (modal) closeDocs();
            const deepModal = this.closest('#deep-learn-modal');
            if (deepModal) closeDeepLearn();
        });
    });

    // Game cards
    document.querySelectorAll('.game-card').forEach(function(card) {
        const gameId = card.dataset.game;
        if (gameId) {
            card.addEventListener('click', function() {
                openGame(gameId);
            });
        }
    });

    // Game start buttons
    const gameStarts = {
        'catcher-start': 'startCatcher',
        'sequence-start': 'startSequence',
        'match-start': 'startMatch',
        'fighter-start': 'startFighter',
        'racer-start': 'startRacer',
        'blaster-start': 'startBlaster',
        'defense-start': 'startDefensePrep',
        'stacker-start': 'startStacker'
    };

    Object.entries(gameStarts).forEach(function([id, fn]) {
        const btn = document.getElementById(id);
        if (btn && typeof window[fn] === 'function') {
            btn.addEventListener('click', window[fn]);
        }
    });

    // Game close/refresh buttons
    document.querySelectorAll('.game-close').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const modal = this.closest('.game-modal');
            if (modal) {
                const gameId = modal.id.replace('game-', '');
                closeGame(gameId);
            }
        });
    });

    document.querySelectorAll('.game-refresh').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const modal = this.closest('.game-modal');
            if (modal) {
                const gameId = modal.id.replace('game-', '');
                resetGame(gameId);
            }
        });
    });

    // Sequence buttons
    document.querySelectorAll('.sequence-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const step = this.dataset.step;
            if (step) sequenceClick(step);
        });
    });

    // Clicker upgrades
    document.querySelectorAll('.upgrade-btn').forEach(function(btn) {
        const upgradeId = btn.id.replace('upgrade-', '');
        if (upgradeId) {
            btn.addEventListener('click', function() {
                buyUpgrade(upgradeId);
            });
        }
    });

    // Burn clicker button
    const clickerBtn = document.getElementById('clicker-btn');
    if (clickerBtn) {
        clickerBtn.addEventListener('click', clickBurn);
    }

    // Blaster arena
    const blasterArena = document.getElementById('blaster-arena');
    if (blasterArena) {
        blasterArena.addEventListener('click', blasterShoot);
    }

    // Stacker area
    const stackerArea = document.getElementById('stacker-area');
    if (stackerArea) {
        stackerArea.addEventListener('click', stackerDrop);
    }

    // Defense tower buttons
    document.querySelectorAll('.defense-tower-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const tower = this.id.replace('tower-', '');
            if (tower) selectTower(tower);
        });
    });

    // FAQ items
    document.querySelectorAll('.faq-item').forEach(function(item) {
        item.addEventListener('click', function() {
            toggleFaq(this);
        });
    });

    // Calculator
    const calcPeriod = document.getElementById('calc-period');
    if (calcPeriod) {
        calcPeriod.addEventListener('change', calculateBurn);
    }

    // Eco cards with URLs
    document.querySelectorAll('.eco-card').forEach(function(card) {
        const url = card.dataset.url;
        if (url) {
            card.addEventListener('click', function() {
                window.open(url, '_blank', 'noopener,noreferrer');
            });
        }
    });

    console.log('Event listeners initialized for CSP compliance');
});
