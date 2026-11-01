/**
 * MarketCoordinator.js - Orchestrator for All Market Sub-Views and Tabs
 * Coordinates Stocks, Crypto, Commodities, Mutual Funds & ETFs, and Portfolio tabs.
 */

import stockMarket from '../../../trading/StockMarket.js';
import cryptoMarket from '../../../trading/CryptoMarket.js';
import mutualFundManager from '../../../trading/MutualFundManager.js';
import financeManager from '../../../finance/FinanceManager.js';
import newsManager from '../../../core/NewsManager.js';

import stockCryptoSubView from './StockCryptoSubView.js';
import commoditySubView from './CommoditySubView.js';
import mutualFundsSubView from './MutualFundsSubView.js';
import marketPortfolioSubView from './MarketPortfolioSubView.js';
import marketNewsSubView from './MarketNewsSubView.js';

export class MarketCoordinator {
  constructor() {
    this.currentMarketTab = 'stocks';

    // Link sub-view callbacks
    stockCryptoSubView.setUpdateCallback(() => this.updateMarketView());
    commoditySubView.setUpdateCallback(() => this.updateMarketView());
    mutualFundsSubView.setUpdateCallback(() => this.updateMarketView());
  }

  init() {
    this.bindMarketTabs();
    stockCryptoSubView.bindSmartControls();
    this.updateMarketView();
  }

  bindMarketTabs() {
    const buttons = document.querySelectorAll('#market-main-tab-group .tab-btn[data-tab]');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        this.switchTab(tabId);
      });
    });
  }

  switchTab(tabId) {
    const buttons = document.querySelectorAll('#market-main-tab-group .tab-btn[data-tab]');
    const targetBtn = Array.from(buttons).find(b => b.dataset.tab === tabId);

    // update active button
    buttons.forEach(b => b.classList.remove('active'));
    if (targetBtn) targetBtn.classList.add('active');

    // update visible content
    document.querySelectorAll('#view-market .tab-content[data-tab-content]').forEach(el => {
      el.style.display = el.dataset.tabContent === tabId ? '' : 'none';
    });

    if (this.currentMarketTab !== tabId) {
      this.currentMarketTab = tabId;
      // Reset sector filter so stock sectors do not incorrectly hide crypto assets and vice versa
      stockCryptoSubView.marketSectorFilter = 'all';
    }

    this.updateMarketView();
  }

  updateBadges() {
    const allStocks = stockMarket.getAllStocks() || [];
    const allCryptos = cryptoMarket.getAllCryptos() || [];
    const portfolioCount = (stockMarket.getPortfolio() || []).length + (cryptoMarket.getWallet() || []).length;
    const activeNews = (typeof newsManager.getActiveNews === 'function' ? newsManager.getActiveNews() : []) || [];

    const badgeStocks = document.getElementById('badge-stocks');
    const badgeCrypto = document.getElementById('badge-crypto');
    const badgeCommodity = document.getElementById('badge-commodity');
    const badgeReksadana = document.getElementById('badge-reksadana');
    const badgePortfolio = document.getElementById('badge-portfolio');
    const badgeNews = document.getElementById('badge-news');

    if (badgeStocks) badgeStocks.textContent = allStocks.length;
    if (badgeCrypto) badgeCrypto.textContent = allCryptos.length;
    if (badgeCommodity) badgeCommodity.textContent = commoditySubView.getCount();
    if (badgeReksadana) badgeReksadana.textContent = mutualFundManager.getFunds().length;
    if (badgePortfolio) badgePortfolio.textContent = portfolioCount;
    if (badgeNews) badgeNews.textContent = activeNews.length;
  }

  updateMarketView(force = false) {
    this.updateBadges();

    // Ensure active tab content visibility is in sync
    document.querySelectorAll('#view-market .tab-content[data-tab-content]').forEach(el => {
      const isTarget = el.dataset.tabContent === this.currentMarketTab;
      el.style.display = isTarget ? '' : 'none';
    });

    // Toggle search controls bar visibility
    const searchBar = document.getElementById('market-controls-container') || document.getElementById('market-search-bar-container');
    if (searchBar) {
      if (['reksadana', 'commodity', 'portfolio', 'news'].includes(this.currentMarketTab)) {
        searchBar.style.display = 'none';
      } else {
        searchBar.style.display = 'flex';
      }
    }

    const allStocks = stockMarket.getAllStocks() || [];
    const allCryptos = cryptoMarket.getAllCryptos() || [];

    // Render Sector Pills for active tab
    if (this.currentMarketTab === 'stocks') {
      stockCryptoSubView.renderSectorPills(allStocks, 'stock');
    } else if (this.currentMarketTab === 'crypto') {
      stockCryptoSubView.renderSectorPills(allCryptos, 'crypto');
    }

    // 1. Stocks Tab
    const stocksList = document.getElementById('market-stocks-list');
    let displayedStocksCount = 0;
    if (stocksList && this.currentMarketTab === 'stocks') {
      displayedStocksCount = stockCryptoSubView.renderStocksList(stocksList, allStocks);
      stockCryptoSubView.updateFilterSummary(allStocks.length, displayedStocksCount, 'stocks');
    }

    // 2. Crypto Tab
    const cryptoList = document.getElementById('market-crypto-list');
    let displayedCryptoCount = 0;
    if (cryptoList && this.currentMarketTab === 'crypto') {
      displayedCryptoCount = stockCryptoSubView.renderCryptoList(cryptoList, allCryptos);
      stockCryptoSubView.updateFilterSummary(allCryptos.length, displayedCryptoCount, 'crypto');
    }

    // 3. Commodity Tab
    const commodityList = document.getElementById('market-commodity-list');
    if (commodityList && this.currentMarketTab === 'commodity') {
      commoditySubView.render(commodityList);
    }

    // 4. Reksa Dana & ETF Tab
    const reksadanaList = document.getElementById('market-reksadana-list');
    if (reksadanaList && this.currentMarketTab === 'reksadana') {
      mutualFundsSubView.render(reksadanaList);
    }

    // 5. News Tab (inside Market View)
    const newsList = document.getElementById('market-news-list');
    if (newsList && this.currentMarketTab === 'news') {
      marketNewsSubView.render(newsList);
    }

    // 6. Portfolio Tab (fallback if kept)
    const portfolioList = document.getElementById('market-portfolio-list');
    if (portfolioList && this.currentMarketTab === 'portfolio') {
      marketPortfolioSubView.render(portfolioList);
    }
  }

  updateOrdersList() {
    const ordersEl = document.getElementById('market-orders-list');
    if (!ordersEl) return;

    const stockOrders = stockMarket.getPendingOrders();
    const cryptoOrders = cryptoMarket.getPendingOrders();
    const allOrders = [...stockOrders, ...cryptoOrders];

    if (allOrders.length) {
      ordersEl.innerHTML = allOrders.map(o => `
        <div class="card" style="background: var(--bg-tertiary); margin-bottom: var(--space-sm); padding: var(--space-md);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span class="badge ${o.type.includes('BUY') ? 'badge-success' : 'badge-danger'}">
                ${o.type}
              </span>
              <div style="font-weight: 600; margin-top: 4px;">${o.symbol}</div>
              <div style="font-size: 11px; color: var(--text-muted);">
                ${o.shares ? `${o.shares} lot` : `$ ${financeManager.formatCurrency(o.amountIDR || 0, true)}`}
              </div>
            </div>
            <button class="btn btn-sm btn-danger cancel-order-btn" data-order-id="${o.id}" data-type="${o.shares ? 'stock' : 'crypto'}">
              Cancel
            </button>
          </div>
        </div>
      `).join('');

      ordersEl.querySelectorAll('.cancel-order-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.orderId;
          const type = btn.dataset.type;
          if (type === 'stock') stockMarket.cancelOrder(id);
          else cryptoMarket.cancelOrder(id);
          this.updateOrdersList();
        });
      });
    } else {
      ordersEl.innerHTML = `
        <div class="empty-state" style="padding: 2rem; text-align: center; color: var(--text-muted);">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">Tidak ada antrian order pending</div>
        </div>
      `;
    }
  }
}

export const marketCoordinator = new MarketCoordinator();
export default marketCoordinator;
