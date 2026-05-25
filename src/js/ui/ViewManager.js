/**
 * ViewManager.js - Handle view navigation and content (v2)
 * Removed: pie chart canvas. Added: slide transitions, text-based distribution.
 */

import stockMarket from '../finance/StockMarket.js';
import cryptoMarket from '../finance/CryptoMarket.js';
import financeManager from '../finance/FinanceManager.js';
import gameState from '../game/GameState.js';
import ui from './UIManager.js';
import tradingPage from './TradingPage.js';
import { swipeTransition } from './Animations.js';
import { businessPage } from './BusinessPage.js';
import propertyManager from '../property/PropertyManager.js';

class ViewManager {
  constructor() {
    this.currentView = 'home';
    this.homeSections = [
      'view-home',
      'balance-card',
      'market-pulse-widget',
      'earn-panel',
      'company-dashboard',
      '.quick-actions',
      'footer-dashboard-grid'
    ];
    this.marketFilter = '';
    this.marketSort = { key: 'name', dir: 'asc' };
    this.currentMarketTab = 'stocks';
  }

  init() {
    this.bindNavigation();
    this.bindMarketTabs();
    this.bindMarketSmartControls();
    this.bindPortfolioTabs();

    // Bind dynamic back button
    const backBtn = document.getElementById('btn-dynamic-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.switchView('home'));
    }

    // Restore home view context when popups/modals close
    document.addEventListener('modalClosed', () => {
      const modalViews = ['savings', 'loan', 'property', 'tax', 'finance', 'guide', 'trading-signal', 'donate'];
      if (modalViews.includes(this.currentView)) {
        this.switchView('home');
      }
    });

    // Listen for updates
    gameState.on('stocksUpdate', () => this.updateMarketView());
    gameState.on('cryptoUpdate', () => this.updateMarketView());
    gameState.on('stockBuy', () => this.updatePortfolioView());
    gameState.on('stockSell', () => this.updatePortfolioView());
    gameState.on('cryptoBuy', () => this.updatePortfolioView());
    gameState.on('cryptoSell', () => this.updatePortfolioView());
    gameState.on('propertyUpdate', () => this.updatePortfolioView());
  }

  bindNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });
  }

  showDynamicView(title, subtitle, contentHTML) {
    const titleEl = document.getElementById('dynamic-view-title');
    const subEl = document.getElementById('dynamic-view-subtitle');
    const contentEl = document.getElementById('dynamic-view-content');

    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = subtitle;
    if (contentEl) contentEl.innerHTML = contentHTML;

    this.switchView('dynamic');
  }

  switchView(view) {
    if (this.currentView === view && view !== 'dynamic') return;

    // Close trading terminal if switching to another view
    if (typeof tradingPage !== 'undefined' && tradingPage.close) {
      tradingPage.close();
    }

    // Close business page if switching to another view
    if (businessPage && businessPage.isOpen) {
      businessPage.close();
    }

    const prevView = this.currentView;

    // Update nav active state (sidebar + bottom nav)
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    document.querySelectorAll('.sidebar-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Hide home sections for non-home views
    this.homeSections.forEach(sel => {
      const el = document.querySelector(sel) || document.getElementById(sel);
      if (el) el.style.display = view === 'home' ? '' : 'none';
    });

    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.style.display = 'none';
    });

    const targetPanel = view === 'home' ? null : document.getElementById(`view-${view}`);
    
    if (targetPanel) {
      this.currentView = view;
      swipeTransition(null, targetPanel, 'right');
      this.loadViewContent(view);
    } else if (view === 'home') {
      this.currentView = 'home';
      // Home sections are already shown by the loop above
    } else {
      // It's a special panel view (hybrid)
      this.currentView = view;
      this.loadViewContent(view);
    }
  }

  loadViewContent(view) {
    switch (view) {
      case 'market':
        this.updateMarketView();
        break;
      case 'portfolio':
        this.updatePortfolioView();
        break;
      case 'history':
        this.updateHistoryView();
        break;
      case 'trading-signal':
        import('./panels/TradingSignalPanel.js').then(module => {
          module.default.show();
        });
        break;
      case 'business':
        import('./BusinessPage.js').then(module => {
          module.default.open();
        });
        break;
      case 'loan':
        import('./panels/LoanPanel.js').then(module => {
          module.default.show();
        });
        break;
      case 'savings':
        import('./panels/SavingsPanel.js').then(module => {
          module.default.show();
        });
        break;
      case 'property':
        import('./panels/PropertyPanel.js').then(module => {
          module.default.show();
        });
        break;
      case 'tax':
        import('./panels/TaxPanel.js').then(module => {
          module.default.show();
        });
        break;
      case 'finance':
        import('./panels/FinancePanel.js').then(module => {
          module.default.show();
        });
        break;
      case 'donate':
        import('./HomeScreen.js').then(module => {
          module.default.handleDonate();
        });
        break;
      case 'guide':
        import('./HomeScreen.js').then(module => {
          module.default.showGuide();
        });
        break;
    }
  }

  // ========================================
  // MARKET VIEW
  // ========================================

  bindMarketTabs() {
    document.querySelectorAll('[data-market-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-market-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tab = btn.dataset.marketTab;
        this.currentMarketTab = tab;
        document.getElementById('market-stocks-list').style.display = tab === 'stocks' ? 'block' : 'none';
        document.getElementById('market-crypto-list').style.display = tab === 'crypto' ? 'block' : 'none';
        const ordersEl = document.getElementById('market-orders-list');
        if (ordersEl) ordersEl.style.display = tab === 'orders' ? 'block' : 'none';

        if (tab === 'orders') this.updateOrdersList();
        else this.updateMarketView(); // Refresh list on tab change
      });
    });
  }

  bindMarketSmartControls() {
    const searchInput = document.getElementById('market-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.marketFilter = e.target.value.toLowerCase();
        this.updateMarketView();
      });
    }

    document.querySelectorAll('.btn-sort').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.sort;
        if (key === 'default') {
          this.marketSort = { key: 'default', dir: 'asc' };
        } else if (this.marketSort.key === key) {
          this.marketSort.dir = this.marketSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          this.marketSort.key = key;
          this.marketSort.dir = key === 'name' ? 'asc' : 'desc';
        }

        document.querySelectorAll('.btn-sort').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updateMarketView();
      });
    });
  }

  updateMarketView() {
    if (this.currentView !== 'market') return;

    // Update stocks list
    const stocksList = document.getElementById('market-stocks-list');
    if (stocksList && this.currentMarketTab === 'stocks') {
      let stocks = stockMarket.getAllStocks();
      
      // Apply Filter
      if (this.marketFilter) {
        stocks = stocks.filter(s => 
          s.symbol.toLowerCase().includes(this.marketFilter) || 
          s.name.toLowerCase().includes(this.marketFilter)
        );
      }

      // Apply Sort
      if (this.marketSort.key !== 'default') {
        stocks.sort((a, b) => {
          let valA = a[this.marketSort.key] || 0;
          let valB = b[this.marketSort.key] || 0;
          if (this.marketSort.key === 'name') {
            valA = a.symbol; valB = b.symbol;
          }
          const factor = this.marketSort.dir === 'asc' ? 1 : -1;
          return valA > valB ? factor : (valA < valB ? -factor : 0);
        });
      }

      stocksList.innerHTML = stocks.map(s => `
        <div class="asset-item" data-symbol="${s.symbol}" data-type="stock">
          <div class="asset-icon">${stockMarket.getStockIcon(s.sector)}</div>
          <div class="asset-info">
            <div class="asset-name">${s.symbol}</div>
            <div class="asset-symbol">${s.name}</div>
          </div>
          <div class="asset-price">
            <div class="asset-current">$ ${financeManager.formatCurrency(s.price)}</div>
            <div class="asset-change ${(s.change || 0) >= 0 ? 'positive' : 'negative'}">
              ${(s.change || 0) >= 0 ? '▲' : '▼'} ${Math.abs(s.change || 0).toFixed(2)}%
            </div>
          </div>
        </div>
      `).join('');

      // Bind clicks
      stocksList.querySelectorAll('.asset-item').forEach(el => {
        el.addEventListener('click', () => {
          tradingPage.open(el.dataset.symbol, 'stock');
        });
      });
    }

    // Update crypto list
    const cryptoList = document.getElementById('market-crypto-list');
    if (cryptoList && this.currentMarketTab === 'crypto') {
      let cryptos = cryptoMarket.getAllCryptos();

      // Apply Filter
      if (this.marketFilter) {
        cryptos = cryptos.filter(c => 
          c.symbol.toLowerCase().includes(this.marketFilter) || 
          c.name.toLowerCase().includes(this.marketFilter)
        );
      }

      // Apply Sort
      if (this.marketSort.key !== 'default') {
        cryptos.sort((a, b) => {
          let valA = a[this.marketSort.key] || 0;
          let valB = b[this.marketSort.key] || 0;
          if (this.marketSort.key === 'name') {
            valA = a.symbol; valB = b.symbol;
          }
          const factor = this.marketSort.dir === 'asc' ? 1 : -1;
          return valA > valB ? factor : (valA < valB ? -factor : 0);
        });
      }

      cryptoList.innerHTML = cryptos.map(c => `
        <div class="asset-item" data-symbol="${c.symbol}" data-type="crypto">
          <div class="asset-icon" style="font-size: 1.5rem;">${c.icon}</div>
          <div class="asset-info">
            <div class="asset-name">${c.symbol}</div>
            <div class="asset-symbol">${c.name}</div>
          </div>
          <div class="asset-price">
            <div class="asset-current">${cryptoMarket.formatPrice(c.price)}</div>
            <div class="asset-change ${(c.change || 0) >= 0 ? 'positive' : 'negative'}">
              ${(c.change || 0) >= 0 ? '🚀' : '📉'} ${Math.abs(c.change || 0).toFixed(2)}%
            </div>
          </div>
        </div>
      `).join('');

      cryptoList.querySelectorAll('.asset-item').forEach(el => {
        el.addEventListener('click', () => {
          tradingPage.open(el.dataset.symbol, 'crypto');
        });
      });
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

      // Bind cancel buttons
      ordersEl.querySelectorAll('.cancel-order-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const orderId = parseFloat(btn.dataset.orderId);
          const type = btn.dataset.type;
          try {
            if (type === 'stock') stockMarket.cancelLimitOrder(orderId);
            else cryptoMarket.cancelLimitOrder(orderId);
            ui.success('Order dibatalkan');
            this.updateOrdersList();
          } catch (e) {
            ui.error(e.message);
          }
        });
      });
    } else {
      ordersEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">Tidak ada pending orders</div></div>';
    }
  }

  // ========================================
  // PORTFOLIO VIEW - REDESIGNED
  // ========================================

  bindPortfolioTabs() {
    document.querySelectorAll('[data-portfolio-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-portfolio-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tab = btn.dataset.portfolioTab;
        document.getElementById('portfolio-stocks').style.display = tab === 'stocks' ? 'block' : 'none';
        document.getElementById('portfolio-crypto').style.display = tab === 'crypto' ? 'block' : 'none';
        document.getElementById('portfolio-property').style.display = tab === 'property' ? 'block' : 'none';
      });
    });
  }

  updatePortfolioView() {
    if (this.currentView !== 'portfolio') return;

    const balance = gameState.getBalance();
    const stockPortfolio = stockMarket.getPortfolio();
    const cryptoWallet = cryptoMarket.getWallet();
    const totalStockValue = stockMarket.getPortfolioValue();
    const totalCryptoValue = cryptoMarket.getWalletValue();
    const totalPropertyValue = propertyManager.getTotalPropertyValue();
    const ownedProperties = propertyManager.getOwnedProperties();

    // Get debt info
    const loans = gameState.get('loans') || [];
    const totalDebt = loans.reduce((sum, loan) => sum + (loan.remaining || 0), 0);

    // Calculate true net worth: Assets - Liabilities
    const totalAssets = balance + totalStockValue + totalCryptoValue + totalPropertyValue;
    const totalNetWorth = totalAssets - totalDebt;

    const planTarget = 1000000000;
    const planProgress = Math.min(100, Math.max(0, (totalNetWorth / planTarget) * 100));
    const progressFill = document.getElementById('plan-progress-fill');
    const progressText = document.getElementById('plan-progress-text');
    if (progressFill) progressFill.style.width = planProgress.toFixed(1) + '%';
    if (progressText) progressText.textContent = planProgress.toFixed(1) + '%';

    // Wealth Summary
    const summaryEl = document.getElementById('portfolio-wealth-summary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="wealth-card">
          <div class="wealth-total">
            <div class="wealth-label">Net Worth (Kekayaan Bersih)</div>
            <div class="wealth-value ${totalNetWorth >= 0 ? '' : 'negative'}">$ ${financeManager.formatCurrency(totalNetWorth)}</div>
          </div>
          
          <div class="wealth-section">
            <div class="wealth-section-title">💰 Aset</div>
            <div class="wealth-breakdown">
              <div class="wealth-item">
                <span class="wealth-dot cash"></span>
                <span>Cash</span>
                <span class="wealth-amount">$ ${financeManager.formatCurrency(balance, true)}</span>
              </div>
              <div class="wealth-item">
                <span class="wealth-dot stocks"></span>
                <span>Saham</span>
                <span class="wealth-amount">$ ${financeManager.formatCurrency(totalStockValue, true)}</span>
              </div>
              <div class="wealth-item">
                <span class="wealth-dot crypto"></span>
                <span>Crypto</span>
                <span class="wealth-amount">$ ${financeManager.formatCurrency(totalCryptoValue, true)}</span>
              </div>
              <div class="wealth-item">
                <span class="wealth-dot property" style="background: #f59e0b;"></span>
                <span>Properti</span>
                <span class="wealth-amount">$ ${financeManager.formatCurrency(totalPropertyValue, true)}</span>
              </div>
              <div class="wealth-item total">
                <span></span>
                <span><strong>Total Aset</strong></span>
                <span class="wealth-amount"><strong>$ ${financeManager.formatCurrency(totalAssets, true)}</strong></span>
              </div>
            </div>
          </div>
          
          ${totalDebt > 0 ? `
            <div class="wealth-section debt">
              <div class="wealth-section-title">💳 Hutang</div>
              <div class="wealth-breakdown">
                <div class="wealth-item">
                  <span class="wealth-dot debt"></span>
                  <span>Pinjaman (${loans.length} aktif)</span>
                  <span class="wealth-amount negative">-$ ${financeManager.formatCurrency(totalDebt, true)}</span>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }

    // Wealth Distribution Table (replaces pie chart)
    this.renderWealthDistributionTable(balance, totalStockValue, totalCryptoValue, totalPropertyValue);

    // Stocks portfolio
    const stocksEl = document.getElementById('portfolio-stocks');
    if (stocksEl) {
      if (stockPortfolio.length) {
        stocksEl.innerHTML = stockPortfolio.map(h => `
          <div class="asset-item" data-symbol="${h.symbol}" data-type="stock">
            <div class="asset-icon">📊</div>
            <div class="asset-info">
              <div class="asset-name">${h.symbol}</div>
              <div class="asset-symbol">${h.shares} lot @ $ ${financeManager.formatCurrency(h.avgBuyPrice, true)}</div>
            </div>
            <div class="asset-price">
              <div class="asset-current">$ ${financeManager.formatCurrency(h.currentValue, true)}</div>
              <div class="asset-change ${h.profit >= 0 ? 'positive' : 'negative'}">
                ${h.profit >= 0 ? '+' : ''}${(h.profitPercent || 0).toFixed(2)}%
              </div>
            </div>
          </div>
        `).join('');
      } else {
        stocksEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">Belum ada saham</div></div>';
      }
    }

    // Crypto wallet
    const cryptoEl = document.getElementById('portfolio-crypto');
    if (cryptoEl) {
      if (cryptoWallet.length) {
        cryptoEl.innerHTML = cryptoWallet.map(h => `
          <div class="asset-item" data-symbol="${h.symbol}" data-type="crypto">
            <div class="asset-icon" style="font-size: 1.5rem;">${h.icon}</div>
            <div class="asset-info">
              <div class="asset-name">${h.symbol}</div>
              <div class="asset-symbol">${cryptoMarket.formatAmount(h.amount)} ${h.symbol}</div>
            </div>
            <div class="asset-price">
              <div class="asset-current">$ ${financeManager.formatCurrency(h.currentValue, true)}</div>
              <div class="asset-change ${h.profit >= 0 ? 'positive' : 'negative'}">
                ${h.profit >= 0 ? '+' : ''}${(h.profitPercent || 0).toFixed(2)}%
              </div>
            </div>
          </div>
        `).join('');
      } else {
        cryptoEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🪙</div><div class="empty-state-text">Wallet kosong</div></div>';
      }
    }

    // Property portfolio
    const propertyEl = document.getElementById('portfolio-property');
    if (propertyEl) {
      if (ownedProperties.length) {
        propertyEl.innerHTML = ownedProperties.map(h => `
          <div class="asset-item" data-id="${h.id}" data-type="property" style="cursor: default; display: grid; grid-template-columns: 40px 1fr auto auto; align-items: center; gap: 0.75rem;">
            <div class="asset-icon" style="font-size: 1.5rem;">${h.icon}</div>
            <div class="asset-info" style="min-width: 0;">
              <div class="asset-name" style="font-weight: 800; font-size: 0.9rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${h.name}</div>
              <div class="asset-symbol" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Nilai Beli: $ ${financeManager.formatCurrency(h.price, true)}</div>
            </div>
            <div class="asset-price" style="text-align: right; margin-right: 1.25rem;">
              <div class="asset-current" style="color: var(--accent-primary); font-weight: 700; font-size: 0.9rem;">+$ ${financeManager.formatCurrency(h.monthlyRent, true)}/bln</div>
              <div class="asset-change positive" style="font-size: 0.7rem; font-weight: 600; margin-top: 2px;">Passive Yield</div>
            </div>
            <button class="btn btn-sm btn-sell-portfolio-prop" data-sell="${h.id}" style="background: linear-gradient(135deg, #ef4444, #dc2626); border: none; color: #fff; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.2); height: fit-content;">
              JUAL
            </button>
          </div>
        `).join('');

        // Bind sell buttons
        propertyEl.querySelectorAll('.btn-sell-portfolio-prop').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const propertyId = parseInt(btn.dataset.sell);
            const { propertyPanel } = await import('./panels/PropertyPanel.js');
            await propertyPanel.handleSell(propertyId);
            this.updatePortfolioView();
          });
        });
      } else {
        propertyEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏘️</div><div class="empty-state-text">Belum ada aset properti</div></div>';
      }
    }

    // Wealth Sources
    this.renderWealthSources();
  }

  renderWealthDistributionTable(cash, stocks, crypto, property) {
    const container = document.getElementById('wealth-distribution-table');
    if (!container) return;

    const total = cash + stocks + crypto + property;
    if (total === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div>Belum ada aset</div></div>';
      return;
    }

    const rows = [
      { label: 'Cash', icon: '💵', value: cash, color: '#6366f1' },
      { label: 'Saham', icon: '📈', value: stocks, color: '#10b981' },
      { label: 'Kripto', icon: '🪙', value: crypto, color: '#a855f7' },
      { label: 'Properti', icon: '🏢', value: property, color: '#f59e0b' }
    ];

    container.innerHTML = rows.map(row => {
      const pct = total > 0 ? ((row.value / total) * 100).toFixed(1) : '0.0';
      return `
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
          <span style="font-size:1.1rem;">${row.icon}</span>
          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
              <span style="font-size:0.85rem;font-weight:600;color:var(--text-main);">${row.label}</span>
              <span style="font-size:0.85rem;font-weight:700;color:${row.color};">${pct}%</span>
            </div>
            <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:99px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${row.color};border-radius:99px;"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderWealthSources() {
    const sourcesEl = document.getElementById('wealth-sources');
    if (!sourcesEl) return;

    const workState = gameState.get('work');
    const jobName = (workState && workState.careerPath)
      ? workTaskManager.getCareerLevelData().title
      : 'Tidak bekerja';
    const transactions = financeManager.getRecentTransactions(100);

    // Calculate income from different sources
    const tradingProfit = transactions
      .filter(t => t.category === 'Stock Sell' || t.category === 'Crypto Sell')
      .reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0);

    const salary = transactions
      .filter(t => t.category === 'Gaji')
      .reduce((sum, t) => sum + t.amount, 0);

    const topup = transactions
      .filter(t => t.category === 'Top Up')
      .reduce((sum, t) => sum + t.amount, 0);

    sourcesEl.innerHTML = `
      <div class="source-item">
        <div class="source-icon">💼</div>
        <div class="source-info">
          <div class="source-name">Gaji (${jobName})</div>
          <div class="source-desc">Pendapatan bulanan</div>
        </div>
        <div class="source-amount positive">+$ ${financeManager.formatCurrency(salary, true)}</div>
      </div>
      <div class="source-item">
        <div class="source-icon">📈</div>
        <div class="source-info">
          <div class="source-name">Trading Profit</div>
          <div class="source-desc">Keuntungan jual beli</div>
        </div>
        <div class="source-amount ${tradingProfit >= 0 ? 'positive' : 'negative'}">
          ${tradingProfit >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(tradingProfit, true)}
        </div>
      </div>
      <div class="source-item">
        <div class="source-icon">💰</div>
        <div class="source-info">
          <div class="source-name">Top Up</div>
          <div class="source-desc">Modal yang ditambahkan</div>
        </div>
        <div class="source-amount positive">+$ ${financeManager.formatCurrency(topup, true)}</div>
      </div>
    `;
  }

  // ========================================
  // HISTORY VIEW
  // ========================================

  updateHistoryView() {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;

    const transactions = financeManager.getRecentTransactions(50);

    if (transactions.length) {
      listEl.innerHTML = transactions.map(t => `
        <div class="transaction-item">
          <div class="transaction-icon">${financeManager.getTransactionIcon(t.category)}</div>
          <div class="transaction-info">
            <div class="transaction-title">${t.description || t.category}</div>
            <div class="transaction-meta">
              ${t.gameTime?.day || '-'}/${t.gameTime?.month || '-'}/${t.gameTime?.year || '-'}
            </div>
          </div>
          <div class="transaction-amount ${t.amount >= 0 ? 'positive' : 'negative'}">
            ${t.amount >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(Math.abs(t.amount), true)}
          </div>
        </div>
      `).join('');
    } else {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">Belum Ada Transaksi</div>
          <div class="empty-state-text">Riwayat transaksi akan muncul di sini</div>
        </div>
      `;
    }
  }
}

export const viewManager = new ViewManager();
export default viewManager;
