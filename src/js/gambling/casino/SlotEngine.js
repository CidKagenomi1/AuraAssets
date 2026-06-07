/**
 * SlotEngine.js - Premium Gold Digger 6x3 Multi-Line Slot Engine
 * Handles 6 columns x 3 rows grid mechanics, 5 payline checking,
 * cascading visual animations, canvas particle effects, and auto spin.
 */

import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../core/GameState.js';
import ui from '../../ui/UIManager.js';

const SYMBOLS = [
    { emoji: '💎', name: 'Berlian Mulia',  baseWeight: 4,  multiplier3x: 50, multiplier2x: 3 },
    { emoji: '💰', name: 'Kantung Emas',   baseWeight: 8,  multiplier3x: 25, multiplier2x: 2 },
    { emoji: '🪙', name: 'Koin Emas',      baseWeight: 12, multiplier3x: 15, multiplier2x: 0 },
    { emoji: '⛏️', name: 'Beliung Tambang',baseWeight: 18, multiplier3x: 10, multiplier2x: 0 },
    { emoji: '🧨', name: 'Dinamit',        baseWeight: 25, multiplier3x: 6,  multiplier2x: 0 },
    { emoji: '🪨', name: 'Batu Bara',      baseWeight: 32, multiplier3x: 3,  multiplier2x: 0 },
];

const PAYLINES = [
    { name: 'Line 1 (Top Horizontal)', coordinates: [0, 0, 0, 0, 0, 0], color: '#3b82f6' },
    { name: 'Line 2 (Middle Horizontal)', coordinates: [1, 1, 1, 1, 1, 1], color: '#ec4899' },
    { name: 'Line 3 (Bottom Horizontal)', coordinates: [2, 2, 2, 2, 2, 2], color: '#10b981' },
    { name: 'Line 4 (V-Shape)', coordinates: [0, 1, 2, 2, 1, 0], color: '#fbbf24' },
    { name: 'Line 5 (Inverted V-Shape)', coordinates: [2, 1, 0, 0, 1, 2], color: '#a855f7' }
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

export class SlotEngine {
    constructor(onBalanceRefresh) {
        this.isSpinning = false;
        this.onBalanceRefresh = onBalanceRefresh;
        this.particles = [];
        this.particleLoopActive = false;
        this.autoSpinCount = 0;
        this.isAutoSpinning = false;
        // Matrix 6x3
        this.grid = Array.from({length: 6}, () => ['🪨', '🪨', '🪨']);
    }

    getHTML() {
        // Render 6 columns, each having 3 rows
        let colsHTML = '';
        for (let col = 0; col < 6; col++) {
            colsHTML += `
                <div class="slot-reel-wrap" style="overflow:hidden; height:240px; border-radius:12px; background:#1c130e; border:2px solid #3c2419; position:relative; display: flex; flex-direction: column; justify-content: space-around; padding: 5px 0;">
                    <div id="slot-reel-${col}-0" class="slot-symbol-block" style="font-size:3rem; height: 72px; display:flex; align-items:center; justify-content:center; transition:transform 0.1s; transform: scale(1);">🪨</div>
                    <div id="slot-reel-${col}-1" class="slot-symbol-block" style="font-size:3rem; height: 72px; display:flex; align-items:center; justify-content:center; transition:transform 0.1s; transform: scale(1);">🪨</div>
                    <div id="slot-reel-${col}-2" class="slot-symbol-block" style="font-size:3rem; height: 72px; display:flex; align-items:center; justify-content:center; transition:transform 0.1s; transform: scale(1);">🪨</div>
                </div>
            `;
        }

        return `
        <div style="max-width: 720px; margin: 0 auto; text-align: center;">
            <h3 style="font-weight: 900; color: #fff; margin-bottom: 0.5rem; font-size: 1.6rem; letter-spacing: -0.03em;">
                🎰 <span style="background: linear-gradient(90deg,#fbbf24,#f59e0b); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">GOLDY CRUSH</span> SLOT
            </h3>
            <p style="color:rgba(255,255,255,0.4); font-size:0.8rem; margin-bottom:1.5rem; text-transform:uppercase; letter-spacing:0.1em;">6 Kolom, 3 Baris &amp; 5 Garis Payout (Kemenangan Ganda!)</p>

            <!-- Slot Machine Cabinet -->
            <div class="slot-cabinet" style="position:relative; background: linear-gradient(180deg, #2d1e18 0%, #170f0b 100%); border: 3px solid #fbbf24; border-radius: 28px; padding: 1.75rem; margin-bottom: 1.5rem; box-shadow: 0 0 40px rgba(251,191,36,0.25), inset 0 0 30px rgba(0,0,0,0.7); overflow: hidden;">
                
                <!-- Particle overlay canvas -->
                <canvas id="slot-particle-canvas" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:10;"></canvas>

                <!-- Top lights row (Industrial Gold Theme) -->
                <div style="display:flex; justify-content:center; gap:0.5rem; margin-bottom:1rem;">
                    ${Array.from({length:9}, (_,i) => `<div class="slot-light" style="width:10px;height:10px;border-radius:50%;background:${i%2===0?'#fbbf24':'#f97316'};box-shadow:0 0 8px ${i%2===0?'#fbbf24':'#f97316'};animation:lightBlink ${0.5+i*0.1}s ease-in-out infinite alternate;"></div>`).join('')}
                </div>

                <!-- Reels Window -->
                <div class="slot-window" style="background:#0a0705; border:3px solid #513629; border-radius:20px; padding:0.75rem; margin-bottom:1rem; position:relative; overflow:hidden;">
                    
                    <div style="display:grid; grid-template-columns:repeat(6,1fr); gap:0.5rem; position:relative; z-index:1;">
                        ${colsHTML}
                    </div>
                </div>

                <!-- Win Display -->
                <div id="slot-win-display" style="min-height:36px; display:flex; flex-direction:column; align-items:center; justify-content:center; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid rgba(251,191,36,0.1); padding: 0.25rem 0.5rem;">
                    <span style="color:rgba(255,255,255,0.25); font-size:0.8rem; font-style:italic; text-transform:uppercase; letter-spacing:0.1em;">Tekan Gali Tambang Untuk Memulai...</span>
                </div>
            </div>

            <!-- Auto Spin Controls -->
            <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.05); border-radius:16px; padding:1.25rem; margin-bottom:1.25rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap: wrap;">
                <div style="text-align:left; flex: 1; min-width: 130px;">
                    <label style="display:block; font-size:0.75rem; color:rgba(255,255,255,0.5); margin-bottom:0.25rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em;">AUTO SPIN COUNT</label>
                    <input type="number" id="slot-autospin-count" value="10" min="1" max="1000" style="background:var(--bg-surface); border:1px solid var(--border-color); font-size:1.1rem; font-weight:700; color:#fff; width:100%; text-align:center; border-radius:8px; padding: 0.35rem 0.5rem; outline:none;">
                </div>
                <div style="flex:2; display:flex; gap:0.5rem; height: 44px; margin-top: auto; min-width: 200px;">
                    <button id="btn-slot-auto-start" class="bet-chip" style="flex:1; border-radius:10px; background: rgba(251,191,36,0.15); border-color: rgba(251,191,36,0.3); color: #fbbf24; font-size:0.85rem; font-weight: 800;">🤖 AUTO SPIN</button>
                    <button id="btn-slot-auto-stop" class="bet-chip" style="flex:1; border-radius:10px; background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #ef4444; font-size:0.85rem; font-weight: 800; display:none;">⏹️ STOP (0)</button>
                </div>
            </div>

            <!-- Bet Panel -->
            <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.05); border-radius:16px; padding:1.25rem; margin-bottom:1.25rem;">
                <label style="display:block; font-size:0.75rem; color:rgba(255,255,255,0.5); margin-bottom:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em;">JUMLAH TARUHAN</label>
                <div style="display:flex; gap:0.4rem; align-items:center; justify-content:center; margin-bottom:0.75rem;">
                    <span style="font-size:1.4rem; font-weight:900; color:#fbbf24;">$</span>
                    <input type="text" id="slot-bet-input" value="100,000" style="background:transparent; border:none; font-size:1.75rem; font-weight:900; color:#fff; width:200px; text-align:center; border-bottom:2px solid rgba(251,191,36,0.4); outline:none; padding:0.25rem 0;">
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
            <button id="btn-slot-spin" class="spin-btn" style="background:linear-gradient(135deg,#fbbf24 0%,#d97706 100%); border:none; font-weight:900; font-size:1.3rem; padding:1.1rem 3rem; width:100%; border-radius:14px; box-shadow:0 6px 20px rgba(251,191,36,0.3); cursor:pointer; transition:all 0.25s; color:#fff; letter-spacing:0.05em; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">
                ⛏️ GALI TAMBANG
            </button>

            <!-- Paytable Info -->
            <div style="margin-top:1.5rem; border-top:1px solid rgba(255,255,255,0.05); padding-top:1.25rem; text-align:left;">
                <div style="font-size:0.7rem; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:0.75rem; text-align:center;">— TABEL KELIPATAN MULTIPLIER (6x3) —</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.75rem;">
                    ${SYMBOLS.map(s => `
                    <div style="background:rgba(255,255,255,0.02); padding:0.4rem 0.6rem; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                        <span>${s.emoji} ${s.name}</span>
                        <span style="color:#fbbf24; font-weight:700;">3x: ${s.multiplier3x}× | 4x: ${s.multiplier3x * 2.5}× | 5x: ${s.multiplier3x * 6}× | 6x: ${s.multiplier3x * 15}×</span>
                    </div>`).join('')}
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
                0%, 100% { background: linear-gradient(135deg,#fbbf24 0%,#d97706 100%); }
                50% { background: linear-gradient(135deg,#f43f5e 0%,#e11d48 100%); }
            }
            .spin-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(251,191,36,0.55) !important; }
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
            .bet-chip:hover { background: rgba(251,191,36,0.15); border-color: rgba(251,191,36,0.4); color: #fbbf24; }
            .bet-chip-max { background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.3); color: #fbbf24; }
            
            /* Shake & Praise Animation styles */
            @keyframes shake {
                0%, 100% { transform: translate(0, 0) rotate(0deg); }
                10% { transform: translate(-3px, 2px) rotate(-1deg); }
                20% { transform: translate(2px, -3px) rotate(1deg); }
                30% { transform: translate(-1px, 2px) rotate(0deg); }
                40% { transform: translate(3px, 1px) rotate(1deg); }
                50% { transform: translate(-2px, -2px) rotate(-1deg); }
                60% { transform: translate(1px, 3px) rotate(0deg); }
                70% { transform: translate(-3px, 1px) rotate(1deg); }
                80% { transform: translate(2px, -2px) rotate(-1deg); }
                90% { transform: translate(-1px, 3px) rotate(0deg); }
            }
            .shake-anim {
                animation: shake 0.5s ease-in-out;
            }

            @keyframes praiseBounce {
                0% { transform: translate(-50%, -50%) scale(0) rotate(-10deg); opacity: 0; }
                30% { transform: translate(-50%, -50%) scale(1.35) rotate(5deg); opacity: 1; }
                40% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
                80% { opacity: 1; transform: translate(-50%, -70%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -90%) scale(0.7); }
            }

            .winning-symbol {
                background: rgba(251,191,36,0.2) !important;
                border: 2px solid #fbbf24 !important;
                border-radius: 8px;
                animation: pulseSymbol 0.5s ease-in-out infinite alternate;
            }
            @keyframes pulseSymbol {
                0% { transform: scale(1); }
                100% { transform: scale(1.1); }
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
            let ticks = 0;
            const maxTicks = 10 + delay * 3;
            const interval = setInterval(() => {
                for (let r = 0; r < 3; r++) {
                    const el = document.getElementById(`slot-reel-${colIdx}-${r}`);
                    if (el) {
                        el.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].emoji;
                        el.style.filter = 'blur(2px)';
                    }
                }
                ticks++;
                if (ticks >= maxTicks) {
                    clearInterval(interval);
                    for (let r = 0; r < 3; r++) {
                        const el = document.getElementById(`slot-reel-${colIdx}-${r}`);
                        if (el) {
                            el.textContent = finalEmojis[r];
                            el.style.filter = 'none';
                            el.style.transform = 'scale(1.1)';
                            setTimeout(() => { el.style.transform = 'scale(1)'; }, 150);
                        }
                    }
                    resolve();
                }
            }, 70);
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
        const spinBtn = document.getElementById('btn-slot-spin');
        if (spinBtn) {
            spinBtn.disabled = true;
            spinBtn.innerHTML = '<span style="animation:spin 0.5s linear infinite;display:inline-block;">⛏️</span> MENGGALI TAMBANG (6x3)...';
        }

        const winDisplay = document.getElementById('slot-win-display');
        if (winDisplay) winDisplay.innerHTML = `<span style="color:rgba(255,255,255,0.3); font-size:0.8rem; font-style:italic;">Mesin Gali Sedang Bekerja...</span>`;

        // Deduct bet
        financeManager.addExpense(betAmount, 'Lainnya', 'Taruhan Slot 6x3');
        this.onBalanceRefresh?.();

        const donations = gameState.get('donations') || { luckMultiplier: 1.0 };
        const luck = donations.luckMultiplier || 1.0;

        // Generate final matrix 6x3
        const resultMatrix = [];
        for (let col = 0; col < 6; col++) {
            const colSymbols = [];
            for (let row = 0; row < 3; row++) {
                colSymbols.push(this.weightedRandom(luck).emoji);
            }
            resultMatrix.push(colSymbols);
        }
        this.grid = resultMatrix;

        // Animate reels sequentially
        for (let col = 0; col < 6; col++) {
            await this._animateReel(col, resultMatrix[col], col);
            await new Promise(r => setTimeout(r, 100));
        }

        // Evaluate result
        this._evaluate(betAmount);

        this.isSpinning = false;
        if (spinBtn) {
            spinBtn.disabled = false;
            spinBtn.innerHTML = '⛏️ GALI TAMBANG';
        }

        // Handle Auto Spin cycle
        if (this.isAutoSpinning) {
            if (this.autoSpinCount > 1) {
                this.autoSpinCount--;
                const stopBtn = document.getElementById('btn-slot-auto-stop');
                if (stopBtn) stopBtn.textContent = `⏹️ STOP (${this.autoSpinCount})`;
                
                setTimeout(() => {
                    if (this.isAutoSpinning) this.spin();
                }, 1800);
            } else {
                this.stopAutoSpin();
            }
        }
    }

    _evaluate(bet) {
        const winDisplay = document.getElementById('slot-win-display');
        const lineBet = bet / 5; // bet split among 5 paylines
        let totalPayout = 0;
        const winsList = [];
        let hasDynamite = false;
        const symbolsToHighlight = []; // list of DOM element IDs to highlight

        // Check each payline
        PAYLINES.forEach((line, lineIdx) => {
            const lineSymbols = [];
            for (let col = 0; col < 6; col++) {
                const row = line.coordinates[col];
                lineSymbols.push(this.grid[col][row]);
            }

            // Check adjacent matches from left-to-right
            const firstEmoji = lineSymbols[0];
            let matches = 1;
            for (let col = 1; col < 6; col++) {
                if (lineSymbols[col] === firstEmoji) {
                    matches++;
                } else {
                    break;
                }
            }

            // Find matching symbol stats
            const spec = SYMBOLS.find(s => s.emoji === firstEmoji);
            if (!spec) return;

            let lineMultiplier = 0;
            // Check win conditions
            if (matches >= 3) {
                if (matches === 3) lineMultiplier = spec.multiplier3x;
                else if (matches === 4) lineMultiplier = Math.round(spec.multiplier3x * 2.5);
                else if (matches === 5) lineMultiplier = Math.round(spec.multiplier3x * 6);
                else if (matches === 6) lineMultiplier = Math.round(spec.multiplier3x * 15);
            } else if (matches === 2 && spec.multiplier2x > 0) {
                lineMultiplier = spec.multiplier2x;
            }

            if (lineMultiplier > 0) {
                const lineWin = Math.round(lineBet * lineMultiplier);
                totalPayout += lineWin;
                winsList.push(`${line.name}: ${matches}x ${firstEmoji} (+$${lineWin.toLocaleString()})`);

                // Mark coordinates for visual highlight
                for (let col = 0; col < matches; col++) {
                    const row = line.coordinates[col];
                    symbolsToHighlight.push(`slot-reel-${col}-${row}`);
                }
            }
        });

        // Check if dynamite is anywhere on the screen
        for (let col = 0; col < 6; col++) {
            for (let row = 0; row < 3; row++) {
                if (this.grid[col][row] === '🧨') {
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
            financeManager.addIncome(totalPayout, 'Investasi', `Kemenangan Slot 6x3: ${winsList.length} Payline`);
            this.onBalanceRefresh?.();

            const isJackpot = totalPayout >= bet * 5;

            // Spawn floating text and particles
            if (isJackpot) {
                this.shakeCabinet();
                this.spawnPraiseText('GOLD RUSH! 🤩');
                this.spawnParticles(40, 'gold');
                this.spawnParticles(35, 'diamond');
                ui.success(`MEGA WIN 6x3! Total menang +$ ${totalPayout.toLocaleString()}`, '🎰 Mega Goldy Crush!');
            } else {
                this.spawnPraiseText('STRIKE! 🪙');
                this.spawnParticles(20, 'gold');
            }

            // Print lines won inside slot display
            if (winDisplay) {
                winDisplay.innerHTML = `
                    <div style="font-weight:800; font-size:0.9rem; color:#34d399; animation:winPulse 1.2s ease-in-out infinite;">✅ MENANG +$${financeManager.formatCurrency(totalPayout)}</div>
                    <div style="font-size:0.68rem; color:rgba(255,255,255,0.5); max-height:40px; overflow-y:auto; width:100%; margin-top:2px;">
                        ${winsList.join(' | ')}
                    </div>
                `;
            }
        } else {
            if (winDisplay) winDisplay.innerHTML = `<span style="color:rgba(255,255,255,0.3); font-size:0.8rem; font-style:italic;">Tidak ada kombinasi baris. Gali terus!</span>`;
            ui.toast({ type: 'warning', title: 'Tambang Kosong', message: 'Tidak ada baris yang cocok!' });
        }
    }
}
