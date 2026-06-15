/**
 * ZeusSlotEngine.js - Premium Gates of Olympus 6x5 Slot Engine
 * Handles 6 columns x 3 rows grid mechanics, 5 payline checking,
 * cascading visual animations, canvas particle effects, and auto spin.
 * Mobile responsive optimized (preventing vertical scrolling).
 */

import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../core/GameState.js';
import ui from '../../ui/UIManager.js';
import { getSlotSVG } from './SlotIcons.js';

const SYMBOLS = [
    { emoji: '👑', name: 'Mahkota Zeus', baseWeight: 4,  multiplier3x: 50, multiplier2x: 3 },
    { emoji: '⚡', name: 'Petir',       baseWeight: 8,  multiplier3x: 25, multiplier2x: 2 },
    { emoji: '🏛️', name: 'Kuil',        baseWeight: 12, multiplier3x: 10,  multiplier2x: 0 },
    { emoji: '🏺', name: 'Vas Suci',    baseWeight: 18, multiplier3x: 5,  multiplier2x: 0 },
    { emoji: '🧿', name: 'Mata Biru',   baseWeight: 25, multiplier3x: 3,  multiplier2x: 0 },
    { emoji: '💠', name: 'Batu Permata',baseWeight: 32, multiplier3x: 1,  multiplier2x: 0 },
];

const PAYLINES = [
    { name: 'Baris 1', coordinates: [0, 0, 0, 0, 0, 0], color: '#ef4444' },
    { name: 'Baris 2', coordinates: [1, 1, 1, 1, 1, 1], color: '#f97316' },
    { name: 'Baris 3', coordinates: [2, 2, 2, 2, 2, 2], color: '#f59e0b' },
    { name: 'Baris 4', coordinates: [3, 3, 3, 3, 3, 3], color: '#84cc16' },
    { name: 'Baris 5', coordinates: [4, 4, 4, 4, 4, 4], color: '#10b981' },
    { name: 'V-Shape Atas', coordinates: [0, 1, 2, 3, 2, 0], color: '#ec4899' },
    { name: 'V-Shape Bawah', coordinates: [4, 3, 2, 1, 2, 4], color: '#f43f5e' }
];

class GoldParticle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'gold', 'diamond', 'spark', 'dust'
        this.vx = (Math.random() - 0.5) * 12;
        this.vy = (Math.random() - 0.5) * 12 - 6; // upward bias
        this.alpha = 1;
        this.size = Math.random() * 8 + 4;
        this.gravity = 0.35;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = (Math.random() - 0.5) * 15;
        
        if (type === 'gold') {
            this.color = '#fbbf24';
        } else if (type === 'diamond') {
            this.color = '#a5f3fc';
        } else if (type === 'spark') {
            this.color = '#f97316';
        } else {
            this.color = '#78716c'; // dust
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.alpha -= 0.025;
        this.rotation += this.rotationSpeed;
    }
}

export class ZeusSlotEngine {
    constructor(onBalanceRefresh) {
        this.isSpinning = false;
        this.onBalanceRefresh = onBalanceRefresh;
        this.particles = [];
        this.particleLoopActive = false;
        this.autoSpinCount = 0;
        this.isAutoSpinning = false;
        this.isSpeedUp = false;
        this.skipRequested = false;
        // Matrix 6x5
        this.grid = Array.from({length: 6}, () => Array(5).fill('💠'));
    }

    getRateStatusHTML() {
        const plays = gameState.get('casino.ratePlays') || 0;
        const rateOn = plays >= 250;
        return rateOn 
            ? `<div class="rate-badge rate-on-badge" style="display:inline-flex; align-items:center; gap:0.25rem; background:linear-gradient(135deg,#ef4444,#fbbf24); color:#fff; font-weight:900; font-size:0.75rem; padding:0.25rem 0.6rem; border-radius:999px; box-shadow:0 0 10px rgba(239,68,68,0.5); animation: rateGlow 1s ease-in-out infinite alternate; text-transform:uppercase; letter-spacing:0.05em; margin-bottom: 0.5rem; border: 1.5px solid #fff;">⚡ RATE ON (JACKPOT UP!)</div>`
            : `<div class="rate-badge rate-off-badge" style="display:inline-flex; align-items:center; gap:0.25rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.6); font-weight:800; font-size:0.7rem; padding:0.2rem 0.5rem; border-radius:999px; text-transform:uppercase; letter-spacing:0.05em; margin-bottom: 0.5rem;">Rate: OFF (${plays}/250 Spins)</div>`;
    }

    getHTML() {
        // Render 6 columns, each having 3 rows
        let colsHTML = '';
        for (let col = 0; col < 6; col++) {
            colsHTML += '\n                <div class="slot-reel-wrap">';
            for (let row = 0; row < 5; row++) {
                colsHTML += `\n                    <div id="slot-reel-${col}-${row}" class="slot-symbol-block">${getSlotSVG('💠')}</div>`;
            }
            colsHTML += '\n                </div>\n            ';
        }

        return `
        <div style="max-width: 720px; margin: 0 auto; text-align: center;">
            <h3 style="font-weight: 900; color: #fff; margin-bottom: 0.35rem; font-size: 1.4rem; letter-spacing: -0.03em;">
                🎰 <span style="background: linear-gradient(90deg,#fbbf24,#f59e0b); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">GATES OF ZEUS</span> SLOT
            </h3>
            <p style="color:rgba(255,255,255,0.4); font-size:0.75rem; margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.1em;">6 Kolom, 5 Baris &amp; 7 Garis Payout (Kemenangan Ganda!)</p>
            <div id="slot-rate-badge-container">${this.getRateStatusHTML()}</div>

            <!-- Slot Machine Cabinet -->
            <div class="slot-cabinet">
                
                <!-- Particle overlay canvas -->
                <canvas id="slot-particle-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:10;"></canvas>

                <!-- Top lights row (Industrial Gold Theme) -->
                <div style="display:flex; justify-content:center; gap:0.4rem; margin-bottom:0.6rem;">
                    ${Array.from({length:9}, (_,i) => `<div class="slot-light" style="width:8px;height:8px;border-radius:50%;background:${i%2===0?'#fbbf24':'#f97316'};box-shadow:0 0 6px ${i%2===0?'#fbbf24':'#f97316'};animation:lightBlink ${0.5+i*0.1}s ease-in-out infinite alternate;"></div>`).join('')}
                </div>

                <!-- Reels Window -->
                <div class="slot-window">
                    <!-- Payline indicator (Red laser/spark laser) -->
                    <div style="position:absolute; top:50%; left:0; right:0; height:2px; background:rgba(249,115,22,0.6); transform:translateY(-50%); z-index:2; pointer-events:none; box-shadow: 0 0 6px #f97316;"></div>
                    
                    <div style="display:grid; grid-template-columns:repeat(6,1fr); gap:0.35rem; position:relative; z-index:1;">
                        ${colsHTML}
                    </div>
                </div>

                <!-- Win Display -->
                <div id="slot-win-display" class="slot-win-display-box">
                    <span style="color:rgba(255,255,255,0.25); font-size:0.75rem; font-style:italic; text-transform:uppercase; letter-spacing:0.08em;">Tekan Spin Zeus Untuk Memulai...</span>
                </div>
            </div>

            <!-- Auto Spin Controls -->
            <div class="slot-controls-box">
                <div style="text-align:left; flex: 1; min-width: 110px;">
                    <label style="display:block; font-size:0.65rem; color:rgba(255,255,255,0.5); margin-bottom:0.15rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em;">AUTO SPIN</label>
                    <input type="number" id="slot-autospin-count" value="10" min="1" max="1000" style="background:var(--bg-surface); border:1px solid var(--border-color); font-size:1rem; font-weight:700; color:#fff; width:100%; text-align:center; border-radius:6px; padding: 0.25rem 0.4rem; outline:none;">
                </div>
                <div style="flex:1.5; display:flex; gap:0.4rem; height: 36px; margin-top: auto; min-width: 150px;">
                    <button id="btn-slot-auto-start" class="bet-chip" style="flex:1; border-radius:8px; background: rgba(251,191,36,0.15); border-color: rgba(251,191,36,0.3); color: #fbbf24; font-size:0.8rem; font-weight: 800;">🤖 AUTO SPIN</button>
                    <button id="btn-slot-auto-stop" class="bet-chip" style="flex:1; border-radius:8px; background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #ef4444; font-size:0.8rem; font-weight: 800; display:none;">⏹️ STOP (0)</button>
                </div>
            </div>

            <!-- Bet Panel -->
            <div class="slot-bet-panel">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem; flex-wrap:wrap; gap:0.25rem;">
                    <label style="font-size:0.68rem; color:rgba(255,255,255,0.5); font-weight:700; text-transform:uppercase; letter-spacing:0.08em;">TARUHAN</label>
                    <div style="display:flex; gap:0.25rem; align-items:center;">
                        <span style="font-size:1.1rem; font-weight:900; color:#fbbf24;">$</span>
                        <input type="text" id="slot-bet-input" value="100,000" style="background:transparent; border:none; font-size:1.3rem; font-weight:900; color:#fff; width:110px; text-align:right; border-bottom:1.5px solid rgba(251,191,36,0.4); outline:none; padding:0.1rem 0;">
                    </div>
                </div>
                <div style="display:flex; gap:0.35rem; justify-content:center; flex-wrap:wrap;">
                    <button class="bet-chip slot-preset" data-val="10000" style="padding:0.25rem 0.5rem; font-size:0.7rem;">$10K</button>
                    <button class="bet-chip slot-preset" data-val="100000" style="padding:0.25rem 0.5rem; font-size:0.7rem;">$100K</button>
                    <button class="bet-chip slot-preset" data-val="1000000" style="padding:0.25rem 0.5rem; font-size:0.7rem;">$1M</button>
                    <button class="bet-chip slot-preset" data-val="10000000" style="padding:0.25rem 0.5rem; font-size:0.7rem;">$10M</button>
                    <button class="bet-chip bet-chip-max slot-preset" id="btn-slot-max" style="padding:0.25rem 0.5rem; font-size:0.7rem;">MAX</button>
                </div>
            </div>

            <!-- Action buttons container -->
            <div style="display:flex; gap:0.4rem; margin-top:0.5rem; justify-content:center; width:100%;">
                <button id="btn-slot-speedup" class="bet-chip" style="flex:1; border-radius:10px; font-weight:800; font-size:0.9rem; height:46px; background:rgba(251,191,36,0.05); border-color:rgba(251,191,36,0.2); color:rgba(255,255,255,0.7); cursor:pointer; transition:all 0.2s;">⚡ CEPAT</button>
                <button id="btn-slot-spin" class="spin-btn-action" style="flex:2.2; height:46px; padding:0; display:flex; align-items:center; justify-content:center; margin:0;">
                    ⛏️ SPIN ZEUS
                </button>
                <button id="btn-slot-skip" class="bet-chip" style="flex:1; border-radius:10px; font-weight:800; font-size:0.9rem; height:46px; background:rgba(168,85,247,0.05); border-color:rgba(168,85,247,0.2); color:rgba(255,255,255,0.4); cursor:pointer; transition:all 0.2s;" disabled>⏭️ LEWATI</button>
            </div>

            <!-- Paytable Info -->
            <div class="slot-paytable-container">
                <div style="font-size:0.65rem; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.08em; font-weight:700; margin-bottom:0.5rem; text-align:center;">— TABEL KELIPATAN MULTIPLIER (6x5) —</div>
                <div class="slot-paytable-grid">
                    ${SYMBOLS.map(s => `
                    <div style="background:rgba(255,255,255,0.02); padding:0.3rem 0.5rem; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.72rem;">${s.emoji} ${s.name}</span>
                        <span style="color:#fbbf24; font-weight:700; font-size:0.68rem;">3x:${s.multiplier3x}× | 4x:${s.multiplier3x * 2.5}× | 5x:${s.multiplier3x * 6}× | 6x:${s.multiplier3x * 15}×</span>
                    </div>`).join('')}
                </div>
            </div>
        </div>

        <style>
            .slot-cabinet {
                position:relative; 
                background: linear-gradient(180deg, #2d1e18 0%, #170f0b 100%); 
                border: 3px solid #fbbf24; 
                border-radius: 20px; 
                padding: 1.25rem; 
                margin-bottom: 0.75rem; 
                box-shadow: 0 0 30px rgba(251,191,36,0.2), inset 0 0 20px rgba(0,0,0,0.7); 
                overflow: hidden;
            }
            .slot-window {
                background:#0a0705; 
                border:3px solid #513629; 
                border-radius:14px; 
                padding:0.5rem; 
                margin-bottom:0.6rem; 
                position:relative; 
                overflow:hidden;
            }
            .slot-reel-wrap {
                overflow:hidden; 
                height: 300px; 
                border-radius:8px; 
                background:#1c130e; 
                border:1px solid #3c2419; 
                position:relative; 
                display: flex; 
                flex-direction: column; 
                justify-content: space-around; 
                padding: 3px 0;
            }
            .slot-symbol-block {
                font-size:2.2rem; 
                height: 52px; 
                display:flex; 
                align-items:center; 
                justify-content:center; 
                transition:transform 0.1s; 
                transform: scale(1);
            }
            .slot-win-display-box {
                min-height:30px; 
                display:flex; 
                flex-direction:column; 
                align-items:center; 
                justify-content:center; 
                background: rgba(0,0,0,0.3); 
                border-radius: 6px; 
                border: 1px solid rgba(251,191,36,0.1); 
                padding: 0.2rem 0.4rem;
            }
            .slot-controls-box {
                background:rgba(0,0,0,0.2); 
                border:1px solid rgba(255,255,255,0.05); 
                border-radius:12px; 
                padding:0.75rem; 
                margin-bottom:0.75rem; 
                display:flex; 
                align-items:center; 
                justify-content:space-between; 
                gap:0.75rem; 
                flex-wrap: wrap;
            }
            .slot-bet-panel {
                background:rgba(0,0,0,0.2); 
                border:1px solid rgba(255,255,255,0.05); 
                border-radius:12px; 
                padding:0.75rem; 
                margin-bottom:0.75rem;
            }
            .spin-btn-action {
                background:linear-gradient(135deg,#fbbf24 0%,#d97706 100%); 
                border:none; 
                font-weight:900; 
                font-size:1.15rem; 
                padding:0.8rem 2rem; 
                width:100%; 
                border-radius:10px; 
                box-shadow:0 4px 12px rgba(251,191,36,0.25); 
                cursor:pointer; 
                transition:all 0.25s; 
                color:#fff; 
                letter-spacing:0.05em; 
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            }
            .slot-paytable-container {
                margin-top:1rem; 
                border-top:1px solid rgba(255,255,255,0.05); 
                padding-top:1rem; 
                text-align:left;
            }
            .slot-paytable-grid {
                display:grid; 
                grid-template-columns:1fr 1fr; 
                gap:0.35rem; 
                font-size:0.7rem;
            }

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
                0%, 100% { background: linear-gradient(135deg,#fbbf24 0%,#d97706 100%); }
                50% { background: linear-gradient(135deg,#f43f5e 0%,#e11d48 100%); }
            }
            @keyframes rateGlow {
                from { box-shadow: 0 0 4px rgba(239,68,68,0.4), 0 0 10px rgba(251,191,36,0.2); transform: scale(1); }
                to { box-shadow: 0 0 12px rgba(239,68,68,0.8), 0 0 20px rgba(251,191,36,0.6); transform: scale(1.03); }
            }
            .spin-btn-action:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(251,191,36,0.45) !important; }
            .spin-btn-action:active:not(:disabled) { transform: translateY(0); }
            .spin-btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
            .bet-chip {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.8);
                font-size: 0.72rem;
                font-weight: 700;
                padding: 0.25rem 0.5rem;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .bet-chip:hover { background: rgba(251,191,36,0.15); border-color: rgba(251,191,36,0.4); color: #fbbf24; }
            .bet-chip-max { background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.3); color: #fbbf24; }
            
            /* Shake & Praise Animation styles */
            @keyframes shake {
                0%, 100% { transform: translate(0, 0) rotate(0deg); }
                10% { transform: translate(-2px, 1px) rotate(-0.5deg); }
                20% { transform: translate(1px, -2px) rotate(0.5deg); }
                30% { transform: translate(-1px, 1px) rotate(0deg); }
                40% { transform: translate(2px, 1px) rotate(0.5deg); }
                50% { transform: translate(-1px, -1px) rotate(-0.5deg); }
                60% { transform: translate(1px, 2px) rotate(0deg); }
                70% { transform: translate(-2px, 1px) rotate(0.5deg); }
                80% { transform: translate(1px, -1px) rotate(-0.5deg); }
                90% { transform: translate(-1px, 2px) rotate(0deg); }
            }
            .shake-anim {
                animation: shake 0.5s ease-in-out;
            }

            @keyframes praiseBounce {
                0% { transform: translate(-50%, -50%) scale(0) rotate(-10deg); opacity: 0; }
                30% { transform: translate(-50%, -50%) scale(1.25) rotate(5deg); opacity: 1; }
                40% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
                80% { opacity: 1; transform: translate(-50%, -65%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -80%) scale(0.7); }
            }

            .winning-symbol {
                background: rgba(251,191,36,0.2) !important;
                border: 2px solid #fbbf24 !important;
                border-radius: 6px;
                animation: pulseSymbol 0.5s ease-in-out infinite alternate;
            }
            @keyframes pulseSymbol {
                0% { transform: scale(1); }
                100% { transform: scale(1.08); }
            }

            /* Responsive Media Queries to avoid scrolling and overflow */
            @media (max-width: 600px) {
                .slot-cabinet {
                    padding: 0.5rem;
                    border-radius: 14px;
                    margin-bottom: 0.5rem;
                }
                .slot-window {
                    padding: 0.35rem;
                    margin-bottom: 0.4rem;
                }
                .slot-reel-wrap {
                    height: 200px;
                    border-radius: 6px;
                    padding: 1px 0;
                }
                .slot-symbol-block {
                    font-size: 1.45rem;
                    height: 36px;
                }
                .slot-controls-box {
                    padding: 0.5rem;
                    margin-bottom: 0.5rem;
                    gap: 0.5rem;
                }
                .slot-bet-panel {
                    padding: 0.5rem;
                    margin-bottom: 0.5rem;
                }
                .spin-btn-action {
                    font-size: 1rem;
                    padding: 0.65rem 1.5rem;
                }
                .slot-paytable-grid {
                    grid-template-columns: 1fr;
                    gap: 0.25rem;
                }
                .slot-win-display-box {
                    min-height: 24px;
                }
            }
        </style>
        `;
    }

    bindEvents(container, onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        const slotInput = document.getElementById('slot-bet-input');
        if (slotInput) {
            import('../../ui/UIManager.js').then(m => m.default.setupNumericInput(slotInput));
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

        document.getElementById('btn-slot-spin')?.addEventListener('click', () => {
            this.stopAutoSpin();
            this.spin();
        });

        // Speed Up Button Toggle
        const speedupBtn = document.getElementById('btn-slot-speedup');
        if (speedupBtn) {
            const updateSpeedupUI = () => {
                if (this.isSpeedUp) {
                    speedupBtn.style.background = '#fbbf24';
                    speedupBtn.style.borderColor = '#fbbf24';
                    speedupBtn.style.color = '#000';
                } else {
                    speedupBtn.style.background = 'rgba(251,191,36,0.05)';
                    speedupBtn.style.borderColor = 'rgba(251,191,36,0.2)';
                    speedupBtn.style.color = 'rgba(255,255,255,0.7)';
                }
            };
            updateSpeedupUI();

            speedupBtn.addEventListener('click', () => {
                this.isSpeedUp = !this.isSpeedUp;
                updateSpeedupUI();
                ui.toast({ type: 'info', title: this.isSpeedUp ? 'Mode Cepat Aktif ⚡' : 'Mode Normal 🐢', message: this.isSpeedUp ? 'Putaran slot akan berlangsung lebih cepat!' : 'Putaran slot kembali ke kecepatan biasa.' });
            });
        }

        // Skip Button Click
        const skipBtn = document.getElementById('btn-slot-skip');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                if (this.isSpinning) {
                    this.skipRequested = true;
                    skipBtn.disabled = true;
                }
            });
        }

        // Auto Spin Buttons
        document.getElementById('btn-slot-auto-start')?.addEventListener('click', () => {
            const countInput = document.getElementById('slot-autospin-count');
            const count = parseInt(countInput ? countInput.value : '10', 10);
            if (isNaN(count) || count <= 0) {
                ui.error('Masukkan jumlah putaran otomatis yang valid!');
                return;
            }
            this.startAutoSpin(count);
        });

        document.getElementById('btn-slot-auto-stop')?.addEventListener('click', () => {
            this.stopAutoSpin();
        });
    }

    startAutoSpin(count) {
        this.autoSpinCount = count;
        this.isAutoSpinning = true;

        const startBtn = document.getElementById('btn-slot-auto-start');
        const stopBtn = document.getElementById('btn-slot-auto-stop');
        
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) {
            stopBtn.style.display = 'block';
            stopBtn.textContent = `⏹️ STOP (${this.autoSpinCount})`;
        }

        this.spin();
    }

    stopAutoSpin() {
        this.isAutoSpinning = false;
        this.autoSpinCount = 0;

        const startBtn = document.getElementById('btn-slot-auto-start');
        const stopBtn = document.getElementById('btn-slot-auto-stop');
        
        if (startBtn) startBtn.style.display = 'block';
        if (stopBtn) stopBtn.style.display = 'none';
    }

    weightedRandom(luck, betAmount = 0) {
        const weights = SYMBOLS.map(s => {
            let w = s.baseWeight * (s.multiplier3x >= 20 ? luck : 1);
            if (s.multiplier3x >= 20) {
                if (betAmount >= 50000000) w *= 0.01;
                else if (betAmount >= 10000000) w *= 0.05;
                else if (betAmount >= 5000000) w *= 0.15;
                else if (betAmount >= 1000000) w *= 0.4;
            }
            return w;
        });
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < SYMBOLS.length; i++) {
            if (r < weights[i]) return SYMBOLS[i];
            r -= weights[i];
        }
        return SYMBOLS[SYMBOLS.length - 1];
    }

    // Canvas particle loop
    startParticleLoop() {
        if (this.particleLoopActive) return;
        this.particleLoopActive = true;
        const canvas = document.getElementById('slot-particle-canvas');
        if (!canvas) {
            this.particleLoopActive = false;
            return;
        }
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;

        const loop = () => {
            if (this.particles.length === 0) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                this.particleLoopActive = false;
                return;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.update();
                if (p.alpha <= 0) {
                    this.particles.splice(i, 1);
                    continue;
                }
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;

                if (p.type === 'diamond') {
                    ctx.beginPath();
                    ctx.moveTo(0, -p.size);
                    ctx.lineTo(p.size, 0);
                    ctx.lineTo(0, p.size);
                    ctx.lineTo(-p.size, 0);
                    ctx.closePath();
                    ctx.fill();
                } else if (p.type === 'gold') {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.type === 'spark') {
                    ctx.beginPath();
                    for (let j = 0; j < 5; j++) {
                        ctx.lineTo(Math.cos((18 + j * 72) * Math.PI / 180) * p.size, Math.sin((18 + j * 72) * Math.PI / 180) * p.size);
                        ctx.lineTo(Math.cos((54 + j * 72) * Math.PI / 180) * (p.size/2), Math.sin((54 + j * 72) * Math.PI / 180) * (p.size/2));
                    }
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                }
                ctx.restore();
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    spawnParticles(count, type) {
        const canvas = document.getElementById('slot-particle-canvas');
        if (!canvas) return;
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        for (let i = 0; i < count; i++) {
            this.particles.push(new GoldParticle(x, y, type));
        }
        this.startParticleLoop();
    }

    shakeCabinet() {
        const cabinet = document.querySelector('.slot-cabinet');
        if (cabinet) {
            cabinet.classList.add('shake-anim');
            setTimeout(() => {
                cabinet.classList.remove('shake-anim');
            }, 600);
        }
    }

    spawnPraiseText(text) {
        const cabinet = document.querySelector('.slot-cabinet');
        if (!cabinet) return;
        const div = document.createElement('div');
        div.textContent = text;
        div.style.position = 'absolute';
        div.style.left = '50%';
        div.style.top = '45%';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.fontSize = '2.5rem';
        div.style.fontWeight = '900';
        div.style.color = '#fbbf24';
        div.style.webkitTextStroke = '2px #451a03';
        div.style.textShadow = '0 0 16px rgba(251,191,36,0.9), 0 4px 0 #7c2d12';
        div.style.pointerEvents = 'none';
        div.style.zIndex = '20';
        div.style.animation = 'praiseBounce 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
        
        cabinet.appendChild(div);
        setTimeout(() => div.remove(), 1000);
    }

    async _animateReel(colIdx, finalEmojis, delay) {
        return new Promise(resolve => {
            if (this.skipRequested) {
                for (let r = 0; r < 5; r++) {
                    const el = document.getElementById(`slot-reel-${colIdx}-${r}`);
                    if (el) {
                        el.innerHTML = getSlotSVG(finalEmojis[r]);
                        el.style.filter = 'none';
                    }
                }
                resolve();
                return;
            }

            let ticks = 0;
            const baseTicks = 10 + delay * 3;
            const maxTicks = this.isSpeedUp ? Math.max(3, Math.floor(baseTicks / 2)) : baseTicks;
            const intervalDuration = this.isSpeedUp ? 20 : 70;

            const interval = setInterval(() => {
                if (this.skipRequested) {
                    clearInterval(interval);
                    for (let r = 0; r < 5; r++) {
                        const el = document.getElementById(`slot-reel-${colIdx}-${r}`);
                        if (el) {
                            el.innerHTML = getSlotSVG(finalEmojis[r]);
                            el.style.filter = 'none';
                        }
                    }
                    resolve();
                    return;
                }

                for (let r = 0; r < 5; r++) {
                    const el = document.getElementById(`slot-reel-${colIdx}-${r}`);
                    if (el) {
                        el.innerHTML = getSlotSVG(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].emoji);
                        el.style.filter = 'blur(1px)';
                    }
                }
                ticks++;
                if (ticks >= maxTicks) {
                    clearInterval(interval);
                    for (let r = 0; r < 5; r++) {
                        const el = document.getElementById(`slot-reel-${colIdx}-${r}`);
                        if (el) {
                            el.innerHTML = getSlotSVG(finalEmojis[r]);
                            el.style.filter = 'none';
                            el.style.transform = 'scale(1.08)';
                            setTimeout(() => { el.style.transform = 'scale(1)'; }, this.isSpeedUp ? 50 : 150);
                        }
                    }
                    resolve();
                }
            }, intervalDuration);
        });
    }

    async spin() {
        if (this.isSpinning) return;

        // Clear any previous winning highlights
        document.querySelectorAll('.slot-symbol-block').forEach(el => el.classList.remove('winning-symbol'));

        const input = document.getElementById('slot-bet-input');
        const betAmount = input?.getNumericValue ? input.getNumericValue() : (parseInt(input?.value.replace(/,/g, '') || '0', 10));

        if (betAmount <= 0) {
            ui.error('Masukkan jumlah taruhan yang valid!');
            this.stopAutoSpin();
            return;
        }
        const balance = gameState.getBalance();
        if (betAmount > balance) {
            ui.error('Saldo tidak mencukupi!');
            this.stopAutoSpin();
            return;
        }

        this.isSpinning = true;
        this.skipRequested = false;
        import('../../ui/AuraSound.js').then(m => m.default.playCasinoSpin());

        // Enable skip button and style it active
        const skipBtn = document.getElementById('btn-slot-skip');
        if (skipBtn) {
            skipBtn.disabled = false;
            skipBtn.style.color = '#a855f7';
            skipBtn.style.borderColor = 'rgba(168,85,247,0.6)';
            skipBtn.style.background = 'rgba(168,85,247,0.15)';
        }

        const spinBtn = document.getElementById('btn-slot-spin');
        if (spinBtn) {
            spinBtn.disabled = true;
            spinBtn.innerHTML = '<span style="animation:spin 0.5s linear infinite;display:inline-block;">⛏️</span> MENGSPIN ZEUS...';
        }

        const winDisplay = document.getElementById('slot-win-display');
        if (winDisplay) winDisplay.innerHTML = `<span style="color:rgba(255,255,255,0.3); font-size:0.75rem; font-style:italic;">Gerbang Olympus Sedang Bekerja...</span>`;

        // Deduct bet
        financeManager.addExpense(betAmount, 'Lainnya', 'Taruhan Slot 6x5');
        this.onBalanceRefresh?.();

        // Increment rate plays
        let plays = gameState.get('casino.ratePlays') || 0;
        plays++;
        gameState.set('casino.ratePlays', plays);
        const rateOn = plays >= 250;

        const donations = gameState.get('donations') || { luckMultiplier: 1.0 };
        let luck = donations.luckMultiplier || 1.0;
        if (rateOn) {
            luck = Math.max(luck, 3.5);
        }

        // Generate final matrix 6x5
        const resultMatrix = [];
        for (let col = 0; col < 6; col++) {
            const colSymbols = [];
            for (let row = 0; row < 5; row++) {
                colSymbols.push(this.weightedRandom(luck, betAmount).emoji);
            }
            resultMatrix.push(colSymbols);
        }
        this.grid = resultMatrix;

        // Animate reels sequentially
        for (let col = 0; col < 6; col++) {
            if (this.skipRequested) {
                // Instantly resolve remaining reels
                for (let c = col; c < 6; c++) {
                    for (let r = 0; r < 5; r++) {
                        const el = document.getElementById(`slot-reel-${c}-${r}`);
                        if (el) {
                            el.innerHTML = getSlotSVG(resultMatrix[c][r]);
                            el.style.filter = 'none';
                        }
                    }
                }
                break;
            }
            await this._animateReel(col, resultMatrix[col], col);
            if (!this.skipRequested) {
                await new Promise(r => setTimeout(r, this.isSpeedUp ? 25 : 100));
            }
        }

        // Evaluate result
        this._evaluate(betAmount);

        this.isSpinning = false;
        if (spinBtn) {
            spinBtn.disabled = false;
            spinBtn.innerHTML = '⛏️ SPIN ZEUS';
        }

        // Disable skip button and reset style
        const skipBtnEnd = document.getElementById('btn-slot-skip');
        if (skipBtnEnd) {
            skipBtnEnd.disabled = true;
            skipBtnEnd.style.color = 'rgba(255,255,255,0.4)';
            skipBtnEnd.style.borderColor = 'rgba(168,85,247,0.2)';
            skipBtnEnd.style.background = 'rgba(168,85,247,0.05)';
        }

        // Handle Auto Spin cycle
        if (this.isAutoSpinning) {
            if (this.autoSpinCount > 1) {
                this.autoSpinCount--;
                const stopBtn = document.getElementById('btn-slot-auto-stop');
                if (stopBtn) stopBtn.textContent = `⏹️ STOP (${this.autoSpinCount})`;
                
                setTimeout(() => {
                    if (this.isAutoSpinning) this.spin();
                }, this.isSpeedUp ? 800 : 1800);
            } else {
                this.stopAutoSpin();
            }
        }

        // Update the Rate badge display
        const rateContainer = document.getElementById('slot-rate-badge-container');
        if (rateContainer) {
            rateContainer.innerHTML = this.getRateStatusHTML();
        }
    }

    _evaluate(bet) {
        const winDisplay = document.getElementById('slot-win-display');
        const lineBet = bet / 5; // bet split among 5 paylines
        let totalPayout = 0;
        const winsList = [];
        let hasDynamite = false;
        const symbolsToHighlight = []; // list of DOM element IDs to highlight

        // Check each payline (horizontal and V-shapes)
        PAYLINES.forEach((line) => {
            const lineSymbols = [];
            for (let col = 0; col < 6; col++) {
                const row = line.coordinates[col];
                lineSymbols.push(this.grid[col][row]);
            }

            // Find all contiguous matching segments in this line
            let start = 0;
            while (start < lineSymbols.length) {
                let end = start + 1;
                while (end < lineSymbols.length && lineSymbols[end] === lineSymbols[start]) {
                    end++;
                }
                const length = end - start;
                const emoji = lineSymbols[start];
                const spec = SYMBOLS.find(s => s.emoji === emoji);
                if (spec) {
                    let lineMultiplier = 0;
                    if (length >= 3) {
                        if (length === 3) lineMultiplier = spec.multiplier3x;
                        else if (length === 4) lineMultiplier = Math.round(spec.multiplier3x * 2.5);
                        else if (length === 5) lineMultiplier = Math.round(spec.multiplier3x * 6);
                        else if (length >= 6) lineMultiplier = Math.round(spec.multiplier3x * 15);
                    } else if (length === 2 && spec.multiplier2x > 0) {
                        lineMultiplier = spec.multiplier2x;
                    }

                    if (lineMultiplier > 0) {
                        const lineWin = Math.round(lineBet * lineMultiplier);
                        totalPayout += lineWin;
                        winsList.push(`${line.name} (${start + 1}-${end}): ${length}x ${emoji} (+$${lineWin.toLocaleString()})`);

                        // Mark coordinates for visual highlight
                        for (let col = start; col < end; col++) {
                            const row = line.coordinates[col];
                            symbolsToHighlight.push(`slot-reel-${col}-${row}`);
                        }
                    }
                }
                start = end;
            }
        });

        // Check each column (vertical - up & down)
        for (let col = 0; col < 6; col++) {
            const colSymbols = [];
            for (let row = 0; row < 5; row++) {
                colSymbols.push(this.grid[col][row]);
            }

            let start = 0;
            while (start < colSymbols.length) {
                let end = start + 1;
                while (end < colSymbols.length && colSymbols[end] === colSymbols[start]) {
                    end++;
                }
                const length = end - start;
                const emoji = colSymbols[start];
                const spec = SYMBOLS.find(s => s.emoji === emoji);
                if (spec) {
                    let colMultiplier = 0;
                    if (length === 3) {
                        colMultiplier = spec.multiplier3x;
                    } else if (length === 2 && spec.multiplier2x > 0) {
                        colMultiplier = spec.multiplier2x;
                    }

                    if (colMultiplier > 0) {
                        const colWin = Math.round(lineBet * colMultiplier);
                        totalPayout += colWin;
                        winsList.push(`Kolom ${col + 1} Vertikal: ${length}x ${emoji} (+$${colWin.toLocaleString()})`);

                        // Mark coordinates for visual highlight
                        for (let row = start; row < end; row++) {
                            symbolsToHighlight.push(`slot-reel-${col}-${row}`);
                        }
                    }
                }
                start = end;
            }
        }

        // Check if dynamite is anywhere on the screen
        for (let col = 0; col < 6; col++) {
            for (let row = 0; row < 5; row++) {
                if (this.grid[col][row] === '⚡') {
                    hasDynamite = true;
                }
            }
        }

        // Visual highlights
        symbolsToHighlight.forEach(id => {
            document.getElementById(id)?.classList.add('winning-symbol');
        });

        // Trigger Screen Shake / Dynamite explosions
        if (hasDynamite) {
            this.shakeCabinet();
            this.spawnParticles(15, 'spark');
            this.spawnParticles(20, 'dust');
        }

        // Payout award and text report
        if (totalPayout > 0) {
            financeManager.addIncome(totalPayout, 'Investasi', `Kemenangan Slot 6x5: ${winsList.length} Payline`);
            this.onBalanceRefresh?.();

            const isJackpot = totalPayout >= bet * 5;
            if (isJackpot) {
                gameState.set('casino.ratePlays', 0);
            }

            // Spawn floating text and particles
            if (isJackpot) {
                this.shakeCabinet();
                const jackpotTexts = ["ZEUS STRIKE! ⚡", "OLYMPUS WIN! ⚡", "THUNDERSTORM! ⛈️"];
                this.spawnPraiseText(jackpotTexts[Math.floor(Math.random() * jackpotTexts.length)]);
                this.spawnParticles(40, 'gold');
                this.spawnParticles(35, 'diamond');
                ui.success(`MEGA WIN 6x5! Total menang +$ ${totalPayout.toLocaleString()}`, '⚡ Mega Gates of Olympus!');
                import('../../ui/AuraSound.js').then(m => m.default.playCasinoWin());
            } else {
                const strikeTexts = ["DIVINE! ✨", "GODLY! 🏛️", "BLESSED! 🏺"];
                this.spawnPraiseText(strikeTexts[Math.floor(Math.random() * strikeTexts.length)]);
                this.spawnParticles(20, 'gold');
                import('../../ui/AuraSound.js').then(m => m.default.playClaimMoney());
            }

            // Print lines won inside slot display
            if (winDisplay) {
                winDisplay.innerHTML = `
                    <div style="font-weight:800; font-size:0.85rem; color:#34d399; animation:winPulse 1.2s ease-in-out infinite;">✅ MENANG +$${financeManager.formatCurrency(totalPayout)}</div>
                    <div style="font-size:0.65rem; color:rgba(255,255,255,0.5); max-height:60px; overflow-y:auto; width:100%; margin-top:2px;">
                        ${winsList.join(' | ')}
                    </div>
                `;
            }
        } else {
            if (winDisplay) winDisplay.innerHTML = `<span style="color:rgba(255,255,255,0.3); font-size:0.75rem; font-style:italic;">Tidak ada kombinasi baris. Gali terus!</span>`;
            ui.toast({ type: 'warning', title: 'Gunung Kosong', message: 'Tidak ada baris yang cocok!' });
            import('../../ui/AuraSound.js').then(m => m.default.playCasinoLose());
        }
    }
}
