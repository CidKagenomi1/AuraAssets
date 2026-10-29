/**
 * MarketRows.js - Row renderers for Stock and Crypto Market Lists
 * Part of modular views structure
 */

import tradingPage from '../../trading/TradingPage.js';

// ===== WARNA PER SEKTOR =====
export const SECTOR_COLORS = {
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
};

// ===== RENDER BARIS SAHAM =====
export function buildStockRow(stock) {
    const up = stock.change >= 0;
    const color = SECTOR_COLORS[stock.sector] || '#888888';
    const changeText = `${up ? '+' : ''}${stock.change.toFixed(2)}%`;
    const priceText = `$${stock.price.toLocaleString('en-US', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    })}`;

    return `
      <div class="market-row" onclick="openStockDetail('${stock.symbol}')">
        <span class="sector-dot" style="background:${color}"></span>
        <span class="market-symbol">${stock.symbol}</span>
        <span class="market-name">${stock.name}</span>
        <span class="market-price">${priceText}</span>
        <span class="market-change ${up ? 'up' : 'down'}">${changeText}</span>
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

    return `
      <div class="market-row" onclick="openCryptoDetail('${crypto.symbol}')">
        <span style="font-size:17px;min-width:24px;text-align:center">${crypto.icon}</span>
        <span class="market-symbol">${crypto.symbol}</span>
        <span class="market-name">${crypto.name}</span>
        <span class="market-price">${priceText}</span>
        <span class="market-change ${up ? 'up' : 'down'}">${changeText}</span>
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

