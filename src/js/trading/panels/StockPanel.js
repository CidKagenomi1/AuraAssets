/**
 * StockPanel.js - Professional Stock Trading Terminal
 * Hybrid Full-Screen View with live market data and portfolio management
 */

import stockMarket from '../../trading/StockMarket.js';
import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../core/GameState.js';
import ui from '../../ui/UIManager.js';

class StockPanel {
    constructor() {
        this.activeTab = 'market'; // 'market', 'portfolio', 'orders'
    }

    show() {
        const stocks = stockMarket.getAllStocks();
        const portfolio = stockMarket.getPortfolio();
        const pendingOrders = stockMarket.getPendingOrders();
        const portfolioValue = stockMarket.getPortfolioValue();
        const balance = gameState.getBalance();

        const content = `
            <div class="hybrid-page-container" style="padding: 1.5rem; max-width: 1200px; margin: 0 auto; width: 100%;">
                
                <!-- Portfolio Overview Header -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
                    <div class="card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), transparent); border-left: 4px solid #3b82f6;">
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Total Portfolio Value</div>
                        <div style="font-size: 1.75rem; font-weight: 800; color: white;">$ ${financeManager.formatCurrency(portfolioValue, true)}</div>
                    </div>
                    <div class="card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), transparent); border-left: 4px solid var(--accent-primary);">
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Buying Power (Cash)</div>
                        <div style="font-size: 1.75rem; font-weight: 800; color: var(--accent-primary);">$ ${financeManager.formatCurrency(balance, true)}</div>
                    </div>
                    <div class="card" style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), transparent); border-left: 4px solid #a855f7;">
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Open Positions</div>
                        <div style="font-size: 1.75rem; font-weight: 800; color: #a855f7;">${portfolio.length} <span style="font-size: 1rem; color: var(--text-muted); font-weight: 400;">Assets</span></div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 350px; gap: 2rem; align-items: start;">
                    
                    <!-- Left: Trading Area -->
                    <div>
                        <div class="tabs-premium" style="margin-bottom: 1.5rem;">
                            <button class="tab-btn-premium ${this.activeTab === 'market' ? 'active' : ''}" data-tab="market">Market Terminal</button>
                            <button class="tab-btn-premium ${this.activeTab === 'portfolio' ? 'active' : ''}" data-tab="portfolio">My Portfolio</button>
                            <button class="tab-btn-premium ${this.activeTab === 'orders' ? 'active' : ''}" data-tab="orders">Pending Orders ${pendingOrders.length ? `<span class="badge">${pendingOrders.length}</span>` : ''}</button>
                        </div>

                        <div id="stock-view-container">
                            ${this.renderActiveTab()}
                        </div>
                    </div>

                    <!-- Right: Quick Insights / Market News (Static for now) -->
                    <div style="position: sticky; top: 1.5rem;">
                        <div class="card" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color);">
                            <h4 style="margin-bottom: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
                                <span>⚡</span> MARKET INSIGHTS
                            </h4>
                            
                            <div style="display: flex; flex-direction: column; gap: 1rem;">
                                <div class="insight-item">
                                    <div style="font-size: 0.8rem; font-weight: 700; color: white; margin-bottom: 0.25rem;">Fed Interest Rate Decision</div>
                                    <div style="font-size: 0.7rem; color: var(--text-muted); line-height: 1.4;">Investors are cautious as the Fed meets tomorrow. Tech stocks are showing volatility.</div>
                                </div>
                                <div class="insight-item">
                                    <div style="font-size: 0.8rem; font-weight: 700; color: white; margin-bottom: 0.25rem;">Nvidia AI Dominance</div>
                                    <div style="font-size: 0.7rem; color: var(--text-muted); line-height: 1.4;">NVDA continues to push market indices higher with record-breaking quarterly revenue.</div>
                                </div>
                            </div>

                            <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color);">
                                <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.75rem;">Top Movers (24h)</div>
                                ${stocks.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 3).map(s => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-bottom: 0.5rem;">
                                        <span style="font-weight: 700;">${s.symbol}</span>
                                        <span style="color: ${s.change >= 0 ? 'var(--accent-primary)' : '#ef4444'}; font-weight: 800;">
                                            ${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)}%
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <style>
                .tabs-premium {
                    display: flex;
                    gap: 0.5rem;
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: 0.5rem;
                }
                .tab-btn-premium {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-weight: 800;
                    font-size: 0.85rem;
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    position: relative;
                    transition: all 0.2s;
                }
                .tab-btn-premium.active {
                    color: white;
                }
                .tab-btn-premium.active::after {
                    content: '';
                    position: absolute;
                    bottom: -0.5rem;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: var(--accent-primary);
                }
                .tab-btn-premium .badge {
                    background: var(--accent-primary);
                    color: white;
                    font-size: 0.6rem;
                    padding: 1px 5px;
                    border-radius: 10px;
                    margin-left: 5px;
                }

                .trading-asset-card {
                    background: var(--bg-surface);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .trading-asset-card:hover {
                    border-color: rgba(255,255,255,0.2);
                    background: rgba(255,255,255,0.02);
                }
                .asset-icon-box {
                    width: 50px;
                    height: 50px;
                    background: rgba(0,0,0,0.3);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                }
                .insight-item {
                    padding: 0.75rem;
                    background: rgba(255,255,255,0.02);
                    border-radius: 8px;
                }
            </style>
        `;

        import('../../ui/ViewManager.js').then(m => {
            const viewManager = m.default;
            viewManager.showDynamicView('Stock Terminal', 'Professional global stock market trading', content);
            this.bindEvents();
        });
    }

    renderActiveTab() {
        if (this.activeTab === 'market') return this.renderMarket();
        if (this.activeTab === 'portfolio') return this.renderPortfolio();
        if (this.activeTab === 'orders') return this.renderOrders();
        return '';
    }

    renderMarket() {
        const stocks = stockMarket.getAllStocks();
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-top: 1rem;">
                ${stocks.map(s => `
                    <div class="trading-asset-card" data-symbol="${s.symbol}">
                        <div class="asset-icon-box">${stockMarket.getStockIcon(s.sector)}</div>
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: 800; color: white;">${s.symbol}</span>
                                <span style="font-weight: 800; color: white;">$ ${financeManager.formatCurrency(s.price, true)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem;">
                                <span style="font-size: 0.75rem; color: var(--text-muted);">${s.name}</span>
                                <span style="font-size: 0.75rem; font-weight: 700; color: ${s.change >= 0 ? 'var(--accent-primary)' : '#ef4444'}">
                                    ${s.change >= 0 ? '▲' : '▼'} ${Math.abs(s.change).toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderPortfolio() {
        const portfolio = stockMarket.getPortfolio();
        if (portfolio.length === 0) {
            return `
                <div style="text-align: center; padding: 4rem 1rem; opacity: 0.3;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                    <p>Portofolio saham Anda masih kosong.</p>
                </div>
            `;
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem;">
                ${portfolio.map(h => `
                    <div class="card portfolio-item-premium" data-symbol="${h.symbol}" style="cursor: pointer; background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); padding: 1.25rem; display: grid; grid-template-columns: 60px 1fr 1fr 1fr 120px; align-items: center; gap: 1rem;">
                        <div class="asset-icon-box" style="width: 45px; height: 45px;">📊</div>
                        <div>
                            <div style="font-weight: 800; color: white;">${h.symbol}</div>
                            <div style="font-size: 0.7rem; color: var(--text-muted);">${h.shares} Lots</div>
                        </div>
                        <div>
                            <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase;">Avg Price</div>
                            <div style="font-weight: 700; color: white;">$ ${financeManager.formatCurrency(h.avgBuyPrice, true)}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase;">Market Value</div>
                            <div style="font-weight: 700; color: white;">$ ${financeManager.formatCurrency(h.currentValue, true)}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 800; color: ${h.profit >= 0 ? 'var(--accent-primary)' : '#ef4444'};">
                                ${h.profit >= 0 ? '+' : ''}${h.profitPercent.toFixed(2)}%
                            </div>
                            <div style="font-size: 0.7rem; color: var(--text-muted);">
                                ${h.profit >= 0 ? '+' : '-'}$ ${financeManager.formatCurrency(Math.abs(h.profit), true)}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderOrders() {
        const orders = stockMarket.getPendingOrders();
        if (orders.length === 0) {
            return `
                <div style="text-align: center; padding: 4rem 1rem; opacity: 0.3;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                    <p>Tidak ada order pending saat ini.</p>
                </div>
            `;
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem;">
                ${orders.map(o => `
                    <div class="card" style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); padding: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                                <span style="font-weight: 800; color: white;">${o.symbol}</span>
                                <span style="font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: ${o.type === 'LIMIT_BUY' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${o.type === 'LIMIT_BUY' ? 'var(--accent-primary)' : '#ef4444'};">
                                    ${o.type}
                                </span>
                            </div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">
                                ${o.shares} lot @ $ ${financeManager.formatCurrency(o.limitPrice, true)}
                            </div>
                        </div>
                        <button class="btn btn-sm btn-secondary cancel-order-btn" data-order-id="${o.id}">Cancel</button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    bindEvents() {
        const container = document.getElementById('dynamic-view-content');
        if (!container) return;

        // Tab switching
        container.querySelectorAll('.tab-btn-premium').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeTab = btn.dataset.tab;
                this.show(); // Refresh with new tab
            });
        });

        // Stock click to trade
        container.querySelectorAll('[data-symbol]').forEach(el => {
            el.addEventListener('click', () => this.showTradeModal(el.dataset.symbol));
        });

        // Cancel order
        container.querySelectorAll('.cancel-order-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                try {
                    stockMarket.cancelLimitOrder(parseFloat(btn.dataset.orderId));
                    ui.success('Order cancelled.');
                    this.show();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });
    }

    showTradeModal(symbol) {
        // Here we can still use a modal for the execution form to keep focus
        const stock = stockMarket.getStock(symbol);
        const portfolio = gameState.get('stocks') || {};
        const holding = portfolio[symbol];
        const balance = gameState.getBalance();

        const content = `
            <div class="modal-header">
                <h3 class="modal-title">📈 Trade ${symbol}</h3>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.5rem;">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Current Price</div>
                        <div style="font-size: 2rem; font-weight: 800; color: white;">$ ${financeManager.formatCurrency(stock.price, true)}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 800; color: ${stock.change >= 0 ? 'var(--accent-primary)' : '#ef4444'}; font-size: 1.25rem;">
                            ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">24h Vol: High $ ${financeManager.formatCurrency(stock.high24h, true)}</div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Order Type</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                        <button class="order-type-btn active" data-type="market">Market Order</button>
                        <button class="order-type-btn" data-type="limit">Limit Order</button>
                    </div>
                </div>

                <div id="limit-price-group" style="display: none; margin-bottom: 1rem;">
                    <label class="form-label">Limit Price ($)</label>
                    <input type="number" id="limit-price-input" class="modern-input" value="${stock.price}" step="0.1" style="width: 100%; padding: 0.75rem; border-radius: 8px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white;">
                </div>

                <div class="form-group">
                    <label class="form-label">Amount (Lots)</label>
                    <input type="number" id="shares-input" class="modern-input" value="10" min="1" style="width: 100%; padding: 0.75rem; border-radius: 8px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white;">
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                        <button class="btn btn-xs btn-secondary lot-quick" data-val="10">10</button>
                        <button class="btn btn-xs btn-secondary lot-quick" data-val="50">50</button>
                        <button class="btn btn-xs btn-secondary lot-quick" data-val="100">100</button>
                        <button class="btn btn-xs btn-secondary lot-quick" data-val="max">MAX</button>
                    </div>
                </div>

                <div class="card" style="background: rgba(255,255,255,0.02); margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                        <span style="color: var(--text-muted);">Est. Total Cost</span>
                        <span id="order-total" style="font-weight: 800; color: white;">$ 0</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                        <span style="color: var(--text-muted);">Buying Power</span>
                        <span style="color: var(--accent-primary);">$ ${financeManager.formatCurrency(balance, true)}</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <button id="btn-buy-exec" class="btn btn-primary" style="padding: 1rem; font-weight: 800;">BUY ${symbol}</button>
                    <button id="btn-sell-exec" class="btn btn-danger" ${!holding ? 'disabled' : ''} style="padding: 1rem; font-weight: 800;">SELL ${symbol}</button>
                </div>
            </div>

            <style>
                .order-type-btn {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid var(--border-color);
                    padding: 0.5rem;
                    border-radius: 8px;
                    color: var(--text-muted);
                    font-weight: 700;
                    font-size: 0.8rem;
                    cursor: pointer;
                }
                .order-type-btn.active {
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border-color: white;
                }
            </style>
        `;

        ui.openModal(content);
        this.bindTradeEvents(symbol, stock);
    }

    bindTradeEvents(symbol, stock) {
        const modal = document.getElementById('modal-content');
        const amountInput = document.getElementById('shares-input');
        if (amountInput) {
            ui.setupNumericInput(amountInput);
        }
        const limitPriceInput = document.getElementById('limit-price-input');
        const totalDisplay = document.getElementById('order-total');
        
        let orderType = 'market';

        const updateSummary = () => {
            const amount = amountInput.getNumericValue ? amountInput.getNumericValue() : (parseInt(amountInput.value.replace(/,/g, ''), 10) || 0);
            const price = orderType === 'market' ? stock.price : parseFloat(limitPriceInput.value) || 0;
            totalDisplay.textContent = `$ ${financeManager.formatCurrency(amount * price, true)}`;
        };

        modal.querySelectorAll('.order-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                orderType = btn.dataset.type;
                document.getElementById('limit-price-group').style.display = orderType === 'limit' ? 'block' : 'none';
                updateSummary();
            });
        });

        modal.querySelectorAll('.lot-quick').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.val === 'max') {
                    const balance = gameState.getBalance();
                    amountInput.value = Math.floor(balance / stock.price);
                } else {
                    amountInput.value = btn.dataset.val;
                }
                updateSummary();
            });
        });

        amountInput.addEventListener('input', updateSummary);
        limitPriceInput.addEventListener('input', updateSummary);

        document.getElementById('btn-buy-exec').addEventListener('click', () => {
            const shares = amountInput.getNumericValue ? amountInput.getNumericValue() : (parseInt(amountInput.value.replace(/,/g, ''), 10) || 0);
            try {
                if (orderType === 'market') {
                    stockMarket.marketBuy(symbol, shares);
                    ui.success(`Bought ${shares} lot of ${symbol} at market price.`);
                } else {
                    const price = parseFloat(limitPriceInput.value);
                    stockMarket.limitBuy(symbol, shares, price);
                    ui.success(`Limit Buy order placed for ${shares} lot of ${symbol} @ $ ${price}.`);
                }
                ui.closeModal();
                this.show();
            } catch (e) {
                ui.error(e.message);
            }
        });

        document.getElementById('btn-sell-exec').addEventListener('click', () => {
            const shares = amountInput.getNumericValue ? amountInput.getNumericValue() : (parseInt(amountInput.value.replace(/,/g, ''), 10) || 0);
            try {
                if (orderType === 'market') {
                    stockMarket.marketSell(symbol, shares);
                    ui.success(`Sold ${shares} lot of ${symbol} at market price.`);
                } else {
                    const price = parseFloat(limitPriceInput.value);
                    stockMarket.limitSell(symbol, shares, price);
                    ui.success(`Limit Sell order placed for ${shares} lot of ${symbol} @ $ ${price}.`);
                }
                ui.closeModal();
                this.show();
            } catch (e) {
                ui.error(e.message);
            }
        });

        updateSummary();
    }
}

export default new StockPanel();
