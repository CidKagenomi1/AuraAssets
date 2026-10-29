/**
 * HomeScreen.js - Main Dashboard UI (v2)
 * - No Chart.js dependency
 * - Market Pulse widget (text-based)
 * - Role-aware: milestones, earn panel visibility
 * - Animations via Animations.js
 */

import gameState from '../core/GameState.js';
import globalEconomy from '../core/GlobalEconomy.js';
import financeManager from '../finance/FinanceManager.js';
import earnManager from '../core/EarnManager.js';
import roleManager from '../core/RoleManager.js';
import timeManager from '../core/TimeManager.js';
import stockMarket from '../trading/StockMarket.js';
import cryptoMarket from '../trading/CryptoMarket.js';
import newsManager from '../core/NewsManager.js';
import careerManager from '../career/CareerManager.js';
import propertyManager from '../property/PropertyManager.js';
import ui from './UIManager.js';
import { Icons } from './Icons.js';
import { countUp, pulseElement, staggerFadeUp, createFloatingText } from './Animations.js';

class HomeScreen {
    constructor() {
        this._lastBalance = 0;
        this.activeTimeframe = '1M';
        this.activeMoversTab = 'gainers';
    }

    init() {
        this.bindEvents();
        this.updateOverview();

        // Initialize dashboard main chart
        this.initDashboardChart();

        // Listen for state changes
        gameState.on('change', () => {
            this.updateBalanceCard();
            this.renderMilestones();
            this.renderHomeCashflow();
            this.updateDashboardChart();
        });
        gameState.on('economyUpdate', () => {
            this.renderMarketPulse();
            this.renderTopMovers();
        });
        gameState.on('stocksUpdate', () => this.renderTopMovers());
        gameState.on('cryptoUpdate', () => this.renderTopMovers());
        gameState.on('signalsUpdate', () => this.renderTopMovers());
        gameState.on('newsAlert', () => this.renderMarketPulse());
        gameState.on('newsUpdate', () => this.renderMarketPulse());
        gameState.on('careerUpdate', () => {
            this.renderHomeCareer();
            this.renderHomeCashflow();
        });
        gameState.on('utcTick', () => this.updateStatusBar());
        gameState.on('dayPass', () => this.updateStatusBar());
        gameState.on('monthPass', () => {
            this.updateStatusBar();
            this.renderMarketPulse();
            this.renderTopMovers();
            this.renderHomeCashflow();
            this.renderHomeCareer();
            this.renderMilestones();
            this.updateRecentTransactions();
            this.updateDashboardChart();
        });
        gameState.on('roleChange', () => {
            roleManager.applyVisibility();
            this.updateOverview();
        });
        gameState.on('transaction', () => {
            this.renderMilestones();
            this.renderHomeCashflow();
            this.updateRecentTransactions();
            this.updateDashboardChart();
        });
        gameState.on('tickBalanceUpdate', () => {
            if (this.activeTimeframe === '1D') {
                this.updateDashboardChart();
            }
        });
        gameState.on('dailyBalanceUpdate', () => {
            if (this.activeTimeframe !== '1D') {
                this.updateDashboardChart();
            }
        });

        // Stagger fade-up cards on load
        setTimeout(() => {
            staggerFadeUp(document.querySelectorAll('.menu-card:not(.hidden)'), 50);
        }, 100);
    }

    updateOverview() {
        this.updateBalanceCard();
        this.updateStatusBar();
        this.renderMarketPulse();
        this.renderTopMovers();
        this.renderHomeCashflow();
        this.renderHomeCareer();
        this.renderMilestones();
        this.updateRecentTransactions();
        this.updateDashboardChart();
    }

    // ==========================================
    // STATUS BAR
    // ==========================================

    updateStatusBar() {
        const dateEl = document.getElementById('game-date');
        if (dateEl) dateEl.textContent = timeManager.getFormattedDate();

        const clockEl = document.getElementById('game-clock');
        if (clockEl) clockEl.textContent = timeManager.getFormattedTime();

        // Refresh breaking news ticker countdown smoothly if active
        if (typeof newsManager.getActiveNews === 'function' && newsManager.getActiveNews().length > 0) {
            this.renderMarketPulse();
        }
    }

    // ==========================================
    // BALANCE CARD
    // ==========================================

    updateBalanceCard() {
        const balance = gameState.getBalance();
        const balanceEl = document.getElementById('balance-value');
        const sidebarBalance = document.getElementById('sidebar-balance-value');
        const sidebarName = document.getElementById('sidebar-player-name');
        const hideBalance = gameState.get('settings.hideBalance');
        const playerName = gameState.get('player.name') || 'Pemain';
        if (sidebarName) sidebarName.textContent = playerName;

        // Balance Display Logic
        const displayBalance = hideBalance ? '*******' : this.formatCompact(balance);
        const sidebarDisplay = hideBalance ? '*******' : ('$ ' + financeManager.formatCurrency(balance, true));

        if (balanceEl) {
            // Add toggle button if not exists
            if (!document.getElementById('btn-toggle-balance')) {
                const toggleBtn = document.createElement('button');
                toggleBtn.id = 'btn-toggle-balance';
                toggleBtn.className = 'btn-icon-sm';
                toggleBtn.style.marginLeft = '0.5rem';
                toggleBtn.style.background = 'none';
                toggleBtn.style.border = 'none';
                toggleBtn.style.cursor = 'pointer';
                toggleBtn.style.fontSize = '1.2rem';
                toggleBtn.style.display = 'inline-flex';
                toggleBtn.style.alignItems = 'center';
                toggleBtn.innerHTML = hideBalance ? Icons.eyeOff(18, 'var(--text-muted)') : Icons.eye(18, 'var(--text-muted)');
                toggleBtn.onclick = () => this.toggleBalanceVisibility();
                balanceEl.parentElement.appendChild(toggleBtn);
            } else {
                document.getElementById('btn-toggle-balance').innerHTML = hideBalance ? Icons.eyeOff(18, 'var(--text-muted)') : Icons.eye(18, 'var(--text-muted)');
            }

            // Animate count-up if balance changed and NOT hidden
            const prev = this._lastBalance;
            if (balance !== prev && !hideBalance) {
                countUp(balanceEl, prev, balance, 500, (n) => this.formatCompact(n));
                pulseElement(balanceEl.closest('.hero-balance-card') || balanceEl);
            } else if (hideBalance) {
                balanceEl.textContent = '*******';
            } else {
                balanceEl.textContent = displayBalance;
            }
            this._lastBalance = balance;
        }

        if (sidebarBalance) {
            sidebarBalance.textContent = sidebarDisplay;
            // Add click to toggle on sidebar too if needed, but button is clearer
            sidebarBalance.style.cursor = 'pointer';
            sidebarBalance.title = 'Klik untuk sembunyikan/tampilkan';
            if (!sidebarBalance.onclick) {
                sidebarBalance.onclick = () => this.toggleBalanceVisibility();
            }
        }

        const miniCard = document.querySelector('.player-mini-card');
        if (miniCard) {
            miniCard.title = `${playerName} — ${sidebarDisplay}`;
        }
    }

    formatCompact(num) {
        if (!isFinite(num) || num >= 1e30) return '∞';
        if (num >= 1e15) return (num / 1e15).toFixed(1) + 'Qa';
        if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        return new Intl.NumberFormat('id-ID').format(Math.round(num));
    }

    // Role-specific rendering delegated to RoleModules

    // ==========================================
    // RECENT TRANSACTIONS MINI
    // ==========================================

    updateRecentTransactions() {
        const el = document.getElementById('recent-transactions-mini');
        if (!el) return;

        const transactions = financeManager.getRecentTransactions?.(5) || [];

        if (!transactions.length) {
            el.innerHTML = `<div style="text-align:center;padding:1rem;color:var(--text-dim);font-size:0.85rem;">Belum ada transaksi</div>`;
            return;
        }

        el.innerHTML = transactions.map(t => {
            const isPositive = t.amount >= 0;
            const iconSvg = isPositive 
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--accent-primary)"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>'
                : '<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--accent-danger)"><path d="M15 10H9V7.11L5.11 11 9 14.89V12h6v2.89L18.89 11 15 7.11V10zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>';
            
            return `
                <div style="
                    display:flex;align-items:center;gap:0.75rem;
                    padding:0.6rem 0.75rem;
                    background:rgba(255,255,255,0.02);
                    border-radius:var(--radius-sm);
                    border:1px solid var(--border-color);
                ">
                    <span style="display:flex;align-items:center;justify-content:center;">${iconSvg}</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.8rem;font-weight:600;color:var(--text-main);
                             white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${t.description || t.category}
                        </div>
                    </div>
                    <div style="font-size:0.8rem;font-weight:700;
                         color:${isPositive ? 'var(--accent-primary)' : 'var(--accent-danger)'};
                         white-space:nowrap;">
                        ${isPositive ? '+' : ''}$ ${this.formatCompact(Math.abs(t.amount))}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderMarketPulse() {
        const status = globalEconomy.getMarketStatus();
        const fearGreed = globalEconomy.getFearGreedIndex();
        
        const valueEl = document.getElementById('fear-greed-value');
        const statusEl = document.getElementById('fear-greed-status');
        const needleEl = document.getElementById('fear-greed-needle');
        const newsEl = document.getElementById('market-pulse-news-text');
        const barPinEl = document.getElementById('fear-greed-bar-pin');
        const sentimentLabelEl = document.getElementById('market-sentiment-label');
        const newsImpactLabelEl = document.getElementById('market-news-impact-label');
        
        let label = 'Neutral';
        let color = '#eab308';
        
        if (fearGreed < 25) {
            label = 'Extreme Fear';
            color = '#ef4444';
        } else if (fearGreed < 45) {
            label = 'Fear';
            color = '#f97316';
        } else if (fearGreed <= 55) {
            label = 'Neutral';
            color = '#eab308';
        } else if (fearGreed <= 75) {
            label = 'Greed';
            color = '#22c55e';
        } else {
            label = 'Extreme Greed';
            color = '#10b981';
        }

        const activeNews = typeof newsManager.getActiveNews === 'function' ? newsManager.getActiveNews() : [];
        let newsContext = '';
        if (activeNews && activeNews.length > 0) {
            const latest = activeNews[activeNews.length - 1];
            newsContext = latest.type === 'positive' ? ' • Market Rally' : ' • Event Shock';
        }

        if (valueEl && statusEl) {
            valueEl.textContent = fearGreed;
            statusEl.textContent = label + newsContext;
            statusEl.style.color = color;
        }

        if (barPinEl) {
            const pct = Math.min(98, Math.max(2, fearGreed));
            barPinEl.style.left = `${pct}%`;
        }

        if (sentimentLabelEl) {
            const cycleLabels = {
                'Extreme Fear': 'Panik Ekstrem ⚠️',
                'Fear': 'Sentimen Defensif 🛡️',
                'Neutral': 'Netral & Seimbang ⚖️',
                'Greed': 'Optimisme Bullish 🚀',
                'Extreme Greed': 'Euforia Pasar 🔥'
            };
            sentimentLabelEl.textContent = cycleLabels[label] || label;
            sentimentLabelEl.style.color = color;
        }

        if (newsImpactLabelEl) {
            if (activeNews && activeNews.length > 0) {
                const latest = activeNews[activeNews.length - 1];
                const sign = latest.impact_percent > 0 ? '+' : '';
                newsImpactLabelEl.textContent = `${sign}${latest.impact_percent}% ${latest.type === 'positive' ? 'Rally' : 'Drop'}`;
                newsImpactLabelEl.style.color = latest.type === 'positive' ? '#10b981' : '#ef4444';
            } else {
                newsImpactLabelEl.textContent = 'Stabil & Normal';
                newsImpactLabelEl.style.color = '#10b981';
            }
        }

        if (needleEl) {
            const angle = (fearGreed - 50) * 1.8;
            needleEl.style.transform = `rotate(${angle}deg)`;
        }

        if (newsEl) {
            // Prioritize active breaking news event if present
            const activeNews = typeof newsManager.getActiveNews === 'function' ? newsManager.getActiveNews() : [];
            if (activeNews && activeNews.length > 0) {
                const latest = activeNews[activeNews.length - 1];
                const isPos = latest.type === 'positive';
                const isCrypto = latest.market === 'crypto';
                const sign = latest.impact_percent > 0 ? '+' : '';
                const badgeColor = isPos ? '#10b981' : '#ef4444';
                const icon = isCrypto ? '🪙' : '📈';
                const target = isCrypto ? (latest.target_asset || latest.sector) : (latest.ticker_target || latest.sector);
                const countdown = typeof newsManager.getRemainingCountdown === 'function' ? newsManager.getRemainingCountdown(latest) : '';
                newsEl.innerHTML = `<span style="display:inline-flex; align-items:center; gap:4px; font-weight:800; color:${badgeColor}; flex-shrink:0;">${icon} [${sign}${latest.impact_percent}% ${target}]</span> <span style="color:#fff; opacity:0.95; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${latest.headline}</span> <span style="color:var(--text-dim); font-size:0.7rem; flex-shrink:0;">(sisa ${countdown})</span>`;
                return;
            }

            const trendMessages = {
                RECOVERY: [
                    'Sinyal pemulihan terdeteksi! Rantai pasok mulai stabil dan volume pasar naik.',
                    'Pasar mulai bergeliat kembali seiring meningkatnya akumulasi institusi.',
                    'Sentimen negatif mereda, harga aset mulai merangkak naik perlahan.'
                ],
                BULL: [
                    'Ekspansi pasar modal terkonfirmasi! Keuntungan portofolio melesat.',
                    'Likuiditas investor melimpah, transaksi bursa saham melonjak drastis.',
                    'Indeks bursa mencatat rekor tertinggi baru ditopang optimisme pasar.'
                ],
                PEAK: [
                    'Ekonomi mencapai puncak siklus. Waspadai aksi koreksi jangka pendek.',
                    'Volume transaksi berada di level ekstrem. Rawan profit-taking.',
                    'Valuasi pasar berada di tingkat tertinggi. Pertimbangkan ambil profit.'
                ],
                BEAR: [
                    'Koreksi dalam terjadi di pasar modal. Investor disarankan bersikap defensif.',
                    'Ketidakpastian ekonomi memicu perlambatan transaksi pasar aset.',
                    'Diskon harga aset meluas, peluang mencari saham dan kripto potensial.'
                ],
                TROUGH: [
                    'Ekonomi menyentuh titik terendah. Momentum akumulasi aset murah.',
                    'Pasar sangat sepi, waktu terbaik untuk dollar-cost averaging.',
                    'Valuasi historis sangat murah, potensi rebound di depan mata.'
                ]
            };

            const messages = trendMessages[status.trend] || ['Pasar bergerak stabil dalam rentang sempit.'];
            const day = gameState.get('gameTime.day') || 1;
            const msgIdx = day % messages.length;
            newsEl.textContent = messages[msgIdx];
        }
    }

    renderTopMovers() {
        const listEl = document.getElementById('top-movers-list');
        if (!listEl) return;

        const rawStocks = typeof stockMarket.getAllStocks === 'function' ? (stockMarket.getAllStocks() || []) : [];
        const rawCryptos = typeof cryptoMarket.getAllCryptos === 'function' ? (cryptoMarket.getAllCryptos() || []) : [];

        const stocks = rawStocks.map(s => ({
            ...s,
            assetType: 'stock',
            tagLabel: s.sector || 'Stock'
        }));
        const cryptos = rawCryptos.map(c => ({
            ...c,
            assetType: 'crypto',
            tagLabel: c.sector || c.category || 'Crypto'
        }));
        const allAssets = [...stocks, ...cryptos];

        // Support both tradingSignals array and market.signals map
        const tradingSignalsArr = gameState.get('tradingSignals') || [];
        const marketSignalsMap = gameState.get('market.signals') || {};
        const signalsBySymbol = { ...marketSignalsMap };
        if (Array.isArray(tradingSignalsArr)) {
            tradingSignalsArr.forEach(sig => {
                if (sig && sig.symbol) {
                    signalsBySymbol[sig.symbol] = {
                        type: sig.action === 'BUY' || sig.signal === 'BUY' ? 'MOON' : (sig.type || 'HOT'),
                        action: sig.action || sig.signal || 'SIGNAL',
                        confidence: sig.confidence || 80
                    };
                }
            });
        }

        let displayItems = [];
        const tab = this.activeMoversTab || 'gainers';

        if (tab === 'gainers') {
            displayItems = [...allAssets]
                .sort((a, b) => (b.change || 0) - (a.change || 0))
                .slice(0, 4);
        } else if (tab === 'losers') {
            displayItems = [...allAssets]
                .sort((a, b) => (a.change || 0) - (b.change || 0))
                .slice(0, 4);
        } else if (tab === 'signals') {
            const signalPriority = { MOON: 3, HOT: 2, HEAT: 1 };
            const withSignal = allAssets.filter(a => signalsBySymbol[a.symbol]);
            if (withSignal.length > 0) {
                displayItems = withSignal
                    .sort((a, b) => {
                        const pa = signalPriority[signalsBySymbol[a.symbol]?.type] || 0;
                        const pb = signalPriority[signalsBySymbol[b.symbol]?.type] || 0;
                        if (pb !== pa) return pb - pa;
                        return Math.abs(b.change || 0) - Math.abs(a.change || 0);
                    })
                    .slice(0, 4);
            } else {
                // Fallback to highest momentum assets if no active AI signals yet
                displayItems = [...allAssets]
                    .sort((a, b) => Math.abs(b.change || 0) - Math.abs(a.change || 0))
                    .slice(0, 4);
            }
        }

        const formatAssetPrice = (price, assetType) => {
            const p = Number(price) || 0;
            if (assetType === 'crypto') {
                if (p < 0.001) return p.toFixed(6);
                if (p < 1) return p.toFixed(4);
            }
            return financeManager.formatCurrency(p, true);
        };

        listEl.innerHTML = displayItems.map(item => {
            const isUp = (item.change || 0) >= 0;
            const sig = signalsBySymbol[item.symbol];
            let signalBadge = '';
            if (sig) {
                const sigMeta = {
                    MOON: { text: `${Icons.rocket(12, '#10b981')} BUY SIGNAL`, bg: 'rgba(16, 185, 129, 0.18)', color: '#10b981', border: 'rgba(16, 185, 129, 0.4)' },
                    HOT:  { text: `${Icons.flame(12, '#fbbf24')} HOT SIGNAL`, bg: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.4)' },
                    HEAT: { text: `${Icons.zap(12, '#f87171')} VOLATILE`,   bg: 'rgba(239, 68, 68, 0.18)',  color: '#f87171', border: 'rgba(239, 68, 68, 0.4)' }
                }[sig.type] || { text: `${Icons.activity(12, '#60a5fa')} AI SIGNAL`, bg: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.4)' };
                signalBadge = `<span class="mover-signal-badge" style="background:${sigMeta.bg};color:${sigMeta.color};border:1px solid ${sigMeta.border};display:inline-flex;align-items:center;gap:3px;">${sigMeta.text}</span>`;
            }

            const openFn = item.assetType === 'crypto'
                ? `window.openCryptoDetail('${item.symbol}')`
                : `window.openStockDetail('${item.symbol}')`;

            const typePill = item.assetType === 'crypto' ? `${Icons.coins(12, '#f59e0b')} Kripto` : `${Icons.chart(12, 'var(--accent-primary)')} Saham`;

            return `
                <div class="mover-card" onclick="${openFn}" title="Klik untuk trading ${item.name} (${item.symbol})">
                    <div class="mover-card-left">
                        <span class="mover-icon">${item.icon || '📊'}</span>
                        <div class="mover-info">
                            <div class="mover-symbol-row">
                                <span class="mover-symbol">${item.symbol}</span>
                                ${signalBadge || `<span class="mover-type-pill">${typePill}</span>`}
                            </div>
                            <div class="mover-sub">${item.tagLabel}</div>
                        </div>
                    </div>
                    <div class="mover-card-right">
                        <div class="mover-price">$ ${formatAssetPrice(item.price, item.assetType)}</div>
                        <div class="mover-change ${isUp ? 'up' : 'down'}">
                            ${isUp ? '▲ +' : '▼ '}${(item.change || 0).toFixed(2)}%
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderHomeCashflow() {
        const contentEl = document.getElementById('home-cashflow-content');
        if (!contentEl) return;

        const summary = financeManager.getMonthlySummary();
        const propertyRent = (propertyManager && typeof propertyManager.getTotalMonthlyRent === 'function') 
            ? propertyManager.getTotalMonthlyRent() 
            : 0;

        // Current month inflow estimate
        const estimatedInflow = Math.max(summary.totalIncome, propertyRent);
        const estimatedOutflow = summary.totalExpense;
        const netCashflow = estimatedInflow - estimatedOutflow;
        const savingRate = estimatedInflow > 0 ? Math.max(0, Math.min(100, Math.round((netCashflow / estimatedInflow) * 100))) : 0;
        const isSurplus = netCashflow >= 0;

        contentEl.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:0.85rem;">
                <div style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.65rem;">
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.75rem 0.6rem;">
                        <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Total Pemasukan</div>
                        <div style="font-size:1.05rem; font-weight:800; color:#10b981; margin-top:2px;">+$ ${financeManager.formatCurrency(estimatedInflow, true)}</div>
                        <div style="font-size:0.65rem; color:var(--text-dim); margin-top:1px;">per bulan</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.75rem 0.6rem;">
                        <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Total Pengeluaran</div>
                        <div style="font-size:1.05rem; font-weight:800; color:#ef4444; margin-top:2px;">-$ ${financeManager.formatCurrency(estimatedOutflow, true)}</div>
                        <div style="font-size:0.65rem; color:var(--text-dim); margin-top:1px;">operasional & cicilan</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 0.75rem 0.6rem;">
                        <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Arus Kas Bersih</div>
                        <div style="font-size:1.05rem; font-weight:800; color:${isSurplus ? '#10b981' : '#ef4444'}; margin-top:2px;">
                            ${isSurplus ? '+' : ''}$ ${financeManager.formatCurrency(netCashflow, true)}
                        </div>
                        <div style="font-size:0.65rem; color:#38bdf8; font-weight:700; margin-top:1px;">Rasio Tabung: ${savingRate}%</div>
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.18); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 0.75rem 0.85rem; display:flex; flex-direction:column; gap:0.45rem;">
                    <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Komponen Aliran Kas</div>
                    <div style="display:flex; flex-wrap:wrap; gap:0.5rem; font-size:0.75rem;">
                        ${propertyRent > 0 ? `
                        <span style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.25); color:#fbbf24; padding:3px 8px; border-radius:4px; font-weight:600;">
                            🏢 Yield Properti: +$ ${financeManager.formatCurrency(propertyRent, true)}/bln
                        </span>
                        ` : ''}
                        <span style="background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.25); color:#818cf8; padding:3px 8px; border-radius:4px; font-weight:600;">
                            📊 Status: ${isSurplus ? 'Surplus Finansial' : 'Defisit Pengeluaran'}
                        </span>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-view-cashflow-detail')?.addEventListener('click', (e) => {
            e.stopPropagation();
            import('./ViewManager.js').then(m => {
                m.default.switchView('portfolio');
            });
        });
    }

    renderHomeCareer() {
        const contentEl = document.getElementById('home-career-content');
        const badgeEl = document.getElementById('career-level-badge');
        if (!contentEl) return;

        const currentRank = careerManager.getCurrentRank();
        const nextRank = careerManager.getNextRank();
        const eligibility = careerManager.getRankEligibility();
        const achievements = careerManager.getAchievementsStatus();

        if (badgeEl) {
            badgeEl.textContent = `Tingkat ${currentRank.level} • ${currentRank.title}`;
        }

        const canAdvance = eligibility.canAdvance;

        contentEl.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:0.85rem;">
                <!-- Header Rank -->
                <div style="display:flex; justify-content:space-between; align-items:center; gap:0.75rem;">
                    <div style="display:flex; align-items:center; gap:0.65rem;">
                        <div style="font-size:1.85rem; width:44px; height:44px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:10px; display:flex; align-items:center; justify-content:center;">
                            ${currentRank.badge}
                        </div>
                        <div>
                            <div style="font-size:0.95rem; font-weight:800; color:#fff;">${currentRank.title}</div>
                            <div style="font-size:0.74rem; color:var(--text-muted); margin-top:2px;">
                                ${currentRank.subtitle}
                            </div>
                        </div>
                    </div>
                    ${nextRank && canAdvance ? `
                    <button id="btn-advance-rank" class="btn btn-primary btn-sm" style="font-size:0.72rem; font-weight:800; padding:5px 12px; background:linear-gradient(135deg,#10b981,#059669); color:#000; border:none; cursor:pointer; box-shadow:0 0 10px rgba(16,185,129,0.4); border-radius:6px; display:inline-flex; align-items:center; gap:4px;">
                        ${Icons.zap(12, '#000')} Klaim Gelar Baru
                    </button>
                    ` : ''}
                </div>

                <!-- Progress to Next Rank -->
                ${nextRank ? `
                <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-muted); margin-bottom:4px;">
                        <span>Target Berikutnya: <strong>${nextRank.title}</strong></span>
                        <span style="font-weight:700; color:#fff;">${eligibility.progress}%</span>
                    </div>
                    <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                        <div style="height:100%; width:${eligibility.progress}%; background:linear-gradient(90deg, var(--accent-primary), #059669); border-radius:4px; transition:width 0.4s ease;"></div>
                    </div>
                    ${!canAdvance && eligibility.unmet.length > 0 ? `
                    <div style="font-size:0.68rem; color:#f59e0b; margin-top:4px; line-height:1.3;">
                        Syarat: ${eligibility.unmet[0]}
                    </div>
                    ` : ''}
                </div>
                ` : `
                <div style="font-size:0.75rem; color:#10b981; font-weight:700;">
                    🏆 Anda telah mencapai gelar reputasi investor tertinggi!
                </div>
                `}

                <!-- Horizontal Slideable Milestone Badges Carousel -->
                <div>
                    <div style="font-size:0.68rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; margin-bottom:0.4rem; display:flex; justify-content:space-between; align-items:center;">
                        <span>Lencana Milestone Pencapaian</span>
                        <span style="font-size:0.65rem; color:var(--text-dim);">← geser untuk melihat →</span>
                    </div>
                    <div class="career-milestone-slider" style="display:flex; gap:0.5rem; overflow-x:auto; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; padding-bottom:4px; scrollbar-width:thin;">
                        ${achievements.map(ach => `
                            <div style="flex: 0 0 auto; width: 145px; scroll-snap-align: start; background: ${ach.unlocked ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${ach.unlocked ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.05)'}; border-radius: 8px; padding: 0.55rem 0.65rem; display:flex; flex-direction:column; justify-content:space-between; gap:4px;">
                                <div style="display:flex; align-items:center; gap:6px;">
                                    <span style="font-size:1.15rem; filter:${ach.unlocked ? 'none' : 'grayscale(1)'};">${ach.icon}</span>
                                    <span style="font-size:0.75rem; font-weight:700; color:${ach.unlocked ? '#fff' : 'rgba(255,255,255,0.4)'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${ach.title}</span>
                                </div>
                                <div style="font-size:0.65rem; color:${ach.unlocked ? '#34d399' : 'rgba(255,255,255,0.25)'}; font-weight:600; display:flex; align-items:center; gap:3px;">
                                    ${ach.unlocked ? `${Icons.checkCircle(11, '#34d399')} Tercapai` : `${Icons.lock(11, 'rgba(255,255,255,0.35)')} Terkunci`}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-advance-rank')?.addEventListener('click', () => {
            const success = careerManager.advanceRank();
            if (success) {
                this.renderHomeCareer();
            }
        });
    }

    getMilestonesConfig() {
        return [
            { id: 'modal_awal',         label: 'Modal Awal',                  target: 100_000,       icon: '💵' },
            { id: 'portofolio_mapan',   label: 'Portofolio Mapan',            target: 500_000,       icon: '🛡️' },
            { id: 'jutawan_finansial',  label: 'Jutawan Finansial',           target: 1_000_000,     icon: '💼' },
            { id: 'empire_real_estate', label: 'Empire Real Estate',          target: 10_000_000,    icon: '🏛️' },
            { id: 'bilioner_sovereign', label: 'Bilioner & Sovereign Wealth', target: 100_000_000,   icon: '👑' },
            { id: 'financial_freedom',  label: 'Financial Freedom Tycoon',    target: 1_000_000_000, icon: '🏆' }
        ];
    }

    renderMilestones() {
        const el = document.getElementById('milestones-list');
        if (!el) return;

        const balance = gameState.getBalance();
        const milestones = this.getMilestonesConfig();
        const unlockedList = gameState.get('unlockedMilestones') || [];
        const claimedList = gameState.get('claimedMilestones') || [];
        const unlockedSet = new Set(unlockedList);
        const claimedSet = new Set(claimedList);

        // Automatically persist newly unlocked milestones when balance reaches target
        let newlyUnlocked = false;
        milestones.forEach(m => {
            if (balance >= m.target && !unlockedSet.has(m.id)) {
                unlockedSet.add(m.id);
                newlyUnlocked = true;
            }
        });
        if (newlyUnlocked) {
            gameState.state.unlockedMilestones = Array.from(unlockedSet);
            gameState.save();
        }

        el.innerHTML = milestones.map(m => {
            const reward = Math.round(m.target * 0.75);
            const isClaimed = claimedSet.has(m.id);
            const done = isClaimed || unlockedSet.has(m.id) || balance >= m.target;
            const canClaim = done && !isClaimed;
            const progress = done ? 100 : Math.min(100, (balance / m.target) * 100);

            let rightActionHTML = '';
            if (canClaim) {
                rightActionHTML = `
                    <button class="btn-claim-milestone" data-milestone-id="${m.id}" style="
                        padding: 6px 12px;
                        border-radius: 8px;
                        border: 1px solid rgba(251, 191, 36, 0.45);
                        background: linear-gradient(135deg, #f59e0b 0%, #10b981 100%);
                        color: #09090b;
                        font-size: 0.75rem;
                        font-weight: 800;
                        cursor: pointer;
                        white-space: nowrap;
                        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.28);
                        transition: transform 0.15s ease, filter 0.15s ease;
                    " onmouseenter="this.style.transform='scale(1.04)';this.style.filter='brightness(1.1)'"
                      onmouseleave="this.style.transform='';this.style.filter=''">
                        🎁 Klaim +$ ${this.formatCompact(reward)}
                    </button>
                `;
            } else if (isClaimed) {
                rightActionHTML = `
                    <span style="
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        padding: 4px 10px;
                        border-radius: 20px;
                        background: rgba(16, 185, 129, 0.14);
                        border: 1px solid rgba(16, 185, 129, 0.3);
                        color: #10b981;
                        font-size: 0.72rem;
                        font-weight: 800;
                        white-space: nowrap;
                    ">✓ Diklaim (+$ ${this.formatCompact(reward)})</span>
                `;
            } else {
                rightActionHTML = `
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:3px; min-width:56px;">
                        <span style="font-size:0.78rem; font-weight:700; color:var(--text-dim);">${progress.toFixed(0)}%</span>
                        <div style="width:52px; height:4px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
                            <div style="width:${progress.toFixed(1)}%; height:100%; background:var(--accent-primary); border-radius:4px;"></div>
                        </div>
                    </div>
                `;
            }

            return `
                <div class="milestone-item ${done ? 'achieved' : ''}" style="
                    display:flex;align-items:center;gap:0.875rem;padding:0.75rem 1rem;
                    background:${canClaim ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(16,185,129,0.08))' : (done ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)')};
                    border:1px solid ${canClaim ? 'rgba(245,158,11,0.4)' : (done ? 'rgba(16,185,129,0.25)' : 'var(--border-color)')};
                    border-radius:var(--radius-md);
                    transition: all 0.2s ease;
                ">
                    <span style="font-size:1.35rem;opacity:${done ? 1 : 0.45};">${m.icon}</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;font-size:0.9rem;color:${canClaim ? '#fbbf24' : (done ? '#10b981' : 'var(--text-main)')}; display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
                            <span>${m.label}</span>
                            ${canClaim ? '<span style="font-size:0.62rem; padding:1px 6px; border-radius:4px; background:rgba(245,158,11,0.2); color:#fbbf24; font-weight:800;">SIAP KLAIM</span>' : ''}
                        </div>
                        <div style="font-size:0.74rem;color:var(--text-dim); display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-top:2px;">
                            <span>Target: <strong style="color:rgba(255,255,255,0.75);">$ ${this.formatCompact(m.target)}</strong></span>
                            <span>•</span>
                            <span style="color:#10b981; font-weight:600;">🎁 Hadiah 75%: +$ ${this.formatCompact(reward)}</span>
                        </div>
                    </div>
                    <div class="milestone-action-wrap" style="text-align:right; flex-shrink:0;">
                        ${rightActionHTML}
                    </div>
                </div>
            `;
        }).join('');

        // Bind claim milestone buttons
        el.querySelectorAll('.btn-claim-milestone').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.claimMilestone(btn.dataset.milestoneId, btn);
            });
        });
    }

    claimMilestone(milestoneId, btnEl = null) {
        const milestones = this.getMilestonesConfig();
        const m = milestones.find(item => item.id === milestoneId);
        if (!m) return;

        const claimedList = gameState.get('claimedMilestones') || [];
        if (claimedList.includes(milestoneId)) {
            ui.info('Hadiah milestone ini sudah pernah diklaim.');
            return;
        }

        const balance = gameState.getBalance();
        const unlockedList = gameState.get('unlockedMilestones') || [];
        if (balance < m.target && !unlockedList.includes(milestoneId)) {
            ui.error('Milestone ini belum tercapai.');
            return;
        }

        const reward = Math.round(m.target * 0.75);

        // Mark as claimed BEFORE adding income so re-renders see updated state
        const nextClaimed = [...claimedList, milestoneId];
        gameState.set('claimedMilestones', nextClaimed);

        // Credit 75% reward to player's balance and record transaction
        financeManager.addIncome(reward, 'Bonus', `Hadiah Milestone (75%): ${m.label}`);

        try {
            import('./AuraSound.js').then(mod => mod.default.playClaimMoney());
        } catch (e) {}

        if (btnEl) {
            createFloatingText(btnEl, `+$ ${financeManager.formatCurrency(reward)}`, 'var(--accent-primary)');
        }

        ui.success(
            `Selamat! Anda mengklaim hadiah 75% dari milestone "${m.label}" sebesar +$ ${financeManager.formatCurrency(reward)}!`,
            '🏆 Hadiah Milestone Diklaim'
        );

        this.updateBalanceCard();
        this.renderMilestones();
        this.updateRecentTransactions();
        this.updateDashboardChart();
    }

    handleClaim() {
        const result = earnManager.claim();
        if (result.success) {
            try {
                import('./AuraSound.js').then(m => m.default.playClaimMoney());
            } catch (e) {}
            const btn = document.getElementById('btn-claim');
            if (btn) createFloatingText(btn, `+$ ${financeManager.formatCurrency(result.amount)}`, 'var(--accent-primary)');
            ui.success(`Claim berhasil: +$ ${financeManager.formatCurrency(result.amount)}`);
        } else {
            ui.error(result.message);
        }
    }

    handleUpgrade() {
        const result = earnManager.upgrade();
        if (result.success) {
            const btn = document.getElementById('btn-upgrade');
            if (btn) createFloatingText(btn, `-$ ${financeManager.formatCurrency(result.cost)}`, 'var(--accent-danger)');
            ui.success(`Upgrade Berhasil! Level ${result.level}`);
            this.updateBalanceCard();
        } else {
            ui.error(result.message);
        }
    }

    toggleBalanceVisibility() {
        const current = gameState.get('settings.hideBalance');
        gameState.set('settings.hideBalance', !current);
        this.updateBalanceCard();
        
        // Visual feedback
        ui.success(!current ? 'Saldo disembunyikan' : 'Saldo ditampilkan');
    }

    // ==========================================
    // QUICK ACTIONS
    // ==========================================

    bindEvents() {
        // Sidebar Collapse / Expand Toggle (retaining logo & icons)
        const appShell = document.querySelector('.app-shell');
        const toggleSidebarBtn = document.getElementById('btn-toggle-sidebar');
        const brandLogo = document.getElementById('sidebar-brand-logo');

        if (appShell && localStorage.getItem('auraAssets_sidebarCollapsed') === 'true') {
            appShell.classList.add('sidebar-collapsed');
        }

        const toggleSidebar = () => {
            if (!appShell) return;
            const isCollapsed = appShell.classList.toggle('sidebar-collapsed');
            localStorage.setItem('auraAssets_sidebarCollapsed', isCollapsed ? 'true' : 'false');
            setTimeout(() => {
                if (this.dashboardChart) this.dashboardChart.resize();
                window.dispatchEvent(new Event('resize'));
            }, 260);
        };

        toggleSidebarBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });

        brandLogo?.addEventListener('click', () => {
            if (appShell?.classList.contains('sidebar-collapsed')) {
                toggleSidebar();
            }
        });

        // Show Finance Panel button on balance card
        document.getElementById('btn-show-finance')?.addEventListener('click', () => {
            import('../finance/panels/FinancePanel.js').then(m => m.default.show());
        });

        // Earn buttons
        document.getElementById('btn-claim')?.addEventListener('click', () => this.handleClaim());
        document.getElementById('btn-upgrade')?.addEventListener('click', () => this.handleUpgrade());

        // Settings & Notifications
        document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettings());
        document.getElementById('btn-notifications')?.addEventListener('click', () => this.showNotifications());

        // Fear & Greed widget click navigation to trading-signal or breaking news tab
        const widget = document.getElementById('market-pulse-widget');
        if (widget) {
            widget.addEventListener('click', (e) => {
                if (e.target.closest('#market-pulse-news-text')) {
                    if (typeof window.openMarketNewsTab === 'function') {
                        window.openMarketNewsTab();
                    } else {
                        import('./ViewManager.js').then(m => {
                            m.default.switchView('market');
                            window.openMarketNewsTab?.();
                        });
                    }
                    return;
                }
                import('./ViewManager.js').then(m => m.default.switchView('trading-signal'));
            });
            widget.addEventListener('mouseenter', () => {
                widget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                widget.style.background = 'rgba(255, 255, 255, 0.02)';
            });
            widget.addEventListener('mouseleave', () => {
                widget.style.borderColor = 'var(--border-color)';
                widget.style.background = 'rgba(0, 0, 0, 0.25)';
            });
        }

        // Top Movers & Signals Widget Tabs
        document.querySelectorAll('.movers-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.movers-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeMoversTab = btn.dataset.moversTab || 'gainers';
                this.renderTopMovers();
            });
        });

        // Speed Control Buttons (Music Player style: Pause, Play, FF with no slowing down)
        const btnPause = document.getElementById('btn-time-pause');
        const btnPlay = document.getElementById('btn-time-play');
        const btnFF = document.getElementById('btn-time-ff');

        if (btnPause) {
            btnPause.addEventListener('click', () => {
                timeManager.setSpeed(0);
                this.updateStatusBar();
                ui.info('⏸️ Waktu DIHENTIKAN (PAUSE). Transaksi bulanan ditangguhkan.');
            });
        }

        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                timeManager.setSpeed(1);
                this.updateStatusBar();
                ui.success('⚡ Kecepatan simulasi diset ke normal (1x).');
            });
        }

        if (btnFF) {
            btnFF.addEventListener('click', () => {
                let speed = gameState.get('gameTime.speed') || 1;
                // Cycle speed up: 2x -> 5x -> 10x -> then back to 2x (no slow down)
                if (speed === 2) speed = 5;
                else if (speed === 5) speed = 10;
                else speed = 2; // Default speed up starts at 2x if currently 0 or 1, and wraps to 2x if at 10x

                timeManager.setSpeed(speed);
                this.updateStatusBar();
                ui.success(`⚡ Kecepatan simulasi dipercepat ke ${speed}x!`);
            });
        }

        // Quick action cards
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleQuickAction(btn.dataset.action));
        });

        // Nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                import('./ViewManager.js').then(m => m.default.switchView(btn.dataset.view));
            });
        });

        // Mobile footer tabs switcher
        const footerTabBtns = document.querySelectorAll('.footer-tab-btn');
        const milestonesSection = document.getElementById('footer-milestones-section');
        const transactionsSection = document.getElementById('footer-transactions-section');

        footerTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                footerTabBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.color = 'var(--text-muted)';
                    b.style.background = 'rgba(255,255,255,0.02)';
                    b.style.borderColor = 'var(--border-color)';
                });
                btn.classList.add('active');
                btn.style.color = 'var(--accent-primary)';
                btn.style.background = 'var(--accent-primary-soft)';
                btn.style.borderColor = 'rgba(16, 185, 129, 0.3)';

                const target = btn.dataset.tabTarget;
                if (target === 'milestones') {
                    if (milestonesSection) milestonesSection.style.display = 'block';
                    if (transactionsSection) transactionsSection.style.display = 'none';
                } else {
                    if (milestonesSection) milestonesSection.style.display = 'none';
                    if (transactionsSection) transactionsSection.style.display = 'block';
                }
            });
        });
    }

    handleQuickAction(action) {
        switch (action) {
            case 'invest':
            case 'crypto':
                import('./ViewManager.js').then(m => {
                    m.default.switchView('market');
                    setTimeout(() => {
                        document.querySelector(`[data-tab="${action === 'crypto' ? 'crypto' : 'stocks'}"]`)?.click();
                    }, 100);
                });
                break;
            case 'marketplace':
                import('../marketplace/panels/MarketplacePanel.js').then(m => m.default.show());
                break;
            case 'loan':
                import('../finance/panels/LoanPanel.js').then(m => m.default.show());
                break;
            case 'savings':
                import('../finance/panels/SavingsPanel.js').then(m => m.default.show());
                break;
            case 'property':
                import('../property/panels/PropertyPanel.js').then(m => m.default.show());
                break;
            case 'trading-signal':
                import('../trading/panels/TradingSignalPanel.js').then(m => m.default.show());
                break;
            case 'donate':
                this.handleDonate();
                break;
            case 'finance':
                import('../finance/panels/FinancePanel.js').then(m => m.default.show());
                break;
            case 'tax':
                import('../finance/panels/TaxPanel.js').then(m => m.default.show());
                break;
            case 'guide':
                this.showGuide();
                break;
        }
    }

    async handleDonate() {
        const balance = gameState.getBalance();
        const donations = gameState.get('donations') || { totalDonated: 0, luckMultiplier: 1.0, luckTicksRemaining: 0 };
        const isLuckActive = donations.luckTicksRemaining > 0 && donations.luckMultiplier > 1;

        const charityOptions = [
            {
                id: 'palestina',
                name: 'Donasi Palestina',
                org: 'BAZNAS Peduli Palestina',
                desc: 'Bantu saudara-saudara kita di Gaza mendapatkan pangan, obat-obatan, dan tempat berlindung.',
                icon: '🕌',
                emoji: '🇵🇸',
                color: '#10b981',
                gradient: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))',
                border: 'rgba(16,185,129,0.25)',
                tag: 'Kemanusiaan',
            },
            {
                id: 'masjid',
                name: 'Rumah Ibadah',
                org: 'Yayasan Masjid Nusantara',
                desc: 'Dukung pembangunan dan renovasi masjid serta musholla di pelosok negeri.',
                icon: '🕌',
                emoji: '🕌',
                color: '#a855f7',
                gradient: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(139,92,246,0.06))',
                border: 'rgba(168,85,247,0.25)',
                tag: 'Dakwah',
            },
            {
                id: 'panti',
                name: 'Panti Asuhan',
                org: 'Rumah Harapan Yatim Indonesia',
                desc: 'Berikan masa depan cerah bagi anak-anak yatim piatu melalui pendidikan dan kebutuhan dasar.',
                icon: '👦',
                emoji: '🏠',
                color: '#f59e0b',
                gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.06))',
                border: 'rgba(245,158,11,0.25)',
                tag: 'Anak Yatim',
            },
            {
                id: 'bencana',
                name: 'Korban Bencana Alam',
                org: 'ACT — Aksi Cepat Tanggap',
                desc: 'Salurkan bantuan darurat kepada korban gempa, banjir, dan bencana alam lainnya di Indonesia.',
                icon: '🆘',
                emoji: '🌊',
                color: '#ef4444',
                gradient: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.06))',
                border: 'rgba(239,68,68,0.25)',
                tag: 'Darurat',
            },
        ];

        const charityHTML = charityOptions.map(c => `
            <div class="charity-card" data-charity="${c.id}" style="
                background: ${c.gradient};
                border: 1px solid ${c.border};
                border-radius: 16px;
                padding: 1.25rem;
                cursor: pointer;
                transition: all 0.25s;
                position: relative;
                overflow: hidden;
            " onmouseenter="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)'" 
              onmouseleave="this.style.transform='';this.style.boxShadow=''">
                <div style="position:absolute; top:0.75rem; right:0.75rem; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:2px 8px; font-size:0.62rem; font-weight:700; color:rgba(255,255,255,0.5);">${c.tag}</div>
                <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
                    <div style="font-size:2rem; width:48px; height:48px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${c.emoji}</div>
                    <div>
                        <div style="font-size:0.95rem; font-weight:800; color:#fff; margin-bottom:2px;">${c.name}</div>
                        <div style="font-size:0.7rem; color:${c.color}; font-weight:700;">${c.org}</div>
                    </div>
                </div>
                <p style="font-size:0.8rem; color:rgba(255,255,255,0.55); line-height:1.5; margin-bottom:0.875rem;">${c.desc}</p>
                <button class="btn-donate-choose" data-charity-id="${c.id}" data-charity-name="${c.name}" data-charity-org="${c.org}" style="
                    width:100%; padding:0.6rem; border-radius:10px;
                    background: ${c.gradient};
                    border: 1px solid ${c.border};
                    color:${c.color}; font-weight:800; font-size:0.85rem;
                    cursor:pointer; font-family:inherit; transition:all 0.2s;
                " onmouseenter="this.style.filter='brightness(1.2)'" onmouseleave="this.style.filter=''">
                    ❤️ Donasi ke ${c.name}
                </button>
            </div>
        `).join('');

        const content = `
            <style>
                .charity-card { }
            </style>

            <div style="max-height:72vh; overflow-y:auto; padding-right:4px;">

                <!-- Luck Status Banner -->
                ${isLuckActive ? `
                <div style="background:linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.06)); border:1px solid rgba(251,191,36,0.25); border-radius:14px; padding:1rem 1.25rem; margin-bottom:1.25rem; display:flex; align-items:center; gap:0.875rem;">
                    <span style="font-size:1.75rem;">✨</span>
                    <div>
                        <div style="font-size:0.85rem; font-weight:800; color:#fbbf24;">Keberuntungan Aktif! (${donations.luckMultiplier}× Luck)</div>
                        <div style="font-size:0.75rem; color:rgba(255,255,255,0.5); margin-top:2px;">Masih berlaku ${donations.luckTicksRemaining} hari — berdonasi lagi untuk memperpanjang</div>
                    </div>
                </div>
                ` : `
                <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:1rem 1.25rem; margin-bottom:1.25rem;">
                    <div style="font-size:0.85rem; color:rgba(255,255,255,0.6); line-height:1.5;">
                        🌟 <strong style="color:#fff;">Bonus Keberuntungan:</strong> Setiap donasi ke badan amal manapun akan mengaktifkan buff <strong style="color:#fbbf24;">Luck 1.5×</strong> selama 30 hari game. Streak donasi bisa menumpuk hingga 180 hari!
                    </div>
                </div>
                `}

                <!-- Saldo Info -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15); border-radius:10px; padding:0.75rem 1rem;">
                    <span style="font-size:0.82rem; color:rgba(255,255,255,0.55);">💰 Saldo Anda tersedia untuk donasi</span>
                    <span style="font-size:1rem; font-weight:800; color:#10b981;">$ ${financeManager.formatCurrency(balance, true)}</span>
                </div>

                <!-- Charity Grid -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                    ${charityHTML}
                </div>

                <div style="margin-top:1.25rem; padding:0.875rem; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; font-size:0.75rem; color:rgba(255,255,255,0.4); text-align:center; line-height:1.6;">
                    Donasi bersifat permanen dan mengurangi saldo rekening Anda.<br>
                    Semua badan amal memberikan bonus keberuntungan yang sama bagi Anda.
                </div>
            </div>
        `;

        ui.showModal({
            title: '❤️ Pilih Badan Amal',
            content,
            onShow: () => {
                document.querySelectorAll('.btn-donate-choose').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const charityId = btn.dataset.charityId;
                        const charityName = btn.dataset.charityName;
                        const charityOrg = btn.dataset.charityOrg;
                        ui.closeModal();

                        await new Promise(r => setTimeout(r, 150));

                        const amount = await ui.promptMoney({
                            title: `Donasi ke ${charityName}`,
                            icon: '❤️',
                            maxAmount: balance,
                            confirmText: 'Donasikan Sekarang'
                        });

                        if (amount && amount > 0) {
                            try {
                                financeManager.donate(amount, charityOrg, 'Donasi');
                                ui.success(
                                    `$ ${financeManager.formatCurrency(amount)} berhasil didonasikan ke ${charityName}! ✨ Keberuntungan Anda meningkat!`,
                                    '❤️ Donasi Berhasil'
                                );
                                this.updateBalanceCard();
                            } catch (e) {
                                ui.error(e.message);
                            }
                        }
                    });
                });
            }
        });
    }


    // ==========================================
    // SETTINGS
    // ==========================================

    showSettings() {
        const role = roleManager.getRoleData();
        const allRoles = roleManager.getAllRoles();

        const roleOptionsHTML = allRoles.map(r => `
            <div class="role-card" data-role="${r.id}" style="
                background:${role?.id === r.id ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)'};
                border:1px solid ${role?.id === r.id ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'};
                border-radius:var(--radius-md);padding:0.875rem;
                cursor:pointer;transition:all 0.2s;margin-bottom:0.5rem;
                display:flex;align-items:center;gap:0.75rem;
            ">
                <span style="font-size:1.4rem;">${r.icon}</span>
                <div>
                    <div style="font-weight:700;font-size:0.9rem;">${r.label}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">${r.desc}</div>
                </div>
                ${role?.id === r.id ? '<span style="margin-left:auto;color:var(--accent-primary);font-size:0.85rem;font-weight:700;">✓ Aktif</span>' : ''}
            </div>
        `).join('');

        const accounts = gameState.getAccounts() || {};
        const lowerUser = (gameState.currentUser || '').toLowerCase();
        const activeAcc = accounts[lowerUser] || {};
        const currentAvatar = activeAcc.avatar || '👤';
        const chars = gameState.getCharacters() || [];

        const content = `
            <!-- 💾 Manual Save Card -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
                <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <span>💾 Penyimpanan Karakter</span>
                    <span style="font-size: 0.65rem; background: var(--accent-primary); color: #000; padding: 2px 6px; border-radius: 4px; font-weight: 800;">AUTO & MANUAL</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-top: 0.5rem;">
                    <div>
                        <strong style="color: #fff; font-size: 0.95rem; display: block; margin-bottom: 2px;">Akun: ${gameState.currentUser || 'Tamu'}</strong>
                        <span style="color: var(--accent-primary); font-size: 0.8rem; font-weight: 700; display: block; margin-bottom: 4px;">Karakter: ${gameState.activeCharacter || 'Pemain'}</span>
                        <span style="font-size: 0.7rem; color: var(--text-dim);">Tersimpan lokal di browser ini</span>
                    </div>
                    <button class="btn btn-primary btn-sm" id="btn-save-progress" style="font-weight: 900; letter-spacing: 0.05em; padding: 8px 16px; width: auto; height: auto;">
                        💾 SIMPAN
                    </button>
                </div>
            </div>

            <!-- ⚙️ Account Management -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
                <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                    <span>🛡️ Pengaturan Akun</span>
                    <span style="font-size: 0.85rem; font-weight: 800; color: #fff;">${currentAvatar} ${gameState.currentUser || 'Tamu'}</span>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="btn btn-secondary btn-sm" id="btn-change-acc-avatar" style="width: 100%; padding: 8px 12px; font-size: 0.75rem; font-weight: 700; height: auto; margin: 0; text-align: left; display: flex; align-items: center; gap: 0.5rem; justify-content: flex-start; min-width: 0;">
                        🖼️ Ganti Avatar Profil
                    </button>
                    <button class="btn btn-secondary btn-sm" id="btn-change-acc-name" style="width: 100%; padding: 8px 12px; font-size: 0.75rem; font-weight: 700; height: auto; margin: 0; text-align: left; display: flex; align-items: center; gap: 0.5rem; justify-content: flex-start; min-width: 0;">
                        ✏️ Ganti Nama Akun
                    </button>
                    <button class="btn btn-secondary btn-sm" id="btn-change-acc-pass" style="width: 100%; padding: 8px 12px; font-size: 0.75rem; font-weight: 700; height: auto; margin: 0; text-align: left; display: flex; align-items: center; gap: 0.5rem; justify-content: flex-start; min-width: 0;">
                        🔑 Ganti Sandi Akun
                    </button>
                </div>
            </div>

            <!-- 👤 Character Management -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
                <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 0.75rem;">
                    👤 Manajer Karakter (Multi-Slots)
                </div>
                
                <!-- List characters -->
                <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 180px; overflow-y: auto; margin-bottom: 0.75rem; padding-right: 4px;">
                    ${chars.length === 0 ? `
                        <div style="font-size: 0.75rem; color: var(--text-dim); text-align: center; padding: 0.5rem 0;">Belum ada karakter terdaftar.</div>
                    ` : chars.map(charName => {
                        const isActive = charName.toLowerCase() === (gameState.activeCharacter || '').toLowerCase();
                        return `
                            <div style="display: flex; align-items: center; justify-content: space-between; background: ${isActive ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)'}; padding: 8px 12px; border-radius: 8px; font-size: 0.8rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="font-size: 1.1rem;">${isActive ? '👑' : '👤'}</span>
                                    <span style="font-weight: 700; color: ${isActive ? '#10b981' : '#fff'};">${charName}</span>
                                </div>
                                ${isActive ? `
                                    <span style="color: #10b981; font-weight: 800; font-size: 0.7rem;">AKTIF</span>
                                ` : `
                                    <button class="btn btn-secondary btn-sm btn-switch-character" data-charname="${charName}" style="padding: 4px 10px; font-size: 0.7rem; font-weight: 800; width: auto; height: auto; min-width: 0; margin: 0;">
                                        MASUK 🔑
                                    </button>
                                `}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <!-- Create new character button -->
                <button class="btn btn-secondary btn-sm" id="btn-create-character" style="width: 100%; font-weight: 800; font-size: 0.75rem; border: 1px dashed rgba(255,255,255,0.2); background: transparent; padding: 8px 0; height: auto;">
                    ➕ BUAT KARAKTER BARU / MULAI BARU
                </button>
            </div>

            <!-- ⚙️ General Settings -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
                <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 0.75rem;">
                    ⚙️ Pengaturan Umum
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #fff; font-size: 0.88rem; display: block; margin-bottom: 2px;">Disable Subsidi Pemerintah</strong>
                        <span style="font-size: 0.72rem; color: var(--text-dim);">Hentikan pengumpulan dana pasif per detik</span>
                    </div>
                    <label class="switch" style="position:relative; display:inline-block; width:44px; height:22px;">
                        <input type="checkbox" id="chk-disable-subsidy" ${gameState.get('settings.subsidyDisabled') ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                        <span class="slider" style="position:absolute; cursor:pointer; inset:0; background-color:${gameState.get('settings.subsidyDisabled') ? '#0ea5e9' : '#374151'}; border-radius:20px; transition:0.3s; display:flex; align-items:center;">
                            <span class="knob" style="height:16px; width:16px; background-color:white; border-radius:50%; transition:0.3s; transform:translateX(${gameState.get('settings.subsidyDisabled') ? '24px' : '4px'}); display:block;"></span>
                        </span>
                    </label>
                </div>
            </div>

            <div style="margin-bottom:1.25rem;">
                <div style="font-size:0.85rem;font-weight:600;color:var(--text-muted);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.04em;">Profil Risiko Investor</div>
                ${roleOptionsHTML}
            </div>
            <hr style="border-color:var(--border-color);margin:1rem 0;">
            <button class="btn btn-secondary" style="width:100%; margin-bottom: 0.5rem;" id="btn-logout-game">🚪 Keluar (Logout)</button>
            <button class="btn btn-danger" style="width:100%" id="btn-reset-game">🗑️ Reset Progress Karakter</button>
        `;

        ui.showModal({
            title: '⚙️ Pengaturan & Karakter',
            content,
            onShow: () => {
                // Save progress click
                document.getElementById('btn-save-progress')?.addEventListener('click', (e) => {
                    const success = gameState.save();
                    if (success) {
                        ui.success('Progres permainan berhasil disimpan ke slot karakter: ' + (gameState.activeCharacter || 'Pemain'), '💾 Sukses Menyimpan', { deviceNotify: true });
                        try {
                            import('./Animations.js').then(anim => {
                                anim.createFloatingText(e.target, '💾 DISIMPAN', '#10b981');
                            });
                        } catch (err) {}
                    } else {
                        ui.error('Gagal menyimpan progres permainan. Memori penuh atau Anda belum login.', '💾 Gagal Menyimpan');
                    }
                });

                // Change Account Username click
                document.getElementById('btn-change-acc-name')?.addEventListener('click', async () => {
                    if (!gameState.currentUser) return;
                    const newName = prompt("Masukkan nama akun baru Anda:", gameState.currentUser);
                    if (newName === null) return;
                    if (!newName.trim()) {
                        ui.error("Nama akun tidak boleh kosong!");
                        return;
                    }
                    try {
                        gameState.changeAccountUsername(newName);
                        ui.success("Nama akun berhasil diubah!", "🛡️ Sukses");
                        setTimeout(() => location.reload(), 1000);
                    } catch (err) {
                        ui.error(err.message);
                    }
                });

                // Change Account Password click
                document.getElementById('btn-change-acc-pass')?.addEventListener('click', async () => {
                    if (!gameState.currentUser) return;
                    const newPass = prompt("Masukkan password baru Anda (minimal 4 karakter):");
                    if (newPass === null) return;
                    if (!newPass.trim()) {
                        ui.error("Password tidak boleh kosong!");
                        return;
                    }
                    try {
                        gameState.changeAccountPassword(newPass);
                        ui.success("Password akun berhasil diubah!", "🛡️ Sukses");
                    } catch (err) {
                        ui.error(err.message);
                    }
                });

                // Change Account Avatar click
                document.getElementById('btn-change-acc-avatar')?.addEventListener('click', () => {
                    const avatars = ['👤', '💼', '🦁', '🦅', '🦊', '🐉', '🚀', '💡', '🛡️', '👑'];
                    const accounts = gameState.getAccounts();
                    const lowerUser = gameState.currentUser.toLowerCase();
                    const currentAvatar = accounts[lowerUser]?.avatar || '👤';
                    let nextIdx = (avatars.indexOf(currentAvatar) + 1) % avatars.length;
                    const newAvatar = avatars[nextIdx];
                    
                    gameState.changeAccountAvatar(newAvatar);
                    ui.success(`Avatar profil berhasil diubah ke ${newAvatar}!`, '🖼️ Sukses');
                    setTimeout(() => location.reload(), 800);
                });

                // Create Character / Start New Game click
                document.getElementById('btn-create-character')?.addEventListener('click', async () => {
                    const confirmed = await ui.confirm({
                        title: 'Buat Karakter Baru?',
                        message: 'Progres karakter saat ini akan disimpan terlebih dahulu. Anda dapat membuat karakter baru di dalam akun ini secara terpisah.',
                        confirmText: 'Ya, Buat Karakter',
                        confirmClass: 'btn-primary'
                    });
                    if (confirmed) {
                        const saved = gameState.save();
                        if (saved) {
                            localStorage.removeItem(`businessTycoon_activeChar_${lowerUser}`);
                            location.reload();
                        } else {
                            ui.error('Gagal menyimpan progres sebelum membuat karakter baru.', 'Error');
                        }
                    }
                });

                // Switch Character click
                document.querySelectorAll('.btn-switch-character').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const charName = btn.dataset.charname;
                        try {
                            const saved = gameState.save(); // Save current profile first
                            if (!saved) {
                                ui.error('Gagal menyimpan progres saat ini sebelum berpindah karakter.', 'Error');
                                return;
                            }
                            localStorage.setItem(`businessTycoon_activeChar_${lowerUser}`, charName);
                            ui.success(`Membuka karakter: ${charName}...`, '👤 Berhasil Masuk');
                            setTimeout(() => location.reload(), 1000);
                        } catch (err) {
                            ui.error(err.message);
                        }
                    });
                });

                document.querySelectorAll('.role-card[data-role]').forEach(card => {
                    card.addEventListener('click', async () => {
                        const newRole = card.dataset.role;
                        if (newRole === roleManager.getRole()) return;
                        const confirmed = await ui.confirm({
                            title: 'Ubah Profil Risiko?',
                            message: 'Profil risiko investor Anda akan diperbarui. Progres dan portofolio tidak hilang.',
                            confirmText: 'Ya, Ubah',
                            danger: false
                        });
                        if (confirmed) {
                            roleManager.setRole(newRole);
                            roleManager.applyVisibility();
                            ui.closeModal();
                            ui.success(`Profil Risiko diubah menjadi: ${roleManager.getRoleData()?.label}`);
                        }
                    });
                });

                // Subsidy toggle switch event
                const chkSubsidy = document.getElementById('chk-disable-subsidy');
                if (chkSubsidy) {
                    chkSubsidy.addEventListener('change', (e) => {
                        const checked = e.target.checked;
                        gameState.set('settings.subsidyDisabled', checked);
                        const slider = chkSubsidy.nextElementSibling;
                        const knob = slider.querySelector('.knob');
                        slider.style.backgroundColor = checked ? '#0ea5e9' : '#374151';
                        knob.style.transform = `translateX(${checked ? '24px' : '4px'})`;
                        if (checked) {
                            ui.success('Subsidi Pemerintah Dinonaktifkan');
                        } else {
                            ui.success('Subsidi Pemerintah Diaktifkan');
                        }
                        this.updateBalanceCard();
                    });
                }

                document.getElementById('btn-logout-game')?.addEventListener('click', () => {
                    gameState.logout();
                });

                document.getElementById('btn-reset-game')?.addEventListener('click', () => {
                    const charName = gameState.activeCharacter || 'Pemain';
                    if (confirm(`Yakin mau reset progress karakter "${charName}"? Semua aset dan uang karakter ini akan dikembalikan ke awal!`)) {
                        gameState.reset();
                        location.reload();
                    }
                });
            }
        });
    }

    showNotifications() {
        // Reset unread count
        gameState.set('unreadNotificationsCount', 0);
        ui.updateNotificationBadge();

        const notifs = gameState.get('notifications') || [];
        const isNotifEnabled = gameState.get('settings.notificationsEnabled') !== false;
        const isDeviceNotifEnabled = gameState.get('settings.deviceNotificationsEnabled') === true;

        let content = `
            <div style="max-height: 65vh; display: flex; flex-direction: column; gap: 1rem;">
                <!-- Notification Settings Toggles -->
                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-weight: 700; font-size: 0.9rem; color: white;">Aktifkan Pop-up Notifikasi (Toast)</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Jika dinonaktifkan, notifikasi hanya akan menambah angka di lonceng tanpa popup yang menutupi konten.</div>
                        </div>
                        <label class="switch" style="position: relative; display: inline-block; width: 44px; height: 22px;">
                            <input type="checkbox" id="toggle-popup-notifs" ${isNotifEnabled ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span class="slider" style="position: absolute; cursor: pointer; inset: 0; background-color: ${isNotifEnabled ? 'var(--accent-primary)' : '#4b5563'}; border-radius: 20px; transition: 0.3s; display: flex; align-items: center;">
                                <span class="knob" style="height: 16px; width: 16px; background-color: white; border-radius: 50%; transition: 0.3s; transform: translateX(${isNotifEnabled ? '24px' : '4px'}); display: block;"></span>
                            </span>
                        </label>
                    </div>

                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-weight: 700; font-size: 0.9rem; color: white;">Notifikasi Perangkat (Desktop/HP)</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Kirim notifikasi hasil trading bot, claim staking/launchdrop, auto-save, dan sesi habis langsung ke perangkat Anda.</div>
                        </div>
                        <label class="switch" style="position: relative; display: inline-block; width: 44px; height: 22px;">
                            <input type="checkbox" id="toggle-device-notifs" ${isDeviceNotifEnabled ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span class="slider" style="position: absolute; cursor: pointer; inset: 0; background-color: ${isDeviceNotifEnabled ? 'var(--accent-primary)' : '#4b5563'}; border-radius: 20px; transition: 0.3s; display: flex; align-items: center;">
                                <span class="knob" style="height: 16px; width: 16px; background-color: white; border-radius: 50%; transition: 0.3s; transform: translateX(${isDeviceNotifEnabled ? '24px' : '4px'}); display: block;"></span>
                            </span>
                        </label>
                    </div>
                </div>

                <!-- Notifications List -->
                <div style="overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 0.75rem; padding-right: 5px;">
                    ${notifs.length ? notifs.map(n => `
                        <div style="display: flex; gap: 0.75rem; padding: 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                            <span style="font-size: 1.5rem; display: flex; align-items: center;">${n.icon || '🔔'}</span>
                            <div style="flex: 1;">
                                <div style="font-size: 0.85rem; font-weight: 800; color: white; display: flex; justify-content: space-between;">
                                     <span>${n.title}</span>
                                     <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: normal;">${n.date || ''}</span>
                                </div>
                                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; line-height: 1.4;">${n.message}</div>
                            </div>
                        </div>
                    `).join('') : `
                        <div style="text-align: center; padding: 3rem 0; color: var(--text-muted);">
                            <span style="font-size: 3rem; display: block; margin-bottom: 1rem;">🔔</span>
                            <div style="font-size: 0.9rem; font-weight: 700;">Belum ada notifikasi baru</div>
                        </div>
                    `}
                </div>
            </div>
        `;

        ui.showModal({ title: '🔔 Notifikasi & Log', content });

        // Add event listener to the switch
        const checkbox = document.getElementById('toggle-popup-notifs');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                const checked = e.target.checked;
                gameState.set('settings.notificationsEnabled', checked);
                const slider = checkbox.nextElementSibling;
                const knob = slider.querySelector('.knob');
                slider.style.backgroundColor = checked ? 'var(--accent-primary)' : '#4b5563';
                knob.style.transform = `translateX(${checked ? '24px' : '4px'})`;
                ui.success(checked ? 'Pop-up notifikasi diaktifkan' : 'Pop-up notifikasi dinonaktifkan (hanya angka lonceng)');
            });
        }

        const deviceCheckbox = document.getElementById('toggle-device-notifs');
        if (deviceCheckbox) {
            deviceCheckbox.addEventListener('change', (e) => {
                const checked = e.target.checked;
                const slider = deviceCheckbox.nextElementSibling;
                const knob = slider.querySelector('.knob');
                
                if (checked) {
                    if (!("Notification" in window)) {
                        ui.error("Browser Anda tidak mendukung notifikasi perangkat.");
                        deviceCheckbox.checked = false;
                        slider.style.backgroundColor = '#4b5563';
                        knob.style.transform = 'translateX(4px)';
                        return;
                    }
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            gameState.set('settings.deviceNotificationsEnabled', true);
                            slider.style.backgroundColor = 'var(--accent-primary)';
                            knob.style.transform = 'translateX(24px)';
                            ui.success('Notifikasi perangkat berhasil diaktifkan!');
                        } else {
                            gameState.set('settings.deviceNotificationsEnabled', false);
                            deviceCheckbox.checked = false;
                            slider.style.backgroundColor = '#4b5563';
                            knob.style.transform = 'translateX(4px)';
                            ui.error('Izin notifikasi ditolak oleh sistem/browser.');
                        }
                    });
                } else {
                    gameState.set('settings.deviceNotificationsEnabled', false);
                    slider.style.backgroundColor = '#4b5563';
                    knob.style.transform = 'translateX(4px)';
                    ui.success('Notifikasi perangkat dinonaktifkan');
                }
            });
        }
    }

    showGuide() {
        const role = roleManager.getRoleData();
        const content = `
            <div style="max-height:65vh;overflow-y:auto;">
                <div class="planning-card" style="margin-bottom:1rem;">
                    <h4 style="margin-bottom:0.5rem;">🎯 Tujuan Permainan</h4>
                    <p style="color:var(--text-muted);font-size:0.875rem;">Capai kebebasan finansial $ 1 Miliar! Kelola keuangan sesuai peranmu.</p>
                </div>
                ${role ? `
                <div class="planning-card" style="margin-bottom:1rem;border-color:${role.color}40;">
                    <h4 style="margin-bottom:0.5rem;">${role.icon} Profil Risiko Aktif: ${role.label}</h4>
                    <p style="color:var(--text-muted);font-size:0.875rem;">${role.detail}</p>
                    <p style="color:var(--text-muted);font-size:0.875rem;margin-top:0.5rem;">${role.strategy || role.monthlyEvent}</p>
                </div>
                ` : ''}
                <div class="planning-card" style="margin-bottom:1rem;">
                    <h4 style="margin-bottom:0.5rem;">🏦 Fitur Deposito & Reksa Dana</h4>
                    <ul style="color:var(--text-muted);font-size:0.875rem;padding-left:1.25rem;line-height:1.8;">
                        <li><strong>Deposito</strong>: Simpan dana dengan bunga bulanan (0.2% - 3.0%) yang dapat diatur menggunakan slider proyeksi live. Aktifkan auto-deposit untuk kemudahan menabung otomatis.</li>
                        <li><strong>Reksa Dana</strong>: Pilih dari 4 reksadana (Pasar Uang, Pendapatan Tetap, Campuran, Saham) dengan berbagai tingkat risiko dan imbal hasil bulanan untuk pertumbuhan modal.</li>
                    </ul>
                </div>
                <div class="planning-card" style="margin-bottom:1rem;">
                    <h4 style="margin-bottom:0.5rem;">🕊️ Sistem Donasi & Keberuntungan</h4>
                    <p style="color:var(--text-muted);font-size:0.875rem;line-height:1.6;">
                        Salurkan bantuan finansial ke berbagai badan amal pilihan (Palestina 🇵🇸, Masjid 🕌, Panti Asuhan 🏠, Bencana Alam 🌊) untuk mendapatkan berkah keberuntungan (Luck Boost 1.5x) selama 30 hari.
                    </p>
                </div>
                <div class="planning-card" style="margin-bottom:1rem;">
                    <h4 style="margin-bottom:0.5rem;">💡 Tips Pro</h4>
                    <ul style="color:var(--text-muted);font-size:0.875rem;padding-left:1.25rem;line-height:1.8;">
                        <li>Diversifikasi — jangan all-in satu aset</li>
                        <li>Bayar cicilan tepat waktu untuk credit score</li>
                        <li>Bisnis memberi passive income tanpa kerja manual</li>
                        <li>Ganti peran kapan saja di ⚙️ Pengaturan</li>
                    </ul>
                </div>
            </div>
        `;
        ui.showModal({ title: '📖 Panduan', content });
    }

    loadECharts() {
        if (window.echarts) return Promise.resolve(window.echarts);
        if (window._echartsLoadingPromise) return window._echartsLoadingPromise;

        window._echartsLoadingPromise = new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
            script.onload = () => {
                window._echartsLoadingPromise = null;
                resolve(window.echarts);
            };
            script.onerror = () => {
                console.error("Failed to load ECharts");
                window._echartsLoadingPromise = null;
                resolve(null);
            };
            document.head.appendChild(script);
        });

        return window._echartsLoadingPromise;
    }

    initDashboardChart() {
        const chartDom = document.getElementById('balance-sparkline');
        if (!chartDom) return;

        this.loadECharts().then(echarts => {
            if (!echarts) return;
            
            if (this.dashboardChart) {
                this.updateDashboardChart();
                return;
            }

            this.dashboardChart = echarts.init(chartDom, 'dark');
            this.updateDashboardChart();
            this.bindTimeframeButtons();

            const resizeHandler = () => {
                if (this.dashboardChart && chartDom.clientWidth > 0) {
                    this.dashboardChart.resize();
                }
            };
            window.addEventListener('resize', resizeHandler);
            chartDom.resizeHandler = resizeHandler;

            if (typeof ResizeObserver !== 'undefined') {
                this._chartResizeObserver = new ResizeObserver(() => {
                    if (this.dashboardChart && chartDom.clientWidth > 0 && chartDom.clientHeight > 0) {
                        this.dashboardChart.resize();
                    }
                });
                this._chartResizeObserver.observe(chartDom);
            }
        });
    }

    bindTimeframeButtons() {
        const container = document.getElementById('balance-card');
        if (!container) return;

        container.querySelectorAll('.btn-timeframe').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const tf = btn.dataset.timeframe;
                this.activeTimeframe = tf;

                // Update active state class
                container.querySelectorAll('.btn-timeframe').forEach(b => {
                    b.classList.remove('active');
                    // Reset styling to default secondary style
                    b.style.background = 'rgba(255,255,255,0.05)';
                    b.style.borderColor = 'rgba(255,255,255,0.1)';
                    b.style.color = 'var(--text-secondary)';
                });
                btn.classList.add('active');
                btn.style.background = 'rgba(16,185,129,0.15)';
                btn.style.borderColor = 'rgba(16,185,129,0.3)';
                btn.style.color = 'var(--accent-primary)';

                this.updateDashboardChart();
            };
        });
    }

    updateDashboardChart() {
        if (!this.dashboardChart) {
            this.initDashboardChart();
            return;
        }

        // Initialize daily balance history if empty
        if (!gameState.state.dailyBalanceHistory || gameState.state.dailyBalanceHistory.length === 0) {
            gameState.prepopulateDailyHistory();
        }
        if (!gameState.state.tickBalanceHistory || gameState.state.tickBalanceHistory.length === 0) {
            gameState.prepopulateTickHistory();
        }

        const timeframe = this.activeTimeframe || '1M';
        let labels = [];
        let bankAtEnds = [];
        let tooltipTitle = 'Tgl';
        const periodLabels = {
            '1D': 'kinerja hari ini (UTC)',
            '1W': 'kinerja 7 hari terakhir',
            '1M': 'kinerja 30 hari terakhir',
            'YTD': 'kinerja tahun berjalan (YTD)',
            '1Y': 'kinerja 1 tahun terakhir'
        };

        if (timeframe === '1D') {
            const history = gameState.state.tickBalanceHistory || [];
            labels = history.map(h => h.time);
            bankAtEnds = history.map(h => h.balance);
            tooltipTitle = 'Waktu';
        } else if (timeframe === '1W') {
            const history = (gameState.state.dailyBalanceHistory || []).slice(-7);
            labels = history.map(h => `${h.day}/${h.month}`);
            bankAtEnds = history.map(h => h.balance);
            tooltipTitle = 'Tgl';
        } else if (timeframe === '1M') {
            const history = (gameState.state.dailyBalanceHistory || []).slice(-30);
            labels = history.map(h => `${h.day}/${h.month}`);
            bankAtEnds = history.map(h => h.balance);
            tooltipTitle = 'Tgl';
        } else if (timeframe === 'YTD') {
            const currentYear = gameState.get('gameTime.year') || new Date().getUTCFullYear();
            let history = (gameState.state.dailyBalanceHistory || []).filter(h => h.year === currentYear);
            if (history.length < 2) {
                history = (gameState.state.dailyBalanceHistory || []).slice(-30);
            }
            labels = history.map(h => `${h.day}/${h.month}`);
            bankAtEnds = history.map(h => h.balance);
            tooltipTitle = 'Tgl';
        } else if (timeframe === '1Y') {
            const history = gameState.state.dailyBalanceHistory || [];
            labels = history.map(h => `${h.day}/${h.month}`);
            bankAtEnds = history.map(h => h.balance);
            tooltipTitle = 'Tgl';
        }

        // Update timeframe performance badge on Balance Card
        const startVal = bankAtEnds[0] || 0;
        const endVal = bankAtEnds[bankAtEnds.length - 1] ?? gameState.getBalance();
        const tfChangePct = startVal > 0 ? ((endVal - startVal) / startVal) * 100 : 0;
        const isPositive = tfChangePct >= 0;
        const lineColor = isPositive ? '#10b981' : '#ef4444';
        const areaTopColor = isPositive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';

        const changeIcon = document.getElementById('balance-change-icon');
        const changePercent = document.getElementById('balance-change-percent');
        const changePeriod = document.getElementById('balance-change-period');
        if (changeIcon && changePercent) {
            changeIcon.textContent = isPositive ? '▲' : '▼';
            changeIcon.className = isPositive ? 'text-positive' : 'text-negative';
            changePercent.className = isPositive ? 'text-positive' : 'text-negative';
            changePercent.style.fontWeight = '700';
            changePercent.textContent = `${isPositive ? '+' : '-'}${Math.abs(tfChangePct).toFixed(2)}%`;
        }
        if (changePeriod) {
            changePeriod.textContent = periodLabels[timeframe] || 'kinerja periode ini';
        }

        // Calculate padded min/max so the smooth curve never clips at top or bottom
        const minVal = bankAtEnds.length ? Math.min(...bankAtEnds) : 0;
        const maxVal = bankAtEnds.length ? Math.max(...bankAtEnds) : 100;
        const spread = Math.max(maxVal - minVal, maxVal * 0.005, 10);
        const yMin = Math.max(0, minVal - spread * 0.18);
        const yMax = maxVal + spread * 0.18;

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                show: true,
                trigger: 'axis',
                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                borderWidth: 1,
                padding: [6, 10],
                textStyle: {
                    color: '#f4f4f5',
                    fontSize: 11
                },
                axisPointer: {
                    type: 'line',
                    lineStyle: {
                        color: 'rgba(255, 255, 255, 0.2)'
                    }
                },
                formatter(params) {
                    const item = params[0];
                    const displayVal = `$ ${new Intl.NumberFormat('en-US').format(Math.round(item.value))}`;
                    return `
                        <div style="font-size: 11px;">
                            <div style="color: #a1a1aa; margin-bottom: 2px;">${tooltipTitle}: ${item.axisValue}</div>
                            <div style="color: ${lineColor}; font-weight: 700;">${displayVal}</div>
                        </div>
                    `;
                }
            },
            grid: {
                left: 0,
                right: 0,
                top: 8,
                bottom: 4,
                containLabel: false
            },
            xAxis: {
                type: 'category',
                data: labels,
                show: false,
                boundaryGap: false
            },
            yAxis: {
                type: 'value',
                show: false,
                min: yMin,
                max: yMax
            },
            series: [
                {
                    name: 'Kekayaan Bersih',
                    type: 'line',
                    smooth: 0.35,
                    showSymbol: false,
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        width: 2.5,
                        color: lineColor
                    },
                    itemStyle: {
                        color: lineColor
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                                { offset: 0, color: areaTopColor },
                                { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
                            ],
                            global: false
                        }
                    },
                    data: bankAtEnds
                }
            ]
        };

        this.dashboardChart.setOption(option);
        // Force a resize calculation to adapt to flex/grid container dimensions
        setTimeout(() => {
            if (this.dashboardChart) this.dashboardChart.resize();
        }, 50);
    }
}

export const homeScreen = new HomeScreen();
export default homeScreen;
