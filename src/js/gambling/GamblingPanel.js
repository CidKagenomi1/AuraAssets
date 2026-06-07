/**
 * GamblingPanel.js - Casino Slot Machine Terminal
 * Only includes the "Goldy Crush" Slot Machine game.
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import { SlotEngine } from '../gambling/casino/SlotEngine.js';

class GamblingPanel {
    constructor() {
        const refresh = () => this.refreshBalanceDisplay();
        this.slot = new SlotEngine(refresh);
    }

    show() {
        const balance = gameState.getBalance();

        const content = `
            <div class="casino-root" style="padding:1.5rem; max-width:1100px; margin:0 auto; width:100%;">

                <!-- ── Header Stats ── -->
                <div class="casino-hdr" style="
                    background: linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(10,10,12,0.85) 100%);
                    border: 1px solid rgba(251,191,36,0.18);
                    border-radius: 20px;
                    padding: 1.25rem 1.75rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.75rem;
                    flex-wrap: wrap;
                    gap: 1rem;
                ">
                    <div>
                        <div style="font-size:0.7rem; color:rgba(255,255,255,0.45); text-transform:uppercase; letter-spacing:0.12em; font-weight:700;">SALDO KASINO</div>
                        <div style="font-size:2.1rem; font-weight:900; color:#fff; margin-top:0.2rem; display:flex; align-items:baseline; gap:0.35rem;">
                            <span style="color:#fbbf24; font-size:1.4rem;">$</span>
                            <span id="casino-player-balance-value">${financeManager.formatCurrency(balance)}</span>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.35rem;">
                        <div style="font-size:0.7rem; color:rgba(255,255,255,0.45); text-transform:uppercase; letter-spacing:0.12em; font-weight:700;">STATUS KEBERUNTUNGAN</div>
                        <div style="display:flex; align-items:center; gap:0.5rem; color:#fbbf24; font-weight:800; font-size:0.95rem;">
                            <span>✨</span>
                            <span id="casino-luck-status">${this.getLuckStatus()}</span>
                        </div>
                    </div>
                </div>

                <!-- ── Main Game Board ── -->
                <div class="casino-board" style="background:rgba(255,255,255,0.01); border:1px solid var(--border-color); border-radius:20px; padding:2rem; min-height:480px;">
                    <!-- SLOT -->
                    <div id="game-slot-container" class="casino-section">
                        ${this.slot.getHTML()}
                    </div>
                </div>

            </div>

            <style>
                /* ── Shared winPulse animation ── */
                @keyframes winPulse {
                    0%,100% { text-shadow: 0 0 8px currentColor; }
                    50% { text-shadow: 0 0 24px currentColor, 0 0 48px currentColor; }
                }
                @keyframes jackpotFlash {
                    0%,100% { background: linear-gradient(135deg,#fbbf24,#f59e0b); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
                    50% { background: linear-gradient(135deg,#f43f5e,#be123c); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        `;

        import('../ui/ViewManager.js').then(m => {
            const viewManager = m.default;
            viewManager.showDynamicView('Gedung Kasino', 'Aksi spekulasi & permainan keberuntungan', content);
            this._bindEvents();
        });
    }

    _bindEvents() {
        const container = document.getElementById('dynamic-view-content');
        if (!container) return;

        // Delegate events to slot engine
        this.slot.bindEvents(container, () => this.refreshBalanceDisplay());
    }

    getLuckStatus() {
        const donations = gameState.get('donations') || { luckMultiplier: 1.0, luckTicksRemaining: 0 };
        if (donations.luckTicksRemaining > 0 && donations.luckMultiplier > 1) {
            return `✨ SANGAT BERUNTUNG (${donations.luckMultiplier}×)`;
        }
        return 'NORMAL';
    }

    refreshBalanceDisplay() {
        const bal = gameState.getBalance();

        const casinoEl = document.getElementById('casino-player-balance-value');
        if (casinoEl) casinoEl.textContent = financeManager.formatCurrency(bal);

        const sidebarBal = document.getElementById('sidebar-balance-value');
        if (sidebarBal) sidebarBal.textContent = '$ ' + financeManager.formatCurrency(bal, true);

        const mainBal = document.getElementById('balance-value');
        if (mainBal) mainBal.textContent = new Intl.NumberFormat('id-ID').format(Math.round(bal));
    }
}

export default new GamblingPanel();
