/**
 * CommodityPanel.js - Dedicated Commodity Trading Terminal & Custody Vault
 * Displays Logam Mulia, Energi, Logam Industri, and Agrikultur with distinct sector bounds.
 * Features real-time spot orders, Plotly interactive charts, and digital vault management.
 */

import commodityManager, { COMMODITY_SECTORS } from '../CommodityManager.js';
import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../core/GameState.js';
import ui from '../../ui/UIManager.js';

class CommodityPanel {
    constructor() {
        this.activeSector = 'ALL';
        this.selectedCommodity = null;
    }

    show() {
        this.render();
    }

    render() {
        const totalVault = commodityManager.getTotalVaultValue();
        const totalInvested = commodityManager.getTotalInvested();
        const totalPnl = +(totalVault - totalInvested).toFixed(2);
        const totalPnlPct = totalInvested > 0 ? +((totalPnl / totalInvested) * 100).toFixed(2) : 0;
        const ownedCount = commodityManager.getOwnedCount();
        const balance = gameState.getBalance();

        const commodities = commodityManager.getCommodities(this.activeSector);
        const sectorKeys = Object.keys(COMMODITY_SECTORS);

        const content = `
            <div class="commodity-page-container" style="padding: 1.25rem 1.5rem; max-width: 1400px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 1.5rem;">
                
                <!-- 1. Header Vault & Cash Summary -->
                <div class="commodity-vault-hero-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
                    
                    <!-- Vault Portfolio Value -->
                    <div class="card commodity-vault-stat-card" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(18, 18, 20, 0.7) 100%); border: 1.5px solid rgba(245, 158, 11, 0.35); border-radius: var(--radius-lg); padding: 1.25rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <span style="font-size: 0.72rem; color: #fbbf24; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">🏛️ Brankas Komoditas Fisik Digital</span>
                            <span style="font-size: 0.65rem; background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 2px 8px; border-radius: 12px; font-weight: 800;">KUSTODIAN 1:1</span>
                        </div>
                        <div style="font-size: 1.85rem; font-weight: 900; color: #fff;">
                            $ ${financeManager.formatCurrency(totalVault, true)}
                        </div>
                        <div style="font-size: 0.74rem; color: var(--text-dim); margin-top: 4px;">
                            Modal Pokok: $ ${financeManager.formatCurrency(totalInvested, true)} · 
                            <strong style="color: ${totalPnl >= 0 ? '#10b981' : '#ef4444'}; font-weight: 800;">
                                ${totalPnl >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(totalPnl, true)} (${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct}%)
                            </strong>
                        </div>
                    </div>

                    <!-- Physical Assets Stored -->
                    <div class="card commodity-vault-stat-card" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
                        <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Status Brankas Anda</span>
                        <div style="font-size: 1.85rem; font-weight: 900; color: #38bdf8; margin-top: 4px;">
                            ${ownedCount} <span style="font-size: 1rem; color: var(--text-dim); font-weight: 600;">Jenis Komoditas</span>
                        </div>
                        <div style="font-size: 0.74rem; color: var(--text-dim); margin-top: 4px;">
                            ${ownedCount > 0 ? 'Tersimpan aman di kustodian resmi bebas biaya simpan' : 'Belum ada aset komoditas fisik yang disimpan'}
                        </div>
                    </div>

                    <!-- Main Cash Available -->
                    <div class="card commodity-vault-stat-card" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
                        <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Saldo Kas Siap Beli</span>
                        <div style="font-size: 1.85rem; font-weight: 900; color: #10b981; margin-top: 4px;">
                            $ ${financeManager.formatCurrency(balance, true)}
                        </div>
                        <div style="font-size: 0.74rem; color: var(--text-dim); margin-top: 4px;">
                            Likuiditas kas untuk eksekusi order spot instan
                        </div>
                    </div>

                </div>

                <!-- 2. Sector Filter Navigation (Clear Boundaries) -->
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                        <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
                            <span>📦</span> Instrumen Pasar Komoditas Berjangka & Fisik
                        </h3>
                        <span style="font-size: 0.75rem; color: var(--text-dim);">
                            Harga pasar spot real-time diperbarui berkala
                        </span>
                    </div>

                    <!-- Sector Pills -->
                    <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none;">
                        <button class="commodity-filter-btn ${this.activeSector === 'ALL' ? 'active' : ''}" data-sector="ALL" style="
                            padding: 8px 18px;
                            border-radius: 20px;
                            font-size: 0.8rem;
                            font-weight: 800;
                            cursor: pointer;
                            white-space: nowrap;
                            border: 1.5px solid ${this.activeSector === 'ALL' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)'};
                            background: ${this.activeSector === 'ALL' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)'};
                            color: ${this.activeSector === 'ALL' ? 'var(--accent-primary)' : 'var(--text-muted)'};
                            transition: all 0.2s ease;
                        ">
                            🌐 Semua Sektor (${commodityManager.getCommodities().length})
                        </button>

                        ${sectorKeys.map(k => {
                            const sec = COMMODITY_SECTORS[k];
                            const count = commodityManager.getCommodities(sec.id).length;
                            const isActive = this.activeSector === sec.id;
                            return `
                                <button class="commodity-filter-btn ${isActive ? 'active' : ''}" data-sector="${sec.id}" style="
                                    padding: 8px 18px;
                                    border-radius: 20px;
                                    font-size: 0.8rem;
                                    font-weight: 800;
                                    cursor: pointer;
                                    white-space: nowrap;
                                    border: 1.5px solid ${isActive ? sec.color : 'rgba(255,255,255,0.08)'};
                                    background: ${isActive ? sec.bg : 'rgba(255,255,255,0.02)'};
                                    color: ${isActive ? sec.color : 'var(--text-muted)'};
                                    transition: all 0.2s ease;
                                ">
                                    ${sec.icon} ${sec.name} (${count})
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- 3. Commodity Cards Grid with Sector Header Dividers -->
                <div style="display: flex; flex-direction: column; gap: 2rem;">
                    ${(this.activeSector === 'ALL' ? sectorKeys.map(k => COMMODITY_SECTORS[k]) : [COMMODITY_SECTORS[this.activeSector.toUpperCase()] || COMMODITY_SECTORS[sectorKeys.find(k => COMMODITY_SECTORS[k].id === this.activeSector)]]).map(sec => {
                        if (!sec) return '';
                        const secItems = commodityManager.getCommodities(sec.id);
                        if (secItems.length === 0) return '';

                        return `
                            <div style="display: flex; flex-direction: column; gap: 1rem;">
                                <!-- Sector Group Header Banner -->
                                <div class="commodity-sector-banner" style="display: flex; justify-content: space-between; align-items: center; background: ${sec.bg}; border-left: 4px solid ${sec.color}; border-top: 1px solid ${sec.border}; border-right: 1px solid ${sec.border}; border-bottom: 1px solid ${sec.border}; border-radius: var(--radius-md); padding: 0.75rem 1rem;">
                                    <div style="display: flex; align-items: center; gap: 0.65rem;">
                                        <span style="font-size: 1.4rem;">${sec.icon}</span>
                                        <div>
                                            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #fff;">${sec.name}</h4>
                                            <div style="font-size: 0.72rem; color: var(--text-dim);">${sec.desc}</div>
                                        </div>
                                    </div>
                                    <span style="font-size: 0.7rem; font-weight: 800; color: ${sec.color}; background: rgba(0,0,0,0.3); padding: 3px 8px; border-radius: 6px;">
                                        ${secItems.length} Komoditas
                                    </span>
                                </div>

                                <!-- Cards Grid -->
                                <div class="commodity-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem;">
                                    ${secItems.map(c => this.renderCommodityCard(c, sec)).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

            </div>
        `;

        import('../../ui/ViewManager.js').then(m => {
            const viewManager = m.default;
            viewManager.activeDynamicTab = 'commodity';
            viewManager.showDynamicView('Pasar Komoditas Global', 'Perdagangan komoditas fisik digital: Logam Mulia, Energi, Industri & Pangan', content);
            this.bindEvents();
        });
    }

    renderCommodityCard(c, sec) {
        const hasHolding = c.ownedUnits > 0;
        const isUp = c.dailyChange >= 0;

        return `
            <div class="card commodity-card" data-id="${c.id}" style="
                background: var(--bg-surface);
                border: 1.5px solid ${hasHolding ? sec.color : 'rgba(255,255,255,0.08)'};
                border-radius: var(--radius-lg);
                padding: 1.25rem;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                gap: 1rem;
                position: relative;
                transition: transform 0.2s ease, border-color 0.2s ease;
            ">
                <div>
                    <!-- Top Row: Icon, Name & Ticker -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.65rem;">
                            <span style="font-size: 2rem; width: 44px; height: 44px; background: rgba(255,255,255,0.03); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${c.icon}</span>
                            <div>
                                <h4 style="margin: 0 0 2px 0; font-size: 0.95rem; font-weight: 800; color: #fff;">${c.name}</h4>
                                <div style="font-size: 0.7rem; color: var(--text-dim);">${c.origin}</div>
                            </div>
                        </div>

                        <span style="
                            font-size: 0.72rem;
                            font-weight: 900;
                            color: ${sec.color};
                            background: ${sec.bg};
                            border: 1px solid ${sec.border};
                            padding: 3px 8px;
                            border-radius: 6px;
                            white-space: nowrap;
                        ">
                            ${c.ticker}
                        </span>
                    </div>

                    <p style="font-size: 0.74rem; color: var(--text-muted); line-height: 1.4; margin: 0 0 0.85rem 0;">
                        ${c.desc}
                    </p>

                    <!-- Price & 24h Stats Box -->
                    <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">
                            <div>
                                <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Harga Spot / ${c.unitLabel}</div>
                                <div style="font-size: 1.25rem; font-weight: 900; color: #fff;">
                                    $ ${c.price >= 100 ? financeManager.formatCurrency(c.price, true) : c.price.toFixed(2)}
                                </div>
                            </div>
                            <span style="font-size: 0.82rem; font-weight: 800; color: ${isUp ? '#10b981' : '#ef4444'};">
                                ${isUp ? '▲ +' : '▼ '}${c.dailyChange}%
                            </span>
                        </div>

                        <!-- 24h High / Low Bar -->
                        <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-dim); border-top: 1px solid rgba(255,255,255,0.04); padding-top: 4px;">
                            <span>24h Low: $${c.low24h.toFixed(2)}</span>
                            <span>24h High: $${c.high24h.toFixed(2)}</span>
                        </div>
                    </div>

                    <!-- Custody Vault Holding Status -->
                    <div style="background: ${hasHolding ? sec.bg : 'rgba(255,255,255,0.02)'}; border: 1px solid ${hasHolding ? sec.border : 'rgba(255,255,255,0.05)'}; border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.74rem;">
                        ${hasHolding ? `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                <span style="color: var(--text-muted);">Simpanan Brankas:</span>
                                <strong style="color: #fff;">${c.ownedUnits.toLocaleString()} ${c.unitLabel} ($ ${financeManager.formatCurrency(c.currentValue, true)})</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: var(--text-muted);">Floating P/L:</span>
                                <strong style="color: ${c.pnl >= 0 ? '#10b981' : '#ef4444'};">
                                    ${c.pnl >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(c.pnl, true)} (${c.pnlPercent >= 0 ? '+' : ''}${c.pnlPercent}%)
                                </strong>
                            </div>
                        ` : `
                            <div style="color: var(--text-dim); text-align: center;">Belum ada simpanan di brankas digital.</div>
                        `}
                    </div>
                </div>

                <!-- Action Buttons: Chart & Buy/Sell -->
                <div class="commodity-card-actions" style="display: flex; gap: 0.5rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.85rem;">
                    <button class="btn btn-secondary btn-commodity-chart" data-id="${c.id}" style="padding: 7px 12px; font-weight: 700; font-size: 0.75rem;" title="Lihat Grafik Pasar Plotly">
                        📈 Grafik
                    </button>
                    <button class="btn btn-primary btn-commodity-buy" data-id="${c.id}" style="flex: 1; font-weight: 800; font-size: 0.78rem; padding: 7px 0; justify-content: center; background: ${sec.color}; border: none; color: #000;">
                        + Beli Fisik
                    </button>
                    <button class="btn btn-secondary btn-commodity-sell" data-id="${c.id}" ${hasHolding ? '' : 'disabled'} style="flex: 1; font-weight: 800; font-size: 0.78rem; padding: 7px 0; justify-content: center; ${hasHolding ? '' : 'opacity: 0.35; cursor: not-allowed;'}">
                        - Jual Kas
                    </button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const container = document.getElementById('dynamic-view-content');
        if (!container) return;

        // Sector filter buttons
        container.querySelectorAll('.commodity-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeSector = btn.dataset.sector;
                this.render();
            });
        });

        // Open Plotly Chart Modal
        container.querySelectorAll('.btn-commodity-chart').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                this.showChartModal(id);
            });
        });

        // Open Buy Modal
        container.querySelectorAll('.btn-commodity-buy').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                this.showBuyModal(id);
            });
        });

        // Open Sell Modal
        container.querySelectorAll('.btn-commodity-sell').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                this.showSellModal(id);
            });
        });
    }

    /**
     * Interactive Plotly Chart Modal for Commodity
     */
    async showChartModal(commodityId) {
        const item = commodityManager.getCommodity(commodityId);
        if (!item) return;

        const sec = COMMODITY_SECTORS[item.sector.toUpperCase()] || COMMODITY_SECTORS[Object.keys(COMMODITY_SECTORS).find(k => COMMODITY_SECTORS[k].id === item.sector)];
        const candles = commodityManager.generateCandles(commodityId, 30);

        const modalHTML = `
            <div style="display: flex; flex-direction: column; gap: 1rem; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 2rem;">${item.icon}</span>
                        <div>
                            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #fff;">${item.name} (${item.ticker}/USD)</h3>
                            <div style="font-size: 0.72rem; color: var(--text-dim);">${sec.name} · Standar Satuan: ${item.unitLabel}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.7rem; color: var(--text-dim);">Harga Spot Terkini</div>
                        <div style="font-size: 1.35rem; font-weight: 900; color: #fff;">$ ${item.price.toFixed(2)}</div>
                    </div>
                </div>

                <!-- Plotly Chart Container -->
                <div id="commodity-plotly-chart" class="commodity-chart-container" style="width: 100%; height: 350px; background: rgba(0,0,0,0.4); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);"></div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem;">
                    <span style="font-size: 0.72rem; color: var(--text-dim);">Grafik candlestick historis 30 hari perdagangan spot</span>
                    <button class="btn btn-secondary btn-sm" id="btn-close-commodity-chart">Tutup Grafik</button>
                </div>
            </div>
        `;

        ui.showModal({
            title: `Grafik Pergerakan ${item.name}`,
            content: modalHTML
        });

        document.getElementById('btn-close-commodity-chart')?.addEventListener('click', () => ui.closeModal());

        // Render Plotly Chart
        try {
            const Plotly = window.Plotly || (await import('plotly.js-dist-min')).default;
            const dates = candles.map(c => c.time);
            const opens = candles.map(c => c.open);
            const highs = candles.map(c => c.high);
            const lows = candles.map(c => c.low);
            const closes = candles.map(c => c.close);

            const trace = {
                x: dates,
                open: opens,
                high: highs,
                low: lows,
                close: closes,
                type: 'candlestick',
                xaxis: 'x',
                yaxis: 'y',
                increasing: { line: { color: '#10b981' } },
                decreasing: { line: { color: '#ef4444' } }
            };

            const layout = {
                dragmode: 'zoom',
                showlegend: false,
                margin: { l: 45, r: 25, t: 20, b: 35 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                xaxis: {
                    rangeslider: { visible: false },
                    color: '#a1a1aa',
                    gridcolor: 'rgba(255,255,255,0.05)'
                },
                yaxis: {
                    color: '#a1a1aa',
                    gridcolor: 'rgba(255,255,255,0.05)'
                }
            };

            Plotly.newPlot('commodity-plotly-chart', [trace], layout, { responsive: true, displayModeBar: false });
        } catch (e) {
            const chartEl = document.getElementById('commodity-plotly-chart');
            if (chartEl) chartEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);">Memuat grafik pasar komoditas...</div>';
        }
    }

    /**
     * Interactive Buy Modal with Fractional Live Conversion
     */
    showBuyModal(commodityId) {
        const item = commodityManager.getCommodity(commodityId);
        if (!item) return;

        const balance = gameState.getBalance();
        const effectivePrice = item.price * (1 + item.spread);

        const modalHTML = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <!-- Header Info -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <span style="font-size: 1.8rem;">${item.icon}</span>
                        <div>
                            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #fff;">${item.name}</h4>
                            <div style="font-size: 0.72rem; color: var(--text-dim);">${item.ticker} · Min Beli: $${item.minBuyUSD}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase;">Harga Spot / ${item.unitLabel}</div>
                        <div style="font-size: 1.15rem; font-weight: 900; color: #10b981;">$ ${item.price.toFixed(2)}</div>
                    </div>
                </div>

                <!-- Input Nominal USD -->
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">Nominal Pembelian ($ USD)</label>
                        <span style="font-size: 0.72rem; color: var(--text-dim);">Saldo: <strong style="color: #fff;">$ ${financeManager.formatCurrency(balance, true)}</strong></span>
                    </div>

                    <div style="position: relative;">
                        <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 800; color: #10b981;">$</span>
                        <input type="number" id="input-commodity-buy-amount" min="${item.minBuyUSD}" max="${balance}" value="${Math.min(balance, Math.max(item.minBuyUSD, 100))}" step="10" style="
                            width: 100%;
                            background: rgba(0,0,0,0.4);
                            border: 1px solid rgba(255,255,255,0.12);
                            border-radius: 8px;
                            padding: 10px 12px 10px 28px;
                            color: #fff;
                            font-size: 1.1rem;
                            font-weight: 800;
                            box-sizing: border-box;
                        "/>
                    </div>

                    <!-- Quick Allocation Pills -->
                    <div class="commodity-quick-pills" style="display: flex; gap: 0.4rem; margin-top: 0.5rem; flex-wrap: wrap;">
                        <button class="btn-buy-alloc" data-amt="50" style="padding: 4px 10px; font-size: 0.7rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #fff; cursor: pointer;">+$50</button>
                        <button class="btn-buy-alloc" data-amt="250" style="padding: 4px 10px; font-size: 0.7rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #fff; cursor: pointer;">+$250</button>
                        <button class="btn-buy-alloc" data-amt="1000" style="padding: 4px 10px; font-size: 0.7rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #fff; cursor: pointer;">+$1K</button>
                        <button class="btn-buy-pct" data-pct="0.5" style="padding: 4px 10px; font-size: 0.7rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #818cf8; font-weight: 700; cursor: pointer;">50% Saldo</button>
                        <button class="btn-buy-pct" data-pct="1.0" style="padding: 4px 10px; font-size: 0.7rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #10b981; font-weight: 800; cursor: pointer;">Maksimal</button>
                    </div>
                </div>

                <!-- Live Physical Acquired Conversion Box -->
                <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 0.85rem; display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                        <span style="color: var(--text-muted);">Estimasi Fisik Masuk Brankas:</span>
                        <strong id="preview-commodity-units" style="color: #10b981; font-size: 0.95rem;">0 ${item.unitLabel}</strong>
                    </div>
                    <div style="font-size: 0.68rem; color: var(--text-dim);">
                        Termasuk jaminan fisik 100% tersertifikasi kustodian & spread spot ${(item.spread * 100).toFixed(1)}%.
                    </div>
                </div>

                <!-- Footer Buttons -->
                <div style="display: flex; gap: 0.5rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.85rem;">
                    <button class="btn btn-secondary" id="btn-cancel-commodity-buy" style="flex: 1;">Batal</button>
                    <button class="btn btn-primary" id="btn-confirm-commodity-buy" style="flex: 2; font-weight: 800;">Konfirmasi Beli Fisik</button>
                </div>
            </div>
        `;

        ui.showModal({
            title: `Beli ${item.name}`,
            content: modalHTML
        });

        const inputEl = document.getElementById('input-commodity-buy-amount');
        const previewEl = document.getElementById('preview-commodity-units');

        const updatePreview = () => {
            const amt = parseFloat(inputEl?.value) || 0;
            const units = +(amt / effectivePrice).toFixed(4);
            if (previewEl) previewEl.textContent = `${units.toLocaleString()} ${item.unitLabel}`;
        };

        inputEl?.addEventListener('input', updatePreview);
        updatePreview();

        document.querySelectorAll('.btn-buy-alloc').forEach(b => {
            b.addEventListener('click', () => {
                const add = parseFloat(b.dataset.amt);
                if (inputEl) {
                    const cur = parseFloat(inputEl.value) || 0;
                    inputEl.value = Math.min(balance, cur + add);
                    updatePreview();
                }
            });
        });

        document.querySelectorAll('.btn-buy-pct').forEach(b => {
            b.addEventListener('click', () => {
                const pct = parseFloat(b.dataset.pct);
                if (inputEl) {
                    inputEl.value = Math.max(item.minBuyUSD, Math.floor(balance * pct));
                    updatePreview();
                }
            });
        });

        document.getElementById('btn-cancel-commodity-buy')?.addEventListener('click', () => ui.closeModal());

        document.getElementById('btn-confirm-commodity-buy')?.addEventListener('click', () => {
            const amt = parseFloat(inputEl?.value) || 0;
            try {
                const res = commodityManager.buy(commodityId, amt);
                ui.closeModal();
                ui.success(`Pembelian berhasil! +${res.unitsBought.toLocaleString()} ${item.unitLabel} telah disimpan ke brankas digital Anda.`, 'Beli Komoditas Sukses');
                this.render();
            } catch (err) {
                ui.error(err.message);
            }
        });
    }

    /**
     * Interactive Sell Modal (Physical Digital Vault -> USD Cash)
     */
    showSellModal(commodityId) {
        const item = commodityManager.getCommodity(commodityId);
        if (!item || item.ownedUnits <= 0) return;

        const effectiveSellPrice = item.price * (1 - item.spread);

        const modalHTML = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <span style="font-size: 1.8rem;">${item.icon}</span>
                        <div>
                            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #fff;">${item.name}</h4>
                            <div style="font-size: 0.72rem; color: var(--text-dim);">${item.ticker} · Simpanan: ${item.ownedUnits.toLocaleString()} ${item.unitLabel}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase;">Harga Jual Spot</div>
                        <div style="font-size: 1.15rem; font-weight: 900; color: #38bdf8;">$ ${item.price.toFixed(2)}</div>
                    </div>
                </div>

                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">Jumlah Unit Dijual (${item.unitLabel})</label>
                        <span style="font-size: 0.72rem; color: var(--text-dim);">Tersedia: <strong style="color: #fff;">${item.ownedUnits.toLocaleString()}</strong></span>
                    </div>

                    <input type="number" id="input-commodity-sell-units" min="0.0001" max="${item.ownedUnits}" value="${item.ownedUnits}" step="0.1" style="
                        width: 100%;
                        background: rgba(0,0,0,0.4);
                        border: 1px solid rgba(255,255,255,0.12);
                        border-radius: 8px;
                        padding: 10px 12px;
                        color: #fff;
                        font-size: 1.1rem;
                        font-weight: 800;
                        box-sizing: border-box;
                    "/>

                    <div class="commodity-quick-pills" style="display: flex; gap: 0.4rem; margin-top: 0.5rem; flex-wrap: wrap;">
                        <button class="btn-sell-pct" data-pct="0.25" style="padding: 4px 10px; font-size: 0.7rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #fff; cursor: pointer;">25%</button>
                        <button class="btn-sell-pct" data-pct="0.5" style="padding: 4px 10px; font-size: 0.7rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #fff; cursor: pointer;">50%</button>
                        <button class="btn-sell-pct" data-pct="0.75" style="padding: 4px 10px; font-size: 0.7rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #fff; cursor: pointer;">75%</button>
                        <button class="btn-sell-pct" data-pct="1.0" style="padding: 4px 10px; font-size: 0.7rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #10b981; font-weight: 800; cursor: pointer;">100% Semua</button>
                    </div>
                </div>

                <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 0.85rem; display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                        <span style="color: var(--text-muted);">Estimasi Kas Diterima:</span>
                        <strong id="preview-commodity-payout" style="color: #38bdf8; font-size: 1.05rem;">$ 0</strong>
                    </div>
                    <div style="font-size: 0.68rem; color: var(--text-dim);">
                        Dana tunai langsung masuk ke saldo kas utama tanpa potongan brankas tersembunyi.
                    </div>
                </div>

                <div style="display: flex; gap: 0.5rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.85rem;">
                    <button class="btn btn-secondary" id="btn-cancel-commodity-sell" style="flex: 1;">Batal</button>
                    <button class="btn btn-danger" id="btn-confirm-commodity-sell" style="flex: 2; font-weight: 800;">Konfirmasi Cairkan Kas</button>
                </div>
            </div>
        `;

        ui.showModal({
            title: `Cairkan ${item.name}`,
            content: modalHTML
        });

        const inputEl = document.getElementById('input-commodity-sell-units');
        const payoutEl = document.getElementById('preview-commodity-payout');

        const updatePayout = () => {
            const u = parseFloat(inputEl?.value) || 0;
            const payout = Math.floor(u * effectiveSellPrice);
            if (payoutEl) payoutEl.textContent = `$ ${financeManager.formatCurrency(payout, true)}`;
        };

        inputEl?.addEventListener('input', updatePayout);
        updatePayout();

        document.querySelectorAll('.btn-sell-pct').forEach(b => {
            b.addEventListener('click', () => {
                const pct = parseFloat(b.dataset.pct);
                if (inputEl) {
                    inputEl.value = +(item.ownedUnits * pct).toFixed(4);
                    updatePayout();
                }
            });
        });

        document.getElementById('btn-cancel-commodity-sell')?.addEventListener('click', () => ui.closeModal());

        document.getElementById('btn-confirm-commodity-sell')?.addEventListener('click', () => {
            const u = parseFloat(inputEl?.value) || 0;
            try {
                const res = commodityManager.sell(commodityId, u);
                ui.closeModal();
                ui.success(`Penjualan berhasil! Kas +$ ${financeManager.formatCurrency(res.payoutUSD)} telah masuk ke saldo utama Anda.`, 'Penjualan Komoditas Sukses');
                this.render();
            } catch (err) {
                ui.error(err.message);
            }
        });
    }
}

export const commodityPanel = new CommodityPanel();
export default commodityPanel;
