/**
 * CryptoPanel.js - Professional Crypto Exchange Terminal
 * Hybrid Full-Screen View with extreme volatility indicators and whale tracking
 */

import cryptoMarket from '../../finance/CryptoMarket.js';
import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../game/GameState.js';
import ui from '../UIManager.js';

class CryptoPanel {
    constructor() {
        this.activeTab = 'market';
    }

    show() {
        const cryptos = cryptoMarket.getAllCryptos();
        const wallet = cryptoMarket.getWallet();
        const pendingOrders = cryptoMarket.getPendingOrders();
        const walletValue = cryptoMarket.getWalletValue();
        const balance = gameState.getBalance();

        const content = `
            <div class="hybrid-page-container" style="padding: 1.5rem; max-width: 1200px; margin: 0 auto; width: 100%;">
                
                <!-- Risk & Portfolio Header -->
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1.25rem; margin-bottom: 2rem;">
                    <div class="card" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), transparent); border-left: 4px solid #ef4444; display: flex; align-items: center; gap: 1rem;">
                        <div style="font-size: 2rem;">⚠️</div>
                        <div>
                            <div style="font-size: 0.7rem; color: #ef4444; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Risk Warning</div>
                            <div style="font-size: 0.9rem; color: white; font-weight: 600;">Extreme Volatility Detected. Capital at Risk.</div>
                        </div>
                    </div>
                    <div class="card" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), transparent); border-left: 4px solid #f59e0b;">
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Total Wallet Value</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: white;">$ ${financeManager.formatCurrency(walletValue, true)}</div>
                    </div>
                    <div class="card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), transparent); border-left: 4px solid var(--accent-primary);">
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Cash Balance</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-primary);">$ ${financeManager.formatCurrency(balance, true)}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 350px; gap: 2rem; align-items: start;">
                    
                    <!-- Left: Exchange Terminal -->
                    <div>
                        <div class="tabs-premium" style="margin-bottom: 1.5rem;">
                            <button class="tab-btn-premium ${this.activeTab === 'market' ? 'active' : ''}" data-tab="market">Spot Market</button>
                            <button class="tab-btn-premium ${this.activeTab === 'wallet' ? 'active' : ''}" data-tab="wallet">My Wallet</button>
                            <button class="tab-btn-premium ${this.activeTab === 'orders' ? 'active' : ''}" data-tab="orders">Active Orders ${pendingOrders.length ? `<span class="badge">${pendingOrders.length}</span>` : ''}</button>
                        </div>

                        <div id="crypto-view-container">
                            ${this.renderActiveTab()}
                        </div>
                    </div>

                    <!-- Right: Whale Tracker & Alerts -->
                    <div style="position: sticky; top: 1.5rem;">
                        <div class="card" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color);">
                            <h4 style="margin-bottom: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #f59e0b;">
                                <span>🐋</span> WHALE TRACKER (LIVE)
                            </h4>
                            
                            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                <div class="whale-alert">
                                    <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                                        <span>JUST NOW</span>
                                        <span style="color: #ef4444;">SELL ALERT</span>
                                    </div>
                                    <div style="font-size: 0.8rem; font-weight: 600;">500 BTC moved from Unknown Wallet to Binance</div>
                                </div>
                                <div class="whale-alert">
                                    <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                                        <span>2 MIN AGO</span>
                                        <span style="color: var(--accent-primary);">BUY ALERT</span>
                                    </div>
                                    <div style="font-size: 0.8rem; font-weight: 600;">10,000 ETH bought at $ 3,450</div>
                                </div>
                            </div>

                            <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color);">
                                <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.75rem;">Fear & Greed Index</div>
                                <div style="height: 12px; background: linear-gradient(to right, #ef4444, #f59e0b, #10b981); border-radius: 6px; position: relative;">
                                    <div style="position: absolute; left: 75%; top: -5px; width: 4px; height: 22px; background: white; border-radius: 2px; box-shadow: 0 0 10px rgba(255,255,255,0.5);"></div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.65rem; margin-top: 0.5rem; font-weight: 700;">
                                    <span>FEAR</span>
                                    <span style="color: var(--accent-primary);">GREED (75)</span>
                                </div>
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
                    left: 0;right: 0;
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

                .crypto-asset-card {
                    background: var(--bg-surface);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 1.25rem;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .crypto-asset-card:hover {
                    border-color: var(--accent-primary);
                    background: rgba(255,255,255,0.02);
                    transform: scale(1.02);
                }
                .whale-alert {
                    background: rgba(255,255,255,0.03);
                    padding: 0.75rem;
                    border-radius: 10px;
                    border-left: 3px solid #f59e0b;
                }
            </style>
        `;

        import('../ViewManager.js').then(m => {
            const viewManager = m.default;
            viewManager.showDynamicView('Crypto Exchange', 'High-volatility digital asset trading', content);
            this.bindEvents();
        });
    }

    renderActiveTab() {
        if (this.activeTab === 'market') return this.renderMarket();
        if (this.activeTab === 'wallet') return this.renderWallet();
        if (this.activeTab === 'orders') return this.renderOrders();
        return '';
    }

    renderMarket() {
        const cryptos = cryptoMarket.getAllCryptos();
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-top: 1rem;">
                ${cryptos.map(c => `
                    <div class="crypto-asset-card" data-symbol="${c.symbol}">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div style="font-size: 2rem;">${c.icon}</div>
                            <div style="text-align: right;">
                                <div style="font-weight: 800; color: ${c.change >= 0 ? 'var(--accent-primary)' : '#ef4444'}; font-size: 0.9rem;">
                                    ${c.change >= 0 ? '🚀 +' : '📉 '}${c.change.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                        <div style="font-weight: 800; font-size: 1.1rem; color: white;">${c.symbol}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.75rem;">${c.name}</div>
                        <div style="font-size: 1.25rem; font-weight: 900; color: white;">${cryptoMarket.formatPrice(c.price)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderWallet() {
        const wallet = cryptoMarket.getWallet();
        if (wallet.length === 0) {
            return `
                <div style="text-align: center; padding: 4rem 1rem; opacity: 0.3;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🪙</div>
                    <p>Wallet crypto Anda kosong. Beli dip!</p>
                </div>
            `;
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem;">
                ${wallet.map(h => `
                    <div class="card" style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); padding: 1.25rem; display: grid; grid-template-columns: 50px 1fr 1fr 1fr 120px; align-items: center; gap: 1rem; cursor: pointer;" data-symbol="${h.symbol}">
                        <div style="font-size: 1.5rem;">${h.icon}</div>
                        <div>
                            <div style="font-weight: 800; color: white;">${h.symbol}</div>
                            <div style="font-size: 0.7rem; color: var(--text-muted);">${cryptoMarket.formatAmount(h.amount)} ${h.symbol}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase;">Avg Price</div>
                            <div style="font-weight: 700; color: white;">${cryptoMarket.formatPrice(h.avgBuyPrice)}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase;">Current Value</div>
                            <div style="font-weight: 700; color: white;">$ ${financeManager.formatCurrency(h.currentValue, true)}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 800; color: ${h.profit >= 0 ? 'var(--accent-primary)' : '#ef4444'};">
                                ${h.profit >= 0 ? '+' : ''}${h.profitPercent.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderOrders() {
        const orders = cryptoMarket.getPendingOrders();
        if (orders.length === 0) {
            return `
                <div style="text-align: center; padding: 4rem 1rem; opacity: 0.3;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                    <p>Tidak ada order limit aktif.</p>
                </div>
            `;
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem;">
                ${orders.map(o => `
                    <div class="card" style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); padding: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
                                <span style="font-weight: 800; color: white;">${o.symbol}</span>
                                <span style="font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: ${o.type === 'LIMIT_BUY' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${o.type === 'LIMIT_BUY' ? 'var(--accent-primary)' : '#ef4444'};">
                                    ${o.type}
                                </span>
                            </div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">
                                Limit: ${cryptoMarket.formatPrice(o.limitPrice)}
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

        container.querySelectorAll('.tab-btn-premium').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeTab = btn.dataset.tab;
                this.show();
            });
        });

        container.querySelectorAll('[data-symbol]').forEach(el => {
            el.addEventListener('click', () => this.showTradeModal(el.dataset.symbol));
        });

        container.querySelectorAll('.cancel-order-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                try {
                    cryptoMarket.cancelLimitOrder(parseFloat(btn.dataset.orderId));
                    ui.success('Order cancelled.');
                    this.show();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });
    }

    showTradeModal(symbol) {
        const crypto = cryptoMarket.getCrypto(symbol);
        const wallet = gameState.get('crypto') || {};
        const holding = wallet[symbol];
        const balance = gameState.getBalance();

        const content = `
            <div class="modal-header">
                <h3 class="modal-title">${crypto.icon} Exchange ${symbol}</h3>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.5rem;">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Index Price</div>
                        <div style="font-size: 1.75rem; font-weight: 800; color: white;">${cryptoMarket.formatPrice(crypto.price)}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 800; color: ${crypto.change >= 0 ? 'var(--accent-primary)' : '#ef4444'}; font-size: 1.1rem;">
                            ${crypto.change >= 0 ? '▲' : '▼'} ${Math.abs(crypto.change).toFixed(2)}%
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Order Type</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                        <button class="order-type-btn active" data-type="market">Instant Swap</button>
                        <button class="order-type-btn" data-type="limit">Limit Order</button>
                    </div>
                </div>

                <div id="limit-price-group" style="display: none; margin-bottom: 1rem;">
                    <label class="form-label">Target Price ($)</label>
                    <input type="number" id="limit-price-input" class="modern-input" value="${crypto.price}" step="0.0001" style="width: 100%; padding: 0.75rem; border-radius: 8px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white;">
                </div>

                <div class="form-group">
                    <label class="form-label">Amount (USD)</label>
                    <input type="number" id="amount-input" class="modern-input" value="1000" min="10" style="width: 100%; padding: 0.75rem; border-radius: 8px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: white;">
                </div>

                <div class="card" style="background: rgba(255,255,255,0.02); margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
                        <span style="color: var(--text-muted);">Estimated Receive</span>
                        <span id="order-estimate" style="font-weight: 800; color: var(--accent-primary);">0 ${symbol}</span>
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
        this.bindTradeEvents(symbol, crypto);
    }

    bindTradeEvents(symbol, crypto) {
        const modal = document.getElementById('modal-content');
        const amountInput = document.getElementById('amount-input');
        if (amountInput) {
            ui.setupNumericInput(amountInput);
        }
        const limitPriceInput = document.getElementById('limit-price-input');
        const estimateDisplay = document.getElementById('order-estimate');
        
        let orderType = 'market';

        const updateEstimate = () => {
            const amountUSD = amountInput.getNumericValue ? amountInput.getNumericValue() : (parseFloat(amountInput.value.replace(/,/g, '')) || 0);
            const price = orderType === 'market' ? crypto.price : parseFloat(limitPriceInput.value) || 0;
            const estimate = price > 0 ? amountUSD / price : 0;
            estimateDisplay.textContent = `${cryptoMarket.formatAmount(estimate)} ${symbol}`;
        };

        modal.querySelectorAll('.order-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                orderType = btn.dataset.type;
                document.getElementById('limit-price-group').style.display = orderType === 'limit' ? 'block' : 'none';
                updateEstimate();
            });
        });

        amountInput.addEventListener('input', updateEstimate);
        limitPriceInput.addEventListener('input', updateEstimate);

        document.getElementById('btn-buy-exec').addEventListener('click', () => {
            const amountUSD = amountInput.getNumericValue ? amountInput.getNumericValue() : (parseFloat(amountInput.value.replace(/,/g, '')) || 0);
            try {
                if (orderType === 'market') {
                    cryptoMarket.marketBuy(symbol, amountUSD);
                    ui.success(`Bought ${symbol} for $ ${financeManager.formatCurrency(amountUSD, true)}.`);
                } else {
                    const price = parseFloat(limitPriceInput.value);
                    cryptoMarket.limitBuy(symbol, amountUSD, price);
                    ui.success(`Limit Buy placed for ${symbol} @ ${cryptoMarket.formatPrice(price)}.`);
                }
                ui.closeModal();
                this.show();
            } catch (e) {
                ui.error(e.message);
            }
        });

        document.getElementById('btn-sell-exec').addEventListener('click', () => {
            const wallet = gameState.get('crypto') || {};
            const holding = wallet[symbol];
            if (!holding) return;

            const amountUSD = amountInput.getNumericValue ? amountInput.getNumericValue() : (parseFloat(amountInput.value.replace(/,/g, '')) || 0);
            const cryptoAmount = amountUSD / crypto.price; // Sell equivalent USD value

            try {
                if (orderType === 'market') {
                    cryptoMarket.marketSell(symbol, Math.min(cryptoAmount, holding.amount));
                    ui.success(`Sold ${symbol} at market price.`);
                } else {
                    const price = parseFloat(limitPriceInput.value);
                    cryptoMarket.limitSell(symbol, Math.min(cryptoAmount, holding.amount), price);
                    ui.success(`Limit Sell placed for ${symbol} @ ${cryptoMarket.formatPrice(price)}.`);
                }
                ui.closeModal();
                this.show();
            } catch (e) {
                ui.error(e.message);
            }
        });

        updateEstimate();
    }
}

export default new CryptoPanel();
