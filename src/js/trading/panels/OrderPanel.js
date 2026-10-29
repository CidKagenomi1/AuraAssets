/**
 * OrderPanel.js - Order Form Execution & Position Management Panel
 * Features:
 *  - High-end glassmorphic trading terminal aesthetic
 *  - Tactile BUY / SELL side selector with radiant neon glow
 *  - Segmented Market (Instant) vs Limit (Target Price) tabs
 *  - Custom inputs with integrated unit badges (LOT / USD)
 *  - Visual allocation slider + quick allocation chips (10%, 25%, 50%, 75%, MAX)
 *  - Smart Limit Price suggestion offsets (-5%, -1%, Market, +1%, +5%)
 *  - Comprehensive Order Summary (Est. Total, Remaining Balance, Zero Fee)
 *  - Collapsible Advanced Risk Management (Take Profit & Stop Loss)
 *  - Real-time Position Status Card with ROE progress bar & quick actions
 */

import stockMarket from '../StockMarket.js';
import cryptoMarket from '../CryptoMarket.js';
import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../core/GameState.js';
import ui from '../../ui/UIManager.js';
import { Icons } from '../../ui/Icons.js';

class OrderPanel {
  formatPrice(price) {
    if (price === undefined || price === null || isNaN(price)) return '$ 0';
    if (price >= 1000) return '$ ' + new Intl.NumberFormat('en-US').format(Math.round(price));
    if (price >= 1) return '$ ' + Number(price).toFixed(2);
    return '$ ' + Number(price).toFixed(4);
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

  _calcLiqPrice(holding, currentPrice) {
    const entry = holding.avgPrice || (holding.totalInvested / (holding.shares || holding.amount || 1));
    return entry * 0.80;
  }

  _calcPriceGap(holding, currentPrice) {
    const entry = holding.avgPrice || (holding.totalInvested / (holding.shares || holding.amount || 1));
    const gap = ((currentPrice - entry) / (entry || 1)) * 100;
    return `${gap >= 0 ? '+' : ''}${gap.toFixed(2)}%`;
  }

  render(asset, assetType) {
    const symbol = asset.symbol;
    const portfolio = assetType === 'stock' ? gameState.get('stocks') || {} : gameState.get('crypto') || {};
    const holding = portfolio[symbol];
    const balance = gameState.getBalance();
    const unitLabel = assetType === 'stock' ? 'LOT' : 'USD';

    return `
      <!-- ══ ACTIVE POSITION CARD ══════════════════════════════════ -->
      ${holding ? `
      <div class="pos-detail-card" id="pos-detail-card">
        <!-- Header row -->
        <div class="pos-detail-header">
          <div>
            <span class="pos-badge">LONG</span>
            <span class="pos-symbol">${symbol}</span>
            <span class="pos-size">${assetType === 'stock' ? holding.shares + ' lot' : cryptoMarket.formatAmount(holding.amount) + ' ' + symbol}</span>
          </div>
          <div id="pos-upnl" class="pos-upnl ${this.calculatePnL(holding, asset.price) >= 0 ? 'pos-upnl--profit' : 'pos-upnl--loss'}">
            ${this.calculatePnL(holding, asset.price) >= 0 ? '+' : ''}${this.formatPnL(holding, asset.price)}
          </div>
        </div>

        <!-- Metric grid -->
        <div class="pos-metrics">
          <div class="pos-metric">
            <span class="pos-metric__label">Entry Price</span>
            <span class="pos-metric__value" id="pos-entry">${this.formatPrice(holding.avgPrice || (holding.totalInvested / (holding.shares || holding.amount || 1)))}</span>
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
              style="width: ${Math.min(100, Math.abs((this.calculatePnL(holding, asset.price) / (holding.totalInvested || 1)) * 100)).toFixed(1)}%">
            </div>
          </div>
          <span class="pos-pnl-pct" id="pos-pnl-pct">
            ${((this.calculatePnL(holding, asset.price) / (holding.totalInvested || 1)) * 100).toFixed(2)}%
          </span>
        </div>

        <!-- Action buttons -->
        <div class="pos-actions">
          <button id="btn-close-pos" class="pos-btn-sell" title="Tutup seluruh posisi aset ini">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            Jual Semua
          </button>
          <button id="btn-download-pnl" class="pos-btn-card" title="Download gambar PnL Card resolusi tinggi">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            PnL Card
          </button>
        </div>
      </div>
      ` : `
      <div class="pos-detail-card pos-detail-card--empty">
        <div class="pos-empty-icon">${Icons.inbox(32, '#71717a')}</div>
        <div class="pos-empty-title">Tidak Ada Posisi Aktif</div>
        <div class="pos-empty-sub">Gunakan form di bawah untuk mengeksekusi order buy/sell</div>
      </div>
      `}

      <!-- ══ ORDER EXECUTION CARD ═══════════════════════════════════ -->
      <div class="order-form-card">
        <!-- Side Switcher: BUY vs SELL -->
        <div class="order-side-tabs">
          <button class="order-tab-btn active" data-side="buy">
            <span style="display:inline-flex; align-items:center;">${Icons.arrowUp(14, '#10b981')}</span>
            <span>BELI</span>
          </button>
          <button class="order-tab-btn" data-side="sell">
            <span style="display:inline-flex; align-items:center;">${Icons.arrowDown(14, '#ef4444')}</span>
            <span>JUAL</span>
          </button>
        </div>

        <!-- Order Type: Market vs Limit -->
        <div class="order-type-tabs">
          <button class="order-type-btn active" data-type="market" style="display:inline-flex; align-items:center; justify-content:center; gap:5px;">
            ${Icons.zap(14)} Market (Instan)
          </button>
          <button class="order-type-btn" data-type="limit" style="display:inline-flex; align-items:center; justify-content:center; gap:5px;">
            ${Icons.target(14)} Limit (Harga Pas)
          </button>
        </div>

        <!-- ── Market Order Form ──────────────────────────────────── -->
        <div id="market-form" class="order-form-content">
          <div class="order-form-group" style="margin-bottom: 0.85rem;">
            <div class="order-label-row">
              <span class="order-label-title">${assetType === 'stock' ? 'Volume Order' : 'Nominal Order'}</span>
              <span class="order-label-balance" id="btn-fill-max-market" title="Klik untuk pasang 100% modal">
                Saldo: $ ${financeManager.formatCurrency(balance)} <span style="display:inline-flex; align-items:center; margin-left:2px;">${Icons.wallet(13, 'var(--accent-primary)')}</span>
              </span>
            </div>
            <div class="order-input-wrapper">
              <input type="text" inputmode="numeric" id="market-amount"
                value="${assetType === 'stock' ? '100' : '1,000,000'}"
                placeholder="${assetType === 'stock' ? '100' : '1,000,000'}">
              <span class="order-input-badge">${unitLabel}</span>
            </div>
          </div>

          <!-- Allocation Slider & Quick Percentage Chips -->
          <div class="order-slider-section" style="margin-bottom: 1.15rem;">
            <div class="order-label-row">
              <span class="order-label-title">Alokasi Modal</span>
              <span id="market-pct-label" style="color: var(--accent-primary); font-weight: 800; font-size: 0.8rem;">0%</span>
            </div>
            <input type="range" id="market-pct-slider" class="order-pct-slider" min="0" max="100" value="0">
            <div class="quick-pct-grid">
              <button type="button" class="quick-pct-btn" data-pct="10">10%</button>
              <button type="button" class="quick-pct-btn" data-pct="25">25%</button>
              <button type="button" class="quick-pct-btn" data-pct="50">50%</button>
              <button type="button" class="quick-pct-btn" data-pct="75">75%</button>
              <button type="button" class="quick-pct-btn" data-pct="100">MAX</button>
            </div>
          </div>
        </div>

        <!-- ── Limit Order Form ───────────────────────────────────── -->
        <div id="limit-form" class="order-form-content" style="display: none;">
          <!-- Limit Price Input -->
          <div class="order-form-group" style="margin-bottom: 0.75rem;">
            <div class="order-label-row">
              <span class="order-label-title">Harga Limit Target</span>
              <span style="font-size: 0.68rem; color: var(--text-muted);">Mark: ${this.formatPrice(asset.price)}</span>
            </div>
            <div class="order-input-wrapper">
              <input type="text" inputmode="decimal" id="limit-price" value="${this.formatPrice(asset.price).replace('$ ', '')}">
              <span class="order-input-badge">USD</span>
            </div>
            <!-- Quick Price Offsets -->
            <div class="price-suggest-grid">
              <button type="button" class="price-suggest-btn" data-offset="-0.05">-5%</button>
              <button type="button" class="price-suggest-btn" data-offset="-0.01">-1%</button>
              <button type="button" class="price-suggest-btn" data-offset="0">Market</button>
              <button type="button" class="price-suggest-btn" data-offset="0.01">+1%</button>
              <button type="button" class="price-suggest-btn" data-offset="0.05">+5%</button>
            </div>
          </div>

          <!-- Limit Amount Input -->
          <div class="order-form-group" style="margin-bottom: 0.85rem;">
            <div class="order-label-row">
              <span class="order-label-title">${assetType === 'stock' ? 'Volume Order' : 'Nominal Order'}</span>
              <span class="order-label-balance" id="btn-fill-max-limit" title="Klik untuk pasang 100% modal">
                Saldo: $ ${financeManager.formatCurrency(balance)} <span style="display:inline-flex; align-items:center; margin-left:2px;">${Icons.wallet(13, 'var(--accent-primary)')}</span>
              </span>
            </div>
            <div class="order-input-wrapper">
              <input type="text" inputmode="numeric" id="limit-amount"
                value="${assetType === 'stock' ? '100' : '1,000,000'}"
                placeholder="${assetType === 'stock' ? '100' : '1,000,000'}">
              <span class="order-input-badge">${unitLabel}</span>
            </div>
          </div>

          <!-- Allocation Slider & Quick Percentage Chips -->
          <div class="order-slider-section" style="margin-bottom: 1.15rem;">
            <div class="order-label-row">
              <span class="order-label-title">Alokasi Modal</span>
              <span id="limit-pct-label" style="color: var(--accent-primary); font-weight: 800; font-size: 0.8rem;">0%</span>
            </div>
            <input type="range" id="limit-pct-slider" class="order-pct-slider" min="0" max="100" value="0">
            <div class="quick-pct-grid">
              <button type="button" class="quick-pct-btn" data-pct="10">10%</button>
              <button type="button" class="quick-pct-btn" data-pct="25">25%</button>
              <button type="button" class="quick-pct-btn" data-pct="50">50%</button>
              <button type="button" class="quick-pct-btn" data-pct="75">75%</button>
              <button type="button" class="quick-pct-btn" data-pct="100">MAX</button>
            </div>
          </div>
        </div>

        <!-- ── Advanced TP / SL Accordion ────────────────────────── -->
        <div class="tpsl-section">
          <div class="tpsl-toggle">
            <input type="checkbox" id="tpsl-enabled">
            <label for="tpsl-enabled">
              <span style="display:inline-flex; align-items:center;">${Icons.shield(14, 'var(--accent-primary)')}</span>
              <span>Proteksi Risiko (TP & SL)</span>
            </label>
          </div>
          <div id="tpsl-inputs" class="tpsl-inputs-grid" style="display: none;">
            <div class="tpsl-field">
              <label style="color: #10b981; display:flex; align-items:center; gap:4px;">${Icons.target(13, '#10b981')} Take Profit</label>
              <input type="text" inputmode="decimal" id="tp-price" placeholder="${Math.round(asset.price * 1.1)}">
            </div>
            <div class="tpsl-field">
              <label style="color: #ef4444; display:flex; align-items:center; gap:4px;">${Icons.shieldAlert(13, '#ef4444')} Stop Loss</label>
              <input type="text" inputmode="decimal" id="sl-price" placeholder="${Math.round(asset.price * 0.95)}">
            </div>
          </div>
        </div>

        <!-- ── Order Summary Card ────────────────────────────────── -->
        <div class="order-summary-box">
          <div class="summary-item-row highlight">
            <span class="summary-item-label" style="font-weight: 700; color: #fff;">Est. Total Transaksi</span>
            <span class="summary-item-val" id="order-est-total" style="color: var(--accent-primary); font-size: 0.95rem;">
              ${this.formatPrice(asset.price * (assetType === 'stock' ? 100 : 1))}
            </span>
          </div>
          <div class="summary-item-row">
            <span class="summary-item-label">Saldo Tersedia</span>
            <span class="summary-item-val" style="color: #e4e4e7;">$ ${financeManager.formatCurrency(balance)}</span>
          </div>
          <div class="summary-item-row">
            <span class="summary-item-label">Biaya / Komisi</span>
            <span class="summary-item-val" style="color: #10b981; font-size: 0.72rem; padding: 1px 6px; background: rgba(16,185,129,0.1); border-radius: 4px;">0% (Free Demo)</span>
          </div>
        </div>

        <!-- ── Radiant Execute CTA Button ────────────────────────── -->
        <button id="execute-order" class="execute-order-btn buy">
          <span class="execute-icon" style="display:inline-flex; align-items:center;">${Icons.arrowUp(16, '#fff')}</span>
          <span class="execute-text">BUY ${symbol}</span>
        </button>
      </div>
    `;
  }

  updatePositionCard(asset, assetType) {
    if (!asset) return;
    const portfolio = assetType === 'stock'
      ? gameState.get('stocks') || {}
      : gameState.get('crypto') || {};
    const h = portfolio[asset.symbol];
    if (!h) return;

    const pnl = this.calculatePnL(h, asset.price);
    const pct = (pnl / (h.totalInvested || 1)) * 100;
    const isProfit = pnl >= 0;
    const barW = Math.min(100, Math.abs(pct)).toFixed(1);

    const upd = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    upd('pos-mark', this.formatPrice(asset.price));
    upd('pos-value', this.formatPrice((h.shares || h.amount) * asset.price));
    upd('pos-gap', this._calcPriceGap(h, asset.price));
    upd('pos-pnl-val', `${isProfit ? '+' : ''}${this.formatPrice(pnl)}`);
    upd('pos-pnl-pct', `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`);
    upd('pos-upnl', `${isProfit ? '+' : ''}${this.formatPnL(h, asset.price)}`);

    const gapEl = document.getElementById('pos-gap');
    const pnlEl = document.getElementById('pos-pnl-val');
    const upnlEl = document.getElementById('pos-upnl');
    const barEl = document.getElementById('pos-pnl-bar');

    if (gapEl) gapEl.className = `pos-metric__value ${isProfit ? 'pos-metric__value--profit' : 'pos-metric__value--danger'}`;
    if (pnlEl) pnlEl.className = `pos-metric__value ${isProfit ? 'pos-metric__value--profit' : 'pos-metric__value--danger'}`;
    if (upnlEl) upnlEl.className = `pos-upnl ${isProfit ? 'pos-upnl--profit' : 'pos-upnl--loss'}`;
    if (barEl) {
      barEl.style.width = barW + '%';
      barEl.className = `pos-pnl-bar ${isProfit ? 'pos-pnl-bar--profit' : 'pos-pnl-bar--loss'}`;
    }
  }

  updateOrderTotal(asset, assetType) {
    if (!asset) return;

    const isLimit = document.querySelector('.order-type-btn.active')?.dataset.type === 'limit';
    const marketInput = document.getElementById('market-amount');
    const limitInput = document.getElementById('limit-amount');
    const marketAmount = marketInput?.getNumericValue ? marketInput.getNumericValue() : (parseInt(marketInput?.value?.replace(/,/g, ''), 10) || 0);
    const limitPrice = parseFloat(document.getElementById('limit-price')?.value) || asset.price;
    const limitAmount = limitInput?.getNumericValue ? limitInput.getNumericValue() : (parseInt(limitInput?.value?.replace(/,/g, ''), 10) || 0);

    const estTotalEl = document.getElementById('order-est-total');
    if (!estTotalEl) return;

    if (isLimit) {
      if (assetType === 'stock') {
        estTotalEl.textContent = this.formatPrice(limitPrice * limitAmount);
      } else {
        estTotalEl.textContent = `≈ ${cryptoMarket.formatAmount(limitAmount / (limitPrice || 1))} ${asset.symbol}`;
      }
    } else {
      if (assetType === 'stock') {
        estTotalEl.textContent = this.formatPrice(asset.price * marketAmount);
      } else {
        estTotalEl.textContent = `≈ ${cryptoMarket.formatAmount(marketAmount / (asset.price || 1))} ${asset.symbol}`;
      }
    }
  }

  calculateMaxBuyOrSell(isLimit, asset, assetType) {
    if (!asset) return 0;
    const isBuy = document.querySelector('.order-tab-btn.active')?.dataset.side === 'buy';
    const limitPrice = parseFloat(document.getElementById('limit-price')?.value?.replace(/,/g, '')) || asset.price;
    const targetPrice = isLimit ? limitPrice : asset.price;

    if (isBuy) {
      const balance = gameState.getBalance();
      return assetType === 'stock' ? Math.floor(balance / targetPrice) : balance;
    } else {
      const portfolio = assetType === 'stock' ? gameState.get('stocks') || {} : gameState.get('crypto') || {};
      const holding = portfolio[asset.symbol];
      if (!holding) return 0;
      if (assetType === 'stock') {
        return holding.shares - (holding.reservedShares || 0);
      } else {
        const totalCryptoHoldings = holding.amount - (holding.reservedAmount || 0);
        return Math.floor(totalCryptoHoldings * targetPrice);
      }
    }
  }

  executeOrder(asset, assetType, onComplete) {
    const isBuy = document.querySelector('.order-tab-btn.active')?.dataset.side === 'buy';
    const isLimit = document.querySelector('.order-type-btn.active')?.dataset.type === 'limit';
    try {
      if (assetType === 'stock') this.executeStockOrder(isBuy, isLimit, asset);
      else this.executeCryptoOrder(isBuy, isLimit, asset);

      if (document.getElementById('tpsl-enabled')?.checked) {
        const tp = parseFloat(document.getElementById('tp-price').value);
        const sl = parseFloat(document.getElementById('sl-price').value);
        if (assetType === 'stock') {
          if (tp) stockMarket.setTakeProfit(asset.symbol, tp);
          if (sl) stockMarket.setStopLoss(asset.symbol, sl);
        } else {
          if (tp) cryptoMarket.setTakeProfit(asset.symbol, tp);
          if (sl) cryptoMarket.setStopLoss(asset.symbol, sl);
        }
      }
      if (typeof onComplete === 'function') onComplete();
    } catch (e) {
      ui.error(e.message);
    }
  }

  executeStockOrder(isBuy, isLimit, asset) {
    const input = document.getElementById(isLimit ? 'limit-amount' : 'market-amount');
    const amount = input?.getNumericValue ? input.getNumericValue() : (parseInt(input?.value?.replace(/,/g, ''), 10) || 0);
    const limitPriceInput = document.getElementById('limit-price');
    const limitPrice = limitPriceInput?.getNumericValue ? limitPriceInput.getNumericValue() : (parseFloat(limitPriceInput?.value?.replace(/,/g, '')) || asset.price);
    if (isBuy) {
      if (isLimit) {
        stockMarket.limitBuy(asset.symbol, amount, limitPrice);
        ui.success(`Limit Buy: ${amount} lot @ $ ${financeManager.formatCurrency(limitPrice)}`);
      } else {
        const r = stockMarket.marketBuy(asset.symbol, amount);
        ui.success(`Buy: ${amount} lot @ $ ${financeManager.formatCurrency(r.price)}`);
      }
    } else {
      if (isLimit) {
        stockMarket.limitSell(asset.symbol, amount, limitPrice);
        ui.success(`Limit Sell: ${amount} lot`);
      } else {
        const r = stockMarket.marketSell(asset.symbol, amount);
        ui.success(`Sell: ${amount} lot. P/L: ${r.profit >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(r.profit)}`);
      }
    }
  }

  executeCryptoOrder(isBuy, isLimit, asset) {
    const input = document.getElementById(isLimit ? 'limit-amount' : 'market-amount');
    const amountIDR = input?.getNumericValue ? input.getNumericValue() : (parseInt(input?.value?.replace(/,/g, ''), 10) || 0);
    const limitPriceInput = document.getElementById('limit-price');
    const limitPrice = limitPriceInput?.getNumericValue ? limitPriceInput.getNumericValue() : (parseFloat(limitPriceInput?.value?.replace(/,/g, '')) || asset.price);
    const holding = (gameState.get('crypto') || {})[asset.symbol];

    if (isBuy) {
      if (isLimit) {
        cryptoMarket.limitBuy(asset.symbol, amountIDR, limitPrice);
        ui.success(`Limit Buy @ ${cryptoMarket.formatPrice(limitPrice)}`);
      } else {
        const r = cryptoMarket.marketBuy(asset.symbol, amountIDR);
        ui.success(`Buy: ${cryptoMarket.formatAmount(r.cryptoAmount)} ${asset.symbol}`);
      }
    } else {
      if (!holding || holding.amount <= 0) {
        ui.error('Tidak punya crypto untuk dijual');
        return;
      }
      const targetPrice = isLimit ? limitPrice : asset.price;
      const cryptoAmountToSell = Math.min(amountIDR / targetPrice, holding.amount);

      if (isLimit) {
        cryptoMarket.limitSell(asset.symbol, cryptoAmountToSell, limitPrice);
        ui.success(`Limit Sell: ${cryptoMarket.formatAmount(cryptoAmountToSell)} ${asset.symbol} @ ${cryptoMarket.formatPrice(limitPrice)}`);
      } else {
        const r = cryptoMarket.marketSell(asset.symbol, cryptoAmountToSell);
        ui.success(`Sell: ${cryptoMarket.formatAmount(cryptoAmountToSell)} ${asset.symbol}. P/L: ${r.profit >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(r.profit)}`);
      }
    }
  }

  bindEvents({ asset, assetType, onOrderExecuted, onReRender, onSharePnl }) {
    const symbol = asset.symbol;

    // BUY / SELL side selector
    document.querySelectorAll('.order-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.order-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const side = btn.dataset.side;
        const executeBtn = document.getElementById('execute-order');
        if (executeBtn) {
          if (side === 'buy') {
            executeBtn.className = 'execute-order-btn buy';
            executeBtn.innerHTML = `<span class="execute-icon" style="display:inline-flex; align-items:center;">${Icons.arrowUp(16, '#fff')}</span><span class="execute-text">BUY ${symbol}</span>`;
          } else {
            executeBtn.className = 'execute-order-btn sell';
            executeBtn.innerHTML = `<span class="execute-icon" style="display:inline-flex; align-items:center;">${Icons.arrowDown(16, '#fff')}</span><span class="execute-text">SELL ${symbol}</span>`;
          }
        }

        // Reset sliders & amounts
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
        if (marketAmountInput) marketAmountInput.value = assetType === 'stock' ? '100' : '1000000';
        if (limitAmountInput) limitAmountInput.value = assetType === 'stock' ? '100' : '1000000';

        this.updateOrderTotal(asset, assetType);
      });
    });

    // Market / Limit Order type buttons
    document.querySelectorAll('.order-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const type = btn.dataset.type;
        const mForm = document.getElementById('market-form');
        const lForm = document.getElementById('limit-form');
        if (mForm) mForm.style.display = type === 'market' ? 'block' : 'none';
        if (lForm) lForm.style.display = type === 'limit' ? 'block' : 'none';
        this.updateOrderTotal(asset, assetType);
      });
    });

    // Percentage calculation helper
    const updateAmountFromPercent = (pct, isLimit) => {
      const isBuy = document.querySelector('.order-tab-btn.active')?.dataset.side === 'buy';
      const limitPrice = parseFloat(document.getElementById('limit-price')?.value) || asset.price;
      const targetPrice = isLimit ? limitPrice : asset.price;
      let finalVal = 0;

      if (isBuy) {
        const balance = gameState.getBalance();
        if (assetType === 'stock') {
          const maxShares = Math.floor(balance / targetPrice);
          finalVal = Math.floor(maxShares * (pct / 100));
        } else {
          finalVal = Math.floor(balance * (pct / 100));
        }
      } else {
        const portfolio = assetType === 'stock' ? gameState.get('stocks') || {} : gameState.get('crypto') || {};
        const holding = portfolio[symbol];
        if (holding) {
          if (assetType === 'stock') {
            const availableShares = holding.shares - (holding.reservedShares || 0);
            finalVal = Math.floor(availableShares * (pct / 100));
          } else {
            const totalCryptoHoldings = holding.amount - (holding.reservedAmount || 0);
            const totalValueUSD = totalCryptoHoldings * targetPrice;
            finalVal = Math.floor(totalValueUSD * (pct / 100));
          }
        }
      }

      if (isLimit) {
        const limitAmt = document.getElementById('limit-amount');
        const limitSld = document.getElementById('limit-pct-slider');
        const limitLbl = document.getElementById('limit-pct-label');
        if (limitAmt) limitAmt.value = finalVal;
        if (limitSld) limitSld.value = pct;
        if (limitLbl) limitLbl.textContent = `${pct}%`;
      } else {
        const mktAmt = document.getElementById('market-amount');
        const mktSld = document.getElementById('market-pct-slider');
        const mktLbl = document.getElementById('market-pct-label');
        if (mktAmt) mktAmt.value = finalVal;
        if (mktSld) mktSld.value = pct;
        if (mktLbl) mktLbl.textContent = `${pct}%`;
      }
      this.updateOrderTotal(asset, assetType);
    };

    // Range Sliders
    document.getElementById('market-pct-slider')?.addEventListener('input', (e) => {
      updateAmountFromPercent(parseInt(e.target.value, 10), false);
    });
    document.getElementById('limit-pct-slider')?.addEventListener('input', (e) => {
      updateAmountFromPercent(parseInt(e.target.value, 10), true);
    });

    // Quick percentage shortcut buttons
    document.querySelectorAll('.quick-pct-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pct = parseInt(btn.dataset.pct, 10);
        const isLimit = document.querySelector('.order-type-btn.active')?.dataset.type === 'limit';
        updateAmountFromPercent(pct, isLimit);
      });
    });

    // Suggested price offset buttons
    document.querySelectorAll('.price-suggest-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const offset = parseFloat(btn.dataset.offset);
        let targetPrice = asset.price;
        if (offset !== 0) {
          targetPrice = asset.price * (1 + offset);
        }

        const priceInput = document.getElementById('limit-price');
        if (priceInput) {
          priceInput.value = assetType === 'stock' ? Math.round(targetPrice) : targetPrice.toFixed(4);
        }
        this.updateOrderTotal(asset, assetType);
      });
    });

    // Click balance shortcut to fill 100%
    document.getElementById('btn-fill-max-market')?.addEventListener('click', () => {
      updateAmountFromPercent(100, false);
    });
    document.getElementById('btn-fill-max-limit')?.addEventListener('click', () => {
      updateAmountFromPercent(100, true);
    });

    // Numeric Inputs (Formatted cleanly without redundant helper buttons)
    const marketAmtInput = document.getElementById('market-amount');
    const limitAmtInput = document.getElementById('limit-amount');
    if (marketAmtInput) {
      ui.setupNumericInput(marketAmtInput, {
        isDecimal: false,
        showZeroAppend: false,
        showMax: false
      });
      marketAmtInput.addEventListener('input', () => this.updateOrderTotal(asset, assetType));
    }
    if (limitAmtInput) {
      ui.setupNumericInput(limitAmtInput, {
        isDecimal: false,
        showZeroAppend: false,
        showMax: false
      });
      limitAmtInput.addEventListener('input', () => this.updateOrderTotal(asset, assetType));
    }

    const limitPriceInput = document.getElementById('limit-price');
    if (limitPriceInput) {
      ui.setupNumericInput(limitPriceInput, {
        isDecimal: assetType === 'crypto',
        showZeroAppend: false,
        showMax: false
      });
      limitPriceInput.addEventListener('input', () => this.updateOrderTotal(asset, assetType));
    }

    const tpPriceInput = document.getElementById('tp-price');
    if (tpPriceInput) {
      ui.setupNumericInput(tpPriceInput, {
        isDecimal: assetType === 'crypto',
        showZeroAppend: false,
        showMax: false
      });
    }

    const slPriceInput = document.getElementById('sl-price');
    if (slPriceInput) {
      ui.setupNumericInput(slPriceInput, {
        isDecimal: assetType === 'crypto',
        showZeroAppend: false,
        showMax: false
      });
    }

    document.getElementById('tpsl-enabled')?.addEventListener('change', (e) => {
      const inputs = document.getElementById('tpsl-inputs');
      if (inputs) inputs.style.display = e.target.checked ? 'grid' : 'none';
    });

    // Execute button
    document.getElementById('execute-order')?.addEventListener('click', () => {
      this.executeOrder(asset, assetType, () => {
        if (typeof onOrderExecuted === 'function') onOrderExecuted();
        setTimeout(() => {
          if (typeof onReRender === 'function') onReRender();
        }, 400);
      });
    });

    // Close position button
    document.getElementById('btn-close-pos')?.addEventListener('click', () => {
      try {
        const portfolio = assetType === 'stock' ? gameState.get('stocks') || {} : gameState.get('crypto') || {};
        const h = portfolio[symbol];
        if (!h) return;

        if (assetType === 'stock') {
          const r = stockMarket.marketSell(symbol, h.shares);
          ui.success(`Sold all ${h.shares} lot. P/L: ${r.profit >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(r.profit)}`);
        } else {
          const r = cryptoMarket.marketSell(symbol, h.amount);
          ui.success(`Sold all ${cryptoMarket.formatAmount(h.amount)} ${symbol}. P/L: ${r.profit >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(r.profit)}`);
        }
        setTimeout(() => {
          if (typeof onReRender === 'function') onReRender();
        }, 400);
      } catch (e) {
        ui.error(e.message);
      }
    });

    // Download PnL Card button
    document.getElementById('btn-download-pnl')?.addEventListener('click', () => {
      if (typeof onSharePnl === 'function') onSharePnl();
    });

    this.updateOrderTotal(asset, assetType);
  }
}

export default new OrderPanel();
