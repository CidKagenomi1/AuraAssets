/**
 * BlackjackEngine.js - Blackjack 21 Game Engine
 * Full Blackjack with Double Down, Insurance, and card dealing animations.
 */

import financeManager from '../../../finance/FinanceManager.js';
import gameState from '../../../game/GameState.js';
import ui from '../../UIManager.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const RED_SUITS = new Set(['♥', '♦']);
const CARD_VALUES = [
    { name: 'A',  value: 11 },
    { name: '2',  value: 2  },
    { name: '3',  value: 3  },
    { name: '4',  value: 4  },
    { name: '5',  value: 5  },
    { name: '6',  value: 6  },
    { name: '7',  value: 7  },
    { name: '8',  value: 8  },
    { name: '9',  value: 9  },
    { name: '10', value: 10 },
    { name: 'J',  value: 10 },
    { name: 'Q',  value: 10 },
    { name: 'K',  value: 10 },
];

export class BlackjackEngine {
    constructor(onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;
        this.state = {
            isPlaying: false,
            bet: 0,
            sideBet: 0, // Insurance
            deck: [],
            playerCards: [],
            dealerCards: [],
            gameStatus: '', // 'playing','win','lose','push','blackjack','insurance'
            canDouble: false,
            canInsurance: false,
        };
    }

    getHTML() {
        return `
        <div style="max-width: 720px; margin: 0 auto; text-align: center;">
            <h3 style="font-weight: 900; color: #fff; margin-bottom: 0.5rem; font-size: 1.6rem; letter-spacing: -0.03em;">
                🃏 <span style="background: linear-gradient(90deg,#10b981,#059669); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">BLACKJACK</span> 21
            </h3>
            <p style="color:rgba(255,255,255,0.4); font-size:0.8rem; margin-bottom:1.5rem; text-transform:uppercase; letter-spacing:0.1em;">Capai 21 atau kalahkan dealer — Double Down & Insurance tersedia</p>

            <!-- Blackjack Table -->
            <div class="bj-felt-table" style="background:radial-gradient(ellipse at center, #065f46 0%, #064e3b 50%, #022c22 100%); border:3px solid #047857; border-radius:28px; padding:2rem 1.5rem; margin-bottom:1.5rem; position:relative; box-shadow:inset 0 0 60px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.5);">
                
                <!-- Table felt logo -->
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:160px; height:160px; border-radius:50%; border:2px dashed rgba(255,255,255,0.04); pointer-events:none; opacity:0.5;"></div>

                <!-- Dealer Section -->
                <div style="margin-bottom:1.75rem;">
                    <div style="display:flex; align-items:center; justify-content:center; gap:0.6rem; margin-bottom:0.75rem;">
                        <span style="font-size:0.7rem; color:rgba(255,255,255,0.5); text-transform:uppercase; font-weight:800; letter-spacing:0.1em;">DEALER</span>
                        <div id="bj-dealer-score-badge" style="background:rgba(0,0,0,0.5); color:#fff; font-weight:900; font-size:0.85rem; padding:0.2rem 0.6rem; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">0</div>
                    </div>
                    <div id="bj-dealer-cards" style="display:flex; gap:0.5rem; justify-content:center; min-height:110px; align-items:center; flex-wrap:wrap;">
                        <div class="bj-empty-hand">Dealer menunggu taruhan...</div>
                    </div>
                </div>

                <!-- Divider -->
                <div style="height:2px; background:rgba(255,255,255,0.05); border-radius:999px; margin:0.5rem 0 1.25rem;"></div>

                <!-- Result Banner (positioned over divider) -->
                <div id="bj-result-banner" style="display:none; position:absolute; left:1.5rem; right:1.5rem; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.92); border-radius:14px; padding:0.9rem 1.5rem; font-weight:900; font-size:1.2rem; color:#fff; z-index:10; border:2px solid #10b981; text-align:center; backdrop-filter:blur(8px);">
                    PLAYER BLACKJACK!
                </div>

                <!-- Player Section -->
                <div>
                    <div id="bj-player-cards" style="display:flex; gap:0.5rem; justify-content:center; min-height:110px; align-items:center; flex-wrap:wrap; margin-bottom:0.75rem;">
                        <div class="bj-empty-hand">Mulai untuk pembagian kartu...</div>
                    </div>
                    <div style="display:flex; align-items:center; justify-content:center; gap:0.6rem;">
                        <span style="font-size:0.7rem; color:rgba(255,255,255,0.5); text-transform:uppercase; font-weight:800; letter-spacing:0.1em;">YOUR HAND</span>
                        <div id="bj-player-score-badge" style="background:rgba(0,0,0,0.5); color:#fff; font-weight:900; font-size:0.85rem; padding:0.2rem 0.6rem; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">0</div>
                    </div>
                </div>
            </div>

            <!-- Bet Panel -->
            <div id="bj-bet-panel" style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.05); border-radius:16px; padding:1.25rem; margin-bottom:1.25rem;">
                <label style="display:block; font-size:0.75rem; color:rgba(255,255,255,0.5); margin-bottom:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em;">JUMLAH TARUHAN</label>
                <div style="display:flex; gap:0.4rem; align-items:center; justify-content:center; margin-bottom:0.75rem;">
                    <span style="font-size:1.4rem; font-weight:900; color:#10b981;">$</span>
                    <input type="text" id="bj-bet-input" value="100,000" style="background:transparent; border:none; font-size:1.75rem; font-weight:900; color:#fff; width:200px; text-align:center; border-bottom:2px solid rgba(16,185,129,0.4); outline:none; padding:0.25rem 0;">
                </div>
                <div style="display:flex; gap:0.4rem; justify-content:center; flex-wrap:wrap;">
                    <button class="bet-chip-green bj-preset" data-val="10000">$10K</button>
                    <button class="bet-chip-green bj-preset" data-val="100000">$100K</button>
                    <button class="bet-chip-green bj-preset" data-val="1000000">$1M</button>
                    <button class="bet-chip-green bj-preset" data-val="5000000">$5M</button>
                    <button class="bet-chip-green bj-preset bet-chip-max-green" id="btn-bj-max">MAX</button>
                </div>
            </div>

            <!-- Current Bet Display (during play) -->
            <div id="bj-current-bet-display" style="display:none; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2); border-radius:12px; padding:0.6rem 1rem; margin-bottom:1rem; font-size:0.85rem; color:rgba(255,255,255,0.7);">
                Taruhan: <strong id="bj-current-bet-text" style="color:#10b981;"></strong>
                <span id="bj-insurance-info" style="display:none; margin-left:0.5rem; color:rgba(255,255,255,0.4);">| Asuransi: <strong id="bj-insurance-text" style="color:#fbbf24;"></strong></span>
            </div>

            <!-- Action Controls -->
            <div id="bj-action-controls">
                <!-- Deal Button -->
                <button id="btn-bj-deal" class="bj-action-btn bj-deal-btn" style="width:100%;">
                    🃏 PLACE BET &amp; DEAL
                </button>

                <!-- Play Buttons (shown during active game) -->
                <div id="bj-play-buttons" style="display:none; grid-template-columns:1fr 1fr; gap:0.75rem;">
                    <button id="btn-bj-hit" class="bj-action-btn bj-hit-btn">
                        ➕ HIT
                        <div style="font-size:0.65rem; opacity:0.6; font-weight:500; margin-top:0.15rem;">Tambah Kartu</div>
                    </button>
                    <button id="btn-bj-stand" class="bj-action-btn bj-stand-btn">
                        ✋ STAND
                        <div style="font-size:0.65rem; opacity:0.6; font-weight:500; margin-top:0.15rem;">Cukup</div>
                    </button>
                </div>

                <!-- Extra Options Row (Double Down, Insurance) -->
                <div id="bj-extra-buttons" style="display:none; grid-template-columns:1fr 1fr; gap:0.75rem; margin-top:0.75rem;">
                    <button id="btn-bj-double" class="bj-action-btn bj-double-btn" style="display:none;">
                        💰 DOUBLE DOWN
                        <div style="font-size:0.65rem; opacity:0.6; font-weight:500; margin-top:0.15rem;">Lipat Taruhan, 1 Kartu</div>
                    </button>
                    <button id="btn-bj-insurance" class="bj-action-btn bj-insurance-btn" style="display:none;">
                        🛡️ INSURANCE
                        <div style="font-size:0.65rem; opacity:0.6; font-weight:500; margin-top:0.15rem;">Setengah Taruhan</div>
                    </button>
                </div>
            </div>

            <style>
                .bj-empty-hand {
                    color: rgba(255,255,255,0.2);
                    font-size: 0.85rem;
                    font-style: italic;
                }
                .bj-card {
                    width: 64px;
                    height: 96px;
                    background: #fff;
                    border-radius: 10px;
                    border: 1px solid #d1d5db;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    padding: 5px 6px;
                    font-weight: 900;
                    color: #1f2937;
                    position: relative;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2);
                    animation: dealCard 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    flex-shrink: 0;
                }
                .bj-card.red { color: #dc2626; }
                .bj-card .card-suit-center { font-size: 1.4rem; text-align: center; line-height: 1; }
                .bj-card .card-corner { font-size: 0.85rem; line-height: 1.1; }
                .bj-card.dealer-back {
                    background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%);
                    background-image: repeating-linear-gradient(
                        45deg,
                        rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px,
                        transparent 2px, transparent 8px
                    );
                    border-color: #b91c1c;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                }
                .bj-card.dealer-back::after {
                    content: "🂠";
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.5rem;
                    opacity: 0.15;
                }
                @keyframes dealCard {
                    0% { transform: translateY(-40px) rotate(-8deg) scale(0.8); opacity: 0; }
                    100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
                }
                .bj-action-btn {
                    background: transparent;
                    border: 2px solid;
                    border-radius: 14px;
                    padding: 0.85rem 1.5rem;
                    font-weight: 900;
                    font-size: 1rem;
                    cursor: pointer;
                    font-family: inherit;
                    color: #fff;
                    transition: all 0.2s;
                    line-height: 1.2;
                }
                .bj-action-btn:hover:not(:disabled) { transform: translateY(-2px); }
                .bj-action-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; }
                .bj-deal-btn { background: #047857; border-color: #059669; box-shadow: 0 4px 15px rgba(4,120,87,0.4); }
                .bj-deal-btn:hover:not(:disabled) { background: #059669; box-shadow: 0 6px 20px rgba(4,120,87,0.6); }
                .bj-hit-btn { background: rgba(14,165,233,0.1); border-color: #0ea5e9; color: #7dd3fc; }
                .bj-hit-btn:hover:not(:disabled) { background: rgba(14,165,233,0.2); }
                .bj-stand-btn { background: rgba(234,179,8,0.1); border-color: #eab308; color: #fde047; }
                .bj-stand-btn:hover:not(:disabled) { background: rgba(234,179,8,0.2); }
                .bj-double-btn { background: rgba(168,85,247,0.1); border-color: #a855f7; color: #d8b4fe; font-size: 0.85rem; }
                .bj-double-btn:hover:not(:disabled) { background: rgba(168,85,247,0.2); }
                .bj-insurance-btn { background: rgba(251,191,36,0.08); border-color: rgba(251,191,36,0.4); color: #fcd34d; font-size: 0.85rem; }
                .bj-insurance-btn:hover:not(:disabled) { background: rgba(251,191,36,0.15); }
                .bet-chip-green {
                    background: rgba(16,185,129,0.07);
                    border: 1px solid rgba(16,185,129,0.2);
                    color: rgba(16,185,129,0.8);
                    font-size: 0.75rem; font-weight: 700;
                    padding: 0.35rem 0.75rem; border-radius: 20px; cursor: pointer; transition: all 0.2s;
                }
                .bet-chip-green:hover { background: rgba(16,185,129,0.18); border-color: #10b981; color: #10b981; }
                .bet-chip-max-green { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); color: #10b981; }
                @keyframes winPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            </style>
        </div>
        `;
    }

    bindEvents(container, onBalanceRefresh) {
        this.onBalanceRefresh = onBalanceRefresh;

        const bjInput = document.getElementById('bj-bet-input');
        if (bjInput) import('../../UIManager.js').then(m => m.default.setupNumericInput(bjInput));

        container.querySelectorAll('.bj-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById('bj-bet-input');
                if (!input) return;
                const balance = gameState.getBalance();
                input.value = btn.id === 'btn-bj-max'
                    ? balance.toLocaleString('en-US')
                    : parseInt(btn.dataset.val).toLocaleString('en-US');
                input.dispatchEvent(new Event('input'));
            });
        });

        document.getElementById('btn-bj-deal')?.addEventListener('click', () => this.deal());
        document.getElementById('btn-bj-hit')?.addEventListener('click', () => this.hit());
        document.getElementById('btn-bj-stand')?.addEventListener('click', () => this.stand());
        document.getElementById('btn-bj-double')?.addEventListener('click', () => this.doubleDown());
        document.getElementById('btn-bj-insurance')?.addEventListener('click', () => this.takeInsurance());
    }

    // ---- Deck Utilities ----

    createDeck() {
        const deck = [];
        for (const suit of SUITS) {
            for (const cv of CARD_VALUES) {
                deck.push({ suit, name: cv.name, value: cv.value, isRed: RED_SUITS.has(suit) });
            }
        }
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    calculateScore(cards) {
        let score = cards.reduce((s, c) => s + c.value, 0);
        let aces = cards.filter(c => c.name === 'A').length;
        while (score > 21 && aces > 0) { score -= 10; aces--; }
        return score;
    }

    // ---- Rendering ----

    _cardHTML(card, isBack = false, delay = 0) {
        if (isBack) {
            return `<div class="bj-card dealer-back" style="animation-delay:${delay}s;"></div>`;
        }
        return `
        <div class="bj-card ${card.isRed ? 'red' : ''}" style="animation-delay:${delay}s;">
            <div class="card-corner">${card.name}<br>${card.suit}</div>
            <div class="card-suit-center">${card.suit}</div>
            <div class="card-corner" style="transform:rotate(180deg); text-align:right;">${card.name}<br>${card.suit}</div>
        </div>`;
    }

    renderState(hideDealerFirst = true) {
        const playerCards = document.getElementById('bj-player-cards');
        const dealerCards = document.getElementById('bj-dealer-cards');

        if (playerCards) {
            playerCards.innerHTML = this.state.playerCards
                .map((c, i) => this._cardHTML(c, false, i * 0.08))
                .join('');
        }
        if (dealerCards) {
            dealerCards.innerHTML = this.state.dealerCards
                .map((c, i) => this._cardHTML(c, hideDealerFirst && i === 0, i * 0.08))
                .join('');
        }

        const pScore = this.calculateScore(this.state.playerCards);
        const dEl = document.getElementById('bj-dealer-score-badge');
        const pEl = document.getElementById('bj-player-score-badge');
        if (pEl) pEl.textContent = pScore;
        if (dEl) {
            if (hideDealerFirst && this.state.dealerCards.length > 1) {
                dEl.textContent = this.state.dealerCards[1].value;
            } else {
                dEl.textContent = this.calculateScore(this.state.dealerCards);
            }
        }
    }

    _showBanner(msg, type = 'win') {
        const banner = document.getElementById('bj-result-banner');
        if (!banner) return;
        banner.textContent = msg;
        banner.style.display = 'block';
        const colorMap = {
            win: { border: '#10b981', bg: 'rgba(16,185,129,0.95)', color: '#fff' },
            blackjack: { border: '#fbbf24', bg: 'rgba(234,179,8,0.95)', color: '#000' },
            lose: { border: '#ef4444', bg: 'rgba(239,68,68,0.95)', color: '#fff' },
            push: { border: '#6366f1', bg: 'rgba(99,102,241,0.95)', color: '#fff' },
        };
        const c = colorMap[type] || colorMap.win;
        Object.assign(banner.style, { borderColor: c.border, background: c.bg, color: c.color });
    }

    // ---- Game Actions ----

    deal() {
        const input = document.getElementById('bj-bet-input');
        const betAmount = input?.getNumericValue ? input.getNumericValue() : parseInt(input?.value.replace(/,/g,'') || '0', 10);

        if (betAmount <= 0) { ui.error('Masukkan jumlah taruhan yang valid!'); return; }
        const balance = gameState.getBalance();
        if (betAmount > balance) { ui.error('Saldo tidak mencukupi!'); return; }

        financeManager.addExpense(betAmount, 'Lainnya', 'Taruhan Blackjack');
        this.onBalanceRefresh?.();

        this.state = {
            isPlaying: true,
            bet: betAmount,
            sideBet: 0,
            deck: this.createDeck(),
            playerCards: [],
            dealerCards: [],
            gameStatus: 'playing',
            canDouble: false,
            canInsurance: false,
        };

        // Deal 2 cards each
        this.state.playerCards = [this.state.deck.pop(), this.state.deck.pop()];
        this.state.dealerCards = [this.state.deck.pop(), this.state.deck.pop()];

        document.getElementById('bj-bet-panel').style.display = 'none';
        document.getElementById('btn-bj-deal').style.display = 'none';
        document.getElementById('bj-play-buttons').style.display = 'grid';
        document.getElementById('bj-result-banner').style.display = 'none';

        // Show current bet
        const betDisplay = document.getElementById('bj-current-bet-display');
        const betText = document.getElementById('bj-current-bet-text');
        if (betDisplay) betDisplay.style.display = 'block';
        if (betText) betText.textContent = `$${financeManager.formatCurrency(betAmount)}`;

        this.renderState(true);

        const pScore = this.calculateScore(this.state.playerCards);

        // Check if Double Down available (first two cards only)
        this.state.canDouble = balance >= betAmount;
        const dealerUpCard = this.state.dealerCards[1]; // visible dealer card
        this.state.canInsurance = dealerUpCard.name === 'A' && balance >= Math.ceil(betAmount / 2);

        // Show extra options if available
        const extraBtns = document.getElementById('bj-extra-buttons');
        const doubleBtn = document.getElementById('btn-bj-double');
        const insuranceBtn = document.getElementById('btn-bj-insurance');
        if (this.state.canDouble && doubleBtn) { doubleBtn.style.display = 'block'; }
        if (this.state.canInsurance && insuranceBtn) { insuranceBtn.style.display = 'block'; }
        if ((this.state.canDouble || this.state.canInsurance) && extraBtns) { extraBtns.style.display = 'grid'; }

        // Check natural blackjack
        if (pScore === 21) {
            setTimeout(() => this.stand(), 600);
        }
    }

    hit() {
        if (!this.state.isPlaying) return;

        // After first hit, disable Double Down and Insurance
        document.getElementById('btn-bj-double').style.display = 'none';
        document.getElementById('btn-bj-insurance').style.display = 'none';
        document.getElementById('bj-extra-buttons').style.display = 'none';

        this.state.playerCards.push(this.state.deck.pop());
        this.renderState(true);

        const pScore = this.calculateScore(this.state.playerCards);
        if (pScore > 21) {
            this.state.gameStatus = 'lose';
            this._endGame('💥 BUST! ANDA MELAMPAUI 21!', 'lose');
        } else if (pScore === 21) {
            this.stand();
        }
    }

    doubleDown() {
        if (!this.state.isPlaying || !this.state.canDouble) return;

        const balance = gameState.getBalance();
        if (this.state.bet > balance) { ui.error('Saldo tidak cukup untuk Double Down!'); return; }

        financeManager.addExpense(this.state.bet, 'Lainnya', 'Double Down Blackjack');
        this.state.bet *= 2;
        this.onBalanceRefresh?.();

        const betText = document.getElementById('bj-current-bet-text');
        if (betText) betText.textContent = `$${financeManager.formatCurrency(this.state.bet)} (2×)`;

        // Hide double/insurance
        document.getElementById('btn-bj-double').style.display = 'none';
        document.getElementById('btn-bj-insurance').style.display = 'none';
        document.getElementById('bj-extra-buttons').style.display = 'none';

        // One card only then stand
        this.state.playerCards.push(this.state.deck.pop());
        this.renderState(true);

        const pScore = this.calculateScore(this.state.playerCards);
        if (pScore > 21) {
            this.state.gameStatus = 'lose';
            this._endGame('💥 BUST AFTER DOUBLE DOWN!', 'lose');
        } else {
            setTimeout(() => this.stand(), 500);
        }
    }

    takeInsurance() {
        if (!this.state.canInsurance) return;
        const insuranceBet = Math.ceil(this.state.bet / 2);
        const balance = gameState.getBalance();
        if (insuranceBet > balance) { ui.error('Saldo tidak cukup untuk Insurance!'); return; }

        financeManager.addExpense(insuranceBet, 'Lainnya', 'Insurance Blackjack');
        this.state.sideBet = insuranceBet;
        this.state.canInsurance = false;
        this.onBalanceRefresh?.();

        // Update UI
        const insuranceInfo = document.getElementById('bj-insurance-info');
        const insuranceText = document.getElementById('bj-insurance-text');
        if (insuranceInfo) insuranceInfo.style.display = 'inline';
        if (insuranceText) insuranceText.textContent = `$${financeManager.formatCurrency(insuranceBet)}`;

        document.getElementById('btn-bj-insurance').style.display = 'none';
        ui.info(`Insurance diambil: $${financeManager.formatCurrency(insuranceBet)}`, '🛡️ Insurance');
    }

    stand() {
        if (!this.state.isPlaying) return;

        // Hide extra buttons
        document.getElementById('btn-bj-double').style.display = 'none';
        document.getElementById('btn-bj-insurance').style.display = 'none';
        document.getElementById('bj-extra-buttons').style.display = 'none';
        document.getElementById('bj-play-buttons').style.display = 'none';

        // Reveal dealer
        this.renderState(false);

        let dScore = this.calculateScore(this.state.dealerCards);
        // Dealer hits soft 17
        while (dScore < 17) {
            this.state.dealerCards.push(this.state.deck.pop());
            this.renderState(false);
            dScore = this.calculateScore(this.state.dealerCards);
        }

        const pScore = this.calculateScore(this.state.playerCards);
        const isNaturalBJ = pScore === 21 && this.state.playerCards.length === 2;

        // Check insurance payout
        if (this.state.sideBet > 0 && dScore === 21 && this.state.dealerCards.length === 2) {
            // Dealer blackjack — insurance pays 2:1
            const insurancePayout = this.state.sideBet * 3;
            financeManager.addIncome(insurancePayout, 'Investasi', 'Insurance Blackjack Win');
            ui.info(`Insurance menang! +$${financeManager.formatCurrency(insurancePayout - this.state.sideBet)}`, '🛡️ Insurance Payout');
            this.onBalanceRefresh?.();
        }

        if (dScore > 21) {
            this.state.gameStatus = 'win';
            this._endGame('🎉 DEALER BUST! ANDA MENANG!', 'win');
        } else if (isNaturalBJ && dScore !== 21) {
            this.state.gameStatus = 'blackjack';
            this._endGame('🏆 NATURAL BLACKJACK! MENANG 2.5×!', 'blackjack');
        } else if (pScore > dScore) {
            this.state.gameStatus = 'win';
            this._endGame('🎉 ANDA MENANG!', 'win');
        } else if (pScore < dScore) {
            this.state.gameStatus = 'lose';
            this._endGame('😞 ANDA KALAH! DEALER LEBIH TINGGI.', 'lose');
        } else {
            this.state.gameStatus = 'push';
            this._endGame('🤝 SERI (PUSH)! TARUHAN DIKEMBALIKAN', 'push');
        }
    }

    _endGame(bannerMsg, type) {
        this.state.isPlaying = false;

        const bet = this.state.bet;
        let payout = 0;

        switch (this.state.gameStatus) {
            case 'blackjack':
                payout = Math.round(bet * 2.5);
                financeManager.addIncome(payout, 'Investasi', 'Natural Blackjack Jackpot');
                ui.success(`BLACKJACK! Menang +$${financeManager.formatCurrency(payout - bet)}`, '🃏 Blackjack!');
                break;
            case 'win':
                payout = bet * 2;
                financeManager.addIncome(payout, 'Investasi', 'Kemenangan Blackjack');
                ui.success(`Menang! +$${financeManager.formatCurrency(payout - bet)}`, '🃏 Blackjack Win');
                break;
            case 'push':
                payout = bet;
                financeManager.addIncome(payout, 'Investasi', 'Taruhan Blackjack Kembalian (Push)');
                ui.info(`Push! Taruhan $${financeManager.formatCurrency(bet)} dikembalikan.`, '🃏 Blackjack Push');
                break;
            default:
                ui.error(`Kalah! Rugi $${financeManager.formatCurrency(bet)}`, '🃏 Blackjack');
        }

        this.onBalanceRefresh?.();
        this._showBanner(bannerMsg, type);

        setTimeout(() => this.reset(), 3500);
    }

    reset() {
        this.state = {
            isPlaying: false, bet: 0, sideBet: 0, deck: [],
            playerCards: [], dealerCards: [], gameStatus: '',
            canDouble: false, canInsurance: false,
        };

        document.getElementById('bj-bet-panel').style.display = 'block';
        document.getElementById('btn-bj-deal').style.display = 'block';
        document.getElementById('bj-play-buttons').style.display = 'none';
        document.getElementById('bj-extra-buttons').style.display = 'none';
        document.getElementById('bj-result-banner').style.display = 'none';
        document.getElementById('bj-current-bet-display').style.display = 'none';
        document.getElementById('btn-bj-double').style.display = 'none';
        document.getElementById('btn-bj-insurance').style.display = 'none';

        document.getElementById('bj-player-cards').innerHTML = '<div class="bj-empty-hand">Mulai untuk pembagian kartu...</div>';
        document.getElementById('bj-dealer-cards').innerHTML = '<div class="bj-empty-hand">Dealer menunggu taruhan...</div>';
        document.getElementById('bj-player-score-badge').textContent = '0';
        document.getElementById('bj-dealer-score-badge').textContent = '0';
    }
}
