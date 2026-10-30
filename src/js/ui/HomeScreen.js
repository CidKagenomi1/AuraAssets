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
import roleManager from '../core/RoleManager.js';
import timeManager from '../core/TimeManager.js';
import stockMarket from '../trading/StockMarket.js';
import cryptoMarket from '../trading/CryptoMarket.js';
import newsManager from '../core/NewsManager.js';
import careerManager from '../career/CareerManager.js';
import ui from './UIManager.js';
import { Icons } from './Icons.js';
import { countUp, pulseElement, staggerFadeUp, createFloatingText } from './Animations.js';

class HomeScreen {
    constructor() {
        this._lastBalance = 0;
        this.activeTimeframe = '1D';
        this.activeMoversTab = 'gainers';
        this.activeMoversMarket = 'all';
    }

    init() {
        this.bindEvents();
        this.updateOverview();

        // Initialize dashboard main chart
        this.initDashboardChart();

        // Listen for state changes
        gameState.on('change', (changeData) => {
            const path = changeData?.path || '';
            if (path.startsWith('gameTime') || path.startsWith('economy.')) return;
            this.updateBalanceCard();
            this.renderMilestones();
            this.renderHomeCashflow();
            this.updateDashboardChart();
        });
        gameState.on('economyUpdate', () => {
            this.renderMarketPulse();
            this.renderTopMovers();
        });
        gameState.on('stocksUpdate', () => {
            this.renderTopMovers();
            if (this.activeTimeframe === '1D') {
                this.updateDashboardChart();
            }
        });
        gameState.on('cryptoUpdate', () => {
            this.renderTopMovers();
            if (this.activeTimeframe === '1D') {
                this.updateDashboardChart();
            }
        });
        gameState.on('signalsUpdate', () => this.renderTopMovers());
        gameState.on('newsAlert', () => {
            this.renderMarketPulse();
            this.renderNewsSnapshot();
        });
        gameState.on('newsUpdate', () => {
            this.renderMarketPulse();
            this.renderNewsSnapshot();
        });
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
        this.renderNewsSnapshot();
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
            this.renderNewsSnapshot();
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

    renderNewsSnapshot() {
        const container = document.getElementById('home-news-snapshot-widget');
        if (!container) return;

        const activeNews = typeof newsManager.getActiveNews === 'function' ? newsManager.getActiveNews() : [];
        const allHistory = typeof newsManager.getNewsHistory === 'function' ? newsManager.getNewsHistory() : [];
        const latestActive = activeNews.length > 0 ? activeNews[activeNews.length - 1] : null;

        let contentHTML = '';

        if (latestActive) {
            const isPos = latestActive.type === 'positive';
            const isCrypto = latestActive.market === 'crypto';
            const sign = latestActive.impact_percent > 0 ? '+' : '';
            const countdown = typeof newsManager.getRemainingCountdown === 'function' ? newsManager.getRemainingCountdown(latestActive) : '';
            const target = isCrypto ? (latestActive.target_asset || latestActive.sector) : (latestActive.ticker_target || latestActive.sector);

            contentHTML = `
                <div style="background: ${isPos ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'}; border: 1.5px solid ${isPos ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}; border-radius: var(--radius-md); padding: 1rem 1.25rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                    <div style="flex: 1; min-width: 240px;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 4px; flex-wrap: wrap;">
                            <span style="font-size: 0.68rem; font-weight: 800; color: ${isPos ? '#10b981' : '#f87171'}; background: ${isPos ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)'}; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                                🚨 ${isPos ? 'BULLISH SURGE' : 'BEARISH SHOCK'} [${sign}${latestActive.impact_percent}%]
                            </span>
                            <span style="font-size: 0.72rem; color: var(--text-dim);">
                                ${isCrypto ? '🪙 Kripto' : '📈 Saham AS'} · Target: <strong style="color: #fff;">${target}</strong>
                            </span>
                            <span style="font-size: 0.72rem; color: #fbbf24; font-weight: 700;">
                                ⏳ Sisa: ${countdown}
                            </span>
                        </div>
                        <div style="font-size: 0.95rem; font-weight: 800; color: #fff; line-height: 1.35;">
                            ${latestActive.headline}
                        </div>
                    </div>
                    <button class="btn ${isPos ? 'btn-primary' : 'btn-danger'} btn-sm btn-snapshot-action" style="font-weight: 800; font-size: 0.78rem; padding: 7px 14px; white-space: nowrap;">
                        ⚡ Buka Sentimen Pasar ↗
                    </button>
                </div>
            `;
        } else {
            // No active event: show 2 recent updates
            const recentNews = allHistory.slice(0, 2);
            contentHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.75rem;">
                    ${recentNews.length > 0 ? recentNews.map(item => {
                        const isPos = item.type === 'positive';
                        const sign = item.impact_percent > 0 ? '+' : '';
                        const isCrypto = item.market === 'crypto';
                        return `
                            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-md); padding: 0.85rem 1rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 4px;">
                                    <span style="font-size: 0.68rem; font-weight: 800; color: ${isPos ? '#34d399' : '#f87171'};">
                                        ${isPos ? '▲' : '▼'} ${sign}${item.impact_percent}%
                                    </span>
                                    <span style="font-size: 0.68rem; color: var(--text-dim);">
                                        ${isCrypto ? '🪙 Kripto' : '📈 Saham'} · Target: ${item.ticker_target || item.target_asset || item.sector}
                                    </span>
                                </div>
                                <div style="font-size: 0.82rem; font-weight: 700; color: #fff; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${item.headline}
                                </div>
                            </div>
                        `;
                    }).join('') : `
                        <div style="grid-column: 1 / -1; font-size: 0.78rem; color: var(--text-dim); text-align: center; padding: 0.5rem;">
                            Kondisi pasar normal. Belum ada sentimen ekstrem yang aktif.
                        </div>
                    `}
                </div>
            `;
        }

        container.innerHTML = `
            <div class="panel-card" style="margin-bottom: 0; background: linear-gradient(145deg, rgba(30, 41, 59, 0.4), rgba(15, 23, 42, 0.6)); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.15rem 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="display: inline-flex; width: 9px; height: 9px; border-radius: 50%; background: ${latestActive ? '#ef4444' : '#10b981'}; box-shadow: 0 0 8px ${latestActive ? '#ef4444' : '#10b981'};"></span>
                        <h2 class="section-title" style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 0.4rem;">
                            <span>📰</span> Kilas Berita & Sentimen Pasar
                        </h2>
                        ${latestActive ? `
                            <span style="font-size: 0.68rem; font-weight: 800; color: #f87171; background: rgba(239, 68, 68, 0.15); padding: 2px 6px; border-radius: 4px;">
                                LIVE EVENT
                            </span>
                        ` : ''}
                    </div>
                    <button id="btn-view-all-news" class="btn btn-secondary btn-sm" style="font-size: 0.72rem; font-weight: 700; padding: 4px 10px; cursor: pointer;">
                        Pusat Berita & Sentimen ↗
                    </button>
                </div>
                ${contentHTML}
            </div>
        `;

        container.querySelector('#btn-view-all-news')?.addEventListener('click', () => {
            if (typeof window.openMarketNewsTab === 'function') {
                window.openMarketNewsTab();
            }
        });

        container.querySelector('.btn-snapshot-action')?.addEventListener('click', () => {
            if (typeof window.openMarketNewsTab === 'function') {
                window.openMarketNewsTab();
            }
        });
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

        let pool = [];
        if (this.activeMoversMarket === 'stock') {
            pool = stocks;
        } else if (this.activeMoversMarket === 'crypto') {
            pool = cryptos;
        } else {
            pool = [...stocks, ...cryptos];
        }

        let displayItems = [];
        const tab = (this.activeMoversTab === 'losers') ? 'losers' : 'gainers';

        if (tab === 'gainers') {
            displayItems = [...pool]
                .sort((a, b) => (b.change || 0) - (a.change || 0))
                .slice(0, 4);
        } else {
            displayItems = [...pool]
                .sort((a, b) => (a.change || 0) - (b.change || 0))
                .slice(0, 4);
        }

        if (displayItems.length === 0) {
            const marketLabel = this.activeMoversMarket === 'stock' ? 'saham' : (this.activeMoversMarket === 'crypto' ? 'kripto' : 'aset');
            listEl.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 1.5rem 1rem; color: var(--text-muted); font-size: 0.78rem;">
                    Belum ada data pergerakan untuk kategori ${marketLabel}.
                </div>
            `;
            return;
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
                                <span class="mover-type-pill">${typePill}</span>
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
        const properties = gameState.get('properties') || [];
        const propertyRent = properties.reduce((sum, p) => sum + (p.monthlyRent || p.rent || 0), 0);
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
            { id: 'langkah_pertama',    label: 'Langkah Pertama',             target: 10_000,        icon: '🌱' },
            { id: 'akumulasi_modal',    label: 'Akumulasi Modal',             target: 50_000,        icon: '💰' },
            { id: 'modal_awal',         label: 'Portofolio Ratusan Juta',     target: 100_000,       icon: '💵' },
            { id: 'portofolio_mapan',   label: 'Portofolio Mapan',            target: 500_000,       icon: '🛡️' },
            { id: 'jutawan_finansial',  label: 'Jutawan Finansial',           target: 1_000_000,     icon: '💼' },
            { id: 'konglomerat_aset',   label: 'Konglomerat Multiaset',       target: 5_000_000,     icon: '💎' },
            { id: 'empire_real_estate', label: 'Empire Real Estate',          target: 10_000_000,    icon: '🏛️' },
            { id: 'bilioner_sovereign', label: 'Bilioner & Sovereign Wealth', target: 100_000_000,   icon: '👑' },
            { id: 'financial_freedom',  label: 'Financial Freedom Tycoon',    target: 1_000_000_000, icon: '🏆' }
        ];
    }

    renderMilestones() {
        const el = document.getElementById('milestones-list');
        if (!el) return;

        // Financial milestone is evaluated against comprehensive Net Worth & Cash
        const balance = gameState.getBalance();
        const netWorth = Math.round(gameState.getNetWorth());
        const currentWealth = Math.max(balance, netWorth);

        const milestones = this.getMilestonesConfig();
        const unlockedList = gameState.get('unlockedMilestones') || [];
        const claimedList = gameState.get('claimedMilestones') || [];
        const unlockedSet = new Set(unlockedList);
        const claimedSet = new Set(claimedList);

        // Automatically unlock milestones when wealth reaches target
        let newlyUnlocked = false;
        milestones.forEach(m => {
            if (currentWealth >= m.target && !unlockedSet.has(m.id)) {
                unlockedSet.add(m.id);
                newlyUnlocked = true;
            }
        });
        if (newlyUnlocked) {
            gameState.set('unlockedMilestones', Array.from(unlockedSet));
        }

        el.innerHTML = milestones.map(m => {
            const reward = Math.round(m.target * 0.75);
            const isClaimed = claimedSet.has(m.id);
            const done = isClaimed || unlockedSet.has(m.id) || currentWealth >= m.target;
            const canClaim = done && !isClaimed;
            const progress = done ? 100 : Math.min(100, (currentWealth / m.target) * 100);

            let rightActionHTML = '';
            if (canClaim) {
                rightActionHTML = `
                    <button type="button" class="btn-claim-milestone" data-milestone-id="${m.id}" style="
                        padding: 6px 14px;
                        border-radius: 8px;
                        border: 1px solid rgba(251, 191, 36, 0.55);
                        background: linear-gradient(135deg, #f59e0b 0%, #10b981 100%);
                        color: #09090b;
                        font-size: 0.76rem;
                        font-weight: 800;
                        cursor: pointer;
                        white-space: nowrap;
                        box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
                        transition: transform 0.15s ease, filter 0.15s ease;
                        position: relative;
                        z-index: 2;
                    " onmouseenter="this.style.transform='scale(1.05)';this.style.filter='brightness(1.1)'"
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
                    border:1px solid ${canClaim ? 'rgba(245,158,11,0.45)' : (done ? 'rgba(16,185,129,0.25)' : 'var(--border-color)')};
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

        // Resilient Event Delegation on container to prevent click loss during re-renders
        if (!el._hasMilestoneClickDelegate) {
            el.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-claim-milestone');
                if (btn && btn.dataset.milestoneId) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.claimMilestone(btn.dataset.milestoneId, btn);
                }
            });
            el._hasMilestoneClickDelegate = true;
        }
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
        const netWorth = Math.round(gameState.getNetWorth());
        const currentWealth = Math.max(balance, netWorth);
        const unlockedList = gameState.get('unlockedMilestones') || [];

        if (currentWealth < m.target && !unlockedList.includes(milestoneId)) {
            ui.error('Milestone ini belum tercapai.');
            return;
        }

        const reward = Math.round(m.target * 0.75);

        // Mark as unlocked & claimed
        const nextUnlocked = Array.from(new Set([...unlockedList, milestoneId]));
        const nextClaimed = Array.from(new Set([...claimedList, milestoneId]));
        gameState.set('unlockedMilestones', nextUnlocked);
        gameState.set('claimedMilestones', nextClaimed);

        // Credit 75% reward to player's balance and record transaction
        financeManager.addIncome(reward, 'Bonus', `Hadiah Milestone (75%): ${m.label}`);

        try {
            import('./AuraSound.js').then(mod => mod.default?.playClaimMoney?.());
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

        // Settings & Notifications
        document.getElementById('btn-settings')?.addEventListener('click', () => this.showSettings());
        document.getElementById('btn-notifications')?.addEventListener('click', () => this.showNotifications());

        // Fear & Greed widget breaking news click
        const newsText = document.getElementById('market-pulse-news-text');
        if (newsText) {
            newsText.style.cursor = 'pointer';
            newsText.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof window.openMarketNewsTab === 'function') {
                    window.openMarketNewsTab();
                } else {
                    import('./ViewManager.js').then(m => {
                        m.default.switchView('market');
                        window.openMarketNewsTab?.();
                    });
                }
            });
        }

        // Top Movers Market Filter (Semua, Saham, Kripto)
        document.querySelectorAll('.movers-market-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.movers-market-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activeMoversMarket = btn.dataset.moversMarket || 'all';
                this.renderTopMovers();
            });
        });

        // Top Movers Trend Direction Filter (Gainers, Losers)
        document.querySelectorAll('.movers-trend-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.movers-trend-btn').forEach(b => b.classList.remove('active'));
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
            case 'loan':
                import('../finance/panels/LoanPanel.js').then(m => m.default.show());
                break;
            case 'savings':
                import('../finance/panels/SavingsPanel.js').then(m => m.default.show());
                break;
            case 'trading-signal':
                import('../trading/panels/TradingSignalPanel.js').then(m => m.default.show());
                break;
            case 'donate':
                this.handleDonate();
                break;
            case 'transfer':
                import('../finance/TransferManager.js').then(m => m.default.showTransferModal());
                break;
            case 'finance':
                import('../finance/panels/FinancePanel.js').then(m => m.default.show());
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
                id: 'komunitas',
                name: 'Kotak Donasi Komunitas',
                org: 'Aura Community Grant Pool',
                desc: 'Bagi-bagi modal tunai ke sesama investor! Donasi Anda akan didistribusikan secara merata sebagai cek hadiah modal ke kotak masuk semua pemain di jaringan.',
                icon: '🎁',
                emoji: '🎁',
                color: '#38bdf8',
                gradient: 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(14,165,233,0.08))',
                border: 'rgba(56,189,248,0.4)',
                tag: 'Bagi-Bagi Modal Komunitas',
            }
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
                        🌟 <strong style="color:#fff;">Bonus Keberuntungan:</strong> Donasi ke Kotak Komunitas mengaktifkan buff berkah <strong style="color:#fbbf24;">Luck 1.5×</strong> selama 30 hari game (bisa menumpuk hingga 180 hari) sekaligus berbagi rezeki ke sesama pemain!
                    </div>
                </div>
                `}

                <!-- Saldo Info -->
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15); border-radius:10px; padding:0.75rem 1rem;">
                    <span style="font-size:0.82rem; color:rgba(255,255,255,0.55);">💰 Saldo kas tersedia untuk didonasikan</span>
                    <span style="font-size:1rem; font-weight:800; color:#10b981;">$ ${financeManager.formatCurrency(balance, true)}</span>
                </div>

                <!-- Charity Grid -->
                <div style="display:grid; grid-template-columns:1fr; gap:1rem;">
                    ${charityHTML}
                </div>

                <div style="margin-top:1.25rem; padding:0.875rem; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; font-size:0.75rem; color:rgba(255,255,255,0.4); text-align:center; line-height:1.6;">
                    Donasi akan langsung disalurkan sebagai cek hadiah modal ke kotak masuk semua pemain di jaringan.<br>
                    Setiap donasi akan otomatis memperpanjang buff Keberuntungan Luck 1.5× Anda.
                </div>
            </div>
        `;

        ui.showModal({
            title: '🎁 Kotak Donasi Komunitas',
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
                                if (charityId === 'komunitas') {
                                    const { transferManager } = await import('../finance/TransferManager.js');
                                    await transferManager.sendCommunityDonation({ amount });
                                    ui.success(
                                        `$ ${financeManager.formatCurrency(amount)} berhasil disalurkan ke Kotak Donasi Komunitas! Semua pemain akan menerima cek bantuan modal. ✨ Anda mendapatkan buff Luck 1.5×!`,
                                        '🎁 Donasi Komunitas Terkirim'
                                    );
                                } else {
                                    financeManager.donate(amount, charityOrg, 'Donasi');
                                    ui.success(
                                        `$ ${financeManager.formatCurrency(amount)} berhasil didonasikan ke ${charityName}! ✨ Keberuntungan Anda meningkat!`,
                                        '❤️ Donasi Berhasil'
                                    );
                                }
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
    // SETTINGS (Full Page View)
    // ==========================================

    showSettings() {
        import('./views/ViewManager.js').then(m => m.default.switchView('settings'));
    }

    showNotifications() {
        // Reset unread count
        gameState.set('unreadNotificationsCount', 0);
        ui.updateNotificationBadge();

        const notifs = gameState.get('notifications') || [];
        const isNotifEnabled = gameState.get('settings.notificationsEnabled') !== false;
        const isDeviceNotifEnabled = gameState.get('settings.deviceNotificationsEnabled') === true;

        let activeFilter = 'all'; // 'all' | 'rewards' | 'system'

        const renderNotifContent = () => {
            const currentNotifs = gameState.get('notifications') || [];
            const rewardNotifs = currentNotifs.filter(n => n.hasReward || n.type === 'bonus_check');
            const systemNotifs = currentNotifs.filter(n => !n.hasReward && n.type !== 'bonus_check');
            const unclaimedChecks = currentNotifs.filter(n => n.hasReward && !n.rewardClaimed);
            const totalUnclaimedAmount = unclaimedChecks.reduce((sum, n) => sum + (Number(n.rewardAmount) || 0), 0);

            let filteredList = currentNotifs;
            if (activeFilter === 'rewards') filteredList = rewardNotifs;
            if (activeFilter === 'system') filteredList = systemNotifs;

            return `
                <div style="max-height: 72vh; display: flex; flex-direction: column; gap: 0.875rem;">
                    
                    <!-- Filter Tabs & Quick Action Bar -->
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem;">
                        <div style="display:flex; gap:0.4rem; overflow-x:auto;">
                            <button type="button" class="btn-notif-filter ${activeFilter === 'all' ? 'active' : ''}" data-filter="all" style="
                                padding:5px 12px; border-radius:20px; font-size:0.75rem; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.2s;
                                background:${activeFilter === 'all' ? 'var(--accent-primary-soft)' : 'rgba(255,255,255,0.03)'};
                                border:1px solid ${activeFilter === 'all' ? 'rgba(16,185,129,0.35)' : 'var(--border-color)'};
                                color:${activeFilter === 'all' ? 'var(--accent-primary)' : 'var(--text-muted)'};
                            ">
                                Semua (${currentNotifs.length})
                            </button>
                            <button type="button" class="btn-notif-filter ${activeFilter === 'rewards' ? 'active' : ''}" data-filter="rewards" style="
                                padding:5px 12px; border-radius:20px; font-size:0.75rem; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.2s; display:flex; align-items:center; gap:5px;
                                background:${activeFilter === 'rewards' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.03)'};
                                border:1px solid ${activeFilter === 'rewards' ? 'rgba(251,191,36,0.4)' : 'var(--border-color)'};
                                color:${activeFilter === 'rewards' ? '#fbbf24' : 'var(--text-muted)'};
                            ">
                                <span>🎁 Cek & Hadiah</span>
                                <span>(${rewardNotifs.length})</span>
                                ${unclaimedChecks.length > 0 ? `
                                    <span style="padding:1px 6px; border-radius:10px; background:#fbbf24; color:#09090b; font-size:0.65rem; font-weight:900;">
                                        ${unclaimedChecks.length} KLAIM
                                    </span>
                                ` : ''}
                            </button>
                            <button type="button" class="btn-notif-filter ${activeFilter === 'system' ? 'active' : ''}" data-filter="system" style="
                                padding:5px 12px; border-radius:20px; font-size:0.75rem; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.2s;
                                background:${activeFilter === 'system' ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.03)'};
                                border:1px solid ${activeFilter === 'system' ? 'rgba(129,140,248,0.4)' : 'var(--border-color)'};
                                color:${activeFilter === 'system' ? '#818cf8' : 'var(--text-muted)'};
                            ">
                                📢 Berita & Sistem (${systemNotifs.length})
                            </button>
                        </div>

                        <button type="button" id="btn-open-transfer-from-notif" style="
                            padding:5px 12px; border-radius:8px; font-size:0.75rem; font-weight:700; cursor:pointer; font-family:inherit;
                            background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.25); color:#10b981; display:flex; align-items:center; gap:4px;
                        ">
                            <span>💸 Kirim Transfer</span>
                        </button>
                    </div>

                    <!-- Unclaimed Checks Quick Banner -->
                    ${unclaimedChecks.length > 0 ? `
                        <div style="
                            background:linear-gradient(135deg, rgba(251,191,36,0.12), rgba(16,185,129,0.08));
                            border:1px solid rgba(251,191,36,0.35); border-radius:12px; padding:0.875rem 1rem;
                            display:flex; justify-content:space-between; align-items:center; gap:0.75rem; flex-wrap:wrap;
                        ">
                            <div>
                                <div style="font-size:0.85rem; font-weight:800; color:#fbbf24; display:flex; align-items:center; gap:6px;">
                                    <span>🎁</span> Anda memiliki ${unclaimedChecks.length} Cek Dana yang belum dicairkan!
                                </div>
                                <div style="font-size:0.75rem; color:rgba(255,255,255,0.6); margin-top:2px;">
                                    Total nilai dana masuk: <strong style="color:#10b981;">+$ ${financeManager.formatCurrency(totalUnclaimedAmount)}</strong>
                                </div>
                            </div>
                            <button type="button" id="btn-claim-all-checks" style="
                                padding:6px 14px; border-radius:8px; font-size:0.75rem; font-weight:800; cursor:pointer; font-family:inherit;
                                background:linear-gradient(135deg, #f59e0b 0%, #10b981 100%); border:none; color:#09090b; box-shadow:0 3px 10px rgba(245,158,11,0.3); transition:transform 0.15s ease;
                            " onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform=''">
                                ⚡ Cairkan Semua Cek
                            </button>
                        </div>
                    ` : ''}

                    <!-- Notifications List -->
                    <div id="notif-cards-scrollable" style="overflow-y:auto; max-height:48vh; display:flex; flex-direction:column; gap:0.65rem; padding-right:4px;">
                        ${filteredList.length ? filteredList.map(n => {
                            const isRewardCheck = n.hasReward || n.type === 'bonus_check';
                            const isClaimed = n.rewardClaimed === true;
                            const rewardAmountFormatted = n.rewardAmount ? financeManager.formatCurrency(n.rewardAmount) : '';

                            if (isRewardCheck) {
                                return `
                                    <div class="notif-check-card" style="
                                        padding: 0.9rem 1.1rem; border-radius: var(--radius-md);
                                        background: ${isClaimed ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(16,185,129,0.04))'};
                                        border: 1px solid ${isClaimed ? 'var(--border-color)' : 'rgba(251,191,36,0.35)'};
                                        display:flex; flex-direction:column; gap:0.5rem; transition:all 0.2s;
                                    ">
                                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem;">
                                            <div style="display:flex; align-items:center; gap:0.6rem;">
                                                <span style="font-size:1.4rem;">${n.icon || '💵'}</span>
                                                <div>
                                                    <div style="font-size:0.85rem; font-weight:800; color:${isClaimed ? '#a1a1aa' : '#fbbf24'}; display:flex; align-items:center; gap:6px;">
                                                        <span>${n.title}</span>
                                                        ${!isClaimed ? '<span style="font-size:0.6rem; padding:1px 6px; border-radius:4px; background:rgba(251,191,36,0.2); color:#fbbf24; font-weight:800;">BONUS CEK</span>' : ''}
                                                    </div>
                                                    <div style="font-size:0.7rem; color:var(--text-muted);">${n.date || ''}</div>
                                                </div>
                                            </div>
                                            <div style="text-align:right;">
                                                <div style="font-size:0.95rem; font-weight:800; color:${isClaimed ? '#71717a' : '#10b981'};">
                                                    +$ ${rewardAmountFormatted}
                                                </div>
                                            </div>
                                        </div>

                                        <div style="font-size:0.8rem; color:var(--text-secondary); line-height:1.4;">
                                            ${n.message}
                                        </div>

                                        <div style="display:flex; justify-content:flex-end; align-items:center; margin-top:2px;">
                                            ${!isClaimed ? `
                                                <button type="button" class="btn-claim-single-check" data-notif-id="${n.id}" style="
                                                    padding:6px 14px; border-radius:8px; font-size:0.76rem; font-weight:800; cursor:pointer; font-family:inherit;
                                                    background:linear-gradient(135deg, #f59e0b 0%, #10b981 100%); border:none; color:#09090b; box-shadow:0 3px 12px rgba(245,158,11,0.28); transition:transform 0.15s ease;
                                                " onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform=''">
                                                    💵 Cairkan Cek (+$ ${this.formatCompact(n.rewardAmount)})
                                                </button>
                                            ` : `
                                                <span style="font-size:0.72rem; font-weight:700; color:#10b981; display:flex; align-items:center; gap:4px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.25); border-radius:20px; padding:3px 10px;">
                                                    ✓ Cek Telah Dicairkan
                                                </span>
                                            `}
                                        </div>
                                    </div>
                                `;
                            }

                            return `
                                <div style="display: flex; gap: 0.75rem; padding: 0.85rem 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                                    <span style="font-size: 1.35rem; display: flex; align-items: center; opacity:0.85;">${n.icon || '🔔'}</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.83rem; font-weight: 800; color: white; display: flex; justify-content: space-between;">
                                             <span>${n.title}</span>
                                             <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: normal;">${n.date || ''}</span>
                                        </div>
                                        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 3px; line-height: 1.4;">${n.message}</div>
                                    </div>
                                </div>
                            `;
                        }).join('') : `
                            <div style="text-align: center; padding: 2.5rem 0; color: var(--text-muted);">
                                <span style="font-size: 2.5rem; display: block; margin-bottom: 0.75rem;">🔔</span>
                                <div style="font-size: 0.88rem; font-weight: 700;">Tidak ada notifikasi di kategori ini</div>
                            </div>
                        `}
                    </div>

                    <!-- Settings Accordion Details -->
                    <details style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:10px; padding:0.6rem 0.85rem;">
                        <summary style="font-size:0.78rem; font-weight:700; color:var(--text-muted); cursor:pointer;">
                            ⚙️ Konfigurasi Notifikasi & Perangkat
                        </summary>
                        <div style="display:flex; flex-direction:column; gap:0.6rem; margin-top:0.6rem;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="font-size:0.78rem; font-weight:700; color:#fff;">Pop-up Notifikasi (Toast)</div>
                                    <div style="font-size:0.68rem; color:var(--text-muted);">Tampilkan toast ringkas saat event/cek tiba</div>
                                </div>
                                <label class="switch" style="position:relative; display:inline-block; width:38px; height:20px;">
                                    <input type="checkbox" id="toggle-popup-notifs" ${isNotifEnabled ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                                    <span class="slider" style="position:absolute; cursor:pointer; inset:0; background-color:${isNotifEnabled ? 'var(--accent-primary)' : '#4b5563'}; border-radius:20px; transition:0.3s; display:flex; align-items:center;">
                                        <span class="knob" style="height:14px; width:14px; background-color:white; border-radius:50%; transition:0.3s; transform:translateX(${isNotifEnabled ? '20px' : '3px'}); display:block;"></span>
                                    </span>
                                </label>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="font-size:0.78rem; font-weight:700; color:#fff;">Notifikasi Browser Perangkat</div>
                                    <div style="font-size:0.68rem; color:var(--text-muted);">Kirim notifikasi latar ke HP/PC</div>
                                </div>
                                <label class="switch" style="position:relative; display:inline-block; width:38px; height:20px;">
                                    <input type="checkbox" id="toggle-device-notifs" ${isDeviceNotifEnabled ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                                    <span class="slider" style="position:absolute; cursor:pointer; inset:0; background-color:${isDeviceNotifEnabled ? 'var(--accent-primary)' : '#4b5563'}; border-radius:20px; transition:0.3s; display:flex; align-items:center;">
                                        <span class="knob" style="height:14px; width:14px; background-color:white; border-radius:50%; transition:0.3s; transform:translateX(${isDeviceNotifEnabled ? '20px' : '3px'}); display:block;"></span>
                                    </span>
                                </label>
                            </div>
                        </div>
                    </details>
                </div>
            `;
        };

        const bindNotifEvents = () => {
            // Filter switching
            document.querySelectorAll('.btn-notif-filter').forEach(btn => {
                btn.addEventListener('click', () => {
                    activeFilter = btn.dataset.filter;
                    const container = document.getElementById('notif-modal-root');
                    if (container) {
                        container.innerHTML = renderNotifContent();
                        bindNotifEvents();
                    }
                });
            });

            // Single check claiming
            document.querySelectorAll('.btn-claim-single-check').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const checkId = btn.dataset.notifId;
                    const { transferManager } = await import('../finance/TransferManager.js');
                    const success = transferManager.claimCheck(checkId, btn);
                    if (success) {
                        const container = document.getElementById('notif-modal-root');
                        if (container) {
                            container.innerHTML = renderNotifContent();
                            bindNotifEvents();
                        }
                    }
                });
            });

            // Claim all checks
            document.getElementById('btn-claim-all-checks')?.addEventListener('click', async (e) => {
                e.stopPropagation();
                const { transferManager } = await import('../finance/TransferManager.js');
                transferManager.claimAllChecks();
                const container = document.getElementById('notif-modal-root');
                if (container) {
                    container.innerHTML = renderNotifContent();
                    bindNotifEvents();
                }
            });

            // Open Transfer Modal
            document.getElementById('btn-open-transfer-from-notif')?.addEventListener('click', async () => {
                ui.closeModal();
                const { transferManager } = await import('../finance/TransferManager.js');
                transferManager.showTransferModal();
            });

            // Notification Toggles
            const checkbox = document.getElementById('toggle-popup-notifs');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    const checked = e.target.checked;
                    gameState.set('settings.notificationsEnabled', checked);
                    const slider = checkbox.nextElementSibling;
                    const knob = slider.querySelector('.knob');
                    slider.style.backgroundColor = checked ? 'var(--accent-primary)' : '#4b5563';
                    knob.style.transform = `translateX(${checked ? '20px' : '3px'})`;
                    ui.success(checked ? 'Pop-up notifikasi diaktifkan' : 'Pop-up notifikasi dinonaktifkan');
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
                            knob.style.transform = 'translateX(3px)';
                            return;
                        }
                        Notification.requestPermission().then(permission => {
                            if (permission === 'granted') {
                                gameState.set('settings.deviceNotificationsEnabled', true);
                                slider.style.backgroundColor = 'var(--accent-primary)';
                                knob.style.transform = 'translateX(20px)';
                                ui.success('Notifikasi perangkat diaktifkan!');
                            } else {
                                gameState.set('settings.deviceNotificationsEnabled', false);
                                deviceCheckbox.checked = false;
                                slider.style.backgroundColor = '#4b5563';
                                knob.style.transform = 'translateX(3px)';
                                ui.error('Izin notifikasi ditolak oleh sistem browser.');
                            }
                        });
                    } else {
                        gameState.set('settings.deviceNotificationsEnabled', false);
                        slider.style.backgroundColor = '#4b5563';
                        knob.style.transform = 'translateX(3px)';
                        ui.success('Notifikasi perangkat dinonaktifkan');
                    }
                });
            }
        };

        const modalShell = `<div id="notif-modal-root">${renderNotifContent()}</div>`;
        ui.showModal({ title: '🔔 Notifikasi & Cek Hadiah', content: modalShell, onShow: bindNotifEvents });
    }

    showDonateModal() {
        this.handleDonate();
    }

    showGameGuide() {
        this.showGuide();
    }

    showGuide() {
        const role = roleManager.getRoleData();
        const content = `
            <div style="max-height:72vh;overflow-y:auto;padding-right:4px;">
                <div class="planning-card" style="margin-bottom:1rem;">
                    <h4 style="margin-bottom:0.4rem;display:flex;align-items:center;gap:6px;"><span>🎯</span> Visi Permainan & Kebebasan Finansial</h4>
                    <p style="color:var(--text-muted);font-size:0.875rem;line-height:1.6;">
                        Tujuan utama Anda adalah mengakumulasi kekayaan bersih hingga <strong style="color:#10b981;">$ 1.000.000.000 ($1 Miliar)</strong>. Kelola modal awal Anda dengan bijak melalui portofolio multi-aset, instrumen pasar modal, serta ekspansi bisnis pasif.
                    </p>
                </div>

                ${role ? `
                <div class="planning-card" style="margin-bottom:1rem;border-color:${role.color}45;background:linear-gradient(135deg, ${role.color}15, rgba(255,255,255,0.02));">
                    <h4 style="margin-bottom:0.4rem;color:${role.color};display:flex;align-items:center;gap:6px;"><span>${role.icon}</span> Profil Risiko Aktif: ${role.label}</h4>
                    <p style="color:var(--text-muted);font-size:0.875rem;line-height:1.5;">${role.detail}</p>
                    <div style="margin-top:0.6rem;padding:0.6rem 0.8rem;background:rgba(0,0,0,0.25);border-radius:8px;font-size:0.8rem;color:#f4f4f5;">
                        <strong>Strategi Rekomendasi:</strong> ${role.strategy || role.monthlyEvent}
                    </div>
                </div>
                ` : ''}

                <div class="planning-card" style="margin-bottom:1rem;">
                    <h4 style="margin-bottom:0.5rem;display:flex;align-items:center;gap:6px;"><span>📈</span> Panduan Trading Pasar (Saham & Kripto)</h4>
                    <ul style="color:var(--text-muted);font-size:0.875rem;padding-left:1.25rem;line-height:1.8;">
                        <li><strong>Order Book & Rasio Kedalaman (Bid vs Ask)</strong>: Perhatikan rasio volume beli vs jual di samping chart. Mayoritas Bid dominan menandakan potensi akumulasi/pantulan, sementara mayoritas Ask menandakan tekanan jual distribusi.</li>
                        <li><strong>Market Order vs Limit Order</strong>: Gunakan <em>Instant Market</em> untuk eksekusi kilat di harga terbaik, atau pasang <em>Limit Order</em> untuk antre membeli di harga diskon bawah / menjual di puncak target keuntungan.</li>
                        <li><strong>Sentimen Pasar & Fear & Greed Index</strong>: Manfaatkan siklus sentimen pasar makro (Extreme Fear vs Extreme Greed). Beli saat pasar panik/diskon wajar dan amankan profit saat pasar euforia berlebih.</li>
                        <li><strong>Manajemen Risiko & Cut-Loss</strong>: Selalu tetapkan batas toleransi penurunan. Jangan memaksakan menahan posisi spekulatif yang berbalik arah tanpa rencana yang jelas.</li>
                    </ul>
                </div>

                <div class="planning-card" style="margin-bottom:1rem;">
                    <h4 style="margin-bottom:0.5rem;display:flex;align-items:center;gap:6px;"><span>🏢</span> Panduan Bisnis & Arus Kas Pasif</h4>
                    <ul style="color:var(--text-muted);font-size:0.875rem;padding-left:1.25rem;line-height:1.8;">
                        <li><strong>Empire Real Estate</strong>: Miliki aset properti fisik (apartemen, ruko, residensial, villa) untuk menghasilkan pendapatan sewa pasif (rental yield) bulanan yang langsung masuk ke rekening.</li>
                        <li><strong>Mining Rig & Staking Kripto</strong>: Rakit rig penambangan kripto dan staking aset kripto Anda di tab Passive Income untuk memanen imbal hasil periodik tanpa intervensi manual harian.</li>
                        <li><strong>Trading Bot Otomatis</strong>: Jalankan algoritma bot trading untuk mengeksekusi peluang selisih harga secara konsisten sepanjang waktu.</li>
                    </ul>
                </div>

                <div class="planning-card" style="margin-bottom:1rem;">
                    <h4 style="margin-bottom:0.5rem;display:flex;align-items:center;gap:6px;"><span>🏦</span> Deposito & Reksa Dana (Stabilitas Modal)</h4>
                    <ul style="color:var(--text-muted);font-size:0.875rem;padding-left:1.25rem;line-height:1.8;">
                        <li><strong>Deposito Bank Berbunga</strong>: Amankan cadangan kas darurat dengan imbal hasil bulanan terjamin (0.2% - 3.0%). Fitur auto-deposit membantu menyisihkan modal secara teratur.</li>
                        <li><strong>4 Portofolio Reksa Dana</strong>: Pilih antara Reksa Dana Pasar Uang (sangat rendah risiko), Pendapatan Tetap (obligasi stabil), Campuran (seimbang), hingga Saham (pertumbuhan tinggi).</li>
                    </ul>
                </div>

                <div class="planning-card" style="margin-bottom:1rem;">
                    <h4 style="margin-bottom:0.5rem;display:flex;align-items:center;gap:6px;"><span>🎁</span> Kotak Donasi Komunitas & Keberuntungan (Luck Boost 1.5×)</h4>
                    <p style="color:var(--text-muted);font-size:0.875rem;line-height:1.6;">
                        Berdonasilah ke <strong>Kotak Donasi Komunitas 🎁</strong> untuk berbagi modal kas ke sesama investor di jaringan. Setiap donasi mengaktifkan berkah keberuntungan berupa buff <strong style="color:#fbbf24;">Luck 1.5×</strong> selama 30 hari game (dapat diakumulasi hingga 180 hari) yang membantu momentum profit trading dan peluang event tak terduga!
                    </p>
                </div>

                <div class="planning-card" style="margin-bottom:1rem;">
                    <h4 style="margin-bottom:0.5rem;display:flex;align-items:center;gap:6px;"><span>🏆</span> Milestone Finansial & Hadiah Tunai 75%</h4>
                    <p style="color:var(--text-muted);font-size:0.875rem;line-height:1.6;">
                        Setiap kali total kekayaan bersih Anda mencapai tingkatan milestone baru (mulai dari $10.000 hingga $1 Miliar), Anda berhak mengklaim hadiah uang tunai langsung sebesar <strong style="color:#10b981;">75% dari target milestone</strong> lewat tombol <em>🎁 Klaim</em> di Beranda.
                    </p>
                </div>

                <div class="planning-card" style="margin-bottom:0.5rem;">
                    <h4 style="margin-bottom:0.5rem;display:flex;align-items:center;gap:6px;"><span>💡</span> Tips Pro Trader & Pebisnis</h4>
                    <ul style="color:var(--text-muted);font-size:0.875rem;padding-left:1.25rem;line-height:1.8;">
                        <li>Jangan pernah menaruh seluruh modal Anda hanya pada satu aset spekulatif (*Don't put all eggs in one basket*).</li>
                        <li>Pertahankan skor kredit (Credit Score) dengan membayar cicilan pinjaman tepat waktu untuk membuka plafon modal usaha yang lebih tinggi.</li>
                        <li>Evaluasi atau sesuaikan kembali profil risiko dan preferensi Anda kapan saja melalui menu <strong>⚙️ Pengaturan</strong>.</li>
                    </ul>
                </div>
            </div>
        `;
        ui.showModal({ title: '📖 Panduan Trading & Bisnis Investor', content });
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

        // Synchronize initial buttons styling with activeTimeframe ('1D' default)
        container.querySelectorAll('.btn-timeframe').forEach(b => {
            const isActive = b.dataset.timeframe === (this.activeTimeframe || '1D');
            b.classList.toggle('active', isActive);
            b.style.background = isActive ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)';
            b.style.borderColor = isActive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)';
            b.style.color = isActive ? 'var(--accent-primary)' : 'var(--text-secondary)';
        });

        container.querySelectorAll('.btn-timeframe').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const tf = btn.dataset.timeframe;
                this.activeTimeframe = tf;

                // Update active state class
                container.querySelectorAll('.btn-timeframe').forEach(b => {
                    const isActive = b === btn;
                    b.classList.toggle('active', isActive);
                    b.style.background = isActive ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)';
                    b.style.borderColor = isActive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)';
                    b.style.color = isActive ? 'var(--accent-primary)' : 'var(--text-secondary)';
                });

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

        const timeframe = this.activeTimeframe || '1D';
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
        const currentNW = Math.round(gameState.getNetWorth());
        if (bankAtEnds.length > 0 && (timeframe === '1D' || bankAtEnds.length === 1)) {
            bankAtEnds[bankAtEnds.length - 1] = currentNW;
        }
        const startVal = bankAtEnds[0] || 0;
        const endVal = bankAtEnds[bankAtEnds.length - 1] ?? currentNW;
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
