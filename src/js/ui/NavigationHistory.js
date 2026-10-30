/**
 * NavigationHistory.js - Mobile Hardware & Browser Back Navigation Handler
 * 
 * Provides seamless Android hardware/gesture back navigation for Single Page App (SPA):
 * 1. Closes active modals/dialogs/sheets
 * 2. Closes Trading Terminal and returns to previous view
 * 3. Navigates back from subviews (Market, News, Settings, Dynamic) to Beranda (Home)
 * 4. Implements double-tap back to exit on Beranda with toast confirmation
 * 
 * Safe, zero-overhead, and isolated from core game logic.
 */

import ui from './UIManager.js';
import viewManager from './ViewManager.js';
import tradingPage from '../trading/TradingPage.js';

class NavigationHistory {
    constructor() {
        this.isInitialized = false;
        this.isPopStateProcessing = false;
        this.isProgrammaticBack = false;
        this.lastBackPressTime = 0;
        this.backExitInterval = 2000; // 2 seconds threshold
        this.historyStack = [];
    }

    init() {
        if (this.isInitialized || typeof window === 'undefined') return;

        // Establish base root and home state in browser history
        try {
            window.history.replaceState({ appStep: 'root' }, '');
            window.history.pushState({ appStep: 'home', view: 'home' }, '');
        } catch (e) {
            console.warn('⚠️ NavigationHistory: History API restricted', e);
        }

        // Listen for browser popstate (Android back button, back swipe gesture, browser back button)
        window.addEventListener('popstate', (e) => this.handlePopState(e));

        // Listen to UI lifecycle events
        document.addEventListener('modalOpened', () => this.onModalOpened());
        document.addEventListener('modalClosed', () => this.onModalClosed());
        document.addEventListener('tradingOpened', () => this.onTradingOpened());
        document.addEventListener('tradingClosed', () => this.onTradingClosed());
        document.addEventListener('viewChanged', (e) => this.onViewChanged(e.detail || {}));

        this.isInitialized = true;
        console.log('📱 NavigationHistory: Mobile hardware back button handler active');
    }

    // ========================================
    // UI EVENT HOOKS
    // ========================================

    onModalOpened() {
        if (this.isPopStateProcessing) return;
        // Avoid duplicate modal push if modal re-renders or changes step
        if (this.historyStack[this.historyStack.length - 1] === 'modal') return;

        this.historyStack.push('modal');
        try {
            window.history.pushState({ appStep: 'modal' }, '');
        } catch (e) {}
    }

    onModalClosed() {
        if (this.isPopStateProcessing) return;
        if (this.historyStack[this.historyStack.length - 1] === 'modal') {
            this.historyStack.pop();
            this.triggerProgrammaticBack();
        }
    }

    onTradingOpened() {
        if (this.isPopStateProcessing) return;
        if (this.historyStack[this.historyStack.length - 1] === 'trading') return;

        this.historyStack.push('trading');
        try {
            window.history.pushState({ appStep: 'trading' }, '');
        } catch (e) {}
    }

    onTradingClosed() {
        if (this.isPopStateProcessing) return;
        if (this.historyStack[this.historyStack.length - 1] === 'trading') {
            this.historyStack.pop();
            this.triggerProgrammaticBack();
        }
    }

    onViewChanged({ view, prevView }) {
        if (this.isPopStateProcessing) return;

        if (view === 'home') {
            // User navigated to home via UI (e.g. bottom nav or on-screen back button)
            if (this.historyStack[this.historyStack.length - 1] === 'view') {
                this.historyStack.pop();
                this.triggerProgrammaticBack();
            }
        } else {
            // User navigated to a non-home view (market, news, settings, dynamic)
            if (this.historyStack[this.historyStack.length - 1] === 'view') {
                // Already in a subview stack, update current history state without nesting infinitely
                try {
                    window.history.replaceState({ appStep: 'view', view }, '');
                } catch (e) {}
            } else {
                // Transitioning from home to subview
                this.historyStack.push('view');
                try {
                    window.history.pushState({ appStep: 'view', view }, '');
                } catch (e) {}
            }
        }
    }

    triggerProgrammaticBack() {
        this.isProgrammaticBack = true;
        try {
            window.history.back();
        } catch (e) {
            this.isProgrammaticBack = false;
        }
    }

    // ========================================
    // POPSTATE (BACK BUTTON) ORCHESTRATION
    // ========================================

    handlePopState(e) {
        // If this popstate was triggered programmatically by in-app close/back clicks, absorb it
        if (this.isProgrammaticBack) {
            this.isProgrammaticBack = false;
            return;
        }

        this.isPopStateProcessing = true;

        try {
            // PRIORITY 1: Close active modal or sheet dialog
            const modalContainer = document.getElementById('modal-container');
            if (modalContainer && !modalContainer.classList.contains('hidden')) {
                if (this.historyStack[this.historyStack.length - 1] === 'modal') {
                    this.historyStack.pop();
                }
                ui.closeModal();
                return;
            }

            // PRIORITY 2: Close Trading Terminal
            const tradingPageEl = document.getElementById('trading-page');
            if (tradingPageEl) {
                if (this.historyStack[this.historyStack.length - 1] === 'trading') {
                    this.historyStack.pop();
                }
                tradingPage.close();
                return;
            }

            // PRIORITY 3: Return from subview to Beranda (Home)
            if (viewManager.currentView !== 'home') {
                if (this.historyStack[this.historyStack.length - 1] === 'view') {
                    this.historyStack.pop();
                }
                viewManager.switchView('home');
                return;
            }

            // PRIORITY 4: Already on Beranda (Home) -> Double-tap back to exit
            const now = Date.now();
            if (this.lastBackPressTime && (now - this.lastBackPressTime < this.backExitInterval)) {
                // Second back press within threshold: allow exiting the application/tab
                this.lastBackPressTime = 0;
                window.history.back();
            } else {
                // First back press: prompt user with toast and maintain safety trap
                this.lastBackPressTime = now;
                try {
                    window.history.pushState({ appStep: 'home', view: 'home' }, '');
                } catch (err) {}

                if (typeof ui?.info === 'function') {
                    ui.info('Tekan sekali lagi untuk keluar dari game', 'Pintu Keluar', { duration: 2000 });
                }
            }
        } catch (err) {
            console.error('❌ Error handling navigation popstate:', err);
        } finally {
            // Reset popstate flag after microtask resolution
            setTimeout(() => {
                this.isPopStateProcessing = false;
            }, 60);
        }
    }
}

export const navigationHistory = new NavigationHistory();
export default navigationHistory;

