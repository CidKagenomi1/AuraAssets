/**
 * IPOPanel.js - Handles Go Public (IPO) and Investor Relations for corporations.
 */

import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import businessManager from '../../business/BusinessManager.js';
import stockMarket from '../../trading/StockMarket.js';
import ui from '../../ui/UIManager.js';

const formatCompact = (num) => {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return new Intl.NumberFormat('en-US').format(Math.round(num));
};

export const IPOPanel = {
    render(biz) {
        const isPublic = biz.ipo && biz.ipo.active;

        if (isPublic) {
            return this.renderPublicConsole(biz);
        } else {
            return this.renderIPOPlanner(biz);
        }
    },

    renderIPOPlanner(biz) {
        const isEligibleValuation = biz.valuation >= 1000000;
        const isEligibleCash = biz.cash >= 20000;
        
        return `
            <div class="ipo-planner-wrapper">
                <div class="card" style="padding: 1.5rem; margin-bottom: 2rem;">
                    <h3 style="margin-top:0; font-size: 1.15rem; font-weight: 900; margin-bottom: 1.2rem; display:flex; align-items:center; gap:0.5rem; color: #818cf8;">
                        <span>🔔</span> Initial Public Offering (IPO) — Melantai di Bursa Wall Street
                    </h3>
                    <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.5rem;">
                        Go Public memungkinkan Anda mengalokasikan kepemilikan saham privat Anda ke pasar bursa publik Wall Street. Langkah ini akan menyuntik dana treasury raksasa ke dalam kas korporasi secara instan dari investor ritel/institusi global demi melakukan ekspansi skala luar biasa!
                    </p>

                    <!-- Eligibility Checklist -->
                    <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); padding: 1.2rem; border-radius: 12px; margin-bottom: 1.5rem;">
                        <h4 style="margin:0 0 10px 0; font-size:0.9rem; font-weight:800; text-transform:uppercase; color:var(--text-muted);">Persyaratan Emiten Melantai di Bursa</h4>
                        <div style="display:flex; flex-direction:column; gap:0.5rem; font-size:0.85rem;">
                            <div style="display:flex; justify-content:space-between;">
                                <span>1. Valuasi Korporasi Minimum ($ 1,000,000)</span>
                                <span style="font-weight:800; color:${isEligibleValuation ? '#10b981' : '#ef4444'};">
                                    ${isEligibleValuation ? '✓ LAYAK' : `✗ TIDAK LAYAK ($ ${financeManager.formatCurrency(biz.valuation)})`}
                                </span>
                            </div>
                            <div style="display:flex; justify-content:space-between;">
                                <span>2. Likuiditas Kas Perusahaan Minimum ($ 20,000)</span>
                                <span style="font-weight:800; color:${isEligibleCash ? '#10b981' : '#ef4444'};">
                                    ${isEligibleCash ? '✓ LAYAK' : `✗ TIDAK LAYAK ($ ${financeManager.formatCurrency(biz.cash)})`}
                                </span>
                            </div>
                        </div>
                    </div>

                    ${isEligibleValuation && isEligibleCash ? `
                        <!-- IPO Form Wizard -->
                        <div style="background: rgba(129, 140, 248, 0.04); border: 1px solid rgba(129, 140, 248, 0.15); padding: 1.5rem; border-radius: 12px;">
                            <h4 style="margin:0 0 1rem 0; font-size:1.05rem; font-weight:800; color:#fff;">Formulir Perencanaan Listing Bursa</h4>
                            
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.2rem;">
                                <div>
                                    <label style="font-size:0.75rem; color:var(--text-muted); font-weight:800; display:block; margin-bottom:6px;">KODE TICKER SAHAM EMITEN (3-5 HURUF)</label>
                                    <input type="text" id="ipo-ticker-input" placeholder="Misal: AURA, BIZ, CORP" maxlength="5"
                                        style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.3); color: #fff; font-size: 1.1rem; font-weight: 900; border-radius: 8px; outline: none; text-transform:uppercase;">
                                </div>
                                <div>
                                    <label style="font-size:0.75rem; color:var(--text-muted); font-weight:800; display:block; margin-bottom:6px;">PROPORSI SAHAM DIPO-KAN KE PUBLIK (%)</label>
                                    <div style="display:flex; align-items:center; gap:0.75rem;">
                                        <input type="range" id="ipo-percent-slider" min="10" max="49" value="25" style="flex:1; cursor:pointer;">
                                        <span id="ipo-percent-val" style="font-weight:900; font-size:1.1rem; color:#818cf8; min-width: 45px; text-align:right;">25%</span>
                                    </div>
                                    <span style="font-size:0.65rem; color:var(--text-dim); display:block; margin-top:2px;">Alokasi saham untuk investor publik di bursa efek.</span>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.2rem;">
                                <div>
                                    <label style="font-size:0.75rem; color:var(--text-muted); font-weight:800; display:block; margin-bottom:6px;">PROPORSI SAHAM UNTUK DEWAN DIREKSI (%)</label>
                                    <div style="display:flex; align-items:center; gap:0.75rem;">
                                        <input type="range" id="ipo-board-slider" min="0" max="40" value="37" style="flex:1; cursor:pointer;">
                                        <span id="ipo-board-val" style="font-weight:900; font-size:1.1rem; color:#6366f1; min-width: 45px; text-align:right;">37%</span>
                                    </div>
                                    <span style="font-size:0.65rem; color:var(--text-dim); display:block; margin-top:2px;">Alokasi saham untuk perwakilan direksi institusional.</span>
                                </div>
                                <div>
                                    <label style="font-size:0.75rem; color:var(--text-muted); font-weight:800; display:block; margin-bottom:6px;">PROPORSI SAHAM FOUNDER (PRIBADI ANDA)</label>
                                    <div style="display:flex; align-items:center; justify-content:space-between; padding: 6px 14px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; height:42px;">
                                        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">Kepemilikan Founder:</span>
                                        <span id="ipo-founder-val" style="font-weight:900; font-size:1.25rem; color:#10b981;">38%</span>
                                    </div>
                                    <span style="font-size:0.65rem; color:var(--text-dim); display:block; margin-top:2px;" id="ipo-founder-warning">Founder harus mempertahankan minimal 30% kepemilikan saham.</span>
                                </div>
                            </div>

                            <!-- Real-time Horizontal Stacked Progress Bar -->
                            <div style="margin-bottom: 1.5rem;">
                                <label style="font-size:0.72rem; color:var(--text-muted); font-weight:800; display:block; margin-bottom:6px; text-transform:uppercase;">Visualisasi Struktur Kepemilikan Baru</label>
                                <div style="display:flex; height:20px; border-radius:10px; overflow:hidden; background:rgba(255,255,255,0.05); border:1px solid var(--border-color);">
                                    <div id="bar-founder" style="background:#10b981; width:38%; display:flex; align-items:center; justify-content:center; color:#000; font-size:0.65rem; font-weight:900; transition: width 0.2s;">Founder (38%)</div>
                                    <div id="bar-board" style="background:#6366f1; width:37%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.65rem; font-weight:900; transition: width 0.2s;">Dewan (37%)</div>
                                    <div id="bar-public" style="background:#3b82f6; width:25%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.65rem; font-weight:900; transition: width 0.2s;">Publik (25%)</div>
                                </div>
                            </div>

                            <!-- Live Bank Estimates -->
                            <div style="background: rgba(0,0,0,0.2); padding: 1.2rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1.5rem; font-size:0.85rem;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                                    <span>Estimasi Jumlah Lembar Saham Beredar</span>
                                    <span style="font-weight:800; color:#fff;">1,000,000 Lembar Saham</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                                    <span>Estimasi Harga IPO Per Lembar</span>
                                    <span style="font-weight:800; color:#fbbf24;" id="ipo-estimate-price">$ ${(biz.valuation / 1000000).toFixed(2)}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                                    <span>Estimasi Pendanaan Segar Yang Diraih Treasury Perusahaan</span>
                                    <span style="font-weight:800; color:#10b981;" id="ipo-estimate-funding">$ ${financeManager.formatCurrency(biz.valuation * 0.25)}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; border-top:1px dashed rgba(255,255,255,0.06); padding-top:0.4rem; margin-top:0.4rem;">
                                    <span>Estimasi Payout Likuidasi Bersih Founder (Pribadi Anda)</span>
                                    <span style="font-weight:800; color:#10b981;" id="ipo-estimate-liquidation">$ 0</span>
                                </div>
                            </div>

                            <button class="btn btn-primary" id="btn-submit-ipo" style="width:100%; padding:14px; font-weight:900; font-size:1.05rem; letter-spacing:0.05em; background:#818cf8; color:#fff; border:none;">
                                🔔 RESMIKAN GO PUBLIC (LAUNCH IPO CEREMONY)
                            </button>
                        </div>
                    ` : `
                        <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.15); padding: 1.2rem; border-radius: 12px; text-align: center;">
                            <span style="font-size: 1.5rem; display:block; margin-bottom:6px;">⚠️</span>
                            <span style="font-weight:800; color:#ef4444; font-size:0.9rem;">ENTITAS PERUSAHAAN BELUM LAYAK GO PUBLIC</span>
                            <p class="text-muted" style="font-size:0.8rem; margin: 4px 0 0 0;">Harap pompa profitabilitas korporasi, tingkatkan teknologi, rekrut COO/CTO eksekutif, atau dirikan anak perusahaan holding untuk meningkatkan valuasi korporasi s.d $ 1,000,000!</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    renderPublicConsole(biz) {
        const ipo = biz.ipo;
        const stockData = stockMarket.getStock(ipo.ticker) || { price: ipo.sharePrice || 1.0, change: 0.0 };

        const ticker = ipo.ticker;
        const stocks = gameState.get('stocks') || {};
        const playerShares = stocks[ticker] ? stocks[ticker].shares : (ipo.totalShares - ipo.publicShares - (ipo.board || []).reduce((sum, m) => sum + (m.sharesPercent || 0), 0) * (ipo.totalShares / 100));
        const playerValue = playerShares * stockData.price;
        const publicValue = ipo.publicShares * stockData.price;
        const founderPercent = ((playerShares / ipo.totalShares) * 100).toFixed(1);

        return `
            <div class="public-console-wrapper">
                <div style="display:grid; grid-template-columns: 2fr 1.2fr; gap:1.5rem; margin-bottom:1.5rem;">
                    <!-- Market Info -->
                    <div class="card" style="padding:1.5rem;">
                        <h3 style="margin-top:0; font-size: 1.15rem; font-weight: 900; margin-bottom: 1.2rem; display:flex; align-items:center; gap:0.5rem; color: #10b981;">
                            <span>📈</span> Investor Relations Console [NYSE: ${ipo.ticker}]
                        </h3>
                        
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:1rem; margin-bottom: 1.5rem;">
                            <div style="background:rgba(255,255,255,0.02); padding: 10px 14px; border-radius:8px; border:1px solid var(--border-color);">
                                <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block; margin-bottom:2px;">Live Share Price</span>
                                <span id="live-stock-price" style="font-size:1.6rem; font-weight:900; color:#fbbf24;">$ ${stockData.price.toFixed(2)}</span>
                            </div>
                            <div style="background:rgba(255,255,255,0.02); padding: 10px 14px; border-radius:8px; border:1px solid var(--border-color);">
                                <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block; margin-bottom:2px;">24h Trend / Change</span>
                                <span id="live-stock-change" style="font-size:1.6rem; font-weight:900; color:${stockData.change >= 0 ? '#10b981' : '#ef4444'};">
                                    ${stockData.change >= 0 ? '+' : ''}${stockData.change.toFixed(2)}%
                                </span>
                            </div>
                            <div style="background:rgba(255,255,255,0.02); padding: 10px 14px; border-radius:8px; border:1px solid var(--border-color);">
                                <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; display:block; margin-bottom:2px;">Market Capitalization</span>
                                <span id="live-stock-mcap" style="font-size:1.6rem; font-weight:900; color:#fff;">$ ${formatCompact(stockData.price * ipo.totalShares)}</span>
                            </div>
                        </div>

                        <!-- Shares Ledger -->
                        <div style="background:rgba(0,0,0,0.1); border:1px solid var(--border-color); padding: 1rem; border-radius:10px; font-size:0.85rem;">
                            <h4 style="margin:0 0 10px 0; font-size:0.85rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Struktur Permodalan Saham Korporat</h4>
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                                <span>Kepemilikan Founder (Pribadi Anda)</span>
                                <span id="live-stock-founder-value" style="font-weight:800; color:#fff;">${playerShares.toLocaleString()} Lembar (${founderPercent}% Equity) | Valuasi: $ ${financeManager.formatCurrency(playerValue)}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between;">
                                <span>Saham Publik (NYSE Exchange)</span>
                                <span id="live-stock-public-value" style="font-weight:800; color:#818cf8;">${ipo.publicShares.toLocaleString()} Lembar (${ipo.publicSharePercent}% Equity) | Valuasi: $ ${financeManager.formatCurrency(publicValue)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Dividend & Divestment (Penny Stock) Actions -->
                    <div style="display:flex; flex-direction:column; gap:1.5rem;">
                        <!-- Dividend Actions -->
                        <div class="card" style="padding:1.5rem; display:flex; flex-direction:column; justify-content:space-between; background: rgba(255,255,255,0.015);">
                            <div>
                                <h3 style="margin-top:0; font-size: 1.15rem; font-weight: 900; margin-bottom: 0.75rem;">💸 Pembagian Dividen Publik</h3>
                                <p class="text-muted" style="font-size: 0.8rem; line-height: 1.4; margin-bottom: 1rem;">
                                    Bagikan sebagian keuntungan tunai di kas treasury kepada pemegang saham (publik & Anda sendiri). Deviden dipotong dari kas treasury korporasi.
                                </p>
                                
                                <div style="background: rgba(0,0,0,0.1); border: 1px solid var(--border-color); padding: 10px; border-radius:8px; margin-bottom:1rem;">
                                    <label style="font-size: 0.75rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Dividen Per Lembar Saham ($)</label>
                                    <input type="number" step="0.05" id="dividend-payout-input" placeholder="Misal: 0.50, 1.00"
                                        style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.95rem; font-weight: 700; border-radius: 6px; outline: none;">
                                </div>
                            </div>
                            <button class="btn btn-primary btn-sm" id="btn-declare-dividend" style="width:100%; font-weight:800;">Declare & Share Dividend</button>
                        </div>

                        <!-- Divestment Actions (Penny Stock) -->
                        <div class="card" style="padding:1.5rem; display:flex; flex-direction:column; justify-content:space-between; background: rgba(255,255,255,0.015); border: 1px solid ${parseFloat(founderPercent) < 30 ? '#ef4444' : 'var(--border-color)'};">
                            <div>
                                <h3 style="margin-top:0; font-size: 1.15rem; font-weight: 900; color: ${parseFloat(founderPercent) < 30 ? '#ef4444' : '#fff'};">
                                    ${parseFloat(founderPercent) < 30 ? '⚠️ Spekulatif (Penny Stock)' : '🛡️ Emiten Blue Chip'}
                                </h3>
                                <p class="text-muted" style="font-size: 0.8rem; line-height: 1.4; margin-bottom: 1rem;">
                                    ${parseFloat(founderPercent) < 30 
                                        ? 'Status emiten terdegradasi menjadi Penny Stock karena kepemilikan Founder < 30%! Volatilitas harga saham menjadi sangat spekulatif.' 
                                        : 'Divestasi/lepas kepemilikan saham Founder Anda ke publik untuk meraup modal pribadi tunai secara instan.'}
                                </p>
                                
                                <div style="background: rgba(0,0,0,0.1); border: 1px solid var(--border-color); padding: 10px; border-radius:8px; margin-bottom:1rem;">
                                    <label style="font-size: 0.75rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Jumlah Lembar Dilepas</label>
                                    <input type="text" id="divest-shares-input" placeholder="Misal: 50,000"
                                        style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.95rem; font-weight: 700; border-radius: 6px; outline: none;">
                                    <span style="font-size: 0.65rem; color: var(--text-dim); margin-top: 4px; display:block;">
                                        Maksimal lepas: ${playerShares.toLocaleString()} Lembar
                                    </span>
                                </div>
                            </div>
                            <button class="btn btn-warning btn-sm" id="btn-divest-shares" style="width:100%; font-weight:800;">Jual Saham Founder ke Publik</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        const slider = container.querySelector('#ipo-percent-slider');
        const valSpan = container.querySelector('#ipo-percent-val');
        
        const boardSlider = container.querySelector('#ipo-board-slider');
        const boardValSpan = container.querySelector('#ipo-board-val');
        
        const founderValSpan = container.querySelector('#ipo-founder-val');
        const founderWarning = container.querySelector('#ipo-founder-warning');
        
        const barFounder = container.querySelector('#bar-founder');
        const barBoard = container.querySelector('#bar-board');
        const barPublic = container.querySelector('#bar-public');
        
        const estimatePrice = container.querySelector('#ipo-estimate-price');
        const estimateFunding = container.querySelector('#ipo-estimate-funding');
        const estimateLiquidation = container.querySelector('#ipo-estimate-liquidation');
        
        const btnSubmit = container.querySelector('#btn-submit-ipo');

        const updateAllEstimates = (e) => {
            if (!slider || !boardSlider) return;
            let publicPct = parseInt(slider.value);
            let boardPct = parseInt(boardSlider.value);

            if (e && e.target === slider) {
                if (publicPct + boardPct > 70) {
                    boardPct = 70 - publicPct;
                    boardSlider.value = boardPct;
                }
            } else if (e && e.target === boardSlider) {
                if (publicPct + boardPct > 70) {
                    publicPct = 70 - boardPct;
                    slider.value = publicPct;
                }
            } else {
                if (publicPct + boardPct > 70) {
                    boardPct = 70 - publicPct;
                    boardSlider.value = boardPct;
                }
            }

            const founderPct = 100 - publicPct - boardPct;

            if (valSpan) valSpan.textContent = `${publicPct}%`;
            if (boardValSpan) boardValSpan.textContent = `${boardPct}%`;
            if (founderValSpan) {
                founderValSpan.textContent = `${founderPct}%`;
                if (founderPct < 30) {
                    founderValSpan.style.color = '#ef4444';
                    if (founderWarning) {
                        founderWarning.textContent = "⚠️ Saham Founder di bawah 30%! Anda akan kehilangan kendali perusahaan dan tidak bisa meluncurkan IPO!";
                        founderWarning.style.color = '#ef4444';
                    }
                    if (btnSubmit) {
                        btnSubmit.disabled = true;
                        btnSubmit.style.opacity = '0.5';
                        btnSubmit.style.cursor = 'not-allowed';
                    }
                } else {
                    founderValSpan.style.color = '#10b981';
                    if (founderWarning) {
                        founderWarning.textContent = "Founder mempertahankan hak kendali utama perusahaan (>30% saham).";
                        founderWarning.style.color = 'var(--text-dim)';
                    }
                    if (btnSubmit) {
                        btnSubmit.disabled = false;
                        btnSubmit.style.opacity = '1';
                        btnSubmit.style.cursor = 'pointer';
                    }
                }
            }

            if (barFounder) {
                barFounder.style.width = `${founderPct}%`;
                barFounder.textContent = `Founder (${founderPct}%)`;
                barFounder.style.display = founderPct > 0 ? 'flex' : 'none';
            }
            if (barBoard) {
                barBoard.style.width = `${boardPct}%`;
                barBoard.textContent = `Dewan (${boardPct}%)`;
                barBoard.style.display = boardPct > 0 ? 'flex' : 'none';
            }
            if (barPublic) {
                barPublic.style.width = `${publicPct}%`;
                barPublic.textContent = `Publik (${publicPct}%)`;
                barPublic.style.display = publicPct > 0 ? 'flex' : 'none';
            }

            const unitPrice = biz.valuation / 1000000;
            if (estimatePrice) estimatePrice.textContent = `$ ${unitPrice.toFixed(2)}`;

            const funding = biz.valuation * (publicPct / 100);
            if (estimateFunding) estimateFunding.textContent = `$ ${financeManager.formatCurrency(funding)}`;

            const playerShares = 1000000 * (founderPct / 100);
            const playerValue = playerShares * unitPrice;
            const tax = playerValue * 0.15;
            const liquidationPayout = playerValue - tax;
            if (estimateLiquidation) {
                estimateLiquidation.textContent = `$ ${financeManager.formatCurrency(liquidationPayout)}`;
            }
        };

        if (slider) slider.addEventListener('input', (e) => updateAllEstimates(e));
        if (boardSlider) boardSlider.addEventListener('input', (e) => updateAllEstimates(e));
        
        // Initial run
        updateAllEstimates();

        if (btnSubmit) {
            btnSubmit.addEventListener('click', () => {
                const tickerInput = container.querySelector('#ipo-ticker-input');
                const ticker = tickerInput.value.trim().toUpperCase();
                const percent = parseInt(slider.value);
                const boardPercent = parseInt(boardSlider.value);

                if (!ticker || ticker.length < 3) {
                    ui.error('Kode ticker emiten saham harus berukuran 3 hingga 5 huruf!', '⚠️ Kode Ticker Tidak Valid');
                    return;
                }

                const founderPct = 100 - percent - boardPercent;
                if (founderPct < 30) {
                    ui.error('Founder harus mempertahankan minimal 30% kepemilikan saham!', '⚠️ Kepemilikan Kurang');
                    return;
                }

                // Launch Simulation screen on parent Page
                parentPage.ipoTickerTmp = ticker;
                parentPage.ipoPercentTmp = percent;
                parentPage.ipoBoardTmp = boardPercent;
                parentPage.ipoSimulating = true;
                parentPage.render();
            });
        }

        const btnDeclare = container.querySelector('#btn-declare-dividend');
        if (btnDeclare) {
            btnDeclare.addEventListener('click', () => {
                const payoutInput = container.querySelector('#dividend-payout-input');
                const payout = parseFloat(payoutInput.value);

                if (isNaN(payout) || payout <= 0) {
                    ui.error('Harap masukkan nominal payout dividen yang valid!', '⚠️ Payout Deviden Error');
                    return;
                }

                const totalDividendCost = payout * biz.ipo.totalShares;
                if (biz.cash < totalDividendCost) {
                    ui.error(`Kas treasury perusahaan tidak cukup ($ ${financeManager.formatCurrency(biz.cash)}) untuk membagi dividen sebesar $ ${financeManager.formatCurrency(totalDividendCost)}!`, '⚠️ Likuiditas Kas Kurang');
                    return;
                }

                try {
                    // Pay out dividends to CEO personally
                    const ticker = biz.ipo.ticker;
                    const stocks = gameState.get('stocks') || {};
                    const playerShares = stocks[ticker] ? stocks[ticker].shares : (biz.ipo.totalShares - biz.ipo.publicShares - (biz.ipo.board || []).reduce((sum, m) => sum + (m.sharesPercent || 0), 0) * (biz.ipo.totalShares / 100));
                    const ceoPayout = payout * playerShares;
                    
                    gameState.update('business', b => ({
                        ...b,
                        cash: b.cash - totalDividendCost
                    }));

                    financeManager.addIncome(ceoPayout, 'Dividen', `CEO payout from ${biz.name} (${biz.ipo.ticker})`);
                    
                    ui.success(`Dividen sebesar $ ${payout.toFixed(2)} per lembar saham berhasil dibagikan! Kas Treasury terpotong $ ${financeManager.formatCurrency(totalDividendCost)}, Anda menerima $ ${financeManager.formatCurrency(ceoPayout)} tunai personally.`, '💸 Dividen Declared');
                    payoutInput.value = '';
                    parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Divest Shares (Penny Stock conversion)
        const divestInput = container.querySelector('#divest-shares-input');
        if (divestInput) {
            ui.setupNumericInput(divestInput, {
                isDecimal: false,
                showZeroAppend: false,
                showMax: false
            });
        }

        const btnDivest = container.querySelector('#btn-divest-shares');
        if (btnDivest) {
            btnDivest.addEventListener('click', async () => {
                const ticker = biz.ipo.ticker;
                const stocks = gameState.get('stocks') || {};
                const playerShares = stocks[ticker] ? stocks[ticker].shares : 0;
                
                const amtShares = divestInput.getNumericValue ? divestInput.getNumericValue() : parseInt(divestInput.value.replace(/,/g, ''));
                
                if (isNaN(amtShares) || amtShares <= 0) {
                    ui.error('Harap isi jumlah lembar saham divestasi yang valid!');
                    return;
                }
                if (amtShares > playerShares) {
                    ui.error('Jumlah lembar saham divestasi melebihi jumlah saham Founder yang Anda miliki!');
                    return;
                }

                const stockData = stockMarket.getStock(ticker) || { price: biz.ipo.sharePrice || 1.0 };
                const grossPayout = amtShares * stockData.price;
                const tax = grossPayout * 0.15;
                const netPayout = grossPayout - tax;

                const willBecomePennyStock = ((playerShares - amtShares) / biz.ipo.totalShares * 100) < 30;

                const confirmed = await ui.confirm({
                    title: 'Lepas Saham Founder ke Publik?',
                    message: `Anda akan menjual <strong>${amtShares.toLocaleString()} Lembar</strong> saham ke publik seharga <strong>$ ${financeManager.formatCurrency(grossPayout)}</strong>.<br>` +
                             `Setelah dipotong pajak 15% ($ ${financeManager.formatCurrency(tax)}), Anda akan menerima dana pribadi senilai <strong>$ ${financeManager.formatCurrency(netPayout)}</strong>.<br>` +
                             (willBecomePennyStock ? `<strong style="color:#ef4444;">Peringatan: Saham Founder Anda akan turun di bawah 30% sehingga emiten ini diklasifikasikan sebagai Penny Stock spekulatif!</strong>` : ''),
                    confirmText: 'Ya, Divestasi Saham'
                });

                if (confirmed) {
                    try {
                        // Deduct from player portfolio
                        stocks[ticker].shares -= amtShares;
                        if (stocks[ticker].shares <= 0) {
                            delete stocks[ticker];
                        } else {
                            stocks[ticker].totalInvested = stocks[ticker].shares * stocks[ticker].avgBuyPrice;
                        }
                        gameState.set('stocks', stocks);

                        // Add to public shares
                        biz.ipo.publicShares += amtShares;
                        biz.ipo.publicSharePercent = (biz.ipo.publicShares / biz.ipo.totalShares) * 100;
                        gameState.update('business', b => ({ ...b, ipo: biz.ipo }));

                        // Payout cash to player personally
                        financeManager.addIncome(netPayout, 'Divestasi Saham', `Divestment of ${amtShares} shares of ${ticker}`);

                        ui.success(`Divestasi sukses! Kepemilikan Anda berkurang dan Anda menerima $ ${financeManager.formatCurrency(netPayout)} personally.`, '📈 Divestasi Sukses');
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }
    },

    renderIPOSimulator(biz, ticker, percent, parentPage) {
        return `
            <div style="padding: 3rem 1.5rem; max-width:700px; margin: 0 auto; width:100%; text-align:center; min-height: 80vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <div style="width: 100%; max-width: 500px; background: rgba(129, 140, 248, 0.05); border: 2px solid #818cf8; border-radius: 20px; padding: 3rem 2rem; position:relative; overflow:hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.7);">
                    
                    <div style="font-size:4rem; margin-bottom:1.5rem; animation: pulse 1.5s infinite;">🔔</div>
                    
                    <h2 style="margin:0 0 8px 0; font-family:serif; font-size: 1.8rem; font-weight:400; color:#fff; letter-spacing:0.05em;">NYSE IPO MATCHING ENGINE</h2>
                    <div style="font-size:0.75rem; color:#818cf8; letter-spacing:0.3em; font-weight:800; text-transform:uppercase; margin-bottom:2rem;">LISTING EMITEN [ ${ticker} ]</div>
                    
                    <!-- Sim Matcher -->
                    <div id="ipo-sim-log" style="background:#000; border:1px solid var(--border-color); padding: 1.2rem; border-radius:10px; height: 180px; font-family: monospace; font-size:0.8rem; overflow-y:hidden; text-align:left; color:#10b981; display:flex; flex-direction:column; gap:6px; margin-bottom: 2rem;">
                        <div>[SYSTEM] Initializing NYSE transaction logs...</div>
                    </div>

                    <!-- Progress Loader -->
                    <div style="width:100%; background:rgba(255,255,255,0.05); height:8px; border-radius:10px; overflow:hidden; margin-bottom:1rem;">
                        <div id="ipo-progress-bar" style="background: linear-gradient(90deg, #818cf8, #3b82f6); width:0%; height:100%; transition: width 0.3s ease;"></div>
                    </div>
                    
                    <div class="text-muted" style="font-size:0.75rem; font-weight:700;" id="ipo-ceremony-status">Mengisi Buku Antrian Pembelian Saham Ritel...</div>
                </div>
            </div>
        `;
    },

    simulateIPOMatchingProcess(biz, ticker, percent, parentPage) {
        const simLog = document.getElementById('ipo-sim-log');
        const progressBar = document.getElementById('ipo-progress-bar');
        const statusText = document.getElementById('ipo-ceremony-status');

        const logs = [
            `[NYSE] Order book matching for ticker [${ticker}] opened.`,
            `[BID] institutional order: 120,000 shares placed by Goldman Sachs...`,
            `[BID] Retail subscription rate reaches 125% (+25,000 orders)...`,
            `[MATCH] Matching market pricing order blocks at $ ${(biz.valuation / 1000000).toFixed(2)}`,
            `[BID] institutional order: 180,000 shares placed by BlackRock...`,
            `[NYSE] Order book filled. Subscription rate: 242% (OVER-SUBSCRIBED)`,
            `[NYSE] Rings opening bell at trading floor! 🔔`,
            `[SUCCESS] Emiten [${ticker}] officially traded. Capital injection successfully completed!`
        ];

        let index = 0;
        const tick = () => {
            if (index < logs.length) {
                if (simLog) {
                    const el = document.createElement('div');
                    el.textContent = logs[index];
                    if (logs[index].includes('SUCCESS') || logs[index].includes('Rings')) {
                        el.style.color = '#fbbf24';
                        el.style.fontWeight = 'bold';
                    }
                    simLog.appendChild(el);
                    simLog.scrollTop = simLog.scrollHeight;
                }

                if (progressBar) {
                    const progressVal = ((index + 1) / logs.length) * 100;
                    progressBar.style.width = `${progressVal}%`;
                }

                if (statusText) {
                    if (index === 3) {
                        statusText.textContent = "Sinkronisasi Harga Patokan Bursa...";
                    } else if (index === 6) {
                        statusText.textContent = "MENGETUK LONCENG BURSA WAL STREET! 🔔";
                    }
                }

                index++;
                setTimeout(tick, 1000);
            } else {
                // Finalize IPO State
                try {
                    businessManager.launchIPO(ticker, percent, parentPage.ipoBoardTmp || 37);
                } catch (e) {
                    ui.error(e.message);
                }

                parentPage.ipoSimulating = false;
                parentPage.activeTab = 'ipo'; // Navigate to Investor relations
                parentPage.render();
            }
        };

        setTimeout(tick, 500);
    },

    updateLiveStockData(container, biz, stock) {
        const priceEl = container.querySelector('#live-stock-price');
        const changeEl = container.querySelector('#live-stock-change');
        const mcapEl = container.querySelector('#live-stock-mcap');
        const founderEl = container.querySelector('#live-stock-founder-value');
        const publicEl = container.querySelector('#live-stock-public-value');

        if (priceEl) priceEl.textContent = `$ ${stock.price.toFixed(2)}`;
        if (changeEl) {
            changeEl.textContent = `${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%`;
            changeEl.style.color = stock.change >= 0 ? '#10b981' : '#ef4444';
        }
        if (mcapEl) mcapEl.textContent = `$ ${formatCompact(stock.price * biz.ipo.totalShares)}`;
        
        const ticker = biz.ipo.ticker;
        const stocks = gameState.get('stocks') || {};
        const playerShares = stocks[ticker] ? stocks[ticker].shares : (biz.ipo.totalShares - biz.ipo.publicShares - (biz.ipo.board || []).reduce((sum, m) => sum + (m.sharesPercent || 0), 0) * (biz.ipo.totalShares / 100));
        const playerValue = playerShares * stock.price;
        const publicValue = biz.ipo.publicShares * stock.price;
        const founderPercent = ((playerShares / biz.ipo.totalShares) * 100).toFixed(1);

        if (founderEl) {
            founderEl.textContent = `${playerShares.toLocaleString()} Lembar (${founderPercent}% Equity) | Valuasi: $ ${financeManager.formatCurrency(playerValue)}`;
        }
        if (publicEl) {
            publicEl.textContent = `${biz.ipo.publicShares.toLocaleString()} Lembar (${biz.ipo.publicSharePercent}% Equity) | Valuasi: $ ${financeManager.formatCurrency(publicValue)}`;
        }
    }
};

export default IPOPanel;
