/**
 * MarketRows.js - Row renderers for Stock and Crypto Market Lists
 * Part of modular views structure
 */

import tradingPage from '../../trading/TradingPage.js';

// ===== WARNA PER SEKTOR =====
export const SECTOR_COLORS = {
    // Stocks
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
    // Crypto
    'Layer 1 (L1)':          '#3B82F6',
    'DeFi & Staking':        '#8B5CF6',
    'Meme Coin':            '#F59E0B',
    'Stablecoin & RWA':      '#10B981',
    'Exchange & CeFi':       '#06B6D4',
    'Payments & Privacy':    '#EC4899',
    'DePIN, Cloud & Infra':  '#6366F1',
    'Layer 2 & Interop':     '#A855F7',
    'AI & Big Data':         '#14B8A6'
};

// ===== KLASIFIKASI VOLATILITAS / RISIKO =====
export function getVolatilityLevel(asset, type = 'stock') {
    const vol = typeof asset.volatility === 'number' ? asset.volatility : 0.02;
    if (type === 'stock') {
        if (vol <= 0.016) {
            return {
                key: 'low',
                label: 'Rendah',
                badge: '🛡️ Rendah',
                color: '#10b981',
                bg: 'rgba(16, 185, 129, 0.12)',
                border: 'rgba(16, 185, 129, 0.28)',
                pctText: `±${(vol * 100).toFixed(1)}%`
            };
        }
        if (vol <= 0.028) {
            return {
                key: 'medium',
                label: 'Moderat',
                badge: '⚖️ Moderat',
                color: '#f59e0b',
                bg: 'rgba(245, 158, 11, 0.12)',
                border: 'rgba(245, 158, 11, 0.28)',
                pctText: `±${(vol * 100).toFixed(1)}%`
            };
        }
        return {
            key: 'high',
            label: 'Tinggi',
            badge: '🚀 Tinggi',
            color: '#ef4444',
            bg: 'rgba(239, 68, 68, 0.12)',
            border: 'rgba(239, 68, 68, 0.28)',
            pctText: `±${(vol * 100).toFixed(1)}%`
        };
    } else {
        if (vol <= 0.02) {
            return {
                key: 'low',
                label: 'Rendah',
                badge: '🛡️ Rendah',
                color: '#10b981',
                bg: 'rgba(16, 185, 129, 0.12)',
                border: 'rgba(16, 185, 129, 0.28)',
                pctText: `±${(vol * 100).toFixed(1)}%`
            };
        }
        if (vol <= 0.07) {
            return {
                key: 'medium',
                label: 'Moderat',
                badge: '⚖️ Moderat',
                color: '#f59e0b',
                bg: 'rgba(245, 158, 11, 0.12)',
                border: 'rgba(245, 158, 11, 0.28)',
                pctText: `±${(vol * 100).toFixed(1)}%`
            };
        }
        return {
            key: 'high',
            label: 'Tinggi',
            badge: '🚀 Tinggi',
            color: '#ef4444',
            bg: 'rgba(239, 68, 68, 0.12)',
            border: 'rgba(239, 68, 68, 0.28)',
            pctText: `±${(vol * 100).toFixed(1)}%`
        };
    }
}

// ===== HEADER TABEL PASAR =====
export function buildMarketTableHeader(type = 'stock', sort = { key: 'default', dir: 'asc' }) {
    const getSortIndicator = (key) => {
        if (sort.key !== key) return '<span class="sort-icon-idle">↕</span>';
        return sort.dir === 'asc' ? '<span class="sort-icon-active">▲</span>' : '<span class="sort-icon-active">▼</span>';
    };

    const sectorLabel = type === 'stock' ? 'Sektor' : 'Kategori';

    return `
      <div class="market-table-header">
        <div class="col-header col-symbol ${sort.key === 'name' ? 'active' : ''}" onclick="window.setMarketSort('name')" title="Urutkan Simbol">
          <span>Aset</span> ${getSortIndicator('name')}
        </div>
        <div class="col-header col-name" title="Nama Lengkap Aset">
          <span>Nama</span>
        </div>
        <div class="col-header col-sector ${sort.key === 'sector' ? 'active' : ''}" onclick="window.setMarketSort('sector')" title="Urutkan Sektor">
          <span>${sectorLabel}</span> ${getSortIndicator('sector')}
        </div>
        <div class="col-header col-volatility ${sort.key === 'volatility' ? 'active' : ''}" onclick="window.setMarketSort('volatility')" title="Urutkan Tingkat Volatilitas / Risiko">
          <span>Volatilitas</span> ${getSortIndicator('volatility')}
        </div>
        <div class="col-header col-price ${sort.key === 'price' ? 'active' : ''}" onclick="window.setMarketSort('price')" title="Urutkan Harga Pasar">
          <span>Harga</span> ${getSortIndicator('price')}
        </div>
        <div class="col-header col-change ${sort.key === 'change' ? 'active' : ''}" onclick="window.setMarketSort('change')" title="Urutkan Perubahan 24 Jam">
          <span>24h %</span> ${getSortIndicator('change')}
        </div>
      </div>
    `;
}

// ===== RENDER BARIS SAHAM =====
export function buildStockRow(stock) {
    const up = stock.change >= 0;
    const color = SECTOR_COLORS[stock.sector] || '#888888';
    const changeText = `${up ? '+' : ''}${stock.change.toFixed(2)}%`;
    const priceText = `$${stock.price.toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    })}`;
    const vol = getVolatilityLevel(stock, 'stock');
    const sectorName = stock.sector || 'Defensif';

    return `
      <div class="market-row" onclick="openStockDetail('${stock.symbol}')" title="Klik untuk membuka grafik & perdagangan ${stock.symbol} (${stock.name})">
        <div class="market-col col-symbol">
          <span class="sector-dot" style="background:${color}" title="Sektor: ${sectorName}"></span>
          <span class="market-symbol">${stock.symbol}</span>
        </div>
        <div class="market-col col-name">
          <span class="market-name" title="${stock.name}">${stock.name}</span>
        </div>
        <div class="market-col col-sector">
          <span class="market-sector-badge" style="color:${color}; background:${color}18; border:1px solid ${color}44;">
            ${sectorName}
          </span>
        </div>
        <div class="market-col col-volatility">
          <span class="market-volatility-badge vol-${vol.key}" style="color:${vol.color}; background:${vol.bg}; border:1px solid ${vol.border};" title="Volatilitas ${vol.label} (${vol.pctText} harian)">
            ${vol.badge}
          </span>
        </div>
        <div class="market-col col-price">
          <span class="market-price">${priceText}</span>
        </div>
        <div class="market-col col-change">
          <span class="market-change ${up ? 'up' : 'down'}">${changeText}</span>
        </div>
        <!-- Subline untuk tampilan mobile/layar sempit -->
        <div class="market-row-subline">
          <span class="market-sector-badge" style="color:${color}; background:${color}18; border:1px solid ${color}44;">${sectorName}</span>
          <span class="market-volatility-badge vol-${vol.key}" style="color:${vol.color}; background:${vol.bg}; border:1px solid ${vol.border};">${vol.badge}</span>
        </div>
      </div>`;
}

// ===== RENDER BARIS KRIPTO =====
export function buildCryptoRow(crypto) {
    const up = crypto.change >= 0;
    const changeText = `${up ? '+' : ''}${crypto.change.toFixed(2)}%`;

    let priceText;
    if (crypto.price >= 1000)       priceText = `$${Math.round(crypto.price).toLocaleString()}`;
    else if (crypto.price >= 1)     priceText = `$${crypto.price.toFixed(2)}`;
    else                            priceText = `$${crypto.price.toFixed(6)}`;

    const sectorName = crypto.sector || crypto.category || 'Crypto';
    const color = SECTOR_COLORS[crypto.sector] || '#3b82f6';
    const vol = getVolatilityLevel(crypto, 'crypto');

    return `
      <div class="market-row" onclick="openCryptoDetail('${crypto.symbol}')" title="Klik untuk membuka grafik & perdagangan ${crypto.symbol} (${crypto.name})">
        <div class="market-col col-symbol">
          <span class="crypto-icon" style="font-size:16px;min-width:20px;text-align:center">${crypto.icon || '🪙'}</span>
          <span class="market-symbol">${crypto.symbol}</span>
        </div>
        <div class="market-col col-name">
          <span class="market-name" title="${crypto.name}">${crypto.name}</span>
        </div>
        <div class="market-col col-sector">
          <span class="market-sector-badge" style="color:${color}; background:${color}18; border:1px solid ${color}44;">
            ${sectorName}
          </span>
        </div>
        <div class="market-col col-volatility">
          <span class="market-volatility-badge vol-${vol.key}" style="color:${vol.color}; background:${vol.bg}; border:1px solid ${vol.border};" title="Volatilitas ${vol.label} (${vol.pctText} harian)">
            ${vol.badge}
          </span>
        </div>
        <div class="market-col col-price">
          <span class="market-price">${priceText}</span>
        </div>
        <div class="market-col col-change">
          <span class="market-change ${up ? 'up' : 'down'}">${changeText}</span>
        </div>
        <!-- Subline untuk tampilan mobile/layar sempit -->
        <div class="market-row-subline">
          <span class="market-sector-badge" style="color:${color}; background:${color}18; border:1px solid ${color}44;">${sectorName}</span>
          <span class="market-volatility-badge vol-${vol.key}" style="color:${vol.color}; background:${vol.bg}; border:1px solid ${vol.border};">${vol.badge}</span>
        </div>
      </div>`;
}

export function buildPortfolioRow(item, type = 'stock') {
    const isStock = type === 'stock';
    const isProfit = (item.profit || 0) >= 0;
    const pnlSign = isProfit ? '+' : '';
    const clickHandler = isStock ? `openStockDetail('${item.symbol}')` : `openCryptoDetail('${item.symbol}')`;
    const icon = isStock ? '📈' : (item.icon || '🪙');
    const holdingQty = isStock 
        ? `${item.shares} lot`
        : `${Number(item.amount).toFixed(4)} ${item.symbol}`;

    return `
      <div class="portfolio-asset-row" onclick="${clickHandler}">
        <div class="portfolio-asset-left">
          <div class="portfolio-asset-icon">${icon}</div>
          <div class="portfolio-asset-meta">
            <div class="portfolio-asset-symbol">
              <span>${item.symbol}</span>
              <span class="portfolio-type-pill">${type.toUpperCase()}</span>
            </div>
            <div class="portfolio-asset-subtitle">
              ${holdingQty} • Avg: $ ${Number(item.avgBuyPrice || 0).toLocaleString('id-ID')}
            </div>
          </div>
        </div>
        <div class="portfolio-asset-center">
          <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase;">Nilai Pasar</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #ffffff;">$ ${Number(item.currentValue || 0).toLocaleString('id-ID')}</div>
        </div>
        <div class="portfolio-asset-right">
          <div style="text-align: right;">
            <div style="font-size: 0.85rem; font-weight: 800; color: ${isProfit ? '#10b981' : '#ef4444'};">
              ${pnlSign}$ ${Number(item.profit || 0).toLocaleString('id-ID')}
            </div>
            <div style="font-size: 0.7rem; font-weight: 700; color: ${isProfit ? '#10b981' : '#ef4444'};">
              ${pnlSign}${(item.profitPercent || 0).toFixed(2)}%
            </div>
          </div>
          <button class="portfolio-trade-pill" onclick="event.stopPropagation(); ${clickHandler}">
            ⚡ Trade
          </button>
        </div>
      </div>
    `;
}

// Global click handlers for trading modal
if (typeof window !== 'undefined') {
    window.openStockDetail = (symbol) => {
        tradingPage.open(symbol, 'stock');
    };
    window.openCryptoDetail = (symbol) => {
        tradingPage.open(symbol, 'crypto');
    };
}

