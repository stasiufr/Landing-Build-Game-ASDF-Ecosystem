/**
 * build.js - Build & Skills page functionality
 * Handles tab switching, category filtering, and countdown timer
 */

'use strict';

document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // VIEW TAB SWITCHING
    // ============================================
    const viewTabs = document.querySelectorAll('.view-tab');
    const viewSections = document.querySelectorAll('.view-section');

    viewTabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            const targetView = this.dataset.view;

            // Update active tab
            viewTabs.forEach(function(t) {
                t.classList.remove('active');
            });
            this.classList.add('active');

            // Update active section
            viewSections.forEach(function(section) {
                section.classList.remove('active');
            });

            const targetSection = document.getElementById('view-' + targetView);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            // Update URL hash for bookmarking
            history.replaceState(null, '', '#' + targetView);

            // Scroll to top of content
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Check URL hash on load to show correct view
    function checkHashOnLoad() {
        const hash = window.location.hash.replace('#', '');
        if (hash === 'build' || hash === 'skills') {
            const targetTab = document.querySelector('.view-tab[data-view="' + hash + '"]');
            if (targetTab) {
                targetTab.click();
            }
        }
    }
    checkHashOnLoad();

    // ============================================
    // CATEGORY FILTER (Skills Marketplace)
    // ============================================
    const categoryPills = document.querySelectorAll('.category-pill');
    const creatorCards = document.querySelectorAll('.creator-card');

    categoryPills.forEach(function(pill) {
        pill.addEventListener('click', function() {
            // Update active pill
            categoryPills.forEach(function(p) {
                p.classList.remove('active');
            });
            this.classList.add('active');

            const category = this.dataset.category;

            // Filter cards
            creatorCards.forEach(function(card) {
                if (category === 'all' || card.dataset.category === category) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    });

    // ============================================
    // COUNTDOWN TIMER
    // ============================================
    function updateCountdown() {
        const countdownEl = document.getElementById('countdown');
        if (!countdownEl) return;

        // Set end date (example: 5 days from now)
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 5);
        endDate.setHours(23, 59, 59);

        function update() {
            const now = new Date();
            const diff = endDate - now;

            if (diff <= 0) {
                countdownEl.textContent = 'Challenge Ended';
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            countdownEl.textContent = days + 'd ' + hours + 'h ' + minutes + 'm';
        }

        update();
        setInterval(update, 60000); // Update every minute
    }

    updateCountdown();

    // ============================================
    // PLACEHOLDER BUTTONS
    // ============================================
    document.querySelectorAll('[data-action="placeholder"]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            alert('Form URL not configured yet');
        });
    });

    console.log('Build page initialized');
});
