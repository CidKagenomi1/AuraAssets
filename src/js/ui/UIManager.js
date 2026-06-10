/**
 * UIManager.js - Core UI Management
 * Handles modals, toasts, and common UI interactions
 */

import timeManager from '../core/TimeManager.js';
import gameState from '../core/GameState.js';

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

        try {
            import('./AuraSound.js').then(m => m.default.playClick());
        } catch (e) {}

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
                cancelText = 'Batal',
                isNumeric = false  // set true to show numeric helpers
            } = options;

            const numericExtras = (inputType === 'number' || isNumeric) ? `
              <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:0.6rem; align-items:center;">
                <span style="font-size:0.7rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;">Tambah:</span>
                <button type="button" class="btn btn-sm btn-secondary zero-append" data-zeros="0" style="padding:3px 10px;font-size:0.8rem;font-weight:800;height:auto;">+0</button>
                <button type="button" class="btn btn-sm btn-secondary zero-append" data-zeros="00" style="padding:3px 10px;font-size:0.8rem;font-weight:800;height:auto;">+00</button>
                <button type="button" class="btn btn-sm btn-secondary zero-append" data-zeros="000" style="padding:3px 10px;font-size:0.8rem;font-weight:800;height:auto;">+000</button>
              </div>` : '';

            const content = `
        <div class="modal-header">
          <h3 class="modal-title">${icon} ${title}</h3>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          ${message ? `<p style="color: var(--text-secondary); margin-bottom: var(--space-md);">${message}</p>` : ''}
          <div class="form-group" style="margin-bottom:0;">
            <input 
              type="text"
              inputmode="${inputType === 'number' || isNumeric ? 'decimal' : 'text'}"
              class="form-input input-lg" 
              id="prompt-input"
              placeholder="${placeholder}"
              value="${defaultValue}"
              autocomplete="off"
            >
            ${numericExtras}
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

            // Live comma formatting for numeric inputs
            if (inputType === 'number' || isNumeric) {
                this._setupLiveCommaFormat(input);
            }

            // Focus input
            setTimeout(() => input.focus(), 100);

            // Zero-append buttons (+0, +00, +000)
            modalContent.querySelectorAll('.zero-append').forEach(btn => {
                btn.onclick = () => {
                    const raw = this._getRawNumericValue(input.value);
                    const newVal = raw + btn.dataset.zeros;
                    input.value = this._formatWithCommas(newVal);
                    input.focus();
                };
            });

            // Enter key submits
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    const value = (inputType === 'number' || isNumeric)
                        ? this._getRawNumericValue(input.value)
                        : input.value;
                    this.closeModal();
                    resolve(value);
                }
            };

            modalContent.querySelector('.btn-cancel').onclick = () => {
                this.closeModal();
                resolve(null);
            };

            modalContent.querySelector('.btn-confirm').onclick = () => {
                const value = (inputType === 'number' || isNumeric)
                    ? this._getRawNumericValue(input.value)
                    : input.value;
                this.closeModal();
                resolve(value);
            };
        });
    }

    /**
     * Show money input modal — with comma formatting, MAX, copy, and zero-append buttons
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

          <!-- Main Input Row -->
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:0.75rem;">
            <div class="input-prefix" style="flex:1; margin-bottom:0;">
              <span class="prefix">$</span>
              <input 
                type="text"
                inputmode="decimal"
                class="form-input input-money" 
                id="money-input"
                placeholder="0"
                autocomplete="off"
              >
            </div>
            <button type="button" id="money-copy-btn" title="Salin nilai" style="
              flex-shrink:0; padding:0 12px; height:44px; border-radius:var(--radius-md);
              border:1px solid var(--border-color); background:rgba(255,255,255,0.04);
              color:var(--text-main); font-size:1rem; cursor:pointer; transition:all 0.2s;
            ">📋</button>
            ${isFinite(maxAmount) ? `
            <button type="button" id="money-max-btn" style="
              flex-shrink:0; padding:0 10px; height:44px; border-radius:var(--radius-md);
              border:1px solid rgba(16,185,129,0.3); background:rgba(16,185,129,0.08);
              color:var(--accent-primary); font-weight:800; font-size:0.78rem; cursor:pointer; transition:all 0.2s;
            ">MAX</button>` : ''}
          </div>

          <!-- Zero-Append Shortcuts -->
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-bottom:0.75rem;">
            <span style="font-size:0.68rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Tambah nol:</span>
            <button type="button" class="zero-append" data-zeros="0" style="
              padding:4px 12px;border-radius:var(--radius-sm);border:1px solid var(--border-color);
              background:rgba(255,255,255,0.05);color:var(--text-main);font-size:0.82rem;
              font-weight:800;cursor:pointer;transition:all 0.15s;
              font-family:monospace;letter-spacing:0.05em;
            ">+0</button>
            <button type="button" class="zero-append" data-zeros="00" style="
              padding:4px 12px;border-radius:var(--radius-sm);border:1px solid var(--border-color);
              background:rgba(255,255,255,0.05);color:var(--text-main);font-size:0.82rem;
              font-weight:800;cursor:pointer;transition:all 0.15s;
              font-family:monospace;letter-spacing:0.05em;
            ">+00</button>
            <button type="button" class="zero-append" data-zeros="000" style="
              padding:4px 12px;border-radius:var(--radius-sm);border:1px solid var(--border-color);
              background:rgba(255,255,255,0.05);color:var(--text-main);font-size:0.82rem;
              font-weight:800;cursor:pointer;transition:all 0.15s;
              font-family:monospace;letter-spacing:0.05em;
            ">+000</button>
          </div>

          <!-- Preset Quick-Add Buttons -->
          <div style="display: flex; gap: var(--space-sm); flex-wrap: wrap;">
            ${presets.map(p => `
              <button class="btn btn-sm btn-secondary preset-btn" data-value="${p.value}" style="flex:1;min-width:60px;font-weight:800;">
                +${p.label}
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

            // Live comma formatting
            this._setupLiveCommaFormat(input);

            // MAX button
            const maxBtn = modalContent.querySelector('#money-max-btn');
            if (maxBtn && isFinite(maxAmount)) {
                maxBtn.onclick = () => {
                    input.value = this._formatWithCommas(String(Math.floor(maxAmount)));
                    input.focus();
                };
            }

            // Copy button
            const copyBtn = modalContent.querySelector('#money-copy-btn');
            if (copyBtn) {
                copyBtn.onclick = () => {
                    const val = this._getRawNumericValue(input.value);
                    navigator.clipboard?.writeText(val).then(() => {
                        copyBtn.textContent = '✅';
                        setTimeout(() => copyBtn.textContent = '📋', 1500);
                    });
                };
            }

            // Zero-append buttons
            modalContent.querySelectorAll('.zero-append').forEach(btn => {
                btn.onclick = () => {
                    const raw = this._getRawNumericValue(input.value);
                    const newRaw = raw + btn.dataset.zeros;
                    input.value = this._formatWithCommas(newRaw);
                    input.focus();
                    // Hover feedback
                    btn.style.background = 'rgba(16,185,129,0.15)';
                    btn.style.borderColor = 'rgba(16,185,129,0.4)';
                    setTimeout(() => {
                        btn.style.background = '';
                        btn.style.borderColor = '';
                    }, 200);
                };
            });

            // Preset buttons — ADD to current value
            modalContent.querySelectorAll('.preset-btn').forEach(btn => {
                btn.onclick = () => {
                    const currentRaw = parseInt(this._getRawNumericValue(input.value)) || 0;
                    const addValue = parseInt(btn.dataset.value);
                    const newVal = currentRaw + addValue;
                    const capped = isFinite(maxAmount) ? Math.min(newVal, maxAmount) : newVal;
                    input.value = this._formatWithCommas(String(capped));
                    input.focus();
                };
            });

            // Enter submits
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    const value = parseInt(this._getRawNumericValue(input.value)) || 0;
                    this.closeModal();
                    resolve(value);
                }
            };

            modalContent.querySelector('.btn-cancel').onclick = () => {
                this.closeModal();
                resolve(null);
            };

            modalContent.querySelector('.btn-confirm').onclick = () => {
                const value = parseInt(this._getRawNumericValue(input.value)) || 0;
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
            icon = null,
            deviceNotify = false
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

        try {
            if (type === 'success') {
                import('./AuraSound.js').then(m => m.default.playSuccessAlert());
            } else if (type === 'warning') {
                import('./AuraSound.js').then(m => m.default.playWarningAlert());
            } else if (type === 'error') {
                import('./AuraSound.js').then(m => m.default.playErrorAlert());
            } else {
                import('./AuraSound.js').then(m => m.default.playInfoAlert());
            }
        } catch (e) {}

        // Handle Device Notification if enabled
        if (deviceNotify && gameState.get('settings.deviceNotificationsEnabled') && "Notification" in window) {
            if (Notification.permission === "granted") {
                try {
                    new Notification(title || type.toUpperCase(), {
                        body: message,
                        icon: '/favicon.ico'
                    });
                } catch (err) {
                    console.error("Device Notification failed:", err);
                }
            }
        }

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

    success(message, title = null, options = {}) {
        return this.toast({ type: 'success', message, title, ...options });
    }

    error(message, title = 'Error', options = {}) {
        return this.toast({ type: 'error', message, title, ...options });
    }

    warning(message, title = 'Peringatan', options = {}) {
        return this.toast({ type: 'warning', message, title, ...options });
    }

    info(message, title = null, options = {}) {
        return this.toast({ type: 'info', message, title, ...options });
    }

    // ========================================
    // NUMERIC INPUT HELPERS
    // ========================================

    /**
     * Apply live comma formatting to a text input.
     * Keeps cursor position stable while user types.
     */
    _setupLiveCommaFormat(input) {
        input.addEventListener('input', () => {
            const pos = input.selectionStart;
            const prevLen = input.value.length;

            // Split by first decimal point
            let parts = input.value.split('.');
            let integerPart = parts[0].replace(/[^0-9]/g, '');
            let decimalPart = parts.slice(1).join('').replace(/[^0-9]/g, '');

            let formatted = '';
            if (integerPart !== '') {
                formatted = Number(integerPart).toLocaleString('en-US');
            } else if (parts.length > 1) {
                formatted = '0';
            }
            if (parts.length > 1) {
                formatted += '.' + decimalPart;
            }
            input.value = formatted;

            // Adjust cursor: account for added/removed commas
            const newLen = formatted.length;
            const newPos = Math.max(0, pos + (newLen - prevLen));
            try { input.setSelectionRange(newPos, newPos); } catch(e){}
        });
    }

    /**
     * Returns the raw digit string (no commas, no currency symbols)
     * from a formatted input value.
     */
    _getRawNumericValue(val) {
        return String(val || '').replace(/,/g, '');
    }

    /**
     * Format a numeric string with thousand commas.
     */
    _formatWithCommas(val) {
        const raw = String(val).replace(/[^0-9.]/g, '');
        if (!raw) return '';
        const parts = raw.split('.');
        let integerPart = parts[0];
        let decimalPart = parts[1];
        let formatted = integerPart ? Number(integerPart).toLocaleString('en-US') : '0';
        if (parts.length > 1) {
            formatted += '.' + decimalPart;
        }
        return formatted;
    }

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
     * Optionally adds zero append, copy, max and preset quick-addition helper buttons.
     */
    setupNumericInput(inputElement, options = {}) {
        if (!inputElement) return;

        const {
            isDecimal = false,
            showZeroAppend = true,
            showMax = false,
            maxAmount = null // number or function
        } = options;

        // Ensure input type is text to support formatting separators
        if (inputElement.type === 'number') {
            inputElement.type = 'text';
            inputElement.inputMode = isDecimal ? 'decimal' : 'numeric';
        }

        // Formatter function
        const formatValue = (val) => {
            let clean = val;
            if (isDecimal) {
                clean = clean.replace(/[^0-9.]/g, '');
                const parts = clean.split('.');
                if (parts.length > 2) {
                    clean = parts[0] + '.' + parts.slice(1).join('');
                }
            } else {
                clean = clean.replace(/[^0-9]/g, '');
            }

            if (clean === '') return '';

            const parts = clean.split('.');
            let integerPart = parts[0];
            let decimalPart = parts[1];

            let formatted = integerPart ? parseInt(integerPart, 10).toLocaleString('en-US') : '0';
            if (parts.length > 1) {
                formatted += '.' + decimalPart;
            }
            return formatted;
        };

        // Format initial value
        if (inputElement.value) {
            inputElement.value = formatValue(inputElement.value);
        }

        // Add formatter listener
        const onInput = () => {
            let cursorPosition = inputElement.selectionStart;
            let originalLength = inputElement.value.length;

            let formatted = formatValue(inputElement.value);
            inputElement.value = formatted;

            let newLength = formatted.length;
            let newCursorPosition = cursorPosition + (newLength - originalLength);
            try {
                inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
            } catch(e) {}
        };

        inputElement.removeEventListener('input', inputElement._numericListener);
        inputElement._numericListener = onInput;
        inputElement.addEventListener('input', onInput);

        // Attach helper method to element for reading raw value
        inputElement.getNumericValue = () => {
            let raw = inputElement.value.replace(/,/g, '');
            let val = isDecimal ? parseFloat(raw) : parseInt(raw, 10);
            return isNaN(val) ? 0 : val;
        };

        // Setup helpers
        const helperClass = `numeric-helpers-for-${inputElement.id || 'anonymous'}`;
        const existingHelper = inputElement.parentNode.querySelector(`.${helperClass}`);
        if (existingHelper) {
            existingHelper.remove();
        }

        const helperContainer = document.createElement('div');
        helperContainer.className = helperClass;
        helperContainer.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; margin-top: 0.5rem; align-items: center; width: 100%;';

        let innerHTML = '';

        if (showZeroAppend) {
            innerHTML += `
                <button type="button" class="zero-append-btn" data-zeros="0" style="padding: 4px 10px; font-size: 0.72rem; font-weight: 800; height: 26px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); cursor: pointer; border-radius: var(--radius-sm); transition: all 0.2s;">+0</button>
                <button type="button" class="zero-append-btn" data-zeros="00" style="padding: 4px 10px; font-size: 0.72rem; font-weight: 800; height: 26px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); cursor: pointer; border-radius: var(--radius-sm); transition: all 0.2s;">+00</button>
                <button type="button" class="zero-append-btn" data-zeros="000" style="padding: 4px 10px; font-size: 0.72rem; font-weight: 800; height: 26px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); cursor: pointer; border-radius: var(--radius-sm); transition: all 0.2s;">+000</button>
            `;
        }

        if (showMax && maxAmount !== null) {
            innerHTML += `
                <button type="button" class="max-input-btn" style="padding: 4px 10px; font-size: 0.72rem; font-weight: 800; height: 26px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3); color: var(--accent-primary); cursor: pointer; border-radius: var(--radius-sm); transition: all 0.2s;">MAX</button>
            `;
        }

        helperContainer.innerHTML = innerHTML;

        // Insert after input element
        if (inputElement.nextSibling) {
            inputElement.parentNode.insertBefore(helperContainer, inputElement.nextSibling);
        } else {
            inputElement.parentNode.appendChild(helperContainer);
        }

        // Bind events
        helperContainer.querySelectorAll('.zero-append-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                let currentVal = inputElement.value.replace(/,/g, '');
                let newVal = currentVal + btn.dataset.zeros;
                inputElement.value = formatValue(newVal);
                inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                inputElement.focus();
            };
        });

        const maxBtn = helperContainer.querySelector('.max-input-btn');
        if (maxBtn) {
            maxBtn.onclick = (e) => {
                e.preventDefault();
                let max = typeof maxAmount === 'function' ? maxAmount() : maxAmount;
                if (max !== null && isFinite(max)) {
                    inputElement.value = formatValue(String(max));
                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                    inputElement.focus();
                }
            };
        }
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
