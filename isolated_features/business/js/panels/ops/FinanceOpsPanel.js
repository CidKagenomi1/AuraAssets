/**
 * FinanceOpsPanel.js - Interactive Banking, Corporate Insurance, & Holding Company Dashboard
 * Provides premium UI sliders to manage interest margins (NIM), finance large syndications,
 * invest corporate cash into blue-chip stocks, and recruit specialized financial talent.
 */

import gameState from '../../../core/GameState.js';
import financeManager from '../../../finance/FinanceManager.js';
import businessManager from '../../BusinessManager.js';
import stockMarket from '../../../trading/StockMarket.js';
import ui from '../../../ui/UIManager.js';

export const FinanceOpsPanel = {
    render(biz) {
        const finance = businessManager.getFinanceState();
        if (!finance) return `<p class="text-muted" style="padding: 2rem; text-align: center;">Memuat data divisi jasa keuangan...</p>`;

        const rates = finance.rates;
        const bank = finance.bank;
        const insurance = finance.insurance;
        const portfolio = finance.portfolio;
        const employees = finance.employees;
        const candidates = finance.candidates;
        const products = finance.products;
        const project = finance.project;

        // Reserve requirements calculations
        const requiredReserves = Math.round(bank.depositsPool * (bank.reserveRatio / 100));
        const actualCash = biz.cash || 0;
        const reserveHealth = actualCash >= requiredReserves;

        const totalWages = employees.reduce((sum, e) => sum + e.salary, 0);
        const recurringRevenue = products.reduce((sum, p) => sum + (p.monthlyRevenue || 0), 0);

        // NIM spread
        const nimSpread = (rates.lendingRate - rates.depositRate).toFixed(2);

        // Render active project debt syndicate
        let projectHtml = '';
        if (project) {
            if (project.status === 'funding') {
                const subPct = Math.round((project.subscribedAmount / project.syndicateShare) * 100) || 0;
                
                let subsLog = '';
                if (project.subscribers && project.subscribers.length > 0) {
                    const recentSubs = project.subscribers.slice(-3).reverse();
                    recentSubs.forEach(s => {
                        subsLog += `
                            <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--text-muted); border-bottom:1px solid rgba(255,255,255,0.03); padding:4px 0;">
                                <span>🏢 ${s.name}</span>
                                <span style="color:#10b981; font-weight:700;">+$ ${financeManager.formatCurrency(s.amount)}</span>
                            </div>
                        `;
                    });
                } else {
                    subsLog = `<div style="text-align:center; font-size:0.7rem; color:var(--text-muted); padding:8px 0;">Menunggu konsorsium AI mengambil sisa kuota...</div>`;
                }

                projectHtml = `
                    <div style="background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.75rem; align-items:center;">
                            <div>
                                <span style="font-size:0.65rem; background:#fbbf24; color:#000; font-weight:800; padding:2px 8px; border-radius:4px; text-transform:uppercase;">PENAWARAN KUOTA OBLIGASI</span>
                                <h4 style="margin: 4px 0 0 0; font-size:1.1rem; font-weight:850; color:#fff;">${project.name}</h4>
                            </div>
                            <span style="font-weight:900; font-size:1.2rem; color:#fbbf24;">${subPct}% Terisi</span>
                        </div>
                        
                        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.5rem; background:rgba(0,0,0,0.15); padding:10px; border-radius:8px; margin-bottom:1rem; font-size:0.75rem;">
                            <div>
                                <div style="color:var(--text-muted); font-size:0.6rem; text-transform:uppercase;">Kupon Obligasi</div>
                                <div style="font-weight:800; color:#fff;">${project.couponRate}% p.a</div>
                            </div>
                            <div>
                                <div style="color:var(--text-muted); font-size:0.6rem; text-transform:uppercase;">Tenor Obligasi</div>
                                <div style="font-weight:800; color:#fff;">${project.tenor} Bulan</div>
                            </div>
                            <div>
                                <div style="color:var(--text-muted); font-size:0.6rem; text-transform:uppercase;">Investasi Anda</div>
                                <div style="font-weight:800; color:#10b981;">$ ${financeManager.formatCurrency(project.playerShare)}</div>
                            </div>
                        </div>

                        <div style="width:100%; height:8px; background:rgba(255,255,255,0.05); border-radius:10px; overflow:hidden; margin-bottom:1rem; border: 1px solid var(--border-color);">
                            <div style="width:${subPct}%; height:100%; background:linear-gradient(90deg, #fbbf24, #f59e0b); border-radius:10px; transition: width 0.4s ease;"></div>
                        </div>

                        <div style="font-size:0.75rem; color:#fff; font-weight:700; margin-bottom:0.5rem;">Aktivitas Penawaran Sindikasi AI:</div>
                        <div style="background:rgba(0,0,0,0.2); padding:8px; border-radius:8px; margin-bottom:1rem;">
                            ${subsLog}
                        </div>
                        
                        <p class="text-muted" style="font-size:0.75rem; margin:0; line-height:1.4;">
                            Sisa kuota sindikasi sebesar <strong>$ ${financeManager.formatCurrency(project.syndicateShare - project.subscribedAmount)}</strong> sedang ditawarkan di pasar obligasi global. Konsorsium investor AI akan mengambil kuota berdasarkan persentase tingkat kupon bunga obligasi yang Anda tentukan!
                        </p>
                    </div>
                `;
            } else {
                projectHtml = `
                    <div style="background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.75rem; align-items:center;">
                            <div>
                                <span style="font-size:0.65rem; background:#10b981; color:#fff; font-weight:800; padding:2px 8px; border-radius:4px; text-transform:uppercase;">KONSTRUKSI / AUDIT AKTIF</span>
                                <h4 style="margin: 4px 0 0 0; font-size:1.1rem; font-weight:850; color:#fff;">${project.name}</h4>
                            </div>
                            <span style="font-weight:900; font-size:1.2rem; color:#10b981;">${project.progress}%</span>
                        </div>
                        <div style="width:100%; height:8px; background:rgba(255,255,255,0.05); border-radius:10px; overflow:hidden; margin-bottom:1rem; border: 1px solid var(--border-color);">
                            <div style="width:${project.progress}%; height:100%; background:linear-gradient(90deg, #10b981, #34d399); border-radius:10px; transition: width 0.4s ease;"></div>
                        </div>
                        <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem;">
                            <button class="btn btn-sm" id="btn-accelerate-deal" style="font-weight: 850; font-size: 0.75rem; background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 6px 14px; color: #fff; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);">
                                ⚡ AKSES AUDIT CEPAT ($8,000)
                            </button>
                            <span class="text-muted" style="font-size: 0.7rem; font-weight:700;">+25% Progress Instan</span>
                        </div>
                        <p class="text-muted" style="font-size:0.75rem; margin:0;">
                            Proyek telah didanai penuh oleh konsorsium sindikasi! Tim Credit Analyst Anda sedang mengevaluasi dan mengaudit progres konstruksi setiap bulan hingga obligasi dirilis.
                        </p>
                    </div>
                `;
            }
        } else {
            projectHtml = `
                <div style="background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
                    <h4 style="margin:0 0 1rem 0; font-size:0.95rem; font-weight:800; color:#fff;">💼 Sindikasi Pembiayaan Obligasi & Proyek Kustom</h4>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
                        <div>
                            <label style="font-size: 0.7rem; color: var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Nama Proyek Sindikasi</label>
                            <input type="text" id="custom-deal-name" placeholder="misal: PLTS Terapung, Tol Trans-Sumatera..." 
                                style="width:100%; padding:8px 12px; border:1px solid var(--border-color); background:rgba(0,0,0,0.2); color:#fff; border-radius:6px; font-size:0.85rem; font-weight:700; outline:none;">
                        </div>
                        <div>
                            <label style="font-size: 0.7rem; color: var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Total Nilai Pembiayaan</label>
                            <div style="position:relative;">
                                <span style="position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:0.85rem; font-weight:700; color:var(--text-muted);">$</span>
                                <input type="text" id="custom-deal-total" placeholder="500,000"
                                    style="width:100%; padding:8px 8px 8px 24px; border:1px solid var(--border-color); background:rgba(0,0,0,0.2); color:#fff; font-size:0.85rem; font-weight:800; border-radius:6px; outline:none;">
                            </div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:1rem;">
                        <div>
                            <label style="font-size: 0.7rem; color: var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Tenor Obligasi (Bulan)</label>
                            <select id="custom-deal-tenor" style="width:100%; padding:8px 12px; border:1px solid var(--border-color); background:rgba(0,0,0,0.2); color:#fff; border-radius:6px; font-size:0.85rem; font-weight:700; outline:none; cursor:pointer;">
                                <option value="12">12 Bulan (Tenor Cepat)</option>
                                <option value="24" selected>24 Bulan (Standard)</option>
                                <option value="36">36 Bulan (Menengah)</option>
                                <option value="60">60 Bulan (Tenor Panjang - Yield Tinggi)</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 0.7rem; color: var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Investasi Anda (Treasury Kas)</label>
                            <div style="position:relative;">
                                <span style="position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:0.85rem; font-weight:700; color:var(--text-muted);">$</span>
                                <input type="text" id="custom-deal-player-share" placeholder="100,000"
                                    style="width:100%; padding:8px 8px 8px 24px; border:1px solid var(--border-color); background:rgba(0,0,0,0.2); color:#fff; font-size:0.85rem; font-weight:800; border-radius:6px; outline:none;">
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom:1.25rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <label style="font-size: 0.7rem; color: var(--text-muted); font-weight:700;">Tingkat Kupon Bunga Obligasi (Coupon Rate)</label>
                            <span id="custom-coupon-val" style="font-size:0.85rem; font-weight:800; color:#fbbf24;">8.0%</span>
                        </div>
                        <input type="range" id="custom-coupon-slider" min="3.0" max="18.0" step="0.5" value="8.0" style="width:100%; accent-color:#fbbf24; cursor:pointer;">
                        <span class="text-muted" style="font-size:0.6rem; display:block; margin-top:2px;">Kupon bunga obligasi tinggi menarik konsorsium AI mengambil sisa kuota dana lebih cepat.</span>
                    </div>

                    <button class="btn btn-primary btn-block" id="btn-publish-custom-deal" style="font-weight:850; background:linear-gradient(135deg, #fbbf24, #d97706); border:none; color:#000; box-shadow: 0 4px 12px rgba(251, 191, 36, 0.25);">
                        Terbitkan Kuota Sindikasi Obligasi
                    </button>
                </div>
            `;
        }

        // Render holding company stocks portfolio
        const corpStocks = portfolio.stocks || {};
        const blueChipValuation = portfolio.valuation || 0;

        let portfolioRows = '';
        let hasHoldings = false;
        
        Object.entries(corpStocks).forEach(([symbol, data]) => {
            const stock = stockMarket.getStock(symbol);
            if (stock && data.shares > 0) {
                hasHoldings = true;
                const currentValue = stock.price * data.shares;
                const costBasis = data.avgBuyPrice * data.shares;
                const profit = currentValue - costBasis;
                const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;
                
                portfolioRows += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                        <td style="padding: 0.75rem 0.5rem; font-weight: 800; color: #fff;">${symbol}</td>
                        <td style="padding: 0.75rem 0.5rem; color: var(--text-muted); font-size: 0.75rem;">${stock.name}</td>
                        <td style="padding: 0.75rem 0.5rem; font-family: monospace;">${data.shares.toLocaleString()}</td>
                        <td style="padding: 0.75rem 0.5rem; font-family: monospace;">$ ${data.avgBuyPrice.toLocaleString()}</td>
                        <td style="padding: 0.75rem 0.5rem; font-family: monospace;">$ ${stock.price.toLocaleString()}</td>
                        <td style="padding: 0.75rem 0.5rem; font-family: monospace; font-weight: 700; color: #fff;">$ ${currentValue.toLocaleString()}</td>
                        <td style="padding: 0.75rem 0.5rem; text-align: right; font-weight: 800; color: ${profit >= 0 ? '#10b981' : '#ef4444'};">
                            ${profit >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%<br>
                            <span style="font-size: 0.65rem; font-weight: 500;">${profit >= 0 ? '+' : ''}$ ${profit.toLocaleString()}</span>
                        </td>
                        <td style="padding: 0.75rem 0.5rem; text-align: right;">
                            <button class="btn btn-xs btn-secondary btn-quick-select-corp" data-symbol="${symbol}" style="font-size: 0.65rem; padding: 2px 6px; font-weight: 800;">Trade</button>
                        </td>
                    </tr>
                `;
            }
        });

        if (!hasHoldings) {
            portfolioRows = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-dim); padding: 2.25rem 0.5rem; font-size: 0.75rem;">
                        📊 Holding company belum memiliki investasi saham. Cari saham melalui kotak pencarian di atas untuk membeli!
                    </td>
                </tr>
            `;
        }

        return `
            <!-- BANKING & MONETARY STATUS BOARD -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
                <div style="background: rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:12px; padding:1rem; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <span class="text-muted" style="font-size:0.7rem; font-weight:700; text-transform:uppercase;">Dana Simpanan Nasabah (AUM)</span>
                        <div style="font-size:1.4rem; font-weight:900; color:#3b82f6; margin-top:4px;">$ ${financeManager.formatCurrency(bank.depositsPool)}</div>
                    </div>
                    <span class="text-muted" style="font-size:0.65rem; margin-top:8px;">Bunga Simpanan: <strong style="color:#fff;">${rates.depositRate}% p.a</strong></span>
                </div>

                <div style="background: rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:12px; padding:1rem; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <span class="text-muted" style="font-size:0.7rem; font-weight:700; text-transform:uppercase;">Kredit Aktif Disalurkan</span>
                        <div style="font-size:1.4rem; font-weight:900; color:#10b981; margin-top:4px;">$ ${financeManager.formatCurrency(bank.activeLoans)}</div>
                    </div>
                    <span class="text-muted" style="font-size:0.65rem; margin-top:8px;">Bunga Kredit: <strong style="color:#fff;">${rates.lendingRate}% p.a</strong> (NPL: ${bank.nplRate}%)</span>
                </div>

                <div style="background: rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:12px; padding:1rem; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <span class="text-muted" style="font-size:0.7rem; font-weight:700; text-transform:uppercase;">Net Interest Margin (NIM)</span>
                        <div style="font-size:1.4rem; font-weight:900; color:#fbbf24; margin-top:4px;">+ ${nimSpread}%</div>
                    </div>
                    <span class="text-muted" style="font-size:0.65rem; margin-top:8px;">Selisih Keuntungan Perbankan</span>
                </div>

                <div style="background: rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:12px; padding:1rem; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <span class="text-muted" style="font-size:0.7rem; font-weight:700; text-transform:uppercase;">Giro Wajib Minimum (Reserve)</span>
                        <div style="font-size:1.4rem; font-weight:900; color:${reserveHealth ? '#10b981' : '#ef4444'}; margin-top:4px;">
                            ${reserveHealth ? '✓ SECURE' : '🚨 RISK'}
                        </div>
                    </div>
                    <span class="text-muted" style="font-size:0.65rem; margin-top:8px;">Batas Giro Wajib: <strong style="color:#fff;">$ ${financeManager.formatCurrency(requiredReserves)}</strong></span>
                </div>
            </div>

            <div class="dashboard-grid" style="margin-bottom:1.5rem;">
                
                <!-- 1. SLIDER KEBIJAKAN MONETER (INTEREST RATES CALIBRATION) -->
                <div class="col-span-6 panel-card" style="padding: 1.25rem;">
                    <h3 style="font-size: 0.95rem; font-weight:800; margin:0 0 1rem 0; color:#fff;">⚖️ Kalibrasi Suku Bunga & Asuransi</h3>
                    <div style="display:flex; flex-direction:column; gap:1.2rem;">
                        <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                <label style="font-size: 0.75rem; color: var(--text-muted); font-weight:700;">Suku Bunga Tabungan / Deposito p.a</label>
                                <span style="font-size:0.85rem; font-weight:850; color:#3b82f6;" id="deposit-rate-val">${rates.depositRate}%</span>
                            </div>
                            <input type="range" id="deposit-rate-slider" min="0.5" max="15.0" step="0.1" value="${rates.depositRate}" style="width:100%; cursor:pointer;">
                            <span class="text-muted" style="font-size:0.65rem;">Makin tinggi menarik lebih banyak tabungan ritel nasabah, tapi menjadi beban pengeluaran bunga bank.</span>
                        </div>

                        <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                <label style="font-size: 0.75rem; color: var(--text-muted); font-weight:700;">Suku Bunga Penyaluran Kredit / Loan p.a</label>
                                <span style="font-size:0.85rem; font-weight:850; color:#10b981;" id="lending-rate-val">${rates.lendingRate}%</span>
                            </div>
                            <input type="range" id="lending-rate-slider" min="2.0" max="35.0" step="0.1" value="${rates.lendingRate}" style="width:100%; cursor:pointer;">
                            <span class="text-muted" style="font-size:0.65rem;">Makin tinggi meningkatkan laba pinjaman, tapi menurunkan demand peminjam baru dan menaikkan risiko gagal bayar (NPL).</span>
                        </div>

                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Premi & Penjaminan Asuransi Korporat</label>
                            <select id="premium-rate-select" style="width:100%; padding:8px 12px; border:1px solid var(--border-color); background:rgba(0,0,0,0.2); color:#fff; border-radius:6px; font-size:0.85rem; font-weight:700; outline:none; cursor:pointer;">
                                <option value="low" ${rates.premiumRate === 'low' ? 'selected' : ''}>Low Premium ($6/mo per polis) - Pertumbuhan Polis Eksponensial</option>
                                <option value="medium" ${rates.premiumRate === 'medium' ? 'selected' : ''}>Medium Premium ($12/mo per polis) - Seimbang</option>
                                <option value="high" ${rates.premiumRate === 'high' ? 'selected' : ''}>High Premium ($20/mo per polis) - Margin Tebal, Pertumbuhan Lambat</option>
                            </select>
                            <span class="text-muted" style="font-size:0.65rem; display:block; margin-top:4px;">Asuransi memiliki total <strong style="color:#fff;">${insurance.activePolicies} polis aktif</strong>. Bersiaplah menghadapi default klaim tak terduga!</span>
                        </div>

                        <button class="btn btn-secondary btn-block" id="btn-save-rates" style="font-weight:850;">
                            Terapkan Kebijakan Suku Bunga & Asuransi
                        </button>
                    </div>
                </div>

                <!-- 2. INSURANCE CLAIMS & RISK REPORT -->
                <div class="col-span-6 panel-card" style="padding: 1.25rem; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <h3 style="font-size: 0.95rem; font-weight:800; margin:0 0 1rem 0; color:#fff;">📋 Laporan Klaim Asuransi & Risiko</h3>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom:1rem;">
                            <div style="background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.8rem;">
                                <span class="text-muted" style="font-size:0.65rem; font-weight:700; text-transform:uppercase; display:block;">Polis Aktif</span>
                                <div style="font-size:1.1rem; font-weight:850; color:#fff; margin-top:2px;">${insurance.activePolicies} Polis</div>
                            </div>
                            <div style="background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.8rem;">
                                <span class="text-muted" style="font-size:0.65rem; font-weight:700; text-transform:uppercase; display:block;">Pemasukan Premi</span>
                                <div style="font-size:1.1rem; font-weight:850; color:#10b981; margin-top:2px;">+$ ${financeManager.formatCurrency(insurance.activePolicies * (rates.premiumRate === 'low' ? 6 : rates.premiumRate === 'high' ? 20 : 12))}/bln</div>
                            </div>
                        </div>
                        <p class="text-muted" style="font-size:0.75rem; line-height:1.4; margin-bottom:1rem;">
                            Seluruh urusan penyetoran modal pribadi (Suntik Kas) dan penarikan kas (Withdrawal) dilakukan secara terpusat melalui **Laporan Manajemen Kas Treasury** pada tab **Dashboard (Overview)** utama Anda.
                        </p>
                    </div>

                    <div>
                        <div style="border-top:1px solid var(--border-color); padding-top:1rem; margin-top:1rem;">
                            <span class="text-muted" style="font-size:0.7rem; font-weight:700; text-transform:uppercase; display:block; margin-bottom:6px;">Status Klaim Asuransi Terakhir</span>
                            <div style="font-size:0.9rem; font-weight:700; color: ${insurance.lastClaimPayout > 0 ? '#ef4444' : '#10b981'}">
                                ${insurance.lastClaimPayout > 0 ? `🚨 Membayar Payout Klaim seharga $ ${financeManager.formatCurrency(insurance.lastClaimPayout)}` : '🟢 Tidak ada klaim ganti rugi bulan ini.'}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <!-- PROJECT DEBT SYNDICATIONS -->
            <div style="margin-bottom:1.5rem;">
                <h3 style="font-size: 1.1rem; font-weight:900; margin:0 0 1rem 0; color:#fff; display:flex; align-items:center; gap:0.5rem;"><span>🤝</span> Pembiayaan Sindikasi Obligasi & Proyek Raksasa</h3>
                ${projectHtml}
            </div>

            <!-- HOLDING PORTFOLIO INTEGRATED WITH STOCK MARKET -->
            <div class="panel-card" style="padding: 1.25rem; margin-bottom:1.5rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem; flex-wrap:wrap; gap:0.5rem;">
                    <div>
                        <h3 style="font-size: 0.95rem; font-weight:800; margin:0; color:#fff;">💎 Investasi & Holding Saham Korporasi (Treasury Portfolio)</h3>
                        <p class="text-muted" style="font-size:0.75rem; margin:2px 0 0 0;">Kelola kas treasury perusahaan dengan menginvestasikannya langsung ke pasar saham global untuk memperkuat neraca aset dan meraih dividen bulanan.</p>
                    </div>
                    <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.2); padding: 6px 14px; border-radius: 8px; text-align:right;">
                        <span style="font-size:0.6rem; color:#fbbf24; font-weight:800; text-transform:uppercase; display:block;">Nilai Portofolio Holding</span>
                        <span style="font-size:1.15rem; font-weight:900; color:#fbbf24;">$ ${financeManager.formatCurrency(blueChipValuation)}</span>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-bottom:1.5rem; flex-wrap:wrap;">
                    <!-- Search & Stock Selector -->
                    <div style="position: relative;">
                        <label style="font-size: 0.75rem; color: var(--text-muted); font-weight:700; display:block; margin-bottom:6px;">Cari Saham Pasar Global</label>
                        <div style="display: flex; gap: 0.5rem; position: relative;">
                            <input type="text" id="corp-stock-search" placeholder="Cari Kode Ticker / Nama Saham (misal: AAPL, NVDA)..." 
                                style="width:100%; padding:10px 12px; border:1px solid var(--border-color); background:rgba(0,0,0,0.3); color:#fff; border-radius:8px; font-size:0.85rem; font-weight:700; outline:none;" autocomplete="off">
                        </div>
                        
                        <!-- Suggestions Dropdown -->
                        <div id="corp-search-suggestions" style="position: absolute; left: 0; right: 0; top: 100%; background: #18181b; border: 1px solid var(--border-color); border-radius: 8px; max-height: 200px; overflow-y: auto; z-index: 100; display: none; margin-top: 4px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                        </div>
                    </div>

                    <!-- Trade Actions Panel -->
                    <div id="selected-corp-stock-panel" style="background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="text-align: center; color: var(--text-dim); font-size: 0.75rem; padding: 1.5rem 0;">
                            🔍 Pilih saham di sebelah kiri untuk memulai transaksi
                        </div>
                    </div>
                </div>

                <!-- Portfolio Holding Table -->
                <div style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
                    <h4 style="margin: 0 0 0.75rem 0; font-size: 0.85rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 0.35rem;">
                        <span>📊</span> Kepemilikan Aset Saham Korporasi (Holding Portfolio)
                    </h4>
                    <div style="overflow-x: auto; width: 100%;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.75rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                                    <th style="padding: 0.5rem; font-weight: 800;">Ticker</th>
                                    <th style="padding: 0.5rem; font-weight: 800;">Nama Perusahaan</th>
                                    <th style="padding: 0.5rem; font-weight: 800;">Kepemilikan</th>
                                    <th style="padding: 0.5rem; font-weight: 800;">Harga Beli (Rata2)</th>
                                    <th style="padding: 0.5rem; font-weight: 800;">Harga Sekarang</th>
                                    <th style="padding: 0.5rem; font-weight: 800;">Nilai Pasar</th>
                                    <th style="padding: 0.5rem; text-align: right; font-weight: 800;">Profit / Loss</th>
                                    <th style="padding: 0.5rem; text-align: right; font-weight: 800;">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${portfolioRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>
                .search-suggestion-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                }
            </style>

            <!-- COMPLETED DEALS LIST -->
            <div style="margin-bottom:1.5rem;">
                <h3 style="font-size: 0.95rem; font-weight:800; margin:0 0 0.75rem 0; color:#fff;">📈 Daftar Deal Sindikasi Rampung</h3>
                <div style="display:flex; flex-direction:column; gap:0.5rem;">
                    ${products.length === 0 ? `
                        <p class="text-muted" style="text-align:center; padding:1.5rem; background:rgba(255,255,255,0.01); border:1px dashed var(--border-color); border-radius:8px; font-size:0.8rem; margin:0;">Belum ada deal pembiayaan yang dituntaskan.</p>
                    ` : products.map(p => `
                        <div style="background:rgba(255,255,255,0.015); border:1px solid var(--border-color); border-radius:8px; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <h5 style="margin:0; font-size:0.9rem; font-weight:800; color:#fff;">${p.name}</h5>
                                <span class="text-muted" style="font-size:0.7rem;">Sektor: ${p.type === 'startup_debt' ? 'Venture Debt Startup' : p.type === 'green_infra' ? 'Infrastruktur Hijau' : p.type === 'bluechip_syndicate' ? 'Obligasi Sindikasi Bluechip' : `Kustom (Tenor: ${p.monthsRemaining}/${p.totalTenor} bln)`} | Kualitas Deal: ★${p.quality}</span>
                            </div>
                            <div style="color:#10b981; font-weight:850; font-size:0.95rem;">+$ ${financeManager.formatCurrency(p.monthlyRevenue)}/bln</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- STAFF HR & MANAGEMENT -->
            <div class="dashboard-grid">
                
                <!-- 1. STAFF TERSEDIA DI REKRUT -->
                <div class="col-span-7 panel-card" style="padding: 1.25rem;">
                    <h3 style="font-size: 0.95rem; font-weight:800; margin:0 0 1rem 0; color:#fff; display:flex; align-items:center; justify-content:space-between;">
                        <span>👔 Kandidat Rekrutmen Keuangan</span>
                        <span style="font-size:0.7rem; background:#3b82f6; color:#fff; font-weight:800; padding:2px 8px; border-radius:4px;">DIPERBARUI BULANAN</span>
                    </h3>
                    <div style="display:flex; flex-direction:column; gap:0.75rem;">
                        ${candidates.length === 0 ? `
                            <p class="text-muted" style="text-align:center; padding:1rem; font-size:0.8rem; margin:0;">Tidak ada kandidat bulan ini.</p>
                        ` : candidates.map(c => `
                            <div style="background: rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:8px; padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                                <div>
                                    <h5 style="margin:0; font-size:0.85rem; font-weight:800; color:#fff;">${c.name}</h5>
                                    <div style="display:flex; gap:0.5rem; font-size:0.7rem; color:var(--text-muted); margin-top:2px; flex-wrap:wrap;">
                                        <span>Peran: <strong style="color:#fff;">${c.role}</strong></span>
                                        <span>Skill: <strong style="color:#fbbf24;">${c.skill}</strong></span>
                                        <span>Speed: <strong style="color:#3b82f6;">${c.speed}x</strong></span>
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; gap:0.75rem;">
                                    <div style="text-align:right;">
                                        <div style="font-size:0.85rem; font-weight:850; color:#fff;">$ ${financeManager.formatCurrency(c.salary)}</div>
                                        <span class="text-muted" style="font-size:0.6rem;">Gaji Bulanan</span>
                                    </div>
                                    <button class="btn btn-primary btn-sm btn-hire-fin" data-id="${c.id}" style="font-weight:850; padding:6px 12px; background:linear-gradient(135deg, #3b82f6, #2563eb); border:none;">
                                        Rekrut Staf
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- 2. STAF AKTIF DI PEKERJAKAN -->
                <div class="col-span-5 panel-card" style="padding: 1.25rem;">
                    <h3 style="font-size: 0.95rem; font-weight:800; margin:0 0 1rem 0; color:#fff; display:flex; align-items:center; justify-content:space-between;">
                        <span>👥 Tim Kerja Aktif (${employees.length} Orang)</span>
                        <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">Gaji total: $ ${financeManager.formatCurrency(totalWages)}/bln</span>
                    </h3>
                    <div style="display:flex; flex-direction:column; gap:0.75rem;">
                        ${employees.map(e => `
                            <div style="background: rgba(255,255,255,0.015); border:1px solid var(--border-color); border-radius:8px; padding:0.75rem; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <h5 style="margin:0; font-size:0.8rem; font-weight:800; color:#fff;">${e.name}</h5>
                                    <div style="display:flex; gap:0.5rem; font-size:0.65rem; color:var(--text-muted); margin-top:2px;">
                                        <span>${e.role}</span>
                                        <span>Skill: ${e.skill}</span>
                                        <span>Speed: ${e.speed}x</span>
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; gap:0.5rem;">
                                    <span style="font-size:0.75rem; font-weight:750; color:#fff;">$ ${financeManager.formatCurrency(e.salary)}</span>
                                    ${e.id === 'fin_init' ? '' : `
                                        <button class="btn btn-icon btn-fire-fin" data-id="${e.id}" title="Pecat Karyawan" style="padding:4px 8px; font-size:0.7rem; border-radius:4px; border:1px solid rgba(239, 68, 68, 0.3); background:none; color:#ef4444; cursor:pointer;">❌</button>
                                    `}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Format Stock trade input with commas
        const stockInput = container.querySelector('#bluechip-trade-shares');
        if (stockInput) {
            ui.setupNumericInput(stockInput);
        }

        // Range slider value indicators
        const depSlider = container.querySelector('#deposit-rate-slider');
        const depVal = container.querySelector('#deposit-rate-val');
        if (depSlider && depVal) {
            depSlider.addEventListener('input', () => {
                depVal.textContent = parseFloat(depSlider.value).toFixed(1) + '%';
            });
        }

        const lendSlider = container.querySelector('#lending-rate-slider');
        const lendVal = container.querySelector('#lending-rate-val');
        if (lendSlider && lendVal) {
            lendSlider.addEventListener('input', () => {
                lendVal.textContent = parseFloat(lendSlider.value).toFixed(1) + '%';
            });
        }

        // Save Interest & Premium Rates
        const btnSaveRates = container.querySelector('#btn-save-rates');
        if (btnSaveRates) {
            btnSaveRates.addEventListener('click', () => {
                const depositRate = parseFloat(depSlider.value);
                const lendingRate = parseFloat(lendSlider.value);
                const premiumSelect = container.querySelector('#premium-rate-select');
                const premiumRate = premiumSelect ? premiumSelect.value : 'medium';

                try {
                    businessManager.adjustRates(depositRate, lendingRate, premiumRate);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }



        // Custom Deal Sliders & Numeric Formatting
        const customTotalInput = container.querySelector('#custom-deal-total');
        if (customTotalInput) {
            ui.setupNumericInput(customTotalInput);
        }

        const customPlayerShareInput = container.querySelector('#custom-deal-player-share');
        if (customPlayerShareInput) {
            ui.setupNumericInput(customPlayerShareInput);
        }

        const customCouponSlider = container.querySelector('#custom-coupon-slider');
        const customCouponVal = container.querySelector('#custom-coupon-val');
        if (customCouponSlider && customCouponVal) {
            customCouponSlider.addEventListener('input', () => {
                customCouponVal.textContent = parseFloat(customCouponSlider.value).toFixed(1) + '%';
            });
        }

        const btnPublishCustomDeal = container.querySelector('#btn-publish-custom-deal');
        if (btnPublishCustomDeal) {
            btnPublishCustomDeal.addEventListener('click', () => {
                const nameInput = container.querySelector('#custom-deal-name');
                const tenorSelect = container.querySelector('#custom-deal-tenor');
                if (!nameInput || !customTotalInput || !tenorSelect || !customPlayerShareInput || !customCouponSlider) return;

                const name = nameInput.value.trim();
                const totalValue = customTotalInput.getNumericValue ? customTotalInput.getNumericValue() : parseFloat(customTotalInput.value.replace(/,/g, ''));
                const playerShare = customPlayerShareInput.getNumericValue ? customPlayerShareInput.getNumericValue() : parseFloat(customPlayerShareInput.value.replace(/,/g, ''));
                const tenor = parseInt(tenorSelect.value, 10);
                const couponRate = parseFloat(customCouponSlider.value);

                if (!name) {
                    ui.error('Harap beri nama proyek obligasi baru Anda!');
                    return;
                }
                if (isNaN(totalValue) || totalValue <= 0) {
                    ui.error('Harap masukkan total nilai pembiayaan yang valid!');
                    return;
                }
                if (isNaN(playerShare) || playerShare <= 0) {
                    ui.error('Harap masukkan jumlah investasi Anda yang valid!');
                    return;
                }
                if (playerShare > totalValue) {
                    ui.error('Komitmen investasi Anda tidak boleh melampaui total nilai pembiayaan proyek!');
                    return;
                }

                try {
                    businessManager.startCustomCorporateDeal(name, totalValue, couponRate, tenor, playerShare);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Accelerate Corporate Financing Deal
        const btnAccelerateDeal = container.querySelector('#btn-accelerate-deal');
        if (btnAccelerateDeal) {
            btnAccelerateDeal.addEventListener('click', () => {
                try {
                    businessManager.accelerateDeal();
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Integrated Stock Market Search & Trading bindings
        const searchInput = container.querySelector('#corp-stock-search');
        const suggestionsBox = container.querySelector('#corp-search-suggestions');
        const selectedPanel = container.querySelector('#selected-corp-stock-panel');

        let selectedSymbol = null;

        const updateSelectedPanel = (symbol) => {
            selectedSymbol = symbol;
            if (!symbol) {
                selectedPanel.innerHTML = `
                    <div style="text-align: center; color: var(--text-dim); font-size: 0.75rem; padding: 1.5rem 0;">
                        🔍 Pilih saham di sebelah kiri untuk memulai transaksi
                    </div>
                `;
                return;
            }

            const stock = stockMarket.getStock(symbol);
            if (!stock) return;

            const financeState = businessManager.getFinanceState();
            const portfolioState = financeState ? (financeState.portfolio || {}) : {};
            const stocksState = portfolioState.stocks || {};
            const holding = stocksState[symbol] || { shares: 0, avgBuyPrice: 0 };
            const limit5Percent = Math.round((stock.sharesOutstanding || 1000000000) * 0.05);

            selectedPanel.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
                    <div>
                        <div style="font-weight: 900; color: #fff; font-size: 0.95rem;">${stock.symbol} - ${stock.name}</div>
                        <div style="font-size: 0.65rem; color: var(--text-muted);">Sektor: ${stock.sector} | Saham Beredar: ${stock.sharesOutstanding.toLocaleString()}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 850; color: #fff; font-size: 1rem;">$ ${stock.price.toLocaleString()}</div>
                        <span style="font-size: 0.7rem; font-weight: 700; color: ${stock.change >= 0 ? '#10b981' : '#ef4444'};">
                            ${stock.change >= 0 ? '▲' : '▼'} ${Math.abs(stock.change).toFixed(2)}%
                        </span>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); background: rgba(0,0,0,0.15); padding: 6px 10px; border-radius: 6px;">
                    <span>Holding: <strong>${holding.shares.toLocaleString()} Lembar</strong> (Avg: $ ${holding.avgBuyPrice.toLocaleString()})</span>
                    <span>Batas Maks Holding (5%): <strong style="color: #fbbf24;">${limit5Percent.toLocaleString()} Lembar</strong></span>
                </div>

                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <div style="position: relative; flex: 1;">
                        <input type="number" id="corp-trade-shares" placeholder="Jumlah lembar..." min="1"
                            style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.2); color: #fff; border-radius: 6px; font-size: 0.8rem; font-weight: 700; outline: none;">
                    </div>
                    <button class="btn btn-xs btn-secondary btn-set-max-corp-buy" style="font-size:0.65rem; padding: 8px 10px; font-weight: 800;">MAX BUY</button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <button class="btn btn-primary btn-sm" id="btn-corp-buy-stock" style="font-weight: 850; background: #3b82f6; border: none; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.15);">BELI</button>
                    <button class="btn btn-danger btn-sm" id="btn-corp-sell-stock" ${holding.shares === 0 ? 'disabled' : ''} style="font-weight: 850; border: none;">JUAL</button>
                </div>
            `;

            // Bind Max Buy
            selectedPanel.querySelector('.btn-set-max-corp-buy').addEventListener('click', () => {
                const price = stock.price;
                const maxBuyByCash = Math.floor(biz.cash / price);
                const maxBuyBySharesLimit = Math.max(0, limit5Percent - holding.shares);
                const finalMax = Math.min(maxBuyByCash, maxBuyBySharesLimit);
                
                selectedPanel.querySelector('#corp-trade-shares').value = finalMax;
            });

            // Bind Buy Action
            selectedPanel.querySelector('#btn-corp-buy-stock').addEventListener('click', () => {
                const inputShares = selectedPanel.querySelector('#corp-trade-shares');
                const sharesCount = parseInt(inputShares.value, 10);
                if (isNaN(sharesCount) || sharesCount <= 0) {
                    ui.error('Harap isi jumlah lembar saham pembelian yang valid!');
                    return;
                }
                try {
                    businessManager.buyCorporateStock(symbol, sharesCount);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });

            // Bind Sell Action
            selectedPanel.querySelector('#btn-corp-sell-stock').addEventListener('click', () => {
                const inputShares = selectedPanel.querySelector('#corp-trade-shares');
                const sharesCount = parseInt(inputShares.value, 10);
                if (isNaN(sharesCount) || sharesCount <= 0) {
                    ui.error('Harap isi jumlah lembar saham penjualan yang valid!');
                    return;
                }
                try {
                    businessManager.sellCorporateStock(symbol, sharesCount);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        };

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const query = searchInput.value.trim().toLowerCase();
                if (!query) {
                    suggestionsBox.style.display = 'none';
                    return;
                }

                const allStocks = stockMarket.getAllStocks();
                const filtered = allStocks.filter(s => 
                    s.symbol.toLowerCase().includes(query) || 
                    s.name.toLowerCase().includes(query)
                ).slice(0, 10); // max 10 suggestions

                if (filtered.length === 0) {
                    suggestionsBox.innerHTML = `
                        <div style="padding: 10px; color: var(--text-dim); font-size: 0.75rem; text-align: center;">Tidak ada saham ditemukan</div>
                    `;
                } else {
                    suggestionsBox.innerHTML = filtered.map(s => `
                        <div class="search-suggestion-item" data-symbol="${s.symbol}" style="padding: 8px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.02); transition: background 0.2s;">
                            <div>
                                <span style="font-weight: 800; color: #fff; font-size: 0.8rem;">${s.symbol}</span>
                                <span style="font-size: 0.7rem; color: var(--text-dim); margin-left: 6px;">${s.name}</span>
                            </div>
                            <span style="font-weight: 700; color: #fff; font-size: 0.75rem;">$ ${s.price.toLocaleString()}</span>
                        </div>
                    `).join('');

                    // Bind suggestion items clicks
                    suggestionsBox.querySelectorAll('.search-suggestion-item').forEach(item => {
                        item.addEventListener('click', () => {
                            const sym = item.dataset.symbol;
                            searchInput.value = sym;
                            suggestionsBox.style.display = 'none';
                            updateSelectedPanel(sym);
                        });
                    });
                }
                suggestionsBox.style.display = 'block';
            });

            // Close suggestions on outside click
            const handleOutsideClick = (e) => {
                if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                    suggestionsBox.style.display = 'none';
                }
            };
            document.addEventListener('click', handleOutsideClick);
        }

        // Quick select from portfolio table
        container.querySelectorAll('.btn-quick-select-corp').forEach(btn => {
            btn.addEventListener('click', () => {
                const sym = btn.dataset.symbol;
                if (searchInput) searchInput.value = sym;
                updateSelectedPanel(sym);
                // Scroll to top of portfolio card if needed
                searchInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        });

        // Hire finance modular candidates
        container.querySelectorAll('.btn-hire-fin').forEach(btn => {
            btn.addEventListener('click', () => {
                const candId = btn.dataset.id;
                try {
                    businessManager.hireCandidate(candId);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });

        // Fire finance modular employees
        container.querySelectorAll('.btn-fire-fin').forEach(btn => {
            btn.addEventListener('click', async () => {
                const empId = btn.dataset.id;
                const confirmed = await ui.confirm({
                    title: 'Putus Kontrak Kerja?',
                    message: 'Apakah Anda yakin ingin memutus hubungan kontrak kerja dengan staf keuangan ini?',
                    confirmText: 'Ya, Pecat!',
                    confirmClass: 'btn-danger'
                });
                if (confirmed) {
                    try {
                        businessManager.fireEmployee(empId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });
    }
};

export default FinanceOpsPanel;
