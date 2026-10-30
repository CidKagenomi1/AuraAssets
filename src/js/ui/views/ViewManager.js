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
import roleManager from '../../core/RoleManager.js';
import passiveIncomeManager from '../../trading/PassiveIncomeManager.js';
import newsManager from '../../core/NewsManager.js';
import mutualFundManager from '../../trading/MutualFundManager.js';
import tradingSignalManager from '../../trading/TradingSignalManager.js';

// Modular Sub-Views
import { SECTOR_COLORS, buildStockRow, buildCryptoRow, buildPortfolioRow, getVolatilityLevel, buildMarketTableHeader } from './MarketRows.js';
import { updateMobileBottomNav, showMobileMenu } from './MobileNav.js';
import { renderPassiveIncomeView, bindPassiveIncomeButtons } from './PassiveIncomeView.js';

export class ViewManager {
  constructor() {
    this.currentView = 'home';
    this.homeSections = [
      '#balance-card',
      '#market-pulse-widget',
      '#top-movers-widget',
      '#home-news-snapshot-widget',
      '#home-cashflow-career-row',
      '.quick-actions',
      '#footer-dashboard-grid'
    ];
    this.marketFilter = '';
    this.marketSort = { key: 'default', dir: 'asc' };
    this.marketTrendFilter = 'all';
    this.marketRiskFilter = 'all';
    this.marketSectorFilter = 'all';
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
      const modalViews = ['savings', 'loan', 'finance', 'guide', 'trading-signal', 'donate'];
      if (modalViews.includes(this.currentView)) {
        this.switchView('home');
      }
    });

    // Initialize mobile bottom nav
    this.updateMobileBottomNav(this.currentView);

    // Listen for updates
    gameState.on('stocksUpdate', () => this.updateMarketView());
    gameState.on('cryptoUpdate', () => this.updateMarketView());
    gameState.on('mutualFundsUpdate', () => this.updateMarketView());
    gameState.on('newsUpdate', () => {
      if (this.currentView === 'news') {
        this.renderNewsPageView();
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
      highlightedView = this.activeDynamicTab === 'portfolio' ? 'portfolio' : (this.activeDynamicTab === 'commodity' ? 'commodity' : 'home');
    } else if (['loan', 'savings', 'history', 'trading-signal', 'guide', 'donate'].includes(viewToHighlight)) {
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
    const prevView = this.currentView;

    // View-specific modal triggers
    switch(view) {
      case 'commodity':
        import('../../trading/panels/CommodityPanel.js').then(module => {
          module.default.show();
        });
        this.updateNavState(this.currentView);
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
        this.updateMarketView();
        break;
      case 'news':
        this.renderNewsPageView();
        break;
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
    }

    document.dispatchEvent(new CustomEvent('viewChanged', { detail: { view, prevView } }));
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

        if (this.currentMarketTab !== tabId) {
          this.currentMarketTab = tabId;
          // Reset sector filter so stock sectors do not incorrectly hide crypto assets and vice versa
          this.marketSectorFilter = 'all';
        }

        if (tabId === 'passive-income') {
          this._renderPassiveIncome = true;
        }

        this.updateMarketView();
      });
    });
  }

  bindMarketSmartControls() {
    const searchInput = document.getElementById('market-search');
    const clearBtn = document.getElementById('btn-clear-market-search');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.marketFilter = e.target.value.toLowerCase().trim();
        if (clearBtn) {
          clearBtn.style.display = this.marketFilter ? 'block' : 'none';
        }
        this.updateMarketView();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        this.marketFilter = '';
        clearBtn.style.display = 'none';
        this.updateMarketView();
      });
    }

    const trendSelect = document.getElementById('market-filter-trend');
    if (trendSelect) {
      trendSelect.addEventListener('change', (e) => {
        this.marketTrendFilter = e.target.value;
        this.updateMarketView();
      });
    }

    const riskSelect = document.getElementById('market-filter-risk');
    if (riskSelect) {
      riskSelect.addEventListener('change', (e) => {
        this.marketRiskFilter = e.target.value;
        this.updateMarketView();
      });
    }

    const resetBtn = document.getElementById('btn-reset-market-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }

    document.querySelectorAll('.btn-sort').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setSort(btn.dataset.sort);
      });
    });
  }

  setSort(key) {
    if (key === 'default') {
      this.marketSort = { key: 'default', dir: 'asc' };
    } else if (this.marketSort.key === key) {
      this.marketSort.dir = this.marketSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      this.marketSort.key = key;
      this.marketSort.dir = (key === 'name' || key === 'sector') ? 'asc' : 'desc';
    }

    document.querySelectorAll('.btn-sort').forEach(b => {
      b.classList.toggle('active', b.dataset.sort === this.marketSort.key);
    });

    this.updateMarketView();
  }

  setSectorFilter(sec) {
    this.marketSectorFilter = (this.marketSectorFilter === sec) ? 'all' : sec;
    this.updateMarketView();
  }

  resetFilters() {
    this.marketFilter = '';
    this.marketTrendFilter = 'all';
    this.marketRiskFilter = 'all';
    this.marketSectorFilter = 'all';
    this.marketSort = { key: 'default', dir: 'asc' };

    const searchInput = document.getElementById('market-search');
    if (searchInput) searchInput.value = '';

    const clearBtn = document.getElementById('btn-clear-market-search');
    if (clearBtn) clearBtn.style.display = 'none';

    const trendSelect = document.getElementById('market-filter-trend');
    if (trendSelect) trendSelect.value = 'all';

    const riskSelect = document.getElementById('market-filter-risk');
    if (riskSelect) riskSelect.value = 'all';

    document.querySelectorAll('.btn-sort').forEach(b => {
      b.classList.toggle('active', b.dataset.sort === 'default');
    });

    this.updateMarketView();
  }

  renderSectorPills(assets, type = 'stock') {
    const container = document.getElementById('market-sector-pills');
    if (!container) return;

    const sectorCounts = {};
    assets.forEach(asset => {
      const sec = asset.sector || (type === 'crypto' ? asset.category : 'Lainnya') || 'Lainnya';
      sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
    });

    const sectors = Object.keys(sectorCounts).sort();
    const isAllActive = this.marketSectorFilter === 'all';

    let html = `
      <button type="button" class="sector-pill ${isAllActive ? 'active' : ''}" onclick="window.setMarketSectorFilter('all')">
        <span>Semua</span>
        <span class="sector-pill-count">${assets.length}</span>
      </button>
    `;

    sectors.forEach(sec => {
      const active = this.marketSectorFilter === sec;
      const count = sectorCounts[sec];
      const color = SECTOR_COLORS[sec] || '#38bdf8';

      html += `
        <button type="button" class="sector-pill ${active ? 'active' : ''}" onclick="window.setMarketSectorFilter('${sec.replace(/'/g, "\\'")}')" style="${active ? `border-color:${color}; background:${color}22; color:#fff;` : ''}">
          <span class="sector-pill-dot" style="background:${color}"></span>
          <span>${sec}</span>
          <span class="sector-pill-count">${count}</span>
        </button>
      `;
    });

    container.innerHTML = html;
  }

  filterAndSortMarketItems(items, type = 'stock') {
    let result = [...items];
    const isStock = type === 'stock';

    // 1. Text Search (symbol, name, sector)
    if (this.marketFilter) {
      const q = this.marketFilter;
      result = result.filter(item => {
        const symbol = (item.symbol || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        const sector = (item.sector || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        return symbol.includes(q) || name.includes(q) || sector.includes(q) || category.includes(q);
      });
    }

    // 2. Trend Filter
    if (this.marketTrendFilter !== 'all') {
      if (this.marketTrendFilter === 'gainers') {
        result = result.filter(item => (item.change || 0) > 0);
      } else if (this.marketTrendFilter === 'losers') {
        result = result.filter(item => (item.change || 0) < 0);
      } else if (this.marketTrendFilter === 'signals') {
        const activeSignalIds = new Set((tradingSignalManager?.getSignals?.() || []).map(s => s.id));
        result = result.filter(item => activeSignalIds.has(item.symbol));
      } else if (this.marketTrendFilter === 'owned') {
        const ownedSymbols = isStock
          ? new Set((stockMarket.getPortfolio() || []).map(h => h.symbol))
          : new Set((cryptoMarket.getWallet() || []).map(w => w.symbol));
        result = result.filter(item => ownedSymbols.has(item.symbol));
      }
    }

    // 3. Volatility / Risk Filter
    if (this.marketRiskFilter !== 'all') {
      result = result.filter(item => {
        const volInfo = getVolatilityLevel(item, type);
        return volInfo.key === this.marketRiskFilter;
      });
    }

    // 4. Sector Filter
    if (this.marketSectorFilter !== 'all') {
      result = result.filter(item => {
        const sec = item.sector || (type === 'crypto' ? item.category : '') || '';
        return sec === this.marketSectorFilter;
      });
    }

    // 5. Sorting
    if (this.marketSort.key !== 'default') {
      const factor = this.marketSort.dir === 'asc' ? 1 : -1;
      const key = this.marketSort.key;

      result.sort((a, b) => {
        if (key === 'name') {
          return (a.symbol || '').localeCompare(b.symbol || '') * factor;
        }
        if (key === 'sector') {
          const secA = a.sector || (type === 'crypto' ? a.category : '') || '';
          const secB = b.sector || (type === 'crypto' ? b.category : '') || '';
          return secA.localeCompare(secB) * factor;
        }
        if (key === 'volatility') {
          const volA = typeof a.volatility === 'number' ? a.volatility : 0.02;
          const volB = typeof b.volatility === 'number' ? b.volatility : 0.02;
          return (volA - volB) * factor;
        }
        if (key === 'price') {
          return ((a.price || 0) - (b.price || 0)) * factor;
        }
        if (key === 'change') {
          return ((a.change || 0) - (b.change || 0)) * factor;
        }
        return 0;
      });
    }

    return result;
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
    const badgeReksadana = document.getElementById('badge-reksadana');
    const badgePassiveIncome = document.getElementById('badge-passive-income');
    const badgePortfolio = document.getElementById('badge-portfolio');

    if (badgeStocks) badgeStocks.textContent = allStocks.length;
    if (badgeCrypto) badgeCrypto.textContent = allCryptos.length;
    if (badgeReksadana) badgeReksadana.textContent = mutualFundManager.getFunds().length;
    if (badgePassiveIncome) badgePassiveIncome.textContent = passiveIncomeCount;
    if (badgePortfolio) badgePortfolio.textContent = portfolioCount;

    // Toggle search controls bar visibility
    const searchBar = document.getElementById('market-search-bar-container');
    if (searchBar) {
      if (this.currentMarketTab === 'passive-income' || this.currentMarketTab === 'reksadana') {
        searchBar.style.display = 'none';
      } else {
        searchBar.style.display = 'flex';
      }
    }

    if (this.currentView !== 'market') return;

    // Render Sector Pills for active tab
    if (this.currentMarketTab === 'stocks') {
      this.renderSectorPills(allStocks, 'stock');
    } else if (this.currentMarketTab === 'crypto') {
      this.renderSectorPills(allCryptos, 'crypto');
    }

    // Update stocks list
    const stocksList = document.getElementById('market-stocks-list');
    let displayedStocksCount = 0;
    if (stocksList && this.currentMarketTab === 'stocks') {
      const stocks = this.filterAndSortMarketItems(allStocks, 'stock');
      displayedStocksCount = stocks.length;
      const tableHeader = buildMarketTableHeader('stock', this.marketSort);
      const rowsHTML = stocks.length > 0
        ? stocks.map(s => buildStockRow(s)).join('')
        : `
          <div class="market-empty-state" style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted); background:rgba(255,255,255,0.02); border-radius:8px; border:1px dashed rgba(255,255,255,0.1);">
            <div style="font-size:2rem; margin-bottom:0.5rem;">🔍</div>
            <div style="font-weight:700; color:#fff; margin-bottom:0.25rem;">Tidak Ada Saham yang Sesuai</div>
            <div style="font-size:0.78rem; margin-bottom:0.85rem;">Tidak ada saham dengan kombinasi pencarian, sektor, atau volatilitas saat ini.</div>
            <button type="button" onclick="window.resetMarketFilters()" style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.4); color:#34d399; padding:5px 12px; border-radius:6px; font-size:0.75rem; font-weight:700; cursor:pointer;">↺ Reset Semua Filter</button>
          </div>
        `;
      stocksList.innerHTML = tableHeader + rowsHTML;
    }

    // Update crypto list
    const cryptoList = document.getElementById('market-crypto-list');
    let displayedCryptoCount = 0;
    if (cryptoList && this.currentMarketTab === 'crypto') {
      const cryptos = this.filterAndSortMarketItems(allCryptos, 'crypto');
      displayedCryptoCount = cryptos.length;
      const tableHeader = buildMarketTableHeader('crypto', this.marketSort);
      const rowsHTML = cryptos.length > 0
        ? cryptos.map(c => buildCryptoRow(c)).join('')
        : `
          <div class="market-empty-state" style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted); background:rgba(255,255,255,0.02); border-radius:8px; border:1px dashed rgba(255,255,255,0.1);">
            <div style="font-size:2rem; margin-bottom:0.5rem;">🔍</div>
            <div style="font-weight:700; color:#fff; margin-bottom:0.25rem;">Tidak Ada Kripto yang Sesuai</div>
            <div style="font-size:0.78rem; margin-bottom:0.85rem;">Tidak ada koin dengan kombinasi pencarian, sektor, atau volatilitas saat ini.</div>
            <button type="button" onclick="window.resetMarketFilters()" style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.4); color:#34d399; padding:5px 12px; border-radius:6px; font-size:0.75rem; font-weight:700; cursor:pointer;">↺ Reset Semua Filter</button>
          </div>
        `;
      cryptoList.innerHTML = tableHeader + rowsHTML;
    }

    // Update Filter Summary Bar (Counter & Reset button)
    const countText = document.getElementById('market-filter-count-text');
    const resetBtn = document.getElementById('btn-reset-market-filters');
    const isFiltered = Boolean(
      this.marketFilter ||
      this.marketTrendFilter !== 'all' ||
      this.marketRiskFilter !== 'all' ||
      this.marketSectorFilter !== 'all' ||
      this.marketSort.key !== 'default'
    );

    if (resetBtn) {
      resetBtn.style.display = isFiltered ? 'inline-block' : 'none';
    }

    if (countText && (this.currentMarketTab === 'stocks' || this.currentMarketTab === 'crypto')) {
      const isStockTab = this.currentMarketTab === 'stocks';
      const totalCount = isStockTab ? allStocks.length : allCryptos.length;
      const displayCount = isStockTab ? displayedStocksCount : displayedCryptoCount;
      const assetLabel = isStockTab ? 'saham' : 'kripto';

      if (isFiltered) {
        const filtersUsed = [];
        if (this.marketFilter) filtersUsed.push(`cari: "${this.marketFilter}"`);
        if (this.marketSectorFilter !== 'all') filtersUsed.push(`sektor: ${this.marketSectorFilter}`);
        if (this.marketRiskFilter !== 'all') {
          const riskLabels = { low: 'Volatilitas Rendah', medium: 'Volatilitas Moderat', high: 'Volatilitas Tinggi' };
          filtersUsed.push(riskLabels[this.marketRiskFilter] || this.marketRiskFilter);
        }
        if (this.marketTrendFilter !== 'all') {
          const trendLabels = { gainers: 'Gainers', losers: 'Losers', signals: 'Signal Aktif', owned: 'Dimiliki' };
          filtersUsed.push(trendLabels[this.marketTrendFilter] || this.marketTrendFilter);
        }
        if (this.marketSort.key !== 'default') {
          filtersUsed.push(`sort: ${this.marketSort.key} (${this.marketSort.dir.toUpperCase()})`);
        }
        countText.innerHTML = `Menampilkan <strong style="color:var(--accent-primary);">${displayCount}</strong> dari ${totalCount} ${assetLabel} <span style="opacity:0.75; font-size:0.7rem;">(${filtersUsed.join(', ')})</span>`;
      } else {
        countText.textContent = `Menampilkan semua ${totalCount} ${assetLabel} (lengkap dengan Sektor & Volatilitas)`;
      }
    }

    // Update Mutual Funds (Reksa Dana) list
    const reksadanaList = document.getElementById('market-reksadana-list');
    if (reksadanaList && this.currentMarketTab === 'reksadana') {
      this.renderMutualFundsView(reksadanaList);
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
  // MUTUAL FUNDS (REKSA DANA) VIEW & TRADING
  // =========================================================================

  renderMutualFundsView(container) {
    if (!container) return;
    this.fundsSubTab = this.fundsSubTab || 'reksa_dana';
    this.etfSectorFilter = this.etfSectorFilter || 'ALL';

    const allFunds = mutualFundManager.getFunds();
    const conventionalFunds = allFunds.filter(f => f.category === 'reksa_dana');
    const etfFunds = allFunds.filter(f => f.category === 'etf');
    
    // Total portfolio metrics
    const totalVal = mutualFundManager.getTotalPortfolioValue();
    const totalInvested = allFunds.reduce((sum, f) => sum + f.invested, 0);
    const totalPnl = totalVal - totalInvested;
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const playerBalance = gameState.getBalance();

    // Determine current displayed list
    let displayedFunds = this.fundsSubTab === 'etf' ? etfFunds : conventionalFunds;
    if (this.fundsSubTab === 'etf' && this.etfSectorFilter !== 'ALL') {
      displayedFunds = displayedFunds.filter(f => f.sector === this.etfSectorFilter);
    }

    const etfSectors = ['ALL', 'Indeks Global', 'Teknologi & AI', 'Semikonduktor', 'REITs Properti', 'Pasar Berkembang', 'Kesehatan'];

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- Mutual Funds Portfolio Header Summary -->
        <div class="funds-portfolio-hero" style="background: linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%); border: 1px solid rgba(52, 211, 153, 0.25); border-radius: var(--radius-md); padding: 1.15rem 1.35rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Portofolio Reksa Dana & ETF Anda</span>
            <div style="font-size: 1.75rem; font-weight: 900; color: #34d399; margin: 3px 0 2px 0;">
              $ ${financeManager.formatCurrency(totalVal, true)}
            </div>
            <span style="font-size: 0.72rem; color: var(--text-dim);">
              Modal Pokok: $ ${financeManager.formatCurrency(totalInvested, true)} · Floating P/L: 
              <strong style="color: ${totalPnl >= 0 ? '#10b981' : '#ef4444'};">${totalPnl >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(totalPnl, true)} (${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%)</strong>
            </span>
          </div>

          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 6px 12px; text-align: right;">
              <div style="font-size: 0.68rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Saldo Kas Utama</div>
              <div style="font-size: 0.95rem; font-weight: 800; color: #fff;">$ ${financeManager.formatCurrency(playerBalance, true)}</div>
            </div>
          </div>
        </div>

        <!-- Segmented Tab Switcher (Reksa Dana vs ETF) -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.85rem;">
          <div class="funds-category-bar" style="display: inline-flex; gap: 0.35rem; background: rgba(0,0,0,0.4); padding: 4px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
            <button class="funds-category-toggle ${this.fundsSubTab === 'reksa_dana' ? 'active' : ''}" data-category="reksa_dana" style="
              padding: 8px 18px;
              border-radius: 8px;
              font-size: 0.82rem;
              font-weight: 800;
              cursor: pointer;
              border: none;
              transition: all 0.2s ease;
              background: ${this.fundsSubTab === 'reksa_dana' ? 'var(--accent-primary)' : 'transparent'};
              color: ${this.fundsSubTab === 'reksa_dana' ? '#000' : 'var(--text-muted)'};
            ">
              📦 Reksa Dana Konvensional (${conventionalFunds.length})
            </button>
            <button class="funds-category-toggle ${this.fundsSubTab === 'etf' ? 'active' : ''}" data-category="etf" style="
              padding: 8px 18px;
              border-radius: 8px;
              font-size: 0.82rem;
              font-weight: 800;
              cursor: pointer;
              border: none;
              transition: all 0.2s ease;
              background: ${this.fundsSubTab === 'etf' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent'};
              color: ${this.fundsSubTab === 'etf' ? '#fff' : 'var(--text-muted)'};
            ">
              🌐 Exchange-Traded Funds (ETF) (${etfFunds.length})
            </button>
          </div>

          <div style="font-size: 0.75rem; color: var(--text-dim);">
            ${this.fundsSubTab === 'etf' ? '⚡ Dana indeks berbasis bursa dengan biaya rendah & dividen transparan' : '🛡️ Portofolio terkelola profesional oleh Manajer Investasi'}
          </div>
        </div>

        ${this.fundsSubTab === 'etf' ? `
          <!-- ETF Sector Filter Pills -->
          <div class="etf-sector-pills-bar" style="display: flex; gap: 0.45rem; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;">
            ${etfSectors.map(sec => `
              <button class="etf-sector-pill ${this.etfSectorFilter === sec ? 'active' : ''}" data-sector="${sec}" style="
                padding: 5px 13px;
                border-radius: 20px;
                font-size: 0.72rem;
                font-weight: 700;
                cursor: pointer;
                white-space: nowrap;
                border: 1px solid ${this.etfSectorFilter === sec ? 'rgba(99, 102, 241, 0.8)' : 'rgba(255,255,255,0.08)'};
                background: ${this.etfSectorFilter === sec ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.02)'};
                color: ${this.etfSectorFilter === sec ? '#818cf8' : 'var(--text-muted)'};
                transition: all 0.15s ease;
              ">
                ${sec === 'ALL' ? 'Semua Sektor' : sec}
              </button>
            `).join('')}
          </div>
        ` : ''}

        <!-- Product Cards Grid -->
        <div class="funds-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem;">
          ${displayedFunds.map(f => {
            const hasUnits = f.ownedUnits > 0;
            const up = f.dailyChange >= 0;
            const isSafest = f.id === 'pasar_uang';
            const isETF = f.category === 'etf';
            return `
              <div class="card" style="background: var(--bg-surface); border: 1.5px solid ${isSafest ? 'rgba(16, 185, 129, 0.5)' : (hasUnits ? (isETF ? 'rgba(99, 102, 241, 0.45)' : 'rgba(52, 211, 153, 0.4)') : 'var(--border-color)')}; border-radius: var(--radius-lg); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem; position: relative;">
                
                ${isSafest ? `
                  <div style="position: absolute; top: -10px; left: 16px; background: linear-gradient(90deg, #10b981, #059669); color: #000; font-weight: 800; font-size: 0.65rem; padding: 2px 10px; border-radius: 12px; letter-spacing: 0.02em; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);">
                    ⭐ PALING AMAN & STABIL • PEMULA & SETTLE
                  </div>
                ` : (isETF ? `
                  <div style="position: absolute; top: -10px; left: 16px; background: linear-gradient(90deg, #6366f1, #4f46e5); color: #fff; font-weight: 800; font-size: 0.65rem; padding: 2px 10px; border-radius: 12px; letter-spacing: 0.04em; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);">
                    ETF • ${f.ticker}
                  </div>
                ` : '')}
                
                <div>
                  <!-- Header: Icon, Name & Type -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; gap: 0.5rem; margin-top: 2px;">
                    <div style="display: flex; align-items: center; gap: 0.65rem;">
                      <span style="font-size: 1.6rem;">${f.icon}</span>
                      <div>
                        <div style="font-weight: 800; font-size: 0.95rem; color: #fff; line-height: 1.25;">${f.name}</div>
                        <div style="font-size: 0.7rem; color: var(--text-dim);">${f.manager} · <span style="color: ${isETF ? '#818cf8' : 'var(--text-muted)'}; font-weight: 600;">${f.type}</span></div>
                      </div>
                    </div>
                    <span style="font-size: 0.68rem; font-weight: 800; color: ${f.riskColor}; background: ${f.riskColor}22; border: 1px solid ${f.riskColor}44; padding: 2px 7px; border-radius: 6px; white-space: nowrap;">
                      ${f.risk}
                    </span>
                  </div>

                  <p style="font-size: 0.74rem; color: var(--text-muted); line-height: 1.4; margin: 0 0 0.85rem 0;">
                    ${f.desc}
                  </p>

                  <!-- Metrics: NAV/Price, 1D Change, 1Y Return -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 0.65rem 0.85rem; margin-bottom: 0.85rem;">
                    <div>
                      <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">
                        ${isETF ? 'Harga Bursa / Unit' : 'Nilai Aktiva Bersih (NAV)'}
                      </div>
                      <div style="font-size: 1.05rem; font-weight: 900; color: #fff;">
                        $ ${f.nav.toFixed(isETF ? 2 : 4)}
                        <span style="font-size: 0.72rem; font-weight: 700; color: ${up ? '#10b981' : '#ef4444'};">(${up ? '+' : ''}${f.dailyChange}%)</span>
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Imbal Hasil 1 Thn</div>
                      <div style="font-size: 1.05rem; font-weight: 900; color: #34d399;">
                        ${f.returnAnnual}% p.a.
                      </div>
                    </div>
                  </div>

                  ${isETF ? `
                    <!-- ETF Specific Tags: Expense Ratio & Dividend -->
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(99, 102, 241, 0.05); border: 1px dashed rgba(99, 102, 241, 0.25); border-radius: 6px; padding: 4px 8px; margin-bottom: 0.85rem; font-size: 0.7rem;">
                      <span style="color: var(--text-muted);">Biaya Pengelolaan: <strong style="color: #fff;">${f.expenseRatio || '0.10%'}</strong></span>
                      <span style="color: var(--text-muted);">Dividen Yield: <strong style="color: #34d399;">${f.dividendYield || '-'}</strong></span>
                    </div>
                  ` : ''}

                  <!-- Portfolio Holding Box -->
                  <div style="background: ${hasUnits ? (isETF ? 'rgba(99, 102, 241, 0.1)' : 'rgba(52, 211, 153, 0.08)') : 'rgba(255,255,255,0.02)'}; border: 1px solid ${hasUnits ? (isETF ? 'rgba(99, 102, 241, 0.3)' : 'rgba(52, 211, 153, 0.25)') : 'rgba(255,255,255,0.05)'}; border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.74rem;">
                    ${hasUnits ? `
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="color: var(--text-muted);">Kepemilikan:</span>
                        <strong style="color: #fff;">${f.ownedUnits.toLocaleString()} Lembar/Unit ($ ${financeManager.formatCurrency(f.currentValue, true)})</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted);">Floating P/L:</span>
                        <strong style="color: ${f.pnl >= 0 ? '#10b981' : '#ef4444'};">
                          ${f.pnl >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(f.pnl, true)} (${f.pnlPercent >= 0 ? '+' : ''}${f.pnlPercent.toFixed(2)}%)
                        </strong>
                      </div>
                    ` : `
                      <div style="color: var(--text-dim); text-align: center;">Belum memiliki ${isETF ? 'lembar ETF' : 'unit reksa dana'} ini.</div>
                    `}
                  </div>
                </div>

                <!-- Buy & Sell Buttons -->
                <div class="funds-card-actions" style="display: flex; gap: 0.5rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.85rem;">
                  <button class="btn btn-primary btn-buy-rd" data-id="${f.id}" style="flex: 1; font-weight: 800; font-size: 0.78rem; padding: 8px 0; justify-content: center; ${isETF ? 'background: linear-gradient(135deg, #6366f1, #4f46e5); border: none;' : ''}">
                    + Beli ${isETF ? 'ETF' : 'Unit'}
                  </button>
                  <button class="btn btn-secondary btn-sell-rd" data-id="${f.id}" ${hasUnits ? '' : 'disabled'} style="flex: 1; font-weight: 800; font-size: 0.78rem; padding: 8px 0; justify-content: center; ${hasUnits ? '' : 'opacity: 0.4; cursor: not-allowed;'}">
                    - Jual ${isETF ? 'ETF' : 'Unit'}
                  </button>
                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;

    this.bindMutualFundsEvents(container);
  }

  bindMutualFundsEvents(container) {
    if (!container) return;

    // Category switcher (Reksa Dana vs ETF)
    container.querySelectorAll('.funds-category-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        this.fundsSubTab = btn.dataset.category;
        this.renderMutualFundsView(container);
      });
    });

    // ETF Sector filters
    container.querySelectorAll('.etf-sector-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.etfSectorFilter = btn.dataset.sector;
        this.renderMutualFundsView(container);
      });
    });

    // Buy modal with comprehensive interactive beginner & settled investor suite
    container.querySelectorAll('.btn-buy-rd').forEach(btn => {
      btn.addEventListener('click', () => {
        const fundId = btn.dataset.id;
        const fund = mutualFundManager.getFund(fundId);
        if (!fund) return;
        const playerBal = gameState.getBalance();
        const isSafest = fund.id === 'pasar_uang';

        const modalHTML = `
          <div style="padding: 0.25rem 0;">
            <!-- Header Card: Identity, NAV & Safety Badge -->
            <div style="background: ${isSafest ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.25) 100%)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isSafest ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255,255,255,0.08)'}; border-radius: var(--radius-md); padding: 0.9rem 1.1rem; margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span style="font-size: 2rem;">${fund.icon}</span>
                  <div>
                    <h3 style="font-size: 1.05rem; font-weight: 800; color: #fff; margin: 0 0 2px 0;">${fund.name}</h3>
                    <div style="font-size: 0.72rem; color: var(--text-dim);">${fund.manager} · ${fund.type}</div>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">NAV Terkini</div>
                  <div style="font-size: 1.05rem; font-weight: 900; color: #fff;">$${fund.nav.toFixed(4)}</div>
                </div>
              </div>

              ${isSafest ? `
                <div style="display: flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 7px 10px; margin-top: 0.75rem; font-size: 0.73rem; color: #10b981;">
                  <span style="font-size: 1.15rem; flex-shrink: 0;">🛡️</span>
                  <div>
                    <strong>Paling Aman & Stabil (Anti-Penurunan):</strong> Modal pokok terlindungi dari fluktuasi pasar saham dengan imbal hasil konsisten harian (~5.2% p.a.). Sangat cocok untuk pemula & dana pensiun / settle.
                  </div>
                </div>
              ` : `
                <div style="display: flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 8px; padding: 6px 10px; margin-top: 0.75rem; font-size: 0.72rem; color: var(--text-muted);">
                  <span>🎯</span>
                  <span><strong>Profil:</strong> ${fund.suitability || fund.desc}</span>
                </div>
              `}
            </div>

            <!-- Input Nominal & Saldo Kas Bar -->
            <div style="margin-bottom: 0.85rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">
                  Nominal Pembelian ($ USD)
                </label>
                <span style="font-size: 0.72rem; color: var(--text-dim);">
                  Saldo Kas: <strong style="color: #fff;">$ ${financeManager.formatCurrency(playerBal, true)}</strong>
                </span>
              </div>

              <div style="position: relative;">
                <span style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 1.15rem; font-weight: 800; color: var(--accent-primary);">$</span>
                <input type="number" id="input-rd-buy-amt" value="${Math.max(fund.minBuy, 1000)}" min="${fund.minBuy}" step="50" style="
                  width: 100%;
                  background: rgba(0, 0, 0, 0.35);
                  border: 1.5px solid var(--border-color);
                  border-radius: var(--radius-md);
                  padding: 10px 14px 10px 32px;
                  color: #fff;
                  font-weight: 800;
                  font-size: 1.25rem;
                  letter-spacing: -0.01em;
                  box-sizing: border-box;
                ">
              </div>

              <!-- Real-time Warning or Error Badge -->
              <div id="rd-buy-feedback" style="margin-top: 6px; font-size: 0.72rem; display: none;"></div>
            </div>

            <!-- Allocation Presets & Quick Nominal Increment Chips -->
            <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem;">
              <!-- Percent Presets -->
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn btn-secondary btn-sm btn-rd-preset-min" style="flex: 1; font-size: 0.68rem; padding: 5px 0; justify-content: center;">Min ($ ${fund.minBuy})</button>
                <button class="btn btn-secondary btn-sm btn-rd-pct" data-pct="0.25" style="flex: 1; font-size: 0.68rem; padding: 5px 0; justify-content: center;">25%</button>
                <button class="btn btn-secondary btn-sm btn-rd-pct" data-pct="0.50" style="flex: 1; font-size: 0.68rem; padding: 5px 0; justify-content: center;">50%</button>
                <button class="btn btn-secondary btn-sm btn-rd-pct" data-pct="0.75" style="flex: 1; font-size: 0.68rem; padding: 5px 0; justify-content: center;">75%</button>
                <button class="btn btn-secondary btn-sm btn-rd-preset-max" style="flex: 1; font-size: 0.68rem; padding: 5px 0; justify-content: center; font-weight: 800; color: #10b981;">Maks</button>
              </div>

              <!-- Quick Nominal Boost Pills -->
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn btn-secondary btn-sm btn-rd-add" data-add="250" style="flex: 1; font-size: 0.66rem; padding: 4px 0; justify-content: center; opacity: 0.85;">+$250</button>
                <button class="btn btn-secondary btn-sm btn-rd-add" data-add="500" style="flex: 1; font-size: 0.66rem; padding: 4px 0; justify-content: center; opacity: 0.85;">+$500</button>
                <button class="btn btn-secondary btn-sm btn-rd-add" data-add="1000" style="flex: 1; font-size: 0.66rem; padding: 4px 0; justify-content: center; opacity: 0.85;">+$1K</button>
                <button class="btn btn-secondary btn-sm btn-rd-add" data-add="5000" style="flex: 1; font-size: 0.66rem; padding: 4px 0; justify-content: center; opacity: 0.85;">+$5K</button>
              </div>
            </div>

            <!-- Live Return & Growth Simulation Box -->
            <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 0.85rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                <span style="font-size: 0.7rem; font-weight: 800; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 4px;">
                  <span>📈</span> Proyeksi Hasil Investasi (${fund.returnAnnual}% p.a.)
                </span>
                <span style="font-size: 0.66rem; color: #10b981; font-weight: 700;">Bebas Biaya Admin (0% Fee)</span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.6rem;">
                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 6px; padding: 6px 10px;">
                  <div style="font-size: 0.63rem; color: var(--text-muted); font-weight: 600;">Estimasi Hasil 1 Bulan</div>
                  <div id="sim-return-1m" style="font-size: 0.95rem; font-weight: 800; color: #10b981;">+$ 0.00</div>
                </div>
                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 6px; padding: 6px 10px;">
                  <div style="font-size: 0.63rem; color: var(--text-muted); font-weight: 600;">Estimasi Hasil 1 Tahun</div>
                  <div id="sim-return-1y" style="font-size: 0.95rem; font-weight: 800; color: #34d399;">+$ 0.00</div>
                </div>
              </div>

              <!-- Total Projected Value & Units Breakdown -->
              <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px dashed rgba(255, 255, 255, 0.08); font-size: 0.74rem;">
                <span style="color: var(--text-muted);">Proyeksi Total Nilai 1 Tahun:</span>
                <strong id="sim-total-1y" style="color: #fff; font-size: 0.95rem;">$ 0.00</strong>
              </div>
            </div>

            <!-- Transaction Summary: Units & Remaining Cash -->
            <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 0.65rem 0.9rem; margin-bottom: 0.85rem; font-size: 0.72rem; display: flex; flex-direction: column; gap: 3px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-dim);">Estimasi Unit Didapat:</span>
                <strong id="preview-rd-units" style="color: #fff;">0 Unit</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-dim);">Sisa Saldo Kas Utama:</span>
                <strong id="preview-rd-remaining" style="color: var(--text-muted);">$ ${financeManager.formatCurrency(playerBal, true)}</strong>
              </div>
            </div>

            <!-- Key Investment Advantages Checklist -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem 0.6rem; margin-bottom: 1.15rem; font-size: 0.68rem; color: var(--text-dim);">
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="color: #10b981; font-weight: 800;">✓</span> 100% Bebas Biaya Beli (0% Fee)
              </div>
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="color: #10b981; font-weight: 800;">✓</span> Likuid, bebas dicairkan kapan saja
              </div>
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="color: #10b981; font-weight: 800;">✓</span> Bunga harian otomatis terakumulasi
              </div>
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="color: #10b981; font-weight: 800;">✓</span> Dikelola manajer investasi profesional
              </div>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 0.75rem;">
              <button class="btn btn-secondary btn-cancel-rd-modal" style="flex: 1; font-weight: 700;">Batal</button>
              <button class="btn btn-primary" id="btn-confirm-rd-buy" style="flex: 1.5; font-weight: 800; background: #10b981; border-color: #10b981;">
                Beli Sekarang
              </button>
            </div>
          </div>
        `;

        ui.showModal({
          title: 'Investasi Reksa Dana',
          content: modalHTML
        });

        const inputAmt = document.getElementById('input-rd-buy-amt');
        const previewUnitsEl = document.getElementById('preview-rd-units');
        const previewRemainingEl = document.getElementById('preview-rd-remaining');
        const feedbackEl = document.getElementById('rd-buy-feedback');
        const confirmBtn = document.getElementById('btn-confirm-rd-buy');
        const simReturn1mEl = document.getElementById('sim-return-1m');
        const simReturn1yEl = document.getElementById('sim-return-1y');
        const simTotal1yEl = document.getElementById('sim-total-1y');

        const updateBuySimulation = () => {
          const val = parseFloat(inputAmt?.value) || 0;
          const u = fund.nav > 0 ? (val / fund.nav).toFixed(4) : '0';
          const annualRate = (fund.returnAnnual || 5.0) / 100;
          const return1y = val * annualRate;
          const return1m = val * (annualRate / 12);
          const total1y = val + return1y;
          const remaining = Math.max(0, playerBal - val);

          if (previewUnitsEl) {
            previewUnitsEl.textContent = `${parseFloat(u).toLocaleString()} Unit (@ NAV $${fund.nav.toFixed(4)})`;
          }
          if (previewRemainingEl) {
            previewRemainingEl.textContent = `$ ${financeManager.formatCurrency(remaining, true)}`;
          }
          if (simReturn1mEl) {
            simReturn1mEl.textContent = `+$ ${financeManager.formatCurrency(return1m, true)}`;
          }
          if (simReturn1yEl) {
            simReturn1yEl.textContent = `+$ ${financeManager.formatCurrency(return1y, true)} (+${fund.returnAnnual}%)`;
          }
          if (simTotal1yEl) {
            simTotal1yEl.textContent = `$ ${financeManager.formatCurrency(total1y, true)}`;
          }

          // Validation & feedback
          if (confirmBtn) {
            if (val < fund.minBuy) {
              if (feedbackEl) {
                feedbackEl.style.display = 'block';
                feedbackEl.style.color = '#f59e0b';
                feedbackEl.innerHTML = `⚠️ Minimal pembelian adalah $ ${financeManager.formatCurrency(fund.minBuy)}`;
              }
              confirmBtn.disabled = true;
              confirmBtn.style.opacity = '0.5';
              confirmBtn.textContent = `Minimal $ ${financeManager.formatCurrency(fund.minBuy)}`;
            } else if (val > playerBal) {
              if (feedbackEl) {
                feedbackEl.style.display = 'block';
                feedbackEl.style.color = '#ef4444';
                feedbackEl.innerHTML = `❌ Saldo kas utama Anda tidak mencukupi ($ ${financeManager.formatCurrency(playerBal, true)})`;
              }
              confirmBtn.disabled = true;
              confirmBtn.style.opacity = '0.5';
              confirmBtn.textContent = 'Saldo Tidak Cukup';
            } else {
              if (feedbackEl) {
                feedbackEl.style.display = 'none';
              }
              confirmBtn.disabled = false;
              confirmBtn.style.opacity = '1';
              confirmBtn.textContent = `Beli Sekarang ($ ${financeManager.formatCurrency(val, true)})`;
            }
          }
        };

        inputAmt?.addEventListener('input', updateBuySimulation);
        updateBuySimulation();

        // Preset minimum
        document.querySelector('.btn-rd-preset-min')?.addEventListener('click', () => {
          if (inputAmt) {
            inputAmt.value = fund.minBuy;
            updateBuySimulation();
          }
        });

        // Preset maximum
        document.querySelector('.btn-rd-preset-max')?.addEventListener('click', () => {
          if (inputAmt) {
            inputAmt.value = Math.max(fund.minBuy, Math.floor(playerBal));
            updateBuySimulation();
          }
        });

        // Preset percentages (25%, 50%, 75%)
        document.querySelectorAll('.btn-rd-pct').forEach(b => {
          b.addEventListener('click', () => {
            const pct = parseFloat(b.dataset.pct) || 0;
            const amt = Math.max(fund.minBuy, Math.floor(playerBal * pct));
            if (inputAmt) {
              inputAmt.value = amt;
              updateBuySimulation();
            }
          });
        });

        // Quick incremental additions (+$250, +$500, +$1K, +$5K)
        document.querySelectorAll('.btn-rd-add').forEach(b => {
          b.addEventListener('click', () => {
            const addVal = parseFloat(b.dataset.add) || 0;
            const currVal = parseFloat(inputAmt?.value) || 0;
            const targetVal = Math.min(Math.floor(playerBal), currVal + addVal);
            if (inputAmt) {
              inputAmt.value = targetVal;
              updateBuySimulation();
            }
          });
        });

        document.querySelectorAll('.btn-cancel-rd-modal').forEach(b => {
          b.addEventListener('click', () => ui.closeModal());
        });

        document.getElementById('btn-confirm-rd-buy')?.addEventListener('click', () => {
          const amt = parseFloat(inputAmt?.value) || 0;
          try {
            const res = mutualFundManager.buy(fundId, amt);
            ui.closeModal();
            ui.success(`Berhasil membeli ${res.unitsBought.toLocaleString()} unit ${res.fund.name}! Nilai investasi kini aktif bertumbuh.`, 'Pembelian Reksa Dana Sukses');
            this.updateMarketView();
          } catch (err) {
            ui.error(err.message);
          }
        });
      });
    });

    // Sell modal
    container.querySelectorAll('.btn-sell-rd').forEach(btn => {
      btn.addEventListener('click', () => {
        const fundId = btn.dataset.id;
        const fund = mutualFundManager.getFund(fundId);
        if (!fund || fund.ownedUnits <= 0) return;

        const modalHTML = `
          <div style="padding: 0.5rem 0;">
            <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 1rem; background: rgba(255,255,255,0.03); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.06);">
              <span style="font-size: 1.8rem;">${fund.icon}</span>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; color: #fff; margin: 0;">Jual Unit: ${fund.name}</h3>
                <span style="font-size: 0.72rem; color: var(--text-dim);">NAV: $${fund.nav.toFixed(4)} · Kepemilikan: ${fund.ownedUnits.toLocaleString()} Unit ($ ${financeManager.formatCurrency(fund.currentValue, true)})</span>
              </div>
            </div>

            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.75rem; color: var(--text-muted); font-weight: 700; margin-bottom: 4px;">
                Jumlah Unit Penjualan
              </label>
              <input type="number" id="input-rd-sell-units" value="${fund.ownedUnits}" min="0.0001" max="${fund.ownedUnits}" step="any" style="
                width: 100%;
                background: rgba(255,255,255,0.05);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                padding: 10px 14px;
                color: #fff;
                font-weight: 800;
                font-size: 1.1rem;
              ">
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-dim); margin-top: 4px;">
                <span>Maks: ${fund.ownedUnits.toLocaleString()} Unit</span>
                <span id="preview-rd-cash" style="color: #10b981; font-weight: 700;">Estimasi Kas: $ 0</span>
              </div>
            </div>

            <div style="display: flex; gap: 0.4rem; margin-bottom: 1.25rem;">
              <button class="btn btn-secondary btn-sm btn-rd-sell-pct" data-pct="0.25" style="font-size: 0.7rem;">25%</button>
              <button class="btn btn-secondary btn-sm btn-rd-sell-pct" data-pct="0.5" style="font-size: 0.7rem;">50%</button>
              <button class="btn btn-secondary btn-sm btn-rd-sell-pct" data-pct="0.75" style="font-size: 0.7rem;">75%</button>
              <button class="btn btn-secondary btn-sm btn-rd-sell-pct" data-pct="1" style="font-size: 0.7rem;">100% (Semua)</button>
            </div>

            <div style="display: flex; gap: 0.75rem;">
              <button class="btn btn-secondary btn-cancel-rd-modal" style="flex: 1; font-weight: 700;">Batal</button>
              <button class="btn btn-danger" id="btn-confirm-rd-sell" style="flex: 1; font-weight: 800;">Jual & Cairkan ke Kas</button>
            </div>
          </div>
        `;

        ui.showModal({
          title: 'Jual Unit Reksa Dana',
          content: modalHTML
        });

        const inputUnits = document.getElementById('input-rd-sell-units');
        const previewCashEl = document.getElementById('preview-rd-cash');

        const updateSellPreview = () => {
          const u = parseFloat(inputUnits?.value) || 0;
          const cash = Math.floor(u * fund.nav);
          if (previewCashEl) previewCashEl.textContent = `Estimasi Kas: $ ${financeManager.formatCurrency(cash, true)}`;
        };

        inputUnits?.addEventListener('input', updateSellPreview);
        updateSellPreview();

        document.querySelectorAll('.btn-rd-sell-pct').forEach(b => {
          b.addEventListener('click', () => {
            const pct = parseFloat(b.dataset.pct);
            if (inputUnits) {
              inputUnits.value = +(fund.ownedUnits * pct).toFixed(4);
              updateSellPreview();
            }
          });
        });

        document.querySelectorAll('.btn-cancel-rd-modal').forEach(b => {
          b.addEventListener('click', () => ui.closeModal());
        });

        document.getElementById('btn-confirm-rd-sell')?.addEventListener('click', () => {
          const u = parseFloat(inputUnits?.value) || 0;
          try {
            const res = mutualFundManager.sell(fundId, u);
            ui.closeModal();
            ui.success(`Penjualan berhasil! Dana +$ ${financeManager.formatCurrency(res.payoutCash)} telah masuk ke kas utama.`, 'Penjualan Reksa Dana');
            this.updateMarketView();
          } catch (err) {
            ui.error(err.message);
          }
        });
      });
    });
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

  renderNewsPageView() {
    this.renderNewsView();
  }

  renderNewsView() {
    const container = document.getElementById('news-page-container') || document.getElementById('market-news-list');
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
    viewManager.switchView('news');
  };

  window.setNewsFilter = (filter) => {
    viewManager.newsTabFilter = filter;
    viewManager.renderNewsView();
  };

  window.setMarketSort = (key) => {
    viewManager.setSort(key);
  };

  window.setMarketSectorFilter = (sec) => {
    viewManager.setSectorFilter(sec);
  };

  window.resetMarketFilters = () => {
    viewManager.resetFilters();
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
