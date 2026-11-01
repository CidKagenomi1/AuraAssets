/**
 * ViewManager.js - Core Lifecycle & View Router (Streamlined & Modular)
 * Handles view transitions, animations, dynamic views, and sub-view delegation.
 */

import gameState from '../../core/GameState.js';
import tradingPage from '../../trading/TradingPage.js';
import { swipeTransition, staggerFadeUp } from '../Animations.js';
import { updateMobileBottomNav, showMobileMenu } from './MobileNav.js';

// Modular Market Sub-Views Suite
import {
  marketCoordinator,
  marketNewsSubView,
  stockCryptoSubView,
  mutualFundsSubView,
  marketPortfolioSubView
} from './market/index.js';

export class ViewManager {
  constructor() {
    this.currentView = 'home';
    this.homeSections = [
      '#balance-card',
      '#market-pulse-widget',
      '#top-movers-widget',
      '#home-news-snapshot-widget',
      '#home-cashflow-career-row',
      '#home-launchdrop-widget',
      '.quick-actions',
      '#footer-dashboard-grid'
    ];
    this.activeDynamicTab = 'cashflow';
  }

  // Backwards-compatible accessors to Market Coordinator & Sub-Views
  get currentMarketTab() { return marketCoordinator.currentMarketTab; }
  set currentMarketTab(tab) { marketCoordinator.currentMarketTab = tab; }

  get currentPassiveView() { return marketCoordinator.currentPassiveView; }
  set currentPassiveView(view) { marketCoordinator.currentPassiveView = view; }

  get _renderPassiveIncome() { return marketCoordinator._renderPassiveIncome; }
  set _renderPassiveIncome(val) { marketCoordinator._renderPassiveIncome = val; }

  get marketFilter() { return stockCryptoSubView.marketFilter; }
  set marketFilter(val) { stockCryptoSubView.marketFilter = val; }

  get marketSort() { return stockCryptoSubView.marketSort; }
  set marketSort(val) { stockCryptoSubView.marketSort = val; }

  get marketTrendFilter() { return stockCryptoSubView.marketTrendFilter; }
  set marketTrendFilter(val) { stockCryptoSubView.marketTrendFilter = val; }

  get marketRiskFilter() { return stockCryptoSubView.marketRiskFilter; }
  set marketRiskFilter(val) { stockCryptoSubView.marketRiskFilter = val; }

  get marketSectorFilter() { return stockCryptoSubView.marketSectorFilter; }
  set marketSectorFilter(val) { stockCryptoSubView.marketSectorFilter = val; }

  get newsTabFilter() { return marketNewsSubView.newsTabFilter; }
  set newsTabFilter(val) { marketNewsSubView.newsTabFilter = val; }

  init() {
    this.bindNavigation();
    marketCoordinator.init();

    // Bind dynamic back button
    const backBtn = document.getElementById('btn-dynamic-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.switchView('home'));
    }

    // Restore home view context when popups/modals close
    document.addEventListener('modalClosed', () => {
      const modalViews = ['savings', 'loan', 'finance', 'guide', 'trading-signal', 'donate'];
      if (modalViews.includes(this.currentView)) {
        this.switchView('home');
      }
    });

    // Initialize mobile bottom nav
    this.updateMobileBottomNav(this.currentView);

    // Listen for market state updates
    gameState.on('stocksUpdate', () => marketCoordinator.updateMarketView());
    gameState.on('cryptoUpdate', () => marketCoordinator.updateMarketView());
    gameState.on('commodityUpdate', () => marketCoordinator.updateMarketView());
    gameState.on('mutualFundsUpdate', () => marketCoordinator.updateMarketView());
    gameState.on('newsUpdate', () => {
      if (this.currentView === 'news') {
        marketNewsSubView.render();
      }
    });

    // Real-time countdown refresh for active breaking news
    setInterval(() => {
      if (this.currentView === 'news' || (this.currentView === 'market' && this.currentMarketTab === 'news')) {
        marketNewsSubView.updateCountdowns();
      }
    }, 1000);

    document.addEventListener('passiveIncomeTick', () => {
      if (this.currentView === 'passive') {
        import('./PassiveIncomeView.js').then(m => {
          if (typeof m.updatePassiveIncomeLive === 'function') {
            m.updatePassiveIncomeLive();
          } else {
            m.renderPassiveIncomePage();
          }
        });
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
      highlightedView = this.activeDynamicTab === 'portfolio' ? 'portfolio' : (this.activeDynamicTab === 'commodity' ? 'market' : 'home');
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
    const prevView = this.currentView;

    // View-specific modal triggers
    switch(view) {
      case 'bank':
        import('./MobileNav.js').then(module => {
          module.showBankMenu((targetView) => this.switchView(targetView));
        });
        this.updateNavState(this.currentView);
        return;
      case 'commodity':
        this.switchView('market');
        marketCoordinator.switchTab('commodity');
        return;
      case 'guide':
        import('../HomeScreen.js').then(module => {
          module.default.showGuide();
        });
        this.updateNavState(this.currentView);
        return;
      case 'donate':
        import('../HomeScreen.js').then(module => {
          module.default.handleDonate();
        });
        this.updateNavState(this.currentView);
        return;
      case 'transfer':
        import('../../finance/TransferManager.js').then(module => {
          module.default.showTransferModal();
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
        marketCoordinator.updateMarketView();
        break;
      case 'passive':
        import('./PassiveIncomeView.js').then(module => {
          module.renderPassiveIncomePage();
        });
        break;
      case 'news':
        this.switchView('market');
        marketCoordinator.switchTab('news');
        return;
      case 'settings':
        import('./SettingsPage.js').then(module => {
          const target = document.getElementById('view-settings');
          if (target) module.default.render(target);
        });
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

    this.finishSwitchView(view, prevView);
  }

  finishSwitchView(view, prevView = null) {
    this.currentView = view;
    this.updateNavState(view);

    if (view === 'home') {
      import('../HomeScreen.js').then(module => {
        module.default.updateOverview();
      });
    } else if (view === 'market') {
      marketCoordinator.updateMarketView();
    } else if (view === 'passive') {
      import('./PassiveIncomeView.js').then(module => {
        module.renderPassiveIncomePage();
      });
    }

    document.dispatchEvent(new CustomEvent('viewChanged', { detail: { view, prevView } }));
  }

  getViewElement(view) {
    return document.getElementById(`view-${view}`);
  }

  updateMobileBottomNav(activeView) {
    updateMobileBottomNav(activeView, (v) => this.switchView(v));
  }

  showMobileMenu() {
    showMobileMenu((v) => this.switchView(v));
  }

  // ========================================
  // BACKWARDS-COMPATIBILITY DELEGATES
  // ========================================
  updateMarketView(force = false) {
    marketCoordinator.updateMarketView(force);
  }

  updateOrdersList() {
    marketCoordinator.updateOrdersList();
  }

  renderNewsPageView() {
    marketNewsSubView.render();
  }

  renderNewsView() {
    marketNewsSubView.render();
  }

  updateNewsCountdowns() {
    marketNewsSubView.updateCountdowns();
  }

  setSort(key) {
    stockCryptoSubView.setSort(key);
  }

  setSectorFilter(sec) {
    stockCryptoSubView.setSectorFilter(sec);
  }

  resetFilters() {
    stockCryptoSubView.resetFilters();
  }
}

// Global ViewManager instance
export const viewManager = new ViewManager();

// Global bridge helpers for window callbacks
if (typeof window !== 'undefined') {
  window._refreshPassiveIncomeView = () => {
    marketCoordinator._renderPassiveIncome = true;
    marketCoordinator.updateMarketView(true);
  };

  window._setPassiveView = (view) => {
    marketCoordinator.currentPassiveView = view;
  };

  window.openMarketNewsTab = () => {
    viewManager.switchView('news');
  };

  window.setNewsFilter = (filter) => {
    marketNewsSubView.setFilter(filter);
  };

  window.setMarketSort = (key) => {
    stockCryptoSubView.setSort(key);
  };

  window.setMarketSectorFilter = (sec) => {
    stockCryptoSubView.setSectorFilter(sec);
  };

  window.resetMarketFilters = () => {
    stockCryptoSubView.resetFilters();
  };

  window.triggerManualMarketNews = () => {
    marketNewsSubView.triggerManualNews();
  };
}

export default viewManager;
