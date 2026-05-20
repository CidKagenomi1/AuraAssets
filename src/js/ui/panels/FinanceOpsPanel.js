/**
 * FinanceOpsPanel.js - Interactive Banking, Corporate Insurance, & Holding Company Dashboard
 * Provides premium UI sliders to manage interest margins (NIM), finance large syndications,
 * invest corporate cash into blue-chip stocks, and recruit specialized financial talent.
 */

import gameState from '../../game/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import businessManager from '../../business/BusinessManager.js';
import ui from '../UIManager.js';

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

        // Render holding blue-chip shares
        const blueChipValuation = portfolio.valuation || 0;
        const blueChipShares = portfolio.blueChipShares || 0;
        const blueChipAvgBuy = portfolio.avgBuyPrice || 0;

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

            <!-- HOLDING BLUE-CHIP PORTFOLIO PANEL -->
            <div class="panel-card" style="padding: 1.25rem; margin-bottom:1.5rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem; flex-wrap:wrap; gap:0.5rem;">
                    <div>
                        <h3 style="font-size: 0.95rem; font-weight:800; margin:0; color:#fff;">💎 Portofolio Indeks Blue-Chip Korporasi (Holding Asset)</h3>
                        <p class="text-muted" style="font-size:0.75rem; margin:2px 0 0 0;">Holding korporasi dapat membeli dan memiliki saham big-cap/blue-chip untuk memperkuat aset dan meraih dividen bulanan.</p>
                    </div>
                    <div style="background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.2); padding: 6px 14px; border-radius: 8px; text-align:right;">
                        <span style="font-size:0.6rem; color:#fbbf24; font-weight:800; text-transform:uppercase; display:block;">Nilai Buku Saham Big-Cap</span>
                        <span style="font-size:1.15rem; font-weight:900; color:#fbbf24;">$ ${financeManager.formatCurrency(blueChipValuation)}</span>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; background:rgba(0,0,0,0.15); padding:1rem; border-radius:10px; border:1px solid var(--border-color); margin-bottom:1rem; flex-wrap:wrap;">
                    <div style="display:flex; flex-direction:column; justify-content:center;">
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">Total Saham Dimiliki: <strong style="color:#fff;">${blueChipShares} Lembar</strong></div>
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">Rata-rata Harga Beli: <strong style="color:#fff;">$ ${financeManager.formatCurrency(blueChipAvgBuy)}/lembar</strong></div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">Dividen Bulanan Diterima: <strong style="color:#10b981;">+$ ${financeManager.formatCurrency(Math.round(blueChipValuation * 0.005))}/bln</strong></div>
                    </div>
                    <div>
                        <label style="font-size: 0.7rem; color: var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Jumlah Pembelian / Penjualan Saham</label>
                        <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:8px;">
                            <input type="number" id="bluechip-trade-shares" placeholder="Lembar saham..." 
                                style="flex:1; padding:8px 12px; border:1px solid var(--border-color); background:rgba(0,0,0,0.2); color:#fff; border-radius:6px; font-size:0.85rem; font-weight:700; outline:none;">
                            <span style="font-size:0.75rem; font-weight:800; color:#fff;">@ $250</span>
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem;">
                            <button class="btn btn-primary btn-sm" id="btn-buy-bluechip" style="font-weight:850; background:#3b82f6; border:none; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.15);">Beli Saham</button>
                            <button class="btn btn-secondary btn-sm" id="btn-sell-bluechip" style="font-weight:850;">Jual Saham</button>
                        </div>
                    </div>
                </div>
            </div>

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

        // Buy Holding Bluechip Stock
        const btnBuyBlueChip = container.querySelector('#btn-buy-bluechip');
        if (btnBuyBlueChip) {
            btnBuyBlueChip.addEventListener('click', () => {
                const input = container.querySelector('#bluechip-trade-shares');
                const shares = input.getNumericValue ? input.getNumericValue() : parseInt(input.value.replace(/,/g, ''), 10);
                if (isNaN(shares) || shares <= 0) {
                    ui.error('Harap isi jumlah lembar saham pembelian yang valid!');
                    return;
                }

                try {
                    businessManager.buyBlueChipEquity(shares);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Sell Holding Bluechip Stock
        const btnSellBlueChip = container.querySelector('#btn-sell-bluechip');
        if (btnSellBlueChip) {
            btnSellBlueChip.addEventListener('click', () => {
                const input = container.querySelector('#bluechip-trade-shares');
                const shares = input.getNumericValue ? input.getNumericValue() : parseInt(input.value.replace(/,/g, ''), 10);
                if (isNaN(shares) || shares <= 0) {
                    ui.error('Harap isi jumlah lembar saham penjualan yang valid!');
                    return;
                }

                try {
                    businessManager.sellBlueChipEquity(shares);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

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
