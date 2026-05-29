/**
 * SlotEngine.js - Premium Slot Machine Engine
 * Handles all slot machine game logic, animations, and rendering.
 */

import financeManager from '../../../finance/FinanceManager.js';
import gameState from '../../../game/GameState.js';
import ui from '../../UIManager.js';

const SYMBOLS = [
    { emoji: '👑', name: 'Mahkota',  baseWeight: 4,  multiplier3x: 50, multiplier2x: 2 },
    { emoji: '💎', name: 'Berlian',  baseWeight: 8,  multiplier3x: 20, multiplier2x: 1.5 },
    { emoji: '7️⃣', name: 'Lucky 7', baseWeight: 12, multiplier3x: 10, multiplier2x: 0 },
    { emoji: '🔔', name: 'Lonceng',  baseWeight: 18, multiplier3x: 6,  multiplier2x: 0 },
    { emoji: '🍒', name: 'Ceri',     baseWeight: 28, multiplier3x: 4,  multiplier2x: 0 },
    { emoji: '🍋', name: 'Lemon',    baseWeight: 30, multiplier3x: 2,  multiplier2x: 0 },
];

export class SlotEngine {
    constructor(onBalanceRefresh) {
        this.isSpinning = false;
        this.onBalanceRefresh = onBalanceRefresh;
    }

    getHTML() {
        return `
        <div style="max-width: 620px; margin: 0 auto; text-align: center;">
            <h3 style="font-weight: 900; color: #fff; margin-bottom: 0.5rem; font-size: 1.6rem; letter-spacing: -0.03em;">
                🎰 <span style="background: linear-gradient(90deg,#f43f5e,#fb923c); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">MESIN SLOT</span> HIGH-ROLLER
            </h3>
            <p style="color:rgba(255,255,255,0.4); font-size:0.8rem; margin-bottom:1.5rem; text-transform:uppercase; letter-spacing:0.1em;">Putar & raih jackpot hingga 50× taruhan</p>

            <!-- Slot Machine Cabinet -->
            <div class="slot-cabinet" style="position:relative; background: linear-gradient(180deg, #1a0a0f 0%, #0d0709 100%); border: 3px solid #f43f5e; border-radius: 28px; padding: 1.75rem; margin-bottom: 1.5rem; box-shadow: 0 0 40px rgba(244,63,94,0.2), inset 0 0 30px rgba(0,0,0,0.5);">
                
                <!-- Top lights row -->
                <div style="display:flex; justify-content:center; gap:0.5rem; margin-bottom:1rem;">
                    ${Array.from({length:7}, (_,i) => `<div class="slot-light" style="width:10px;height:10px;border-radius:50%;background:${i%2===0?'#f43f5e':'#fbbf24'};box-shadow:0 0 6px ${i%2===0?'#f43f5e':'#fbbf24'};animation:lightBlink ${0.5+i*0.1}s ease-in-out infinite alternate;"></div>`).join('')}
                </div>

                <!-- Reels Window -->
                <div class="slot-window" style="background:#07070a; border:3px solid rgba(255,255,255,0.06); border-radius:20px; padding:1rem; margin-bottom:1rem; position:relative; overflow:hidden;">
                    <!-- Payline indicator -->
                    <div style="position:absolute; top:50%; left:0; right:0; height:3px; background:rgba(244,63,94,0.4); transform:translateY(-50%); z-index:2; pointer-events:none;"></div>
                    
                    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; position:relative; z-index:1;">
                        <div class="slot-reel-wrap" style="overflow:hidden; height:110px; border-radius:12px; background:#0d0d14; border:2px solid rgba(255,255,255,0.04); position:relative;">
                            <div id="slot-reel-1" class="slot-reel-inner" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; font-size:3.5rem; transition:transform 0.1s;">💎</div>
                        </div>
                        <div class="slot-reel-wrap" style="overflow:hidden; height:110px; border-radius:12px; background:#0d0d14; border:2px solid rgba(255,255,255,0.04); position:relative;">
                            <div id="slot-reel-2" class="slot-reel-inner" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; font-size:3.5rem; transition:transform 0.1s;">💎</div>
                        </div>
                        <div class="slot-reel-wrap" style="overflow:hidden; height:110px; border-radius:12px; background:#0d0d14; border:2px solid rgba(255,255,255,0.04); position:relative;">
                            <div id="slot-reel-3" class="slot-reel-inner" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; font-size:3.5rem; transition:transform 0.1s;">💎</div>
                        </div>
                    </div>
                </div>

                <!-- Win Display -->
                <div id="slot-win-display" style="height:36px; display:flex; align-items:center; justify-content:center;">
                    <span style="color:rgba(255,255,255,0.25); font-size:0.8rem; font-style:italic; text-transform:uppercase; letter-spacing:0.1em;">Tekan PUTAR untuk memulai...</span>
                </div>
            </div>

            <!-- Bet Panel -->
            <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.05); border-radius:16px; padding:1.25rem; margin-bottom:1.25rem;">
                <label style="display:block; font-size:0.75rem; color:rgba(255,255,255,0.5); margin-bottom:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em;">JUMLAH TARUHAN</label>
                <div style="display:flex; gap:0.4rem; align-items:center; justify-content:center; margin-bottom:0.75rem;">
                    <span style="font-size:1.4rem; font-weight:900; color:#f43f5e;">$</span>
                    <input type="text" id="slot-bet-input" value="100,000" style="background:transparent; border:none; font-size:1.75rem; font-weight:900; color:#fff; width:200px; text-align:center; border-bottom:2px solid rgba(244,63,94,0.4); outline:none; padding:0.25rem 0;">
                </div>
                <div style="display:flex; gap:0.4rem; justify-content:center; flex-wrap:wrap;">
                    <button class="bet-chip slot-preset" data-val="10000">$10K</button>
                    <button class="bet-chip slot-preset" data-val="100000">$100K</button>
                    <button class="bet-chip slot-preset" data-val="1000000">$1M</button>
                    <button class="bet-chip slot-preset" data-val="10000000">$10M</button>
                    <button class="bet-chip bet-chip-max slot-preset" id="btn-slot-max">MAX</button>
                </div>
            </div>

            <!-- Spin Button -->
            <button id="btn-slot-spin" class="spin-btn" style="background:linear-gradient(135deg,#f43f5e 0%,#be123c 100%); border:none; font-weight:900; font-size:1.3rem; padding:1.1rem 3rem; width:100%; border-radius:14px; box-shadow:0 6px 20px rgba(244,63,94,0.45); cursor:pointer; transition:all 0.25s; color:#fff; letter-spacing:0.05em;">
                🎰 PUTAR SLOT
            </button>

            <!-- Paytable -->
            <div style="margin-top:1.5rem; border-top:1px solid rgba(255,255,255,0.05); padding-top:1.25rem;">
                <div style="font-size:0.7rem; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:0.75rem;">— TABEL PEMBAYARAN —</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.4rem; text-align:left; font-size:0.75rem;">
                    ${SYMBOLS.map(s => `
                    <div style="display:flex; align-items:center; gap:0.4rem; background:rgba(255,255,255,0.02); padding:0.4rem 0.6rem; border-radius:8px;">
                        <span>${s.emoji}${s.emoji}${s.emoji}</span>
                        <span style="color:rgba(255,255,255,0.5);">=</span>
                        <span style="color:#fbbf24; font-weight:800;">${s.multiplier3x}×</span>
                    </div>`).join('')}
                    <div style="display:flex; align-items:center; gap:0.4rem; background:rgba(255,255,255,0.02); padding:0.4rem 0.6rem; border-radius:8px; grid-column:span 2;">
                        <span>2 Kembar (💎/👑)</span>
                        <span style="color:rgba(255,255,255,0.5);">=</span>
                        <span style="color:#34d399; font-weight:800;">1.5× / 2×</span>
                    </div>
                </div>
            </div>
        </div>

        <style>
            @keyframes lightBlink { to { opacity: 0.2; } }
            @keyframes slotSpin {
                0% { transform: translateY(0); }
                100% { transform: translateY(-200%); }
            }
            @keyframes winPulse {
                0%, 100% { text-shadow: 0 0 8px currentColor; }
                50% { text-shadow: 0 0 24px currentColor, 0 0 48px currentColor; }
            }
            @keyframes jackpotFlash {
                0%, 100% { background: linear-gradient(135deg,#f43f5e 0%,#be123c 100%); }
                50% { background: linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%); }
            }
            .spin-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(244,63,94,0.6) !important; }
            .spin-btn:active:not(:disabled) { transform: translateY(0); }
            .spin-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .bet-chip {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.8);
                font-size: 0.75rem;
                font-weight: 700;
                padding: 0.35rem 0.75rem;
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .bet-chip:hover { background: rgba(244,63,94,0.15); border-color: rgba(244,63,94,0.4); color: #f43f5e; }
            .bet-chip-max { background: rgba(244,63,94,0.1); border-color: rgba(244,63,94,0.3); color: #f43f5e; }
        </style>
        `;
    }

    bindEvents(container, onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        const slotInput = document.getElementById('slot-bet-input');
        if (slotInput) {
            import('../../UIManager.js').then(m => m.default.setupNumericInput(slotInput));
        }

        container.querySelectorAll('.slot-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const balance = gameState.getBalance();
                const input = document.getElementById('slot-bet-input');
                if (!input) return;
                if (btn.id === 'btn-slot-max') {
                    input.value = balance.toLocaleString('en-US');
                } else {
                    input.value = parseInt(btn.dataset.val).toLocaleString('en-US');
                }
                input.dispatchEvent(new Event('input'));
            });
        });

        document.getElementById('btn-slot-spin')?.addEventListener('click', () => this.spin());
    }

    weightedRandom(luck) {
        const weights = SYMBOLS.map(s => s.baseWeight * (s.multiplier3x >= 20 ? luck : 1));
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < SYMBOLS.length; i++) {
            if (r < weights[i]) return SYMBOLS[i];
            r -= weights[i];
        }
        return SYMBOLS[SYMBOLS.length - 1];
    }

    async _animateReel(reelId, finalEmoji, delay) {
        return new Promise(resolve => {
            const el = document.getElementById(reelId);
            if (!el) { resolve(); return; }

            let ticks = 0;
            const maxTicks = 8 + delay * 4;
            const interval = setInterval(() => {
                el.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].emoji;
                el.style.filter = 'blur(2px)';
                ticks++;
                if (ticks >= maxTicks) {
                    clearInterval(interval);
                    el.textContent = finalEmoji;
                    el.style.filter = 'none';
                    el.style.transform = 'scale(1.15)';
                    setTimeout(() => { el.style.transform = 'scale(1)'; }, 200);
                    resolve();
                }
            }, 80);
        });
    }

    async spin() {
        if (this.isSpinning) return;

        const input = document.getElementById('slot-bet-input');
        const betAmount = input?.getNumericValue ? input.getNumericValue() : (parseInt(input?.value.replace(/,/g, '') || '0', 10));

        if (betAmount <= 0) { ui.error('Masukkan jumlah taruhan yang valid!'); return; }
        const balance = gameState.getBalance();
        if (betAmount > balance) { ui.error('Saldo tidak mencukupi!'); return; }

        this.isSpinning = true;
        const spinBtn = document.getElementById('btn-slot-spin');
        if (spinBtn) { spinBtn.disabled = true; spinBtn.innerHTML = '<span style="animation:spin 0.5s linear infinite;display:inline-block;">🎰</span> MEMUTAR...'; }

        const winDisplay = document.getElementById('slot-win-display');
        if (winDisplay) winDisplay.innerHTML = `<span style="color:rgba(255,255,255,0.3); font-size:0.8rem; font-style:italic;">Memutar...</span>`;

        // Deduct bet
        financeManager.addExpense(betAmount, 'Lainnya', 'Taruhan Slot');
        this.onBalanceRefresh?.();

        const donations = gameState.get('donations') || { luckMultiplier: 1.0 };
        const luck = donations.luckMultiplier || 1.0;

        const sym1 = this.weightedRandom(luck);
        const sym2 = this.weightedRandom(luck);
        const sym3 = this.weightedRandom(luck);

        // Animate reels sequentially
        await this._animateReel('slot-reel-1', sym1.emoji, 0);
        await new Promise(r => setTimeout(r, 200));
        await this._animateReel('slot-reel-2', sym2.emoji, 1);
        await new Promise(r => setTimeout(r, 200));
        await this._animateReel('slot-reel-3', sym3.emoji, 2);

        // Evaluate result
        this._evaluate(sym1, sym2, sym3, betAmount);

        this.isSpinning = false;
        if (spinBtn) { spinBtn.disabled = false; spinBtn.innerHTML = '🎰 PUTAR SLOT'; }
    }

    _evaluate(s1, s2, s3, bet) {
        const winDisplay = document.getElementById('slot-win-display');
        let winMultiplier = 0;
        let winLabel = '';
        let isJackpot = false;

        if (s1.emoji === s2.emoji && s2.emoji === s3.emoji) {
            winMultiplier = s1.multiplier3x;
            winLabel = `${s1.emoji}${s1.emoji}${s1.emoji} — ${s1.name.toUpperCase()}! ${winMultiplier}×`;
            isJackpot = winMultiplier >= 20;
        } else if (s1.emoji === s2.emoji || s2.emoji === s3.emoji || s1.emoji === s3.emoji) {
            const matchSym = (s1.emoji === s2.emoji) ? s1 : (s2.emoji === s3.emoji ? s2 : s1);
            winMultiplier = matchSym.multiplier2x;
            if (winMultiplier > 0) {
                winLabel = `Dua ${matchSym.emoji} — ${matchSym.name} Kembar! ${winMultiplier}×`;
            }
        }

        if (winMultiplier > 0) {
            const winAmount = Math.round(bet * winMultiplier);
            financeManager.addIncome(winAmount, 'Investasi', `Kemenangan Slot (${winLabel})`);
            this.onBalanceRefresh?.();

            if (isJackpot) {
                if (winDisplay) winDisplay.innerHTML = `<span style="font-weight:900; font-size:1.1rem; color:#fbbf24; animation:jackpotFlash 0.5s infinite; padding:0.4rem 1rem; border-radius:8px;">🏆 JACKPOT! +$${financeManager.formatCurrency(winAmount)}</span>`;
                ui.success(`JACKPOT! +$ ${financeManager.formatCurrency(winAmount)} — ${winLabel}`, '🎰 Slot Jackpot!');
            } else {
                if (winDisplay) winDisplay.innerHTML = `<span style="font-weight:800; font-size:0.95rem; color:#34d399; animation:winPulse 1s ease-in-out infinite;">✅ MENANG +$${financeManager.formatCurrency(winAmount)} (${winLabel})</span>`;
                ui.success(`MENANG +$ ${financeManager.formatCurrency(winAmount)} — ${winLabel}`, '🎰 Slot Win');
            }
        } else {
            if (winDisplay) winDisplay.innerHTML = `<span style="color:rgba(255,255,255,0.3); font-size:0.8rem; font-style:italic;">Tidak ada kombinasi. Coba lagi!</span>`;
            ui.toast({ type: 'warning', title: 'Kalah', message: 'Tidak ada kombinasi. Coba lagi!' });
        }
    }
}
