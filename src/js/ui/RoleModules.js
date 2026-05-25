/**
 * RoleModules.js - Modularized UI components for different game roles.
 */

import gameState from '../game/GameState.js';
import financeManager from '../finance/FinanceManager.js';
import earnManager from '../game/EarnManager.js';
import roleManager from '../game/RoleManager.js';
import globalEconomy from '../game/GlobalEconomy.js';

/**
 * Common formatter for currency in compact mode
 */
const formatCompact = (num) => {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
};

/**
 * MODULE: Karyawan (Employee)
 */
export const EmployeeModule = {
    renderMilestones() {
        const el = document.getElementById('milestones-list');
        if (!el) return;

        const balance = gameState.getBalance();
        const milestones = [
            { label: 'Gaji Pertama', target: 5_000_000, icon: '💵' },
            { label: 'Tabungan Darurat', target: 25_000_000, icon: '🛡️' },
            { label: 'Cicilan Lunas', target: 100_000_000, icon: '🔓' },
            { label: 'Managerial Level', target: 250_000_000, icon: '👔' },
            { label: 'Financial Freedom', target: 1_000_000_000, icon: '🏆' }
        ];

        el.innerHTML = this.buildMilestoneHTML(milestones, balance);
    },

    buildMilestoneHTML(milestones, balance) {
        return milestones.map(m => {
            const done = balance >= m.target;
            const progress = Math.min(100, (balance / m.target) * 100);
            return `
                <div class="milestone-item ${done ? 'achieved' : ''}" style="
                    display:flex;align-items:center;gap:0.875rem;padding:0.75rem 1rem;
                    background:${done ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)'};
                    border:1px solid ${done ? 'rgba(99,102,241,0.25)' : 'var(--border-color)'};
                    border-radius:var(--radius-md);
                ">
                    <span style="font-size:1.25rem;opacity:${done ? 1 : 0.4};">${m.icon}</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:0.9rem;color:${done ? '#818cf8' : 'var(--text-muted)'};">${m.label}</div>
                        <div style="font-size:0.75rem;color:var(--text-dim);">Target: $ ${formatCompact(m.target)}</div>
                    </div>
                    <div style="text-align:right;">
                        ${done ? '<span style="color:#818cf8;font-size:0.85rem;font-weight:700;">✓</span>' : `<span style="font-size:0.8rem;color:var(--text-dim);">${progress.toFixed(0)}%</span>`}
                    </div>
                </div>
            `;
        }).join('');
    }
};

/**
 * MODULE: Investor
 */
export const InvestorModule = {
    renderMarketPulse() {
        const status = globalEconomy.getMarketStatus();
        const fearGreed = globalEconomy.getFearGreedIndex();
        
        const valueEl = document.getElementById('fear-greed-value');
        const statusEl = document.getElementById('fear-greed-status');
        const needleEl = document.getElementById('fear-greed-needle');
        const newsEl = document.getElementById('market-pulse-news-text');
        
        if (valueEl && statusEl) {
            let label = 'Neutral';
            let color = '#eab308';
            
            if (fearGreed < 25) {
                label = 'Extreme Fear';
                color = '#ef4444';
            } else if (fearGreed < 45) {
                label = 'Fear';
                color = '#f97316';
            } else if (fearGreed <= 55) {
                label = 'Neutral';
                color = '#eab308';
            } else if (fearGreed <= 75) {
                label = 'Greed';
                color = '#22c55e';
            } else {
                label = 'Extreme Greed';
                color = '#10b981';
            }
            
            valueEl.textContent = fearGreed;
            statusEl.textContent = label;
            statusEl.style.color = color;
        }

        if (needleEl) {
            const angle = (fearGreed - 50) * 1.8;
            needleEl.style.transform = `rotate(${angle}deg)`;
        }

        if (newsEl) {
            const trendMessages = {
                RECOVERY: [
                    'Sinyal pemulihan terdeteksi! Rantai pasok mulai stabil dan daya beli naik.',
                    'Pasar mulai bergeliat kembali seiring meningkatnya transaksi retail.',
                    'Sentimen negatif mereda, harga saham mulai merangkak naik perlahan.'
                ],
                BULL: [
                    'Ekspansi ekonomi terkonfirmasi! Keuntungan industri melesat di semua sektor.',
                    'Daya beli masyarakat kuat, transaksi bisnis ritel melonjak drastis.',
                    'Indeks bursa mencatat rekor tertinggi baru ditopang optimisme pelaku pasar.'
                ],
                PEAK: [
                    'Ekonomi mencapai puncak kejayaan. Waspadai aksi koreksi jangka pendek.',
                    'Volume transaksi saham berada di level ekstrem. Rawan profit-taking.',
                    'Aset properti dan saham bluechip berada di tingkat valuasi puncaknya.'
                ],
                BEAR: [
                    'Awas resesi global membayangi! Daya beli konsumen melemah drastis.',
                    'Koreksi dalam terjadi di pasar modal. Investor disarankan bersikap defensif.',
                    'Suku bunga tinggi memicu perlambatan transaksi pasar real estate.'
                ],
                TROUGH: [
                    'Ekonomi menyentuh titik terendah. Aktivitas industri melambat signifikan.',
                    'Pasar sangat sepi, namun merupakan momentum akumulasi aset murah.',
                    'Daya beli berada di dasar resesi, bisnis mengandalkan stimulus pemerintah.'
                ]
            };

            const messages = trendMessages[status.trend] || ['Pasar bergerak stabil dalam rentang sempit.'];
            const day = gameState.get('gameTime.day') || 1;
            const msgIdx = day % messages.length;
            newsEl.textContent = messages[msgIdx];
        }
    }
};

/**
 * MODULE: Pebisnis (Businessman)
 */
export const BusinessModule = {
    updateEarnUI(data) {
        const state = earnManager.getState();
        const pending = data?.pendingEarn ?? state.pendingEarn;
        const hideBalance = gameState.get('settings.hideBalance');

        const pendingEl = document.getElementById('earn-pending-value');
        if (pendingEl) {
            pendingEl.textContent = hideBalance ? '*******' : `$ ${financeManager.formatCurrency(pending)}`;
        }

        const rateEl = document.getElementById('earn-rate-value');
        const levelEl = document.getElementById('earn-level');
        if (rateEl) rateEl.textContent = `+$ ${financeManager.formatCurrency(state.earnRate)}/detik`;
        if (levelEl) levelEl.textContent = state.level;

        const costEl = document.getElementById('upgrade-cost-value');
        if (costEl) costEl.textContent = `$ ${financeManager.formatCurrency(state.upgradeCost)}`;

        const btnUpgrade = document.getElementById('btn-upgrade');
        if (btnUpgrade) {
            const canAfford = gameState.getBalance() >= state.upgradeCost;
            btnUpgrade.style.opacity = canAfford ? '1' : '0.5';
        }
    },

    renderDashboard() {
        const el = document.getElementById('company-dashboard-content');
        if (!el) return;

        const dashboardSection = document.getElementById('company-dashboard');
        const biz = gameState.get('business');
        
        if (!biz || !biz.active) {
            if (dashboardSection) dashboardSection.classList.add('hidden');
            el.innerHTML = ''; // Kosongkan saja
            return;
        }

        if (dashboardSection) {
            import('./ViewManager.js').then(m => {
                if (m.default.currentView === 'home') {
                    dashboardSection.classList.remove('hidden');
                } else {
                    dashboardSection.classList.add('hidden');
                }
            });
        }

        // Active Business Dashboard
        const revenue = biz.revenue || 0;
        const employees = biz.employees || 0;
        const valuation = biz.valuation || 0;

        el.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                <div>
                    <h3 style="font-size: 1.1rem; font-weight: 800; margin:0;">Dashboard: ${biz.name}</h3>
                    <p class="text-muted" style="font-size: 0.75rem; margin:0;">Status: <span style="color: var(--accent-primary); font-weight: 700;">OPERASIONAL</span></p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Valuasi Bisnis</div>
                    <div style="font-size: 1rem; font-weight: 800; color: var(--accent-primary);">$ ${formatCompact(valuation)}</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem;">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 0.75rem; border-radius: var(--radius-md);">
                    <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">Revenue Bulanan</div>
                    <div style="font-size: 0.9rem; font-weight: 700;">$ ${formatCompact(revenue)}</div>
                </div>
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 0.75rem; border-radius: var(--radius-md);">
                    <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">Karyawan</div>
                    <div style="font-size: 0.9rem; font-weight: 700;">${employees} Orang</div>
                </div>
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 0.75rem; border-radius: var(--radius-md);">
                    <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.25rem;">Level Bisnis</div>
                    <div style="font-size: 0.9rem; font-weight: 700;">Lv. ${biz.level}</div>
                </div>
            </div>

            <div style="display: flex; gap: 0.5rem;">
                <button id="btn-dashboard-ops" class="btn btn-secondary btn-sm" style="flex: 1; font-size: 0.75rem;">
                    ⚙️ Operasional
                </button>
                <button id="btn-dashboard-finance" class="btn btn-secondary btn-sm" style="flex: 1; font-size: 0.75rem;">
                    📊 Laporan
                </button>
            </div>
        `;

        // Bind events programmatically to avoid global module path errors
        document.getElementById('btn-dashboard-ops')?.addEventListener('click', () => {
            import('./BusinessPage.js').then(m => m.default.open());
        });
        document.getElementById('btn-dashboard-finance')?.addEventListener('click', () => {
            import('./panels/FinancePanel.js').then(m => m.default.show());
        });
    }
};

/**
 * Core coordinating object for role-based UI
 */
const RoleModules = {
    EmployeeModule,
    InvestorModule,
    BusinessModule,

    updateAll() {
        const role = roleManager.getRole();
        
        // Always update shared UI
        this.updateShared();

        // Market Pulse should be visible/updated for all if it's on the dashboard
        this.InvestorModule.renderMarketPulse();

        // Role-specific updates
        if (role === 'karyawan') {
            this.EmployeeModule.renderMilestones();
        } else if (role === 'investor') {
            this.renderStandardMilestones();
        } else if (role === 'pebisnis') {
            this.BusinessModule.updateEarnUI();
            this.BusinessModule.renderDashboard();
            this.renderStandardMilestones();
        } else if (role === 'survivor') {
            this.BusinessModule.updateEarnUI();
            this.BusinessModule.renderDashboard();
            this.renderStandardMilestones();
        } else {
            // Default/No role yet
            this.renderStandardMilestones();
        }
    },

    updateShared() {
        // Transactions and basic stats
    },

    renderStandardMilestones() {
        const el = document.getElementById('milestones-list');
        if (!el) return;

        const balance = gameState.getBalance();
        const milestones = [
            { label: 'Miliarder', target: 1_000_000_000, icon: '💰' },
            { label: 'Taipan', target: 10_000_000_000, icon: '🏢' },
            { label: 'Triliuner', target: 100_000_000_000, icon: '🏆' }
        ];

        el.innerHTML = milestones.map(m => {
            const done = balance >= m.target;
            const progress = Math.min(100, (balance / m.target) * 100);
            return `
                <div style="display:flex;align-items:center;gap:0.875rem;padding:0.75rem 1rem;background:rgba(255,255,255,0.02);border:1px solid var(--border-color);border-radius:var(--radius-md);">
                    <span style="font-size:1.25rem;opacity:${done ? 1 : 0.4};">${m.icon}</span>
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:0.9rem;">${m.label}</div>
                        <div style="font-size:0.75rem;color:var(--text-dim);">Target: $ ${formatCompact(m.target)}</div>
                    </div>
                    <div style="text-align:right;">
                        ${done ? '✅' : progress.toFixed(0) + '%'}
                    </div>
                </div>
            `;
        }).join('');
    }
};

export default RoleModules;
