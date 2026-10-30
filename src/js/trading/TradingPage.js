/**
 * TradingPage.js - Modular Full-Screen Trading Terminal Orchestrator
 * Coordinates:
 *  - ChartEngine: Plotly.js chart display (Line / Candlestick & Volume toggle)
 *  - CandleGenerator: Mathematical OHLC series generator across timeframes (1h, 1d, 1w, 1m)
 *  - OrderPanel: Order form execution (Market/Limit), allocation sliders, position cards
 *  - TradeHistoryPanel: Transaction ledger, filters, and high-res Canvas PNG report generators
 *  - AssetSearchModal: Live query asset search and sector recommendations
 */

import stockMarket from './StockMarket.js';
import cryptoMarket from './CryptoMarket.js';
import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import { slideInFromRight } from '../ui/Animations.js';
import ChartEngine from './ChartEngine.js';
import candleGenerator from './CandleGenerator.js';
import orderPanel from './panels/OrderPanel.js';
import tradeHistoryPanel from './panels/TradeHistoryPanel.js';
import assetSearchModal from './panels/AssetSearchModal.js';
import { Icons } from '../ui/Icons.js';

class TradingPage {
  constructor() {
    this.currentAsset = null;
    this.assetType = null;
    this.priceHistory = [];
    this.updateInterval = null;
    this.activeTimeframe = '1d';
    this.chart = null;
    this._resizeListener = null;
  }

  /**
   * Helper to fetch active asset object from market
   */
  getAsset() {
    if (!this.currentAsset) return null;
    const isStock = this.assetType === 'stock' || this.assetType === 'stocks';
    const asset = isStock
      ? stockMarket.getStock(this.currentAsset)
      : cryptoMarket.getCrypto(this.currentAsset);
    if (asset && !asset.symbol) {
      asset.symbol = this.currentAsset;
    }
    return asset;
  }

  /**
   * Open trading terminal for a specific asset
   * @param {string} symbol - Asset symbol (e.g. 'AAPL', 'BTC')
   * @param {'stock' | 'crypto'} type - Market type
   */
  open(symbol, type = 'stock') {
    this.currentAsset = symbol;
    this.assetType = type === 'stocks' ? 'stock' : type;

    const asset = this.getAsset();
    if (!asset) {
      ui.error('Asset not found');
      return;
    }

    // Synthesize history if insufficient
    candleGenerator.generatePriceHistory(asset, 300);
    this.priceHistory = [...(asset.priceHistory || [])];

    this.render(asset);
    document.body.classList.add('trading-page-active');

    setTimeout(() => {
      const page = document.getElementById('trading-page');
      if (page) slideInFromRight(page);
      this.startRealTimeUpdates();
    }, 50);
  }

  /**
   * Render trading terminal layout & subpanels
   */
  render(asset) {
    const initialVol = Math.random() * 1e9;
    const high24h = asset.high24h || asset.price * 1.04;
    const low24h = asset.low24h || asset.price * 0.96;
    const obRatio = this.getOrderBookRatio(asset, this.currentAsset, this.assetType);

    const tradingPageHTML = `
      <div id="trading-page" class="trading-page" style="position: absolute; inset: 0; display: flex; flex-direction: column; background: var(--bg-main); z-index: 1000; overflow: hidden; border-radius: 0;">

        <!-- ══ TOP ASSET HEADER (IDENTITAS SAHAM / TOKEN DI ATAS CHART) ════════════════ -->
        <div class="trading-top-asset-header">
          <div class="asset-info-left">
            <button id="btn-search-asset-topbar" class="btn-back" style="height: 38px; display: flex; align-items: center; gap: 0.45rem; padding: 0 0.75rem; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-main); font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all var(--transition); flex-shrink: 0;" title="Cari Aset (Pindah Chart)">
              <span style="font-size: 1.25rem;">${this.assetType === 'stock' ? stockMarket.getStockIcon(asset.sector) : asset.icon}</span>
              <span style="font-weight: 800;">${this.currentAsset}</span>
              <span style="opacity: 0.6; display: inline-flex; align-items: center; margin-left: 2px;">${Icons.chevronDown(12)}</span>
            </button>
            <div style="display: flex; flex-direction: column; min-width: 0; overflow: hidden;">
              <span style="font-size: 0.85rem; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 125px;">${asset.name}</span>
              <span style="font-size: 0.66rem; font-weight: 600; color: var(--accent-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 125px;" title="${asset.category || asset.sector || ''}">
                ${asset.category || asset.sector || (this.assetType === 'stock' ? 'Equities' : 'Crypto')}
              </span>
            </div>
          </div>

          <div class="asset-price-right">
            <div style="display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; min-width: max-content;">
              <div id="strip-price" style="font-size: 1.15rem; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; white-space: nowrap;">
                ${this.formatPrice(asset.price)}
              </div>
              <div id="strip-change" style="
                font-size: 0.72rem;
                font-weight: 700;
                padding: 1px 6px;
                border-radius: 4px;
                white-space: nowrap;
                background: ${(asset.change || 0) >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
                color: ${(asset.change || 0) >= 0 ? '#10b981' : '#ef4444'};
              ">
                ${(asset.change || 0) >= 0 ? '+' : ''}${(asset.change || 0).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        <!-- ══ MAIN BODY COLUMNS ══════════════════════════════════════ -->
        <div id="trading-main-layout" class="trading-main-layout">
          
          <!-- LEFT COLUMN: CHART & TRADE HISTORY -->
          <div class="trading-left-col">
            
            <!-- Professional Trading Chart Card with Strict Overflow Containment -->
            <div class="trading-chart-card" style="
              background:
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px),
                rgba(0,0,0,0.25);
              background-size: 40px 40px;
              border: 1px solid var(--border-color);
              border-radius: var(--radius-lg);
              padding: 1.15rem;
              margin-bottom: 1.5rem;
              box-shadow: 0 10px 30px rgba(0,0,0,0.3);
              width: 100%;
              max-width: 100%;
              box-sizing: border-box;
              overflow: hidden;
            ">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                  <div style="font-size: 0.8rem; font-weight: 800; color: white; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
                    <span style="color: var(--accent-primary); display: inline-flex; align-items: center;">${Icons.chart(16, 'var(--accent-primary)')}</span> Grafik Pasar Interaktif
                  </div>
                  <!-- Touch / Hover Price Marker Info -->
                  <div id="chart-hover-marker-info" style="display: none; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 2px 8px; font-size: 0.72rem;">
                    <span id="chart-hover-time" style="color: var(--text-muted);">--:--</span>
                    <span id="chart-hover-price" style="font-weight: 800; color: #10b981;">$ --</span>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                   <!-- Timeframe Toggle: 1h, 1d, 1w, 1m -->
                   <div class="trading-timeframe-toggle" style="display: flex; background: rgba(0,0,0,0.3); padding: 2px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); gap: 2px;">
                     <button class="btn-timeframe ${this.activeTimeframe === '1h' ? 'active' : ''}" data-tf="1h" title="Timeframe 1 Jam">1h</button>
                     <button class="btn-timeframe ${this.activeTimeframe === '1d' ? 'active' : ''}" data-tf="1d" title="Timeframe 1 Hari">1d</button>
                     <button class="btn-timeframe ${this.activeTimeframe === '1w' ? 'active' : ''}" data-tf="1w" title="Timeframe 1 Minggu">1w</button>
                     <button class="btn-timeframe ${this.activeTimeframe === '1m' ? 'active' : ''}" data-tf="1m" title="Timeframe 1 Bulan">1m</button>
                   </div>

                   <!-- Chart Type Switcher: Line vs Candle -->
                   <div class="trading-chart-type-toggle" style="display: flex; background: rgba(0,0,0,0.3); padding: 2px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); gap: 2px;">
                     <button id="btn-chart-type-line" class="btn-chart-type active" title="Tampilkan Grafik Garis (Line Chart)" style="display: inline-flex; align-items: center; gap: 4px;">
                       ${Icons.activity(14)} Line
                     </button>
                     <button id="btn-chart-type-candle" class="btn-chart-type" title="Tampilkan Grafik Lilin (Candlestick Chart)" style="display: inline-flex; align-items: center; gap: 4px;">
                       ${Icons.candle(14)} Candle
                     </button>
                   </div>

                   <!-- Optional Volume indicator toggle -->
                   <button id="btn-toggle-volume" title="Toggle Indikator Volume Pasar" style="display: inline-flex; align-items: center; gap: 4px;">
                     ${Icons.volume(14)} Volume
                   </button>
                </div>
              </div>
              <div id="trading-chart-container" style="height: 440px; width: 100%; max-width: 100%; min-width: 0; overflow: hidden; position: relative;">
                <!-- Plotly Chart injected here -->
              </div>
            </div>

            <!-- ══ PARAMETER PASAR & ANALISIS STATISTIK (DI BAWAH CHART) ════════════════ -->
            <div class="trading-params-card">
              <div class="trading-params-header">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="color: var(--accent-primary); display: inline-flex; align-items: center;">${Icons.barChart(15, 'var(--accent-primary)')}</span> Statistik & Parameter Pasar (24h)
                </span>
                <span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 600;">Data Real-time</span>
              </div>

              <div class="trading-params-grid">
                <!-- 24h High -->
                <div class="trading-param-tile">
                  <span class="trading-param-label">
                    <span style="display: inline-flex; align-items: center;">${Icons.arrowUpRight(13, '#10b981')}</span> 24h High
                  </span>
                  <span id="strip-high" class="trading-param-value" style="color: #10b981;">
                    ${this.formatPrice(high24h)}
                  </span>
                </div>

                <!-- 24h Low -->
                <div class="trading-param-tile">
                  <span class="trading-param-label">
                    <span style="display: inline-flex; align-items: center;">${Icons.arrowDownRight(13, '#ef4444')}</span> 24h Low
                  </span>
                  <span id="strip-low" class="trading-param-value" style="color: #ef4444;">
                    ${this.formatPrice(low24h)}
                  </span>
                </div>

                <!-- 24h Volume -->
                <div class="trading-param-tile">
                  <span class="trading-param-label">
                    <span style="display: inline-flex; align-items: center;">${Icons.box(13, 'var(--accent-primary)')}</span> Volume (24h)
                  </span>
                  <span id="strip-volume" class="trading-param-value">
                    ${this.formatVolume(initialVol)}
                  </span>
                </div>

                <!-- Avg Volume -->
                <div class="trading-param-tile">
                  <span class="trading-param-label">
                    <span style="display: inline-flex; align-items: center;">${Icons.activity(13, 'var(--accent-primary)')}</span> Avg Volume
                  </span>
                  <span id="stat-avg-volume" class="trading-param-value">
                    0
                  </span>
                </div>

                <!-- Volatility -->
                <div class="trading-param-tile">
                  <span class="trading-param-label">
                    <span style="display: inline-flex; align-items: center;">${Icons.zap(13, '#10b981')}</span> Volatilitas
                  </span>
                  <span id="stat-volatility" class="trading-param-value" style="color: #10b981;">
                    LOW
                  </span>
                </div>
              </div>

              <!-- ══ RASIO VOLUME ORDER BOOK (TEKANAN BELI VS JUAL) ════════════════ -->
              <div class="trading-orderbook-ratio-section">
                <div class="ob-ratio-header">
                  <!-- Beli (Bid) -->
                  <div class="ob-side-stat">
                    <span class="ob-side-label buy" style="display: inline-flex; align-items: center; gap: 4px;">${Icons.circleFilled(7, '#10b981')} Beli (Bid)</span>
                    <span id="ob-buy-pct" class="ob-side-pct buy">${obRatio.buyPct}%</span>
                    <span id="ob-buy-vol" class="ob-side-vol">(${this.formatVolume(obRatio.bidVol)})</span>
                  </div>

                  <!-- Majority Badge -->
                  <span id="ob-majority-badge" class="ob-sentiment-badge ${obRatio.buyPct >= 53 ? 'buy' : (obRatio.sellPct >= 53 ? 'sell' : 'neutral')}" style="display: inline-flex; align-items: center; gap: 4px;">
                    ${obRatio.buyPct >= 53 
                      ? `${Icons.flame(13, '#10b981')} Mayoritas Beli` 
                      : (obRatio.sellPct >= 53 
                        ? `${Icons.arrowDown(13, '#ef4444')} Mayoritas Jual` 
                        : `${Icons.scale(13, '#38bdf8')} Seimbang`)}
                  </span>

                  <!-- Jual (Ask) -->
                  <div class="ob-side-stat">
                    <span id="ob-sell-vol" class="ob-side-vol">(${this.formatVolume(obRatio.askVol)})</span>
                    <span id="ob-sell-pct" class="ob-side-pct sell">${obRatio.sellPct}%</span>
                    <span class="ob-side-label sell" style="display: inline-flex; align-items: center; gap: 4px;">Jual (Ask) ${Icons.circleFilled(7, '#ef4444')}</span>
                  </div>
                </div>

                <!-- Dual-tone Depth Bar -->
                <div class="ob-dual-bar-track" title="Order Book Depth: Tekanan Beli (${obRatio.buyPct}%) vs Jual (${obRatio.sellPct}%)">
                  <div id="ob-buy-bar" class="ob-bar-buy" style="width: ${obRatio.buyPct}%;"></div>
                  <div id="ob-sell-bar" class="ob-bar-sell" style="width: ${obRatio.sellPct}%;"></div>
                </div>

                <!-- Guidance Hint for Trader -->
                <div class="ob-hint-row">
                  <span id="ob-hint-text">
                    ${obRatio.buyPct >= 53
                      ? `${Icons.lightbulb(14, '#f59e0b')} <strong>Mayoritas Beli (${obRatio.buyPct}%):</strong> Trader cenderung akumulasi di order book, tekanan beli dominan.`
                      : (obRatio.sellPct >= 53
                        ? `${Icons.lightbulb(14, '#f59e0b')} <strong>Mayoritas Jual (${obRatio.sellPct}%):</strong> Antrean jual lebih tebal di ask, tekanan distribusi lebih dominan.`
                        : `${Icons.lightbulb(14, '#f59e0b')} <strong>Order Book Seimbang:</strong> Volume penawaran dan permintaan setara, pasar berkonsolidasi.`)
                    }
                  </span>
                  <span style="font-size: 0.62rem; opacity: 0.7; flex-shrink: 0; margin-left: 0.5rem;">Order Book</span>
                </div>
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN: MODULAR ORDER PANEL, POSITION CARD & TRADE HISTORY -->
          <div class="tp-right-col">
            <div id="trading-order-panel-container">
              ${orderPanel.render(asset, this.assetType)}
            </div>

            <!-- Modular Trade History Panel (Di Bawah Panel Order) -->
            <div id="trading-history-panel-container">
              ${tradeHistoryPanel.render()}
            </div>
          </div>
        </div>
      </div>
    `;

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const viewContainer = document.querySelector('.view-container');
    const existingPage = document.getElementById('trading-page');
    if (existingPage) existingPage.remove();

    // Hide all other view panels to prevent overlap
    document.querySelectorAll('.view-panel').forEach(p => p.style.display = 'none');
    
    // Also hide home sections if visible
    const homeSections = ['view-home', 'balance-card', 'market-pulse-widget', '.quick-actions', 'footer-dashboard-grid'];
    homeSections.forEach(sel => {
      const el = document.querySelector(sel) || document.getElementById(sel);
      if (el) el.style.display = 'none';
    });

    viewContainer.insertAdjacentHTML('beforeend', tradingPageHTML);

    // Global Topbar Back Button
    const topbarLeft = document.querySelector('.app-topbar .topbar-left');
    if (topbarLeft) {
      document.getElementById('btn-close-trading-topbar-global')?.remove();
      const backBtnHTML = `
        <button id="btn-close-trading-topbar-global" class="btn-back" style="width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-main); font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: all var(--transition); margin-right: 0.5rem;">
          ←
        </button>
      `;
      topbarLeft.insertAdjacentHTML('afterbegin', backBtnHTML);
      document.getElementById('btn-close-trading-topbar-global')?.addEventListener('click', () => this.close());
    }

    // Initialize Plotly Chart Engine
    this.chart = new ChartEngine('trading-chart-container');
    this.chart.init();
    this.updateChartData();

    // Hide mobile bottom navigation
    const bottomNav = document.querySelector('.app-bottom-nav');
    if (bottomNav) bottomNav.style.display = 'none';

    this.bindEvents();
  }

  /**
   * Start 3-second live ticker updates
   */
  startRealTimeUpdates() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => this.updatePrice(), 3000);
  }

  /**
   * Stop real-time ticker updates
   */
  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Calculate live or dynamic Order Book Buy vs Sell Ratio
   */
  getOrderBookRatio(asset, symbol, assetType) {
    let bidVol = 0;
    let askVol = 0;

    // 1. Check live authoritative order book if available
    if (assetType === 'stock' && stockMarket?.getOrderBook) {
      const book = stockMarket.getOrderBook(symbol);
      if (book && (book.bids?.length > 0 || book.asks?.length > 0)) {
        bidVol = (book.bids || []).reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
        askVol = (book.asks || []).reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);
      }
    }

    // 2. If real order book has volume, calculate direct ratio
    if (bidVol + askVol > 0) {
      const buyPct = Math.round((bidVol / (bidVol + askVol)) * 100);
      const sellPct = 100 - buyPct;
      return { buyPct, sellPct, bidVol, askVol, isLive: true };
    }

    // 3. Dynamic order book depth simulation based on price momentum, breaking news & trade flow
    const buyPressure = asset?.recentBuyVolume || 0;
    const sellPressure = asset?.recentSellVolume || 0;
    const netFlow = buyPressure + sellPressure;
    let flowShift = 0;
    if (netFlow > 0) {
      flowShift = ((buyPressure - sellPressure) / netFlow) * 20; // up to ±20% shift from actual trading volume
    }

    const change = asset?.change || 0;
    // Map -5% to +5% change to ~35% - 65% buying pressure + flowShift
    const baseBuy = 50 + Math.max(-25, Math.min(25, change * 2.5)) + flowShift;
    // Subtle tick jitter for organic live exchange depth feel
    const timeFactor = Date.now() / 4000;
    const jitter = Math.sin(timeFactor) * 2 + Math.cos(timeFactor * 1.3) * 1.5;
    const buyPct = Math.max(10, Math.min(90, Math.round(baseBuy + jitter)));
    const sellPct = 100 - buyPct;

    const baseUnit = assetType === 'stock' ? 2500 : 150000;
    const totalEstVol = Math.round(baseUnit * (1 + Math.abs(change) * 0.2) + netFlow * 0.1);
    const estBidVol = Math.round(totalEstVol * (buyPct / 100));
    const estAskVol = totalEstVol - estBidVol;

    return { buyPct, sellPct, bidVol: estBidVol, askVol: estAskVol, isLive: false };
  }

  /**
   * Update Order Book Buy vs Sell Ratio UI elements
   */
  updateOrderBookRatioUI(asset) {
    if (!asset) return;
    const obRatio = this.getOrderBookRatio(asset, this.currentAsset, this.assetType);
    const buyPctEl = document.getElementById('ob-buy-pct');
    const sellPctEl = document.getElementById('ob-sell-pct');
    const buyVolEl = document.getElementById('ob-buy-vol');
    const sellVolEl = document.getElementById('ob-sell-vol');
    const buyBarEl = document.getElementById('ob-buy-bar');
    const sellBarEl = document.getElementById('ob-sell-bar');
    const badgeEl = document.getElementById('ob-majority-badge');
    const hintEl = document.getElementById('ob-hint-text');

    if (buyPctEl) buyPctEl.textContent = `${obRatio.buyPct}%`;
    if (sellPctEl) sellPctEl.textContent = `${obRatio.sellPct}%`;
    if (buyVolEl) buyVolEl.textContent = `(${this.formatVolume(obRatio.bidVol)})`;
    if (sellVolEl) sellVolEl.textContent = `(${this.formatVolume(obRatio.askVol)})`;
    if (buyBarEl) buyBarEl.style.width = `${obRatio.buyPct}%`;
    if (sellBarEl) sellBarEl.style.width = `${obRatio.sellPct}%`;

    if (badgeEl) {
      if (obRatio.buyPct >= 53) {
        badgeEl.className = 'ob-sentiment-badge buy';
        badgeEl.innerHTML = `${Icons.flame(13, '#10b981')} Mayoritas Beli`;
      } else if (obRatio.sellPct >= 53) {
        badgeEl.className = 'ob-sentiment-badge sell';
        badgeEl.innerHTML = `${Icons.arrowDown(13, '#ef4444')} Mayoritas Jual`;
      } else {
        badgeEl.className = 'ob-sentiment-badge neutral';
        badgeEl.innerHTML = `${Icons.scale(13, '#38bdf8')} Seimbang`;
      }
    }

    if (hintEl) {
      if (obRatio.buyPct >= 53) {
        hintEl.innerHTML = `${Icons.lightbulb(14, '#f59e0b')} <strong>Mayoritas Beli (${obRatio.buyPct}%):</strong> Trader cenderung akumulasi di order book, tekanan beli dominan.`;
      } else if (obRatio.sellPct >= 53) {
        hintEl.innerHTML = `${Icons.lightbulb(14, '#f59e0b')} <strong>Mayoritas Jual (${obRatio.sellPct}%):</strong> Antrean jual lebih tebal di ask, tekanan distribusi lebih dominan.`;
      } else {
        hintEl.innerHTML = `${Icons.lightbulb(14, '#f59e0b')} <strong>Order Book Seimbang:</strong> Volume penawaran dan permintaan setara, pasar berkonsolidasi.`;
      }
    }
  }

  /**
   * Periodic price ticker update loop
   */
  updatePrice() {
    const asset = this.getAsset();
    if (!asset) return;

    // Update Top Asset Header Price & 24h Change
    const stripPriceEl = document.getElementById('strip-price');
    const stripChangeEl = document.getElementById('strip-change');
    const stripHighEl = document.getElementById('strip-high');
    const stripLowEl = document.getElementById('strip-low');
    const stripVolumeEl = document.getElementById('strip-volume');

    if (stripPriceEl) {
      stripPriceEl.textContent = this.formatPrice(asset.price);
    }
    if (stripChangeEl) {
      const changeVal = asset.change || 0;
      stripChangeEl.textContent = `${changeVal >= 0 ? '+' : ''}${changeVal.toFixed(2)}%`;
      stripChangeEl.style.color = changeVal >= 0 ? '#10b981' : '#ef4444';
      stripChangeEl.style.background = changeVal >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    }

    // Update Market Analysis Parameters (Under Chart)
    const high24h = asset.high24h || asset.price;
    const low24h = asset.low24h || asset.price;

    if (stripHighEl) {
      stripHighEl.textContent = this.formatPrice(high24h);
    }
    if (stripLowEl) {
      stripLowEl.textContent = this.formatPrice(low24h);
    }
    if (stripVolumeEl) {
      const vol = asset.volume24h || (asset.price * (this.assetType === 'stock' ? 25000 : 500000));
      stripVolumeEl.textContent = this.formatVolume(vol);
    }

    // Update Order Book Buy vs Sell Ratio
    this.updateOrderBookRatioUI(asset);

    this.updateChartData();
    orderPanel.updateOrderTotal(asset, this.assetType);
    orderPanel.updatePositionCard(asset, this.assetType);
    tradeHistoryPanel.updateList();
  }

  /**
   * Refresh chart data using CandleGenerator
   */
  updateChartData() {
    if (!this.chart) return;
    const asset = this.getAsset();
    if (!asset || !asset.priceHistory) return;

    const hist = asset.priceHistory.slice(-300);
    const candles = candleGenerator.convertToCandles(hist, this.activeTimeframe || '1d', asset);

    this.chart.setData(candles);

    // Update Avg Volume and Volatility stats
    const avgVolEl = document.getElementById('stat-avg-volume');
    if (avgVolEl) {
      const avg = Math.round(candles.reduce((acc, c) => acc + c.volume, 0) / (candles.length || 1));
      avgVolEl.textContent = avg.toLocaleString();
    }
    const volEl = document.getElementById('stat-volatility');
    if (volEl) {
      const v = asset.volatility || 0.05;
      volEl.textContent = v > 0.15 ? 'HIGH' : (v > 0.08 ? 'MEDIUM' : 'LOW');
      volEl.style.color = v > 0.15 ? '#ef4444' : (v > 0.08 ? '#f59e0b' : '#10b981');
    }
  }

  /**
   * Switch chart timeframe: 1h, 1d, 1w, 1m
   */
  setTimeframe(tf) {
    if (!['1h', '1d', '1w', '1m'].includes(tf)) return;
    this.activeTimeframe = tf;

    document.querySelectorAll('.btn-timeframe').forEach(btn => {
      if (btn.dataset.tf === tf) {
        btn.classList.add('active');
        btn.style.background = 'var(--accent-primary)';
        btn.style.color = '#000';
        btn.style.fontWeight = '800';
      } else {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = 'var(--text-muted)';
        btn.style.fontWeight = '700';
      }
    });

    this.updateChartData();
  }

  /**
   * Bind event listeners for chart controls, search triggers, and delegate to panels
   */
  bindEvents() {
    const asset = this.getAsset();
    if (!asset) return;

    // Search dialog trigger in top market strip
    document.getElementById('btn-search-asset-topbar')?.addEventListener('click', () => {
      this.openAssetSearch();
    });

    // Timeframe selector (1h, 1d, 1w, 1m)
    document.querySelectorAll('.btn-timeframe').forEach(btn => {
      btn.addEventListener('click', () => {
        const tf = btn.dataset.tf;
        if (tf) this.setTimeframe(tf);
      });
    });

    // Switch to Line Chart
    document.getElementById('btn-chart-type-line')?.addEventListener('click', () => {
      if (this.chart) this.chart.setChartType('line');
    });

    // Switch to Candlestick Chart
    document.getElementById('btn-chart-type-candle')?.addEventListener('click', () => {
      if (this.chart) this.chart.setChartType('candlestick');
    });

    // Toggle Volume indicator
    document.getElementById('btn-toggle-volume')?.addEventListener('click', () => {
      if (this.chart) this.chart.toggleVolume();
    });

    // Bind Order Panel events
    orderPanel.bindEvents({
      asset,
      assetType: this.assetType,
      onOrderExecuted: () => {
        tradeHistoryPanel.updateList();
      },
      onReRender: () => {
        const updatedAsset = this.getAsset();
        if (updatedAsset) this.render(updatedAsset);
      },
      onSharePnl: () => {
        this.downloadPnlCard();
      }
    });

    // Bind Trade History Panel events
    tradeHistoryPanel.bindEvents(this.currentAsset);

    // Listen for live server order book updates
    this._orderBookHandler = (book) => {
      if (book && book.symbol === this.currentAsset) {
        const a = this.getAsset();
        if (a) this.updateOrderBookRatioUI(a);
      }
    };
    gameState.on('orderBookUpdate', this._orderBookHandler);
  }

  /**
   * Open asset search modal
   */
  openAssetSearch() {
    assetSearchModal.open({
      currentSymbol: this.currentAsset,
      currentType: this.assetType,
      onSelectAsset: (symbol, type) => {
        this.open(symbol, type);
      }
    });
  }

  /**
   * Download PnL Card delegate
   */
  downloadPnlCard() {
    const asset = this.getAsset();
    if (asset) {
      tradeHistoryPanel.downloadPnlCard(asset, this.assetType);
    }
  }

  /**
   * Download History Card delegate
   */
  downloadHistoryCard() {
    tradeHistoryPanel.downloadHistoryCard(this.currentAsset);
  }

  /**
   * Open Trade History & Performance Analysis Modal
   */
  openTradeAnalysisModal(tab = 'analysis', tradeId = null) {
    tradeHistoryPanel.openAnalysisModal(this.currentAsset, tab, tradeId);
  }

  /**
   * Render trade history rows delegate
   */
  renderTradeHistoryRows() {
    return tradeHistoryPanel.renderTradeHistoryRows();
  }

  /**
   * Update trade history table delegate
   */
  updateTradeHistoryTable() {
    tradeHistoryPanel.updateList();
  }

  /**
   * Close trading terminal and restore main view state
   */
  close() {
    if (this.chart && typeof this.chart.destroy === 'function') {
      this.chart.destroy();
      this.chart = null;
    }
    if (this._resizeListener) {
      window.removeEventListener('resize', this._resizeListener);
      this._resizeListener = null;
    }
    if (this._orderBookHandler) {
      gameState.off('orderBookUpdate', this._orderBookHandler);
      this._orderBookHandler = null;
    }
    this.stopRealTimeUpdates();

    document.body.classList.remove('trading-page-active');
    document.getElementById('trading-page')?.remove();
    document.getElementById('btn-close-trading-topbar')?.remove();
    document.getElementById('btn-close-trading-topbar-global')?.remove();
    
    const bottomNav = document.querySelector('.app-bottom-nav');
    if (bottomNav) bottomNav.style.display = '';

    // Restore previously active panels
    const activeView = document.querySelector('.nav-btn.active')?.dataset.view || 'home';
    if (activeView === 'home') {
      const homeSections = ['view-home', 'balance-card', 'market-pulse-widget', 'top-movers-widget', '.quick-actions', 'footer-dashboard-grid'];
      homeSections.forEach(sel => {
        const el = document.querySelector(sel) || document.getElementById(sel);
        if (el) el.style.display = '';
      });
    } else {
      const viewEl = document.getElementById('view-' + activeView);
      if (viewEl) viewEl.style.display = 'block';
    }

    this.currentAsset = null;
    this.assetType = null;
  }

  // Formatting utilities
  formatPrice(price) {
    if (price === undefined || price === null || isNaN(price)) return '$ 0';
    if (price >= 1000) return '$ ' + new Intl.NumberFormat('en-US').format(Math.round(price));
    if (price >= 1) return '$ ' + Number(price).toFixed(2);
    return '$ ' + Number(price).toFixed(4);
  }

  formatVolume(vol) {
    if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
    return (vol / 1e3).toFixed(2) + 'K';
  }

  calculatePnL(holding, currentPrice) {
    if (!holding) return 0;
    const qty = holding.shares || holding.amount || 0;
    return qty * currentPrice - (holding.totalInvested || 0);
  }

  formatPnL(holding, currentPrice) {
    const pnl = this.calculatePnL(holding, currentPrice);
    const pct = (pnl / (holding.totalInvested || 1)) * 100;
    return `$ ${financeManager.formatCurrency(Math.abs(pnl))} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
  }
}

export const tradingPage = new TradingPage();

if (typeof window !== 'undefined') {
  window.openTradeAnalysisModal = (tab = 'analysis', tradeId = null) => {
    tradingPage.openTradeAnalysisModal(tab, tradeId);
  };
}

export default tradingPage;
