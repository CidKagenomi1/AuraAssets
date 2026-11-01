/**
 * StockCryptoSubView.js - Stock & Crypto Market Lists, Multi-factor Filtering & Smart Table
 * Manages search, trend/risk/sector filters, table sorting, and row render delegation.
 */

import stockMarket from '../../../trading/StockMarket.js';
import cryptoMarket from '../../../trading/CryptoMarket.js';
import tradingSignalManager from '../../../trading/TradingSignalManager.js';
import { SECTOR_COLORS, buildStockRow, buildCryptoRow, getVolatilityLevel, buildMarketTableHeader } from '../MarketRows.js';

export class StockCryptoSubView {
  constructor(options = {}) {
    this.marketFilter = '';
    this.marketSort = { key: 'default', dir: 'asc' };
    this.marketTrendFilter = 'all';
    this.marketRiskFilter = 'all';
    this.marketSectorFilter = 'all';
    this.onUpdate = options.onUpdate || (() => {});
  }

  setUpdateCallback(cb) {
    this.onUpdate = cb;
  }

  bindSmartControls() {
    const searchInput = document.getElementById('market-search');
    const clearBtn = document.getElementById('btn-clear-market-search');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.marketFilter = e.target.value.toLowerCase().trim();
        if (clearBtn) {
          clearBtn.style.display = this.marketFilter ? 'block' : 'none';
        }
        this.onUpdate();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        this.marketFilter = '';
        clearBtn.style.display = 'none';
        this.onUpdate();
      });
    }

    // Toggle Collapsible Filter Drawer
    const filterToggleBtn = document.getElementById('btn-toggle-market-filter');
    const filterDrawer = document.getElementById('market-filter-drawer');
    if (filterToggleBtn && filterDrawer) {
      filterToggleBtn.addEventListener('click', () => {
        const isHidden = filterDrawer.style.display === 'none';
        filterDrawer.style.display = isHidden ? 'flex' : 'none';
        filterToggleBtn.classList.toggle('active-filter', isHidden);
      });
    }

    // Sort Dropdown
    const sortSelect = document.getElementById('market-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'default') {
          this.marketSort = { key: 'default', dir: 'asc' };
        } else {
          const parts = val.split('_');
          this.marketSort = { key: parts[0], dir: parts[1] || 'asc' };
        }
        this.onUpdate();
      });
    }

    const trendSelect = document.getElementById('market-filter-trend');
    if (trendSelect) {
      trendSelect.addEventListener('change', (e) => {
        this.marketTrendFilter = e.target.value;
        this.onUpdate();
      });
    }

    const riskSelect = document.getElementById('market-filter-risk');
    if (riskSelect) {
      riskSelect.addEventListener('change', (e) => {
        this.marketRiskFilter = e.target.value;
        this.onUpdate();
      });
    }

    const resetBtn = document.getElementById('btn-reset-market-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }

    document.querySelectorAll('.btn-sort').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setSort(btn.dataset.sort);
      });
    });

    window.setMarketSectorFilter = (sec) => this.setSectorFilter(sec);
    window.resetMarketFilters = () => this.resetFilters();
    window.removeMarketFilterChip = (type) => this.removeFilter(type);
  }

  removeFilter(type) {
    if (type === 'search') {
      this.marketFilter = '';
      const input = document.getElementById('market-search');
      if (input) input.value = '';
      const clearBtn = document.getElementById('btn-clear-market-search');
      if (clearBtn) clearBtn.style.display = 'none';
    } else if (type === 'trend') {
      this.marketTrendFilter = 'all';
      const trendSelect = document.getElementById('market-filter-trend');
      if (trendSelect) trendSelect.value = 'all';
    } else if (type === 'risk') {
      this.marketRiskFilter = 'all';
      const riskSelect = document.getElementById('market-filter-risk');
      if (riskSelect) riskSelect.value = 'all';
    } else if (type === 'sector') {
      this.marketSectorFilter = 'all';
    } else if (type === 'sort') {
      this.marketSort = { key: 'default', dir: 'asc' };
      const sortSelect = document.getElementById('market-sort-select');
      if (sortSelect) sortSelect.value = 'default';
    }
    this.onUpdate();
  }

  setSort(key) {
    if (key === 'default') {
      this.marketSort = { key: 'default', dir: 'asc' };
    } else if (this.marketSort.key === key) {
      this.marketSort.dir = this.marketSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      this.marketSort.key = key;
      this.marketSort.dir = (key === 'name' || key === 'sector') ? 'asc' : 'desc';
    }

    document.querySelectorAll('.btn-sort').forEach(b => {
      b.classList.toggle('active', b.dataset.sort === this.marketSort.key);
    });

    const sortSelect = document.getElementById('market-sort-select');
    if (sortSelect && key !== 'default') {
      sortSelect.value = `${this.marketSort.key}_${this.marketSort.dir}`;
    }

    this.onUpdate();
  }

  setSectorFilter(sec) {
    this.marketSectorFilter = (this.marketSectorFilter === sec) ? 'all' : sec;
    this.onUpdate();
  }

  resetFilters() {
    this.marketFilter = '';
    this.marketTrendFilter = 'all';
    this.marketRiskFilter = 'all';
    this.marketSectorFilter = 'all';
    this.marketSort = { key: 'default', dir: 'asc' };

    const searchInput = document.getElementById('market-search');
    if (searchInput) searchInput.value = '';

    const clearBtn = document.getElementById('btn-clear-market-search');
    if (clearBtn) clearBtn.style.display = 'none';

    const trendSelect = document.getElementById('market-filter-trend');
    if (trendSelect) trendSelect.value = 'all';

    const riskSelect = document.getElementById('market-filter-risk');
    if (riskSelect) riskSelect.value = 'all';

    const sortSelect = document.getElementById('market-sort-select');
    if (sortSelect) sortSelect.value = 'default';

    document.querySelectorAll('.btn-sort').forEach(b => {
      b.classList.toggle('active', b.dataset.sort === 'default');
    });

    this.onUpdate();
  }

  renderSectorPills(assets, type = 'stock') {
    const container = document.getElementById('market-sector-pills');
    if (!container) return;

    const sectorCounts = {};
    assets.forEach(asset => {
      const sec = asset.sector || (type === 'crypto' ? asset.category : 'Lainnya') || 'Lainnya';
      sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
    });

    const sectors = Object.keys(sectorCounts).sort();
    const isAllActive = this.marketSectorFilter === 'all';

    let html = `
      <button type="button" class="sector-pill ${isAllActive ? 'active' : ''}" onclick="window.setMarketSectorFilter('all')">
        <span>Semua</span>
        <span class="sector-pill-count">${assets.length}</span>
      </button>
    `;

    sectors.forEach(sec => {
      const active = this.marketSectorFilter === sec;
      const count = sectorCounts[sec];
      const color = SECTOR_COLORS[sec] || '#38bdf8';

      html += `
        <button type="button" class="sector-pill ${active ? 'active' : ''}" onclick="window.setMarketSectorFilter('${sec.replace(/'/g, "\\'")}')" style="${active ? `border-color:${color}; background:${color}22; color:#fff;` : ''}">
          <span class="sector-pill-dot" style="background:${color}"></span>
          <span>${sec}</span>
          <span class="sector-pill-count">${count}</span>
        </button>
      `;
    });

    container.innerHTML = html;
  }

  filterAndSortItems(items, type = 'stock') {
    let result = [...items];
    const isStock = type === 'stock';

    // 1. Text Search (symbol, name, sector)
    if (this.marketFilter) {
      const q = this.marketFilter;
      result = result.filter(item => {
        const symbol = (item.symbol || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        const sector = (item.sector || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        return symbol.includes(q) || name.includes(q) || sector.includes(q) || category.includes(q);
      });
    }

    // 2. Trend Filter
    if (this.marketTrendFilter !== 'all') {
      if (this.marketTrendFilter === 'gainers') {
        result = result.filter(item => (item.change || 0) > 0);
      } else if (this.marketTrendFilter === 'losers') {
        result = result.filter(item => (item.change || 0) < 0);
      } else if (this.marketTrendFilter === 'signals') {
        const activeSignalIds = new Set((tradingSignalManager?.getSignals?.() || []).map(s => s.id));
        result = result.filter(item => activeSignalIds.has(item.symbol));
      } else if (this.marketTrendFilter === 'owned') {
        const ownedSymbols = isStock
          ? new Set((stockMarket.getPortfolio() || []).map(h => h.symbol))
          : new Set((cryptoMarket.getWallet() || []).map(w => w.symbol));
        result = result.filter(item => ownedSymbols.has(item.symbol));
      }
    }

    // 3. Volatility / Risk Filter
    if (this.marketRiskFilter !== 'all') {
      result = result.filter(item => {
        const volInfo = getVolatilityLevel(item, type);
        return volInfo.key === this.marketRiskFilter;
      });
    }

    // 4. Sector Filter
    if (this.marketSectorFilter !== 'all') {
      result = result.filter(item => {
        const sec = item.sector || (type === 'crypto' ? item.category : '') || '';
        return sec === this.marketSectorFilter;
      });
    }

    // 5. Sorting
    if (this.marketSort.key !== 'default') {
      const factor = this.marketSort.dir === 'asc' ? 1 : -1;
      const key = this.marketSort.key;

      result.sort((a, b) => {
        if (key === 'name') {
          return (a.symbol || '').localeCompare(b.symbol || '') * factor;
        }
        if (key === 'sector') {
          const secA = a.sector || (type === 'crypto' ? a.category : '') || '';
          const secB = b.sector || (type === 'crypto' ? b.category : '') || '';
          return secA.localeCompare(secB) * factor;
        }
        if (key === 'volatility') {
          const volA = typeof a.volatility === 'number' ? a.volatility : 0.02;
          const volB = typeof b.volatility === 'number' ? b.volatility : 0.02;
          return (volA - volB) * factor;
        }
        if (key === 'price') {
          return ((a.price || 0) - (b.price || 0)) * factor;
        }
        if (key === 'change') {
          return ((a.change || 0) - (b.change || 0)) * factor;
        }
        return 0;
      });
    }

    return result;
  }

  renderStocksList(stocksList, allStocks) {
    if (!stocksList) return 0;
    const stocks = this.filterAndSortItems(allStocks, 'stock');
    const tableHeader = buildMarketTableHeader('stock', this.marketSort);
    const rowsHTML = stocks.length > 0
      ? stocks.map(s => buildStockRow(s)).join('')
      : `
        <div class="market-empty-state" style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted); background:rgba(255,255,255,0.02); border-radius:8px; border:1px dashed rgba(255,255,255,0.1);">
          <div style="font-size:2rem; margin-bottom:0.5rem;">🔍</div>
          <div style="font-weight:700; color:#fff; margin-bottom:0.25rem;">Tidak Ada Saham yang Sesuai</div>
          <div style="font-size:0.78rem; margin-bottom:0.85rem;">Tidak ada saham dengan kombinasi pencarian, sektor, atau volatilitas saat ini.</div>
          <button type="button" onclick="window.resetMarketFilters()" style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.4); color:#34d399; padding:5px 12px; border-radius:6px; font-size:0.75rem; font-weight:700; cursor:pointer;">↺ Reset Semua Filter</button>
        </div>
      `;
    stocksList.innerHTML = tableHeader + rowsHTML;
    return stocks.length;
  }

  renderCryptoList(cryptoList, allCryptos) {
    if (!cryptoList) return 0;
    const cryptos = this.filterAndSortItems(allCryptos, 'crypto');
    const tableHeader = buildMarketTableHeader('crypto', this.marketSort);
    const rowsHTML = cryptos.length > 0
      ? cryptos.map(c => buildCryptoRow(c)).join('')
      : `
        <div class="market-empty-state" style="text-align:center; padding:2.5rem 1rem; color:var(--text-muted); background:rgba(255,255,255,0.02); border-radius:8px; border:1px dashed rgba(255,255,255,0.1);">
          <div style="font-size:2rem; margin-bottom:0.5rem;">🔍</div>
          <div style="font-weight:700; color:#fff; margin-bottom:0.25rem;">Tidak Ada Kripto yang Sesuai</div>
          <div style="font-size:0.78rem; margin-bottom:0.85rem;">Tidak ada koin dengan kombinasi pencarian, sektor, atau volatilitas saat ini.</div>
          <button type="button" onclick="window.resetMarketFilters()" style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.4); color:#34d399; padding:5px 12px; border-radius:6px; font-size:0.75rem; font-weight:700; cursor:pointer;">↺ Reset Semua Filter</button>
        </div>
      `;
    cryptoList.innerHTML = tableHeader + rowsHTML;
    return cryptos.length;
  }

  renderActiveChips() {
    const chipsContainer = document.getElementById('market-active-chips-list');
    const chipsBar = document.getElementById('market-active-chips-bar');
    const badgeEl = document.getElementById('market-filter-badge');
    const filterToggleBtn = document.getElementById('btn-toggle-market-filter');

    const chips = [];
    if (this.marketFilter) {
      chips.push({ type: 'search', label: `Cari: "${this.marketFilter}"` });
    }
    if (this.marketTrendFilter !== 'all') {
      const labels = { gainers: 'Gainers (+)', losers: 'Losers (-)', signals: 'Signal Aktif', owned: 'Dimiliki' };
      chips.push({ type: 'trend', label: `Tren: ${labels[this.marketTrendFilter] || this.marketTrendFilter}` });
    }
    if (this.marketRiskFilter !== 'all') {
      const labels = { low: 'Risiko Rendah', medium: 'Risiko Moderat', high: 'Risiko Tinggi' };
      chips.push({ type: 'risk', label: labels[this.marketRiskFilter] || this.marketRiskFilter });
    }
    if (this.marketSectorFilter !== 'all') {
      chips.push({ type: 'sector', label: `Sektor: ${this.marketSectorFilter}` });
    }
    if (this.marketSort.key !== 'default') {
      const labels = {
        name_asc: 'Nama (A-Z)', name_desc: 'Nama (Z-A)',
        price_desc: 'Harga Tertinggi', price_asc: 'Harga Terendah',
        change_desc: 'Perubahan % (+)', change_asc: 'Perubahan % (-)',
        volatility_desc: 'Volatilitas'
      };
      const sortKey = `${this.marketSort.key}_${this.marketSort.dir}`;
      chips.push({ type: 'sort', label: `Urutan: ${labels[sortKey] || this.marketSort.key}` });
    }

    if (badgeEl) {
      badgeEl.textContent = chips.length;
      badgeEl.style.display = chips.length > 0 ? 'inline-block' : 'none';
    }
    if (filterToggleBtn) {
      filterToggleBtn.classList.toggle('active-filter', chips.length > 0);
    }

    if (chipsContainer && chipsBar) {
      if (chips.length > 0) {
        chipsBar.style.display = 'flex';
        chipsContainer.innerHTML = chips.map(chip => `
          <div class="chip-item">
            <span>${chip.label}</span>
            <button type="button" class="chip-remove-btn" onclick="window.removeMarketFilterChip('${chip.type}')" title="Hapus Filter">×</button>
          </div>
        `).join('');
      } else {
        chipsBar.style.display = 'none';
        chipsContainer.innerHTML = '';
      }
    }
  }

  updateFilterSummary(totalCount, displayCount, currentTab) {
    this.renderActiveChips();

    const countText = document.getElementById('market-filter-count-text');
    const resetBtn = document.getElementById('btn-reset-market-filters');
    const isFiltered = Boolean(
      this.marketFilter ||
      this.marketTrendFilter !== 'all' ||
      this.marketRiskFilter !== 'all' ||
      this.marketSectorFilter !== 'all' ||
      this.marketSort.key !== 'default'
    );

    if (resetBtn) {
      resetBtn.style.display = isFiltered ? 'inline-block' : 'none';
    }

    if (countText && (currentTab === 'stocks' || currentTab === 'crypto')) {
      const isStockTab = currentTab === 'stocks';
      const assetLabel = isStockTab ? 'saham' : 'kripto';

      if (isFiltered) {
        const filtersUsed = [];
        if (this.marketFilter) filtersUsed.push(`cari: "${this.marketFilter}"`);
        if (this.marketSectorFilter !== 'all') filtersUsed.push(`sektor: ${this.marketSectorFilter}`);
        if (this.marketRiskFilter !== 'all') {
          const riskLabels = { low: 'Volatilitas Rendah', medium: 'Volatilitas Moderat', high: 'Volatilitas Tinggi' };
          filtersUsed.push(riskLabels[this.marketRiskFilter] || this.marketRiskFilter);
        }
        if (this.marketTrendFilter !== 'all') {
          const trendLabels = { gainers: 'Gainers', losers: 'Losers', signals: 'Signal Aktif', owned: 'Dimiliki' };
          filtersUsed.push(trendLabels[this.marketTrendFilter] || this.marketTrendFilter);
        }
        if (this.marketSort.key !== 'default') {
          filtersUsed.push(`sort: ${this.marketSort.key} (${this.marketSort.dir.toUpperCase()})`);
        }
        countText.innerHTML = `Menampilkan <strong style="color:var(--accent-primary);">${displayCount}</strong> dari ${totalCount} ${assetLabel} <span style="opacity:0.75; font-size:0.7rem;">(${filtersUsed.join(', ')})</span>`;
      } else {
        countText.textContent = `Menampilkan semua ${totalCount} ${assetLabel} (lengkap dengan Sektor & Volatilitas)`;
      }
    }
  }
}

export const stockCryptoSubView = new StockCryptoSubView();
export default stockCryptoSubView;

