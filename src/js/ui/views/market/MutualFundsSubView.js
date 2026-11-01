/**
 * MutualFundsSubView.js - Reksa Dana & ETF Sub-View and Trading Modal Suite
 * Handles product catalogs, sector filtering, returns simulation, and buy/sell modals.
 */

import mutualFundManager from '../../../trading/MutualFundManager.js';
import financeManager from '../../../finance/FinanceManager.js';
import gameState from '../../../core/GameState.js';
import ui from '../../UIManager.js';

export class MutualFundsSubView {
  constructor(options = {}) {
    this.fundsSubTab = 'reksa_dana';
    this.etfSectorFilter = 'ALL';
    this.onUpdate = options.onUpdate || (() => {});
  }

  setUpdateCallback(cb) {
    this.onUpdate = cb;
  }

  render(container) {
    if (!container) return;

    const allFunds = mutualFundManager.getFunds();
    const conventionalFunds = allFunds.filter(f => f.category === 'reksa_dana');
    const etfFunds = allFunds.filter(f => f.category === 'etf');
    
    // Total portfolio metrics
    const totalVal = mutualFundManager.getTotalPortfolioValue();
    const totalInvested = allFunds.reduce((sum, f) => sum + f.invested, 0);
    const totalPnl = totalVal - totalInvested;
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const playerBalance = gameState.getBalance();

    // Determine current displayed list
    let displayedFunds = this.fundsSubTab === 'etf' ? etfFunds : conventionalFunds;
    if (this.fundsSubTab === 'etf' && this.etfSectorFilter !== 'ALL') {
      displayedFunds = displayedFunds.filter(f => f.sector === this.etfSectorFilter);
    }

    const etfSectors = ['ALL', 'Indeks Global', 'Teknologi & AI', 'Semikonduktor', 'REITs Properti', 'Pasar Berkembang', 'Kesehatan'];

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        
        <!-- Mutual Funds Portfolio Header Summary -->
        <div class="funds-portfolio-hero" style="background: linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%); border: 1px solid rgba(52, 211, 153, 0.25); border-radius: var(--radius-md); padding: 1.15rem 1.35rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Portofolio Reksa Dana & ETF Anda</span>
            <div style="font-size: 1.75rem; font-weight: 900; color: #34d399; margin: 3px 0 2px 0;">
              $ ${financeManager.formatCurrency(totalVal, true)}
            </div>
            <span style="font-size: 0.72rem; color: var(--text-dim);">
              Modal Pokok: $ ${financeManager.formatCurrency(totalInvested, true)} · Floating P/L: 
              <strong style="color: ${totalPnl >= 0 ? '#10b981' : '#ef4444'};">${totalPnl >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(totalPnl, true)} (${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%)</strong>
            </span>
          </div>

          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 6px 12px; text-align: right;">
              <div style="font-size: 0.68rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Saldo Kas Utama</div>
              <div style="font-size: 0.95rem; font-weight: 800; color: #fff;">$ ${financeManager.formatCurrency(playerBalance, true)}</div>
            </div>
          </div>
        </div>

        <!-- Segmented Tab Switcher (Reksa Dana vs ETF) -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.85rem;">
          <div class="funds-category-bar" style="display: inline-flex; gap: 0.35rem; background: rgba(0,0,0,0.4); padding: 4px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
            <button class="funds-category-toggle ${this.fundsSubTab === 'reksa_dana' ? 'active' : ''}" data-category="reksa_dana" style="
              padding: 8px 18px;
              border-radius: 8px;
              font-size: 0.82rem;
              font-weight: 800;
              cursor: pointer;
              border: none;
              transition: all 0.2s ease;
              background: ${this.fundsSubTab === 'reksa_dana' ? 'var(--accent-primary)' : 'transparent'};
              color: ${this.fundsSubTab === 'reksa_dana' ? '#000' : 'var(--text-muted)'};
            ">
              📦 Reksa Dana Konvensional (${conventionalFunds.length})
            </button>
            <button class="funds-category-toggle ${this.fundsSubTab === 'etf' ? 'active' : ''}" data-category="etf" style="
              padding: 8px 18px;
              border-radius: 8px;
              font-size: 0.82rem;
              font-weight: 800;
              cursor: pointer;
              border: none;
              transition: all 0.2s ease;
              background: ${this.fundsSubTab === 'etf' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent'};
              color: ${this.fundsSubTab === 'etf' ? '#fff' : 'var(--text-muted)'};
            ">
              🌐 Exchange-Traded Funds (ETF) (${etfFunds.length})
            </button>
          </div>

          <div style="font-size: 0.75rem; color: var(--text-dim);">
            ${this.fundsSubTab === 'etf' ? '⚡ Dana indeks berbasis bursa dengan biaya rendah & dividen transparan' : '🛡️ Portofolio terkelola profesional oleh Manajer Investasi'}
          </div>
        </div>

        ${this.fundsSubTab === 'etf' ? `
          <!-- ETF Sector Filter Pills -->
          <div class="etf-sector-pills-bar" style="display: flex; gap: 0.45rem; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;">
            ${etfSectors.map(sec => `
              <button class="etf-sector-pill ${this.etfSectorFilter === sec ? 'active' : ''}" data-sector="${sec}" style="
                padding: 5px 13px;
                border-radius: 20px;
                font-size: 0.72rem;
                font-weight: 700;
                cursor: pointer;
                white-space: nowrap;
                border: 1px solid ${this.etfSectorFilter === sec ? 'rgba(99, 102, 241, 0.8)' : 'rgba(255,255,255,0.08)'};
                background: ${this.etfSectorFilter === sec ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.02)'};
                color: ${this.etfSectorFilter === sec ? '#818cf8' : 'var(--text-muted)'};
                transition: all 0.15s ease;
              ">
                ${sec === 'ALL' ? 'Semua Sektor' : sec}
              </button>
            `).join('')}
          </div>
        ` : ''}

        <!-- Product Cards Grid -->
        <div class="funds-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem;">
          ${displayedFunds.map(f => {
            const hasUnits = f.ownedUnits > 0;
            const up = f.dailyChange >= 0;
            const isSafest = f.id === 'pasar_uang';
            const isETF = f.category === 'etf';
            return `
              <div class="card" style="background: var(--bg-surface); border: 1.5px solid ${isSafest ? 'rgba(16, 185, 129, 0.5)' : (hasUnits ? (isETF ? 'rgba(99, 102, 241, 0.45)' : 'rgba(52, 211, 153, 0.4)') : 'var(--border-color)')}; border-radius: var(--radius-lg); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem; position: relative;">
                
                ${isSafest ? `
                  <div style="position: absolute; top: -10px; left: 16px; background: linear-gradient(90deg, #10b981, #059669); color: #000; font-weight: 800; font-size: 0.65rem; padding: 2px 10px; border-radius: 12px; letter-spacing: 0.02em; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);">
                    ⭐ PALING AMAN & STABIL • PEMULA & SETTLE
                  </div>
                ` : (isETF ? `
                  <div style="position: absolute; top: -10px; left: 16px; background: linear-gradient(90deg, #6366f1, #4f46e5); color: #fff; font-weight: 800; font-size: 0.65rem; padding: 2px 10px; border-radius: 12px; letter-spacing: 0.04em; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);">
                    ETF • ${f.ticker}
                  </div>
                ` : '')}
                
                <div>
                  <!-- Header: Icon, Name & Type -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; gap: 0.5rem; margin-top: 2px;">
                    <div style="display: flex; align-items: center; gap: 0.65rem;">
                      <span style="font-size: 1.6rem;">${f.icon}</span>
                      <div>
                        <div style="font-weight: 800; font-size: 0.95rem; color: #fff; line-height: 1.25;">${f.name}</div>
                        <div style="font-size: 0.7rem; color: var(--text-dim);">${f.manager} · <span style="color: ${isETF ? '#818cf8' : 'var(--text-muted)'}; font-weight: 600;">${f.type}</span></div>
                      </div>
                    </div>
                    <span style="font-size: 0.68rem; font-weight: 800; color: ${f.riskColor}; background: ${f.riskColor}22; border: 1px solid ${f.riskColor}44; padding: 2px 7px; border-radius: 6px; white-space: nowrap;">
                      ${f.risk}
                    </span>
                  </div>

                  <p style="font-size: 0.74rem; color: var(--text-muted); line-height: 1.4; margin: 0 0 0.85rem 0;">
                    ${f.desc}
                  </p>

                  <!-- Metrics: NAV/Price, 1D Change, 1Y Return -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 0.65rem 0.85rem; margin-bottom: 0.85rem;">
                    <div>
                      <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">
                        ${isETF ? 'Harga Bursa / Unit' : 'Nilai Aktiva Bersih (NAV)'}
                      </div>
                      <div style="font-size: 1.05rem; font-weight: 900; color: #fff;">
                        $ ${f.nav.toFixed(isETF ? 2 : 4)}
                        <span style="font-size: 0.72rem; font-weight: 700; color: ${up ? '#10b981' : '#ef4444'};">(${up ? '+' : ''}${f.dailyChange}%)</span>
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Imbal Hasil 1 Thn</div>
                      <div style="font-size: 1.05rem; font-weight: 900; color: #34d399;">
                        ${f.returnAnnual}% p.a.
                      </div>
                    </div>
                  </div>

                  ${isETF ? `
                    <!-- ETF Specific Tags: Expense Ratio & Dividend -->
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(99, 102, 241, 0.05); border: 1px dashed rgba(99, 102, 241, 0.25); border-radius: 6px; padding: 4px 8px; margin-bottom: 0.85rem; font-size: 0.7rem;">
                      <span style="color: var(--text-muted);">Biaya Pengelolaan: <strong style="color: #fff;">${f.expenseRatio || '0.10%'}</strong></span>
                      <span style="color: var(--text-muted);">Dividen Yield: <strong style="color: #34d399;">${f.dividendYield || '-'}</strong></span>
                    </div>
                  ` : ''}

                  <!-- Portfolio Holding Box -->
                  <div style="background: ${hasUnits ? (isETF ? 'rgba(99, 102, 241, 0.1)' : 'rgba(52, 211, 153, 0.08)') : 'rgba(255,255,255,0.02)'}; border: 1px solid ${hasUnits ? (isETF ? 'rgba(99, 102, 241, 0.3)' : 'rgba(52, 211, 153, 0.25)') : 'rgba(255,255,255,0.05)'}; border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.74rem;">
                    ${hasUnits ? `
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="color: var(--text-muted);">Kepemilikan:</span>
                        <strong style="color: #fff;">${f.ownedUnits.toLocaleString()} Lembar/Unit ($ ${financeManager.formatCurrency(f.currentValue, true)})</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted);">Floating P/L:</span>
                        <strong style="color: ${f.pnl >= 0 ? '#10b981' : '#ef4444'};">
                          ${f.pnl >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(f.pnl, true)} (${f.pnlPercent >= 0 ? '+' : ''}${f.pnlPercent.toFixed(2)}%)
                        </strong>
                      </div>
                    ` : `
                      <div style="color: var(--text-dim); text-align: center;">Belum memiliki ${isETF ? 'lembar ETF' : 'unit reksa dana'} ini.</div>
                    `}
                  </div>
                </div>

                <!-- Buy & Sell Buttons -->
                <div class="funds-card-actions" style="display: flex; gap: 0.5rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.85rem;">
                  <button class="btn btn-primary btn-buy-rd" data-id="${f.id}" style="flex: 1; font-weight: 800; font-size: 0.78rem; padding: 8px 0; justify-content: center; ${isETF ? 'background: linear-gradient(135deg, #6366f1, #4f46e5); border: none;' : ''}">
                    + Beli ${isETF ? 'ETF' : 'Unit'}
                  </button>
                  <button class="btn btn-secondary btn-sell-rd" data-id="${f.id}" ${hasUnits ? '' : 'disabled'} style="flex: 1; font-weight: 800; font-size: 0.78rem; padding: 8px 0; justify-content: center; ${hasUnits ? '' : 'opacity: 0.4; cursor: not-allowed;'}">
                    - Jual ${isETF ? 'ETF' : 'Unit'}
                  </button>
                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;

    this.bindEvents(container);
  }

  bindEvents(container) {
    if (!container) return;

    // Category switcher (Reksa Dana vs ETF)
    container.querySelectorAll('.funds-category-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        this.fundsSubTab = btn.dataset.category;
        this.render(container);
      });
    });

    // ETF Sector filters
    container.querySelectorAll('.etf-sector-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.etfSectorFilter = btn.dataset.sector;
        this.render(container);
      });
    });

    // Buy modal with comprehensive interactive suite
    container.querySelectorAll('.btn-buy-rd').forEach(btn => {
      btn.addEventListener('click', () => {
        const fundId = btn.dataset.id;
        const fund = mutualFundManager.getFund(fundId);
        if (!fund) return;
        const playerBal = gameState.getBalance();
        const isSafest = fund.id === 'pasar_uang';

        const modalHTML = `
          <div style="padding: 0.25rem 0;">
            <!-- Header Card: Identity, NAV & Safety Badge -->
            <div style="background: ${isSafest ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.25) 100%)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${isSafest ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255,255,255,0.08)'}; border-radius: var(--radius-md); padding: 0.9rem 1.1rem; margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span style="font-size: 2rem;">${fund.icon}</span>
                  <div>
                    <h3 style="font-size: 1.05rem; font-weight: 800; color: #fff; margin: 0 0 2px 0;">${fund.name}</h3>
                    <div style="font-size: 0.72rem; color: var(--text-dim);">${fund.manager} · ${fund.type}</div>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">NAV Terkini</div>
                  <div style="font-size: 1.05rem; font-weight: 900; color: #fff;">$${fund.nav.toFixed(4)}</div>
                </div>
              </div>

              ${isSafest ? `
                <div style="display: flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 7px 10px; margin-top: 0.75rem; font-size: 0.73rem; color: #10b981;">
                  <span style="font-size: 1.15rem; flex-shrink: 0;">🛡️</span>
                  <div>
                    <strong>Paling Aman & Stabil (Anti-Penurunan):</strong> Modal pokok terlindungi dari fluktuasi pasar saham dengan imbal hasil konsisten harian (~5.2% p.a.). Sangat cocok untuk pemula & dana pensiun / settle.
                  </div>
                </div>
              ` : `
                <div style="display: flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 8px; padding: 6px 10px; margin-top: 0.75rem; font-size: 0.72rem; color: var(--text-muted);">
                  <span>🎯</span>
                  <span><strong>Profil:</strong> ${fund.suitability || fund.desc}</span>
                </div>
              `}
            </div>

            <!-- Input Nominal & Saldo Kas Bar -->
            <div style="margin-bottom: 0.85rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">
                  Nominal Pembelian ($ USD)
                </label>
                <span style="font-size: 0.72rem; color: var(--text-dim);">
                  Saldo Kas: <strong style="color: #fff;">$ ${financeManager.formatCurrency(playerBal, true)}</strong>
                </span>
              </div>

              <div style="position: relative;">
                <span style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 1.15rem; font-weight: 800; color: var(--accent-primary);">$</span>
                <input type="number" id="input-rd-buy-amt" value="${Math.max(fund.minBuy, 1000)}" min="${fund.minBuy}" step="50" style="
                  width: 100%;
                  background: rgba(0, 0, 0, 0.35);
                  border: 1.5px solid var(--border-color);
                  border-radius: var(--radius-md);
                  padding: 10px 14px 10px 32px;
                  color: #fff;
                  font-weight: 800;
                  font-size: 1.25rem;
                  letter-spacing: -0.01em;
                  box-sizing: border-box;
                ">
              </div>

              <!-- Real-time Warning or Error Badge -->
              <div id="rd-buy-feedback" style="margin-top: 6px; font-size: 0.72rem; display: none;"></div>
            </div>

            <!-- Allocation Presets & Quick Nominal Increment Chips -->
            <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem;">
              <!-- Percent Presets -->
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn btn-secondary btn-sm btn-rd-preset-min" style="flex: 1; font-size: 0.68rem; padding: 5px 0; justify-content: center;">Min ($ ${fund.minBuy})</button>
                <button class="btn btn-secondary btn-sm btn-rd-pct" data-pct="0.25" style="flex: 1; font-size: 0.68rem; padding: 5px 0; justify-content: center;">25%</button>
                <button class="btn btn-secondary btn-sm btn-rd-pct" data-pct="0.50" style="flex: 1; font-size: 0.68rem; padding: 5px 0; justify-content: center;">50%</button>
                <button class="btn btn-secondary btn-sm btn-rd-pct" data-pct="0.75" style="flex: 1; font-size: 0.68rem; padding: 5px 0; justify-content: center;">75%</button>
                <button class="btn btn-secondary btn-sm btn-rd-preset-max" style="flex: 1; font-size: 0.68rem; padding: 5px 0; justify-content: center; font-weight: 800; color: #10b981;">Maks</button>
              </div>

              <!-- Quick Nominal Boost Pills -->
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn btn-secondary btn-sm btn-rd-add" data-add="250" style="flex: 1; font-size: 0.66rem; padding: 4px 0; justify-content: center; opacity: 0.85;">+$250</button>
                <button class="btn btn-secondary btn-sm btn-rd-add" data-add="500" style="flex: 1; font-size: 0.66rem; padding: 4px 0; justify-content: center; opacity: 0.85;">+$500</button>
                <button class="btn btn-secondary btn-sm btn-rd-add" data-add="1000" style="flex: 1; font-size: 0.66rem; padding: 4px 0; justify-content: center; opacity: 0.85;">+$1K</button>
                <button class="btn btn-secondary btn-sm btn-rd-add" data-add="5000" style="flex: 1; font-size: 0.66rem; padding: 4px 0; justify-content: center; opacity: 0.85;">+$5K</button>
              </div>
            </div>

            <!-- Live Return & Growth Simulation Box -->
            <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 0.85rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
                <span style="font-size: 0.7rem; font-weight: 800; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 4px;">
                  <span>📈</span> Proyeksi Hasil Investasi (${fund.returnAnnual}% p.a.)
                </span>
                <span style="font-size: 0.66rem; color: #10b981; font-weight: 700;">Bebas Biaya Admin (0% Fee)</span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.6rem;">
                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 6px; padding: 6px 10px;">
                  <div style="font-size: 0.63rem; color: var(--text-muted); font-weight: 600;">Estimasi Hasil 1 Bulan</div>
                  <div id="sim-return-1m" style="font-size: 0.95rem; font-weight: 800; color: #10b981;">+$ 0.00</div>
                </div>
                <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 6px; padding: 6px 10px;">
                  <div style="font-size: 0.63rem; color: var(--text-muted); font-weight: 600;">Estimasi Hasil 1 Tahun</div>
                  <div id="sim-return-1y" style="font-size: 0.95rem; font-weight: 800; color: #34d399;">+$ 0.00</div>
                </div>
              </div>

              <!-- Total Projected Value & Units Breakdown -->
              <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px dashed rgba(255, 255, 255, 0.08); font-size: 0.74rem;">
                <span style="color: var(--text-muted);">Proyeksi Total Nilai 1 Tahun:</span>
                <strong id="sim-total-1y" style="color: #fff; font-size: 0.95rem;">$ 0.00</strong>
              </div>
            </div>

            <!-- Transaction Summary: Units & Remaining Cash -->
            <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 0.65rem 0.9rem; margin-bottom: 0.85rem; font-size: 0.72rem; display: flex; flex-direction: column; gap: 3px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-dim);">Estimasi Unit Didapat:</span>
                <strong id="preview-rd-units" style="color: #fff;">0 Unit</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-dim);">Sisa Saldo Kas Utama:</span>
                <strong id="preview-rd-remaining" style="color: var(--text-muted);">$ ${financeManager.formatCurrency(playerBal, true)}</strong>
              </div>
            </div>

            <!-- Key Investment Advantages Checklist -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem 0.6rem; margin-bottom: 1.15rem; font-size: 0.68rem; color: var(--text-dim);">
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="color: #10b981; font-weight: 800;">✓</span> 100% Bebas Biaya Beli (0% Fee)
              </div>
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="color: #10b981; font-weight: 800;">✓</span> Likuid, bebas dicairkan kapan saja
              </div>
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="color: #10b981; font-weight: 800;">✓</span> Bunga harian otomatis terakumulasi
              </div>
              <div style="display: flex; align-items: center; gap: 5px;">
                <span style="color: #10b981; font-weight: 800;">✓</span> Dikelola manajer investasi profesional
              </div>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 0.75rem;">
              <button class="btn btn-secondary btn-cancel-rd-modal" style="flex: 1; font-weight: 700;">Batal</button>
              <button class="btn btn-primary" id="btn-confirm-rd-buy" style="flex: 1.5; font-weight: 800; background: #10b981; border-color: #10b981;">
                Beli Sekarang
              </button>
            </div>
          </div>
        `;

        ui.showModal({
          title: 'Investasi Reksa Dana',
          content: modalHTML
        });

        const inputAmt = document.getElementById('input-rd-buy-amt');
        const previewUnitsEl = document.getElementById('preview-rd-units');
        const previewRemainingEl = document.getElementById('preview-rd-remaining');
        const feedbackEl = document.getElementById('rd-buy-feedback');
        const confirmBtn = document.getElementById('btn-confirm-rd-buy');
        const simReturn1mEl = document.getElementById('sim-return-1m');
        const simReturn1yEl = document.getElementById('sim-return-1y');
        const simTotal1yEl = document.getElementById('sim-total-1y');

        const updateBuySimulation = () => {
          const val = parseFloat(inputAmt?.value) || 0;
          const u = fund.nav > 0 ? (val / fund.nav).toFixed(4) : '0';
          const annualRate = (fund.returnAnnual || 5.0) / 100;
          const return1y = val * annualRate;
          const return1m = val * (annualRate / 12);
          const total1y = val + return1y;
          const remaining = Math.max(0, playerBal - val);

          if (previewUnitsEl) {
            previewUnitsEl.textContent = `${parseFloat(u).toLocaleString()} Unit (@ NAV $${fund.nav.toFixed(4)})`;
          }
          if (previewRemainingEl) {
            previewRemainingEl.textContent = `$ ${financeManager.formatCurrency(remaining, true)}`;
          }
          if (simReturn1mEl) {
            simReturn1mEl.textContent = `+$ ${financeManager.formatCurrency(return1m, true)}`;
          }
          if (simReturn1yEl) {
            simReturn1yEl.textContent = `+$ ${financeManager.formatCurrency(return1y, true)} (+${fund.returnAnnual}%)`;
          }
          if (simTotal1yEl) {
            simTotal1yEl.textContent = `$ ${financeManager.formatCurrency(total1y, true)}`;
          }

          // Validation & feedback
          if (confirmBtn) {
            if (val < fund.minBuy) {
              if (feedbackEl) {
                feedbackEl.style.display = 'block';
                feedbackEl.style.color = '#f59e0b';
                feedbackEl.innerHTML = `⚠️ Minimal pembelian adalah $ ${financeManager.formatCurrency(fund.minBuy)}`;
              }
              confirmBtn.disabled = true;
              confirmBtn.style.opacity = '0.5';
              confirmBtn.textContent = `Minimal $ ${financeManager.formatCurrency(fund.minBuy)}`;
            } else if (val > playerBal) {
              if (feedbackEl) {
                feedbackEl.style.display = 'block';
                feedbackEl.style.color = '#ef4444';
                feedbackEl.innerHTML = `❌ Saldo kas utama Anda tidak mencukupi ($ ${financeManager.formatCurrency(playerBal, true)})`;
              }
              confirmBtn.disabled = true;
              confirmBtn.style.opacity = '0.5';
              confirmBtn.textContent = 'Saldo Tidak Cukup';
            } else {
              if (feedbackEl) {
                feedbackEl.style.display = 'none';
              }
              confirmBtn.disabled = false;
              confirmBtn.style.opacity = '1';
              confirmBtn.textContent = `Beli Sekarang ($ ${financeManager.formatCurrency(val, true)})`;
            }
          }
        };

        inputAmt?.addEventListener('input', updateBuySimulation);
        updateBuySimulation();

        // Preset minimum
        document.querySelector('.btn-rd-preset-min')?.addEventListener('click', () => {
          if (inputAmt) {
            inputAmt.value = fund.minBuy;
            updateBuySimulation();
          }
        });

        // Preset maximum
        document.querySelector('.btn-rd-preset-max')?.addEventListener('click', () => {
          if (inputAmt) {
            inputAmt.value = Math.max(fund.minBuy, Math.floor(playerBal));
            updateBuySimulation();
          }
        });

        // Preset percentages (25%, 50%, 75%)
        document.querySelectorAll('.btn-rd-pct').forEach(b => {
          b.addEventListener('click', () => {
            const pct = parseFloat(b.dataset.pct) || 0;
            const amt = Math.max(fund.minBuy, Math.floor(playerBal * pct));
            if (inputAmt) {
              inputAmt.value = amt;
              updateBuySimulation();
            }
          });
        });

        // Quick incremental additions (+$250, +$500, +$1K, +$5K)
        document.querySelectorAll('.btn-rd-add').forEach(b => {
          b.addEventListener('click', () => {
            const addVal = parseFloat(b.dataset.add) || 0;
            const currVal = parseFloat(inputAmt?.value) || 0;
            const targetVal = Math.min(Math.floor(playerBal), currVal + addVal);
            if (inputAmt) {
              inputAmt.value = targetVal;
              updateBuySimulation();
            }
          });
        });

        document.querySelectorAll('.btn-cancel-rd-modal').forEach(b => {
          b.addEventListener('click', () => ui.closeModal());
        });

        document.getElementById('btn-confirm-rd-buy')?.addEventListener('click', () => {
          const amt = parseFloat(inputAmt?.value) || 0;
          try {
            const res = mutualFundManager.buy(fundId, amt);
            ui.closeModal();
            ui.success(`Berhasil membeli ${res.unitsBought.toLocaleString()} unit ${res.fund.name}! Nilai investasi kini aktif bertumbuh.`, 'Pembelian Reksa Dana Sukses');
            this.onUpdate();
          } catch (err) {
            ui.error(err.message);
          }
        });
      });
    });

    // Sell modal
    container.querySelectorAll('.btn-sell-rd').forEach(btn => {
      btn.addEventListener('click', () => {
        const fundId = btn.dataset.id;
        const fund = mutualFundManager.getFund(fundId);
        if (!fund || fund.ownedUnits <= 0) return;

        const modalHTML = `
          <div style="padding: 0.5rem 0;">
            <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 1rem; background: rgba(255,255,255,0.03); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid rgba(255,255,255,0.06);">
              <span style="font-size: 1.8rem;">${fund.icon}</span>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; color: #fff; margin: 0;">Jual Unit: ${fund.name}</h3>
                <span style="font-size: 0.72rem; color: var(--text-dim);">NAV: $${fund.nav.toFixed(4)} · Kepemilikan: ${fund.ownedUnits.toLocaleString()} Unit ($ ${financeManager.formatCurrency(fund.currentValue, true)})</span>
              </div>
            </div>

            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.75rem; color: var(--text-muted); font-weight: 700; margin-bottom: 4px;">
                Jumlah Unit Penjualan
              </label>
              <input type="number" id="input-rd-sell-units" value="${fund.ownedUnits}" min="0.0001" max="${fund.ownedUnits}" step="any" style="
                width: 100%;
                background: rgba(255,255,255,0.05);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                padding: 10px 14px;
                color: #fff;
                font-weight: 800;
                font-size: 1.1rem;
              ">
              <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-dim); margin-top: 4px;">
                <span>Maks: ${fund.ownedUnits.toLocaleString()} Unit</span>
                <span id="preview-rd-cash" style="color: #10b981; font-weight: 700;">Estimasi Kas: $ 0</span>
              </div>
            </div>

            <div style="display: flex; gap: 0.4rem; margin-bottom: 1.25rem;">
              <button class="btn btn-secondary btn-sm btn-rd-sell-pct" data-pct="0.25" style="font-size: 0.7rem;">25%</button>
              <button class="btn btn-secondary btn-sm btn-rd-sell-pct" data-pct="0.5" style="font-size: 0.7rem;">50%</button>
              <button class="btn btn-secondary btn-sm btn-rd-sell-pct" data-pct="0.75" style="font-size: 0.7rem;">75%</button>
              <button class="btn btn-secondary btn-sm btn-rd-sell-pct" data-pct="1" style="font-size: 0.7rem;">100% (Semua)</button>
            </div>

            <div style="display: flex; gap: 0.75rem;">
              <button class="btn btn-secondary btn-cancel-rd-modal" style="flex: 1; font-weight: 700;">Batal</button>
              <button class="btn btn-danger" id="btn-confirm-rd-sell" style="flex: 1; font-weight: 800;">Jual & Cairkan ke Kas</button>
            </div>
          </div>
        `;

        ui.showModal({
          title: 'Jual Unit Reksa Dana',
          content: modalHTML
        });

        const inputUnits = document.getElementById('input-rd-sell-units');
        const previewCashEl = document.getElementById('preview-rd-cash');

        const updateSellPreview = () => {
          const u = parseFloat(inputUnits?.value) || 0;
          const cash = Math.floor(u * fund.nav);
          if (previewCashEl) previewCashEl.textContent = `Estimasi Kas: $ ${financeManager.formatCurrency(cash, true)}`;
        };

        inputUnits?.addEventListener('input', updateSellPreview);
        updateSellPreview();

        document.querySelectorAll('.btn-rd-sell-pct').forEach(b => {
          b.addEventListener('click', () => {
            const pct = parseFloat(b.dataset.pct);
            if (inputUnits) {
              inputUnits.value = +(fund.ownedUnits * pct).toFixed(4);
              updateSellPreview();
            }
          });
        });

        document.querySelectorAll('.btn-cancel-rd-modal').forEach(b => {
          b.addEventListener('click', () => ui.closeModal());
        });

        document.getElementById('btn-confirm-rd-sell')?.addEventListener('click', () => {
          const u = parseFloat(inputUnits?.value) || 0;
          try {
            const res = mutualFundManager.sell(fundId, u);
            ui.closeModal();
            ui.success(`Penjualan berhasil! Dana +$ ${financeManager.formatCurrency(res.payoutCash)} telah masuk ke kas utama.`, 'Penjualan Reksa Dana');
            this.onUpdate();
          } catch (err) {
            ui.error(err.message);
          }
        });
      });
    });
  }
}

export const mutualFundsSubView = new MutualFundsSubView();
export default mutualFundsSubView;

