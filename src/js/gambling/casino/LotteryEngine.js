/**
 * LotteryEngine.js - Interactive Mega Lottery Engine
 * Handles tickets, lucky number selection, bouncing draw animation, and progressive jackpots.
 */

import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../core/GameState.js';
import ui from '../../ui/UIManager.js';

export class LotteryEngine {
    constructor(onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;
        this.selectedNumbers = [];
        this.isDrawing = false;
        this.ticketCost = 10000; // $10,000
    }

    getJackpot() {
        let jp = gameState.get('casino.lotteryJackpot');
        if (jp === undefined || jp === null) {
            jp = 10000000; // start at $10,000,000
            gameState.set('casino.lotteryJackpot', jp);
        }
        return jp;
    }

    setJackpot(amount) {
        gameState.set('casino.lotteryJackpot', amount);
    }

    getHistory() {
        return gameState.get('casino.lotteryHistory') || [];
    }

    saveHistory(history) {
        gameState.set('casino.lotteryHistory', history.slice(0, 10));
    }

    getHTML() {
        const jackpot = this.getJackpot();
        const history = this.getHistory();
        
        // Render 1-20 number picker
        let numberGrid = '';
        for (let i = 1; i <= 20; i++) {
            const isSelected = this.selectedNumbers.includes(i);
            numberGrid += `
                <button class="lottery-num-btn ${isSelected ? 'selected' : ''}" data-num="${i}" style="
                    width: 46px; height: 46px; border-radius: 50%;
                    background: ${isSelected ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.04)'};
                    color: ${isSelected ? '#000' : 'rgba(255,255,255,0.8)'};
                    border: 1px solid ${isSelected ? '#fbbf24' : 'rgba(255,255,255,0.1)'};
                    font-weight: 800; font-size: 1rem; cursor: pointer; transition: all 0.2s;
                ">${i}</button>
            `;
        }

        // Render history logs
        const historyHTML = history.length === 0
            ? `<div style="font-size:0.75rem; color:rgba(255,255,255,0.3); font-style:italic;">Belum ada riwayat undian.</div>`
            : history.map(h => {
                const isWin = h.matches > 0;
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding: 0.5rem 0.75rem; border-radius: 8px; font-size:0.75rem; border:1px solid rgba(255,255,255,0.03);">
                        <div style="display:flex; align-items:center; gap:0.4rem;">
                            <span>🎫 ${h.selected.join(', ')}</span>
                            <span style="color:rgba(255,255,255,0.3);">vs</span>
                            <span style="color:#fbbf24; font-weight:700;">🔮 ${h.drawn.join(', ')}</span>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:700; color:${isWin ? '#34d399' : 'var(--text-muted)'}">${h.matches} Match (${isWin ? '+' + financeManager.formatCurrency(h.payout) : 'Kalah'})</div>
                        </div>
                    </div>
                `;
            }).join('');

        return `
        <div style="max-width: 620px; margin: 0 auto; text-align: center; animation: fade-up 0.3s ease;">
            <h3 style="font-weight: 900; color: #fff; margin-bottom: 0.5rem; font-size: 1.6rem; letter-spacing: -0.03em;">
                🎫 <span style="background: linear-gradient(90deg,#f59e0b,#fbbf24); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">MEGA LOTTERY</span>
            </h3>
            <p style="color:rgba(255,255,255,0.4); font-size:0.8rem; margin-bottom:1.5rem; text-transform:uppercase; letter-spacing:0.1em;">Pilih 4 Nomor Keberuntungan Anda &amp; Raih Jackpot Progresif!</p>

            <!-- Progressive Jackpot Display -->
            <div style="
                background: linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(20,15,10,0.9) 100%);
                border: 2px dashed #f59e0b;
                border-radius: 20px;
                padding: 1.25rem;
                margin-bottom: 1.5rem;
                box-shadow: 0 0 20px rgba(245,158,11,0.1);
            ">
                <div style="font-size:0.7rem; color:rgba(255,255,255,0.5); font-weight:800; letter-spacing:0.15em; text-transform:uppercase;">GRAND JACKPOT PROGRESIF</div>
                <div style="font-size: 2.2rem; font-weight: 900; color: #fbbf24; margin-top: 0.25rem; text-shadow: 0 0 12px rgba(251,191,36,0.3); display: flex; justify-content: center; align-items: baseline; gap: 0.3rem;">
                    <span style="font-size: 1.5rem;">$</span>
                    <span id="lottery-jackpot-pool-val">${jackpot.toLocaleString('en-US')}</span>
                </div>
                <div style="font-size: 0.72rem; color: rgba(255,255,255,0.4); margin-top: 0.25rem;">Biaya tiket: $ 10.000 (15% ditambahkan ke kolam jackpot)</div>
            </div>

            <!-- Number Picker Board -->
            <div style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.06); border-radius:20px; padding:1.5rem; margin-bottom:1.5rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <div style="text-align:left;">
                        <h4 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0;">Pilih 4 Nomor (1 - 20)</h4>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem;" id="lottery-selected-status">Terpilih: 0 / 4</div>
                    </div>
                    <button id="btn-lottery-quickpick" class="bet-chip" style="border-radius:8px; font-size:0.75rem; font-weight:800; padding:6px 12px;">⚡ QUICK PICK</button>
                </div>

                <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; justify-items: center; margin-bottom: 1.25rem;">
                    ${numberGrid}
                </div>

                <!-- Ticket Amount Selector -->
                <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:1rem; display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
                    <div style="text-align:left;">
                        <label style="display:block; font-size:0.75rem; color:rgba(255,255,255,0.5); margin-bottom:0.15rem; font-weight:700;">JUMLAH TIKET</label>
                        <input type="number" id="lottery-ticket-qty" value="1" min="1" max="100" style="background:var(--bg-surface); border:1px solid var(--border-color); font-size:1.1rem; font-weight:700; color:#fff; width:100px; text-align:center; border-radius:8px; padding: 0.35rem 0.5rem; outline:none;">
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:0.75rem; color:rgba(255,255,255,0.5); font-weight:700;">TOTAL BIAYA</div>
                        <div style="font-size:1.4rem; font-weight:900; color:#fff; margin-top:0.1rem;" id="lottery-total-cost-display">$ 10,000</div>
                    </div>
                </div>
            </div>

            <!-- Draw Ball Animation Area -->
            <div id="lottery-draw-area" style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.05); border-radius:20px; padding:1.5rem; margin-bottom:1.5rem; position:relative; overflow:hidden; min-height:110px; display:flex; align-items:center; justify-content:center;">
                <div id="lottery-balls-container" style="display:flex; gap:1.25rem; justify-content:center; align-items:center; width:100%;">
                    <span style="color:rgba(255,255,255,0.2); font-size:0.8rem; font-style:italic;">Hasil undian akan muncul di sini...</span>
                </div>
            </div>

            <!-- Buy & Draw Action -->
            <button id="btn-lottery-buy-draw" class="spin-btn" style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%); border:none; font-weight:900; font-size:1.3rem; padding:1.1rem 3rem; width:100%; border-radius:14px; box-shadow:0 6px 20px rgba(245,158,11,0.3); cursor:pointer; transition:all 0.25s; color:#fff; letter-spacing:0.05em; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                🎫 BELI &amp; UNDI SEKARANG
            </button>

            <!-- Draw Payout table & History -->
            <div style="margin-top:2rem; border-top:1px solid rgba(255,255,255,0.05); padding-top:1.5rem; display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; text-align:left;">
                <div>
                    <div style="font-size:0.7rem; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.1em; font-weight:800; margin-bottom:0.75rem;">— KELAS HADIAH TIKET —</div>
                    <div style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.75rem;">
                        <div style="display:flex; justify-content:space-between; background:rgba(255,255,255,0.02); padding:0.4rem 0.6rem; border-radius:6px;">
                            <span>4 Match (Jackpot)</span>
                            <span style="color:#fbbf24; font-weight:800;">100% JACKPOT</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; background:rgba(255,255,255,0.02); padding:0.4rem 0.6rem; border-radius:6px;">
                            <span>3 Match</span>
                            <span style="color:#fbbf24; font-weight:800;">100× Taruhan</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; background:rgba(255,255,255,0.02); padding:0.4rem 0.6rem; border-radius:6px;">
                            <span>2 Match</span>
                            <span style="color:#fbbf24; font-weight:800;">10x Taruhan</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; background:rgba(255,255,255,0.02); padding:0.4rem 0.6rem; border-radius:6px;">
                            <span>1 Match</span>
                            <span style="color:#fbbf24; font-weight:800;">2x Taruhan</span>
                        </div>
                    </div>
                </div>
                <div>
                    <div style="font-size:0.7rem; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.1em; font-weight:800; margin-bottom:0.75rem;">— RIWAYAT UNDIAN —</div>
                    <div style="display:flex; flex-direction:column; gap:0.4rem;" id="lottery-history-list">
                        ${historyHTML}
                    </div>
                </div>
            </div>
        </div>

        <style>
            .lottery-num-btn:hover:not(.selected) {
                background: rgba(255,255,255,0.08) !important;
                border-color: rgba(255,255,255,0.2) !important;
                color: #fff !important;
            }
            @keyframes ballPop {
                0% { transform: scale(0) rotate(-180deg); opacity: 0; }
                60% { transform: scale(1.2) rotate(10deg); opacity: 1; }
                100% { transform: scale(1) rotate(0deg); }
            }
            @keyframes ballSpin {
                to { transform: rotate(360deg); }
            }
            .lottery-ball {
                width: 52px; height: 52px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                font-weight: 900; font-size: 1.25rem; color: #000;
                box-shadow: 0 4px 10px rgba(0,0,0,0.5), inset -4px -4px 12px rgba(0,0,0,0.3), inset 4px 4px 12px rgba(255,255,255,0.4);
                text-shadow: 0 1px 0 rgba(255,255,255,0.2);
                animation: ballPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
        </style>
        `;
    }

    bindEvents(container, onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        // Qty input listener
        const qtyInput = document.getElementById('lottery-ticket-qty');
        if (qtyInput) {
            qtyInput.addEventListener('input', () => {
                let val = parseInt(qtyInput.value, 10);
                if (isNaN(val) || val <= 0) val = 1;
                if (val > 100) val = 100;
                qtyInput.value = val;
                
                const costDisplay = document.getElementById('lottery-total-cost-display');
                if (costDisplay) costDisplay.textContent = '$ ' + (val * this.ticketCost).toLocaleString();
            });
        }

        // Toggle numbers
        container.querySelectorAll('.lottery-num-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isDrawing) return;
                const num = parseInt(btn.dataset.num, 10);
                
                if (this.selectedNumbers.includes(num)) {
                    this.selectedNumbers = this.selectedNumbers.filter(n => n !== num);
                } else {
                    if (this.selectedNumbers.length >= 4) {
                        ui.toast({ type: 'warning', title: 'Limit Pemilihan', message: 'Anda hanya bisa memilih maksimal 4 angka!' });
                        return;
                    }
                    this.selectedNumbers.push(num);
                }
                
                this.selectedNumbers.sort((a, b) => a - b);
                this.refreshSelections(container);
            });
        });

        // Quickpick
        document.getElementById('btn-lottery-quickpick')?.addEventListener('click', () => {
            if (this.isDrawing) return;
            const nums = [];
            while (nums.length < 4) {
                const r = Math.floor(Math.random() * 20) + 1;
                if (!nums.includes(r)) nums.push(r);
            }
            this.selectedNumbers = nums.sort((a, b) => a - b);
            this.refreshSelections(container);
        });

        // Buy & Draw Action
        document.getElementById('btn-lottery-buy-draw')?.addEventListener('click', () => this.buyAndDraw());
    }

    refreshSelections(container) {
        container.querySelectorAll('.lottery-num-btn').forEach(btn => {
            const num = parseInt(btn.dataset.num, 10);
            const isSelected = this.selectedNumbers.includes(num);
            if (isSelected) {
                btn.classList.add('selected');
                btn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                btn.style.color = '#000';
                btn.style.borderColor = '#fbbf24';
            } else {
                btn.classList.remove('selected');
                btn.style.background = 'rgba(255,255,255,0.04)';
                btn.style.color = 'rgba(255,255,255,0.8)';
                btn.style.borderColor = 'rgba(255,255,255,0.1)';
            }
        });

        const statusEl = document.getElementById('lottery-selected-status');
        if (statusEl) statusEl.textContent = `Terpilih: ${this.selectedNumbers.length} / 4`;
    }

    async buyAndDraw() {
        if (this.isDrawing) return;
        if (this.selectedNumbers.length !== 4) {
            ui.error('Pilih tepat 4 nomor keberuntungan terlebih dahulu!');
            return;
        }

        const qtyInput = document.getElementById('lottery-ticket-qty');
        const qty = parseInt(qtyInput ? qtyInput.value : '1', 10) || 1;
        const totalCost = qty * this.ticketCost;

        const balance = gameState.getBalance();
        if (totalCost > balance) {
            ui.error('Saldo kas Anda tidak mencukupi untuk membeli tiket lotre!');
            return;
        }

        this.isDrawing = true;
        const drawBtn = document.getElementById('btn-lottery-buy-draw');
        if (drawBtn) {
            drawBtn.disabled = true;
            drawBtn.innerHTML = '🔮 MENGUNDI BOLA ANGKA...';
        }

        // Deduct ticket costs
        financeManager.addExpense(totalCost, 'Lainnya', `Membeli ${qty} Tiket Lotre`);
        
        // Boost progressive jackpot pool by 15% of ticket sales
        const addedJp = Math.round(totalCost * 0.15);
        let jackpot = this.getJackpot() + addedJp;
        this.setJackpot(jackpot);

        const jpDisplay = document.getElementById('lottery-jackpot-pool-val');
        if (jpDisplay) jpDisplay.textContent = jackpot.toLocaleString('en-US');

        this.onBalanceRefresh?.();

        // Start drawing animation
        const ballsContainer = document.getElementById('lottery-balls-container');
        if (ballsContainer) ballsContainer.innerHTML = '';

        // Draw 4 random numbers from 1 to 20
        const drawnNums = [];
        while (drawnNums.length < 4) {
            const r = Math.floor(Math.random() * 20) + 1;
            if (!drawnNums.includes(r)) drawnNums.push(r);
        }
        drawnNums.sort((a, b) => a - b);

        const ballColors = [
            'linear-gradient(135deg, #ef4444, #b91c1c)', // red
            'linear-gradient(135deg, #3b82f6, #1d4ed8)', // blue
            'linear-gradient(135deg, #10b981, #047857)', // green
            'linear-gradient(135deg, #fbbf24, #d97706)', // yellow/orange
        ];

        // Animate drawing balls one by one
        for (let i = 0; i < 4; i++) {
            // Spinning placeholder ball
            if (ballsContainer) {
                const placeholder = document.createElement('div');
                placeholder.className = 'lottery-ball';
                placeholder.style.background = 'rgba(255,255,255,0.05)';
                placeholder.style.color = '#fff';
                placeholder.style.border = '2px dashed rgba(255,255,255,0.2)';
                placeholder.innerHTML = '🔮';
                ballsContainer.appendChild(placeholder);

                // Wait 800ms spinning
                await new Promise(r => setTimeout(r, 850));
                
                // Replace with actual colored ball
                placeholder.style.background = ballColors[i];
                placeholder.style.border = 'none';
                placeholder.style.color = '#000';
                placeholder.textContent = drawnNums[i];
            }
        }

        // Evaluate matches
        const matches = this.selectedNumbers.filter(n => drawnNums.includes(n)).length;
        
        let multiplier = 0;
        let payout = 0;
        let wonJackpot = false;

        if (matches === 4) {
            wonJackpot = true;
            payout = jackpot;
            this.setJackpot(10000000); // reset progressive jackpot to $10,000,000
        } else if (matches === 3) {
            multiplier = 100;
        } else if (matches === 2) {
            multiplier = 10;
        } else if (matches === 1) {
            multiplier = 2;
        }

        if (multiplier > 0) {
            payout = totalCost * multiplier;
        }

        // Award payouts
        if (payout > 0) {
            financeManager.addIncome(payout, 'Investasi', `Hadiah Undian Lotre (${matches} Match)`);
            this.onBalanceRefresh?.();
        }

        // Add history log
        const newLog = {
            id: Date.now(),
            selected: [...this.selectedNumbers],
            drawn: [...drawnNums],
            matches,
            payout
        };

        const history = this.getHistory();
        history.unshift(newLog);
        this.saveHistory(history);

        // Toast feedback
        if (wonJackpot) {
            ui.success(`🏆 JACKPOT PROGRESIF! Anda berhasil mencocokkan seluruh 4 nomor keberuntungan dan memenangkan $ ${payout.toLocaleString()}!`, 'Mega Jackpot Lotre');
        } else if (payout > 0) {
            ui.success(`Menang $ ${payout.toLocaleString()}! Anda mencocokkan ${matches} nomor keberuntungan.`, 'Hadiah Lotre');
        } else {
            ui.toast({ type: 'warning', title: 'Lotre Kalah', message: 'Tidak ada nomor yang cocok. Semoga beruntung di undian berikutnya!' });
        }

        // Reload views
        const historyList = document.getElementById('lottery-history-list');
        if (historyList) {
            const freshHistory = this.getHistory();
            historyList.innerHTML = freshHistory.map(h => {
                const isWin = h.payout > 0;
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding: 0.5rem 0.75rem; border-radius: 8px; font-size:0.75rem; border:1px solid rgba(255,255,255,0.03);">
                        <div style="display:flex; align-items:center; gap:0.4rem;">
                            <span>🎫 ${h.selected.join(', ')}</span>
                            <span style="color:rgba(255,255,255,0.3);">vs</span>
                            <span style="color:#fbbf24; font-weight:700;">🔮 ${h.drawn.join(', ')}</span>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:700; color:${isWin ? '#34d399' : 'var(--text-muted)'}">${h.matches} Match (${isWin ? '+' + financeManager.formatCurrency(h.payout) : 'Kalah'})</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        const jpDisplayRefreshed = document.getElementById('lottery-jackpot-pool-val');
        if (jpDisplayRefreshed) jpDisplayRefreshed.textContent = this.getJackpot().toLocaleString('en-US');

        this.isDrawing = false;
        if (drawBtn) {
            drawBtn.disabled = false;
            drawBtn.innerHTML = '🎫 BELI &amp; UNDI SEKARANG';
        }
    }
}
