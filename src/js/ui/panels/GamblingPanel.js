/**
 * GamblingPanel.js - Casino & Speculation Terminal (Orchestrator)
 * Delegates all game logic to dedicated engine modules in ./casino/
 *
 * Engines:
 *  - SlotEngine     → casino/SlotEngine.js
 *  - CoinFlipEngine → casino/CoinFlipEngine.js
 *  - BlackjackEngine→ casino/BlackjackEngine.js
 */

import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../game/GameState.js';
import { SlotEngine }      from './casino/SlotEngine.js';
import { CoinFlipEngine }  from './casino/CoinFlipEngine.js';
import { BlackjackEngine } from './casino/BlackjackEngine.js';

class GamblingPanel {
    constructor() {
        this.activeGame = 'slot'; // 'slot' | 'coin' | 'blackjack'

        const refresh = () => this.refreshBalanceDisplay();
        this.slot      = new SlotEngine(refresh);
        this.coinFlip  = new CoinFlipEngine(refresh);
        this.blackjack = new BlackjackEngine(refresh);
    }

    // ─────────────────────────────────────────────
    //  MAIN VIEW
    // ─────────────────────────────────────────────
    show() {
        const balance = gameState.getBalance();

        const content = `
            <div class="casino-root" style="padding:1.5rem; max-width:1100px; margin:0 auto; width:100%;">

                <!-- ── Header Stats ── -->
                <div class="casino-hdr" style="
                    background: linear-gradient(135deg, rgba(244,63,94,0.08) 0%, rgba(10,10,12,0.85) 100%);
                    border: 1px solid rgba(244,63,94,0.18);
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
                            <span style="color:#f43f5e; font-size:1.4rem;">$</span>
                            <span id="casino-player-balance-value">${financeManager.formatCurrency(balance)}</span>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.35rem;">
                        <div style="font-size:0.7rem; color:rgba(255,255,255,0.45); text-transform:uppercase; letter-spacing:0.12em; font-weight:700;">STATUS KEBERUNTUNGAN</div>
                        <div style="display:flex; align-items:center; gap:0.5rem; color:#f43f5e; font-weight:800; font-size:0.95rem;">
                            <span>✨</span>
                            <span id="casino-luck-status">${this.getLuckStatus()}</span>
                        </div>
                    </div>
                </div>

                <!-- ── Game Tab Selector ── -->
                <div class="casino-tabs" style="display:grid; grid-template-columns:repeat(3,1fr); gap:0.75rem; margin-bottom:1.5rem;">

                    <button class="casino-tab ${this.activeGame === 'slot' ? 'casino-tab--active' : ''}" data-game-tab="slot">
                        <span class="tab-icon">🎰</span>
                        <div>
                            <div class="tab-title">Slot Machine</div>
                            <div class="tab-sub">Hingga 50× Multiplier</div>
                        </div>
                    </button>

                    <button class="casino-tab ${this.activeGame === 'coin' ? 'casino-tab--active casino-tab--gold' : ''}" data-game-tab="coin">
                        <span class="tab-icon">🪙</span>
                        <div>
                            <div class="tab-title">Coin Flip</div>
                            <div class="tab-sub">Double-or-Nothing Streak</div>
                        </div>
                    </button>

                    <button class="casino-tab ${this.activeGame === 'blackjack' ? 'casino-tab--active casino-tab--green' : ''}" data-game-tab="blackjack">
                        <span class="tab-icon">🃏</span>
                        <div>
                            <div class="tab-title">Blackjack 21</div>
                            <div class="tab-sub">Double Down & Insurance</div>
                        </div>
                    </button>
                </div>

                <!-- ── Main Game Board ── -->
                <div class="casino-board" style="background:rgba(255,255,255,0.01); border:1px solid var(--border-color); border-radius:20px; padding:2rem; min-height:480px;">

                    <!-- SLOT -->
                    <div id="game-slot-container" class="casino-section" style="display:${this.activeGame === 'slot' ? 'block' : 'none'};">
                        ${this.slot.getHTML()}
                    </div>

                    <!-- COIN FLIP -->
                    <div id="game-coin-container" class="casino-section" style="display:${this.activeGame === 'coin' ? 'block' : 'none'};">
                        ${this.coinFlip.getHTML()}
                    </div>

                    <!-- BLACKJACK -->
                    <div id="game-blackjack-container" class="casino-section" style="display:${this.activeGame === 'blackjack' ? 'block' : 'none'};">
                        ${this.blackjack.getHTML()}
                    </div>
                </div>

            </div>

            <style>
                /* ── Shared Casino Tab Styles ── */
                .casino-tab {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid var(--border-color);
                    padding: 0.85rem 1rem;
                    border-radius: 14px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    transition: all 0.2s;
                    font-family: inherit;
                    color: #fff;
                    text-align: left;
                }
                .casino-tab:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.14); }
                .casino-tab--active { background: rgba(244,63,94,0.07); border-color: #f43f5e; }
                .casino-tab--active.casino-tab--gold { background: rgba(251,191,36,0.07); border-color: #fbbf24; }
                .casino-tab--active.casino-tab--green { background: rgba(16,185,129,0.07); border-color: #10b981; }
                .tab-icon { font-size: 1.5rem; flex-shrink: 0; }
                .tab-title { font-weight: 800; font-size: 0.9rem; }
                .tab-sub { font-size: 0.68rem; color: rgba(255,255,255,0.45); margin-top: 0.1rem; }

                /* ── Shared winPulse animation ── */
                @keyframes winPulse {
                    0%,100% { text-shadow: 0 0 8px currentColor; }
                    50% { text-shadow: 0 0 24px currentColor, 0 0 48px currentColor; }
                }
                @keyframes jackpotFlash {
                    0%,100% { background: linear-gradient(135deg,#f43f5e,#be123c); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
                    50% { background: linear-gradient(135deg,#fbbf24,#f59e0b); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        `;

        import('../ViewManager.js').then(m => {
            const viewManager = m.default;
            viewManager.showDynamicView('Gedung Kasino', 'Aksi spekulasi & permainan keberuntungan', content);
            this._bindEvents();
        });
    }

    // ─────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────
    _bindEvents() {
        const container = document.getElementById('dynamic-view-content');
        if (!container) return;

        // Tab switching
        container.querySelectorAll('[data-game-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                const game = tab.dataset.gameTab;
                if (game === this.activeGame) return;

                // Reset engines when leaving their tab
                if (this.activeGame === 'coin') this.coinFlip.reset();
                if (this.activeGame === 'blackjack' && this.blackjack.state.isPlaying) this.blackjack.reset();

                this.activeGame = game;

                // Update tab appearance
                container.querySelectorAll('[data-game-tab]').forEach(t => {
                    t.className = 'casino-tab';
                });
                const tabColorMap = { slot: 'casino-tab--active', coin: 'casino-tab--active casino-tab--gold', blackjack: 'casino-tab--active casino-tab--green' };
                tab.className = `casino-tab ${tabColorMap[game] || 'casino-tab--active'}`;

                // Show/hide sections
                container.querySelectorAll('.casino-section').forEach(s => s.style.display = 'none');
                const target = document.getElementById(`game-${game}-container`);
                if (target) target.style.display = 'block';
            });
        });

        // Delegate events to engines
        this.slot.bindEvents(container, () => this.refreshBalanceDisplay());
        this.coinFlip.bindEvents(container, () => this.refreshBalanceDisplay());
        this.blackjack.bindEvents(container, () => this.refreshBalanceDisplay());
    }

    // ─────────────────────────────────────────────
    //  UTILITIES
    // ─────────────────────────────────────────────
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
