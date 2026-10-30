/**
 * TradeHistoryPanel.js - Trade History Ledger & PnL Analytics Engine Panel
 * Features:
 *  - Interactive trade history cards & table with filters (all, win, loss, stock, crypto)
 *  - Deep algorithmic Performance Analytics: Win Rate, Profit Factor, Risk-Reward Ratio, Streaks, Expectancy
 *  - AI Trading Coach & Strategic Recommendations: evaluates trading style and risk management
 *  - Full Transaction Ledger with live query search, filter chips, and sorting
 *  - Single Trade Inspector: in-depth post-trade breakdown & evaluation
 *  - High-res Canvas 2D PNG export for individual position PnL cards and comprehensive trading reports
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
   * Compute comprehensive trade performance analytics
   */
  computeAnalytics(history = null) {
    const all = history || gameState.get('tradeHistory') || [];
    if (!all.length) {
      return {
        totalTrades: 0,
        wins: [],
        losses: [],
        winRate: 0,
        lossRate: 0,
        totalPnL: 0,
        grossProfit: 0,
        grossLoss: 0,
        profitFactor: 0,
        avgWin: 0,
        avgLoss: 0,
        riskRewardRatio: 0,
        expectancy: 0,
        bestTrade: null,
        worstTrade: null,
        winStreak: 0,
        lossStreak: 0,
        stocks: { total: 0, wins: 0, losses: 0, pnl: 0, winRate: 0 },
        crypto: { total: 0, wins: 0, losses: 0, pnl: 0, winRate: 0 },
        assetList: [],
        coach: {
          style: 'Fase Eksplorasi Awal',
          styleBadge: 'badge-neutral',
          verdict: 'Belum ada data transaksi jual yang tercatat. Lakukan eksekusi beli dan jual saham atau kripto untuk menghasilkan analisis evaluasi performa trading cerdas.',
          tips: [
            'Lakukan pembelian saham atau kripto di panel trading dan uji eksekusi take profit.',
            'Tetapkan batas risiko dengan persentase alokasi terukur (10% - 25% kas).',
            'Manfaatkan indikator Order Book & Analisis Tren sebelum mengeksekusi order.'
          ]
        }
      };
    }

    const wins = all.filter(t => (t.profit || 0) >= 0);
    const losses = all.filter(t => (t.profit || 0) < 0);
    const totalTrades = all.length;
    const winRate = (wins.length / totalTrades) * 100;
    const lossRate = 100 - winRate;
    const totalPnL = all.reduce((s, t) => s + (t.profit || 0), 0);
    const grossProfit = wins.reduce((s, t) => s + (t.profit || 0), 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.profit || 0), 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 999 : 0);
    const avgWin = wins.length ? grossProfit / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;
    const riskRewardRatio = avgLoss > 0 ? (avgWin / avgLoss) : (avgWin > 0 ? 999 : 0);
    const expectancy = (winRate / 100 * avgWin) - (lossRate / 100 * avgLoss);

    // Best & Worst trades
    const bestTrade = wins.length ? wins.reduce((m, t) => (t.profit || 0) > (m.profit || 0) ? t : m, wins[0]) : null;
    const worstTrade = losses.length ? losses.reduce((m, t) => (t.profit || 0) < (m.profit || 0) ? t : m, losses[0]) : null;

    // Consecutive Streaks in chronological order
    const chronological = [...all].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    let curWin = 0, maxWin = 0, curLoss = 0, maxLoss = 0;
    chronological.forEach(t => {
      if ((t.profit || 0) >= 0) {
        curWin++;
        curLoss = 0;
        if (curWin > maxWin) maxWin = curWin;
      } else {
        curLoss++;
        curWin = 0;
        if (curLoss > maxLoss) maxLoss = curLoss;
      }
    });

    // Breakdown by asset type (stock vs crypto)
    const stockTrades = all.filter(t => t.assetType === 'stock');
    const cryptoTrades = all.filter(t => t.assetType === 'crypto');
    const stockWins = stockTrades.filter(t => (t.profit || 0) >= 0);
    const cryptoWins = cryptoTrades.filter(t => (t.profit || 0) >= 0);

    const stocks = {
      total: stockTrades.length,
      wins: stockWins.length,
      losses: stockTrades.length - stockWins.length,
      pnl: stockTrades.reduce((s, t) => s + (t.profit || 0), 0),
      winRate: stockTrades.length ? (stockWins.length / stockTrades.length) * 100 : 0
    };

    const crypto = {
      total: cryptoTrades.length,
      wins: cryptoWins.length,
      losses: cryptoTrades.length - cryptoWins.length,
      pnl: cryptoTrades.reduce((s, t) => s + (t.profit || 0), 0),
      winRate: cryptoTrades.length ? (cryptoWins.length / cryptoTrades.length) * 100 : 0
    };

    // Asset Breakdown
    const assetMap = {};
    all.forEach(t => {
      const sym = t.asset;
      if (!assetMap[sym]) {
        assetMap[sym] = {
          symbol: sym,
          assetType: t.assetType,
          total: 0,
          wins: 0,
          losses: 0,
          totalPnL: 0,
          best: -Infinity,
          worst: Infinity
        };
      }
      assetMap[sym].total++;
      if ((t.profit || 0) >= 0) assetMap[sym].wins++;
      else assetMap[sym].losses++;
      assetMap[sym].totalPnL += (t.profit || 0);
      if ((t.profit || 0) > assetMap[sym].best) assetMap[sym].best = t.profit;
      if ((t.profit || 0) < assetMap[sym].worst) assetMap[sym].worst = t.profit;
    });

    const assetList = Object.values(assetMap).map(a => ({
      ...a,
      best: a.best === -Infinity ? 0 : a.best,
      worst: a.worst === Infinity ? 0 : a.worst,
      winRate: a.total ? (a.wins / a.total) * 100 : 0,
      avgPnL: a.total ? a.totalPnL / a.total : 0
    })).sort((a, b) => b.totalPnL - a.totalPnL);

    // AI Coach Insight
    const coach = this._generateCoachInsight({
      totalTrades,
      winRate,
      profitFactor,
      riskRewardRatio,
      totalPnL,
      avgWin,
      avgLoss,
      assetList,
      stocks,
      crypto
    });

    return {
      totalTrades,
      wins,
      losses,
      winRate,
      lossRate,
      totalPnL,
      grossProfit,
      grossLoss,
      profitFactor,
      avgWin,
      avgLoss,
      riskRewardRatio,
      expectancy,
      bestTrade,
      worstTrade,
      winStreak: maxWin,
      lossStreak: maxLoss,
      stocks,
      crypto,
      assetList,
      coach
    };
  }

  /**
   * Algorithmic AI Coach Evaluation Generator
   */
  _generateCoachInsight({ totalTrades, winRate, profitFactor, riskRewardRatio, totalPnL, avgWin, avgLoss, assetList, stocks, crypto }) {
    let style = '';
    let styleBadge = '';
    let verdict = '';
    const tips = [];

    if (totalTrades < 3) {
      style = 'Fase Eksplorasi Awal';
      styleBadge = 'badge-neutral';
      verdict = 'Data transaksi masih dalam fase pembentukan. Lakukan beberapa siklus transaksi untuk mendapatkan akurasi diagnosis statistik trading.';
      tips.push('Gunakan ukuran lot sedang sambil menguji volatilitas dan momentum harga.');
      tips.push('Gunakan fitur Proteksi Risiko (Take Profit & Stop Loss) pada order form sebelum eksekusi.');
      tips.push('Pantau indikator Order Book Buy vs Sell Depth untuk menentukan titik masuk terkuat.');
      return { style, styleBadge, verdict, tips };
    }

    if (winRate >= 60 && profitFactor >= 1.75) {
      style = 'Elite Tactical Trader';
      styleBadge = 'badge-success';
      verdict = `Performa sangat impresif! Rasio kemenangan Anda tinggi (${winRate.toFixed(1)}%) dengan Profit Factor yang kokoh (${profitFactor >= 999 ? '>10' : profitFactor.toFixed(2)}x). Anda memiliki disiplin waktu masuk (entry) dan realisasi keuntungan yang matang.`;
    } else if (winRate >= 55 && riskRewardRatio >= 1.2) {
      style = 'Disiplin & Terukur';
      styleBadge = 'badge-success';
      verdict = `Pola trading terstruktur dan sehat. Rata-rata laba per kemenangan Anda melampaui kerugian, menghasilkan nilai harapan matematis portofolio yang konsisten positif.`;
    } else if (winRate >= 65 && riskRewardRatio < 0.8) {
      style = 'Scalper (Asimetri Terbalik)';
      styleBadge = 'badge-warning';
      verdict = `Win rate Anda sangat tinggi (${winRate.toFixed(1)}%), namun rata-rata nilai kerugian ($${Math.round(avgLoss).toLocaleString('id-ID')}) lebih besar daripada rata-rata keuntungan ($${Math.round(avgWin).toLocaleString('id-ID')}). Hati-hati terhadap potensi satu kali kerugian besar yang dapat menghapus hasil akumulasi profit.`;
      tips.push('Tingkatkan kedisiplinan cut-loss: jangan biarkan posisi merah melebar melampaui target profit Anda.');
    } else if (winRate < 45 && riskRewardRatio >= 2.0) {
      style = 'Trend Follower / High Asymmetry';
      styleBadge = 'badge-info';
      verdict = `Meskipun persentase menang moderat (${winRate.toFixed(1)}%), rata-rata keuntungan Anda ($${Math.round(avgWin).toLocaleString('id-ID')}) jauh melampaui kerugian ($${Math.round(avgLoss).toLocaleString('id-ID')}). Ini adalah profil khas investor swing/trend jangka menengah.`;
    } else if (totalPnL < 0) {
      style = 'Perlu Pengetatan Disiplin';
      styleBadge = 'badge-danger';
      verdict = `Portofolio saat ini mencatat kerugian bersih netto (-$${Math.abs(Math.round(totalPnL)).toLocaleString('id-ID')}). Faktor kerugian utama umumnya berasal dari penundaan cut-loss atau masuk pasar saat momentum sudah jenuh beli (overbought).`;
      tips.push('Hindari "revenge trading" (memperbesar volume transaksi setelah loss untuk menutup kerugian secara instan).');
    } else {
      style = 'Trader Bertumbuh (Moderate)';
      styleBadge = 'badge-neutral';
      verdict = `Hasil trading bergerak seimbang antara peluang dan risiko. Optimasi sedikit pada titik keluar (exit timing) akan secara signifikan melipatgandakan net return Anda.`;
    }

    // Top asset tip
    if (assetList && assetList.length > 0) {
      const top = assetList[0];
      if (top.totalPnL > 0) {
        tips.push(`Aset paling menguntungkan bagi Anda adalah <strong>${top.symbol}</strong> (+${this.formatPrice(top.totalPnL)} dari ${top.total} trade). Momentum pada aset ini cocok dengan gaya trading Anda.`);
      }
      const worst = assetList[assetList.length - 1];
      if (worst && worst.totalPnL < 0) {
        tips.push(`Aset dengan tekanan kerugian terbesar adalah <strong>${worst.symbol}</strong> (-${this.formatPrice(Math.abs(worst.totalPnL))}). Pertimbangkan untuk memperkecil alokasi modal pada aset ini.`);
      }
    }

    // Stocks vs Crypto comparison tip
    if (stocks.total > 0 && crypto.total > 0) {
      if (stocks.winRate > crypto.winRate + 15) {
        tips.push(`Statistik Anda di <strong>Bursa Saham (${stocks.winRate.toFixed(0)}% Win)</strong> jauh lebih stabil daripada <strong>Pasar Kripto (${crypto.winRate.toFixed(0)}% Win)</strong>. Utamakan porsi modal di saham.`);
      } else if (crypto.winRate > stocks.winRate + 15) {
        tips.push(`Anda lebih adaptif membaca pergerakan volatilitas tinggi di <strong>Pasar Kripto (${crypto.winRate.toFixed(0)}% Win)</strong> dibanding Saham.`);
      }
    }

    if (tips.length < 3) {
      tips.push('Gunakan tombol cepat alokasi persentase modal (10%, 25%, 50%) agar tidak over-leveraged dalam satu posisi.');
    }
    if (tips.length < 3) {
      tips.push('Gunakan Limit Order untuk antre membeli di harga diskon bawah alih-alih mengejar harga yang sedang melonjak.');
    }

    return { style, styleBadge, verdict, tips };
  }

  /**
   * Render the 4-stat summary analytics row in the compact panel
   */
  renderSummary() {
    const all = gameState.get('tradeHistory') || [];
    if (!all.length) return '';

    const wins = all.filter(t => t.profit >= 0);
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
   * Render trade history cards by filter in the compact panel
   */
  renderCards(filter = 'all') {
    const all = gameState.get('tradeHistory') || [];
    if (!all.length) {
      return `
        <div class="th-empty" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding: 1.5rem 1rem;">
          <span style="font-size: 1.5rem; opacity: 0.6;">📋</span>
          <div style="font-weight: 700; color: #fff;">Belum Ada Riwayat Trading</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; max-width: 200px;">
            Transaksi jual akan otomatis tercatat di sini dan dianalisis secara mendalam.
          </div>
        </div>
      `;
    }

    const filtered = all.filter(t => {
      if (filter === 'win') return (t.profit || 0) >= 0;
      if (filter === 'loss') return (t.profit || 0) < 0;
      if (filter === 'stock') return t.assetType === 'stock';
      if (filter === 'crypto') return t.assetType === 'crypto';
      return true;
    }).slice(0, 20);

    if (!filtered.length) {
      return `<div class="th-empty">Tidak ada data untuk filter ini</div>`;
    }

    return filtered.map(t => {
      const isWin = (t.profit || 0) >= 0;
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
        <div class="th-card" data-trade-id="${t.id}" title="Klik untuk membuka rincian & analisis transaksi ${t.asset}">
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
   * Render full HTML markup of the Trade History Panel (Right sidebar)
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
          <div style="display:flex; align-items:center; gap:6px;">
            <button id="btn-open-analysis" class="th-analysis-btn" title="Buka Riwayat Lengkap & Analisis Hasil Trading">
              <span style="display:inline-flex; align-items:center; gap:4px;">${Icons.activity(13)} Analisis</span>
            </button>
            <button id="btn-download-history" class="th-dl-btn" title="Download Ringkasan PNG">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Unduh
            </button>
          </div>
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
        <div class="th-list" id="th-list" style="max-height: 280px; overflow-y: auto;">
          ${this.renderCards('all')}
        </div>

        <!-- Bottom CTA to open full analysis & ledger -->
        <button id="btn-view-all-history" class="th-view-all-btn" title="Buka Riwayat Lengkap & Analisis Performa">
          <span style="display:inline-flex; align-items:center; gap:5px;">${Icons.search(13)} Buka Riwayat Lengkap & Analisis Hasil Trading →</span>
        </button>
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
      const isPositive = (t.profit || 0) >= 0;
      const profitText = `${isPositive ? '+' : ''}${this.formatPrice(t.profit)}`;
      const pctText = `${isPositive ? '+' : ''}${(t.profitPercent || 0).toFixed(2)}%`;
      const badgeColor = isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      const textColor = isPositive ? '#34d399' : '#f87171';
      
      const formattedAmount = t.assetType === 'stock'
        ? `${t.amount} lot`
        : `${cryptoMarket.formatAmount ? cryptoMarket.formatAmount(t.amount) : t.amount}`;

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

    // Re-bind click on new cards
    document.querySelectorAll('.th-card[data-trade-id]').forEach(card => {
      card.onclick = () => {
        const tradeId = card.dataset.tradeId;
        this.openAnalysisModal(null, 'ledger', tradeId);
      };
    });
  }

  /**
   * OPEN TRADING ANALYSIS & FULL LEDGER MODAL
   * @param {string|null} currentSymbol
   * @param {'analysis'|'ledger'} defaultTab
   * @param {string|number|null} focusTradeId
   */
  openAnalysisModal(currentSymbol = null, defaultTab = 'analysis', focusTradeId = null) {
    const all = gameState.get('tradeHistory') || [];
    const a = this.computeAnalytics(all);
    const isProfit = a.totalPnL >= 0;

    const modalHTML = `
      <div class="modal-header" style="padding: 1.15rem 1.4rem; border-bottom: 1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:0.65rem;">
          <span style="display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:8px; background:rgba(16,185,129,0.15); color:#10b981;">
            ${Icons.activity(18, '#10b981')}
          </span>
          <div>
            <h3 class="modal-title" style="font-size:1.15rem; font-weight:800; color:#fff; line-height:1.2; margin:0;">
              Riwayat & Analisis Hasil Trading
            </h3>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
              Evaluasi performa portofolio real-time & analitik gaya trading
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <button id="modal-btn-download-report" class="th-dl-btn" style="padding: 0.35rem 0.75rem; font-size: 0.72rem;" title="Download Ringkasan Laporan PNG">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Unduh Laporan
          </button>
          <button class="modal-close" style="width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:var(--text-muted); cursor:pointer;">
            ${Icons.x(16)}
          </button>
        </div>
      </div>

      <div class="modal-body" style="padding: 1.25rem 1.4rem; max-height: 82vh; overflow-y: auto;">
        <div class="ta-modal-wrap">
          <!-- Navigation Tabs -->
          <div class="ta-nav-tabs">
            <button class="ta-nav-btn ${defaultTab === 'analysis' ? 'active' : ''}" data-tab="analysis">
              ${Icons.activity(14)} Analisis & Evaluasi Performa
            </button>
            <button class="ta-nav-btn ${defaultTab === 'ledger' ? 'active' : ''}" data-tab="ledger">
              ${Icons.fileText(14)} Buku Riwayat Transaksi (${all.length})
            </button>
          </div>

          <!-- ════ TAB 1: ANALISIS & EVALUASI PERFORMA ════ -->
          <div id="ta-view-analysis" style="display: ${defaultTab === 'analysis' ? 'flex' : 'none'}; flex-direction: column; gap: 1.25rem;">
            ${all.length === 0 ? `
              <div class="th-empty" style="padding: 3.5rem 1.5rem; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.12); border-radius: 12px; text-align: center;">
                <div style="font-size: 2.75rem; margin-bottom: 0.75rem;">📊</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem;">Belum Ada Transaksi yang Ditutup</div>
                <div style="font-size: 0.85rem; color: var(--text-muted); max-width: 480px; margin: 0 auto 1.25rem; line-height: 1.6;">
                  Analisis performa mendalam (Win Rate, Profit Factor, Risk-Reward, evaluasi gaya trading) akan otomatis dianalisis begitu Anda mengeksekusi aksi jual (Take Profit atau Cut Loss).
                </div>
                <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 20px; font-size: 0.75rem; color: #34d399; font-weight: 600;">
                  💡 Tip: Beli saham/kripto di terminal ini dan jual untuk melihat simulasi hasil trading Anda.
                </div>
              </div>
            ` : `
              <!-- Hero Performance Card -->
              <div class="ta-hero-card">
                <div class="ta-hero-top">
                  <div>
                    <span style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.04em;">
                      Realized Net Profit / Loss
                    </span>
                    <div class="ta-hero-pnl-val ${isProfit ? 'profit' : 'loss'}">
                      ${isProfit ? '+' : ''}${this.formatPrice(a.totalPnL)}
                    </div>
                  </div>
                  <div style="display: flex; gap: 1.5rem; align-items: center;">
                    <div style="text-align: right;">
                      <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase;">Win Rate</div>
                      <div style="font-size: 1.35rem; font-weight: 900; color: ${a.winRate >= 50 ? '#10b981' : '#ef4444'};">
                        ${a.winRate.toFixed(1)}%
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase;">Profit Factor</div>
                      <div style="font-size: 1.35rem; font-weight: 900; color: ${a.profitFactor >= 1.5 ? '#10b981' : (a.profitFactor >= 1 ? '#f59e0b' : '#ef4444')};">
                        ${a.profitFactor >= 999 ? '∞' : a.profitFactor.toFixed(2) + 'x'}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Win / Loss Progress Track -->
                <div class="ta-bar-wrap">
                  <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:4px; font-weight:700;">
                    <span style="color:#10b981;">${a.wins.length} Transaksi Menang (${a.winRate.toFixed(1)}%)</span>
                    <span style="color:#ef4444;">${a.losses.length} Transaksi Kalah (${a.lossRate.toFixed(1)}%)</span>
                  </div>
                  <div class="ta-bar-track" title="${a.wins.length} Win vs ${a.losses.length} Loss">
                    <div class="ta-bar-fill-win" style="width: ${a.winRate}%;"></div>
                  </div>
                </div>
              </div>

              <!-- 10 Metric KPI Grid -->
              <div class="ta-metrics-grid">
                <div class="ta-metric-box">
                  <div class="ta-metric-box__label">${Icons.target(12, 'var(--accent-primary)')} Win Rate</div>
                  <div class="ta-metric-box__val" style="color: ${a.winRate >= 50 ? '#10b981' : '#ef4444'}">${a.winRate.toFixed(1)}%</div>
                  <div class="ta-metric-box__sub">${a.wins.length}W / ${a.losses.length}L (${a.totalTrades} total)</div>
                </div>
                <div class="ta-metric-box">
                  <div class="ta-metric-box__label">${Icons.shield(12, '#38bdf8')} Profit Factor</div>
                  <div class="ta-metric-box__val" style="color: ${a.profitFactor >= 1.5 ? '#10b981' : '#f59e0b'}">${a.profitFactor >= 999 ? '∞ (Zero Loss)' : a.profitFactor.toFixed(2) + 'x'}</div>
                  <div class="ta-metric-box__sub">Gross Untung ÷ Rugi</div>
                </div>
                <div class="ta-metric-box">
                  <div class="ta-metric-box__label">${Icons.activity(12, '#a855f7')} Risk / Reward</div>
                  <div class="ta-metric-box__val">1 : ${a.riskRewardRatio >= 999 ? '∞' : a.riskRewardRatio.toFixed(2)}</div>
                  <div class="ta-metric-box__sub">Avg Win vs Avg Loss</div>
                </div>
                <div class="ta-metric-box">
                  <div class="ta-metric-box__label">${Icons.zap(12, '#eab308')} Expectancy / Trade</div>
                  <div class="ta-metric-box__val" style="color:${a.expectancy >= 0 ? '#10b981' : '#ef4444'}">${a.expectancy >= 0 ? '+' : ''}${this.formatPrice(a.expectancy)}</div>
                  <div class="ta-metric-box__sub">Ekspektasi Matematis</div>
                </div>
                <div class="ta-metric-box">
                  <div class="ta-metric-box__label">${Icons.trendingUp(12, '#10b981')} Rata-Rata Menang</div>
                  <div class="ta-metric-box__val" style="color:#10b981;">+${this.formatPrice(a.avgWin)}</div>
                  <div class="ta-metric-box__sub">Gross: +${this.formatPrice(a.grossProfit)}</div>
                </div>
                <div class="ta-metric-box">
                  <div class="ta-metric-box__label">${Icons.trendingDown(12, '#ef4444')} Rata-Rata Kalah</div>
                  <div class="ta-metric-box__val" style="color:#ef4444;">-${this.formatPrice(a.avgLoss)}</div>
                  <div class="ta-metric-box__sub">Gross: -${this.formatPrice(a.grossLoss)}</div>
                </div>
                <div class="ta-metric-box">
                  <div class="ta-metric-box__label">🏆 Best Trade</div>
                  <div class="ta-metric-box__val" style="color:#10b981;">${a.bestTrade ? `+${this.formatPrice(a.bestTrade.profit)}` : '—'}</div>
                  <div class="ta-metric-box__sub">${a.bestTrade ? `${a.bestTrade.asset} (+${(a.bestTrade.profitPercent || 0).toFixed(2)}%)` : '—'}</div>
                </div>
                <div class="ta-metric-box">
                  <div class="ta-metric-box__label">⚠️ Worst Trade</div>
                  <div class="ta-metric-box__val" style="color:#ef4444;">${a.worstTrade ? `${this.formatPrice(a.worstTrade.profit)}` : '—'}</div>
                  <div class="ta-metric-box__sub">${a.worstTrade ? `${a.worstTrade.asset} (${(a.worstTrade.profitPercent || 0).toFixed(2)}%)` : '—'}</div>
                </div>
              </div>

              <!-- Instrument Comparison: Stocks vs Crypto -->
              <div class="ta-instruments-grid">
                <div class="ta-inst-card">
                  <div class="ta-inst-header">
                    <span style="display:flex; align-items:center; gap:6px; font-weight:800; font-size:0.85rem; color:#fff;">
                      ${Icons.barChart(14, 'var(--accent-primary)')} Bursa Saham AS
                    </span>
                    <span style="font-size:0.7rem; padding:2px 8px; border-radius:12px; background:rgba(99,102,241,0.15); color:#818cf8; font-weight:700;">
                      ${a.stocks.total} Transaksi
                    </span>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span style="font-size:0.75rem; color:var(--text-muted);">Total Net P/L:</span>
                    <span style="font-weight:800; font-size:0.95rem; color:${a.stocks.pnl >= 0 ? '#10b981' : '#ef4444'};">
                      ${a.stocks.pnl >= 0 ? '+' : ''}${this.formatPrice(a.stocks.pnl)}
                    </span>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem;">
                    <span style="color:var(--text-muted);">Win Rate Saham:</span>
                    <span style="font-weight:700; color:${a.stocks.winRate >= 50 ? '#10b981' : '#ef4444'};">
                      ${a.stocks.winRate.toFixed(1)}% (${a.stocks.wins}W / ${a.stocks.losses}L)
                    </span>
                  </div>
                </div>

                <div class="ta-inst-card">
                  <div class="ta-inst-header">
                    <span style="display:flex; align-items:center; gap:6px; font-weight:800; font-size:0.85rem; color:#fff;">
                      ${Icons.coins(14, '#f59e0b')} Pasar Kripto
                    </span>
                    <span style="font-size:0.7rem; padding:2px 8px; border-radius:12px; background:rgba(245,158,11,0.15); color:#f59e0b; font-weight:700;">
                      ${a.crypto.total} Transaksi
                    </span>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span style="font-size:0.75rem; color:var(--text-muted);">Total Net P/L:</span>
                    <span style="font-weight:800; font-size:0.95rem; color:${a.crypto.pnl >= 0 ? '#10b981' : '#ef4444'};">
                      ${a.crypto.pnl >= 0 ? '+' : ''}${this.formatPrice(a.crypto.pnl)}
                    </span>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem;">
                    <span style="color:var(--text-muted);">Win Rate Kripto:</span>
                    <span style="font-weight:700; color:${a.crypto.winRate >= 50 ? '#10b981' : '#ef4444'};">
                      ${a.crypto.winRate.toFixed(1)}% (${a.crypto.wins}W / ${a.crypto.losses}L)
                    </span>
                  </div>
                </div>
              </div>

              <!-- AI Trading Coach & Evaluation Card -->
              <div class="ta-coach-box">
                <div class="ta-coach-title">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.1rem;">🧠</span>
                    <span style="font-weight:800; font-size:0.95rem; color:#fff;">Evaluasi Cerdas & Rekomendasi Gaya Trading</span>
                  </div>
                  <span style="font-size:0.68rem; padding:3px 10px; border-radius:12px; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#34d399; font-weight:800; text-transform:uppercase; letter-spacing:0.04em;">
                    ${a.coach.style}
                  </span>
                </div>
                <div class="ta-coach-verdict">
                  ${a.coach.verdict}
                </div>
                <div style="margin-top:2px;">
                  <div style="font-size:0.72rem; text-transform:uppercase; color:var(--accent-primary); font-weight:800; margin-bottom:6px; letter-spacing:0.04em;">
                    Rekomendasi Langkah Strategis:
                  </div>
                  <ul class="ta-coach-tips-list">
                    ${a.coach.tips.map(tip => `<li>${tip}</li>`).join('')}
                  </ul>
                </div>
              </div>

              <!-- Asset Performance Ranking Breakdown -->
              ${a.assetList.length > 0 ? `
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.65rem;">
                    <span style="font-weight:800; font-size:0.85rem; color:#fff; display:flex; align-items:center; gap:6px;">
                      ${Icons.barChart(14, 'var(--accent-primary)')} Peringkat Efektivitas Aset Traded
                    </span>
                    <span style="font-size:0.7rem; color:var(--text-muted);">${a.assetList.length} instrumen unik</span>
                  </div>
                  <div class="ta-table-wrap">
                    <table class="ta-table">
                      <thead>
                        <tr>
                          <th>Aset</th>
                          <th>Tipe</th>
                          <th>Trade</th>
                          <th>Win Rate</th>
                          <th>Net Realized P/L</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${a.assetList.map(item => {
                          const isWin = item.totalPnL >= 0;
                          const icon = item.assetType === 'stock' ? Icons.barChart(13, 'var(--accent-primary)') : Icons.coins(13, '#f59e0b');
                          let statusLabel = 'Netral ⚖️';
                          let statusColor = '#94a3b8';
                          if (item.totalPnL > 0 && item.winRate >= 50) {
                            statusLabel = 'Top Performer 🏆';
                            statusColor = '#10b981';
                          } else if (item.totalPnL < 0) {
                            statusLabel = 'Evaluasi ⚠️';
                            statusColor = '#ef4444';
                          }
                          return `
                            <tr>
                              <td style="font-weight:800; display:flex; align-items:center; gap:6px;">
                                <span style="display:inline-flex;">${icon}</span>
                                <span>${item.symbol}</span>
                              </td>
                              <td style="text-transform:uppercase; font-size:0.68rem; color:var(--text-muted); font-weight:700;">${item.assetType}</td>
                              <td>${item.total} (${item.wins}W / ${item.losses}L)</td>
                              <td style="font-weight:700; color:${item.winRate >= 50 ? '#10b981' : '#ef4444'};">${item.winRate.toFixed(0)}%</td>
                              <td style="font-weight:800; color:${isWin ? '#10b981' : '#ef4444'};">${isWin ? '+' : ''}${this.formatPrice(item.totalPnL)}</td>
                              <td><span style="font-size:0.7rem; font-weight:700; color:${statusColor};">${statusLabel}</span></td>
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              ` : ''}
            `}
          </div>

          <!-- ════ TAB 2: BUKU RIWAYAT TRANSAKSI LENGKAP ════ -->
          <div id="ta-view-ledger" style="display: ${defaultTab === 'ledger' ? 'flex' : 'none'}; flex-direction: column; gap: 0.85rem;">
            <!-- Filter & Search Controls -->
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.65rem;">
              <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
                <input 
                  type="text" 
                  id="ta-search-input" 
                  placeholder="Cari simbol (contoh: BTC, AAPL)..."
                  style="padding: 0.45rem 0.85rem; font-size: 0.78rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; min-width: 200px;"
                >
                <div class="th-filters" id="ta-ledger-filters" style="margin:0;">
                  <button class="th-filter active" data-filter="all">Semua</button>
                  <button class="th-filter" data-filter="win">Win</button>
                  <button class="th-filter" data-filter="loss">Loss</button>
                  <button class="th-filter" data-filter="stock">Saham</button>
                  <button class="th-filter" data-filter="crypto">Crypto</button>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:0.4rem;">
                <span style="font-size:0.72rem; color:var(--text-muted);">Urutkan:</span>
                <select id="ta-sort-select" style="padding: 0.4rem 0.65rem; font-size: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; cursor: pointer;">
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="pnl-desc">Profit Terbesar</option>
                  <option value="pnl-asc">Loss Terbesar</option>
                  <option value="pct-desc">Return % Tertinggi</option>
                </select>
              </div>
            </div>

            <!-- Single Trade Inspector Overlay / Box (if focused) -->
            <div id="ta-inspect-container" style="display:none;"></div>

            <!-- Ledger List Container -->
            <div id="ta-ledger-list-container" style="display:flex; flex-direction:column; gap:0.4rem; max-height: 480px; overflow-y: auto; padding-right: 2px;">
              ${this.renderLedgerItems(all, 'all', '', 'newest')}
            </div>
          </div>
        </div>
      </div>
    `;

    ui.openModal(modalHTML);

    const modalContent = document.getElementById('modal-content');
    if (modalContent) {
      modalContent.style.maxWidth = '880px';
      modalContent.style.width = '95vw';
    }

    // Bind Modal Internal Interactions
    this._bindModalEvents(currentSymbol, all, focusTradeId);
  }

  /**
   * Render ledger list items inside modal
   */
  renderLedgerItems(all, filter = 'all', query = '', sortBy = 'newest') {
    if (!all.length) {
      return `
        <div class="th-empty" style="padding: 2.5rem 1rem;">
          Belum ada riwayat transaksi yang tersimpan.
        </div>
      `;
    }

    let filtered = all.filter(t => {
      if (filter === 'win' && (t.profit || 0) < 0) return false;
      if (filter === 'loss' && (t.profit || 0) >= 0) return false;
      if (filter === 'stock' && t.assetType !== 'stock') return false;
      if (filter === 'crypto' && t.assetType !== 'crypto') return false;
      if (query && !t.asset.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });

    if (sortBy === 'newest') {
      filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    } else if (sortBy === 'pnl-desc') {
      filtered.sort((a, b) => (b.profit || 0) - (a.profit || 0));
    } else if (sortBy === 'pnl-asc') {
      filtered.sort((a, b) => (a.profit || 0) - (b.profit || 0));
    } else if (sortBy === 'pct-desc') {
      filtered.sort((a, b) => (b.profitPercent || 0) - (a.profitPercent || 0));
    }

    if (!filtered.length) {
      return `<div class="th-empty">Tidak ada transaksi yang cocok dengan filter atau pencarian.</div>`;
    }

    return filtered.map(t => {
      const isWin = (t.profit || 0) >= 0;
      const pnlColor = isWin ? '#10b981' : '#ef4444';
      const pct = t.profitPercent != null ? t.profitPercent.toFixed(2) : '0.00';
      const pnlSign = isWin ? '+' : '';
      const qty = t.assetType === 'stock'
        ? `${t.amount} lot`
        : `${cryptoMarket.formatAmount ? cryptoMarket.formatAmount(t.amount) : t.amount.toFixed(4)}`;
      const icon = t.assetType === 'stock' ? Icons.barChart(14, 'var(--accent-primary)') : Icons.coins(14, '#f59e0b');
      const changeArrow = ((t.sellPrice - t.buyPrice) / (t.buyPrice || 1) * 100).toFixed(2);
      const formattedDate = t.date || (t.timestamp ? new Date(t.timestamp).toLocaleDateString('id-ID') : '—');

      return `
        <div class="ta-ledger-row" data-id="${t.id}" title="Klik untuk inspeksi rincian trade ${t.asset}">
          <div style="display:flex; align-items:center; gap:0.75rem; min-width: 140px;">
            <span style="font-size: 1.1rem; display:inline-flex;">${icon}</span>
            <div>
              <div style="font-weight: 800; color: #fff; font-size: 0.85rem; display:flex; align-items:center; gap:5px;">
                ${t.asset}
                <span style="font-size:0.6rem; padding:1px 5px; border-radius:3px; background:rgba(255,255,255,0.06); color:var(--text-muted); font-weight:700;">
                  ${t.assetType.toUpperCase()}
                </span>
              </div>
              <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 1px;">
                ${qty} · ${formattedDate}
              </div>
            </div>
          </div>

          <div style="flex:1; display:flex; align-items:center; justify-content:center; gap:0.4rem; font-size:0.75rem; font-family:monospace;">
            <span style="color:#a1a1aa;">${this.formatPrice(t.buyPrice)}</span>
            <span style="color:#52525b;">→</span>
            <span style="color:#fff; font-weight:700;">${this.formatPrice(t.sellPrice)}</span>
            <span style="font-size:0.68rem; font-weight:700; color:${isWin ? '#10b981' : '#ef4444'}; margin-left:4px;">
              (${isWin ? '+' : ''}${changeArrow}%)
            </span>
          </div>

          <div style="text-align:right; flex-shrink:0; display:flex; align-items:center; gap:0.75rem;">
            <div>
              <div style="font-size: 0.85rem; font-weight: 800; color: ${pnlColor}; font-variant-numeric: tabular-nums;">
                ${pnlSign}${this.formatPrice(t.profit)}
              </div>
              <div style="font-size: 0.65rem; font-weight: 700; color: ${pnlColor}; margin-top: 1px;">
                ${pnlSign}${pct}%
              </div>
            </div>
            <button class="btn-inspect-trade" data-id="${t.id}" style="padding: 4px 8px; font-size: 0.68rem; font-weight: 700; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #fff; cursor: pointer; transition: all 0.2s;">
              Detail →
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render single trade post-trade inspector breakdown
   */
  renderTradeInspectCard(trade) {
    if (!trade) return '';
    const isWin = (trade.profit || 0) >= 0;
    const pnlSign = isWin ? '+' : '';
    const pct = trade.profitPercent != null ? trade.profitPercent.toFixed(2) : '0.00';
    const totalBuy = trade.buyPrice * trade.amount;
    const totalSell = trade.sellPrice * trade.amount;

    let aiReview = '';
    if (trade.profitPercent >= 10) {
      aiReview = `🚀 <strong>Eksekusi Luar Biasa:</strong> Posisi ditutup dengan capital gain tinggi (+${pct}%), melampaui rata-rata ekspektasi pasar. Titik ambil untung (take profit) sangat optimal.`;
    } else if (trade.profitPercent > 0) {
      aiReview = `✅ <strong>Target Tercapai:</strong> Mengamankan floating profit (+${pct}%) secara disiplin berkontribusi memperkuat kurva pertumbuhan ekuitas jangka panjang.`;
    } else if (trade.profitPercent >= -6) {
      aiReview = `🛡️ <strong>Cut Loss Terukur:</strong> Memotong kerugian lebih awal (-${Math.abs(pct)}%) merupakan tindakan defensif yang tepat untuk mencegah drawdown tajam yang merusak modal.`;
    } else {
      aiReview = `⚠️ <strong>Pelajaran Risiko:</strong> Kerugian (-${Math.abs(pct)}%) tergolong cukup dalam. Disarankan memasang Stop Loss otomatis di form order agar risiko terbatasi maksimal 5-8% per posisi.`;
    }

    return `
      <div class="ta-trade-inspect-card">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:0.75rem;">
          <div style="display:flex; align-items:center; gap:8px;">
            <button id="btn-close-inspect" style="padding:4px 8px; font-size:0.72rem; font-weight:700; background:rgba(255,255,255,0.08); border:none; border-radius:6px; color:#fff; cursor:pointer;">
              ← Kembali ke Daftar
            </button>
            <span style="font-weight:900; font-size:1.05rem; color:#fff;">Rincian Transaksi: ${trade.asset}</span>
            <span style="font-size:0.65rem; padding:2px 6px; border-radius:4px; background:${isWin ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color:${isWin ? '#10b981' : '#ef4444'}; font-weight:800;">
              ${isWin ? 'PROFIT / WIN' : 'LOSS / CUT-LOSS'}
            </span>
          </div>
          <button id="btn-download-inspect-card" data-id="${trade.id}" class="th-dl-btn" style="font-size:0.7rem; padding:0.3rem 0.65rem;">
            ${Icons.download ? Icons.download(12) : Icons.fileText(12)} Unduh PnL Card
          </button>
        </div>

        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:0.65rem;">
          <div class="ta-metric-box">
            <div class="ta-metric-box__label">Harga Beli (Entry)</div>
            <div class="ta-metric-box__val">${this.formatPrice(trade.buyPrice)}</div>
            <div class="ta-metric-box__sub">Modal: ${this.formatPrice(totalBuy)}</div>
          </div>
          <div class="ta-metric-box">
            <div class="ta-metric-box__label">Harga Jual (Exit)</div>
            <div class="ta-metric-box__val">${this.formatPrice(trade.sellPrice)}</div>
            <div class="ta-metric-box__sub">Hasil: ${this.formatPrice(totalSell)}</div>
          </div>
          <div class="ta-metric-box">
            <div class="ta-metric-box__label">Volume Posisi</div>
            <div class="ta-metric-box__val">${trade.assetType === 'stock' ? trade.amount + ' lot' : (cryptoMarket.formatAmount ? cryptoMarket.formatAmount(trade.amount) : trade.amount)}</div>
            <div class="ta-metric-box__sub">${trade.assetType.toUpperCase()}</div>
          </div>
          <div class="ta-metric-box">
            <div class="ta-metric-box__label">Net Realized P/L</div>
            <div class="ta-metric-box__val" style="color:${isWin ? '#10b981' : '#ef4444'};">
              ${pnlSign}${this.formatPrice(trade.profit)}
            </div>
            <div class="ta-metric-box__sub" style="color:${isWin ? '#10b981' : '#ef4444'}; font-weight:700;">
              ${pnlSign}${pct}% Return
            </div>
          </div>
        </div>

        <!-- AI Trade Evaluation Box -->
        <div style="padding:0.85rem 1rem; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:8px; font-size:0.8rem; line-height:1.6; color:#e2e8f0;">
          ${aiReview}
        </div>
      </div>
    `;
  }

  /**
   * Internal event listeners binder for the modal
   */
  _bindModalEvents(currentSymbol, all, focusTradeId) {
    const modalContent = document.getElementById('modal-content');
    if (!modalContent) return;

    let currentFilter = 'all';
    let currentQuery = '';
    let currentSort = 'newest';

    const tabAnalysis = modalContent.querySelector('#ta-view-analysis');
    const tabLedger = modalContent.querySelector('#ta-view-ledger');
    const navBtns = modalContent.querySelectorAll('.ta-nav-btn');

    // Switch tab
    navBtns.forEach(btn => {
      btn.onclick = () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        if (tab === 'analysis') {
          if (tabAnalysis) tabAnalysis.style.display = 'flex';
          if (tabLedger) tabLedger.style.display = 'none';
        } else {
          if (tabAnalysis) tabAnalysis.style.display = 'none';
          if (tabLedger) tabLedger.style.display = 'flex';
        }
      };
    });

    // Ledger Search input
    const searchInput = modalContent.querySelector('#ta-search-input');
    const listContainer = modalContent.querySelector('#ta-ledger-list-container');
    const inspectContainer = modalContent.querySelector('#ta-inspect-container');

    const refreshLedger = () => {
      if (listContainer) {
        listContainer.innerHTML = this.renderLedgerItems(all, currentFilter, currentQuery, currentSort);
        bindLedgerClicks();
      }
    };

    if (searchInput) {
      searchInput.oninput = (e) => {
        currentQuery = e.target.value.trim();
        refreshLedger();
      };
    }

    // Ledger Filter Chips
    modalContent.querySelectorAll('#ta-ledger-filters .th-filter').forEach(btn => {
      btn.onclick = () => {
        modalContent.querySelectorAll('#ta-ledger-filters .th-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        refreshLedger();
      };
    });

    // Ledger Sort select
    const sortSelect = modalContent.querySelector('#ta-sort-select');
    if (sortSelect) {
      sortSelect.onchange = (e) => {
        currentSort = e.target.value;
        refreshLedger();
      };
    }

    // Single trade inspect binding
    const showInspect = (tradeId) => {
      const trade = all.find(t => String(t.id) === String(tradeId));
      if (!trade || !inspectContainer) return;

      inspectContainer.innerHTML = this.renderTradeInspectCard(trade);
      inspectContainer.style.display = 'block';
      if (listContainer) listContainer.style.display = 'none';

      // Bind close inspect
      inspectContainer.querySelector('#btn-close-inspect')?.addEventListener('click', () => {
        inspectContainer.style.display = 'none';
        if (listContainer) listContainer.style.display = 'flex';
      });

      // Bind single trade PnL card download
      inspectContainer.querySelector('#btn-download-inspect-card')?.addEventListener('click', () => {
        this.downloadTradePnLCard(trade);
      });
    };

    const bindLedgerClicks = () => {
      listContainer?.querySelectorAll('.ta-ledger-row').forEach(row => {
        row.onclick = () => showInspect(row.dataset.id);
      });
      listContainer?.querySelectorAll('.btn-inspect-trade').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          showInspect(btn.dataset.id);
        };
      });
    };

    bindLedgerClicks();

    // If focused on specific trade initially, switch to ledger and inspect it
    if (focusTradeId) {
      navBtns.forEach(b => b.dataset.tab === 'ledger' ? b.classList.add('active') : b.classList.remove('active'));
      if (tabAnalysis) tabAnalysis.style.display = 'none';
      if (tabLedger) tabLedger.style.display = 'flex';
      showInspect(focusTradeId);
    }

    // Modal report download button
    modalContent.querySelector('#modal-btn-download-report')?.addEventListener('click', () => {
      this.downloadHistoryCard(currentSymbol || 'PORTFOLIO');
    });
  }

  /**
   * Download a canvas-rendered PnL card as a PNG for active positions
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

    const W = 560, H = 320;
    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = H * 2;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, isProfit ? '#0a1a14' : '#1a0a0a');
    bg.addColorStop(1, '#09090b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W * 0.15, H * 0.3, 0, W * 0.15, H * 0.3, W * 0.5);
    glow.addColorStop(0, isProfit ? 'rgba(38,166,154,0.12)' : 'rgba(239,83,80,0.12)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

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

    txt('AuraAssets', 36, 38, 'bold 13px Inter, sans-serif', 'rgba(255,255,255,0.35)');
    txt(now, W - 36, 38, '12px Inter, sans-serif', 'rgba(255,255,255,0.25)', 'right');

    txt(symbol, 36, 80, 'bold 32px Inter, sans-serif', '#ffffff');
    txt((assetType || 'ASSET').toUpperCase(), 36, 102, '11px Inter, sans-serif', 'rgba(255,255,255,0.4)');

    const pnlStr = `${isProfit ? '+' : ''}${this.formatPrice(Math.abs(pnl))}`;
    txt(pnlStr, W / 2, 88, 'bold 38px Inter, sans-serif', accent, 'center');
    txt(`${arrow} ${isProfit ? '+' : ''}${pct.toFixed(2)}%`, W / 2, 116, 'bold 18px Inter, sans-serif', accent, 'center');

    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, 136); ctx.lineTo(W - 36, 136);
    ctx.stroke();

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

    const qty = assetType === 'stock'
      ? h.shares + ' lot'
      : `${cryptoMarket.formatAmount ? cryptoMarket.formatAmount(h.amount) : h.amount} ${symbol}`;
    txt('Jumlah Posisi', 36, H - 52, '10px Inter, sans-serif', 'rgba(255,255,255,0.35)');
    txt(qty, 36, H - 34, 'bold 13px Inter, sans-serif', 'rgba(255,255,255,0.7)');

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(W - 90, H - 80, 56, 56, 6);
    ctx.stroke();
    txt('SCAN', W - 62, H - 44, 'bold 8px Inter, sans-serif', 'rgba(255,255,255,0.2)', 'center');

    const link = document.createElement('a');
    link.download = `${symbol}_PnL_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    ui.success('PnL card berhasil diunduh!');
  }

  /**
   * Download a canvas-rendered PnL card as a PNG for historical executed trades
   */
  downloadTradePnLCard(trade) {
    if (!trade) return;
    const symbol = trade.asset;
    const isProfit = (trade.profit || 0) >= 0;
    const pct = trade.profitPercent != null ? trade.profitPercent.toFixed(2) : '0.00';
    const now = trade.date || new Date().toLocaleDateString('id-ID');

    const W = 560, H = 320;
    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = H * 2;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, isProfit ? '#0a1a14' : '#1a0a0a');
    bg.addColorStop(1, '#09090b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

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

    txt('AuraAssets Trade Ledger', 36, 38, 'bold 12px Inter, sans-serif', 'rgba(255,255,255,0.35)');
    txt(now, W - 36, 38, '12px Inter, sans-serif', 'rgba(255,255,255,0.25)', 'right');

    txt(symbol, 36, 80, 'bold 32px Inter, sans-serif', '#ffffff');
    txt((trade.assetType || 'ASSET').toUpperCase() + ' CLOSED TRADE', 36, 102, '11px Inter, sans-serif', 'rgba(255,255,255,0.4)');

    const pnlStr = `${isProfit ? '+' : ''}${this.formatPrice(Math.abs(trade.profit))}`;
    txt(pnlStr, W / 2, 88, 'bold 38px Inter, sans-serif', accent, 'center');
    txt(`${arrow} ${isProfit ? '+' : ''}${pct}%`, W / 2, 116, 'bold 18px Inter, sans-serif', accent, 'center');

    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, 136); ctx.lineTo(W - 36, 136);
    ctx.stroke();

    const details = [
      ['Entry Price', this.formatPrice(trade.buyPrice)],
      ['Exit Price', this.formatPrice(trade.sellPrice)],
      ['Total Invested', this.formatPrice(trade.buyPrice * trade.amount)],
      ['Total Realized', this.formatPrice(trade.sellPrice * trade.amount)],
    ];
    details.forEach(([label, val], i) => {
      const col = i % 2 === 0 ? 36 : W / 2 + 20;
      const row = 162 + Math.floor(i / 2) * 52;
      txt(label, col, row, '10.5px Inter, sans-serif', 'rgba(255,255,255,0.4)');
      txt(val, col, row + 20, 'bold 14px Inter, sans-serif', '#ffffff');
    });

    const qty = trade.assetType === 'stock'
      ? trade.amount + ' lot'
      : `${cryptoMarket.formatAmount ? cryptoMarket.formatAmount(trade.amount) : trade.amount} ${symbol}`;
    txt('Volume Realisasi', 36, H - 46, '10px Inter, sans-serif', 'rgba(255,255,255,0.35)');
    txt(qty, 36, H - 28, 'bold 13px Inter, sans-serif', 'rgba(255,255,255,0.7)');

    const link = document.createElement('a');
    link.download = `${symbol}_TradePnL_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    ui.success(`PnL card ${symbol} berhasil diunduh!`);
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

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, isProfit ? '#0a1a14' : '#1a0a0a');
    bg.addColorStop(1, '#09090b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W * 0.5, 60, 0, W * 0.5, 60, W * 0.6);
    glow.addColorStop(0, isProfit ? 'rgba(38,166,154,0.1)' : 'rgba(239,83,80,0.1)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

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
    t('Trading Performance Report', W / 2, 36, 'bold 14px Inter, sans-serif', 'rgba(255,255,255,0.6)', 'center');
    t(now, W - 36, 36, '11px Inter, sans-serif', 'rgba(255,255,255,0.25)', 'right');

    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(36, 52); ctx.lineTo(W - 36, 52);
    ctx.stroke();

    t(`${isProfit ? '+' : ''}${this.formatPrice(totalPnL)}`, W / 2, 96, 'bold 36px Inter, sans-serif', accent, 'center');
    t('Total Realized Profit / Loss', W / 2, 118, '12px Inter, sans-serif', 'rgba(255,255,255,0.4)', 'center');

    const stats = [
      ['Win Rate', winRate + '%', wins.length >= all.length / 2 ? '#26a69a' : '#ef5350'],
      ['Menang', wins.length + ' trades', '#26a69a'],
      ['Kalah', losses.length + ' trades', '#ef5350'],
      ['Total Trade', all.length + ' trades', '#f0f0f0'],
      ['Best Trade', '+' + this.formatPrice(bestTrade), '#f59e0b'],
      ['Worst Trade', this.formatPrice(worstTrade), '#f87171'],
      ['Avg P/L', (avgPnL >= 0 ? '+' : '') + this.formatPrice(avgPnL), avgPnL >= 0 ? '#26a69a' : '#ef5350'],
      ['Fokus Aset', currentSymbol || 'PORTFOLIO', '#a78bfa'],
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
    // Compact panel filter buttons
    document.getElementById('th-filters')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.th-filter');
      if (!btn) return;
      document.querySelectorAll('.th-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const list = document.getElementById('th-list');
      if (list) list.innerHTML = this.renderCards(btn.dataset.filter);
    });

    // Compact panel download button
    document.getElementById('btn-download-history')?.addEventListener('click', () => {
      this.downloadHistoryCard(currentSymbol);
    });

    // Compact panel Open Analysis Button in header
    document.getElementById('btn-open-analysis')?.addEventListener('click', () => {
      this.openAnalysisModal(currentSymbol, 'analysis');
    });

    // Compact panel View All & Open Analysis CTA button at bottom
    document.getElementById('btn-view-all-history')?.addEventListener('click', () => {
      this.openAnalysisModal(currentSymbol, 'ledger');
    });

    // Clicking individual card opens full analysis & ledger
    document.querySelectorAll('.th-card[data-trade-id]').forEach(card => {
      card.addEventListener('click', () => {
        const tradeId = card.dataset.tradeId;
        this.openAnalysisModal(currentSymbol, 'ledger', tradeId);
      });
    });
  }
}

export default new TradeHistoryPanel();
