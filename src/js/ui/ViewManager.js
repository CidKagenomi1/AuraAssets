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
import { swipeTransition, staggerFadeUp } from './Animations.js';
import { businessPage } from './BusinessPage.js';
import propertyManager from '../property/PropertyManager.js';
import roleManager from '../game/RoleManager.js';

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
    gameState.on('roleChange', () => {
      this.updateMobileBottomNav(this.currentView);
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

    // Update active navigation highlights
    this.updateActiveNavigationHighlights(view);

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
        import('./panels/GamblingPanel.js').then(module => {
          module.default.show();
        });
        break;
      case 'market':
        this.updateMarketView();
        break;
      case 'portfolio':
        import('./panels/FinancePanel.js').then(module => {
          module.default.show('portfolio');
        });
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
        this.updateMarketView();
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
    // Update badge values dynamically
    const allStocks = stockMarket.getAllStocks() || [];
    const allCryptos = cryptoMarket.getAllCryptos() || [];
    const portfolioCount = (stockMarket.getPortfolio() || []).length + (cryptoMarket.getWallet() || []).length;

    const badgeStocks = document.getElementById('badge-stocks');
    const badgeCrypto = document.getElementById('badge-crypto');
    const badgePortfolio = document.getElementById('badge-portfolio');

    if (badgeStocks) badgeStocks.textContent = allStocks.length;
    if (badgeCrypto) badgeCrypto.textContent = allCryptos.length;
    if (badgePortfolio) badgePortfolio.textContent = portfolioCount;

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
      business: { id: 'business', label: 'Bisnis', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>` },
      property: { id: 'property', label: 'Properti', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"/></svg>` },
      loan: { id: 'loan', label: 'Pinjaman', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z"/></svg>` },
      savings: { id: 'savings', label: 'Deposito', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>` },
      tax: { id: 'tax', label: 'Pajak', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2l-1.5 1.5L6 2l-1.5 1.5L3 2v20z"/></svg>` },
      history: { id: 'history', label: 'Riwayat', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>` },
      donate: { id: 'donate', label: 'Donasi', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4V8h16v11z"/></svg>` },
      guide: { id: 'guide', label: 'Panduan', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>` }
    };

    // Bottom Row (Dominant) Candidates
    const primaryIds = ['home', 'market', 'portfolio', 'business', 'property'];
    let bottomItems = primaryIds
      .filter(id => id === 'home' || !role.hiddenNav.includes(id))
      .map(id => navItems[id]);

    // Top Row (Secondary) Candidates
    const secondaryIds = ['history', 'loan', 'savings', 'tax', 'guide', 'donate'];
    let topItems = secondaryIds
      .filter(id => !role.hiddenNav.includes(id))
      .map(id => navItems[id]);

    // Adjust topItems to have an odd number (max 5)
    if (topItems.length >= 5) {
      topItems = topItems.slice(0, 5); // 5 items (odd)
    } else if (topItems.length === 4) {
      topItems = topItems.slice(0, 3); // 3 items (odd)
    } else if (topItems.length === 2) {
      topItems = topItems.slice(0, 1); // 1 item (odd)
    }

    let html = '';

    // Render Tier 1 (Top Row - Fixed / No scroll - Icons only)
    if (topItems.length > 0) {
      html += `
        <div class="bottom-nav-tier tier-top" style="
          display: grid;
          grid-template-columns: repeat(${topItems.length}, 1fr);
          width: 100%;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          justify-items: center;
          align-items: center;
          height: 38px;
          background: rgba(0, 0, 0, 0.45);
          box-sizing: border-box;
        ">
          ${topItems.map(item => {
            const isActive = item.id === activeView;
            return `
              <button class="bottom-nav-tier-btn nav-btn ${isActive ? 'active' : ''}" data-view="${item.id}" style="
                display: flex;
                align-items: center;
                justify-content: center;
                background: ${isActive ? 'rgba(16, 185, 129, 0.15)' : 'transparent'};
                border: ${isActive ? '1px solid rgba(16, 185, 129, 0.3)' : 'none'};
                color: ${isActive ? 'var(--accent-primary)' : 'var(--text-muted)'};
                padding: 4px 10px;
                border-radius: var(--radius-sm);
                cursor: pointer;
                transition: all 0.2s ease;
                height: 26px;
              ">
                <span style="display: flex; align-items: center; justify-content: center;">${item.icon}</span>
              </button>
            `;
          }).join('')}
        </div>
      `;
    }

    // Render Tier 2 (Bottom Row - Main / Active Prominent - Icons only)
    html += `
      <div class="bottom-nav-tier tier-bottom" style="
        display: grid;
        grid-template-columns: repeat(${bottomItems.length}, 1fr);
        width: 100%;
        height: 54px;
        align-items: center;
        justify-items: center;
        background: rgba(24, 24, 27, 0.95);
        box-sizing: border-box;
      ">
        ${bottomItems.map(item => {
          const isActive = item.id === activeView;
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
                width: 44px;
                height: 44px;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                z-index: 20;
                cursor: pointer;
                transition: all 0.2s ease;
                transform: translateY(-4px);
              ">
                <span style="display: flex; align-items: center; justify-content: center; transform: scale(1.15);">${item.icon}</span>
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
        this.switchView(view);
      });
    });
  }
}

export const viewManager = new ViewManager();
export default viewManager;
