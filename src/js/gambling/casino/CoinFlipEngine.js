/**
 * CoinFlipEngine.js - Double-or-Nothing Coin Flip Engine
 * Handles coin flip game logic, streak tracking, and animations.
 */

import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../core/GameState.js';
import ui from '../../ui/UIManager.js';

export class CoinFlipEngine {
    constructor(onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;
        this.state = {
            currentBet: 0,
            accumulatedWin: 0,
            streak: 0,
            isFlipping: false,
        };
        this._totalRotation = 0;
    }

    getHTML() {
        return `
        <div style="max-width: 580px; margin: 0 auto; text-align: center;">
            <h3 style="font-weight: 900; color: #fff; margin-bottom: 0.5rem; font-size: 1.6rem; letter-spacing: -0.03em;">
                🪙 <span style="background: linear-gradient(90deg,#fbbf24,#f59e0b); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">COIN FLIP</span> DOUBLE OR NOTHING
            </h3>
            <p style="color:rgba(255,255,255,0.4); font-size:0.8rem; margin-bottom:1.5rem; text-transform:uppercase; letter-spacing:0.1em;">Pilih sisi, lipat gandakan kemenangan setiap ronde</p>

            <!-- Streak Status Bar -->
            <div id="coin-streak-bar" style="background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.08); border-radius:16px; padding:0.9rem 1.5rem; margin-bottom:1.5rem; display:grid; grid-template-columns:1fr auto 1fr; gap:1rem; align-items:center;">
                <div style="text-align:left;">
                    <div style="font-size:0.65rem; color:rgba(255,255,255,0.35); text-transform:uppercase; font-weight:700; letter-spacing:0.1em; margin-bottom:0.25rem;">STREAK</div>
                    <div style="font-size:1.5rem; font-weight:900; color:#fbbf24;" id="coin-streak-count">0</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:0.25rem; align-items:center;">
                    ${Array.from({length:5}, (_,i) => `<div class="streak-dot" id="streak-dot-${i}" style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.08);transition:all 0.3s;"></div>`).join('')}
                </div>
                <div style="text-align:right;">
                    <div style="font-size:0.65rem; color:rgba(255,255,255,0.35); text-transform:uppercase; font-weight:700; letter-spacing:0.1em; margin-bottom:0.25rem;">AKUMULASI</div>
                    <div style="font-size:1.1rem; font-weight:900; color:#34d399;" id="coin-accumulated-win">$ 0</div>
                </div>
            </div>

            <!-- Coin 3D Display -->
            <div style="height:180px; display:flex; align-items:center; justify-content:center; margin-bottom:1.75rem; perspective:800px;">
                <div id="casino-coin" class="coin-3d-wrap">
                    <div class="coin-face coin-heads">
                        <div style="font-size:2.8rem;">🪙</div>
                        <div style="font-size:0.65rem; font-weight:900; letter-spacing:0.15em; margin-top:0.25rem; color:#92400e;">HEADS</div>
                    </div>
                    <div class="coin-face coin-tails">
                        <div style="font-size:2.8rem;">🔱</div>
                        <div style="font-size:0.65rem; font-weight:900; letter-spacing:0.15em; margin-top:0.25rem; color:#1e3a5f;">TAILS</div>
                    </div>
                </div>
            </div>

            <!-- Result Flash -->
            <div id="coin-result-flash" style="height:30px; display:flex; align-items:center; justify-content:center; margin-bottom:1rem;">
                <span style="color:rgba(255,255,255,0.2); font-size:0.8rem; font-style:italic;">Pilih sisi koin untuk memulai</span>
            </div>

            <!-- Bet Panel (hidden during streak) -->
            <div id="coin-bet-panel" style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.05); border-radius:16px; padding:1.25rem; margin-bottom:1.25rem;">
                <label style="display:block; font-size:0.75rem; color:rgba(255,255,255,0.5); margin-bottom:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em;">TARUHAN AWAL</label>
                <div style="display:flex; gap:0.4rem; align-items:center; justify-content:center; margin-bottom:0.75rem;">
                    <span style="font-size:1.4rem; font-weight:900; color:#fbbf24;">$</span>
                    <input type="text" id="coin-bet-input" value="50,000" style="background:transparent; border:none; font-size:1.75rem; font-weight:900; color:#fff; width:200px; text-align:center; border-bottom:2px solid rgba(251,191,36,0.4); outline:none; padding:0.25rem 0;">
                </div>
                <div style="display:flex; gap:0.4rem; justify-content:center; flex-wrap:wrap;">
                    <button class="bet-chip-yellow coin-preset" data-val="10000">$10K</button>
                    <button class="bet-chip-yellow coin-preset" data-val="100000">$100K</button>
                    <button class="bet-chip-yellow coin-preset" data-val="1000000">$1M</button>
                    <button class="bet-chip-yellow coin-preset bet-chip-max-yellow" id="btn-coin-max">MAX</button>
                </div>
            </div>

            <!-- Choice Buttons -->
            <div id="coin-choices-panel" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
                <button class="coin-choice-btn coin-heads-btn" data-coin-pick="heads">
                    <span style="font-size:1.75rem;">🪙</span>
                    <div>
                        <div style="font-weight:900; font-size:0.95rem;">HEADS</div>
                        <div style="font-size:0.7rem; opacity:0.6;">Gambar</div>
                    </div>
                </button>
                <button class="coin-choice-btn coin-tails-btn" data-coin-pick="tails">
                    <span style="font-size:1.75rem;">🔱</span>
                    <div>
                        <div style="font-weight:900; font-size:0.95rem;">TAILS</div>
                        <div style="font-size:0.7rem; opacity:0.6;">Angka</div>
                    </div>
                </button>
            </div>

            <!-- Cash Out Button -->
            <button id="btn-coin-cashout" style="display:none; background:linear-gradient(135deg,#10b981 0%,#059669 100%); border:none; font-weight:900; font-size:1.2rem; padding:1rem 3rem; width:100%; border-radius:14px; box-shadow:0 6px 20px rgba(16,185,129,0.4); cursor:pointer; color:#fff; transition:all 0.25s;">
                💵 CASH OUT — Ambil Kemenangan
            </button>

            <style>
                .coin-3d-wrap {
                    width: 120px;
                    height: 120px;
                    position: relative;
                    transform-style: preserve-3d;
                    transition: transform 1.6s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                .coin-face {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    backface-visibility: hidden;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .coin-heads {
                    background: radial-gradient(circle at 35% 35%, #fef9c3, #facc15 60%, #ca8a04);
                    border: 5px solid #fbbf24;
                    box-shadow: 0 0 25px rgba(251,191,36,0.4), inset 0 2px 4px rgba(255,255,255,0.4);
                    color: #78350f;
                }
                .coin-tails {
                    background: radial-gradient(circle at 35% 35%, #e2e8f0, #94a3b8 60%, #475569);
                    border: 5px solid #94a3b8;
                    box-shadow: 0 0 25px rgba(148,163,184,0.3), inset 0 2px 4px rgba(255,255,255,0.2);
                    color: #0f172a;
                    transform: rotateY(180deg);
                }
                .coin-choice-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem 1.25rem;
                    border-radius: 14px;
                    border: 1px solid;
                    cursor: pointer;
                    font-family: inherit;
                    text-align: left;
                    transition: all 0.2s;
                    color: #fff;
                }
                .coin-heads-btn {
                    background: linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.15));
                    border-color: rgba(251,191,36,0.35);
                }
                .coin-heads-btn:hover:not(:disabled) { background: rgba(251,191,36,0.22); border-color: #fbbf24; transform: translateY(-2px); }
                .coin-tails-btn {
                    background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.08));
                    border-color: rgba(255,255,255,0.15);
                }
                .coin-tails-btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.3); transform: translateY(-2px); }
                .coin-choice-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; }
                .bet-chip-yellow {
                    background: rgba(251,191,36,0.07);
                    border: 1px solid rgba(251,191,36,0.2);
                    color: rgba(251,191,36,0.8);
                    font-size: 0.75rem; font-weight: 700;
                    padding: 0.35rem 0.75rem; border-radius: 20px; cursor: pointer; transition: all 0.2s;
                }
                .bet-chip-yellow:hover { background: rgba(251,191,36,0.18); border-color: #fbbf24; color: #fbbf24; }
                .bet-chip-max-yellow { background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.3); color: #fbbf24; }
                @keyframes streakDotPop { 0% { transform: scale(0); } 60% { transform: scale(1.3); } 100% { transform: scale(1); } }
            </style>
        </div>
        `;
    }

    bindEvents(container, onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        const coinInput = document.getElementById('coin-bet-input');
        if (coinInput) import('../../ui/UIManager.js').then(m => m.default.setupNumericInput(coinInput));

        container.querySelectorAll('.coin-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById('coin-bet-input');
                if (!input) return;
                const balance = gameState.getBalance();
                input.value = btn.id === 'btn-coin-max'
                    ? balance.toLocaleString('en-US')
                    : parseInt(btn.dataset.val).toLocaleString('en-US');
                input.dispatchEvent(new Event('input'));
            });
        });

        container.querySelectorAll('[data-coin-pick]').forEach(btn => {
            btn.addEventListener('click', () => this.flip(btn.dataset.coinPick));
        });

        document.getElementById('btn-coin-cashout')?.addEventListener('click', () => this.cashOut());
    }

    _updateStreakUI() {
        const countEl = document.getElementById('coin-streak-count');
        const winEl = document.getElementById('coin-accumulated-win');
        if (countEl) countEl.textContent = this.state.streak;
        if (winEl) winEl.textContent = `$ ${financeManager.formatCurrency(this.state.accumulatedWin)}`;

        for (let i = 0; i < 5; i++) {
            const dot = document.getElementById(`streak-dot-${i}`);
            if (!dot) continue;
            if (i < this.state.streak) {
                dot.style.background = '#fbbf24';
                dot.style.boxShadow = '0 0 8px #fbbf24';
                if (i === this.state.streak - 1) {
                    dot.style.animation = 'streakDotPop 0.4s ease-out';
                    setTimeout(() => { dot.style.animation = ''; }, 400);
                }
            } else {
                dot.style.background = 'rgba(255,255,255,0.08)';
                dot.style.boxShadow = 'none';
            }
        }
    }

    reset() {
        this.state = { currentBet: 0, accumulatedWin: 0, streak: 0, isFlipping: false };
        this._totalRotation = 0;

        const betPanel = document.getElementById('coin-bet-panel');
        const cashoutBtn = document.getElementById('btn-coin-cashout');
        const choices = document.getElementById('coin-choices-panel');
        if (betPanel) betPanel.style.display = 'block';
        if (cashoutBtn) cashoutBtn.style.display = 'none';
        if (choices) choices.style.display = 'grid';

        this._updateStreakUI();
    }

    async flip(pick) {
        if (this.state.isFlipping) return;

        let betAmount = 0;
        if (this.state.streak === 0) {
            const input = document.getElementById('coin-bet-input');
            betAmount = input?.getNumericValue ? input.getNumericValue() : parseInt(input?.value.replace(/,/g, '') || '0', 10);
            if (betAmount <= 0) { ui.error('Masukkan jumlah taruhan yang valid!'); return; }
            const balance = gameState.getBalance();
            if (betAmount > balance) { ui.error('Saldo tidak mencukupi!'); return; }
            financeManager.addExpense(betAmount, 'Lainnya', 'Taruhan Coin Flip');
            this.state.currentBet = betAmount;
            this.state.accumulatedWin = betAmount;
            this.onBalanceRefresh?.();
        } else {
            betAmount = this.state.accumulatedWin;
        }

        this.state.isFlipping = true;

        // Disable all buttons
        document.querySelectorAll('.coin-choice-btn').forEach(b => b.disabled = true);
        document.getElementById('btn-coin-cashout').style.display = 'none';

        const resultEl = document.getElementById('coin-result-flash');
        if (resultEl) resultEl.innerHTML = `<span style="color:rgba(255,255,255,0.3); font-size:0.85rem; animation: lightBlink 0.3s infinite alternate;">🪙 Melempar koin...</span>`;

        // Animate coin
        const coin = document.getElementById('casino-coin');
        const spins = 5 + Math.floor(Math.random() * 4); // 5-8 full spins
        const isHeadsResult = Math.random() < 0.5;
        // heads = 0°, tails = 180° (after all spins)
        const baseRotation = spins * 360;
        const finalOffset = isHeadsResult ? 0 : 180;
        this._totalRotation += baseRotation + finalOffset;
        coin.style.transform = `rotateY(${this._totalRotation}deg)`;

        await new Promise(r => setTimeout(r, 1700));

        this.state.isFlipping = false;

        const actualSide = isHeadsResult ? 'heads' : 'tails';
        const won = pick === actualSide;

        if (won) {
            this.state.streak += 1;
            this.state.accumulatedWin *= 2;
            this._updateStreakUI();

            if (resultEl) resultEl.innerHTML = `<span style="font-weight:800; color:#34d399; font-size:0.95rem; animation:winPulse 1s infinite;">✅ BENAR! Koin: ${actualSide.toUpperCase()} — Streak x${this.state.streak}! Akumulasi 2×!</span>`;
            
            document.getElementById('coin-bet-panel').style.display = 'none';
            document.getElementById('btn-coin-cashout').style.display = 'block';

            // Re-enable choice buttons
            document.querySelectorAll('.coin-choice-btn').forEach(b => b.disabled = false);

            ui.success(`BENAR! ${actualSide.toUpperCase()} · Streak x${this.state.streak} · Akumulasi: $${financeManager.formatCurrency(this.state.accumulatedWin)}`, '🪙 Coin Flip Win!');
        } else {
            if (resultEl) resultEl.innerHTML = `<span style="font-weight:800; color:#ef4444; font-size:0.95rem;">❌ SALAH! Koin: ${actualSide.toUpperCase()} — Semua taruhan hilang!</span>`;
            ui.error(`Salah tebak! Koin mendarat di ${actualSide.toUpperCase()}. Semua kemenangan hangus!`, '🪙 Coin Flip Kalah');

            await new Promise(r => setTimeout(r, 1200));
            this.reset();
            this.onBalanceRefresh?.();
        }
    }

    cashOut() {
        if (this.state.streak === 0 || this.state.isFlipping) return;
        const payout = this.state.accumulatedWin;
        financeManager.addIncome(payout, 'Investasi', `Kemenangan Coin Flip Streak ×${this.state.streak}`);
        ui.success(`CASH OUT! Anda membawa $${financeManager.formatCurrency(payout)} · Streak ×${this.state.streak}`, '🏆 Payout Kasino!');
        this.reset();
        this.onBalanceRefresh?.();
    }
}
