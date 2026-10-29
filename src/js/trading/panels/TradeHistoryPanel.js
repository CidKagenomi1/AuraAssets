/**
 * TradeHistoryPanel.js - Trade History Ledger & PnL Canvas Generator Panel
 * Handles:
 *  - Trade history cards and table view with filters (all, win, loss, stock, crypto)
 *  - Win rate & total PnL summary analytics
 *  - High-res Canvas 2D PNG export for individual position PnL cards
 *  - High-res Canvas 2D PNG export for overall trade history report cards
 */

import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import cryptoMarket from '../CryptoMarket.js';
import stockMarket from '../StockMarket.js';
import ui from '../../ui/UIManager.js';
import { Icons } from '../../ui/Icons.js';

class TradeHistoryPanel {
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

  _calcLiqPrice(holding, currentPrice) {
    const entry = holding.avgPrice || (holding.totalInvested / (holding.shares || holding.amount || 1));
    return entry * 0.80;
  }

  _calcPriceGap(holding, currentPrice) {
    const entry = holding.avgPrice || (holding.totalInvested / (holding.shares || holding.amount || 1));
    const gap = ((currentPrice - entry) / (entry || 1)) * 100;
    return `${gap >= 0 ? '+' : ''}${gap.toFixed(2)}%`;
  }

  /**
   * Render the 4-stat summary analytics row
   */
  renderSummary() {
    const all = gameState.get('tradeHistory') || [];
    if (!all.length) return '';

    const wins = all.filter(t => t.profit >= 0);
    const losses = all.filter(t => t.profit < 0);
    const totalPnL = all.reduce((s, t) => s + (t.profit || 0), 0);
    const winRate = all.length ? ((wins.length / all.length) * 100).toFixed(0) : 0;
    const bestTrade = all.length ? Math.max(...all.map(t => t.profit || 0)) : 0;
    const isProfit = totalPnL >= 0;

    const stat = (label, val, color = 'white') =>
      `<div class="th-stat"><div class="th-stat__label">${label}</div><div class="th-stat__value" style="color:${color}">${val}</div></div>`;

    return `
      <div class="th-stats">
        ${stat('Win Rate', winRate + '%', parseInt(winRate, 10) >= 50 ? '#26a69a' : '#ef5350')}
        ${stat('Total P/L', (isProfit ? '+' : '') + this.formatPrice(totalPnL), isProfit ? '#26a69a' : '#ef5350')}
        ${stat('Trades', all.length)}
        ${stat('Best', '+' + this.formatPrice(bestTrade), '#f59e0b')}
      </div>
    `;
  }

  /**
   * Render trade history cards by filter
   */
  renderCards(filter = 'all') {
    const all = gameState.get('tradeHistory') || [];
    if (!all.length) {
      return `<div class="th-empty" style="display:flex; align-items:center; justify-content:center; gap:6px;">${Icons.inbox(18, 'var(--text-muted)')} Belum ada riwayat trading</div>`;
    }

    const filtered = all.filter(t => {
      if (filter === 'win') return t.profit >= 0;
      if (filter === 'loss') return t.profit < 0;
      if (filter === 'stock') return t.assetType === 'stock';
      if (filter === 'crypto') return t.assetType === 'crypto';
      return true;
    }).slice(0, 20);

    if (!filtered.length) {
      return `<div class="th-empty">Tidak ada data untuk filter ini</div>`;
    }

    return filtered.map(t => {
      const isWin = t.profit >= 0;
      const pnlColor = isWin ? '#26a69a' : '#ef5350';
      const pct = t.profitPercent != null ? t.profitPercent.toFixed(2) : '0.00';
      const pnlSign = isWin ? '+' : '';
      const qty = t.assetType === 'stock'
        ? `${t.amount} lot`
        : `${cryptoMarket.formatAmount ? cryptoMarket.formatAmount(t.amount) : t.amount.toFixed(4)}`;
      const icon = t.assetType === 'stock' ? Icons.barChart(14, 'var(--accent-primary)') : Icons.coins(14, '#f59e0b');
      const badge = isWin ? 'th-card__badge--win' : 'th-card__badge--loss';
      const changeArrow = ((t.sellPrice - t.buyPrice) / (t.buyPrice || 1) * 100).toFixed(2);

      return `
        <div class="th-card">
          <div class="th-card__left">
            <span class="th-card__icon" style="display:inline-flex; align-items:center;">${icon}</span>
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

  /**
   * Render full HTML markup of the Trade History Panel
   */
  render() {
    const history = gameState.get('tradeHistory') || [];
    return `
      <div class="th-panel">
        <!-- Panel header -->
        <div class="th-header">
          <div class="th-title" style="display:flex; align-items:center; gap:6px;">
            <span style="display:inline-flex; align-items:center; gap:5px;">${Icons.fileText(15, 'var(--accent-primary)')} Riwayat Trading</span>
            <span id="th-count-badge" class="th-badge">${history.length} transaksi</span>
          </div>
          <button id="btn-download-history" class="th-dl-btn" title="Download Ringkasan">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Unduh
          </button>
        </div>

        <!-- Stats Summary Row -->
        <div id="th-summary-container">
          ${this.renderSummary()}
        </div>

        <!-- Filter tabs -->
        <div class="th-filters" id="th-filters">
          <button class="th-filter active" data-filter="all">Semua</button>
          <button class="th-filter" data-filter="win" style="display:inline-flex; align-items:center; gap:4px;">${Icons.checkCircle(12, '#10b981')} Win</button>
          <button class="th-filter" data-filter="loss" style="display:inline-flex; align-items:center; gap:4px;">${Icons.xCircle(12, '#ef4444')} Loss</button>
          <button class="th-filter" data-filter="stock" style="display:inline-flex; align-items:center; gap:4px;">${Icons.barChart(12, 'var(--accent-primary)')} Saham</button>
          <button class="th-filter" data-filter="crypto" style="display:inline-flex; align-items:center; gap:4px;">${Icons.coins(12, '#f59e0b')} Crypto</button>
        </div>

        <!-- Card list -->
        <div class="th-list" id="th-list" style="max-height: 300px; overflow-y: auto;">
          ${this.renderCards('all')}
        </div>
      </div>
    `;
  }

  /**
   * Render table rows (if displayed in table mode)
   */
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
            <span style="display: inline-flex; align-items: center; margin-right: 0.35rem;">${t.assetType === 'stock' ? Icons.barChart(14, 'var(--accent-primary)') : Icons.coins(14, '#f59e0b')}</span>
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

  updateList(filter = 'all') {
    const list = document.getElementById('th-list');
    if (list) list.innerHTML = this.renderCards(filter);

    const summary = document.getElementById('th-summary-container');
    if (summary) summary.innerHTML = this.renderSummary();

    const countBadge = document.getElementById('th-count-badge');
    if (countBadge) {
      const history = gameState.get('tradeHistory') || [];
      countBadge.textContent = `${history.length} transaksi`;
    }
  }

  /**
   * Download a canvas-rendered PnL card as a PNG
   */
  downloadPnlCard(asset, assetType) {
    if (!asset) {
      ui.error('Asset tidak ditemukan');
      return;
    }
    const symbol = asset.symbol;
    const portfolio = assetType === 'stock'
      ? gameState.get('stocks') || {}
      : gameState.get('crypto') || {};
    const h = portfolio[symbol];
    if (!h) {
      ui.error('Tidak ada posisi aktif untuk dibagikan');
      return;
    }

    const pnl = this.calculatePnL(h, asset.price);
    const pct = (pnl / (h.totalInvested || 1)) * 100;
    const isProfit = pnl >= 0;
    const entry = h.avgPrice || (h.totalInvested / (h.shares || h.amount || 1));
    const now = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

    // Canvas dimensions
    const W = 560, H = 320;
    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = H * 2;
    canvas.style.width = W + 'px';
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
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(2, 2, W - 4, H - 4, 16);
    ctx.stroke();

    const txt = (text, x, y, font, color, align = 'left') => {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.fillText(text, x, y);
    };

    const accent = isProfit ? '#26a69a' : '#ef5350';
    const arrow = isProfit ? '▲' : '▼';

    // Logo / brand
    txt('AuraAssets', 36, 38, 'bold 13px Inter, sans-serif', 'rgba(255,255,255,0.35)');
    txt(now, W - 36, 38, '12px Inter, sans-serif', 'rgba(255,255,255,0.25)', 'right');

    // Asset symbol
    txt(symbol, 36, 80, 'bold 32px Inter, sans-serif', '#ffffff');
    txt((assetType || 'ASSET').toUpperCase(), 36, 102, '11px Inter, sans-serif', 'rgba(255,255,255,0.4)');

    // PnL main
    const pnlStr = `${isProfit ? '+' : ''}${this.formatPrice(Math.abs(pnl))}`;
    txt(pnlStr, W / 2, 88, 'bold 38px Inter, sans-serif', accent, 'center');
    txt(`${arrow} ${isProfit ? '+' : ''}${pct.toFixed(2)}%`, W / 2, 116, 'bold 18px Inter, sans-serif', accent, 'center');

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, 136); ctx.lineTo(W - 36, 136);
    ctx.stroke();

    // Details grid 4 items
    const details = [
      ['Entry Price', this.formatPrice(entry)],
      ['Mark Price', this.formatPrice(asset.price)],
      ['Liq. Price', this.formatPrice(this._calcLiqPrice(h, asset.price))],
      ['Price Gap', this._calcPriceGap(h, asset.price)],
    ];
    details.forEach(([label, val], i) => {
      const col = i % 2 === 0 ? 36 : W / 2 + 20;
      const row = 162 + Math.floor(i / 2) * 52;
      txt(label, col, row, '10.5px Inter, sans-serif', 'rgba(255,255,255,0.4)');
      txt(val, col, row + 20, 'bold 14px Inter, sans-serif', '#ffffff');
    });

    // Quantity row
    const qty = assetType === 'stock'
      ? h.shares + ' lot'
      : `${cryptoMarket.formatAmount(h.amount)} ${symbol}`;
    txt('Jumlah Posisi', 36, H - 52, '10px Inter, sans-serif', 'rgba(255,255,255,0.35)');
    txt(qty, 36, H - 34, 'bold 13px Inter, sans-serif', 'rgba(255,255,255,0.7)');

    // Decorative scan box
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(W - 90, H - 80, 56, 56, 6);
    ctx.stroke();
    txt('SCAN', W - 62, H - 44, 'bold 8px Inter, sans-serif', 'rgba(255,255,255,0.2)', 'center');

    // Trigger download
    const link = document.createElement('a');
    link.download = `${symbol}_PnL_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    ui.success('PnL card berhasil diunduh!');
  }

  /**
   * Download a canvas PNG card summarising overall trade history
   */
  downloadHistoryCard(currentSymbol = 'TERMINAL') {
    const all = gameState.get('tradeHistory') || [];
    if (!all.length) {
      ui.error('Tidak ada riwayat trading');
      return;
    }

    const wins = all.filter(t => t.profit >= 0);
    const losses = all.filter(t => t.profit < 0);
    const totalPnL = all.reduce((s, t) => s + (t.profit || 0), 0);
    const winRate = ((wins.length / all.length) * 100).toFixed(0);
    const bestTrade = Math.max(...all.map(t => t.profit || 0));
    const worstTrade = Math.min(...all.map(t => t.profit || 0));
    const avgPnL = totalPnL / all.length;
    const isProfit = totalPnL >= 0;
    const now = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

    const W = 560, H = 380;
    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = H * 2;
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
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = isProfit ? 'rgba(38,166,154,0.3)' : 'rgba(239,83,80,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(2, 2, W - 4, H - 4, 16);
    ctx.stroke();

    const t = (text, x, y, font, color, align = 'left') => {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.fillText(text, x, y);
    };
    const accent = isProfit ? '#26a69a' : '#ef5350';

    t('AuraAssets', 36, 36, 'bold 12px Inter, sans-serif', 'rgba(255,255,255,0.35)');
    t('Trading Report', W / 2, 36, 'bold 14px Inter, sans-serif', 'rgba(255,255,255,0.6)', 'center');
    t(now, W - 36, 36, '11px Inter, sans-serif', 'rgba(255,255,255,0.25)', 'right');

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, 52); ctx.lineTo(W - 36, 52);
    ctx.stroke();

    // Total PnL hero
    t(`${isProfit ? '+' : ''}${this.formatPrice(totalPnL)}`, W / 2, 96, 'bold 36px Inter, sans-serif', accent, 'center');
    t('Total Profit / Loss', W / 2, 118, '12px Inter, sans-serif', 'rgba(255,255,255,0.4)', 'center');

    // Stats grid (2 rows × 4 cols)
    const stats = [
      ['Win Rate', winRate + '%', wins.length >= all.length / 2 ? '#26a69a' : '#ef5350'],
      ['Menang', wins.length + ' trades', '#26a69a'],
      ['Kalah', losses.length + ' trades', '#ef5350'],
      ['Total Trade', all.length + ' trades', '#f0f0f0'],
      ['Best Trade', '+' + this.formatPrice(bestTrade), '#f59e0b'],
      ['Worst Trade', this.formatPrice(worstTrade), '#f87171'],
      ['Avg P/L', (avgPnL >= 0 ? '+' : '') + this.formatPrice(avgPnL), avgPnL >= 0 ? '#26a69a' : '#ef5350'],
      ['Simbol', currentSymbol || '—', '#a78bfa'],
    ];

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    stats.forEach(([lbl, val, color], i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 36 + col * (W - 72) / 4;
      const y = 148 + row * 64;
      const bW = (W - 72) / 4 - 8;

      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y - 2, bW, 50, 6);
      ctx.stroke();
      t(lbl, x + 8, y + 14, '9px Inter, sans-serif', 'rgba(255,255,255,0.4)');
      t(val, x + 8, y + 33, 'bold 12px Inter, sans-serif', color);
    });

    // Last 3 trades
    t('Transaksi Terakhir', 36, 295, 'bold 10px Inter, sans-serif', 'rgba(255,255,255,0.4)');
    all.slice(0, 3).forEach((tr, i) => {
      const y2 = 312 + i * 22;
      const win = tr.profit >= 0;
      t(`${tr.asset}`, 36, y2, 'bold 10px Inter, sans-serif', '#ffffff');
      t(`${win ? '+' : ''}${this.formatPrice(tr.profit)}`, W - 36, y2, '10px Inter, sans-serif', win ? '#26a69a' : '#ef5350', 'right');
    });

    const link = document.createElement('a');
    link.download = `TradingReport_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    ui.success('Laporan trading berhasil diunduh!');
  }

  bindEvents(currentSymbol) {
    // Filter buttons
    document.getElementById('th-filters')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.th-filter');
      if (!btn) return;
      document.querySelectorAll('.th-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const list = document.getElementById('th-list');
      if (list) list.innerHTML = this.renderCards(btn.dataset.filter);
    });

    // Download history button
    document.getElementById('btn-download-history')?.addEventListener('click', () => {
      this.downloadHistoryCard(currentSymbol);
    });
  }
}

export default new TradeHistoryPanel();

