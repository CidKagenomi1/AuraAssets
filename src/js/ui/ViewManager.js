/**
 * ViewManager.js - Handle view navigation and content (v2)
 * Removed: pie chart canvas. Added: slide transitions, text-based distribution.
 */

import stockMarket from '../trading/StockMarket.js';
import cryptoMarket from '../trading/CryptoMarket.js';
import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from './UIManager.js';
import tradingPage from '../trading/TradingPage.js';
import { swipeTransition, staggerFadeUp } from './Animations.js';
import { businessPage } from '../business/BusinessPage.js';
import propertyManager from '../property/PropertyManager.js';
import roleManager from '../core/RoleManager.js';
import passiveIncomeManager from '../trading/PassiveIncomeManager.js';

// ===== WARNA PER SEKTOR =====
const SECTOR_COLORS = {
    'Technology':            '#378ADD',
    'Financial Services':    '#1D9E75',
    'Healthcare':            '#D85A30',
    'Consumer Cyclical':     '#BA7517',
    'Consumer Defensive':    '#7F77DD',
    'Energy':                '#EF9F27',
    'Industrials':           '#5DCAA5',
    'Communication Services':'#D4537E',
    'Real Estate':           '#97C459',
    'Utilities':             '#AFA9EC',
};

// ===== RENDER BARIS SAHAM =====
function buildStockRow(stock) {
    const up = stock.change >= 0;
    const color = SECTOR_COLORS[stock.sector] || '#888888';
    const changeText = `${up ? '+' : ''}${stock.change.toFixed(2)}%`;
    const priceText = `$${stock.price.toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    })}`;

    return `
      <div class="market-row" onclick="openStockDetail('${stock.symbol}')">
        <span class="sector-dot" style="background:${color}"></span>
        <span class="market-symbol">${stock.symbol}</span>
        <span class="market-name">${stock.name}</span>
        <span class="market-price">${priceText}</span>
        <span class="market-change ${up ? 'up' : 'down'}">${changeText}</span>
      </div>`;
}

// ===== RENDER BARIS KRIPTO =====
function buildCryptoRow(crypto) {
    const up = crypto.change >= 0;
    const changeText = `${up ? '+' : ''}${crypto.change.toFixed(2)}%`;

    let priceText;
    if (crypto.price >= 1000)       priceText = `$${Math.round(crypto.price).toLocaleString()}`;
    else if (crypto.price >= 1)     priceText = `$${crypto.price.toFixed(2)}`;
    else                            priceText = `$${crypto.price.toFixed(6)}`;

    return `
      <div class="market-row" onclick="openCryptoDetail('${crypto.symbol}')">
        <span style="font-size:17px;min-width:24px;text-align:center">${crypto.icon}</span>
        <span class="market-symbol">${crypto.symbol}</span>
        <span class="market-name">${crypto.name}</span>
        <span class="market-price">${priceText}</span>
        <span class="market-change ${up ? 'up' : 'down'}">${changeText}</span>
      </div>`;
}

// Bind to window for onclick handlers
window.openStockDetail = (symbol) => {
    tradingPage.open(symbol, 'stock');
};
window.openCryptoDetail = (symbol) => {
    tradingPage.open(symbol, 'crypto');
};

class ViewManager {
  constructor() {
    this.currentView = 'home';
    // BUG-08 FIX: Standardize to CSS selectors throughout (# for IDs, . for classes)
    this.homeSections = [
      '#balance-card',
      '#market-pulse-widget',
      '#earn-panel',
      '#company-dashboard',
      '.quick-actions',
      '#footer-dashboard-grid'
    ];
    this.marketFilter = '';
    this.marketSort = { key: 'default', dir: 'asc' };
    this.currentMarketTab = 'stocks';
    this.activeDynamicTab = 'cashflow';
  }

  init() {
    this.bindNavigation();
    this.bindMarketTabs();
    this.bindMarketSmartControls();

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

    // Initialize mobile bottom nav
    this.updateMobileBottomNav(this.currentView);

    // Listen for updates
    gameState.on('stocksUpdate', () => this.updateMarketView());
    gameState.on('cryptoUpdate', () => this.updateMarketView());
    document.addEventListener('passiveIncomeTick', () => {
      if (this.currentView === 'market') {
        // Passive income changed — allow staking/bot panels to re-render with fresh data
        if (this.currentMarketTab === 'staking-mining') this._renderStakingMining = true;
        if (this.currentMarketTab === 'bot-trading') this._renderBotTrading = true;
        this.updateMarketView();
      }
    });
    gameState.on('roleChange', () => {
      this.updateMobileBottomNav(this.currentView);
    });
    // BUG-10 FIX: Refresh earn widget immediately after claim (don't wait for next earnTick)
    gameState.on('earnClaim', () => {
      import('../career/RoleModules.js').then(m => m.default.BusinessModule.updateEarnUI({ pendingEarn: 0 }));
    });
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

  updateActiveNavigationHighlights(view) {
    const viewToHighlight = view || this.currentView;
    let highlightedView = viewToHighlight;
    if (viewToHighlight === 'dynamic') {
      highlightedView = this.activeDynamicTab === 'portfolio' ? 'portfolio' : 'home';
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === highlightedView);
    });
    document.querySelectorAll('.sidebar-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === highlightedView);
    });

    this.updateMobileBottomNav(highlightedView);
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
    try {
      import('./AuraSound.js').then(m => m.default.playClick());
    } catch(e){}

    // Update active navigation highlights
    this.updateActiveNavigationHighlights(view);

    // Hide home sections for non-home views
    // BUG-08 FIX: All entries in homeSections are now valid CSS selectors
    this.homeSections.forEach(sel => {
      const el = document.querySelector(sel);
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

      // Fluid staggered entry for cards inside target view
      const cards = targetPanel.querySelectorAll('.card, .planning-card, .menu-card, .market-row, .asset-item, .transaction-item, .wealth-card');
      if (cards.length > 0) {
        staggerFadeUp(cards, 40);
      }
    } else if (view === 'home') {
      this.currentView = 'home';
      // Home sections are already shown by the loop above
      // Fluid staggered entry for cards/widgets on home screen
      const homeCards = document.querySelectorAll('#view-home .card, #view-home .menu-card, #view-home .hero-balance-card, #view-home .earn-widget, #view-home #market-pulse-widget');
      if (homeCards.length > 0) {
        staggerFadeUp(homeCards, 40);
      }
    } else {
      // It's a special panel view (hybrid)
      this.currentView = view;
      this.loadViewContent(view);
    }
  }

  loadViewContent(view) {
    switch (view) {
      case 'gambling':
        import('../gambling/GamblingPanel.js').then(module => {
          module.default.show();
        });
        break;
      case 'marketplace':
        import('../marketplace/panels/MarketplacePanel.js').then(module => {
          module.default.show();
        });
        break;
      case 'market':
        this.updateMarketView();
        break;
      case 'portfolio':
        import('../finance/panels/FinancePanel.js').then(module => {
          module.default.show('portfolio');
        });
        break;
      case 'history':
        this.updateHistoryView();
        break;
      case 'trading-signal':
        import('../trading/panels/TradingSignalPanel.js').then(module => {
          module.default.show();
        });
        break;
      case 'business':
        import('../business/BusinessPage.js').then(module => {
          module.default.open();
        });
        break;
      case 'loan':
        import('../finance/panels/LoanPanel.js').then(module => {
          module.default.show();
        });
        break;
      case 'savings':
        import('../finance/panels/SavingsPanel.js').then(module => {
          module.default.show();
        });
        break;
      case 'property':
        import('../property/panels/PropertyPanel.js').then(module => {
          module.default.show();
        });
        break;
      case 'tax':
        import('../finance/panels/TaxPanel.js').then(module => {
          module.default.show();
        });
        break;
      case 'finance':
        import('../finance/panels/FinancePanel.js').then(module => {
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
    const buttons = document.querySelectorAll('.tab-btn[data-tab]');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        // update active button
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // update visible content
        document.querySelectorAll('.tab-content').forEach(el => {
          el.style.display = el.dataset.tabContent === tabId ? 'block' : 'none';
        });

        this.currentMarketTab = tabId;

        // Set render flag for heavy panels so they render ONCE on tab open
        // — not on every stock/crypto price update event
        if (tabId === 'staking-mining') {
          this._renderStakingMining = true;
        } else if (tabId === 'bot-trading') {
          this._renderBotTrading = true;
        }

        this.updateMarketView();
      });
    });
  }

  // Stub bind methods — buttons use window.* global onclick handlers, no extra binding needed
  _bindStakingMiningButtons() {}
  _bindBotTradingButtons() {
    const botCapitalInput = document.getElementById('bot-capital-input');
    if (botCapitalInput) {
      ui.setupNumericInput(botCapitalInput, {
        isDecimal: false,
        showZeroAppend: true,
        showMax: true,
        maxAmount: () => gameState.getBalance()
      });
    }
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

  updateMarketView(force = false) {
    // Update badge values dynamically
    const allStocks = stockMarket.getAllStocks() || [];
    const allCryptos = cryptoMarket.getAllCryptos() || [];
    const portfolioCount = (stockMarket.getPortfolio() || []).length + (cryptoMarket.getWallet() || []).length;
    const piState = passiveIncomeManager.getState();
    
    // Staking asset count + mining rig count
    let stakingMiningCount = 0;
    Object.values(piState.rigs).forEach(c => stakingMiningCount += c);
    Object.values(piState.staked).forEach(c => { if (c > 0) stakingMiningCount += 1; });

    const botCount = piState.bots.length;

    const badgeStocks = document.getElementById('badge-stocks');
    const badgeCrypto = document.getElementById('badge-crypto');
    const badgeStakingMining = document.getElementById('badge-staking-mining');
    const badgeBotTrading = document.getElementById('badge-bot-trading');
    const badgePortfolio = document.getElementById('badge-portfolio');

    if (badgeStocks) badgeStocks.textContent = allStocks.length;
    if (badgeCrypto) badgeCrypto.textContent = allCryptos.length;
    if (badgeStakingMining) badgeStakingMining.textContent = stakingMiningCount;
    if (badgeBotTrading) badgeBotTrading.textContent = botCount;
    if (badgePortfolio) badgePortfolio.textContent = portfolioCount;

    // Toggle search controls bar visibility
    const searchBar = document.getElementById('market-search-bar-container');
    if (searchBar) {
      if (this.currentMarketTab === 'staking-mining' || this.currentMarketTab === 'bot-trading') {
        searchBar.style.display = 'none';
      } else {
        searchBar.style.display = 'flex';
      }
    }

    if (this.currentView !== 'market') return;

    // Update stocks list
    const stocksList = document.getElementById('market-stocks-list');
    if (stocksList && this.currentMarketTab === 'stocks') {
      let stocks = [...allStocks];
      
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

      stocksList.innerHTML = stocks.map(s => buildStockRow(s)).join('');
    }

    // Update crypto list
    const cryptoList = document.getElementById('market-crypto-list');
    if (cryptoList && this.currentMarketTab === 'crypto') {
      let cryptos = [...allCryptos];

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

      cryptoList.innerHTML = cryptos.map(c => buildCryptoRow(c)).join('');
    }

    // Update Staking & Mining — ONLY re-render on passiveIncomeTick or explicit call,
    // NOT on every stocksUpdate/cryptoUpdate to prevent continuous DOM replacement
    const stakingMiningPanel = document.getElementById('market-staking-mining');
    if (stakingMiningPanel && this.currentMarketTab === 'staking-mining' && this._renderStakingMining) {
      const activeEl = document.activeElement;
      const isTyping = activeEl && stakingMiningPanel.contains(activeEl) && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT');
      if (force || !isTyping) {
        stakingMiningPanel.innerHTML = this.renderStakingMiningView();
        this._bindStakingMiningButtons();
        this._renderStakingMining = false;
      }
    }

    // Update Bot Trading — same: only on demand
    const botTradingPanel = document.getElementById('market-bot-trading');
    if (botTradingPanel && this.currentMarketTab === 'bot-trading' && this._renderBotTrading) {
      const activeEl = document.activeElement;
      const isTyping = activeEl && botTradingPanel.contains(activeEl) && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT');
      if (force || !isTyping) {
        botTradingPanel.innerHTML = this.renderBotTradingView();
        this._bindBotTradingButtons();
        this._renderBotTrading = false;
      }
    }

    // Update portfolio list
    const portfolioList = document.getElementById('market-portfolio-list');
    if (portfolioList && this.currentMarketTab === 'portfolio') {
      const stockPortfolio = stockMarket.getPortfolio() || [];
      const cryptoWallet = cryptoMarket.getWallet() || [];
      
      let html = '';
      
      stockPortfolio.forEach(h => {
        const stock = stockMarket.getStock(h.symbol);
        if (stock) {
          html += buildStockRow(stock);
        }
      });
      
      cryptoWallet.forEach(h => {
        const crypto = cryptoMarket.getCrypto(h.symbol);
        if (crypto) {
          html += buildCryptoRow(crypto);
        }
      });
      
      if (html === '') {
        portfolioList.innerHTML = '<div class="empty-state" style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.4);"><div class="empty-state-icon">💼</div><div class="empty-state-text">Portofolio Anda kosong</div></div>';
      } else {
        portfolioList.innerHTML = html;
      }
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

  updateMobileBottomNav(activeView) {
    const bottomNav = document.querySelector('.app-bottom-nav');
    if (!bottomNav) return;

    // Get current role
    const role = roleManager.getRoleData();
    if (!role) {
      bottomNav.innerHTML = '';
      return;
    }

    // Define all navigation items with SVG icons
    const navItems = {
      home: { id: 'home', label: 'Beranda', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"/></svg>` },
      market: { id: 'market', label: 'Pasar', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/></svg>` },
      portfolio: { id: 'portfolio', label: 'Portofolio', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>` },
      business: { id: 'business', label: 'Bisnis', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>` }
    };

    // Bottom Row (Dominant) Candidates
    const primaryIds = ['home', 'market', 'portfolio', 'business'];
    let bottomItems = primaryIds
      .filter(id => id === 'home' || !role.hiddenNav.includes(id))
      .map(id => navItems[id]);

    // Check if activeView is not in primaryIds (so it's a secondary view like loan/savings/etc.)
    const isSecondaryActive = !primaryIds.includes(activeView);

    // Append "Lainnya" (Menu) button at the end
    bottomItems.push({
      id: 'menu',
      label: 'Lainnya',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zm6-12c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 6c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.68-1.5-1.5-1.5zm6-18c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 6c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5z"/></svg>`
    });

    let html = '';

    // Render Bottom Row - Main / Active Prominent - Icons only
    html += `
      <div class="bottom-nav-tier tier-bottom" style="
        display: grid;
        grid-template-columns: repeat(${bottomItems.length}, 1fr);
        width: 100%;
        height: 52px;
        align-items: center;
        justify-items: center;
        background: rgba(24, 24, 27, 0.95);
        box-sizing: border-box;
      ">
        ${bottomItems.map(item => {
          const isMenu = item.id === 'menu';
          const isActive = isMenu ? isSecondaryActive : (item.id === activeView);
          if (isActive) {
            return `
              <button class="bottom-nav-tier-btn nav-btn active prominent" data-view="${item.id}" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, var(--accent-primary) 0%, #059669 100%);
                border: none;
                color: #000;
                width: 42px;
                height: 42px;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                z-index: 20;
                cursor: pointer;
                transition: all 0.2s ease;
                transform: translateY(-4px);
              ">
                <span style="display: flex; align-items: center; justify-content: center; transform: scale(1.1);">${item.icon}</span>
              </button>
            `;
          } else {
            return `
              <button class="bottom-nav-tier-btn nav-btn" data-view="${item.id}" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                color: var(--text-muted);
                width: 100%;
                height: 100%;
                cursor: pointer;
                transition: all 0.2s ease;
              ">
                <span style="display: flex; align-items: center; justify-content: center;">${item.icon}</span>
              </button>
            `;
          }
        }).join('')}
      </div>
    `;

    bottomNav.innerHTML = html;

    // Bind navigation events
    bottomNav.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view === 'menu') {
          this.showMobileMenu();
        } else {
          this.switchView(view);
        }
      });
    });
  }

  showMobileMenu() {
    const role = roleManager.getRoleData();
    if (!role) return;

    const navItems = {
      property: { id: 'property', label: 'Properti', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"/></svg>` },
      loan: { id: 'loan', label: 'Pinjaman', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z"/></svg>` },
      savings: { id: 'savings', label: 'Deposito', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>` },
      tax: { id: 'tax', label: 'Pajak', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2l-1.5 1.5L6 2l-1.5 1.5L3 2v20z"/></svg>` },
      history: { id: 'history', label: 'Riwayat', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>` },
      donate: { id: 'donate', label: 'Donasi', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4V8h16v11z"/></svg>` },
      guide: { id: 'guide', label: 'Panduan', icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>` },
      marketplace: { id: 'marketplace', label: 'Marketplace', icon: `🛒` },
      settings: { id: 'settings', label: 'Pengaturan', icon: `⚙️` },
      notifications: { id: 'notifications', label: 'Notifikasi', icon: `🔔` }
    };

    const secondaryIds = ['property', 'loan', 'savings', 'tax', 'history', 'marketplace', 'donate', 'guide', 'settings', 'notifications'];
    const activeItems = secondaryIds
      .filter(id => !role.hiddenNav.includes(id))
      .map(id => navItems[id]);

    const content = `
      <div style="padding: 0.25rem 0;">
        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 0.75rem; text-align: center; letter-spacing: 0.05em;">Semua Menu Fitur</div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; justify-items: center;">
          ${activeItems.map(item => `
            <div class="menu-item-mobile-grid" data-menu-id="${item.id}" style="
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 0.2rem;
              cursor: pointer;
              width: 100%;
              padding: 0.4rem 0.2rem;
              border-radius: var(--radius-sm);
              background: rgba(255,255,255,0.01);
              border: 1px solid rgba(255,255,255,0.03);
              text-align: center;
              transition: all 0.2s ease;
            ">
              <div style="font-size: 1.25rem; display: flex; align-items: center; justify-content: center; height: 32px; width: 32px; border-radius: 50%; background: rgba(255,255,255,0.03); color: var(--accent-primary);">${item.icon}</div>
              <div style="font-size: 0.72rem; font-weight: 600; color: var(--text-main); line-height: 1.1;">${item.label}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    ui.showModal({
      title: '⚡ Menu Layanan',
      content,
      onShow: () => {
        document.querySelectorAll('.menu-item-mobile-grid').forEach(el => {
          el.addEventListener('click', () => {
            const id = el.dataset.menuId;
            ui.closeModal();
            if (id === 'settings') {
              import('./HomeScreen.js').then(m => m.default.showSettings());
            } else if (id === 'notifications') {
              import('./HomeScreen.js').then(m => m.default.showNotifications());
            } else {
              this.switchView(id);
            }
          });
        });
      }
    });
  }

  // ===== RENDER STAKING & MINING TABS =====
  renderStakingMiningView() {
    const piState = passiveIncomeManager.getState();
    const balance = gameState.getBalance();

    // Calculate totals
    let totalYieldBTC = 0;
    let totalPowerCost = 0;
    Object.entries(piState.rigs).forEach(([type, count]) => {
      const rig = passiveIncomeManager.rigTypes[type];
      totalYieldBTC += rig.yieldBTC * count;
      totalPowerCost += rig.powerCost * count;
    });

    const btc = cryptoMarket.getCrypto('BTC');
    const btcPrice = btc ? btc.price : 60000;
    const estEarnUSD = totalYieldBTC * btcPrice;

    // Build Rigs HTML
    const rigsHTML = Object.entries(passiveIncomeManager.rigTypes).map(([type, rig]) => {
      const count = piState.rigs[type] || 0;
      return `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 0.75rem;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
              <span style="font-weight: 800; color: white; font-size: 0.95rem;">${rig.name}</span>
              <span style="font-size: 0.8rem; background: var(--accent-primary-soft); color: var(--accent-primary); padding: 2px 8px; border-radius: 99px; font-weight: 700;">${count} Rig</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">
              <div>Harga: <span style="color: white; font-weight:600;">$ ${rig.cost.toLocaleString()}</span></div>
              <div>Hasil: <span style="color: #f59e0b; font-weight:600;">+${(rig.yieldBTC * 105120).toFixed(4)} BTC/th</span></div>
              <div>Listrik: <span style="color: var(--accent-danger); font-weight:600;">$ ${Math.round(rig.powerCost).toLocaleString()}/tick</span></div>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button onclick="buyMiningRig('${type}')" class="btn btn-primary btn-sm" style="flex: 1; font-size: 0.75rem; font-weight:700; height: 32px; justify-content:center;">Beli Rig</button>
            ${count > 0 ? `<button onclick="sellMiningRig('${type}')" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; font-weight:700; height: 32px; justify-content:center; color: var(--accent-danger); border-color: rgba(239,68,68,0.2);">Jual</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Build Staking HTML
    const wallet = gameState.get('crypto') || {};
    const stakingHTML = Object.entries(passiveIncomeManager.stakingAssets).map(([symbol, spec]) => {
      const holding = wallet[symbol];
      const walletAmt = holding ? holding.amount : 0;
      const stakedAmt = piState.staked[symbol] || 0;
      const crypto = cryptoMarket.getCrypto(symbol);
      const coinIcon = crypto ? crypto.icon : '🪙';
      const apyPct = (spec.apy * 100).toFixed(1);

      return `
        <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 200px;">
            <span style="font-size: 1.75rem; width: 32px; text-align:center;">${coinIcon}</span>
            <div>
              <div style="font-weight: 800; color: white;">${spec.name} (${symbol})</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">
                Saldo Wallet: <span style="color: white;">${walletAmt.toFixed(4)}</span> | 
                Staked: <span style="color: var(--accent-primary); font-weight:700;">${stakedAmt.toFixed(4)}</span>
              </div>
            </div>
          </div>
          <div style="text-align: right; display: flex; align-items: center; gap: 1.25rem; margin-left: auto;">
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Est. APY</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: var(--accent-primary); text-align: right;">${apyPct}%</div>
            </div>
            <div style="display: flex; gap: 4px;">
              <button onclick="stakeCryptoPrompt('${symbol}')" class="btn btn-primary btn-sm" style="font-size: 0.7rem; font-weight: 800; padding: 4px 12px; height: 28px; justify-content:center;" ${walletAmt <= 0 ? 'disabled' : ''}>Stake</button>
              ${stakedAmt > 0 ? `<button onclick="unstakeCryptoPrompt('${symbol}')" class="btn btn-secondary btn-sm" style="font-size: 0.7rem; font-weight: 800; padding: 4px 12px; height: 28px; justify-content:center; color: var(--accent-danger); border-color: rgba(239,68,68,0.2);">Unstake</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; animation: fade-up 0.3s ease;">
        <!-- Mining Area -->
        <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 1rem;">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 800; color: white; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">⛏️ Rig Pertambangan Kripto</h3>
              <p style="font-size: 0.8rem; color: var(--text-muted); max-width: 600px;">Beli rig untuk menambang Bitcoin (BTC) secara otomatis setiap tick. Biaya listrik akan dikurangi dari kas Anda.</p>
            </div>
            <div style="text-align: right; background: rgba(0,0,0,0.3); padding: 0.5rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase;">Total Hasil Miner</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #f59e0b;">+${(totalYieldBTC * 105120).toFixed(4)} BTC/tahun</div>
              <div style="font-size: 0.75rem; color: var(--accent-primary); font-weight:600;">≈ $ ${estEarnUSD.toFixed(2)}/tick (Listrik: $ ${totalPowerCost.toFixed(0)})</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem;">
            ${rigsHTML}
          </div>
        </div>

        <!-- Staking Area -->
        <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
          <div style="border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.75rem; margin-bottom: 1rem;">
            <h3 style="font-size: 1.15rem; font-weight: 800; color: white; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">🔒 Vault Staking Kripto</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted);">Kunci aset kripto Anda di Smart Contract Staking untuk mendapatkan hasil bunga (yield) tahunan secara kontinu.</p>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${stakingHTML}
          </div>
        </div>
      </div>
    `;
  }

  // ===== RENDER BOT TRADING TABS =====
  renderBotTradingView() {
    const piState = passiveIncomeManager.getState();
    const balance = gameState.getBalance();

    // Active Bots HTML
    const activeBotsHTML = piState.bots.length === 0 
      ? `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2.5rem 1.5rem; border: 1.5px dashed var(--border-color); border-radius: var(--radius-md); background: rgba(0,0,0,0.15);">
           <span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">🤖</span>
           <div style="font-weight:700; color: white; font-size: 1rem; margin-bottom: 0.25rem;">Tidak Ada Bot yang Berjalan</div>
           <div style="font-size:0.8rem;">Buat dan deploy bot pertama Anda untuk menghasilkan pasif income secara otomatis.</div>
         </div>`
      : piState.bots.map(bot => {
          const up = bot.profit >= 0;
          const color = up ? 'var(--accent-primary)' : 'var(--accent-danger)';
          const changeText = `${up ? '+' : ''}${bot.profitPct.toFixed(2)}%`;
          const assetData = bot.assetType === 'stock' ? stockMarket.getStock(bot.asset) : cryptoMarket.getCrypto(bot.asset);
          const currentPrice = assetData ? assetData.price : bot.entryPrice;

          return `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <div>
                    <div style="font-weight: 800; color: white; font-size: 0.95rem; display: flex; align-items: center; gap: 0.35rem;">
                      🤖 ${bot.asset}
                      <span style="font-size: 0.6rem; padding: 1px 4px; border-radius: 3px; background: rgba(255,255,255,0.08); color: var(--text-muted); font-weight: 600;">${bot.assetType.toUpperCase()}</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${passiveIncomeManager.botStrategies[bot.type].name}</div>
                  </div>
                  <span style="font-size: 0.75rem; background: ${up ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}; color: ${color}; border: 1px solid ${up ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}; padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 700;">
                    ${changeText}
                  </span>
                </div>
                
                <div style="font-size: 0.8rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; background: rgba(0,0,0,0.15); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);">
                  <div>Modal: <span style="color: white; font-weight:600;">$ ${bot.capital.toLocaleString()}</span></div>
                  <div>P/L: <span style="color: ${color}; font-weight:700;">${up ? '+' : ''}$ ${Math.round(bot.profit).toLocaleString()}</span></div>
                  <div>Entry: <span style="color: white;">$ ${bot.entryPrice.toLocaleString()}</span></div>
                  <div>Harga: <span style="color: white;">$ ${currentPrice.toLocaleString()}</span></div>
                </div>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <button onclick="stopTradingBot(${bot.id})" class="btn btn-secondary btn-sm" style="flex: 1; font-size: 0.75rem; font-weight: 800; justify-content: center; height: 32px; color: var(--accent-danger); border-color: rgba(239,68,68,0.2);">
                  Hentikan & Klaim
                </button>
                <button onclick="downloadBotCard(${bot.id}, true)" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; font-weight: 800; justify-content: center; height: 32px; padding: 0 10px; border-color: rgba(255,255,255,0.1);" title="Unduh Kartu Performa">
                  🎴 Unduh
                </button>
              </div>
            </div>
          `;
        }).join('');

    // History Bots HTML
    const historyBotsHTML = (!piState.botHistory || piState.botHistory.length === 0)
      ? `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2.5rem 1.5rem; border: 1.5px dashed var(--border-color); border-radius: var(--radius-md); background: rgba(0,0,0,0.15);">
           <div style="font-size:0.8rem;">Belum ada riwayat perdagangan bot.</div>
         </div>`
      : piState.botHistory.map(bot => {
          const up = bot.profit >= 0;
          const color = up ? 'var(--accent-primary)' : 'var(--accent-danger)';
          const changeText = `${up ? '+' : ''}${bot.profitPct.toFixed(2)}%`;
          const dateStr = new Date(bot.stopTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
          const timeStr = new Date(bot.stopTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <div>
                    <div style="font-weight: 800; color: white; font-size: 0.95rem; display: flex; align-items: center; gap: 0.35rem;">
                      🤖 ${bot.asset}
                      <span style="font-size: 0.6rem; padding: 1px 4px; border-radius: 3px; background: rgba(255,255,255,0.08); color: var(--text-muted); font-weight: 600;">${bot.assetType.toUpperCase()}</span>
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${dateStr} ${timeStr} • Selesai</div>
                  </div>
                  <span style="font-size: 0.75rem; background: ${up ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}; color: ${color}; border: 1px solid ${up ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}; padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 700;">
                    ${changeText}
                  </span>
                </div>
                
                <div style="font-size: 0.8rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; background: rgba(0,0,0,0.15); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);">
                  <div>Modal: <span style="color: white; font-weight:600;">$ ${bot.capital.toLocaleString()}</span></div>
                  <div>P/L: <span style="color: ${color}; font-weight:700;">${up ? '+' : ''}$ ${Math.round(bot.profit).toLocaleString()}</span></div>
                  <div>Entry: <span style="color: white;">$ ${bot.entryPrice.toLocaleString()}</span></div>
                  <div>Status: <span style="color: ${color}; font-weight: 600;">${up ? 'Profit' : 'Loss'}</span></div>
                </div>
              </div>
              <button onclick="downloadBotCard(${bot.id}, false)" class="btn btn-secondary btn-sm" style="width: 100%; font-size: 0.75rem; font-weight: 800; justify-content: center; height: 32px; display: flex; align-items: center; gap: 0.25rem; border-color: rgba(255,255,255,0.1);">
                🎴 Unduh Laporan
              </button>
            </div>
          `;
        }).join('');

    // Build all stocks/cryptos dropdown options
    const stocks = stockMarket.getAllStocks() || [];
    const cryptos = cryptoMarket.getAllCryptos() || [];

    const stockOptions = stocks.map(s => `<option value="stock:${s.symbol}">Saham: ${s.symbol} - ${s.name}</option>`).join('');
    const cryptoOptions = cryptos.map(c => `<option value="crypto:${c.symbol}">Crypto: ${c.symbol} - ${c.name}</option>`).join('');

    return `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; animation: fade-up 0.3s ease;">
        <!-- Setup Area -->
        <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: white; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">🤖 Buat Trading Bot Baru</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Gunakan robot otomatis untuk melakukan trading saham atau aset kripto. Robot akan mengeksekusi perdagangan menggunakan momentum sinyal pasar secara real-time.</p>
          
          <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; min-width: 0;">
              <div class="form-group" style="margin-bottom: 0; min-width: 0;">
                <label class="form-label" style="font-size: 0.75rem;">Pilih Aset Investasi</label>
                <select id="bot-asset-select" class="form-input" style="background: var(--bg-surface); color: white; width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                  <optgroup label="Saham Terpopuler">
                    ${stockOptions}
                  </optgroup>
                  <optgroup label="Aset Kripto">
                    ${cryptoOptions}
                  </optgroup>
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0; min-width: 0;">
                <label class="form-label" style="font-size: 0.75rem;">Modal Alokasi Bot ($)</label>
                <input type="number" id="bot-capital-input" class="form-input" placeholder="Modal..." value="5000" style="background: var(--bg-surface); color: white; width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
              </div>
            </div>
            
            <div style="display: flex; justify-content: flex-end;">
              <button onclick="deploySelectedBot()" class="btn btn-primary btn-sm" style="font-size: 0.75rem; font-weight: 700; height: 32px; display: flex; align-items:center; gap: 0.25rem;">Deploy Bot! 🚀</button>
            </div>
          </div>
        </div>

        <!-- Active Bots Area -->
        <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: white; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem;">⚡ Trading Bot Aktif (${piState.bots.length})</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; width: 100%;">
            ${activeBotsHTML}
          </div>
        </div>

        <!-- History Bots Area -->
        <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: white; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.25rem;">📜 Riwayat Trading Bot</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; width: 100%;">
            ${historyBotsHTML}
          </div>
        </div>
      </div>
    `;
  }
}

// ===== BIND WIN ACTIONS =====
window.buyMiningRig = (type) => {
  try {
    passiveIncomeManager.buyRig(type);
    ui.success(`Rig ${passiveIncomeManager.rigTypes[type].name} berhasil dibeli!`, 'Mining Rig');
    viewManager._renderStakingMining = true;
    viewManager.updateMarketView(true);
  } catch(e) { ui.error(e.message); }
};

window.sellMiningRig = (type) => {
  try {
    passiveIncomeManager.sellRig(type);
    ui.success(`Rig ${passiveIncomeManager.rigTypes[type].name} berhasil dijual!`, 'Mining Rig');
    viewManager._renderStakingMining = true;
    viewManager.updateMarketView(true);
  } catch(e) { ui.error(e.message); }
};

window.stakeCryptoPrompt = async (symbol) => {
  console.log(`[Staking] stakeCryptoPrompt called for: ${symbol}`);
  try {
    const wallet = gameState.get('crypto') || {};
    const maxAmt = wallet[symbol] ? wallet[symbol].amount : 0;
    console.log(`[Staking] wallet amount: ${maxAmt}`);
    if (maxAmt <= 0) { ui.error('Anda tidak memiliki saldo untuk di-stake'); return; }

    const inputVal = await ui.prompt({
      title: `Stake ${symbol}`,
      message: `Masukkan jumlah ${symbol} yang ingin di-stake (Max: ${maxAmt.toFixed(4)})`,
      placeholder: '0.00',
      defaultValue: maxAmt.toFixed(4),
      isNumeric: true
    });
    console.log(`[Staking] inputVal resolved: ${inputVal}`);
    if (inputVal) {
      const amt = parseFloat(inputVal);
      console.log(`[Staking] parsed amount: ${amt}`);
      if (isNaN(amt) || amt <= 0 || amt > maxAmt) { ui.error('Jumlah input tidak valid'); return; }
      passiveIncomeManager.stake(symbol, amt);
      ui.success(`Berhasil staking ${amt.toFixed(4)} ${symbol}!`, 'Staking Vault');
      viewManager._renderStakingMining = true;
      viewManager.updateMarketView(true);
    }
  } catch(e) {
    console.error('[Staking] Error: ', e);
    ui.error(e.message);
  }
};

window.unstakeCryptoPrompt = async (symbol) => {
  console.log(`[Staking] unstakeCryptoPrompt called for: ${symbol}`);
  try {
    const piState = passiveIncomeManager.getState();
    const maxAmt = piState.staked[symbol] || 0;
    console.log(`[Staking] staked amount: ${maxAmt}`);
    if (maxAmt <= 0) return;

    const inputVal = await ui.prompt({
      title: `Unstake ${symbol}`,
      message: `Masukkan jumlah ${symbol} yang ingin ditarik (Max: ${maxAmt.toFixed(4)})`,
      placeholder: '0.00',
      defaultValue: maxAmt.toFixed(4),
      isNumeric: true
    });
    console.log(`[Staking] inputVal resolved: ${inputVal}`);
    if (inputVal) {
      const amt = parseFloat(inputVal);
      console.log(`[Staking] parsed amount: ${amt}`);
      if (isNaN(amt) || amt <= 0 || amt > maxAmt) { ui.error('Jumlah input tidak valid'); return; }
      passiveIncomeManager.unstake(symbol, amt);
      ui.success(`Berhasil unstaking ${amt.toFixed(4)} ${symbol}!`, 'Staking Vault');
      viewManager._renderStakingMining = true;
      viewManager.updateMarketView(true);
    }
  } catch(e) {
    console.error('[Staking] Error: ', e);
    ui.error(e.message);
  }
};

window.deploySelectedBot = () => {
  const assetVal = document.getElementById('bot-asset-select')?.value;
  const capitalInput = document.getElementById('bot-capital-input');
  const capital = capitalInput ? (capitalInput.getNumericValue ? capitalInput.getNumericValue() : parseFloat(capitalInput.value)) : NaN;

  if (!assetVal) { ui.error('Pilih aset terlebih dahulu'); return; }
  if (isNaN(capital) || capital <= 0) { ui.error('Jumlah modal tidak valid'); return; }

  const parts = assetVal.split(':');
  const assetType = parts[0];
  const symbol = parts[1];

  try {
    passiveIncomeManager.startBot('ai', symbol, assetType, capital);
    ui.success(`AI Auto-Trading Bot berhasil dijalankan pada ${symbol}!`, 'Deploy Bot');
    viewManager._renderBotTrading = true;
    viewManager.updateMarketView(true);
  } catch (e) {
    ui.error(e.message);
  }
};

window.stopTradingBot = (id) => {
  try {
    passiveIncomeManager.stopBot(id);
    ui.success('Bot dihentikan dan seluruh modal serta profit dikreditkan ke kas!', 'Bot Stopped');
    viewManager._renderBotTrading = true;
    viewManager.updateMarketView(true);
  } catch(e) {
    ui.error(e.message);
  }
};

window.downloadBotCard = (id, isActive) => {
  const state = passiveIncomeManager.getState();
  const bot = isActive 
    ? state.bots.find(b => b.id == id)
    : (state.botHistory || []).find(b => b.id == id);
  
  if (!bot) {
    ui.error("Data bot tidak ditemukan!");
    return;
  }
  
  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  
  // Draw base dark slate gradient
  const grad = ctx.createLinearGradient(0, 0, 600, 360);
  grad.addColorStop(0, '#0f172a'); // slate-900
  grad.addColorStop(1, '#1e1b4b'); // indigo-950
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 360);
  
  // Draw premium border glow
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 596, 356);
  
  // Profit/Loss radial background glow
  const isProfit = bot.profit >= 0;
  const glowColor = isProfit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
  const glowGrad = ctx.createRadialGradient(500, 100, 10, 500, 100, 220);
  glowGrad.addColorStop(0, glowColor);
  glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, 600, 360);

  // Header branding
  ctx.font = 'bold 20px "Outfit", "Inter", "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#6366f1';
  ctx.fillText('AURA ASSETS', 40, 50);
  
  ctx.font = 'bold 11px "Outfit", "Inter", "Helvetica Neue", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fillText('AUTOMATED TRADING ENGINE', 40, 70);
  
  // Status Badge (Active/Closed)
  const badgeText = isActive ? 'RUNNING' : 'CLOSED';
  const badgeColor = isActive ? '#3b82f6' : '#94a3b8';
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(460, 35, 100, 28, 6);
  } else {
    ctx.rect(460, 35, 100, 28);
  }
  ctx.fill();
  
  ctx.fillStyle = badgeColor;
  ctx.font = 'bold 11px "Outfit", "Inter", "Helvetica Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, 510, 53);
  ctx.textAlign = 'left'; // Reset alignment
  
  // Divider line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 95);
  ctx.lineTo(560, 95);
  ctx.stroke();
  
  // Big Asset Name & Type
  ctx.font = 'bold 36px "Outfit", "Inter", "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(bot.asset, 40, 145);
  
  ctx.font = '600 12px "Outfit", "Inter", "Helvetica Neue", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText(`${bot.assetType.toUpperCase()} • AI Momentum Auto-Trading`, 40, 168);
  
  // Grid Columns
  // Col 1: Capital (Modal)
  ctx.font = '600 11px "Outfit", "Inter", "Helvetica Neue", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('MODAL ALOKASI', 40, 215);
  ctx.font = 'bold 22px "Outfit", "Inter", "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`$${bot.capital.toLocaleString()}`, 40, 245);
  
  // Col 2: Net Profit / Loss
  ctx.font = '600 11px "Outfit", "Inter", "Helvetica Neue", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('NET PROFIT/LOSS', 230, 215);
  ctx.font = 'bold 22px "Outfit", "Inter", "Helvetica Neue", sans-serif';
  ctx.fillStyle = isProfit ? '#10b981' : '#ef4444';
  const sign = isProfit ? '+' : '';
  ctx.fillText(`${sign}$${Math.round(bot.profit).toLocaleString()}`, 230, 245);
  
  // Col 3: ROI %
  ctx.font = '600 11px "Outfit", "Inter", "Helvetica Neue", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('ESTIMATED ROI', 420, 215);
  ctx.font = 'bold 22px "Outfit", "Inter", "Helvetica Neue", sans-serif';
  ctx.fillStyle = isProfit ? '#10b981' : '#ef4444';
  ctx.fillText(`${sign}${bot.profitPct.toFixed(2)}%`, 420, 245);
  
  // Footer Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.moveTo(40, 280);
  ctx.lineTo(560, 280);
  ctx.stroke();
  
  // Footer Details
  ctx.font = '11px "Outfit", "Inter", "Helvetica Neue", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  const timeStr = bot.stopTime ? new Date(bot.stopTime).toLocaleString() : 'Running...';
  ctx.fillText(`Durasi: ${bot.runtimeTicks || 0} Ticks  |  Waktu: ${timeStr}`, 40, 315);
  
  ctx.textAlign = 'right';
  ctx.fillText('aura-assets.com', 560, 315);
  ctx.textAlign = 'left'; // Reset alignment
  
  // Download trigger
  try {
    const link = document.createElement('a');
    link.download = `aura_bot_${bot.asset}_${bot.id.toString().slice(-6)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    ui.success('Kartu performa bot berhasil diunduh!', 'Download Card');
  } catch(err) {
    ui.error('Gagal mengunduh gambar kartu: ' + err.message);
  }
};

export const viewManager = new ViewManager();
export default viewManager;
