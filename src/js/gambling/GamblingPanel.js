/**
 * GamblingPanel.js - Casino Game Terminal
 * Features Goldy Crush Slot (6x3), Mega Lottery, and Spinning Wheel games.
 */

import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import { SlotEngine } from '../gambling/casino/SlotEngine.js';
import { LotteryEngine } from '../gambling/casino/LotteryEngine.js';
import { WheelEngine } from '../gambling/casino/WheelEngine.js';

class GamblingPanel {
    constructor() {
        const refresh = () => this.refreshBalanceDisplay();
        this.slot = new SlotEngine(refresh);
        this.lottery = new LotteryEngine(refresh);
        this.wheel = new WheelEngine(refresh);
        this.activeTab = 'slot'; // 'slot' | 'lottery' | 'wheel'
    }

    show() {
        const balance = gameState.getBalance();

        const content = `
            <div class="casino-root" style="padding:1rem; max-width:1100px; margin:0 auto; width:100%;">
                
                <!-- ── Premium Neon Royal Casino Sign ── -->
                <div style="text-align: center; margin-bottom: 1.25rem; position: relative;">
                    <div style="font-family: 'Outfit', sans-serif; font-size: 2.2rem; font-weight: 950; text-transform: uppercase; letter-spacing: 0.12em; color: #fff; text-shadow: 0 0 10px #fbbf24, 0 0 20px #f59e0b, 0 0 40px #d97706; display: inline-flex; align-items: center; gap: 0.75rem;">
                        <span>♠️</span>
                        <span style="background: linear-gradient(90deg, #fbbf24, #f59e0b, #d97706); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">ROYAL CASINO</span>
                        <span>♦️</span>
                    </div>
                    <!-- Small decorative accents -->
                    <div style="display: flex; justify-content: center; gap: 1.5rem; font-size: 0.75rem; color: rgba(251, 191, 36, 0.75); margin-top: 0.25rem; font-weight: 800; letter-spacing: 0.08em;">
                        <span>🎰 SLOT</span>
                        <span>•</span>
                        <span>🎡 RODA KEBERUNTUNGAN</span>
                        <span>•</span>
                        <span>🎫 LOTERE</span>
                    </div>
                </div>

                <!-- ── Header Stats ── -->
                <div class="casino-hdr" style="
                    background: linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(10,10,12,0.95) 100%);
                    border: 2px solid rgba(251,191,36,0.35);
                    box-shadow: 0 0 15px rgba(251,191,36,0.1);
                    border-radius: 20px;
                    padding: 1.25rem 1.75rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.25rem;
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
 
                <!-- ── Tab Switcher ── -->
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; background: rgba(0,0,0,0.4); padding: 5px; border-radius: 14px; border: 1.5px solid rgba(251,191,36,0.25); flex-wrap: wrap;">
                    <button class="casino-tab-btn" data-tab-id="slot" style="
                        flex: 1; min-width: 120px; padding: 0.65rem; border-radius: 10px; border: none; font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
                        background: ${this.activeTab === 'slot' ? 'var(--accent-primary-soft)' : 'transparent'};
                        color: ${this.activeTab === 'slot' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.6)'};
                    ">🎰 Goldy Crush Slot</button>
                    <button class="casino-tab-btn" data-tab-id="lottery" style="
                        flex: 1; min-width: 120px; padding: 0.65rem; border-radius: 10px; border: none; font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
                        background: ${this.activeTab === 'lottery' ? 'var(--accent-primary-soft)' : 'transparent'};
                        color: ${this.activeTab === 'lottery' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.6)'};
                    ">🎫 Mega Lottery</button>
                    <button class="casino-tab-btn" data-tab-id="wheel" style="
                        flex: 1; min-width: 120px; padding: 0.65rem; border-radius: 10px; border: none; font-weight: 800; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
                        background: ${this.activeTab === 'wheel' ? 'var(--accent-primary-soft)' : 'transparent'};
                        color: ${this.activeTab === 'wheel' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.6)'};
                    ">🎡 Spinning Wheel</button>
                </div>
 
                <!-- ── Main Game Board ── -->
                <div class="casino-board" style="position: relative; background: radial-gradient(circle at center, #1b1613 0%, #070504 100%); border: 3px solid #fbbf24; box-shadow: 0 0 25px rgba(251,191,36,0.35); border-radius: 20px; padding: 1.5rem; min-height: 480px; overflow: hidden;">
                    <!-- Floating suit ornaments in corners -->
                    <div style="position: absolute; top: 12px; left: 12px; font-size: 1.5rem; opacity: 0.12; color: #fff; pointer-events: none; user-select: none;">♠️</div>
                    <div style="position: absolute; top: 12px; right: 12px; font-size: 1.5rem; opacity: 0.12; color: #ef4444; pointer-events: none; user-select: none;">♥️</div>
                    <div style="position: absolute; bottom: 12px; left: 12px; font-size: 1.5rem; opacity: 0.12; color: #ef4444; pointer-events: none; user-select: none;">♦️</div>
                    <div style="position: absolute; bottom: 12px; right: 12px; font-size: 1.5rem; opacity: 0.12; color: #fff; pointer-events: none; user-select: none;">♣️</div>
                    
                    <!-- Active View Panel -->
                    <div id="casino-game-panel">
                        ${this.activeTab === 'slot' ? this.slot.getHTML() : (this.activeTab === 'lottery' ? this.lottery.getHTML() : this.wheel.getHTML())}
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
            viewManager.showDynamicView('Casino', 'Aksi spekulasi & permainan keberuntungan', content);
            this._bindEvents();
        });
    }

    _bindEvents() {
        const container = document.getElementById('dynamic-view-content');
        if (!container) return;

        // Bind tab buttons
        container.querySelectorAll('.casino-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tabId;
                if (tabId === this.activeTab) return;
                
                // Stop any running animations / spins
                this.slot.stopAutoSpin();
                this.activeTab = tabId;
                
                // Update tab styling
                container.querySelectorAll('.casino-tab-btn').forEach(b => {
                    const isActive = b.dataset.tabId === tabId;
                    b.style.background = isActive ? 'var(--accent-primary-soft)' : 'transparent';
                    b.style.color = isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.6)';
                });

                // Update active game content
                const gamePanel = document.getElementById('casino-game-panel');
                if (gamePanel) {
                    if (tabId === 'slot') {
                        gamePanel.innerHTML = this.slot.getHTML();
                        this.slot.bindEvents(gamePanel, () => this.refreshBalanceDisplay());
                    } else if (tabId === 'lottery') {
                        gamePanel.innerHTML = this.lottery.getHTML();
                        this.lottery.bindEvents(gamePanel, () => this.refreshBalanceDisplay());
                    } else {
                        gamePanel.innerHTML = this.wheel.getHTML();
                        this.wheel.bindEvents(gamePanel, () => this.refreshBalanceDisplay());
                    }
                }
            });
        });

        // Initial binding for active tab
        const gamePanel = document.getElementById('casino-game-panel');
        if (gamePanel) {
            if (this.activeTab === 'slot') {
                this.slot.bindEvents(gamePanel, () => this.refreshBalanceDisplay());
            } else if (this.activeTab === 'lottery') {
                this.lottery.bindEvents(gamePanel, () => this.refreshBalanceDisplay());
            } else {
                this.wheel.bindEvents(gamePanel, () => this.refreshBalanceDisplay());
            }
        }
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
