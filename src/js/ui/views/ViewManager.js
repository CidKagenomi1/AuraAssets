/**
 * ViewManager.js - Core Lifecycle & View Router (Modular & Streamlined)
 * Handles view transitions, animations, dynamic views, and market routing.
 */

import stockMarket from '../../trading/StockMarket.js';
import cryptoMarket from '../../trading/CryptoMarket.js';
import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../core/GameState.js';
import ui from '../UIManager.js';
import tradingPage from '../../trading/TradingPage.js';
import { swipeTransition, staggerFadeUp } from '../Animations.js';
import propertyManager from '../../property/PropertyManager.js';
import roleManager from '../../core/RoleManager.js';
import passiveIncomeManager from '../../trading/PassiveIncomeManager.js';
import newsManager from '../../core/NewsManager.js';

// Modular Sub-Views
import { SECTOR_COLORS, buildStockRow, buildCryptoRow, buildPortfolioRow } from './MarketRows.js';
import { updateMobileBottomNav, showMobileMenu } from './MobileNav.js';
import { renderPassiveIncomeView, bindPassiveIncomeButtons } from './PassiveIncomeView.js';

export class ViewManager {
  constructor() {
    this.currentView = 'home';
    this.homeSections = [
      '#balance-card',
      '#market-pulse-widget',
      '.quick-actions',
      '#footer-dashboard-grid'
    ];
    this.marketFilter = '';
    this.marketSort = { key: 'default', dir: 'asc' };
    this.currentMarketTab = 'stocks';
    this.newsTabFilter = 'all';
    this.activeDynamicTab = 'cashflow';
    this.currentPassiveView = 'staking';
    this._renderPassiveIncome = true;
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
    gameState.on('newsUpdate', () => {
      const badgeNews = document.getElementById('badge-news');
      if (badgeNews && typeof newsManager.getActiveNews === 'function') {
        badgeNews.textContent = newsManager.getActiveNews().length;
      }
      if (this.currentView === 'market' && this.currentMarketTab === 'news') {
        this.renderNewsView();
      }
    });

    // Real-time countdown refresh for active breaking news
    setInterval(() => {
      if (this.currentView === 'market' && this.currentMarketTab === 'news') {
        this.updateNewsCountdowns();
      }
    }, 1000);

    document.addEventListener('passiveIncomeTick', () => {
      if (this.currentView === 'market') {
        if (this.currentMarketTab === 'passive-income') this._renderPassiveIncome = true;
        this.updateMarketView();
      }
    });

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

  updateHistoryView() {
    import('../HomeScreen.js').then(module => {
      module.default.renderHistoryView();
    });
  }

  updateNavState(view) {
    const viewToHighlight = view || this.currentView;
    let highlightedView = viewToHighlight;
    if (viewToHighlight === 'dynamic') {
      highlightedView = this.activeDynamicTab === 'portfolio' ? 'portfolio' : 'home';
    } else if (['property', 'loan', 'savings', 'tax', 'history', 'trading-signal', 'guide', 'donate'].includes(viewToHighlight)) {
      highlightedView = 'home';
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === highlightedView);
    });
    document.querySelectorAll('.sidebar-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === highlightedView);
    });
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === highlightedView);
    });

    this.updateMobileBottomNav(highlightedView);
  }

  switchView(view) {
    if (this.currentView === view && view !== 'dynamic') return;

    // View-specific modal triggers
    switch(view) {
      case 'property':
        import('../../property/panels/PropertyPanel.js').then(module => {
          module.default.show();
        });
        this.updateNavState(this.currentView);
        return;
      case 'guide':
        import('../HomeScreen.js').then(module => {
          module.default.showGameGuide();
        });
        this.updateNavState(this.currentView);
        return;
      case 'tax':
        import('../../finance/panels/TaxPanel.js').then(module => {
          module.default.show();
        });
        this.updateNavState(this.currentView);
        return;
      case 'donate':
        import('../../finance/panels/FinancePanel.js').then(module => {
          module.default.showDonateModal();
        });
        this.updateNavState(this.currentView);
        return;
      case 'marketplace':
        import('../../marketplace/panels/MarketplacePanel.js').then(module => {
          module.default.show();
        });
        this.updateNavState(this.currentView);
        return;
      case 'portfolio':
        import('../../finance/panels/FinancePanel.js').then(module => {
          module.default.show('portfolio');
        });
        this.updateNavState(this.currentView);
        return;
      case 'history':
        this.updateHistoryView();
        break;
      case 'trading-signal':
        import('../../trading/panels/TradingSignalPanel.js').then(module => {
          module.default.show();
        });
        this.updateNavState(this.currentView);
        return;
      case 'loan':
        import('../../finance/panels/LoanPanel.js').then(module => {
          module.default.show();
        });
        this.updateNavState(this.currentView);
        return;
      case 'savings':
        import('../../finance/panels/SavingsPanel.js').then(module => {
          module.default.show();
        });
        this.updateNavState(this.currentView);
        return;
      case 'market':
        this.updateMarketView();
        break;
    }

    // Close trading terminal if switching to another view
    if (typeof tradingPage !== 'undefined' && tradingPage.close) {
      tradingPage.close();
    }

    try {
      import('../AuraSound.js').then(m => m.default.playClick?.());
    } catch(e){}

    const homeEl = document.getElementById('view-home');
    const isHome = view === 'home';

    // Toggle home screen container visibility directly
    if (homeEl) {
      homeEl.style.display = isHome ? '' : 'none';
      if (isHome) homeEl.classList.add('active');
      else homeEl.classList.remove('active');
    }

    // Safety hide individual home sections
    this.homeSections.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.style.display = isHome ? '' : 'none';
    });

    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.style.display = 'none';
      panel.classList.remove('active');
    });

    const targetEl = isHome ? null : this.getViewElement(view);

    if (targetEl) {
      this.currentView = view;
      targetEl.style.display = 'block';
      targetEl.classList.add('active');
      swipeTransition(null, targetEl, 'right');

      const cards = targetEl.querySelectorAll('.card, .planning-card, .menu-card, .market-row, .asset-item, .transaction-item, .wealth-card, .portfolio-asset-row');
      if (cards.length > 0) {
        staggerFadeUp(cards, 35);
      }
    } else if (isHome) {
      this.currentView = 'home';
      if (homeEl) {
        swipeTransition(null, homeEl, 'left');
      }
      const homeCards = document.querySelectorAll('#view-home .card, #view-home .menu-card, #view-home .hero-balance-card, #view-home #market-pulse-widget, #view-home #top-movers-widget');
      if (homeCards.length > 0) {
        staggerFadeUp(homeCards, 30);
      }
    }

    this.finishSwitchView(view);
  }

  finishSwitchView(view) {
    this.currentView = view;
    this.updateNavState(view);

    if (view === 'home') {
      import('../HomeScreen.js').then(module => {
        module.default.updateOverview();
      });
    }
  }

  getViewElement(view) {
    return document.getElementById(`view-${view}`);
  }

  // ========================================
  // MOBILE NAVIGATION DELEGATION
  // ========================================
  updateMobileBottomNav(activeView) {
    updateMobileBottomNav(activeView, (v) => this.switchView(v));
  }

  showMobileMenu() {
    showMobileMenu((v) => this.switchView(v));
  }

  // ========================================
  // MARKET VIEW & SMART TABLE ROUTER
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

        if (tabId === 'passive-income') {
          this._renderPassiveIncome = true;
        }

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

  updateMarketView(force = false) {
    // Update badge values dynamically
    const allStocks = stockMarket.getAllStocks() || [];
    const allCryptos = cryptoMarket.getAllCryptos() || [];
    const portfolioCount = (stockMarket.getPortfolio() || []).length + (cryptoMarket.getWallet() || []).length;
    const piState = passiveIncomeManager.getState();
    
    let passiveIncomeCount = 0;
    Object.values(piState.rigs).forEach(c => passiveIncomeCount += c);
    Object.values(piState.staked).forEach(c => { if (c > 0) passiveIncomeCount += 1; });
    passiveIncomeCount += piState.bots.length;
    if (piState.launchdrops) {
      piState.launchdrops.forEach(ld => { if (ld.committed > 0 && ld.status !== 'ENDED') passiveIncomeCount += 1; });
    }

    const badgeStocks = document.getElementById('badge-stocks');
    const badgeCrypto = document.getElementById('badge-crypto');
    const badgePassiveIncome = document.getElementById('badge-passive-income');
    const badgePortfolio = document.getElementById('badge-portfolio');
    const badgeNews = document.getElementById('badge-news');

    if (badgeStocks) badgeStocks.textContent = allStocks.length;
    if (badgeCrypto) badgeCrypto.textContent = allCryptos.length;
    if (badgePassiveIncome) badgePassiveIncome.textContent = passiveIncomeCount;
    if (badgePortfolio) badgePortfolio.textContent = portfolioCount;
    if (badgeNews && typeof newsManager.getActiveNews === 'function') {
      badgeNews.textContent = newsManager.getActiveNews().length;
    }

    // Toggle search controls bar visibility
    const searchBar = document.getElementById('market-search-bar-container');
    if (searchBar) {
      if (this.currentMarketTab === 'passive-income' || this.currentMarketTab === 'news') {
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
      
      if (this.marketFilter) {
        stocks = stocks.filter(s => 
          s.symbol.toLowerCase().includes(this.marketFilter) || 
          s.name.toLowerCase().includes(this.marketFilter)
        );
      }

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

      if (this.marketFilter) {
        cryptos = cryptos.filter(c => 
          c.symbol.toLowerCase().includes(this.marketFilter) || 
          c.name.toLowerCase().includes(this.marketFilter)
        );
      }

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

    // Update Passive Income & Launchdrops
    const passiveIncomePanel = document.getElementById('market-passive-income');
    if (passiveIncomePanel && this.currentMarketTab === 'passive-income' && this._renderPassiveIncome) {
      const activeEl = document.activeElement;
      const isTyping = activeEl && passiveIncomePanel.contains(activeEl) && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT');
      if (force || !isTyping) {
        passiveIncomePanel.innerHTML = this.renderPassiveIncomeView();
        this._bindPassiveIncomeButtons();
        this._renderPassiveIncome = false;
      }
    }

    // Update portfolio list
    const portfolioList = document.getElementById('market-portfolio-list');
    if (portfolioList && this.currentMarketTab === 'portfolio') {
      const stockPortfolio = stockMarket.getPortfolio() || [];
      const cryptoWallet = cryptoMarket.getWallet() || [];
      
      const totalStockVal = stockMarket.getPortfolioValue() || 0;
      const totalCryptoVal = cryptoMarket.getWalletValue() || 0;
      const totalMarketVal = totalStockVal + totalCryptoVal;

      const totalStockProfit = stockPortfolio.reduce((sum, h) => sum + (h.profit || 0), 0);
      const totalCryptoProfit = cryptoWallet.reduce((sum, h) => sum + (h.profit || 0), 0);
      const totalProfit = totalStockProfit + totalCryptoProfit;

      const totalStockInvested = stockPortfolio.reduce((sum, h) => sum + (h.totalInvested || 0), 0);
      const totalCryptoInvested = cryptoWallet.reduce((sum, h) => sum + (h.totalInvested || 0), 0);
      const totalInvested = totalStockInvested + totalCryptoInvested;
      const totalProfitPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
      const isProfit = totalProfit >= 0;

      if (stockPortfolio.length === 0 && cryptoWallet.length === 0) {
        portfolioList.innerHTML = '<div class="empty-state" style="padding: 2.5rem 1rem; text-align: center; color: rgba(255,255,255,0.4);"><div class="empty-state-icon" style="font-size: 2.5rem; margin-bottom: 0.5rem;">💼</div><div class="empty-state-text" style="font-weight: 700; color: #fff;">Portofolio Masih Kosong</div><div style="font-size: 0.8rem; margin-top: 0.25rem;">Beli saham atau kripto di tab pasar untuk mulai membangun portofolio investasi Anda.</div></div>';
      } else {
        const headerSummary = `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; padding: 1rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-md);">
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Nilai Pasar Aset</div>
              <div style="font-size: 1.25rem; font-weight: 800; color: #ffffff; margin-top: 2px;">$ ${Number(totalMarketVal).toLocaleString('id-ID')}</div>
            </div>
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Total Modal Berjalan</div>
              <div style="font-size: 1.25rem; font-weight: 800; color: #ffffff; margin-top: 2px;">$ ${Number(totalInvested).toLocaleString('id-ID')}</div>
            </div>
            <div>
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Floating P/L</div>
              <div style="font-size: 1.25rem; font-weight: 800; color: ${isProfit ? '#10b981' : '#ef4444'}; margin-top: 2px;">
                ${isProfit ? '+' : ''}$ ${Number(totalProfit).toLocaleString('id-ID')} (${isProfit ? '+' : ''}${totalProfitPct.toFixed(2)}%)
              </div>
            </div>
          </div>
        `;

        let rowsHtml = '';
        stockPortfolio.forEach(h => {
          rowsHtml += buildPortfolioRow(h, 'stock');
        });
        cryptoWallet.forEach(h => {
          rowsHtml += buildPortfolioRow(h, 'crypto');
        });

        portfolioList.innerHTML = headerSummary + `<div style="display: flex; flex-direction: column; gap: 0.65rem;">${rowsHtml}</div>`;
      }
    }

    // Update breaking news tab
    const newsList = document.getElementById('market-news-list');
    if (newsList && this.currentMarketTab === 'news') {
      this.renderNewsView();
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

  renderPassiveIncomeView() {
    return renderPassiveIncomeView(this.currentPassiveView);
  }

  _bindPassiveIncomeButtons() {
    bindPassiveIncomeButtons();
  }

  // =========================================================================
  // NEWS & ACTIONABLE TRADING ENGINE
  // =========================================================================

  getActionableAssets(event) {
    const isCrypto = event.market === 'crypto';
    const target = event.ticker_target || event.target_asset || '';
    const sector = event.sector || '';
    const results = [];

    if (isCrypto) {
      const direct = cryptoMarket.getCrypto(target);
      if (direct) {
        results.push({ symbol: direct.symbol, name: direct.name, price: direct.price, change: direct.change, type: 'crypto' });
      }

      const syms = [];
      if (['ALTCOINS_MAJOR', 'TOP_10_INDEX', 'TOTAL_MARKET'].includes(target)) {
        syms.push('ETH', 'SOL', 'BNB', 'XRP');
      } else if (target === 'L2_TOKENS' || sector.includes('layer_2')) {
        syms.push('ARB', 'OP', 'MATIC', 'MNT');
      } else if (target === 'PAYMENT_COINS' || sector.includes('payment')) {
        syms.push('XRP', 'XLM', 'LTC', 'BCH');
      } else if (target === 'DEFI_INDEX' || sector.includes('defi')) {
        syms.push('UNI', 'AAVE', 'MKR', 'PENDLE');
      } else if (target === 'SMART_CONTRACTS' || sector.includes('layer_1')) {
        syms.push('ETH', 'SOL', 'ADA', 'AVAX');
      } else if (target === 'SOCIALFI' || sector.includes('social')) {
        syms.push('TON', 'APE', 'SAND', 'MANA');
      } else if (target === 'POW_MINING' || sector.includes('mining')) {
        syms.push('BTC', 'LTC', 'DOGE', 'ETC');
      } else if (target === 'CEX_TOKENS' || sector.includes('centralized_exchanges')) {
        syms.push('BNB', 'OKB', 'KCS');
      } else if (target === 'PRIVACY_TOKENS' || sector.includes('privacy')) {
        syms.push('XMR', 'ZEC', 'DASH');
      } else if (target === 'AI_CRYPTO' || sector.includes('ai')) {
        syms.push('FET', 'RENDER', 'TAO', 'AGIX');
      } else if (target === 'MEME_COINS' || sector.includes('meme')) {
        syms.push('DOGE', 'SHIB', 'PEPE', 'WIF');
      } else if (target === 'RWA_TOKENS' || sector.includes('rwa')) {
        syms.push('ONDO', 'LINK', 'PENDLE');
      } else if (sector.includes('stablecoins')) {
        syms.push('USDT', 'USDC', 'DAI');
      } else if (target === 'BTC' || sector.includes('store_of_value')) {
        syms.push('BTC');
      }

      syms.forEach(s => {
        if (!results.find(r => r.symbol === s)) {
          const c = cryptoMarket.getCrypto(s);
          if (c) results.push({ symbol: c.symbol, name: c.name, price: c.price, change: c.change, type: 'crypto' });
        }
      });
    } else {
      const direct = stockMarket.getStock(target);
      if (direct) {
        results.push({ symbol: direct.symbol, name: direct.name, price: direct.price, change: direct.change, type: 'stock' });
      }

      const syms = [];
      if (['SPY', 'VOO'].includes(target) || sector.includes('broad_market')) {
        syms.push('AAPL', 'MSFT', 'NVDA', 'AMZN');
      } else if (target === 'SOXX' || sector.includes('semiconductor')) {
        syms.push('NVDA', 'AMD', 'AVGO', 'QCOM');
      } else if (target === 'XBI' || sector.includes('biotech') || sector.includes('pharma')) {
        syms.push('LLY', 'JNJ', 'PFE', 'MRK');
      } else if (target === 'XLY' || sector.includes('consumer_discretionary')) {
        syms.push('AMZN', 'TSLA', 'HD', 'MCD');
      } else if (target === 'XLI' || sector.includes('industrials')) {
        syms.push('CAT', 'GE', 'HON', 'UNP');
      } else if (target === 'EV_SECTOR' || sector.includes('clean_tech')) {
        syms.push('TSLA', 'RIVN', 'F', 'GM');
      } else if (['XLF', 'KRE'].includes(target) || sector.includes('financial') || sector.includes('banking')) {
        syms.push('JPM', 'BAC', 'WFC', 'GS');
      } else if (['XLK', 'BIG_TECH'].includes(target) || sector.includes('tech')) {
        syms.push('MSFT', 'AAPL', 'GOOGL', 'META');
      } else if (target === 'XLU' || sector.includes('utilities')) {
        syms.push('NEE', 'SO', 'DUK', 'CEG');
      } else if (target === 'QQQ' || sector.includes('growth')) {
        syms.push('NVDA', 'MSFT', 'AAPL', 'AMZN');
      } else if (target === 'JETS' || sector.includes('transport')) {
        syms.push('DAL', 'UAL', 'LUV', 'UNP');
      } else if (target === 'HACK' || sector.includes('cloud')) {
        syms.push('CRWD', 'PANW', 'FTNT', 'NET');
      } else if (target === 'XLE' || sector.includes('energy')) {
        syms.push('XOM', 'CVX', 'COP', 'SLB');
      } else if (target === 'IWM' || sector.includes('small_cap')) {
        syms.push('PLTR', 'COIN', 'HOOD', 'SOFI');
      } else if (target === 'ITA' || sector.includes('defense')) {
        syms.push('LMT', 'RTX', 'NOC', 'GD');
      }

      syms.forEach(s => {
        if (!results.find(r => r.symbol === s)) {
          const st = stockMarket.getStock(s);
          if (st) results.push({ symbol: st.symbol, name: st.name, price: st.price, change: st.change, type: 'stock' });
        }
      });
    }

    return results.slice(0, 4);
  }

  updateNewsCountdowns() {
    const timerElements = document.querySelectorAll('.news-timer-pill[data-news-id]');
    if (!timerElements.length) return;

    let hasExpired = false;
    timerElements.forEach(el => {
      const newsId = el.dataset.newsId;
      const activeNews = (typeof newsManager.getActiveNews === 'function' ? newsManager.getActiveNews() : []) || [];
      const item = activeNews.find(n => n.id === newsId);

      if (item && item.endTime > Date.now()) {
        const remaining = newsManager.getRemainingCountdown(item);
        el.innerHTML = `⏳ Sisa: ${remaining}`;
      } else {
        hasExpired = true;
      }
    });

    if (hasExpired) {
      this.renderNewsView();
    }
  }

  renderNewsView() {
    const container = document.getElementById('market-news-list');
    if (!container) return;

    const currentFilter = this.newsTabFilter || 'all';
    const allActive = (typeof newsManager.getActiveNews === 'function' ? newsManager.getActiveNews() : []) || [];
    const allHistory = (typeof newsManager.getNewsHistory === 'function' ? newsManager.getNewsHistory() : []) || [];

    let filteredActive = allActive.filter(item => {
      if (currentFilter === 'stock') return item.market === 'stock';
      if (currentFilter === 'crypto') return item.market === 'crypto';
      if (currentFilter === 'positive') return item.type === 'positive';
      if (currentFilter === 'negative') return item.type === 'negative';
      return true;
    });

    const activeIds = new Set(allActive.map(n => n.id));

    let filteredHistory = allHistory.filter(item => {
      if (activeIds.has(item.id) && item.endTime > Date.now()) return false;
      if (currentFilter === 'stock') return item.market === 'stock';
      if (currentFilter === 'crypto') return item.market === 'crypto';
      if (currentFilter === 'positive') return item.type === 'positive';
      if (currentFilter === 'negative') return item.type === 'negative';
      return true;
    });

    let activeCardsHTML = '';
    if (filteredActive.length > 0) {
      activeCardsHTML = filteredActive.map(event => {
        const isPos = event.type === 'positive';
        const isCrypto = event.market === 'crypto';
        const sign = event.impact_percent > 0 ? '+' : '';
        const sentimentClass = isPos ? 'positive' : 'negative';
        const sentimentLabel = isPos ? 'BULLISH SURGE' : 'BEARISH CRASH';
        const marketIcon = isCrypto ? '🪙' : '📈';
        const marketLabel = isCrypto ? 'Pasar Kripto' : 'Bursa Saham AS';
        const targetLabel = isCrypto ? (event.target_asset || event.sector) : (event.ticker_target || event.sector);
        const countdown = newsManager.getRemainingCountdown(event);
        const actionableAssets = this.getActionableAssets(event);

        const assetActionButtons = actionableAssets.map(asset => {
          const actionText = isPos ? 'Beli' : 'Jual';
          const actionClass = isPos ? 'buy' : 'sell';
          const changeUp = (asset.change || 0) >= 0;
          const clickFn = asset.type === 'stock'
            ? `openStockDetail('${asset.symbol}')`
            : `openCryptoDetail('${asset.symbol}')`;

          const priceStr = asset.price < 1 
            ? `$${asset.price.toFixed(4)}` 
            : `$${asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

          return `
            <div class="btn-actionable-trade ${isPos ? 'positive-action' : 'negative-action'}" onclick="${clickFn}">
              <div class="asset-info">
                <span class="asset-symbol">${asset.symbol}</span>
                <span class="asset-price">${priceStr} (${changeUp ? '+' : ''}${(asset.change || 0).toFixed(2)}%)</span>
              </div>
              <span class="asset-action-tag ${actionClass}">
                ${isPos ? '🎯' : '⚠️'} ${actionText}
              </span>
            </div>
          `;
        }).join('');

        return `
          <div class="actionable-news-card ${sentimentClass}">
            <div class="actionable-news-top">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span class="news-badge-sentiment ${sentimentClass}">
                  ${isPos ? '🚀' : '🔻'} ${sentimentLabel} (${sign}${event.impact_percent}%)
                </span>
                <span style="font-size: 0.75rem; color: var(--text-dim); display: inline-flex; align-items: center; gap: 0.25rem;">
                  ${marketIcon} ${marketLabel}
                </span>
              </div>
              <span class="news-timer-pill" data-news-id="${event.id}">
                ⏳ Sisa: ${countdown}
              </span>
            </div>

            <div class="news-card-headline">
              ${event.headline}
            </div>

            <div class="news-card-meta">
              <div class="news-card-meta-item">
                <span>🎯 Target Utama:</span>
                <strong style="color: #fff;">${targetLabel}</strong>
              </div>
              <div class="news-card-meta-item">
                <span>⚡ Estimasi Volatilitas:</span>
                <strong style="color: ${isPos ? '#34d399' : '#f87171'};">${sign}${event.impact_percent}%</strong>
              </div>
            </div>

            <div class="actionable-assets-box">
              <div class="actionable-assets-header">
                <span>⚡ Peluang Trading Instan (Klik untuk Eksekusi):</span>
                <span style="font-size: 0.7rem; color: var(--text-dim); font-weight: normal;">Eksekusi langsung di terminal</span>
              </div>
              <div class="actionable-assets-grid">
                ${assetActionButtons || '<div style="font-size: 0.75rem; color: var(--text-dim); padding: 0.4rem;">Aset target sedang dalam penyesuaian likuiditas.</div>'}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      activeCardsHTML = `
        <div style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.12); border-radius: var(--radius-lg); padding: 2.25rem 1.5rem; text-align: center;">
          <div style="font-size: 2.5rem; margin-bottom: 0.65rem;">🌊</div>
          <div style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem;">Kondisi Pasar Sedang Normal</div>
          <div style="font-size: 0.8rem; color: var(--text-dim); max-width: 460px; margin: 0 auto 1.25rem; line-height: 1.45;">
            Tidak ada breaking news atau sentimen ekstrem yang aktif pada filter ini. Durasi peristiwa berkisar 30 menit hingga 5 jam untuk fluktuasi swing/day trading yang realistis.
          </div>
          <button class="btn-trigger-news" onclick="window.triggerManualMarketNews()" style="padding: 0.5rem 1.25rem; font-size: 0.82rem;">
            ⚡ Picu Berita Pasar Acak Sekarang
          </button>
        </div>
      `;
    }

    let historyHTML = '';
    if (filteredHistory.length > 0) {
      historyHTML = `
        <div class="history-news-list">
          ${filteredHistory.slice(0, 15).map(item => {
            const isPos = item.type === 'positive';
            const isCrypto = item.market === 'crypto';
            const sign = item.impact_percent > 0 ? '+' : '';
            const marketIcon = isCrypto ? '🪙' : '📈';
            const timeStr = item.startTime 
              ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Lampau';

            return `
              <div class="history-news-item">
                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                  <span class="history-news-headline">${marketIcon} ${item.headline}</span>
                  <div class="history-news-meta">
                    <span style="color: ${isPos ? '#34d399' : '#f87171'}; font-weight: 700;">${sign}${item.impact_percent}%</span>
                    <span>•</span>
                    <span>Target: ${item.ticker_target || item.target_asset || item.sector}</span>
                    <span>•</span>
                    <span>Waktu: ${timeStr}</span>
                  </div>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 4px; background: rgba(255,255,255,0.05); white-space: nowrap;">
                  Selesai
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      historyHTML = `
        <div style="text-align: center; padding: 1.5rem; color: var(--text-dim); font-size: 0.78rem;">
          Belum ada riwayat peristiwa pasar pada filter ini.
        </div>
      `;
    }

    container.innerHTML = `
      <div class="news-view-container">
        <div class="news-filter-bar">
          <div class="news-filter-group">
            <button class="news-filter-btn ${currentFilter === 'all' ? 'active' : ''}" onclick="window.setNewsFilter('all')">
              Semua (${allActive.length})
            </button>
            <button class="news-filter-btn ${currentFilter === 'stock' ? 'active' : ''}" onclick="window.setNewsFilter('stock')">
              📈 Saham AS
            </button>
            <button class="news-filter-btn ${currentFilter === 'crypto' ? 'active' : ''}" onclick="window.setNewsFilter('crypto')">
              🪙 Kripto
            </button>
            <button class="news-filter-btn ${currentFilter === 'positive' ? 'active' : ''}" onclick="window.setNewsFilter('positive')">
              🟢 Bullish
            </button>
            <button class="news-filter-btn ${currentFilter === 'negative' ? 'active' : ''}" onclick="window.setNewsFilter('negative')">
              🔴 Bearish
            </button>
          </div>
          <button class="btn-trigger-news" onclick="window.triggerManualMarketNews()" title="Picu simulasi berita baru secara instan">
            ⚡ Picu Berita Acak
          </button>
        </div>

        <div>
          <div class="news-section-title">
            <span style="display: inline-flex; align-items: center; gap: 0.4rem;">
              🔥 Peluang Trading Cepat (Breaking News & Sentimen Aktif)
            </span>
            <span class="badge-count">${filteredActive.length} Peristiwa</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            ${activeCardsHTML}
          </div>
        </div>

        <div style="margin-top: 0.5rem;">
          <div class="news-section-title">
            <span style="display: inline-flex; align-items: center; gap: 0.4rem;">
              📋 Riwayat Peristiwa Pasar (Event History Log)
            </span>
            <span class="badge-count">${filteredHistory.length} Arsip</span>
          </div>
          ${historyHTML}
        </div>
      </div>
    `;
  }
}

// Global ViewManager instance
export const viewManager = new ViewManager();

// Global bridge helpers for window callbacks
if (typeof window !== 'undefined') {
  window._refreshPassiveIncomeView = () => {
    viewManager._renderPassiveIncome = true;
    viewManager.updateMarketView(true);
  };

  window._setPassiveView = (view) => {
    viewManager.currentPassiveView = view;
  };

  window.openMarketNewsTab = () => {
    viewManager.switchView('market');
    const btn = document.getElementById('tab-btn-news');
    if (btn) btn.click();
  };

  window.setNewsFilter = (filter) => {
    viewManager.newsTabFilter = filter;
    viewManager.renderNewsView();
  };

  window.triggerManualMarketNews = () => {
    const ev = newsManager.triggerRandomEvent();
    if (ev) {
      ui.success(`Peristiwa baru aktif: "${ev.headline}"`, 'Berita Dirilis');
    } else {
      ui.info('Maksimal 3 berita aktif bersamaan. Tunggu salah satu peristiwa berakhir atau manfaatkan fluktuasi saat ini.', 'Slot Berita Penuh');
    }
    viewManager.renderNewsView();
  };
}

export default viewManager;

