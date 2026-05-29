/**
 * KeyboardNavigation.js - Premium Spatial & Focus Keyboard Navigation
 * Enables full keyboard gameplay using Arrow keys, Enter, and Escape/Backspace.
 * Zero CPU overhead when idle, 100% lag-free.
 */

class KeyboardNavigation {
    constructor() {
        this.isEnabled = true;
        this.selectors = [
            'button',
            'input:not([type="hidden"])',
            'select',
            'textarea',
            '[tabindex="0"]',
            '.menu-card',
            '.action-btn',
            '.nav-btn',
            '.tab-btn',
            '.market-row',
            '.asset-row',
            '.row-interactive',
            '.job-item',
            '.job-card-hybrid',
            '.nav-to-market',
            '.sort-trigger',
            '.clickable',
            '.btn-back',
            '.btn-secondary',
            '.btn-danger',
            '.btn-primary',
            '.btn-success',
            '#career-back',
            '#btn-back-to-job',
            '#btn-change-career',
            '#btn-quit-job',
            '[data-action]',
            '[data-tab]',
            '[data-market-tab]',
            '.sidebar-link',
            '[role="button"]'
        ];
    }

    init() {
        // Inject premium glowing focus CSS styles
        this.injectStyles();

        // Listen for keyboard keydown events globally
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        console.log('🎮 Keyboard Navigation Module Initialized! Use Arrow keys to navigate, Enter to select, Escape/Backspace to go back.');
    }

    injectStyles() {
        const style = document.createElement('style');
        style.id = 'keyboard-nav-styles';
        style.textContent = `
            /* Premium visual feedback for keyboard focus */
            :focus, .keyboard-focused {
                outline: 3px solid var(--accent-primary, #10b981) !important;
                outline-offset: 3px !important;
                box-shadow: 0 0 20px var(--accent-primary-soft, rgba(16, 185, 129, 0.4)) !important;
                transform: scale(1.025) !important;
                transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            
            /* Smooth transitions for interactive elements when focused */
            .job-item, .job-card-hybrid, .nav-to-market, button, .card {
                transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
            }
        `;
        document.head.appendChild(style);
    }

    handleKeyDown(e) {
        if (!this.isEnabled) return;

        const active = document.activeElement;
        const isInputFocused = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');

        // 1. Handle Escape & Backspace (Go Back)
        if (e.key === 'Escape' || (e.key === 'Backspace' && !isInputFocused)) {
            const backButton = this.findBackButton();
            if (backButton) {
                e.preventDefault();
                backButton.click();
                return;
            }
        }

        // Allow normal typing inside input elements
        if (isInputFocused && e.key !== 'Enter') return;

        // 2. Handle Navigation Keys
        const isNavKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
        if (isNavKey) {
            e.preventDefault();
            try {
                import('./AuraSound.js').then(m => m.default.playTap());
            } catch (err) {}
            this.navigate(e.key);
            return;
        }

        // 3. Handle Enter Key (Select / Click)
        if (e.key === 'Enter') {
            if (active && active !== document.body && !isInputFocused) {
                e.preventDefault();
                active.click();
            }
        }
    }

    navigate(direction) {
        const list = this.getVisibleInteractiveElements();
        if (list.length === 0) return;

        const active = document.activeElement;
        let index = list.indexOf(active);

        // If no element currently focused, select the first one
        if (index === -1) {
            list[0].focus();
            list[0].classList.add('keyboard-focused');
            return;
        }

        // Clear other styling
        list.forEach(el => el.classList.remove('keyboard-focused'));

        // Move through list based on direction (clamped at boundaries, no wrap-around/looping)
        if (direction === 'ArrowDown' || direction === 'ArrowRight') {
            index = Math.min(index + 1, list.length - 1);
        } else if (direction === 'ArrowUp' || direction === 'ArrowLeft') {
            index = Math.max(index - 1, 0);
        }

        const nextEl = list[index];
        nextEl.focus();
        nextEl.classList.add('keyboard-focused');

        // Scroll focused element into view smoothly if needed
        nextEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    getVisibleInteractiveElements() {
        // Query elements currently in the DOM
        const query = this.selectors.join(',');
        
        // Dynamically add tabindex="0" to all matching elements that are not native form controls
        // This ensures the browser natively allows them to receive focus
        document.querySelectorAll(query).forEach(el => {
            const tag = el.tagName;
            if (tag !== 'BUTTON' && tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
                if (!el.hasAttribute('tabindex')) {
                    el.setAttribute('tabindex', '0');
                }
            }
        });

        // Detect if modal is active
        const modalContainer = document.getElementById('modal-container');
        const isModalActive = modalContainer && !modalContainer.classList.contains('hidden');

        // Detect if sliding panel view is active
        const activePanels = Array.from(document.querySelectorAll('.view-panel')).filter(panel => {
            const style = window.getComputedStyle(panel);
            return style.display !== 'none' && style.visibility !== 'hidden';
        });
        const activePanel = activePanels[0];

        // Determine scope container
        let scopeContainer = document;
        if (isModalActive) {
            scopeContainer = modalContainer;
        } else if (activePanel) {
            scopeContainer = activePanel;
        }

        const elements = Array.from(scopeContainer.querySelectorAll(query));

        // Filter for truly visible, non-disabled elements
        const visible = elements.filter(el => {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0;
            const isNotHidden = window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).visibility !== 'hidden';
            return isVisible && isNotHidden && !el.disabled;
        });

        // Sort elements by their spatial (physical) position on screen
        // Top-to-bottom, then Left-to-right
        visible.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            if (Math.abs(rectA.top - rectB.top) < 15) { // Same horizontal row
                return rectA.left - rectB.left;
            }
            return rectA.top - rectB.top;
        });

        return visible;
    }

    findBackButton() {
        // Standard back button IDs or classes in order of preference
        const selectors = [
            '#career-back',
            '#btn-back-to-job',
            '.btn-back',
            '.modal-close',
            '#modal-close',
            '#btn-close-modal'
        ];
        
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.getBoundingClientRect().width > 0) {
                return el;
            }
        }
        return null;
    }
}

const keyboardNavigation = new KeyboardNavigation();
export default keyboardNavigation;
