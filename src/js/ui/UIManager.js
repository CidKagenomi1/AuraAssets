/**
 * UIManager.js - Core UI Management
 * Handles modals, toasts, and common UI interactions
 */

import timeManager from '../game/TimeManager.js';
import gameState from '../game/GameState.js';

class UIManager {
    constructor() {
        this.modalContainer = null;
        this.toastContainer = null;
    }

    init() {
        this.modalContainer = document.getElementById('modal-container');
        this.toastContainer = document.getElementById('toast-container');

        // Close modal on backdrop click
        const backdrop = this.modalContainer?.querySelector('.modal-backdrop');
        backdrop?.addEventListener('click', () => this.closeModal());

        setTimeout(() => this.updateNotificationBadge(), 100);
    }

    updateNotificationBadge() {
        const count = gameState.get('unreadNotificationsCount') || 0;
        const bellBtn = document.getElementById('btn-notifications');
        if (bellBtn) {
            if (bellBtn.style.position !== 'relative') {
                bellBtn.style.position = 'relative';
            }
            let badge = document.getElementById('notif-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.id = 'notif-badge';
                badge.style.cssText = `
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ef4444;
                    color: white;
                    font-size: 0.7rem;
                    font-weight: 800;
                    padding: 2px 6px;
                    border-radius: 10px;
                    border: 2px solid var(--bg-root);
                    line-height: 1;
                `;
                bellBtn.appendChild(badge);
            }
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // ========================================
    // MODAL METHODS
    // ========================================

    openModal(content) {
        if (!this.modalContainer) return;

        // Auto pause game progression during transactions / modal screens
        if (timeManager) {
            timeManager.stop();
        }

        const modalContent = document.getElementById('modal-content');
        modalContent.innerHTML = content;

        this.modalContainer.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Add close button listener
        const closeBtn = modalContent.querySelector('.modal-close');
        closeBtn?.addEventListener('click', () => this.closeModal());
    }

    closeModal() {
        if (!this.modalContainer) return;

        this.modalContainer.classList.add('hidden');
        document.body.style.overflow = '';

        // Auto resume game progression if speed wasn't manually paused (0)
        if (timeManager && gameState) {
            const speed = gameState.get('gameTime.speed');
            if (speed !== 0) {
                timeManager.start();
            }
        }

        // Dispatch custom event to notify view manager of modal closure
        document.dispatchEvent(new CustomEvent('modalClosed'));
    }

    /**
     * Show modal with options (used by Settings/Notifications)
     */
    showModal(options) {
        const { title = '', content = '', onShow = null } = options;

        const modalHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        `;

        this.openModal(modalHTML);

        // Call onShow callback after modal is rendered
        if (onShow) {
            setTimeout(() => onShow(), 50);
        }
    }

    /**
     * Show a confirmation modal
     */
    confirm(options) {
        return new Promise((resolve) => {
            const {
                title = 'Konfirmasi',
                message,
                icon = '❓',
                confirmText = 'Ya',
                cancelText = 'Batal',
                confirmClass = 'btn-primary',
                danger = false
            } = options;

            const content = `
        <div class="modal-header">
          <h3 class="modal-title">${icon} ${title}</h3>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <p style="text-align: center; color: var(--text-secondary);">${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-cancel">${cancelText}</button>
          <button class="btn ${danger ? 'btn-danger' : confirmClass} btn-confirm">${confirmText}</button>
        </div>
      `;

            this.openModal(content);

            const modalContent = document.getElementById('modal-content');

            modalContent.querySelector('.btn-cancel').onclick = () => {
                this.closeModal();
                resolve(false);
            };

            modalContent.querySelector('.btn-confirm').onclick = () => {
                this.closeModal();
                resolve(true);
            };
        });
    }

    /**
     * Show input modal
     */
    prompt(options) {
        return new Promise((resolve) => {
            const {
                title = 'Input',
                message = '',
                icon = '✏️',
                placeholder = '',
                inputType = 'text',
                defaultValue = '',
                confirmText = 'OK',
                cancelText = 'Batal'
            } = options;

            const content = `
        <div class="modal-header">
          <h3 class="modal-title">${icon} ${title}</h3>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          ${message ? `<p style="color: var(--text-secondary); margin-bottom: var(--space-md);">${message}</p>` : ''}
          <div class="form-group">
            <input 
              type="${inputType}" 
              class="form-input input-lg" 
              id="prompt-input"
              placeholder="${placeholder}"
              value="${defaultValue}"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-cancel">${cancelText}</button>
          <button class="btn btn-primary btn-confirm">${confirmText}</button>
        </div>
      `;

            this.openModal(content);

            const modalContent = document.getElementById('modal-content');
            const input = modalContent.querySelector('#prompt-input');

            // Focus input
            setTimeout(() => input.focus(), 100);

            // Enter key submits
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    this.closeModal();
                    resolve(input.value);
                }
            };

            modalContent.querySelector('.btn-cancel').onclick = () => {
                this.closeModal();
                resolve(null);
            };

            modalContent.querySelector('.btn-confirm').onclick = () => {
                this.closeModal();
                resolve(input.value);
            };
        });
    }

    /**
     * Show money input modal
     */
    promptMoney(options) {
        return new Promise((resolve) => {
            const {
                title = 'Masukkan Jumlah',
                icon = '💰',
                maxAmount = Infinity,
                confirmText = 'OK'
            } = options;

            const presets = [
                { label: '1M', value: 1000000 },
                { label: '10M', value: 10000000 },
                { label: '100M', value: 100000000 },
                { label: '1B', value: 1000000000 }
            ];

            const content = `
        <div class="modal-header">
          <h3 class="modal-title">${icon} ${title}</h3>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="input-prefix" style="margin-bottom: var(--space-md);">
            <span class="prefix">$</span>
            <input 
              type="number" 
              class="form-input input-money" 
              id="money-input"
              placeholder="0"
              min="0"
              max="${maxAmount}"
            >
          </div>
          <div style="display: flex; gap: var(--space-sm); flex-wrap: wrap;">
            ${presets.map(p => `
              <button class="btn btn-sm btn-secondary preset-btn" data-value="${p.value}">
                ${p.label}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-cancel">Batal</button>
          <button class="btn btn-gold btn-confirm">${confirmText}</button>
        </div>
      `;

            this.openModal(content);

            const modalContent = document.getElementById('modal-content');
            const input = modalContent.querySelector('#money-input');

            // Preset buttons - ADD to current value (not replace)
            modalContent.querySelectorAll('.preset-btn').forEach(btn => {
                btn.onclick = () => {
                    const currentValue = parseInt(input.value) || 0;
                    const addValue = parseInt(btn.dataset.value);
                    input.value = currentValue + addValue;
                };
            });

            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    const value = parseInt(input.value) || 0;
                    this.closeModal();
                    resolve(value);
                }
            };

            modalContent.querySelector('.btn-cancel').onclick = () => {
                this.closeModal();
                resolve(null);
            };

            modalContent.querySelector('.btn-confirm').onclick = () => {
                const value = parseInt(input.value) || 0;
                this.closeModal();
                resolve(value);
            };

            setTimeout(() => input.focus(), 100);
        });
    }

    // ========================================
    // TOAST METHODS
    // ========================================

    toast(options) {
        const {
            type = 'info',
            title,
            message,
            duration = 4000,
            icon = null
        } = typeof options === 'string' ? { message: options } : options;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const resolvedIcon = icon || icons[type] || icons.info;

        // Save to gameState log
        const newNotif = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            type,
            title: title || type.toUpperCase(),
            message,
            icon: resolvedIcon,
            date: `${gameState.get('gameTime.day')}-${gameState.get('gameTime.month')}-${gameState.get('gameTime.year')}`,
            unread: true
        };

        const currentNotifs = gameState.get('notifications') || [];
        gameState.set('notifications', [newNotif, ...currentNotifs].slice(0, 50));

        // Increment unread count
        const count = (gameState.get('unreadNotificationsCount') || 0) + 1;
        gameState.set('unreadNotificationsCount', count);
        this.updateNotificationBadge();

        // Check if popup toasts are enabled in settings
        const isNotifEnabled = gameState.get('settings.notificationsEnabled') !== false;
        if (!isNotifEnabled) {
            return null;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
      <span class="toast-icon">${resolvedIcon}</span>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">✕</button>
    `;

        this.toastContainer?.appendChild(toast);

        // Close button
        toast.querySelector('.toast-close').onclick = () => this.removeToast(toast);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => this.removeToast(toast), duration);
        }

        return toast;
    }

    removeToast(toast) {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }

    success(message, title = null) {
        return this.toast({ type: 'success', message, title });
    }

    error(message, title = 'Error') {
        return this.toast({ type: 'error', message, title });
    }

    warning(message, title = 'Peringatan') {
        return this.toast({ type: 'warning', message, title });
    }

    info(message, title = null) {
        return this.toast({ type: 'info', message, title });
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Format number with animation
     */
    animateNumber(element, endValue, duration = 500) {
        const startValue = parseInt(element.textContent.replace(/\D/g, '')) || 0;
        const startTime = performance.now();

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(startValue + (endValue - startValue) * easeProgress);

            element.textContent = this.formatNumber(currentValue);

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };

        requestAnimationFrame(update);
    }

    formatNumber(num) {
        return new Intl.NumberFormat('id-ID').format(num);
    }

    /**
     * Set up a text input element to automatically format with thousands separator as the user types.
     */
    setupNumericInput(inputElement) {
        if (!inputElement) return;
        
        // Ensure input type is text to support formatting separators
        if (inputElement.type === 'number') {
            inputElement.type = 'text';
            inputElement.inputMode = 'numeric';
        }

        // Add formatter listener
        inputElement.addEventListener('input', () => {
            let cursorPosition = inputElement.selectionStart;
            let originalLength = inputElement.value.length;

            // Remove all non-digits
            let rawValue = inputElement.value.replace(/[^0-9]/g, '');
            if (rawValue === '') {
                inputElement.value = '';
                return;
            }

            let num = parseInt(rawValue, 10);
            if (isNaN(num)) {
                inputElement.value = '';
                return;
            }

            // Format with commas (e.g. 1,000,000)
            let formatted = num.toLocaleString('en-US');
            inputElement.value = formatted;

            // Adjust cursor position to handle added/removed commas
            let newLength = formatted.length;
            let newCursorPosition = cursorPosition + (newLength - originalLength);
            inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
        });

        // Attach helper method to element for reading raw value
        inputElement.getNumericValue = () => {
            let raw = inputElement.value.replace(/[^0-9]/g, '');
            let val = parseInt(raw, 10);
            return isNaN(val) ? 0 : val;
        };
    }

    /**
     * Create whale splash animation
     */
    showWhaleSplash() {
        const splash = document.createElement('div');
        splash.className = 'whale-splash';
        splash.innerHTML = '<span class="whale-emoji">🐋</span>';
        splash.style.left = Math.random() * window.innerWidth + 'px';
        splash.style.top = Math.random() * window.innerHeight * 0.5 + 'px';
        document.body.appendChild(splash);

        setTimeout(() => splash.remove(), 1000);
    }

    /**
     * Show pump effect
     */
    showPumpEffect(element) {
        element.classList.add('pump-effect');
        setTimeout(() => element.classList.remove('pump-effect'), 500);
    }

    /**
     * Show dump effect
     */
    showDumpEffect(element) {
        element.classList.add('dump-effect');
        setTimeout(() => element.classList.remove('dump-effect'), 500);
    }
}

export const ui = new UIManager();
export default ui;
