/**
 * TradingPage.js - Full-Screen Trading Terminal (v2)
 * - Removed: Chart.js candlestick chart
 * - Added: Simple price history list (last 8 data points with direction arrows)
 * - Retained: All buy/sell order logic
 */

import stockMarket from './StockMarket.js';
import cryptoMarket from './CryptoMarket.js';
import financeManager from '../finance/FinanceManager.js';
import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import { slideInFromRight, pulseElement } from '../ui/Animations.js';
import ChartEngine from './ChartEngine.js';

class TradingPage {
  constructor() {
    this.currentAsset = null;
    this.assetType = null;
    this.priceHistory = [];
    this.updateInterval = null;
  }

  /**
   * Open trading page for an asset
   */
  open(symbol, type = 'stock') {
    this.currentAsset = symbol;
    this.assetType = type;

    const asset = type === 'stock'
      ? stockMarket.getStock(symbol)
      : cryptoMarket.getCrypto(symbol);

    if (!asset) { ui.error('Asset not found'); return; }

    this.generatePriceHistory(asset);
    this.render(asset);

    setTimeout(() => {
      const page = document.getElementById('trading-page');
      if (page) slideInFromRight(page);
      this.startRealTimeUpdates();
    }, 50);
  }

  generatePriceHistory(asset) {
    if (!asset.priceHistory) asset.priceHistory = [];

    // We need at least 300 data points for rich 5M candlestick charts with visible patterns
    if (asset.priceHistory.length < 300) {
      let price = asset.priceHistory[0] || asset.price;
      const vol  = asset.volatility || 0.018;
      const generated = [];
      const needed    = 300 - asset.priceHistory.length;

      // ── Generate with alternating macro patterns ──────────────────────
      // Pattern schedule: Elliott 5-wave impulse, then correction, then H&S (repeated)
      const patternPlan = [
        { type: 'impulse5',   bars: 60 },    // Elliott impulse wave 1-5
        { type: 'correction3', bars: 40 },   // Elliott correction a-b-c
        { type: 'hs',          bars: 60 },   // Head & Shoulders
        { type: 'impulse5',   bars: 50 },    // Second impulse
        { type: 'sideways',   bars: 30 },    // Consolidation
        { type: 'correction3', bars: 40 },   // Second correction
        { type: 'hs',          bars: 50 },   // Second H&S
      ];

      let pi = 0, barInPattern = 0;
      for (let i = 0; i < needed; i++) {
        const plan = patternPlan[pi % patternPlan.length];
        const frac = barInPattern / plan.bars;

        let drift = 0;
        if (plan.type === 'impulse5') {
          // 5-wave: upward with micro corrections
          const wave = Math.floor(frac * 5) + 1;
          drift = wave % 2 === 0 ? -vol * 0.4 : vol * 0.8;
        } else if (plan.type === 'correction3') {
          // ABC correction: down, up, down
          const sub = Math.floor(frac * 3);
          drift = sub === 1 ? vol * 0.5 : -vol * 0.6;
        } else if (plan.type === 'sideways') {
          // Sideways: random walk around zero drift
          drift = (Math.random() - 0.5) * vol * 0.3;
        } else if (plan.type === 'hs') {
          // Left shoulder → head → right shoulder → neckline break
          if      (frac < 0.2)  drift =  vol * 0.7;  // left shoulder up
          else if (frac < 0.3)  drift = -vol * 0.5;  // dip
          else if (frac < 0.55) drift =  vol * 0.9;  // head up
          else if (frac < 0.65) drift = -vol * 0.6;  // dip
          else if (frac < 0.8)  drift =  vol * 0.5;  // right shoulder up
          else                   drift = -vol * 0.8;  // neckline breakdown
        }

        const noise  = (Math.random() - 0.5) * 2 * vol * 0.5;
        const change = drift + noise;
        price = Math.max(0.0001, price * (1 + change));
        generated.unshift(parseFloat(price.toFixed(price >= 1 ? 2 : 6)));

        barInPattern++;
        if (barInPattern >= plan.bars) { barInPattern = 0; pi++; }
      }

      asset.priceHistory = [...generated, ...asset.priceHistory];
    }

    this.priceHistory = [...asset.priceHistory];
  }

  /** Render price history as a simple vertical list */
  rende$riceHistoryList() {
    const history = this.priceHistory;
    if (history.length < 2) return '<div style="color:var(--text-dim);font-size:0.85rem;">Loading...</div>';

    const last8 = history.slice(-8);
    return last8.map((price, i, arr) => {
      const prev = arr[i - 1] ?? price;
      const up = price >= prev;
      const change = prev > 0 ? ((price - prev) / prev * 100).toFixed(2) : '0.00';
      const tickAge = arr.length - i;
      return `
        <div style="
          display:flex;justify-content:space-between;align-items:center;
          padding:0.5rem 0.75rem;
          background:${up ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)'};
          border-left:3px solid ${up ? 'var(--accent-primary)' : 'var(--accent-danger)'};
          border-radius:0 var(--radius-sm) var(--radius-sm) 0;
          font-size:0.85rem;
          margin-bottom: 2px;
        ">
          <span style="color:var(--text-muted);">${tickAge} tick lalu</span>
          <span style="font-weight:700;color:var(--text-main);">${this.formatPrice(price)}</span>
          <span style="font-weight:600;color:${up ? 'var(--accent-primary)' : 'var(--accent-danger)'};">
            ${up ? '▲' : '▼'} ${Math.abs(change)}%
          </span>
        </div>
      `;
    }).reverse().join('');
  }



  render(asset) {
    const portfolio = this.assetType === 'stock'
      ? gameState.get('stocks') || {}
      : gameState.get('crypto') || {};
    const holding = portfolio[this.currentAsset];
    const balance = gameState.getBalance();
    const initialVol = Math.random() * 1e9;

    // Use market's price history if available, else use generated one
    const history = (asset.priceHistory && asset.priceHistory.length > 0) 
      ? asset.priceHistory 
      : this.priceHistory;

    const tradingPageHTML = `
      <div id="trading-page" class="trading-page" style="position: absolute; inset: 0; display: flex; flex-direction: column; background: var(--bg-main); z-index: 1000; overflow: hidden; border-radius: 0;">

        <!-- MARKET STRIP -->
        <div style="
          display:flex;
          align-items:center;
          gap:1.5rem;
          padding:0.75rem 1.5rem;
          border-bottom:1px solid var(--border-color);
          background:rgba(255,255,255,0.02);
          overflow-x:auto;
        ">
          <!-- TOPBAR CONTROLS INSIDE MARKET STRIP -->
          <div id="trading-topbar-controls" style="display: flex; align-items: center; gap: 0.35rem; padding-right: 1.5rem; border-right: 1px solid rgba(255,255,255,0.1);">
              <button id="btn-search-asset-topbar" class="btn-back" style="height: 38px; display: flex; align-items: center; gap: 0.5rem; padding: 0 0.85rem; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-main); font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all var(--transition);" title="Cari Aset (Pindah Chart)">
                <span style="font-size: 1.25rem;">${this.assetType === 'stock' ? stockMarket.getStockIcon(asset.sector) : asset.icon}</span>
                <span style="font-weight: 800;">${this.currentAsset}</span>
                <span style="font-size: 0.65rem; opacity: 0.5; margin-left: 2px;">▼</span>
              </button>
          </div>

          <div>
            <div style="font-size:0.7rem;color:var(--text-muted);">Mark</div>
            <div id="strip-price" style="font-weight:700;color:white;">
              ${this.formatPrice(asset.price)}
            </div>
          </div>

          <div>
            <div style="font-size:0.7rem;color:var(--text-muted);">24h Change</div>
            <div id="strip-change" style="
              font-weight:700;
              color:${(asset.change || 0) >= 0 ? '#10b981' : '#ef4444'};
            ">
              ${(asset.change || 0).toFixed(2)}%
            </div>
          </div>

          <div>
            <div style="font-size:0.7rem;color:var(--text-muted);">24h High</div>
            <div id="strip-high" style="font-weight:700;color:white;">
              ${this.formatPrice(asset.high24h || asset.price * 1.04)}
            </div>
          </div>

          <div>
            <div style="font-size:0.7rem;color:var(--text-muted);">24h Low</div>
            <div id="strip-low" style="font-weight:700;color:white;">
              ${this.formatPrice(asset.low24h || asset.price * 0.96)}
            </div>
          </div>

          <div>
            <div style="font-size:0.7rem;color:var(--text-muted);">Volume</div>
            <div id="strip-volume" style="font-weight:700;color:white;">
              ${this.formatVolume(initialVol)}
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: row; flex: 1; overflow-y: auto; flex-wrap: wrap;">
          
          <!-- LEFT COLUMN: MARKET INTELLIGENCE -->
          <div style="flex: 1.2; padding: 1.5rem; border-right: 1px solid var(--border-color); background: rgba(0,0,0,0.1); min-width: 320px;">
            


            <!-- Professional Trading Chart -->
            <div style="
              background:
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px),
                rgba(0,0,0,0.2);
              background-size: 40px 40px;
              border: 1px solid var(--border-color);
              border-radius: var(--radius-lg);
              padding: 1.25rem;
              margin-bottom: 1.5rem;
              box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            ">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div style="font-size: 0.8rem; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.05em;">Interactive Market Chart</div>
                <div style="display: flex; gap: 0.5rem;">
                   <button id="btn-toggle-ma" style="background: rgba(245,158,11, 0.12); border: 1px solid rgba(245,158,11, 0.35); color: #f59e0b; font-size: 0.7rem; padding: 0.25rem 0.75rem; border-radius: 20px; cursor: pointer; font-weight: 600;">EMA</button>
                   <button id="btn-toggle-bb" style="background: rgba(56,189,248, 0.12); border: 1px solid rgba(56,189,248, 0.35); color: #38bdf8; font-size: 0.7rem; padding: 0.25rem 0.75rem; border-radius: 20px; cursor: pointer; font-weight: 600;">MACD</button>
                </div>
              </div>
              <div id="trading-chart-container" style="height: 520px; width: 100%;">
                <!-- SVG Chart injected here -->
              </div>
            </div>

            <!-- Stats Grid -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
               <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-md); padding: 1rem;">
                  <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Avg Volume</div>
                  <div id="stat-avg-volume" style="font-size: 1.25rem; font-weight: 700; color: white;">0</div>
               </div>
               <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-md); padding: 1rem;">
                  <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Volatility</div>
                  <div id="stat-volatility" style="font-size: 1.25rem; font-weight: 700; color: white;">Low</div>
               </div>
            </div>

            <!-- Professional Trading History Ledger -->
            <div class="th-panel">
              <!-- Panel header -->
              <div class="th-header">
                <div class="th-title">
                  <span>📈 Riwayat Trading</span>
                  <span id="th-count-badge" class="th-badge">${(gameState.get('tradeHistory') || []).length} transaksi</span>
                </div>
                <button id="btn-download-history" class="th-dl-btn" title="Download Ringkasan">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Unduh
                </button>
              </div>

              <!-- Stats Summary Row -->
              ${this._renderHistorySummary()}

              <!-- Filter tabs -->
              <div class="th-filters" id="th-filters">
                <button class="th-filter active" data-filter="all">Semua</button>
                <button class="th-filter" data-filter="win">✅ Win</button>
                <button class="th-filter" data-filter="loss">❌ Loss</button>
                <button class="th-filter" data-filter="stock">📊 Saham</button>
                <button class="th-filter" data-filter="crypto">🪙 Crypto</button>
              </div>

              <!-- Card list -->
              <div class="th-list" id="th-list" style="max-height: 300px; overflow-y: auto;">
                ${this._renderHistoryCards('all')}
              </div>
            </div>

          </div>


          <!-- RIGHT COLUMN: EXECUTION & POSITION -->
          <div class="tp-right-col">

            <!-- ══ POSITION DETAIL CARD ══════════════════════════════════ -->
            ${holding ? `
            <div class="pos-detail-card" id="pos-detail-card">
              <!-- Header row -->
              <div class="pos-detail-header">
                <div>
                  <span class="pos-badge">LONG</span>
                  <span class="pos-symbol">${this.currentAsset}</span>
                  <span class="pos-size">${this.assetType === 'stock' ? holding.shares + ' lot' : cryptoMarket.formatAmount(holding.amount) + ' ' + this.currentAsset}</span>
                </div>
                <div id="pos-upnl" class="pos-upnl ${this.calculatePnL(holding, asset.price) >= 0 ? 'pos-upnl--profit' : 'pos-upnl--loss'}">
                  ${this.calculatePnL(holding, asset.price) >= 0 ? '+' : ''}${this.formatPnL(holding, asset.price)}
                </div>
              </div>

              <!-- Metric grid -->
              <div class="pos-metrics">
                <div class="pos-metric">
                  <span class="pos-metric__label">Entry Price</span>
                  <span class="pos-metric__value" id="pos-entry">${this.formatPrice(holding.avgPrice || holding.totalInvested / (holding.shares || holding.amount))}</span>
                </div>
                <div class="pos-metric">
                  <span class="pos-metric__label">Mark Price</span>
                  <span class="pos-metric__value pos-metric__value--live" id="pos-mark">${this.formatPrice(asset.price)}</span>
                </div>
                <div class="pos-metric">
                  <span class="pos-metric__label">Liq. Price</span>
                  <span class="pos-metric__value pos-metric__value--danger" id="pos-liq">${this.formatPrice(this._calcLiqPrice(holding, asset.price))}</span>
                </div>
                <div class="pos-metric">
                  <span class="pos-metric__label">Nilai Posisi</span>
                  <span class="pos-metric__value" id="pos-value">${this.formatPrice((holding.shares || holding.amount) * asset.price)}</span>
                </div>
                <div class="pos-metric">
                  <span class="pos-metric__label">Price Gap</span>
                  <span class="pos-metric__value ${this.calculatePnL(holding, asset.price) >= 0 ? 'pos-metric__value--profit' : 'pos-metric__value--danger'}" id="pos-gap">
                    ${this._calcPriceGap(holding, asset.price)}
                  </span>
                </div>
                <div class="pos-metric">
                  <span class="pos-metric__label">Unrealized PnL</span>
                  <span class="pos-metric__value ${this.calculatePnL(holding, asset.price) >= 0 ? 'pos-metric__value--profit' : 'pos-metric__value--danger'}" id="pos-pnl-val">
                    ${this.calculatePnL(holding, asset.price) >= 0 ? '+' : ''}${this.formatPrice(this.calculatePnL(holding, asset.price))}
                  </span>
                </div>
              </div>

              <!-- PnL progress bar -->
              <div class="pos-pnl-bar-wrap">
                <div class="pos-pnl-bar-track">
                  <div id="pos-pnl-bar" class="pos-pnl-bar ${this.calculatePnL(holding, asset.price) >= 0 ? 'pos-pnl-bar--profit' : 'pos-pnl-bar--loss'}"
                    style="width: ${Math.min(100, Math.abs(this.calculatePnL(holding, asset.price) / (holding.totalInvested || 1) * 100)).toFixed(1)}%">
                  </div>
                </div>
                <span class="pos-pnl-pct" id="pos-pnl-pct">
                  ${((this.calculatePnL(holding, asset.price) / (holding.totalInvested || 1)) * 100).toFixed(2)}%
                </span>
              </div>

              <!-- Action buttons -->
              <div class="pos-actions">
                <button id="btn-close-pos" class="pos-btn-sell">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  Jual Semua
                </button>
                <button id="btn-download-pnl" class="pos-btn-card">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  PnL Card
                </button>
              </div>
            </div>
            ` : `
            <div class="pos-detail-card pos-detail-card--empty">
              <div class="pos-empty-icon">📭</div>
              <div class="pos-empty-title">Tidak Ada Posisi</div>
              <div class="pos-empty-sub">Beli aset untuk membuka posisi</div>
            </div>
            `}

            <!-- ══ ORDER FORM ═════════════════════════════════════════════ -->
            <div class="order-form" style="flex: 1; padding: 0; background: none; border: none; box-shadow: none;">
              <div class="order-tabs" style="margin-bottom: 1rem;">
                <button class="order-tab-btn active" data-side="buy">BUY</button>
                <button class="order-tab-btn" data-side="sell">SELL</button>
              </div>

              <div class="order-type-tabs" style="margin-bottom: 1.25rem;">
                <button class="order-type-btn active" data-type="market">Market</button>
                <button class="order-type-btn" data-type="limit">Limit</button>
              </div>

              <!-- Market Order Form -->
              <div id="market-form" class="order-form-content">
                <div class="form-row" style="margin-bottom: 0.5rem;">
                  <label style="font-size: 0.75rem; display: flex; justify-content: space-between;">
                    <span>${this.assetType === 'stock' ? 'Jumlah Lot' : 'Jumlah (IDR)'}</span>
                    <span id="market-pct-label" style="color: var(--accent-primary); font-weight: 700;">0%</span>
                  </label>
                  <input type="number" id="market-amount" class="order-input"
                    value="${this.assetType === 'stock' ? '100' : '1000000'}"
                    min="${this.assetType === 'stock' ? '1' : '10000'}">
                </div>

                <!-- Range Slider & Pct Shortcuts for Market Order -->
                <div style="margin-bottom: 1.25rem;">
                  <input type="range" id="market-pct-slider" class="order-pct-slider" min="0" max="100" value="0"
                    style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; cursor: pointer; outline: none; margin-bottom: 0.5rem; accent-color: var(--accent-primary);">
                  <div style="display: flex; gap: 0.25rem; justify-content: space-between;">
                    <button type="button" class="quick-pct-btn" data-pct="10" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:white;cursor:pointer;">10%</button>
                    <button type="button" class="quick-pct-btn" data-pct="25" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:white;cursor:pointer;">25%</button>
                    <button type="button" class="quick-pct-btn" data-pct="50" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:white;cursor:pointer;">50%</button>
                    <button type="button" class="quick-pct-btn" data-pct="75" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:white;cursor:pointer;">75%</button>
                    <button type="button" class="quick-pct-btn" data-pct="100" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:4px;color:#818cf8;cursor:pointer;font-weight:800;">MAX</button>
                  </div>
                </div>

                <div class="order-summary" style="margin-top: 1.5rem; background: rgba(0,0,0,0.15);">
                  <div class="summary-row">
                    <span>Est. Total</span>
                    <span id="market-total" style="color: var(--accent-primary); font-weight: 700;">${this.formatPrice(asset.price * (this.assetType === 'stock' ? 100 : 1))}</span>
                  </div>
                  <div class="summary-row">
                    <span style="font-size: 0.75rem;">Saldo Tersedia</span>
                    <span style="font-size: 0.75rem; color: white;">$ ${financeManager.formatCurrency(balance)}</span>
                  </div>
                </div>
              </div>

              <!-- Limit Order Form -->
              <div id="limit-form" class="order-form-content" style="display:none;">
                <div class="form-row" style="margin-bottom: 0.25rem;">
                  <label style="font-size: 0.75rem;">Harga Limit</label>
                  <input type="number" id="limit-price" class="order-input" value="${Math.round(asset.price)}">
                </div>

                <div style="display: flex; gap: 0.25rem; margin-bottom: 1.25rem; justify-content: space-between;">
                  <button type="button" class="price-suggest-btn" data-offset="-0.05" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);border-radius:4px;color:#f87171;cursor:pointer;">-5%</button>
                  <button type="button" class="price-suggest-btn" data-offset="-0.01" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);border-radius:4px;color:#f87171;cursor:pointer;">-1%</button>
                  <button type="button" class="price-suggest-btn" data-offset="0" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:white;cursor:pointer;font-weight:700;">Market</button>
                  <button type="button" class="price-suggest-btn" data-offset="0.01" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.2);border-radius:4px;color:#34d399;cursor:pointer;">+1%</button>
                  <button type="button" class="price-suggest-btn" data-offset="0.05" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.2);border-radius:4px;color:#34d399;cursor:pointer;">+5%</button>
                </div>

                <div class="form-row" style="margin-bottom: 0.5rem;">
                  <label style="font-size: 0.75rem; display: flex; justify-content: space-between;">
                    <span>${this.assetType === 'stock' ? 'Jumlah Lot' : 'Jumlah (IDR)'}</span>
                    <span id="limit-pct-label" style="color: var(--accent-primary); font-weight: 700;">0%</span>
                  </label>
                  <input type="number" id="limit-amount" class="order-input"
                    value="${this.assetType === 'stock' ? '100' : '1000000'}">
                </div>

                <div style="margin-bottom: 1.25rem;">
                  <input type="range" id="limit-pct-slider" class="order-pct-slider" min="0" max="100" value="0"
                    style="width:100%;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;cursor:pointer;outline:none;margin-bottom:0.5rem;accent-color:var(--accent-primary);">
                  <div style="display: flex; gap: 0.25rem; justify-content: space-between;">
                    <button type="button" class="quick-pct-btn" data-pct="10" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:white;cursor:pointer;">10%</button>
                    <button type="button" class="quick-pct-btn" data-pct="25" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:white;cursor:pointer;">25%</button>
                    <button type="button" class="quick-pct-btn" data-pct="50" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:white;cursor:pointer;">50%</button>
                    <button type="button" class="quick-pct-btn" data-pct="75" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:white;cursor:pointer;">75%</button>
                    <button type="button" class="quick-pct-btn" data-pct="100" style="flex:1;font-size:0.65rem;padding:0.25rem 0;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:4px;color:#818cf8;cursor:pointer;font-weight:800;">MAX</button>
                  </div>
                </div>

                <div class="order-summary" style="margin-top: 1rem; background: rgba(0,0,0,0.15);">
                  <div class="summary-row">
                    <span>Total Order</span>
                    <span id="limit-total" style="color: var(--accent-primary); font-weight: 700;">${this.formatPrice(asset.price * (this.assetType === 'stock' ? 100 : 1))}</span>
                  </div>
                </div>
              </div>

              <!-- TP/SL -->
              <div class="tpsl-section" style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                <div class="tpsl-toggle">
                  <input type="checkbox" id="tpsl-enabled">
                  <label for="tpsl-enabled" style="font-size: 0.8rem; font-weight: 600;">🛡️ Advanced: TP/SL</label>
                </div>
                <div id="tpsl-inputs" class="tpsl-inputs" style="display:none; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.75rem;">
                  <div class="tpsl-input">
                    <label class="positive">🎯 Take Profit</label>
                    <input type="number" id="tp-price" class="order-input" placeholder="${Math.round(asset.price * 1.1)}">
                  </div>
                  <div class="tpsl-input">
                    <label class="negative">🛑 Stop Loss</label>
                    <input type="number" id="sl-price" class="order-input" placeholder="${Math.round(asset.price * 0.95)}">
                  </div>
                </div>
              </div>
            </div>

            <!-- Execute -->
            <button id="execute-order" class="execute-btn buy">
              <span class="execute-icon">🟢</span>
              <span class="execute-text">BUY ${this.currentAsset}</span>
            </button>
          </div>
        </div>
    `;

    const viewContainer = document.querySelector('.view-container');
    const existingPage = document.getElementById('trading-page');
    if (existingPage) existingPage.remove();

    // Hide all other view panels to prevent overlap
    document.querySelectorAll('.view-panel').forEach(p => p.style.display = 'none');
    
    // Also hide home sections if they are visible
    const homeSections = ['view-home', 'balance-card', 'market-pulse-widget', 'earn-panel', '.quick-actions', 'footer-dashboard-grid'];
    homeSections.forEach(sel => {
        const el = document.querySelector(sel) || document.getElementById(sel);
        if (el) el.style.display = 'none';
    });

    viewContainer.insertAdjacentHTML('beforeend', tradingPageHTML);

    // Restore back button in global topbar
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

    // Attach event listener for the search control inside the market strip
    document.getElementById('btn-search-asset-topbar')?.addEventListener('click', () => {
        this.openAssetSearch();
    });

    // Initialize Chart Engine
    this.chart = new ChartEngine('trading-chart-container');
    this.chart.init();
    this.updateChartData();

    // Hide bottom nav on mobile
    const bottomNav = document.querySelector('.app-bottom-nav');
    if (bottomNav) bottomNav.style.display = 'none';

    this.bindEvents();
  }

  startRealTimeUpdates() {
    this.updateInterval = setInterval(() => this.updatePrice(), 3000);
  }

  updatePrice() {
    const asset = this.assetType === 'stock'
      ? stockMarket.getStock(this.currentAsset)
      : cryptoMarket.getCrypto(this.currentAsset);
    if (!asset) return;

    // Update Market Strip
    const stripPriceEl = document.getElementById('strip-price');
    const stripChangeEl = document.getElementById('strip-change');
    const stripHighEl = document.getElementById('strip-high');
    const stripLowEl = document.getElementById('strip-low');
    const stripVolumeEl = document.getElementById('strip-volume');

    if (stripPriceEl) {
      stripPriceEl.textContent = this.formatPrice(asset.price);
    }
    if (stripChangeEl) {
      stripChangeEl.textContent = `${(asset.change || 0).toFixed(2)}%`;
      stripChangeEl.style.color = (asset.change || 0) >= 0 ? '#10b981' : '#ef4444';
    }
    if (stripHighEl) {
      stripHighEl.textContent = this.formatPrice(asset.high24h || asset.price * 1.04);
    }
    if (stripLowEl) {
      stripLowEl.textContent = this.formatPrice(asset.low24h || asset.price * 0.96);
    }
    if (stripVolumeEl) {
      stripVolumeEl.textContent = this.formatVolume(Math.random() * 1e9);
    }



    this.updateChartData();
    this.updateOrderTotal();
    this.updateTradeHistoryTable();
    this.updatePositionCard();
  }

  updateChartData() {
    if (!this.chart) return;
    const asset = this.assetType === 'stock'
      ? stockMarket.getStock(this.currentAsset)
      : cryptoMarket.getCrypto(this.currentAsset);
    if (!asset || !asset.priceHistory) return;

    // Use full history — up to 300 raw ticks → ~60 5M candles per 300 ticks
    const hist    = asset.priceHistory.slice(-300);
    const candles = this.convertToCandles(hist);

    // Inject Elliott Wave + H&S annotations
    this._annotatePatterns(candles);

    // Inject H&S neckline into chart
    this.chart.injectPatterns(this._hsPts || []);
    this.chart.setData(candles);

    // Update Stats
    const avgVolEl = document.getElementById('stat-avg-volume');
    if (avgVolEl) {
      const avg = Math.round(candles.reduce((acc, c) => acc + c.volume, 0) / (candles.length || 1));
      avgVolEl.textContent = avg.toLocaleString();
    }
    const volEl = document.getElementById('stat-volatility');
    if (volEl) {
      const v = asset.volatility || 0.05;
      volEl.textContent = v > 0.15 ? 'HIGH' : (v > 0.08 ? 'MEDIUM' : 'LOW');
      volEl.style.color  = v > 0.15 ? '#ef4444' : (v > 0.08 ? '#f59e0b' : '#10b981');
    }
  }

  /**
   * Convert raw price array into rich OHLC candles (5-minute timeframe).
   * Uses 5-bar buckets → each candle = 1 five-minute bar.
   * Timestamps are realistic HH:MM counting backwards from now in 5-min steps.
   * Randomly picks wick magnitudes to produce hammer, shooting star,
   * doji, marubozu, and normal candles.
   */
  convertToCandles(history) {
    const candles = [];
    const BUCKET  = 5; // 5 price ticks = 1 five-minute candle

    // Generate realistic 5-minute timestamps, most recent = last bucket
    const totalBuckets = Math.floor(history.length / BUCKET);
    const now = new Date();
    // Align to nearest 5-min boundary
    now.setSeconds(0, 0);
    now.setMinutes(Math.floor(now.getMinutes() / 5) * 5);

    const pad = n => String(n).padStart(2, '0');
    const getLabel = (bucketIdx) => {
      const msBack = (totalBuckets - 1 - bucketIdx) * 5 * 60 * 1000;
      const t = new Date(now.getTime() - msBack);
      return `${pad(t.getHours())}:${pad(t.getMinutes())}`;
    };

    for (let i = 0; i + 1 < history.length; i += BUCKET) {
      const slice = history.slice(i, Math.min(i + BUCKET, history.length));
      if (slice.length < 2) break;

      const open  = slice[0];
      const close = slice[slice.length - 1];
      const body  = Math.abs(close - open);
      const mid   = (open + close) / 2;

      // Pick a random candlestick archetype
      const r    = Math.random();
      let topWick, botWick;

      if (r < 0.10) {
        // ── Hammer: tiny body near high, long lower wick ──
        topWick = body * 0.1;
        botWick = body * 2.5 + mid * 0.005;
      } else if (r < 0.20) {
        // ── Shooting Star: tiny body near low, long upper wick ──
        topWick = body * 2.5 + mid * 0.005;
        botWick = body * 0.1;
      } else if (r < 0.28) {
        // ── Doji: very thin body, balanced wicks ──
        const dojiBody = mid * 0.0008;
        topWick = body * 0.9 + dojiBody;
        botWick = body * 0.9 + dojiBody;
      } else if (r < 0.36) {
        // ── Marubozu: big body, tiny wicks (strong momentum) ──
        topWick = body * 0.05;
        botWick = body * 0.05;
      } else if (r < 0.44) {
        // ── Spinning Top: medium body, long wicks both sides ──
        topWick = body * 1.2;
        botWick = body * 1.2;
      } else if (r < 0.52) {
        // ── Rising / Falling Star: moderate upper wick ──
        topWick = body * 1.5;
        botWick = body * 0.3;
      } else {
        // ── Normal candle: random wicks ──
        topWick = body * (0.3 + Math.random() * 0.8);
        botWick = body * (0.3 + Math.random() * 0.8);
      }

      // Add minimum wick relative to price to avoid flat candles
      const minWick = mid * 0.003;
      topWick = Math.max(minWick, topWick);
      botWick = Math.max(minWick, botWick);

      const high   = Math.max(open, close) + topWick;
      const low    = Math.min(open, close) - botWick;

      // Volume: correlated with body size (5M candles have higher vol)
      const baseVol = 15000 + Math.random() * 60000;
      const volume  = baseVol * (1 + (body / mid) * 10);

      const bucketIdx = candles.length;
      const isLive    = (i + BUCKET) >= history.length;

      candles.push({
        time:   isLive ? 'Live' : getLabel(bucketIdx),
        open, high, low, close, volume,
        pattern: null, patternType: null,
      });
    }
    return candles;
  }

  /**
   * Detect and annotate Elliott Wave 1-5 and Head & Shoulders on candle array.
   * Annotates up to 2 full Elliott cycles + 1 H&S.
   */
  _annotatePatterns(candles) {
    const n = candles.length;
    this._hsPts = [];
    if (n < 30) return;

    // ── Elliott Wave annotation (first 50% of candles) ────────────────────
    const elliotEnd = Math.min(Math.floor(n * 0.55), n - 25);
    const waveSize  = Math.max(8, Math.floor(elliotEnd / 5));

    const waveLabels  = ['W1', 'W2', 'W3', 'W4', 'W5'];
    const corrLabels  = ['Wa', 'Wb', 'Wc'];

    // Mark wave peaks and troughs at regular intervals
    let prices = candles.slice(0, elliotEnd).map(c => (c.high + c.low) / 2);
    let maxIdx  = -1, maxVal = -Infinity;
    let minIdx  = -1, minVal =  Infinity;

    // Find local max & min every waveSize bars to plant Elliott labels
    for (let w = 0; w < 5; w++) {
      const start = w * waveSize;
      const end   = Math.min(start + waveSize, elliotEnd);
      if (start >= n) break;

      let peakIdx = start, peakVal = -Infinity;
      for (let i = start; i < end; i++) {
        const v = candles[i].high;
        if (v > peakVal) { peakVal = v; peakIdx = i; }
      }
      candles[peakIdx].pattern     = waveLabels[w];
      candles[peakIdx].patternType = 'elliott';
    }

    // Correction wave a-b-c after impulse
    const corrStart = elliotEnd;
    const corrSize  = Math.max(5, Math.floor((n - corrStart - 20) / 3));
    for (let w = 0; w < 3; w++) {
      const start = corrStart + w * corrSize;
      if (start >= n - 10) break;
      const end = Math.min(start + corrSize, n - 5);

      let peakIdx = start, peakVal = -Infinity;
      for (let i = start; i < end; i++) {
        const v = candles[i].high;
        if (v > peakVal) { peakVal = v; peakIdx = i; }
      }
      candles[peakIdx].pattern     = corrLabels[w];
      candles[peakIdx].patternType = 'elliott';
    }

    // ── Head & Shoulders in last 25 candles ──────────────────────────────
    const hsStart = Math.max(0, n - 25);
    const hsLen   = n - hsStart;
    if (hsLen < 15) return;

    const seg = Math.floor(hsLen / 5);

    // Left shoulder peak
    const lsIdx  = hsStart + Math.floor(seg * 0.8);
    candles[lsIdx].pattern     = 'LS';
    candles[lsIdx].patternType = 'hs';

    // Head peak
    const hIdx = hsStart + Math.floor(seg * 2.2);
    if (hIdx < n) {
      candles[hIdx].pattern     = 'HEAD';
      candles[hIdx].patternType = 'hs';
    }

    // Right shoulder peak
    const rsIdx = hsStart + Math.floor(seg * 3.6);
    if (rsIdx < n) {
      candles[rsIdx].pattern     = 'RS';
      candles[rsIdx].patternType = 'hs';
    }

    // Neckline: drawn between troughs between LS–Head and Head–RS
    const t1Idx = hsStart + Math.floor(seg * 1.5);
    const t2Idx = hsStart + Math.floor(seg * 3.0);
    if (t1Idx < n && t2Idx < n) {
      this._hsPts = [
        { idx: t1Idx, price: candles[t1Idx].low },
        { idx: t2Idx, price: candles[t2Idx].low },
      ];
    }
  }


  bindEvents() {

    
    document.getElementById('btn-toggle-ma')?.addEventListener('click', (e) => {
      if (this.chart) {
        const on = this.chart.toggleMA();
        e.target.style.background = on ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.04)';
      }
    });

    document.getElementById('btn-toggle-bb')?.addEventListener('click', (e) => {
      if (this.chart) {
        const on = this.chart.toggleBB();
        e.target.style.background = on ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)';
      }
    });

    // ── Position card quick-sell ─────────────────────────────────────────────
    document.getElementById('btn-close-pos')?.addEventListener('click', () => {
      try {
        const asset = this.assetType === 'stock'
          ? stockMarket.getStock(this.currentAsset)
          : cryptoMarket.getCrypto(this.currentAsset);
        const portfolio = this.assetType === 'stock'
          ? gameState.get('stocks') || {}
          : gameState.get('crypto') || {};
        const h = portfolio[this.currentAsset];
        if (!h || !asset) return;

        if (this.assetType === 'stock') {
          const r = stockMarket.marketSell(this.currentAsset, h.shares);
          ui.success(`✅ Sold all ${h.shares} lot. P/L: ${r.profit >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(r.profit)}`);
        } else {
          const r = cryptoMarket.marketSell(this.currentAsset, h.amount);
          ui.success(`✅ Sold all ${cryptoMarket.formatAmount(h.amount)} ${this.currentAsset}. P/L: ${r.profit >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(r.profit)}`);
        }
        setTimeout(() => {
          const a = this.assetType === 'stock'
            ? stockMarket.getStock(this.currentAsset)
            : cryptoMarket.getCrypto(this.currentAsset);
          if (a) this.render(a);
        }, 400);
      } catch (e) { ui.error(e.message); }
    });

    // ── PnL Card download ────────────────────────────────────────────────────
    document.getElementById('btn-download-pnl')?.addEventListener('click', () => {
      this.downloadPnlCard();
    });

    // ── Filter tabs ──────────────────────────────────────────────────────────
    document.getElementById('th-filters')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.th-filter');
      if (!btn) return;
      document.querySelectorAll('.th-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const list = document.getElementById('th-list');
      if (list) list.innerHTML = this._renderHistoryCards(btn.dataset.filter);
    });

    // ── Download history card ────────────────────────────────────────────────
    document.getElementById('btn-download-history')?.addEventListener('click', () => {
      this.downloadHistoryCard();
    });



    document.querySelectorAll('.order-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.order-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const side = btn.dataset.side;
        const executeBtn = document.getElementById('execute-order');
        if (side === 'buy') {
          executeBtn.className = 'execute-btn buy';
          executeBtn.innerHTML = `<span class="execute-icon">🟢</span><span>BUY ${this.currentAsset}</span>`;
        } else {
          executeBtn.className = 'execute-btn sell';
          executeBtn.innerHTML = `<span class="execute-icon">🔴</span><span>SELL ${this.currentAsset}</span>`;
        }

        // Reset sliders & amounts on tab switch for intuitive UX
        const marketSlider = document.getElementById('market-pct-slider');
        const limitSlider = document.getElementById('limit-pct-slider');
        if (marketSlider) marketSlider.value = 0;
        if (limitSlider) limitSlider.value = 0;
        
        const marketPctLabel = document.getElementById('market-pct-label');
        const limitPctLabel = document.getElementById('limit-pct-label');
        if (marketPctLabel) marketPctLabel.textContent = '0%';
        if (limitPctLabel) limitPctLabel.textContent = '0%';

        const marketAmountInput = document.getElementById('market-amount');
        const limitAmountInput = document.getElementById('limit-amount');
        if (marketAmountInput) marketAmountInput.value = this.assetType === 'stock' ? '100' : '1000000';
        if (limitAmountInput) limitAmountInput.value = this.assetType === 'stock' ? '100' : '1000000';
        
        this.updateOrderTotal();
      });
    });

    document.querySelectorAll('.order-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const type = btn.dataset.type;
        document.getElementById('market-form').style.display = type === 'market' ? 'block' : 'none';
        document.getElementById('limit-form').style.display = type === 'limit' ? 'block' : 'none';
      });
    });

    // Helper to update amount based on percentage of available capital / holdings
    const updateAmountFromPercent = (pct, isLimit) => {
      const isBuy = document.querySelector('.order-tab-btn.active').dataset.side === 'buy';
      const asset = this.assetType === 'stock' ? stockMarket.getStock(this.currentAsset) : cryptoMarket.getCrypto(this.currentAsset);
      if (!asset) return;

      const limitPrice = parseFloat(document.getElementById('limit-price')?.value) || asset.price;
      const targetPrice = isLimit ? limitPrice : asset.price;

      let finalVal = 0;

      if (isBuy) {
        const balance = gameState.getBalance();
        if (this.assetType === 'stock') {
          // Stocks buy quantity in Lots (shares)
          const maxShares = Math.floor(balance / targetPrice);
          finalVal = Math.floor(maxShares * (pct / 100));
        } else {
          // Cryptos buy quantity in fiat IDR
          finalVal = Math.floor(balance * (pct / 100));
        }
      } else {
        const portfolio = this.assetType === 'stock' ? gameState.get('stocks') || {} : gameState.get('crypto') || {};
        const holding = portfolio[this.currentAsset];
        if (holding) {
          if (this.assetType === 'stock') {
            const availableShares = holding.shares - (holding.reservedShares || 0);
            finalVal = Math.floor(availableShares * (pct / 100));
          } else {
            // Cryptos sell quantity value (IDR value target)
            const totalCryptoHoldings = holding.amount - (holding.reservedAmount || 0);
            const totalValueUSD = totalCryptoHoldings * targetPrice;
            finalVal = Math.floor(totalValueUSD * (pct / 100));
          }
        }
      }

      if (isLimit) {
        document.getElementById('limit-amount').value = finalVal;
        document.getElementById('limit-pct-slider').value = pct;
        document.getElementById('limit-pct-label').textContent = `${pct}%`;
      } else {
        document.getElementById('market-amount').value = finalVal;
        document.getElementById('market-pct-slider').value = pct;
        document.getElementById('market-pct-label').textContent = `${pct}%`;
      }
      this.updateOrderTotal();
    };

    // Range Sliders
    document.getElementById('market-pct-slider')?.addEventListener('input', (e) => {
      updateAmountFromPercent(parseInt(e.target.value), false);
    });
    document.getElementById('limit-pct-slider')?.addEventListener('input', (e) => {
      updateAmountFromPercent(parseInt(e.target.value), true);
    });

    // Pct Shortcut Buttons
    document.querySelectorAll('.quick-pct-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pct = parseInt(btn.dataset.pct);
        const isLimit = document.querySelector('.order-type-btn.active').dataset.type === 'limit';
        updateAmountFromPercent(pct, isLimit);
      });
    });

    // Suggested price offset buttons
    document.querySelectorAll('.price-suggest-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const asset = this.assetType === 'stock' ? stockMarket.getStock(this.currentAsset) : cryptoMarket.getCrypto(this.currentAsset);
        if (!asset) return;

        const offset = parseFloat(btn.dataset.offset);
        let targetPrice = asset.price;
        if (offset !== 0) {
          targetPrice = asset.price * (1 + offset);
        }

        const priceInput = document.getElementById('limit-price');
        if (priceInput) {
          priceInput.value = this.assetType === 'stock' ? Math.round(targetPrice) : targetPrice.toFixed(4);
        }
        
        this.updateOrderTotal();
      });
    });

    const marketAmtInput = document.getElementById('market-amount');
    const limitAmtInput = document.getElementById('limit-amount');
    if (marketAmtInput) {
      ui.setupNumericInput(marketAmtInput);
      marketAmtInput.addEventListener('input', () => this.updateOrderTotal());
    }
    if (limitAmtInput) {
      ui.setupNumericInput(limitAmtInput);
      limitAmtInput.addEventListener('input', () => this.updateOrderTotal());
    }
    document.getElementById('limit-price')?.addEventListener('input', () => this.updateOrderTotal());
    document.getElementById('tpsl-enabled')?.addEventListener('change', (e) => {
      document.getElementById('tpsl-inputs').style.display = e.target.checked ? 'block' : 'none';
    });
    document.getElementById('execute-order')?.addEventListener('click', () => this.executeOrder());
  }

  openAssetSearch() {
    const currentSymbol = this.currentAsset;
    const currentType = this.assetType;

    // Get current asset sector/category to recommend similar assets
    let currentSector = '';
    let currentCategory = '';
    if (currentType === 'stock') {
      const stock = stockMarket.getStock(currentSymbol);
      if (stock) currentSector = stock.sector;
    } else {
      const crypto = cryptoMarket.getCrypto(currentSymbol);
      if (crypto) currentCategory = crypto.category;
    }

    // Get all assets
    const allStocks = stockMarket.getAllStocks() || [];
    const allCryptos = cryptoMarket.getAllCryptos() || [];

    // Filter out current asset and find similar
    let similarAssets = [];
    if (currentType === 'stock') {
      similarAssets = allStocks
        .filter(s => s.symbol !== currentSymbol && s.sector === currentSector)
        .slice(0, 6)
        .map(s => ({ symbol: s.symbol, name: s.name, price: s.price, type: 'stock', sector: s.sector }));
      if (similarAssets.length < 6) {
        // Fill up with other top stocks
        const extra = allStocks
          .filter(s => s.symbol !== currentSymbol && s.sector !== currentSector)
          .slice(0, 6 - similarAssets.length)
          .map(s => ({ symbol: s.symbol, name: s.name, price: s.price, type: 'stock', sector: s.sector }));
        similarAssets = [...similarAssets, ...extra];
      }
    } else {
      similarAssets = allCryptos
        .filter(c => c.symbol !== currentSymbol && c.category === currentCategory)
        .slice(0, 6)
        .map(c => ({ symbol: c.symbol, name: c.name, price: c.price, type: 'crypto', icon: c.icon }));
      if (similarAssets.length < 6) {
        // Fill up with other top cryptos
        const extra = allCryptos
          .filter(c => c.symbol !== currentSymbol && c.category !== currentCategory)
          .slice(0, 6 - similarAssets.length)
          .map(c => ({ symbol: c.symbol, name: c.name, price: c.price, type: 'crypto', icon: c.icon }));
        similarAssets = [...similarAssets, ...extra];
      }
    }

    // Get active/hot signals (Trending)
    const activeSignals = (gameState.get('tradingSignals') || [])
      .filter(sig => ['MOON 🚀', 'HOT 🔥', 'HEAT ⚡'].includes(sig.label))
      .slice(0, 6);

    // Get portfolio holdings
    const stockPortfolio = stockMarket.getPortfolio() || [];
    const cryptoWallet = cryptoMarket.getWallet() || [];
    const portfolioAssets = [
      ...stockPortfolio.map(h => ({ symbol: h.symbol, name: h.name, price: h.currentPrice, type: 'stock' })),
      ...cryptoWallet.map(h => ({ symbol: h.symbol, name: h.name, price: h.currentPrice, type: 'crypto', icon: h.icon }))
    ].filter(a => a.symbol !== currentSymbol).slice(0, 6);

    const modalHTML = `
      <style>
        .search-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.65rem 0.85rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition);
        }
        .search-item-row:hover {
          background: var(--bg-surface-hover) !important;
          border-color: var(--accent-primary) !important;
          transform: translateY(-1px);
        }
        .search-item-card {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition);
          min-width: 0;
        }
        .search-item-card:hover {
          background: var(--bg-surface-hover) !important;
          border-color: var(--accent-primary) !important;
          transform: translateY(-1px);
        }
      </style>
      <div class="modal-header">
        <h3 class="modal-title">🔍 Cari & Pindah Aset</h3>
        <button class="modal-close">✕</button>
      </div>
      <div class="modal-body" style="padding: 1.5rem; max-height: 75vh; overflow-y: auto;">
        <div class="form-group" style="margin-bottom: 1.25rem;">
          <input 
            type="text" 
            class="form-input input-lg" 
            id="asset-search-input"
            placeholder="Ketik simbol atau nama aset (contoh: BTC, AAPL, BBCA)..."
            style="width: 100%; padding: 0.75rem 1rem; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white; font-size: 1rem;"
          >
        </div>
        
        <!-- REAL-TIME RESULTS -->
        <div id="search-results-container" style="display: none; margin-bottom: 1.5rem;">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-primary); font-weight: 700; margin-bottom: 0.5rem; letter-spacing: 0.05em;">Hasil Pencarian</div>
          <div id="search-results-list" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 280px; overflow-y: auto; padding-right: 0.25rem;"></div>
        </div>

        <!-- RECOMMENDATIONS SECTION -->
        <div id="search-recommendations-container">
          <!-- Active Signals (Trending) -->
          <div id="rec-trending-section" style="margin-bottom: 1.25rem; ${activeSignals.length > 0 ? '' : 'display: none;'}">
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-warning); font-weight: 700; margin-bottom: 0.5rem; letter-spacing: 0.05em;">🔥 Sedang Hot (Sinyal Aktif)</div>
            <div id="rec-trending-list" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
              ${activeSignals.map(sig => {
                const asset = sig.type === 'stock' ? stockMarket.getStock(sig.id) : cryptoMarket.getCrypto(sig.id);
                if (!asset) return '';
                const icon = sig.type === 'stock' ? stockMarket.getStockIcon(asset.sector) : asset.icon;
                return `
                  <div class="search-item-card" data-symbol="${sig.id}" data-type="${sig.type}">
                    <span style="font-size: 1.1rem; flex-shrink: 0;">${icon}</span>
                    <div style="min-width: 0; flex: 1;">
                      <div style="font-weight: 700; color: white; font-size: 0.85rem; display: flex; align-items: center; gap: 0.25rem;">
                        ${sig.id}
                        <span style="font-size:0.6rem; padding: 1px 3px; border-radius: 3px; background: rgba(245,158,11,0.15); color: #f59e0b; font-weight:600;">${sig.label.split(' ')[0]}</span>
                      </div>
                      <div style="font-size: 0.7rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${this.formatPrice(asset.price)}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Similar Assets -->
          <div style="margin-bottom: 1.25rem;">
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-info); font-weight: 700; margin-bottom: 0.5rem; letter-spacing: 0.05em;">💡 Rekomendasi (Sektor/Kategori Sejenis)</div>
            <div id="rec-similar-list" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
              ${similarAssets.map(a => {
                const icon = a.type === 'stock' ? stockMarket.getStockIcon(a.sector) : a.icon;
                return `
                  <div class="search-item-card" data-symbol="${a.symbol}" data-type="${a.type}">
                    <span style="font-size: 1.1rem; flex-shrink: 0;">${icon}</span>
                    <div style="min-width: 0; flex: 1;">
                      <div style="font-weight: 700; color: white; font-size: 0.85rem;">${a.symbol}</div>
                      <div style="font-size: 0.7rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${this.formatPrice(a.price)}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Portfolio Holdings -->
          <div id="rec-portfolio-section" style="margin-bottom: 0.5rem; ${portfolioAssets.length > 0 ? '' : 'display: none;'}">
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-primary); font-weight: 700; margin-bottom: 0.5rem; letter-spacing: 0.05em;">💼 Aset Portofolio Anda</div>
            <div id="rec-portfolio-list" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
              ${portfolioAssets.map(a => {
                const icon = a.type === 'stock' ? stockMarket.getStockIcon(stockMarket.getStock(a.symbol)?.sector) : a.icon;
                return `
                  <div class="search-item-card" data-symbol="${a.symbol}" data-type="${a.type}">
                    <span style="font-size: 1.1rem; flex-shrink: 0;">${icon}</span>
                    <div style="min-width: 0; flex: 1;">
                      <div style="font-weight: 700; color: white; font-size: 0.85rem;">${a.symbol}</div>
                      <div style="font-size: 0.7rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${this.formatPrice(a.price)}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    ui.openModal(modalHTML);

    const modalContent = document.getElementById('modal-content');
    const searchInput = modalContent.querySelector('#asset-search-input');
    const resultsContainer = modalContent.querySelector('#search-results-container');
    const resultsList = modalContent.querySelector('#search-results-list');
    const recommendationsContainer = modalContent.querySelector('#search-recommendations-container');

    // Focus input
    setTimeout(() => searchInput.focus(), 100);

    // Live search input handler
    searchInput.oninput = (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        resultsContainer.style.display = 'none';
        recommendationsContainer.style.display = 'block';
        return;
      }

      // Filter matching stocks & cryptos
      const matchedStocks = allStocks
        .filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
        .map(s => ({ ...s, type: 'stock' }));
      const matchedCryptos = allCryptos
        .filter(c => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
        .map(c => ({ ...c, type: 'crypto' }));

      const matched = [...matchedStocks, ...matchedCryptos].slice(0, 10);

      if (matched.length === 0) {
        resultsList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1rem; font-size: 0.85rem;">Tidak ada aset yang cocok dengan "${q}"</div>`;
      } else {
        resultsList.innerHTML = matched.map(asset => {
          const icon = asset.type === 'stock' ? stockMarket.getStockIcon(asset.sector) : asset.icon;
          const up = asset.change >= 0;
          const changeText = `${up ? '+' : ''}${asset.change.toFixed(2)}%`;
          const colorClass = up ? 'text-positive' : 'text-negative';
          return `
            <div class="search-item-row" data-symbol="${asset.symbol}" data-type="${asset.type}">
              <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0; flex: 1;">
                <span style="font-size: 1.2rem; min-width: 24px; text-align: center;">${icon}</span>
                <div style="min-width: 0; flex: 1;">
                  <div style="font-weight: 700; color: white; display: flex; align-items: center; gap: 0.35rem; font-size: 0.9rem;">
                    ${asset.symbol} 
                    <span style="font-size: 0.6rem; padding: 1px 4px; border-radius: 3px; background: rgba(255,255,255,0.08); color: var(--text-muted); font-weight: 600;">${asset.type.toUpperCase()}</span>
                  </div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${asset.name}</div>
                </div>
              </div>
              <div style="text-align: right; flex-shrink: 0; margin-left: 0.5rem;">
                <div style="font-weight: 700; color: white; font-size: 0.9rem;">${this.formatPrice(asset.price)}</div>
                <div style="font-size: 0.75rem; font-weight: 600;" class="${colorClass}">${changeText}</div>
              </div>
            </div>
          `;
        }).join('');
      }

      resultsContainer.style.display = 'block';
      recommendationsContainer.style.display = 'none';

      // Bind search items
      resultsList.querySelectorAll('.search-item-row').forEach(el => {
        el.onclick = () => {
          ui.closeModal();
          this.open(el.dataset.symbol, el.dataset.type);
        };
      });
    };

    // Bind recommendation items
    modalContent.querySelectorAll('.search-item-card').forEach(el => {
      el.onclick = () => {
        ui.closeModal();
        this.open(el.dataset.symbol, el.dataset.type);
      };
    });
  }

  calculateMaxBuy() {
    const asset = this.assetType === 'stock' ? stockMarket.getStock(this.currentAsset) : cryptoMarket.getCrypto(this.currentAsset);
    const balance = gameState.getBalance();
    return this.assetType === 'stock' ? Math.floor(balance / asset.price) : Math.floor(balance);
  }

  calculateMaxSell() {
    const portfolio = this.assetType === 'stock' ? gameState.get('stocks') || {} : gameState.get('crypto') || {};
    const holding = portfolio[this.currentAsset];
    if (!holding) return 0;
    if (this.assetType === 'stock') return holding.shares - (holding.reservedShares || 0);
    const asset = cryptoMarket.getCrypto(this.currentAsset);
    return Math.floor(holding.amount * asset.price);
  }

  updateOrderTotal() {
    const asset = this.assetType === 'stock' ? stockMarket.getStock(this.currentAsset) : cryptoMarket.getCrypto(this.currentAsset);
    if (!asset) return;

    const marketInput = document.getElementById('market-amount');
    const limitInput = document.getElementById('limit-amount');
    const marketAmount = marketInput?.getNumericValue ? marketInput.getNumericValue() : (parseInt(marketInput?.value.replace(/,/g, ''), 10) || 0);
    const limitPrice = parseFloat(document.getElementById('limit-price')?.value) || asset.price;
    const limitAmount = limitInput?.getNumericValue ? limitInput.getNumericValue() : (parseInt(limitInput?.value.replace(/,/g, ''), 10) || 0);
    const marketTotalEl = document.getElementById('market-total');
    const limitTotalEl = document.getElementById('limit-total');

    if (this.assetType === 'stock') {
      if (marketTotalEl) marketTotalEl.textContent = this.formatPrice(asset.price * marketAmount);
      if (limitTotalEl) limitTotalEl.textContent = this.formatPrice(limitPrice * limitAmount);
    } else {
      if (marketTotalEl) marketTotalEl.textContent = `≈ ${cryptoMarket.formatAmount(marketAmount / asset.price)} ${this.currentAsset}`;
      if (limitTotalEl) limitTotalEl.textContent = `≈ ${cryptoMarket.formatAmount(limitAmount / limitPrice)} ${this.currentAsset}`;
    }
  }

  executeOrder() {
    const isBuy = document.querySelector('.order-tab-btn.active').dataset.side === 'buy';
    const isLimit = document.querySelector('.order-type-btn.active').dataset.type === 'limit';
    try {
      if (this.assetType === 'stock') this.executeStockOrder(isBuy, isLimit);
      else this.executeCryptoOrder(isBuy, isLimit);

      if (document.getElementById('tpsl-enabled')?.checked) {
        const tp = parseFloat(document.getElementById('tp-price').value);
        const sl = parseFloat(document.getElementById('sl-price').value);
        if (this.assetType === 'stock') {
          if (tp) stockMarket.setTakeProfit(this.currentAsset, tp);
          if (sl) stockMarket.setStopLoss(this.currentAsset, sl);
        } else {
          if (tp) cryptoMarket.setTakeProfit(this.currentAsset, tp);
          if (sl) cryptoMarket.setStopLoss(this.currentAsset, sl);
        }
      }
    } catch (e) { ui.error(e.message); }
  }

  executeStockOrder(isBuy, isLimit) {
    const input = document.getElementById(isLimit ? 'limit-amount' : 'market-amount');
    const amount = input?.getNumericValue ? input.getNumericValue() : (parseInt(input?.value.replace(/,/g, ''), 10) || 0);
    const limitPrice = parseFloat(document.getElementById('limit-price').value);
    if (isBuy) {
      if (isLimit) { stockMarket.limitBuy(this.currentAsset, amount, limitPrice); ui.success(`Limit Buy: ${amount} lot @ $ ${financeManager.formatCurrency(limitPrice)}`); }
      else { const r = stockMarket.marketBuy(this.currentAsset, amount); ui.success(`Buy: ${amount} lot @ $ ${financeManager.formatCurrency(r.price)}`); }
    } else {
      if (isLimit) { stockMarket.limitSell(this.currentAsset, amount, limitPrice); ui.success(`Limit Sell: ${amount} lot`); }
      else { const r = stockMarket.marketSell(this.currentAsset, amount); ui.success(`Sell: ${amount} lot. P/L: ${r.profit >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(r.profit)}`); }
    }
    setTimeout(() => { const a = stockMarket.getStock(this.currentAsset); if (a) this.render(a); }, 400);
  }

  executeCryptoOrder(isBuy, isLimit) {
    const input = document.getElementById(isLimit ? 'limit-amount' : 'market-amount');
    const amountIDR = input?.getNumericValue ? input.getNumericValue() : (parseInt(input?.value.replace(/,/g, ''), 10) || 0);
    const limitPrice = parseFloat(document.getElementById('limit-price').value);
    const holding = (gameState.get('crypto') || {})[this.currentAsset];
    const asset = cryptoMarket.getCrypto(this.currentAsset);
    if (!asset) return;

    if (isBuy) {
      if (isLimit) { cryptoMarket.limitBuy(this.currentAsset, amountIDR, limitPrice); ui.success(`Limit Buy @ ${cryptoMarket.formatPrice(limitPrice)}`); }
      else { const r = cryptoMarket.marketBuy(this.currentAsset, amountIDR); ui.success(`Buy: ${cryptoMarket.formatAmount(r.cryptoAmount)} ${this.currentAsset}`); }
    } else {
      if (!holding || holding.amount <= 0) { ui.error('Tidak punya crypto untuk dijual'); return; }
      
      const targetPrice = isLimit ? limitPrice : asset.price;
      const cryptoAmountToSell = Math.min(amountIDR / targetPrice, holding.amount);

      if (isLimit) { 
        cryptoMarket.limitSell(this.currentAsset, cryptoAmountToSell, limitPrice); 
        ui.success(`Limit Sell: ${cryptoMarket.formatAmount(cryptoAmountToSell)} ${this.currentAsset} @ ${cryptoMarket.formatPrice(limitPrice)}`); 
      }
      else { 
        const r = cryptoMarket.marketSell(this.currentAsset, cryptoAmountToSell); 
        ui.success(`Sell: ${cryptoMarket.formatAmount(cryptoAmountToSell)} ${this.currentAsset}. P/L: ${r.profit >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(r.profit)}`); 
      }
    }
    setTimeout(() => { const a = cryptoMarket.getCrypto(this.currentAsset); if (a) this.render(a); }, 400);
  }

  // ─── Position Card Helpers ────────────────────────────────────────────────

  /** Liquidation price estimate: entry - (entry * 0.80) simplified as 80% cushion */
  _calcLiqPrice(holding, currentPrice) {
    const entry = holding.avgPrice || (holding.totalInvested / (holding.shares || holding.amount || 1));
    // Assume 10x effective leverage proxy; liq at ~entry * (1 - 1/leverage)
    return entry * 0.80;
  }

  /** Price gap = (mark - entry) / entry as percentage string */
  _calcPriceGap(holding, currentPrice) {
    const entry = holding.avgPrice || (holding.totalInvested / (holding.shares || holding.amount || 1));
    const gap   = ((currentPrice - entry) / entry) * 100;
    return `${gap >= 0 ? '+' : ''}${gap.toFixed(2)}%`;
  }

  /** Live-update the position detail card without full re-render */
  updatePositionCard() {
    const asset = this.assetType === 'stock'
      ? stockMarket.getStock(this.currentAsset)
      : cryptoMarket.getCrypto(this.currentAsset);
    if (!asset) return;

    const portfolio = this.assetType === 'stock'
      ? gameState.get('stocks') || {}
      : gameState.get('crypto') || {};
    const h = portfolio[this.currentAsset];
    if (!h) return;

    const pnl    = this.calculatePnL(h, asset.price);
    const pct    = (pnl / (h.totalInvested || 1)) * 100;
    const isProfit = pnl >= 0;
    const barW  = Math.min(100, Math.abs(pct)).toFixed(1);

    const upd = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const cls = (id, ...classes) => { const el = document.getElementById(id); if (el) el.className = classes.join(' '); };

    upd('pos-mark',  this.formatPrice(asset.price));
    upd('pos-value', this.formatPrice((h.shares || h.amount) * asset.price));
    upd('pos-gap',   this._calcPriceGap(h, asset.price));
    upd('pos-pnl-val', `${isProfit ? '+' : ''}${this.formatPrice(pnl)}`);
    upd('pos-pnl-pct', `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`);
    upd('pos-upnl',  `${isProfit ? '+' : ''}${this.formatPnL(h, asset.price)}`);

    const gapEl   = document.getElementById('pos-gap');
    const pnlEl   = document.getElementById('pos-pnl-val');
    const upnlEl  = document.getElementById('pos-upnl');
    const barEl   = document.getElementById('pos-pnl-bar');

    if (gapEl)  gapEl.className  = `pos-metric__value ${isProfit ? 'pos-metric__value--profit' : 'pos-metric__value--danger'}`;
    if (pnlEl)  pnlEl.className  = `pos-metric__value ${isProfit ? 'pos-metric__value--profit' : 'pos-metric__value--danger'}`;
    if (upnlEl) upnlEl.className = `pos-upnl ${isProfit ? 'pos-upnl--profit' : 'pos-upnl--loss'}`;
    if (barEl)  { barEl.style.width = barW + '%'; barEl.className = `pos-pnl-bar ${isProfit ? 'pos-pnl-bar--profit' : 'pos-pnl-bar--loss'}`; }
  }

  /** Download a canvas-rendered PnL card as a PNG */
  downloadPnlCard() {
    const asset = this.assetType === 'stock'
      ? stockMarket.getStock(this.currentAsset)
      : cryptoMarket.getCrypto(this.currentAsset);
    const portfolio = this.assetType === 'stock'
      ? gameState.get('stocks') || {}
      : gameState.get('crypto') || {};
    const h = portfolio[this.currentAsset];
    if (!h || !asset) { ui.error('Tidak ada posisi untuk dibagikan'); return; }

    const pnl    = this.calculatePnL(h, asset.price);
    const pct    = (pnl / (h.totalInvested || 1)) * 100;
    const isProfit = pnl >= 0;
    const entry  = h.avgPrice || (h.totalInvested / (h.shares || h.amount || 1));
    const now    = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

    // Canvas dimensions
    const W = 560, H = 320;
    const canvas = document.createElement('canvas');
    canvas.width  = W * 2; // 2x for retina
    canvas.height = H * 2;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, isProfit ? '#0a1a14' : '#1a0a0a');
    bg.addColorStop(1, '#09090b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Glow accent
    const glow = ctx.createRadialGradient(W * 0.15, H * 0.3, 0, W * 0.15, H * 0.3, W * 0.5);
    glow.addColorStop(0, isProfit ? 'rgba(38,166,154,0.12)' : 'rgba(239,83,80,0.12)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = isProfit ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(2, 2, W - 4, H - 4, 16);
    ctx.stroke();

    // ── Text helpers ─────────────────────────────────────────────────────
    const txt = (text, x, y, font, color, align = 'left') => {
      ctx.font      = font;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.fillText(text, x, y);
    };

    const accent = isProfit ? '#26a69a' : '#ef5350';
    const arrow  = isProfit ? '▲' : '▼';

    // Logo / brand
    txt('AuraAssets', 36, 38, 'bold 13px Inter, sans-serif', 'rgba(255,255,255,0.35)');
    txt(now, W - 36, 38, '12px Inter, sans-serif', 'rgba(255,255,255,0.25)', 'right');

    // Asset symbol
    txt(this.currentAsset, 36, 80, 'bold 32px Inter, sans-serif', '#ffffff');
    txt(this.assetType.toUpperCase(), 36, 102, '11px Inter, sans-serif', 'rgba(255,255,255,0.4)');

    // PnL main
    const pnlStr = `${isProfit ? '+' : ''}${this.formatPrice(Math.abs(pnl))}`;
    txt(pnlStr, W / 2, 88, `bold 38px Inter, sans-serif`, accent, 'center');
    txt(`${arrow} ${isProfit ? '+' : ''}${pct.toFixed(2)}%`, W / 2, 116, 'bold 18px Inter, sans-serif', accent, 'center');

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(36, 136); ctx.lineTo(W - 36, 136);
    ctx.stroke();

    // Details grid  4 items
    const details = [
      ['Entry Price', this.formatPrice(entry)],
      ['Mark Price',  this.formatPrice(asset.price)],
      ['Liq. Price',  this.formatPrice(this._calcLiqPrice(h, asset.price))],
      ['Price Gap',   this._calcPriceGap(h, asset.price)],
    ];
    details.forEach(([label, val], i) => {
      const col = i % 2 === 0 ? 36 : W / 2 + 20;
      const row = 162 + Math.floor(i / 2) * 52;
      txt(label, col, row,       '10.5px Inter, sans-serif', 'rgba(255,255,255,0.4)');
      txt(val,   col, row + 20,  'bold 14px Inter, sans-serif', '#ffffff');
    });

    // Quantity row
    const qty = this.assetType === 'stock'
      ? h.shares + ' lot'
      : `${cryptoMarket.formatAmount(h.amount)} ${this.currentAsset}`;
    txt('Jumlah Posisi', 36, H - 52, '10px Inter, sans-serif', 'rgba(255,255,255,0.35)');
    txt(qty, 36, H - 34, 'bold 13px Inter, sans-serif', 'rgba(255,255,255,0.7)');

    // QR placeholder area (decorative)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect(W - 90, H - 80, 56, 56, 6);
    ctx.stroke();
    txt('SCAN', W - 62, H - 44, 'bold 8px Inter, sans-serif', 'rgba(255,255,255,0.2)', 'center');

    // Download
    const link    = document.createElement('a');
    link.download = `${this.currentAsset}_PnL_${Date.now()}.png`;
    link.href     = canvas.toDataURL('image/png');
    link.click();
    ui.success('✅ PnL card berhasil diunduh!');
  }

  /** Render 4-stat summary row for trade history */
  _renderHistorySummary() {
    const all = gameState.get('tradeHistory') || [];
    if (!all.length) return '';

    const wins   = all.filter(t => t.profit >= 0);
    const losses = all.filter(t => t.profit < 0);
    const totalPnL  = all.reduce((s, t) => s + (t.profit || 0), 0);
    const winRate   = all.length ? ((wins.length / all.length) * 100).toFixed(0) : 0;
    const bestTrade = all.length ? Math.max(...all.map(t => t.profit || 0)) : 0;
    const isProfit  = totalPnL >= 0;

    const stat = (label, val, color = 'white') =>
      `<div class="th-stat"><div class="th-stat__label">${label}</div><div class="th-stat__value" style="color:${color}">${val}</div></div>`;

    return `
      <div class="th-stats">
        ${stat('Win Rate', winRate + '%', parseInt(winRate) >= 50 ? '#26a69a' : '#ef5350')}
        ${stat('Total P/L', (isProfit ? '+' : '') + this.formatPrice(totalPnL), isProfit ? '#26a69a' : '#ef5350')}
        ${stat('Trades', all.length)}
        ${stat('Best', '+' + this.formatPrice(bestTrade), '#f59e0b')}
      </div>
    `;
  }

  /** Render filterable trade history cards */
  _renderHistoryCards(filter = 'all') {
    const all = gameState.get('tradeHistory') || [];
    if (!all.length) {
      return `<div class="th-empty">📭 Belum ada riwayat trading</div>`;
    }

    const filtered = all.filter(t => {
      if (filter === 'win')    return t.profit >= 0;
      if (filter === 'loss')   return t.profit < 0;
      if (filter === 'stock')  return t.assetType === 'stock';
      if (filter === 'crypto') return t.assetType === 'crypto';
      return true;
    }).slice(0, 20);

    if (!filtered.length) {
      return `<div class="th-empty">Tidak ada data untuk filter ini</div>`;
    }

    return filtered.map(t => {
      const isWin   = t.profit >= 0;
      const pnlColor = isWin ? '#26a69a' : '#ef5350';
      const pct     = t.profitPercent != null ? t.profitPercent.toFixed(2) : '0.00';
      const pnlSign = isWin ? '+' : '';
      const qty     = t.assetType === 'stock'
        ? `${t.amount} lot`
        : `${cryptoMarket.formatAmount ? cryptoMarket.formatAmount(t.amount) : t.amount.toFixed(4)}`;
      const icon    = t.assetType === 'stock' ? '📊' : '🪙';
      const badge   = isWin ? 'th-card__badge--win' : 'th-card__badge--loss';
      const changeArrow = ((t.sellPrice - t.buyPrice) / t.buyPrice * 100).toFixed(2);

      return `
        <div class="th-card">
          <div class="th-card__left">
            <span class="th-card__icon">${icon}</span>
            <div>
              <div class="th-card__asset">${t.asset}</div>
              <div class="th-card__qty">${qty}</div>
            </div>
          </div>
          <div class="th-card__mid">
            <div class="th-card__price">${this.formatPrice(t.buyPrice)}</div>
            <div class="th-card__arrow">→</div>
            <div class="th-card__price">${this.formatPrice(t.sellPrice)}</div>
            <div class="th-card__chg" style="color:${(t.sellPrice - t.buyPrice) >= 0 ? '#26a69a' : '#ef5350'}">
              ${(t.sellPrice - t.buyPrice) >= 0 ? '+' : ''}${changeArrow}%
            </div>
          </div>
          <div class="th-card__right">
            <div class="th-card__pnl" style="color:${pnlColor}">${pnlSign}${this.formatPrice(t.profit)}</div>
            <span class="th-card__badge ${badge}">${pnlSign}${pct}%</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /** Download a canvas PNG card summarising trade history */
  downloadHistoryCard() {
    const all = gameState.get('tradeHistory') || [];
    if (!all.length) { ui.error('Tidak ada riwayat trading'); return; }

    const wins     = all.filter(t => t.profit >= 0);
    const losses   = all.filter(t => t.profit < 0);
    const totalPnL = all.reduce((s, t) => s + (t.profit || 0), 0);
    const winRate  = ((wins.length / all.length) * 100).toFixed(0);
    const bestTrade = Math.max(...all.map(t => t.profit || 0));
    const worstTrade = Math.min(...all.map(t => t.profit || 0));
    const avgPnL    = totalPnL / all.length;
    const isProfit  = totalPnL >= 0;
    const now = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

    const W = 560, H = 380;
    const canvas = document.createElement('canvas');
    canvas.width  = W * 2; canvas.height = H * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, isProfit ? '#0a1a14' : '#1a0a0a');
    bg.addColorStop(1, '#09090b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Glow
    const glow = ctx.createRadialGradient(W * 0.5, 60, 0, W * 0.5, 60, W * 0.6);
    glow.addColorStop(0, isProfit ? 'rgba(38,166,154,0.1)' : 'rgba(239,83,80,0.1)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = isProfit ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.roundRect(2, 2, W - 4, H - 4, 16); ctx.stroke();

    const t = (text, x, y, font, color, align = 'left') => {
      ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, y);
    };
    const accent = isProfit ? '#26a69a' : '#ef5350';

    t('AuraAssets', 36, 36, 'bold 12px Inter, sans-serif', 'rgba(255,255,255,0.35)');
    t('Trading Report', W / 2, 36, 'bold 14px Inter, sans-serif', 'rgba(255,255,255,0.6)', 'center');
    t(now, W - 36, 36, '11px Inter, sans-serif', 'rgba(255,255,255,0.25)', 'right');

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(36, 52); ctx.lineTo(W - 36, 52); ctx.stroke();

    // Total PnL hero
    t(`${isProfit ? '+' : ''}${this.formatPrice(totalPnL)}`, W / 2, 96, 'bold 36px Inter, sans-serif', accent, 'center');
    t('Total Profit / Loss', W / 2, 118, '12px Inter, sans-serif', 'rgba(255,255,255,0.4)', 'center');

    // Stats grid (2 rows × 4 cols)
    const stats = [
      ['Win Rate',   winRate + '%',                        wins.length >= all.length / 2 ? '#26a69a' : '#ef5350'],
      ['Menang',     wins.length + ' trades',              '#26a69a'],
      ['Kalah',      losses.length + ' trades',            '#ef5350'],
      ['Total Trade',all.length + ' trades',               '#f0f0f0'],
      ['Best Trade', '+' + this.formatPrice(bestTrade),    '#f59e0b'],
      ['Worst Trade', this.formatPrice(worstTrade),        '#f87171'],
      ['Avg P/L',    (avgPnL >= 0 ? '+' : '') + this.formatPrice(avgPnL), avgPnL >= 0 ? '#26a69a' : '#ef5350'],
      ['Simbol',     this.currentAsset || '—',             '#a78bfa'],
    ];

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    stats.forEach(([lbl, val, color], i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x   = 36 + col * (W - 72) / 4;
      const y   = 148 + row * 64;
      const bW  = (W - 72) / 4 - 8;

      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x, y - 2, bW, 50, 6); ctx.stroke();
      t(lbl, x + 8, y + 14,  '9px Inter, sans-serif',       'rgba(255,255,255,0.4)');
      t(val, x + 8, y + 33,  'bold 12px Inter, sans-serif', color);
    });

    // Last 3 trades
    t('Transaksi Terakhir', 36, 295, 'bold 10px Inter, sans-serif', 'rgba(255,255,255,0.4)');
    all.slice(0, 3).forEach((tr, i) => {
      const y2  = 312 + i * 22;
      const win = tr.profit >= 0;
      t(`${tr.asset}`, 36,     y2, 'bold 10px Inter, sans-serif', '#ffffff');
      t(`${win ? '+' : ''}${this.formatPrice(tr.profit)}`, W - 36, y2, '10px Inter, sans-serif', win ? '#26a69a' : '#ef5350', 'right');
    });

    const link = document.createElement('a');
    link.download = `TradingReport_${Date.now()}.png`;
    link.href     = canvas.toDataURL('image/png');
    link.click();
    ui.success('✅ Laporan trading berhasil diunduh!');
  }

  close() {
    if (this.updateInterval) { clearInterval(this.updateInterval); this.updateInterval = null; }
    document.getElementById('trading-page')?.remove();
    document.getElementById('btn-close-trading-topbar')?.remove();
    document.getElementById('btn-close-trading-topbar-global')?.remove();
    
    const bottomNav = document.querySelector('.app-bottom-nav');
    if (bottomNav) bottomNav.style.display = '';

    // Restore previously hidden panels and sections
    const activeView = document.querySelector('.nav-btn.active')?.dataset.view || 'home';
    if (activeView === 'home') {
        const homeSections = ['view-home', 'balance-card', 'market-pulse-widget', 'earn-panel', '.quick-actions', 'footer-dashboard-grid'];
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

  // Utility
  formatPrice(price) {
    if (price >= 1000) return '$ ' + new Intl.NumberFormat('en-US').format(Math.round(price));
    if (price >= 1) return '$ ' + price.toFixed(2);
    return '$ ' + price.toFixed(6);
  }

  formatVolume(vol) {
    if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(2) + 'M';
    return (vol / 1e3).toFixed(2) + 'K';
  }

  calculatePnL(holding, currentPrice) {
    return (holding.shares || holding.amount) * currentPrice - holding.totalInvested;
  }

  formatPnL(holding, currentPrice) {
    const pnl = this.calculatePnL(holding, currentPrice);
    const pct = (pnl / holding.totalInvested) * 100;
    return `$ ${financeManager.formatCurrency(Math.abs(pnl))} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
  }

  renderTradeHistoryRows() {
    const history = gameState.get('tradeHistory') || [];
    if (history.length === 0) {
      return `
        <tr>
          <td colspan="4" style="text-align: center; padding: 1.5rem 0; color: var(--text-muted); font-style: italic;">
            Belum ada riwayat perdagangan
          </td>
        </tr>
      `;
    }

    return history.slice(0, 10).map(t => {
      const isPositive = t.profit >= 0;
      const profitText = `${isPositive ? '+' : ''}${this.formatPrice(t.profit)}`;
      const pctText = `${isPositive ? '+' : ''}${t.profitPercent.toFixed(2)}%`;
      const badgeColor = isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      const textColor = isPositive ? '#34d399' : '#f87171';
      
      const formattedAmount = t.assetType === 'stock'
        ? `${t.amount} lot`
        : `${cryptoMarket.formatAmount(t.amount)}`;

      return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s;">
          <td style="padding: 0.75rem 0.25rem; font-weight: 700; color: white;">
            <span style="font-size: 1.1rem; margin-right: 0.25rem;">${t.assetType === 'stock' ? '📊' : '🪙'}</span>
            ${t.asset}
          </td>
          <td style="padding: 0.75rem 0.25rem; color: var(--text-muted);">${formattedAmount}</td>
          <td style="padding: 0.75rem 0.25rem; font-family: monospace;">
            <div style="font-size: 0.7rem; color: var(--text-muted); text-decoration: line-through;">${this.formatPrice(t.buyPrice)}</div>
            <div style="color: white; font-weight: 600;">${this.formatPrice(t.sellPrice)}</div>
          </td>
          <td style="padding: 0.75rem 0.25rem; text-align: right;">
            <div style="color: ${textColor}; font-weight: 700;">${profitText}</div>
            <span style="display: inline-block; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: ${badgeColor}; color: ${textColor}; font-weight: 600; margin-top: 2px;">
              ${pctText}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  updateTradeHistoryTable() {
    const tbody = document.querySelector('#trading-page tbody');
    if (tbody) {
      tbody.innerHTML = this.renderTradeHistoryRows();
    }
  }
}

export const tradingPage = new TradingPage();
export default tradingPage;
