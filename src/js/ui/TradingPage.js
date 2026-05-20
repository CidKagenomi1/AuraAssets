/**
 * TradingPage.js - Full-Screen Trading Terminal (v2)
 * - Removed: Chart.js candlestick chart
 * - Added: Simple price history list (last 8 data points with direction arrows)
 * - Retained: All buy/sell order logic
 */

import stockMarket from '../finance/StockMarket.js';
import cryptoMarket from '../finance/CryptoMarket.js';
import financeManager from '../finance/FinanceManager.js';
import gameState from '../game/GameState.js';
import ui from './UIManager.js';
import { slideInFromRight, pulseElement } from './Animations.js';
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
    
    if (asset.priceHistory.length < 30) {
      let price = asset.priceHistory[0] || asset.price;
      const volatility = asset.volatility || 0.015;
      const generated = [];
      const needed = 30 - asset.priceHistory.length;
      for (let i = 0; i < needed; i++) {
        const change = (Math.random() - 0.5) * 2 * volatility;
        price = price * (1 + change);
        generated.unshift(parseFloat(price.toFixed(2)));
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

  renderRecentTrades(asset) {
    return Array.from({ length: 10 }).map(() => {
      const up = Math.random() > 0.5;
      return `
        <div class="trade-row" style="
          display:flex;
          justify-content:space-between;
          padding:0.3rem 0.25rem;
          font-size:0.75rem;
          border-radius:2px;
          transition:background 0.15s;
        ">
          <span style="
            color:${up ? '#34d399' : '#f87171'};
            font-weight:600;
          ">
            ${this.formatPrice(asset.price * (1 + ((Math.random()-0.5)*0.002)))}
          </span>
          <span style="color:white;">
            ${(Math.random() * 2).toFixed(3)}
          </span>
          <span style="color:var(--text-muted);">
            ${Math.floor(Math.random() * 59)}s
          </span>
        </div>
      `;
    }).join('');
  }

  renderAsks(asset) {
    return Array.from({ length: 6 }).map(() => `
      <div class="order-book-row" style="
        display:flex;
        justify-content:space-between;
        font-size:0.75rem;
        padding:0.15rem 0.25rem;
        border-radius:2px;
        transition:background 0.15s;
      ">
        <span style="color:#f87171;">
          ${this.formatPrice(asset.price * (1 + Math.random() * 0.01))}
        </span>
        <span style="color:var(--text-muted);">
          ${(Math.random() * 5).toFixed(2)}
        </span>
      </div>
    `).join('');
  }

  renderBids(asset) {
    return Array.from({ length: 6 }).map(() => `
      <div class="order-book-row" style="
        display:flex;
        justify-content:space-between;
        font-size:0.75rem;
        padding:0.15rem 0.25rem;
        border-radius:2px;
        transition:background 0.15s;
      ">
        <span style="color:#34d399;">
          ${this.formatPrice(asset.price * (1 - Math.random() * 0.01))}
        </span>
        <span style="color:var(--text-muted);">
          ${(Math.random() * 5).toFixed(2)}
        </span>
      </div>
    `).join('');
  }

  render(asset) {
    const portfolio = this.assetType === 'stock'
      ? gameState.get('stocks') || {}
      : gameState.get('crypto') || {};
    const holding = portfolio[this.currentAsset];
    const balance = gameState.getBalance();

    // Use market's price history if available, else use generated one
    const history = (asset.priceHistory && asset.priceHistory.length > 0) 
      ? asset.priceHistory 
      : this.priceHistory;

    const tradingPageHTML = `
      <div id="trading-page" class="trading-page" style="position: absolute; inset: 0; display: flex; flex-direction: column; background: var(--bg-main); z-index: 1000; overflow: hidden; border-radius: 0;">
        
        <!-- HEADER -->
        <div class="trading-header" style="border-bottom: 1px solid var(--border-color); padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <button class="btn-back" id="btn-close-trading" style="background: none; border: none; color: white; font-size: 1.25rem; cursor: pointer;">←</button>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span style="font-size: 1.75rem;">${this.assetType === 'stock' ? stockMarket.getStockIcon(asset.sector) : asset.icon}</span>
              <div>
                <div style="font-weight: 800; font-size: 1.1rem; line-height: 1;">${this.currentAsset}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${asset.name}</div>
              </div>
            </div>
          </div>
          <div style="text-align: right;">
             <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Trading Terminal</div>
             <div style="font-size: 0.7rem; color: var(--accent-primary); font-weight: 700;">LIVE CONNECTED</div>
          </div>
        </div>

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
              ${this.formatVolume(Math.random() * 1e9)}
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: row; flex: 1; overflow-y: auto; flex-wrap: wrap;">
          
          <!-- LEFT COLUMN: MARKET INTELLIGENCE -->
          <div style="flex: 1.2; padding: 1.5rem; border-right: 1px solid var(--border-color); background: rgba(0,0,0,0.1); min-width: 320px;">
            
            <!-- Price Card -->
            <div style="margin-bottom: 2rem;">
              <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">Market Price</div>
              <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                <div style="display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap;">
                  <span id="live-price" style="font-size: 1.75rem; font-weight: 800; color: white; letter-spacing: -0.02em;">${this.formatPrice(asset.price)}</span>
                  <span id="live-change" class="${(asset.change || 0) >= 0 ? 'positive' : 'negative'}" style="font-weight: 700; font-size: 0.95rem;">
                    ${(asset.change || 0) >= 0 ? '▲' : '▼'} ${Math.abs(asset.change || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
              
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-top: 1.25rem; padding: 0.875rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-md);">
                <div>
                  <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase;">24h High</div>
                  <div style="font-size: 0.8rem; font-weight: 700; color: white;">${this.formatPrice(asset.high24h || asset.price * 1.04)}</div>
                </div>
                <div>
                  <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase;">24h Low</div>
                  <div style="font-size: 0.8rem; font-weight: 700; color: white;">${this.formatPrice(asset.low24h || asset.price * 0.97)}</div>
                </div>
                <div>
                  <div style="font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase;">Vol</div>
                  <div style="font-size: 0.8rem; font-weight: 700; color: white;">${this.formatVolume(Math.random() * 1e9)}</div>
                </div>
              </div>
            </div>

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
                   <button id="btn-toggle-ma" style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); color: #818cf8; font-size: 0.7rem; padding: 0.25rem 0.75rem; border-radius: 20px; cursor: pointer; font-weight: 600;">Toggle MA</button>
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
            <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem; box-shadow: 0 10px 30px rgba(0,0,0,0.3); margin-bottom: 1.5rem;">
               <div style="font-size: 0.8rem; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                 <span>Riwayat Trading</span>
                 <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: none; font-weight: 400;">10 transaksi terakhir</span>
               </div>
               <div style="max-height: 250px; overflow-y: auto; padding-right: 4px;">
                 <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem;">
                   <thead>
                     <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); color: var(--text-muted); font-size: 0.7rem;">
                       <th style="padding: 0.5rem 0.25rem;">Aset</th>
                       <th style="padding: 0.5rem 0.25rem;">Jumlah</th>
                       <th style="padding: 0.5rem 0.25rem;">Harga Buy → Sell</th>
                       <th style="padding: 0.5rem 0.25rem; text-align: right;">Profit / Loss</th>
                     </tr>
                   </thead>
                   <tbody>
                     ${this.renderTradeHistoryRows()}
                   </tbody>
                 </table>
               </div>
            </div>

          </div>

          <!-- RIGHT COLUMN: EXECUTION & POSITION -->
          <div style="flex: 0.8; padding: 1.5rem; display: flex; flex-direction: column; min-width: 300px;">
            
            <!-- ORDER BOOK -->
            <div style="
              background:rgba(0,0,0,0.25);
              border:1px solid var(--border-color);
              border-radius:var(--radius-lg);
              padding:1rem;
              margin-bottom:1rem;
            ">
              <div style="
                display:flex;
                justify-content:space-between;
                margin-bottom:0.75rem;
              ">
                <span style="font-size:0.8rem;font-weight:700;color:white;">
                  Order Book
                </span>
                <span style="
                  font-size:0.7rem;
                  color:var(--text-muted);
                ">
                  Live
                </span>
              </div>
              <div style="
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:1rem;
              ">
                <!-- SELL -->
                <div>
                  <div style="
                    color:#ef4444;
                    font-size:0.7rem;
                    margin-bottom:0.5rem;
                  ">
                    Asks
                  </div>
                  <div id="order-book-asks">
                    ${this.renderAsks(asset)}
                  </div>
                </div>
                <!-- BUY -->
                <div>
                  <div style="
                    color:#10b981;
                    font-size:0.7rem;
                    margin-bottom:0.5rem;
                  ">
                    Bids
                  </div>
                  <div id="order-book-bids">
                    ${this.renderBids(asset)}
                  </div>
                </div>
              </div>
            </div>

            <!-- RECENT TRADES -->
            <div style="
              background:rgba(0,0,0,0.25);
              border:1px solid var(--border-color);
              border-radius:var(--radius-lg);
              padding:1rem;
              margin-bottom:1rem;
            ">
              <div style="
                font-size:0.8rem;
                font-weight:700;
                color:white;
                margin-bottom:0.75rem;
              ">
                Recent Trades
              </div>
              <div style="max-height:180px;overflow:auto;padding-right:4px;">
                <div id="recent-trades-list">
                  ${this.renderRecentTrades(asset)}
                </div>
              </div>
            </div>

            <!-- Position Header -->
            <div style="margin-bottom: 1.5rem;">
              <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; margin-bottom: 1rem;">Position & Order</div>
              
              ${holding ? `
                <div style="padding: 1rem; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: var(--radius-md);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">Posisi TeKuka</span>
                    <span class="${this.calculatePnL(holding, asset.price) >= 0 ? 'positive' : 'negative'}" style="font-weight: 700; font-size: 0.9rem;">
                      ${this.calculatePnL(holding, asset.price) >= 0 ? '+' : ''}${this.formatPnL(holding, asset.price)}
                    </span>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.85rem;">
                    <div>
                      <div style="color: var(--text-muted); font-size: 0.7rem;">Holding</div>
                      <div style="font-weight: 600;">${this.assetType === 'stock' ? holding.shares + ' lot' : cryptoMarket.formatAmount(holding.amount) + ' ' + this.currentAsset}</div>
                    </div>
                    <div>
                      <div style="color: var(--text-muted); font-size: 0.7rem;">Nilai</div>
                      <div style="font-weight: 600;">${this.formatPrice((holding.shares || holding.amount) * asset.price)}</div>
                    </div>
                  </div>
                </div>
              ` : `
                <div style="padding: 1rem; background: rgba(255,255,255,0.03); border: 1px dashed var(--border-color); border-radius: var(--radius-md); text-align: center; color: var(--text-dim); font-size: 0.85rem;">
                  Tidak ada posisi teKuka
                </div>
              `}
            </div>

            <!-- Execution Tabs -->
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
                    <button type="button" class="quick-pct-btn" data-pct="10" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; color: white; cursor: pointer;">10%</button>
                    <button type="button" class="quick-pct-btn" data-pct="25" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; color: white; cursor: pointer;">25%</button>
                    <button type="button" class="quick-pct-btn" data-pct="50" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; color: white; cursor: pointer;">50%</button>
                    <button type="button" class="quick-pct-btn" data-pct="75" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; color: white; cursor: pointer;">75%</button>
                    <button type="button" class="quick-pct-btn" data-pct="100" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 4px; color: #818cf8; cursor: pointer; font-weight: 800;">MAX</button>
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

                <!-- Suggested Price Offsets -->
                <div style="display: flex; gap: 0.25rem; margin-bottom: 1.25rem; justify-content: space-between;">
                  <button type="button" class="price-suggest-btn" data-offset="-0.05" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 4px; color: #f87171; cursor: pointer;">-5%</button>
                  <button type="button" class="price-suggest-btn" data-offset="-0.01" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 4px; color: #f87171; cursor: pointer;">-1%</button>
                  <button type="button" class="price-suggest-btn" data-offset="0" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: white; cursor: pointer; font-weight: 700;">Market</button>
                  <button type="button" class="price-suggest-btn" data-offset="0.01" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 4px; color: #34d399; cursor: pointer;">+1%</button>
                  <button type="button" class="price-suggest-btn" data-offset="0.05" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 4px; color: #34d399; cursor: pointer;">+5%</button>
                </div>

                <div class="form-row" style="margin-bottom: 0.5rem;">
                  <label style="font-size: 0.75rem; display: flex; justify-content: space-between;">
                    <span>${this.assetType === 'stock' ? 'Jumlah Lot' : 'Jumlah (IDR)'}</span>
                    <span id="limit-pct-label" style="color: var(--accent-primary); font-weight: 700;">0%</span>
                  </label>
                  <input type="number" id="limit-amount" class="order-input"
                    value="${this.assetType === 'stock' ? '100' : '1000000'}">
                </div>

                <!-- Range Slider & Pct Shortcuts for Limit Order -->
                <div style="margin-bottom: 1.25rem;">
                  <input type="range" id="limit-pct-slider" class="order-pct-slider" min="0" max="100" value="0" 
                    style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; cursor: pointer; outline: none; margin-bottom: 0.5rem; accent-color: var(--accent-primary);">
                  <div style="display: flex; gap: 0.25rem; justify-content: space-between;">
                    <button type="button" class="quick-pct-btn" data-pct="10" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; color: white; cursor: pointer;">10%</button>
                    <button type="button" class="quick-pct-btn" data-pct="25" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; color: white; cursor: pointer;">25%</button>
                    <button type="button" class="quick-pct-btn" data-pct="50" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; color: white; cursor: pointer;">50%</button>
                    <button type="button" class="quick-pct-btn" data-pct="75" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; color: white; cursor: pointer;">75%</button>
                    <button type="button" class="quick-pct-btn" data-pct="100" style="flex: 1; font-size: 0.65rem; padding: 0.25rem 0; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 4px; color: #818cf8; cursor: pointer; font-weight: 800;">MAX</button>
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
    const homeSections = ['balance-card', 'market-pulse-widget', 'earn-panel', '.quick-actions', 'footer-dashboard-grid'];
    homeSections.forEach(sel => {
        const el = document.querySelector(sel) || document.getElementById(sel);
        if (el) el.style.display = 'none';
    });

    viewContainer.insertAdjacentHTML('beforeend', tradingPageHTML);

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

    const priceEl = document.getElementById('live-price');
    const changeEl = document.getElementById('live-change');

    if (priceEl) {
      priceEl.textContent = this.formatPrice(asset.price);
      pulseElement(priceEl);
    }
    if (changeEl) {
      changeEl.textContent = `${(asset.change || 0) >= 0 ? '▲' : '▼'} ${Math.abs(asset.change || 0).toFixed(2)}%`;
      changeEl.className = `trading-change ${(asset.change || 0) >= 0 ? 'positive' : 'negative'}`;
    }

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

    // Update Order Book asks & bids
    const asksEl = document.getElementById('order-book-asks');
    const bidsEl = document.getElementById('order-book-bids');
    if (asksEl) {
      asksEl.innerHTML = this.renderAsks(asset);
    }
    if (bidsEl) {
      bidsEl.innerHTML = this.renderBids(asset);
    }

    // Update Recent Trades
    const tradesEl = document.getElementById('recent-trades-list');
    if (tradesEl) {
      tradesEl.innerHTML = this.renderRecentTrades(asset);
    }

    this.updateChartData();
    this.updateOrderTotal();
    this.updateTradeHistoryTable();
  }

  updateChartData() {
    if (!this.chart) return;
    const asset = this.assetType === 'stock' ? stockMarket.getStock(this.currentAsset) : cryptoMarket.getCrypto(this.currentAsset);
    if (!asset || !asset.priceHistory) return;

    const candles = this.convertToCandles(asset.priceHistory.slice(-30));
    this.chart.setData(candles);

    // Update Stats
    const avgVolEl = document.getElementById('stat-avg-volume');
    if (avgVolEl) {
        const avg = Math.round(candles.reduce((acc, c) => acc + c.volume, 0) / (candles.length || 1));
        avgVolEl.textContent = avg.toLocaleString();
    }

    const volEl = document.getElementById('stat-volatility');
    if (volEl) {
        const vol = asset.volatility || 0.05;
        volEl.textContent = vol > 0.15 ? 'HIGH' : (vol > 0.08 ? 'MEDIUM' : 'LOW');
        volEl.style.color = vol > 0.15 ? '#ef4444' : (vol > 0.08 ? '#f59e0b' : '#10b981');
    }
  }

  convertToCandles(history) {
    const bucketSize = 1; 
    const candles = [];
    
    for (let i = 0; i < history.length; i += bucketSize) {
      const slice = history.slice(i, i + bucketSize);
      if (slice.length === 0) continue;

      const open = slice[0];
      const close = slice[slice.length - 1];
      const change = (Math.random() - 0.5) * 0.004;
      const high = Math.max(open, close) * (1 + Math.max(0, change));
      const low = Math.min(open, close) * (1 - Math.max(0, -change));
      
      const volume = 5000 + Math.random() * 20000;

      candles.push({
        time: i === history.length - 1 ? 'Live' : '',
        open, high, low, close, volume
      });
    }
    return candles;
  }


  bindEvents() {
    document.getElementById('btn-close-trading')?.addEventListener('click', () => this.close());
    
    document.getElementById('btn-toggle-ma')?.addEventListener('click', (e) => {
      if (this.chart) {
        this.chart.config.showMA = !this.chart.config.showMA;
        this.chart.render();
        e.target.style.background = this.chart.config.showMA ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)';
      }
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

  close() {
    if (this.updateInterval) { clearInterval(this.updateInterval); this.updateInterval = null; }
    document.getElementById('trading-page')?.remove();
    
    const bottomNav = document.querySelector('.app-bottom-nav');
    if (bottomNav) bottomNav.style.display = '';

    // Restore previously hidden panels and sections
    const activeView = document.querySelector('.nav-btn.active')?.dataset.view || 'home';
    if (activeView === 'home') {
        const homeSections = ['balance-card', 'market-pulse-widget', 'earn-panel', '.quick-actions', 'footer-dashboard-grid'];
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
