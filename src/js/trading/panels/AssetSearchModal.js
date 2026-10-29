/**
 * AssetSearchModal.js - Asset Search & Sector Recommendation Dialog
 * Handles:
 *  - Real-time search query filtering across stocks & cryptocurrencies
 *  - Categorized recommendations: Hot Signals (Trending), Similar Sector/Category, Portfolio Assets
 *  - Quick transition switching of active asset in the trading terminal
 */

import stockMarket from '../StockMarket.js';
import cryptoMarket from '../CryptoMarket.js';
import gameState from '../../core/GameState.js';
import ui from '../../ui/UIManager.js';
import { Icons } from '../../ui/Icons.js';

class AssetSearchModal {
  formatPrice(price) {
    if (price === undefined || price === null || isNaN(price)) return '$ 0';
    if (price >= 1000) return '$ ' + new Intl.NumberFormat('en-US').format(Math.round(price));
    if (price >= 1) return '$ ' + Number(price).toFixed(2);
    return '$ ' + Number(price).toFixed(4);
  }

  /**
   * Open the Asset Search & Recommendation modal
   * @param {Object} options
   * @param {string} options.currentSymbol - Active symbol
   * @param {string} options.currentType - 'stock' | 'crypto'
   * @param {Function} options.onSelectAsset - Callback (symbol, type) => void
   */
  open({ currentSymbol, currentType = 'stock', onSelectAsset }) {
    // Determine current asset sector/category to recommend similar assets
    let currentSector = '';
    let currentCategory = '';

    if (currentType === 'stock') {
      const stock = stockMarket.getStock(currentSymbol);
      if (stock) currentSector = stock.sector;
    } else {
      const crypto = cryptoMarket.getCrypto(currentSymbol);
      if (crypto) {
        currentSector = crypto.sector || 'Layer 1 (L1)';
        currentCategory = crypto.category || '';
      }
    }

    // Retrieve all assets
    const allStocks = stockMarket.getAllStocks() || [];
    const allCryptos = cryptoMarket.getAllCryptos() || [];

    // Filter out current asset and find similar sector assets
    let similarAssets = [];
    if (currentType === 'stock') {
      similarAssets = allStocks
        .filter(s => s.symbol !== currentSymbol && s.sector === currentSector)
        .slice(0, 6)
        .map(s => ({ symbol: s.symbol, name: s.name, price: s.price, type: 'stock', sector: s.sector }));
      if (similarAssets.length < 6) {
        const extra = allStocks
          .filter(s => s.symbol !== currentSymbol && s.sector !== currentSector)
          .slice(0, 6 - similarAssets.length)
          .map(s => ({ symbol: s.symbol, name: s.name, price: s.price, type: 'stock', sector: s.sector }));
        similarAssets = [...similarAssets, ...extra];
      }
    } else {
      similarAssets = allCryptos
        .filter(c => c.symbol !== currentSymbol && (c.sector || 'Layer 1 (L1)') === currentSector)
        .slice(0, 6)
        .map(c => ({ symbol: c.symbol, name: c.name, price: c.price, type: 'crypto', icon: c.icon, sector: c.sector, category: c.category }));
      if (similarAssets.length < 6) {
        const extra = allCryptos
          .filter(c => c.symbol !== currentSymbol && (c.sector || 'Layer 1 (L1)') !== currentSector)
          .slice(0, 6 - similarAssets.length)
          .map(c => ({ symbol: c.symbol, name: c.name, price: c.price, type: 'crypto', icon: c.icon, sector: c.sector, category: c.category }));
        similarAssets = [...similarAssets, ...extra];
      }
    }

    // Active / Hot signals (Trending)
    const activeSignals = (gameState.get('tradingSignals') || [])
      .filter(sig => ['MOON 🚀', 'HOT 🔥', 'HEAT ⚡'].includes(sig.label))
      .slice(0, 6);

    // Current portfolio holdings
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
        <h3 class="modal-title" style="display:flex; align-items:center; gap:6px;">${Icons.search(16, 'var(--accent-primary)')} Cari & Pindah Aset</h3>
        <button class="modal-close" style="display:flex; align-items:center; justify-content:center;">${Icons.x(16)}</button>
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
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-warning); font-weight: 700; margin-bottom: 0.5rem; letter-spacing: 0.05em; display:flex; align-items:center; gap:5px;">${Icons.flame(13, 'var(--accent-warning)')} Sedang Hot (Sinyal Aktif)</div>
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
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-info); font-weight: 700; margin-bottom: 0.5rem; letter-spacing: 0.05em; display:flex; align-items:center; gap:5px;">${Icons.lightbulb(13, 'var(--accent-info)')} Rekomendasi (Sektor/Kategori Sejenis)</div>
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
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-primary); font-weight: 700; margin-bottom: 0.5rem; letter-spacing: 0.05em; display:flex; align-items:center; gap:5px;">${Icons.briefcase(13, 'var(--accent-primary)')} Aset Portofolio Anda</div>
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
    if (!modalContent) return;

    const searchInput = modalContent.querySelector('#asset-search-input');
    const resultsContainer = modalContent.querySelector('#search-results-container');
    const resultsList = modalContent.querySelector('#search-results-list');
    const recommendationsContainer = modalContent.querySelector('#search-recommendations-container');

    // Focus input
    setTimeout(() => {
      if (searchInput) searchInput.focus();
    }, 100);

    const selectAssetHandler = (symbol, type) => {
      ui.closeModal();
      if (typeof onSelectAsset === 'function') {
        onSelectAsset(symbol, type);
      }
    };

    // Live search input handler
    if (searchInput) {
      searchInput.oninput = (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (!q) {
          if (resultsContainer) resultsContainer.style.display = 'none';
          if (recommendationsContainer) recommendationsContainer.style.display = 'block';
          return;
        }

        // Filter matching stocks & cryptos
        const matchedStocks = allStocks
          .filter(s =>
            s.symbol.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q) ||
            (s.sector && s.sector.toLowerCase().includes(q))
          )
          .map(s => ({ ...s, type: 'stock' }));

        const matchedCryptos = allCryptos
          .filter(c =>
            c.symbol.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q) ||
            (c.sector && c.sector.toLowerCase().includes(q)) ||
            (c.category && c.category.toLowerCase().includes(q))
          )
          .map(c => ({ ...c, type: 'crypto' }));

        const matched = [...matchedStocks, ...matchedCryptos].slice(0, 12);

        if (matched.length === 0) {
          if (resultsList) {
            resultsList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1rem; font-size: 0.85rem;">Tidak ada aset yang cocok dengan "${q}"</div>`;
          }
        } else if (resultsList) {
          resultsList.innerHTML = matched.map(asset => {
            const icon = asset.type === 'stock' ? stockMarket.getStockIcon(asset.sector) : asset.icon;
            const up = (asset.change || 0) >= 0;
            const changeText = `${up ? '+' : ''}${(asset.change || 0).toFixed(2)}%`;
            const colorClass = up ? 'text-positive' : 'text-negative';
            const sectorLabel = asset.sector || asset.category || '';
            return `
              <div class="search-item-row" data-symbol="${asset.symbol}" data-type="${asset.type}">
                <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0; flex: 1;">
                  <span style="font-size: 1.2rem; min-width: 24px; text-align: center;">${icon}</span>
                  <div style="min-width: 0; flex: 1;">
                    <div style="font-weight: 700; color: white; display: flex; align-items: center; gap: 0.35rem; font-size: 0.9rem; flex-wrap: wrap;">
                      ${asset.symbol} 
                      <span style="font-size: 0.6rem; padding: 1px 4px; border-radius: 3px; background: rgba(255,255,255,0.08); color: var(--text-muted); font-weight: 600;">${asset.type.toUpperCase()}</span>
                      ${sectorLabel ? `<span style="font-size: 0.6rem; padding: 1px 5px; border-radius: 3px; background: rgba(16,185,129,0.12); color: var(--accent-primary); font-weight: 600;">${sectorLabel}</span>` : ''}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${asset.name}${asset.category && asset.sector ? ` · ${asset.category}` : ''}</div>
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

        if (resultsContainer) resultsContainer.style.display = 'block';
        if (recommendationsContainer) recommendationsContainer.style.display = 'none';

        // Bind search items
        resultsList?.querySelectorAll('.search-item-row').forEach(el => {
          el.onclick = () => selectAssetHandler(el.dataset.symbol, el.dataset.type);
        });
      };
    }

    // Bind recommendation cards
    modalContent.querySelectorAll('.search-item-card').forEach(el => {
      el.onclick = () => selectAssetHandler(el.dataset.symbol, el.dataset.type);
    });
  }
}

export default new AssetSearchModal();

