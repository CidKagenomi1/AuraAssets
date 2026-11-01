/**
 * MarketNewsSubView.js - Macro Events, Breaking News, Sentiment & Actionable Trading
 * Handles news rendering, live timer countdowns, and quick-action trades.
 */

import newsManager from '../../../core/NewsManager.js';
import stockMarket from '../../../trading/StockMarket.js';
import cryptoMarket from '../../../trading/CryptoMarket.js';
import ui from '../../UIManager.js';

export class MarketNewsSubView {
  constructor() {
    this.newsTabFilter = 'all';
  }

  setFilter(filter) {
    this.newsTabFilter = filter;
    this.render();
  }

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

  updateCountdowns() {
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
      this.render();
    }
  }

  render(targetContainer = null) {
    const container = targetContainer || document.getElementById('news-page-container') || document.getElementById('market-news-list');
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

  triggerManualNews() {
    const ev = newsManager.triggerRandomEvent();
    if (ev) {
      ui.success(`Peristiwa baru aktif: "${ev.headline}"`, 'Berita Dirilis');
    } else {
      ui.info('Maksimal 3 berita aktif bersamaan. Tunggu salah satu peristiwa berakhir atau manfaatkan fluktuasi saat ini.', 'Slot Berita Penuh');
    }
    this.render();
  }
}

export const marketNewsSubView = new MarketNewsSubView();
export default marketNewsSubView;

