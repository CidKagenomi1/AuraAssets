/**
 * HomeScreen.js - Main Dashboard UI (v2)
 * - No Chart.js dependency
 * - Market Pulse widget (text-based)
 * - Role-aware: milestones, earn panel visibility
 * - Animations via Animations.js
 */

import gameState from '../game/GameState.js';
import globalEconomy from '../game/GlobalEconomy.js';
import financeManager from '../finance/FinanceManager.js';
import earnManager from '../game/EarnManager.js';
import roleManager from '../game/RoleManager.js';
import timeManager from '../game/TimeManager.js';
import ui from './UIManager.js';
import RoleModules from './RoleModules.js';
import { countUp, pulseElement, staggerFadeUp, createFloatingText } from './Animations.js';

class HomeScreen {
    constructor() {
        this._lastBalance = 0;
    }

    init() {
        this.bindEvents();
        this.updateBalanceCard();
        this.updateStatusBar();
        RoleModules.updateAll();
        this.updateRecentTransactions();

        // Initialize dashboard main chart
        this.initDashboardChart();

        // Listen for state changes
        gameState.on('change', () => {
            this.updateBalanceCard();
            this.updateDashboardChart();
        });
        gameState.on('economyUpdate', () => RoleModules.InvestorModule.renderMarketPulse());
        gameState.on('earnTick', (data) => RoleModules.BusinessModule.updateEarnUI(data));
        gameState.on('earnClaim', () => {
            this.updateBalanceCard();
            this.updateDashboardChart();
        });
        gameState.on('earnUpgrade', () => RoleModules.BusinessModule.updateEarnUI());
        gameState.on('dayPass', () => this.updateStatusBar());
        gameState.on('monthPass', () => {
            this.updateStatusBar();
            RoleModules.updateAll();
            this.updateRecentTransactions();
            this.updateDashboardChart();
        });
        gameState.on('roleChange', () => {
            roleManager.applyVisibility();
            this.updateBalanceCard();
            RoleModules.updateAll();
            this.updateDashboardChart();
        });
        gameState.on('transaction', () => {
            this.updateRecentTransactions();
            this.updateDashboardChart();
        });

        // Stagger fade-up cards on load
        setTimeout(() => {
            staggerFadeUp(document.querySelectorAll('.menu-card:not(.hidden)'), 50);
        }, 100);
    }

    // ==========================================
    // STATUS BAR
    // ==========================================

    updateStatusBar() {
        const day = gameState.get('gameTime.day') || 1;
        const month = gameState.get('gameTime.month') || 1;
        const year = gameState.get('gameTime.year') || 2026;
        const speed = gameState.get('gameTime.speed') || 1;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        const dateEl = document.getElementById('game-date');
        if (dateEl) dateEl.textContent = `${day} ${months[month - 1]} ${year}`;

        const speedEl = document.getElementById('game-speed');
        if (speedEl) speedEl.textContent = `${speed}x`;
    }

    // ==========================================
    // BALANCE CARD
    // ==========================================

    updateBalanceCard() {
        const balance = gameState.getBalance();
        const balanceEl = document.getElementById('balance-value');
        const sidebarBalance = document.getElementById('sidebar-balance-value');
        const sidebarName = document.getElementById('sidebar-player-name');
        const hideBalance = gameState.get('settings.hideBalance');
        const playerName = gameState.get('player.name') || 'Pemain';
        if (sidebarName) sidebarName.textContent = playerName;

        // Balance Display Logic
        const displayBalance = hideBalance ? '*******' : this.formatCompact(balance);
        const sidebarDisplay = hideBalance ? '*******' : ('$ ' + financeManager.formatCurrency(balance, true));

        if (balanceEl) {
            // Add toggle button if not exists
            if (!document.getElementById('btn-toggle-balance')) {
                const toggleBtn = document.createElement('button');
                toggleBtn.id = 'btn-toggle-balance';
                toggleBtn.className = 'btn-icon-sm';
                toggleBtn.style.marginLeft = '0.5rem';
                toggleBtn.style.background = 'none';
                toggleBtn.style.border = 'none';
                toggleBtn.style.cursor = 'pointer';
                toggleBtn.style.fontSize = '1.2rem';
                toggleBtn.innerHTML = hideBalance ? '👁️' : '🕶️';
                toggleBtn.onclick = () => this.toggleBalanceVisibility();
                balanceEl.parentElement.appendChild(toggleBtn);
            } else {
                document.getElementById('btn-toggle-balance').innerHTML = hideBalance ? '👁️' : '🕶️';
            }

            // Animate count-up if balance changed and NOT hidden
            const prev = this._lastBalance;
            if (balance !== prev && !hideBalance) {
                countUp(balanceEl, prev, balance, 500, (n) => this.formatCompact(n));
                pulseElement(balanceEl.closest('.hero-balance-card') || balanceEl);
            } else if (hideBalance) {
                balanceEl.textContent = '*******';
            } else {
                balanceEl.textContent = displayBalance;
            }
            this._lastBalance = balance;
        }

        if (sidebarBalance) {
            sidebarBalance.textContent = sidebarDisplay;
            // Add click to toggle on sidebar too if needed, but button is clearer
            sidebarBalance.style.cursor = 'pointer';
            sidebarBalance.title = 'Klik untuk sembunyikan/tampilkan';
            if (!sidebarBalance.onclick) {
                sidebarBalance.onclick = () => this.toggleBalanceVisibility();
            }
        }

        // Monthly change indicator
        const monthlyChange = financeManager.getMonthlyChange?.() ?? 0;
        const changeIcon = document.getElementById('balance-change-icon');
        const changePercent = document.getElementById('balance-change-percent');

        if (changeIcon && changePercent) {
            const isPositive = monthlyChange >= 0;
            changeIcon.textContent = isPositive ? '▲' : '▼';
            changeIcon.className = isPositive ? 'text-positive' : 'text-negative';
            changePercent.className = isPositive ? 'text-positive' : 'text-negative';
            changePercent.style.fontWeight = '700';
            changePercent.textContent = Math.abs(monthlyChange).toFixed(1) + '%';
        }

        this.updateEarnUI();
    }

    formatCompact(num) {
        if (!isFinite(num) || num >= 1e30) return '∞';
        if (num >= 1e15) return (num / 1e15).toFixed(1) + 'Qa';
        if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        return new Intl.NumberFormat('id-ID').format(Math.round(num));
    }

    // Role-specific rendering delegated to RoleModules

    // ==========================================
    // RECENT TRANSACTIONS MINI
    // ==========================================

    updateRecentTransactions() {
        const el = document.getElementById('recent-transactions-mini');
        if (!el) return;

        const transactions = financeManager.getRecentTransactions?.(5) || [];

        if (!transactions.length) {
            el.innerHTML = `<div style="text-align:center;padding:1rem;color:var(--text-dim);font-size:0.85rem;">Belum ada transaksi</div>`;
            return;
        }

        el.innerHTML = transactions.map(t => {
            const isPositive = t.amount >= 0;
            const iconSvg = isPositive 
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--accent-primary)"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>'
                : '<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--accent-danger)"><path d="M15 10H9V7.11L5.11 11 9 14.89V12h6v2.89L18.89 11 15 7.11V10zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>';
            
            return `
                <div style="
                    display:flex;align-items:center;gap:0.75rem;
                    padding:0.6rem 0.75rem;
                    background:rgba(255,255,255,0.02);
                    border-radius:var(--radius-sm);
                    border:1px solid var(--border-color);
                ">
                    <span style="display:flex;align-items:center;justify-content:center;">${iconSvg}</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.8rem;font-weight:600;color:var(--text-main);
                             white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${t.description || t.category}
                        </div>
                    </div>
                    <div style="font-size:0.8rem;font-weight:700;
                         color:${isPositive ? 'var(--accent-primary)' : 'var(--accent-danger)'};
                         white-space:nowrap;">
                        ${isPositive ? '+' : ''}$ ${this.formatCompact(Math.abs(t.amount))}
                    </div>
                </div>
            `;
        }).join('');
    }

    updateEarnUI(data) {
        RoleModules.BusinessModule.updateEarnUI(data);
    }

    handleClaim() {
        const result = earnManager.claim();
        if (result.success) {
            const btn = document.getElementById('btn-claim');
            if (btn) createFloatingText(btn, `+$ ${financeManager.formatCurrency(result.amount)}`, 'var(--accent-primary)');
            ui.success(`Claim berhasil: +$ ${financeManager.formatCurrency(result.amount)}`);
        } else {
            ui.error(result.message);
        }
    }

    handleUpgrade() {
        const result = earnManager.upgrade();
        if (result.success) {
            const btn = document.getElementById('btn-upgrade');
            if (btn) createFloatingText(btn, `-$ ${financeManager.formatCurrency(result.cost)}`, 'var(--accent-danger)');
            ui.success(`Upgrade Berhasil! Level ${result.level}`);
            this.updateBalanceCard();
        } else {
            ui.error(result.message);
        }
    }

    toggleBalanceVisibility() {
        const current = gameState.get('settings.hideBalance');
        gameState.set('settings.hideBalance', !current);
        this.updateBalanceCard();
        
        // Visual feedback
        ui.success(!current ? 'Saldo disembunyikan' : 'Saldo ditampilkan');
    }

    // ==========================================
    // QUICK ACTIONS
    // ==========================================

    bindEvents() {
        // Earn buttons
        document.getElementById('btn-claim')?.addEventListener('click', () => this.handleClaim());
        document.getElementById('btn-upgrade')?.addEventListener('click', () => this.handleUpgrade());

        // Settings & Notifications
        document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettings());
        document.getElementById('btn-notifications')?.addEventListener('click', () => this.showNotifications());

        // Fear & Greed widget click navigation to trading-signal
        const widget = document.getElementById('market-pulse-widget');
        if (widget) {
            widget.addEventListener('click', () => {
                import('./ViewManager.js').then(m => m.default.switchView('trading-signal'));
            });
            widget.addEventListener('mouseenter', () => {
                widget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                widget.style.background = 'rgba(255, 255, 255, 0.02)';
            });
            widget.addEventListener('mouseleave', () => {
                widget.style.borderColor = 'var(--border-color)';
                widget.style.background = 'rgba(0, 0, 0, 0.25)';
            });
        }

        // Speed Control Cycling Button
        const speedEl = document.getElementById('game-speed');
        if (speedEl) {
            const parent = speedEl.parentElement;
            parent.style.cursor = 'pointer';
            parent.title = 'Klik untuk mempercepat / pause jalannya waktu';
            parent.style.transition = 'all 0.2s';
            parent.addEventListener('mouseenter', () => {
                parent.style.opacity = '0.8';
                parent.style.transform = 'scale(1.05)';
            });
            parent.addEventListener('mouseleave', () => {
                parent.style.opacity = '1';
                parent.style.transform = 'scale(1)';
            });
            parent.addEventListener('click', () => {
                let speed = gameState.get('gameTime.speed') || 1;
                if (speed === 1) speed = 2;
                else if (speed === 2) speed = 5;
                else if (speed === 5) speed = 10;
                else if (speed === 10) speed = 0; // Pause
                else speed = 1; // Unpause back to 1x

                timeManager.setSpeed(speed);
                this.updateStatusBar();

                if (speed === 0) {
                    ui.info('⏸️ Waktu DIHENTIKAN (PAUSE). Transaksi bulanan ditangguhkan.');
                } else {
                    ui.success(`⚡ Kecepatan simulasi diset ke ${speed}x!`);
                }
            });
        }

        // Quick action cards
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleQuickAction(btn.dataset.action));
        });

        // Nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                import('./ViewManager.js').then(m => m.default.switchView(btn.dataset.view));
            });
        });
    }

    handleQuickAction(action) {
        switch (action) {
            case 'work':
                import('./WorkPage.js').then(m => m.default.open());
                break;
            case 'invest':
            case 'crypto':
                import('./ViewManager.js').then(m => {
                    m.default.switchView('market');
                    setTimeout(() => {
                        document.querySelector(`[data-market-tab="${action === 'crypto' ? 'crypto' : 'stocks'}"]`)?.click();
                    }, 100);
                });
                break;
            case 'career':
                import('./panels/CareerPanel.js').then(m => m.default.show());
                break;
            case 'business':
                import('./BusinessPage.js').then(m => m.default.open());
                break;
            case 'loan':
                import('./panels/LoanPanel.js').then(m => m.default.show());
                break;
            case 'savings':
                import('./panels/SavingsPanel.js').then(m => m.default.show());
                break;
            case 'property':
                import('./panels/PropertyPanel.js').then(m => m.default.show());
                break;
            case 'trading-signal':
                import('./panels/TradingSignalPanel.js').then(m => m.default.show());
                break;
            case 'donate':
                this.handleDonate();
                break;
            case 'finance':
                import('./panels/FinancePanel.js').then(m => m.default.show());
                break;
            case 'tax':
                import('./panels/TaxPanel.js').then(m => m.default.show());
                break;
            case 'guide':
                this.showGuide();
                break;
        }
    }

    async handleDonate() {
        const balance = gameState.getBalance();
        const amount = await ui.promptMoney({ title: 'Donasi Amal', icon: '🎁', maxAmount: balance, confirmText: 'Donasikan' });
        if (amount && amount > 0) {
            try {
                financeManager.donate(amount, 'Donasi Amal', 'Donasi');
                ui.success(`$ ${financeManager.formatCurrency(amount)} berhasil didonasikan! Keberuntungan Anda meningkat! ✨`);
                this.updateBalanceCard();
            } catch (e) {
                ui.error(e.message);
            }
        }
    }

    // ==========================================
    // SETTINGS
    // ==========================================

    showSettings() {
        const role = roleManager.getRoleData();
        const allRoles = roleManager.getAllRoles();

        const roleOptionsHTML = allRoles.map(r => `
            <div class="role-card" data-role="${r.id}" style="
                background:${role?.id === r.id ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)'};
                border:1px solid ${role?.id === r.id ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'};
                border-radius:var(--radius-md);padding:0.875rem;
                cursor:pointer;transition:all 0.2s;margin-bottom:0.5rem;
                display:flex;align-items:center;gap:0.75rem;
            ">
                <span style="font-size:1.4rem;">${r.icon}</span>
                <div>
                    <div style="font-weight:700;font-size:0.9rem;">${r.label}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">${r.desc}</div>
                </div>
                ${role?.id === r.id ? '<span style="margin-left:auto;color:var(--accent-primary);font-size:0.85rem;font-weight:700;">✓ Aktif</span>' : ''}
            </div>
        `).join('');

        const accounts = gameState.getAccounts() || {};
        const lowerUser = (gameState.currentUser || '').toLowerCase();
        const activeAcc = accounts[lowerUser] || {};
        const currentAvatar = activeAcc.avatar || '👤';
        const chars = gameState.getCharacters() || [];

        const content = `
            <!-- 💾 Manual Save Card -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
                <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <span>💾 Penyimpanan Karakter</span>
                    <span style="font-size: 0.65rem; background: var(--accent-primary); color: #000; padding: 2px 6px; border-radius: 4px; font-weight: 800;">AUTO & MANUAL</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-top: 0.5rem;">
                    <div>
                        <strong style="color: #fff; font-size: 0.95rem; display: block; margin-bottom: 2px;">Akun: ${gameState.currentUser || 'Tamu'}</strong>
                        <span style="color: var(--accent-primary); font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 4px;">Karakter: ${gameState.activeCharacter || 'Pemain'}</span>
                        <span style="font-size: 0.7rem; color: var(--text-dim);">Tersimpan lokal di browser ini</span>
                    </div>
                    <button class="btn btn-primary btn-sm" id="btn-save-progress" style="font-weight: 900; letter-spacing: 0.05em; padding: 8px 16px; width: auto; height: auto;">
                        💾 SIMPAN
                    </button>
                </div>
            </div>

            <!-- ⚙️ Account Management -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
                <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                    <span>🛡️ Pengaturan Akun</span>
                    <span style="font-size: 0.85rem; font-weight: 800; color: #fff;">${currentAvatar} ${gameState.currentUser || 'Tamu'}</span>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-secondary btn-sm" id="btn-change-acc-avatar" style="width: 100%; padding: 8px 12px; font-size: 0.75rem; font-weight: 700; height: auto; margin: 0; text-align: left; display: flex; align-items: center; gap: 0.5rem; justify-content: flex-start; min-width: 0;">
                        🖼️ Ganti Avatar Profil
                    </button>
                    <button class="btn btn-secondary btn-sm" id="btn-change-acc-name" style="width: 100%; padding: 8px 12px; font-size: 0.75rem; font-weight: 700; height: auto; margin: 0; text-align: left; display: flex; align-items: center; gap: 0.5rem; justify-content: flex-start; min-width: 0;">
                        ✏️ Ganti Nama Akun
                    </button>
                    <button class="btn btn-secondary btn-sm" id="btn-change-acc-pass" style="width: 100%; padding: 8px 12px; font-size: 0.75rem; font-weight: 700; height: auto; margin: 0; text-align: left; display: flex; align-items: center; gap: 0.5rem; justify-content: flex-start; min-width: 0;">
                        🔑 Ganti Sandi Akun
                    </button>
                </div>
            </div>

            <!-- 👤 Character Management -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
                <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 0.75rem;">
                    👤 Manajer Karakter (Multi-Slots)
                </div>
                
                <!-- List characters -->
                <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 180px; overflow-y: auto; margin-bottom: 0.75rem; padding-right: 4px;">
                    ${chars.length === 0 ? `
                        <div style="font-size: 0.75rem; color: var(--text-dim); text-align: center; padding: 0.5rem 0;">Belum ada karakter terdaftar.</div>
                    ` : chars.map(charName => {
                        const isActive = charName.toLowerCase() === (gameState.activeCharacter || '').toLowerCase();
                        return `
                            <div style="display: flex; align-items: center; justify-content: space-between; background: ${isActive ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'}; padding: 8px 12px; border-radius: 8px; font-size: 0.8rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="font-size: 1.1rem;">${isActive ? '👑' : '👤'}</span>
                                    <span style="font-weight: 700; color: ${isActive ? '#10b981' : '#fff'};">${charName}</span>
                                </div>
                                ${isActive ? `
                                    <span style="color: #10b981; font-weight: 800; font-size: 0.7rem;">AKTIF</span>
                                ` : `
                                    <button class="btn btn-secondary btn-sm btn-switch-character" data-charname="${charName}" style="padding: 4px 10px; font-size: 0.7rem; font-weight: 800; width: auto; height: auto; min-width: 0; margin: 0;">
                                        MASUK 🔑
                                    </button>
                                `}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <!-- Create new character button -->
                <button class="btn btn-secondary btn-sm" id="btn-create-character" style="width: 100%; font-weight: 800; font-size: 0.75rem; border: 1px dashed rgba(255,255,255,0.2); background: transparent; padding: 8px 0; height: auto;">
                    ➕ BUAT KARAKTER BARU / MULAI BARU
                </button>
            </div>

            <div style="margin-bottom:1.25rem;">
                <div style="font-size:0.85rem;font-weight:600;color:var(--text-muted);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.04em;">Ubah Peran</div>
                ${roleOptionsHTML}
            </div>
            <hr style="border-color:var(--border-color);margin:1rem 0;">
            <button class="btn btn-secondary" style="width:100%; margin-bottom: 0.5rem;" id="btn-logout-game">🚪 Keluar (Logout)</button>
            <button class="btn btn-danger" style="width:100%" id="btn-reset-game">🗑️ Reset Seluruh Permainan</button>
        `;

        ui.showModal({
            title: '⚙️ Pengaturan & Karakter',
            content,
            onShow: () => {
                // Save progress click
                document.getElementById('btn-save-progress')?.addEventListener('click', (e) => {
                    gameState.save();
                    ui.success('Progres permainan berhasil disimpan ke slot karakter: ' + (gameState.activeCharacter || 'Pemain'), '💾 Sukses Menyimpan');
                    try {
                        import('./Animations.js').then(anim => {
                            anim.createFloatingText(e.target, '💾 DISIMPAN', '#10b981');
                        });
                    } catch (err) {}
                });

                // Change Account Username click
                document.getElementById('btn-change-acc-name')?.addEventListener('click', async () => {
                    if (!gameState.currentUser) return;
                    const newName = prompt("Masukkan nama akun baru Anda:", gameState.currentUser);
                    if (newName === null) return;
                    if (!newName.trim()) {
                        ui.error("Nama akun tidak boleh kosong!");
                        return;
                    }
                    try {
                        gameState.changeAccountUsername(newName);
                        ui.success("Nama akun berhasil diubah!", "🛡️ Sukses");
                        setTimeout(() => location.reload(), 1000);
                    } catch (err) {
                        ui.error(err.message);
                    }
                });

                // Change Account Password click
                document.getElementById('btn-change-acc-pass')?.addEventListener('click', async () => {
                    if (!gameState.currentUser) return;
                    const newPass = prompt("Masukkan password baru Anda (minimal 4 karakter):");
                    if (newPass === null) return;
                    if (!newPass.trim()) {
                        ui.error("Password tidak boleh kosong!");
                        return;
                    }
                    try {
                        gameState.changeAccountPassword(newPass);
                        ui.success("Password akun berhasil diubah!", "🛡️ Sukses");
                    } catch (err) {
                        ui.error(err.message);
                    }
                });

                // Change Account Avatar click
                document.getElementById('btn-change-acc-avatar')?.addEventListener('click', () => {
                    const avatars = ['👤', '💼', '🦁', '🦅', '🦊', '🐉', '🚀', '💡', '🛡️', '👑'];
                    const accounts = gameState.getAccounts();
                    const lowerUser = gameState.currentUser.toLowerCase();
                    const currentAvatar = accounts[lowerUser]?.avatar || '👤';
                    let nextIdx = (avatars.indexOf(currentAvatar) + 1) % avatars.length;
                    const newAvatar = avatars[nextIdx];
                    
                    gameState.changeAccountAvatar(newAvatar);
                    ui.success(`Avatar profil berhasil diubah ke ${newAvatar}!`, '🖼️ Sukses');
                    setTimeout(() => location.reload(), 800);
                });

                // Create Character / Start New Game click
                document.getElementById('btn-create-character')?.addEventListener('click', async () => {
                    const confirmed = await ui.confirm({
                        title: 'Buat Karakter Baru?',
                        message: 'Progres karakter saat ini akan disimpan terlebih dahulu. Anda dapat membuat karakter baru di dalam akun ini secara terpisah.',
                        confirmText: 'Ya, Buat Karakter',
                        confirmClass: 'btn-primary'
                    });
                    if (confirmed) {
                        gameState.save();
                        localStorage.removeItem(`businessTycoon_activeChar_${lowerUser}`);
                        location.reload();
                    }
                });

                // Switch Character click
                document.querySelectorAll('.btn-switch-character').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const charName = btn.dataset.charname;
                        try {
                            gameState.save(); // Save current profile first
                            localStorage.setItem(`businessTycoon_activeChar_${lowerUser}`, charName);
                            ui.success(`Membuka karakter: ${charName}...`, '👤 Berhasil Masuk');
                            setTimeout(() => location.reload(), 1000);
                        } catch (err) {
                            ui.error(err.message);
                        }
                    });
                });

                document.querySelectorAll('.role-card[data-role]').forEach(card => {
                    card.addEventListener('click', async () => {
                        const newRole = card.dataset.role;
                        if (newRole === roleManager.getRole()) return;
                        const confirmed = await ui.confirm({
                            title: 'Ganti Peran?',
                            message: 'Fitur yang tersedia akan berubah sesuai peran baru. Progress tidak hilang.',
                            confirmText: 'Ya, Ganti',
                            danger: false
                        });
                        if (confirmed) {
                            roleManager.setRole(newRole);
                            roleManager.applyVisibility();
                            ui.closeModal();
                            ui.success(`Peran diubah menjadi: ${roleManager.getRoleData()?.label}`);
                        }
                    });
                });

                document.getElementById('btn-logout-game')?.addEventListener('click', () => {
                    gameState.logout();
                });

                document.getElementById('btn-reset-game')?.addEventListener('click', () => {
                    if (confirm('Yakin mau reset seluruh data permainan? Semua karakter dan akun terdaftar akan dihapus secara permanen!')) {
                        localStorage.clear();
                        location.reload();
                    }
                });
            }
        });
    }

    showNotifications() {
        // Reset unread count
        gameState.set('unreadNotificationsCount', 0);
        ui.updateNotificationBadge();

        const notifs = gameState.get('notifications') || [];
        const isNotifEnabled = gameState.get('settings.notificationsEnabled') !== false;

        let content = `
            <div style="max-height: 65vh; display: flex; flex-direction: column; gap: 1rem;">
                <!-- Notification Settings Toggles -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                    <div>
                        <div style="font-weight: 700; font-size: 0.9rem; color: white;">Aktifkan Pop-up Notifikasi (Toast)</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Jika dinonaktifkan, notifikasi hanya akan menambah angka di lonceng tanpa popup yang menutupi konten.</div>
                    </div>
                    <label class="switch" style="position: relative; display: inline-block; width: 44px; height: 22px;">
                        <input type="checkbox" id="toggle-popup-notifs" ${isNotifEnabled ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                        <span class="slider" style="position: absolute; cursor: pointer; inset: 0; background-color: ${isNotifEnabled ? 'var(--accent-primary)' : '#4b5563'}; border-radius: 20px; transition: 0.3s; display: flex; align-items: center;">
                            <span class="knob" style="height: 16px; width: 16px; background-color: white; border-radius: 50%; transition: 0.3s; transform: translateX(${isNotifEnabled ? '24px' : '4px'}); display: block;"></span>
                        </span>
                    </label>
                </div>

                <!-- Notifications List -->
                <div style="overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 0.75rem; padding-right: 5px;">
                    ${notifs.length ? notifs.map(n => `
                        <div style="display: flex; gap: 0.75rem; padding: 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                            <span style="font-size: 1.5rem; display: flex; align-items: center;">${n.icon || '🔔'}</span>
                            <div style="flex: 1;">
                                <div style="font-size: 0.85rem; font-weight: 800; color: white; display: flex; justify-content: space-between;">
                                    <span>${n.title}</span>
                                    <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: normal;">${n.date || ''}</span>
                                </div>
                                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; line-height: 1.4;">${n.message}</div>
                            </div>
                        </div>
                    `).join('') : `
                        <div style="text-align: center; padding: 3rem 0; color: var(--text-muted);">
                            <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">🔔</span>
                            <div style="font-size: 0.9rem; font-weight: 700;">Belum ada notifikasi baru</div>
                        </div>
                    `}
                </div>
            </div>
        `;

        ui.showModal({ title: '🔔 Notifikasi & Log', content });

        // Add event listener to the switch
        const checkbox = document.getElementById('toggle-popup-notifs');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                const checked = e.target.checked;
                gameState.set('settings.notificationsEnabled', checked);
                const slider = checkbox.nextElementSibling;
                const knob = slider.querySelector('.knob');
                slider.style.backgroundColor = checked ? 'var(--accent-primary)' : '#4b5563';
                knob.style.transform = `translateX(${checked ? '24px' : '4px'})`;
                ui.success(checked ? 'Pop-up notifikasi diaktifkan' : 'Pop-up notifikasi dinonaktifkan (hanya angka lonceng)');
            });
        }
    }

    showGuide() {
        const role = roleManager.getRoleData();
        const content = `
            <div style="max-height:65vh;overflow-y:auto;">
                <div class="planning-card" style="margin-bottom:1rem;">
                    <h4 style="margin-bottom:0.5rem;">🎯 Tujuan Permainan</h4>
                    <p style="color:var(--text-muted);font-size:0.875rem;">Capai kebebasan finansial $ 1 Miliar! Kelola keuangan sesuai peranmu.</p>
                </div>
                ${role ? `
                <div class="planning-card" style="margin-bottom:1rem;border-color:${role.color}40;">
                    <h4 style="margin-bottom:0.5rem;">${role.icon} Peran Aktif: ${role.label}</h4>
                    <p style="color:var(--text-muted);font-size:0.875rem;">${role.detail}</p>
                    <p style="color:var(--text-muted);font-size:0.875rem;margin-top:0.5rem;">${role.monthlyEvent}</p>
                </div>
                ` : ''}
                <div class="planning-card" style="margin-bottom:1rem;">
                    <h4 style="margin-bottom:0.5rem;">💡 Tips Pro</h4>
                    <ul style="color:var(--text-muted);font-size:0.875rem;padding-left:1.25rem;line-height:1.8;">
                        <li>Diversifikasi — jangan all-in satu aset</li>
                        <li>Bayar cicilan tepat waktu untuk credit score</li>
                        <li>Bisnis memberi passive income tanpa kerja manual</li>
                        <li>Ganti peran kapan saja di ⚙️ Pengaturan</li>
                    </ul>
                </div>
            </div>
        `;
        ui.showModal({ title: '📖 Panduan', content });
    }

    loadECharts() {
        if (window.echarts) return Promise.resolve(window.echarts);
        if (window._echartsLoadingPromise) return window._echartsLoadingPromise;

        window._echartsLoadingPromise = new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
            script.onload = () => {
                window._echartsLoadingPromise = null;
                resolve(window.echarts);
            };
            script.onerror = () => {
                console.error("Failed to load ECharts");
                window._echartsLoadingPromise = null;
                resolve(null);
            };
            document.head.appendChild(script);
        });

        return window._echartsLoadingPromise;
    }

    initDashboardChart() {
        const chartDom = document.getElementById('balance-sparkline');
        if (!chartDom) return;

        this.loadECharts().then(echarts => {
            if (!echarts) return;
            
            if (this.dashboardChart) {
                this.updateDashboardChart();
                return;
            }

            this.dashboardChart = echarts.init(chartDom, 'dark');
            this.updateDashboardChart();

            const resizeHandler = () => {
                if (this.dashboardChart) this.dashboardChart.resize();
            };
            window.addEventListener('resize', resizeHandler);
            chartDom.resizeHandler = resizeHandler;
        });
    }

    updateDashboardChart() {
        if (!this.dashboardChart) {
            this.initDashboardChart();
            return;
        }

        const currentMonth = gameState.get('gameTime.month') || 1;
        const currentYear = gameState.get('gameTime.year') || 2026;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const historyData = [];

        for (let i = 11; i >= 0; i--) {
            let m = currentMonth - i;
            let y = currentYear;
            if (m <= 0) {
                m += 12;
                y -= 1;
            }
            historyData.push({
                month: m,
                year: y,
                label: `${monthNames[m - 1]} ${y}`,
                bankAtEnd: 0
            });
        }

        const allTransactions = gameState.get('transactions') || [];

        historyData.forEach(h => {
            const monthTx = allTransactions.filter(t => t.gameTime?.month === h.month && t.gameTime?.year === h.year);

            if (monthTx.length > 0) {
                h.bankAtEnd = monthTx[0].balance || 0;
            } else {
                const beforeTx = allTransactions.find(t => {
                    const tVal = (t.gameTime?.year || 0) * 12 + (t.gameTime?.month || 0);
                    const hVal = h.year * 12 + h.month;
                    return tVal < hVal;
                });
                h.bankAtEnd = beforeTx ? (beforeTx.balance || 0) : gameState.getBalance();
            }
        });

        historyData.forEach((h, idx) => {
            if (h.bankAtEnd === 0) {
                if (idx > 0) {
                    h.bankAtEnd = historyData[idx - 1].bankAtEnd;
                } else {
                    h.bankAtEnd = gameState.getBalance();
                }
            }
        });

        const labels = historyData.map(h => h.label);
        const bankAtEnds = historyData.map(h => h.bankAtEnd);

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                show: true,
                trigger: 'axis',
                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                borderWidth: 1,
                padding: [6, 10],
                textStyle: {
                    color: '#f4f4f5',
                    fontSize: 11
                },
                axisPointer: {
                    type: 'line',
                    lineStyle: {
                        color: 'rgba(255, 255, 255, 0.15)'
                    }
                },
                formatter(params) {
                    const item = params[0];
                    const displayVal = `$ ${new Intl.NumberFormat('en-US').format(Math.round(item.value))}`;
                    return `
                        <div style="font-size: 11px;">
                            <div style="color: #a1a1aa; margin-bottom: 2px;">${item.axisValue}</div>
                            <div style="color: #10b981; font-weight: 700;">${displayVal}</div>
                        </div>
                    `;
                }
            },
            grid: {
                left: 0,
                right: 0,
                top: 15,
                bottom: 0,
                containLabel: false
            },
            xAxis: {
                type: 'category',
                data: labels,
                show: false,
                boundaryGap: false
            },
            yAxis: {
                type: 'value',
                show: false,
                scale: true
            },
            series: [
                {
                    name: 'Kekayaan Bersih',
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    lineStyle: {
                        width: 2.5,
                        color: '#10b981'
                    },
                    itemStyle: {
                        color: '#10b981'
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: 'rgba(16, 185, 129, 0.22)' },
                                { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
                            ],
                            global: false
                        }
                    },
                    data: bankAtEnds
                }
            ]
        };

        this.dashboardChart.setOption(option);
        // Force a resize calculation to adapt to flex/grid container dimensions
        setTimeout(() => {
            if (this.dashboardChart) this.dashboardChart.resize();
        }, 50);
    }
}

export const homeScreen = new HomeScreen();
export default homeScreen;
