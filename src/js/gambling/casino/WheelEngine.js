/**
 * WheelEngine.js - Premium Spinning Wheel (Roda Keberuntungan)
 * Handles rotational physics, sectors, bet sizing, and multipliers.
 */

import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../core/GameState.js';
import ui from '../../ui/UIManager.js';

const SECTORS = [
    { label: '💎 50.0x', multiplier: 50.0, color: '#fbbf24', text: '#000' }, // Gold
    { label: '💀 0.0x',  multiplier: 0.0,  color: '#ef4444', text: '#fff' }, // Red
    { label: '⭐ 2.0x',  multiplier: 2.0,  color: '#a855f7', text: '#fff' }, // Purple
    { label: '🪵 0.5x',  multiplier: 0.5,  color: '#3b82f6', text: '#fff' }, // Blue
    { label: '⚡ 10.0x', multiplier: 10.0, color: '#06b6d4', text: '#000' }, // Cyan
    { label: '💰 1.2x',  multiplier: 1.2,  color: '#10b981', text: '#fff' }, // Green
    { label: '🔥 25.0x', multiplier: 25.0, color: '#ec4899', text: '#fff' }, // Magenta
    { label: '🪙 5.0x',  multiplier: 5.0,  color: '#f97316', text: '#fff' }  // Orange
];

export class WheelEngine {
    constructor(onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;
        this.isSpinning = false;
        this.currentRotation = 0;
    }

    getHTML() {
        // Build SVG sectors path
        let paths = '';
        const cx = 150;
        const cy = 150;
        const r = 140;
        const totalSectors = SECTORS.length;
        const anglePerSector = 360 / totalSectors;

        SECTORS.forEach((sec, i) => {
            const startAngle = i * anglePerSector - 90;
            const endAngle = (i + 1) * anglePerSector - 90;

            const x1 = cx + r * Math.cos(startAngle * Math.PI / 180);
            const y1 = cy + r * Math.sin(startAngle * Math.PI / 180);
            const x2 = cx + r * Math.cos(endAngle * Math.PI / 180);
            const y2 = cy + r * Math.sin(endAngle * Math.PI / 180);

            const largeArcFlag = anglePerSector > 180 ? 1 : 0;

            // Draw pie wedge
            paths += `
                <g>
                    <path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z" 
                          fill="${sec.color}" stroke="rgba(0,0,0,0.2)" stroke-width="2" />
                    <text x="${cx + (r * 0.65) * Math.cos((startAngle + anglePerSector/2) * Math.PI / 180)}" 
                          y="${cy + (r * 0.65) * Math.sin((startAngle + anglePerSector/2) * Math.PI / 180)}"
                          fill="${sec.text}" font-weight="900" font-size="11" text-anchor="middle" dominant-baseline="central"
                          transform="rotate(${(startAngle + anglePerSector/2) + 90}, ${cx + (r * 0.65) * Math.cos((startAngle + anglePerSector/2) * Math.PI / 180)}, ${cy + (r * 0.65) * Math.sin((startAngle + anglePerSector/2) * Math.PI / 180)})">
                        ${sec.label.split(' ')[1]}
                    </text>
                </g>
            `;
        });

        return `
        <div style="max-width: 620px; margin: 0 auto; text-align: center; animation: fade-up 0.3s ease;">
            <h3 style="font-weight: 900; color: #fff; margin-bottom: 0.5rem; font-size: 1.6rem; letter-spacing: -0.03em;">
                🎡 <span style="background: linear-gradient(90deg,#a855f7,#ec4899); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">SPINNING WHEEL</span>
            </h3>
            <p style="color:rgba(255,255,255,0.4); font-size:0.8rem; margin-bottom:1.5rem; text-transform:uppercase; letter-spacing:0.1em;">Putar Roda Keberuntungan &amp; Dapatkan Multiplier Hingga 50x!</p>

            <!-- Wheel Container -->
            <div style="position:relative; width:320px; height:320px; margin: 0 auto 1.5rem auto;">
                
                <!-- Pointer/Indicator (Top 12 o'clock) -->
                <div style="
                    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
                    width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent;
                    border-top: 30px solid #ec4899; z-index: 5;
                    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
                "></div>

                <!-- SVG Wheel Circle -->
                <div id="wheel-svg-container" style="
                    width: 300px; height: 300px; border-radius: 50%;
                    border: 8px solid #3c2419; box-shadow: 0 0 30px rgba(168,85,247,0.3), inset 0 0 10px rgba(0,0,0,0.8);
                    transition: transform 4s cubic-bezier(0.1, 0.8, 0.1, 1);
                    transform: rotate(0deg); overflow: hidden; margin: 10px; background: #111;
                ">
                    <svg viewBox="0 0 300 300" style="width:100%; height:100%;">
                        ${paths}
                        <!-- Center pin/decor -->
                        <circle cx="150" cy="150" r="18" fill="#1c130e" stroke="#fbbf24" stroke-width="3" />
                        <circle cx="150" cy="150" r="6" fill="#fbbf24" />
                    </svg>
                </div>
            </div>

            <!-- Win Display -->
            <div id="wheel-win-display" style="height:36px; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(168,85,247,0.1); margin-bottom:1rem;">
                <span style="color:rgba(255,255,255,0.25); font-size:0.8rem; font-style:italic; text-transform:uppercase; letter-spacing:0.1em;">Silakan Putar Roda Raksasa...</span>
            </div>

            <!-- Bet Panel -->
            <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.05); border-radius:16px; padding:1.25rem; margin-bottom:1.25rem;">
                <label style="display:block; font-size:0.75rem; color:rgba(255,255,255,0.5); margin-bottom:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em;">JUMLAH TARUHAN</label>
                <div style="display:flex; gap:0.4rem; align-items:center; justify-content:center; margin-bottom:0.75rem;">
                    <span style="font-size:1.4rem; font-weight:900; color:#ec4899;">$</span>
                    <input type="text" id="wheel-bet-input" value="100,000" style="background:transparent; border:none; font-size:1.75rem; font-weight:900; color:#fff; width:200px; text-align:center; border-bottom:2px solid rgba(236,72,153,0.4); outline:none; padding:0.25rem 0;">
                </div>
                <div style="display:flex; gap:0.4rem; justify-content:center; flex-wrap:wrap;">
                    <button class="bet-chip wheel-preset" data-val="10000">$10K</button>
                    <button class="bet-chip wheel-preset" data-val="100000">$100K</button>
                    <button class="bet-chip wheel-preset" data-val="1000000">$1M</button>
                    <button class="bet-chip wheel-preset" data-val="10000000">$10M</button>
                    <button class="bet-chip bet-chip-max wheel-preset" id="btn-wheel-max">MAX</button>
                </div>
            </div>

            <!-- Spin Button -->
            <button id="btn-wheel-spin" class="spin-btn" style="background:linear-gradient(135deg,#a855f7 0%,#ec4899 100%); border:none; font-weight:900; font-size:1.3rem; padding:1.1rem 3rem; width:100%; border-radius:14px; box-shadow:0 6px 20px rgba(168,85,247,0.35); cursor:pointer; transition:all 0.25s; color:#fff; letter-spacing:0.05em; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                🎡 PUTAR RODA
            </button>
        </div>
        `;
    }

    bindEvents(container, onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        const betInput = document.getElementById('wheel-bet-input');
        if (betInput) {
            import('../../ui/UIManager.js').then(m => m.default.setupNumericInput(betInput));
        }

        container.querySelectorAll('.wheel-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.isSpinning) return;
                const balance = gameState.getBalance();
                const input = document.getElementById('wheel-bet-input');
                if (!input) return;
                if (btn.id === 'btn-wheel-max') {
                    input.value = balance.toLocaleString('en-US');
                } else {
                    input.value = parseInt(btn.dataset.val).toLocaleString('en-US');
                }
                input.dispatchEvent(new Event('input'));
            });
        });

        document.getElementById('btn-wheel-spin')?.addEventListener('click', () => this.spin());
    }

    async spin() {
        if (this.isSpinning) return;

        const input = document.getElementById('wheel-bet-input');
        const betAmount = input?.getNumericValue ? input.getNumericValue() : (parseInt(input?.value.replace(/,/g, '') || '0', 10));

        if (betAmount <= 0) { ui.error('Masukkan jumlah taruhan yang valid!'); return; }
        const balance = gameState.getBalance();
        if (betAmount > balance) { ui.error('Saldo tidak mencukupi!'); return; }

        this.isSpinning = true;
        const spinBtn = document.getElementById('btn-wheel-spin');
        if (spinBtn) {
            spinBtn.disabled = true;
            spinBtn.innerHTML = '🎡 MEMUTAR RODA...';
        }

        const winDisplay = document.getElementById('wheel-win-display');
        if (winDisplay) winDisplay.innerHTML = `<span style="color:rgba(255,255,255,0.3); font-size:0.8rem; font-style:italic;">Memutar roda keberuntungan...</span>`;

        // Deduct bet
        financeManager.addExpense(betAmount, 'Lainnya', 'Taruhan Roda Keberuntungan');
        this.onBalanceRefresh?.();

        const donations = gameState.get('donations') || { luckMultiplier: 1.0 };
        const luck = donations.luckMultiplier || 1.0;

        // Determine winning sector (weighted random or standard random)
        // With higher luck, we decrease the chance of 0.0x (Index 1) and increase others
        const weights = SECTORS.map((s, idx) => {
            if (idx === 1) return 1.0 / luck; // lower weight for loss
            if (s.multiplier >= 20.0) return 1.0 * luck; // higher weight for big wins
            return 1.0;
        });

        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let rVal = Math.random() * totalWeight;
        let selectedIdx = 0;
        for (let i = 0; i < SECTORS.length; i++) {
            if (rVal < weights[i]) {
                selectedIdx = i;
                break;
            }
            rVal -= weights[i];
        }

        const sector = SECTORS[selectedIdx];
        const anglePerSector = 360 / SECTORS.length;

        // Calculate rotation angle
        // Sector index W is at W * 45 degrees.
        // To point to W at 12 o'clock, we must align it with the top pointer (index 0 is at 0 degrees, index W is at W*45 deg).
        // Rotate the wheel by: 360 - (selectedIdx * 45) - 22.5 (middle of the sector wedge)
        const rotationTarget = 360 * 5 + (360 - (selectedIdx * anglePerSector) - (anglePerSector / 2));
        this.currentRotation += rotationTarget - (this.currentRotation % 360);

        const wheelSvg = document.getElementById('wheel-svg-container');
        if (wheelSvg) {
            wheelSvg.style.transform = `rotate(${this.currentRotation}deg)`;
        }

        // Wait 4 seconds for rotation transition to complete
        await new Promise(res => setTimeout(res, 4050));

        // Evaluate payout
        const payout = Math.round(betAmount * sector.multiplier);
        if (payout > 0) {
            financeManager.addIncome(payout, 'Investasi', `Hasil Roda Keberuntungan: ${sector.label}`);
            this.onBalanceRefresh?.();

            if (sector.multiplier >= 20.0) {
                if (winDisplay) winDisplay.innerHTML = `<span style="font-weight:900; font-size:1.1rem; color:#fbbf24; animation:jackpotFlash 0.5s infinite; padding:0.4rem 1rem; border-radius:8px;">🏆 MEGA WIN! +$${financeManager.formatCurrency(payout)} (${sector.label})</span>`;
                ui.success(`MEGA WIN! +$ ${financeManager.formatCurrency(payout)} — Roda Mendarat di ${sector.label}!`, '🎡 Roda Berputar');
            } else {
                if (winDisplay) winDisplay.innerHTML = `<span style="font-weight:800; font-size:0.95rem; color:#34d399; animation:winPulse 1s ease-in-out infinite;">✅ MENANG +$${financeManager.formatCurrency(payout)} (${sector.label})</span>`;
                ui.success(`MENANG! +$ ${financeManager.formatCurrency(payout)} — Roda Mendarat di ${sector.label}!`, '🎡 Roda Berputar');
            }
        } else {
            if (winDisplay) winDisplay.innerHTML = `<span style="color:rgba(255,255,255,0.3); font-size:0.8rem; font-style:italic;">Zonk! Roda mendarat di ${sector.label}</span>`;
            ui.toast({ type: 'warning', title: 'Kalah', message: 'Roda mendarat di 0.0x. Coba lagi!' });
        }

        this.isSpinning = false;
        if (spinBtn) {
            spinBtn.disabled = false;
            spinBtn.innerHTML = '🎡 PUTAR RODA';
        }
    }
}
