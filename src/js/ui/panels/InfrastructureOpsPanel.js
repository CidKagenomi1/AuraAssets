/**
 * InfrastructureOpsPanel.js - Custom High-Fidelity Management Dashboard for Infrastructure & Property Sector
 * Manage land surveys, zoning construction (Commercial, Residential, Industrial), and leasing revenues.
 */

import gameState from '../../game/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import businessManager from '../../business/BusinessManager.js';
import ui from '../UIManager.js';

const formatCompact = (num) => {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
};

export const InfrastructureOpsPanel = {
    render(biz) {
        const infra = businessManager.getInfrastructureState();
        if (!infra) return `<p class="text-muted" style="padding: 2rem; text-align: center;">Memuat data divisi properti...</p>`;

        const lands = infra.discoveredLands || [];
        const developments = infra.developments || [];
        const demand = infra.demandFluctuation || 1.0;
        const demandPercent = Math.round(demand * 100);

        let totalRevenue = 0;
        let totalMaint = 0;
        developments.forEach(d => {
            totalRevenue += d.revenue * demand;
            totalMaint += d.maintenance;
        });

        // Discovered Raw Lands Market cards
        const landsHtml = lands.length === 0 ? `
            <div style="grid-column: 1 / -1; padding: 2.5rem; text-align: center; color: var(--text-dim); border: 1px dashed var(--border-color); border-radius: 8px; background: rgba(0,0,0,0.15);">
                📡 Tidak ada prospek lahan aktif. Tekan tombol "CARI PROSPEK LAHAN" untuk menyurvei wilayah baru!
            </div>
        ` : lands.map(land => {
            const canAffordLand = biz.cash >= land.price;
            
            // Preview stats for different zones based on land multiplier
            const m = land.multiplier;
            const preview = {
                commercial: { buildCost: Math.round(120000 * m), rev: Math.round(15000 * m), maint: Math.round(2500 * m) },
                residential: { buildCost: Math.round(80000 * m), rev: Math.round(9000 * m), maint: Math.round(1200 * m) },
                industrial: { buildCost: Math.round(200000 * m), rev: Math.round(28000 * m), maint: Math.round(5500 * m) }
            };

            return `
                <div class="card land-card" data-land-id="${land.id}" data-multiplier="${m}" data-price="${land.price}" style="padding: 1.25rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.01); display: flex; flex-direction: column; gap: 0.75rem; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="font-size: 0.7rem; color: #a855f7; font-weight: 800; text-transform: uppercase;">Prospek Lahan</div>
                            <div style="font-size: 1.05rem; font-weight: 900; color: #fff;">${land.name}</div>
                        </div>
                        <div style="font-size: 1.5rem; background: rgba(168,85,247,0.1); color: #a855f7; padding: 4px 10px; border-radius: 6px; font-weight: 800;">${m}x</div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.75rem; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 6px;">
                        <div style="display: flex; justify-content: space-between;"><span>Harga Lahan:</span> <strong style="color: #fbbf24;">$ ${land.price.toLocaleString()}</strong></div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px;">
                            <span>Pilih Rencana Zona:</span>
                            <select class="zone-select" data-land-id="${land.id}" style="padding: 2px 6px; font-size: 0.72rem; border-radius: 4px; background: #111; color: #fff; border: 1px solid var(--border-color); font-weight: 700;">
                                <option value="commercial">Area Komersial (Ruko/Mall)</option>
                                <option value="residential">Pemukiman (Residensial)</option>
                                <option value="industrial">Industri (Kawasan Logistik)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Dynamic Zone Stats Preview Box -->
                    <div class="zone-preview-box" data-land-id="${land.id}" style="font-size: 0.72rem; color: var(--text-dim); background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 0.6rem 0.75rem; border-radius: 6px; display: flex; flex-direction: column; gap: 0.25rem;">
                        <div style="display: flex; justify-content: space-between;"><span>Biaya Bangun Zona:</span> <strong style="color: #fff;" class="lbl-build-cost">$ ${preview.commercial.buildCost.toLocaleString()}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Total Investasi:</span> <strong style="color: #fbbf24;" class="lbl-total-cost">$ ${(land.price + preview.commercial.buildCost).toLocaleString()}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Est. Sewa / Bln:</span> <strong style="color: #10b981;" class="lbl-rev-est">$ ${preview.commercial.rev.toLocaleString()}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Pemeliharaan / Bln:</span> <strong style="color: #ef4444;" class="lbl-maint-est">$ ${preview.commercial.maint.toLocaleString()}</strong></div>
                    </div>

                    <div style="margin-top: auto; display: flex; flex-direction: column; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                        <button class="btn btn-sm btn-develop-land btn-primary" data-land-id="${land.id}" style="font-weight: 900; padding: 6px 12px; border-radius: 6px; width: 100%;">
                            🏗️ AKUISISI & BANGUN
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Developed active properties list
        const developmentsListHtml = developments.length === 0 ? `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-dim); padding: 2.5rem; font-size: 0.85rem;">
                    📭 Belum ada properti komersial/residensial yang aktif menyewa. Cari dan bangun lahan baru di atas!
                </td>
            </tr>
        ` : developments.map(dev => {
            const resale = Math.round(dev.buildCost * 0.60);
            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 0.85rem 0.5rem; font-weight: 850; color: #fff;">
                        🏢 ${dev.name}
                    </td>
                    <td style="padding: 0.85rem 0.5rem;">
                        <span style="background: rgba(168,85,247,0.12); color: #c084fc; font-weight: 800; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(168,85,247,0.25);">
                            ${dev.zone}
                        </span>
                    </td>
                    <td style="padding: 0.85rem 0.5rem; font-family: monospace; color: #ccc;">
                        $ ${dev.buildCost.toLocaleString()}
                    </td>
                    <td style="padding: 0.85rem 0.5rem;">
                        <div style="font-weight: 800; color: #10b981;">+$ ${Math.round(dev.revenue * demand).toLocaleString()} / bln</div>
                        <div style="font-size: 0.65rem; color: #ef4444;">Maint: -$ ${dev.maintenance.toLocaleString()} / bln</div>
                    </td>
                    <td style="padding: 0.85rem 0.5rem; text-align: right;">
                        <button class="btn btn-sm btn-decommission-property" data-id="${dev.id}" data-name="${dev.name}" data-resale="${resale}" style="padding: 4px 10px; font-size: 0.65rem; font-weight: 900; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #f87171; border-radius: 6px; transition: all 0.2s;">
                            💰 JUAL (+$ ${formatCompact(resale)})
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="infrastructure-tab-wrapper" style="animation: fadeIn 0.3s ease-out; display: flex; flex-direction: column; gap: 1.5rem;">
                
                <!-- Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                    <div class="card" style="border-left: 4px solid #a855f7; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Portofolio Properti Aktif</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #a855f7;">${developments.length} Unit Komersil</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Tingkat Hunian Sewa: 100%</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Kas Masuk Sewa Bulanan</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #10b981;">+$ ${Math.round(totalRevenue).toLocaleString()} / bln</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Est. Pengeluaran: -$ ${totalMaint.toLocaleString()} / bln</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #f59e0b; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Nilai Properti Terakumulasi</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #fbbf24;">$ ${developments.reduce((acc, curr) => acc + curr.buildCost, 0).toLocaleString()}</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Valuasi Aset Riil Perusahaan</div>
                    </div>

                    <div class="card" style="border-left: 4px solid #ec4899; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Tingkat Suku Bunga & Demand</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${demandPercent > 100 ? '#10b981' : '#ec4899'};">${demandPercent}%</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Mempengaruhi daya beli & sewa ruko/pemukiman</div>
                    </div>
                </div>

                <!-- Strategic Land Survey Exploration panel -->
                <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 2rem; flex-wrap: wrap; background: linear-gradient(90deg, rgba(168,85,247,0.04) 0%, transparent 100%);">
                    <div style="flex: 1; min-width: 280px;">
                        <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #a855f7; margin-bottom: 0.5rem;">
                            📡 Cari Prospek Lahan Properti Baru
                        </h3>
                        <p class="text-muted" style="font-size: 0.75rem; margin: 0; line-height: 1.4;">
                            Kirim tim analis tata kota & geologis untuk mensurvei kavling prospektif baru. Biaya survei adalah <strong>$ 15.000</strong> per ekspedisi. Menemukan lahan kosong di wilayah dengan multiplier strategis.
                        </p>
                    </div>
                    <button class="btn btn-primary" id="btn-survey-land" style="font-weight: 950; font-size: 0.8rem; padding: 10px 24px; border-radius: 8px;">
                        📡 CARI PROSPEK LAHAN ($ 15.000)
                    </button>
                </div>

                <!-- Raw Lands List (Bursa Lahan Prospektif) -->
                <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                    <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>🗺️</span> Kavling Lahan Prospektif (Belum Dikembangkan)
                    </h3>
                    <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.5rem;">
                        Daftar kavling tanah kosong hasil survei geologis. Sebelum membeli, Anda dapat menentukan jenis zona pembangunan (Komersil, Residensial, atau Industri) untuk melihat rancangan biaya & proyeksi hasil sewa bulanan.
                    </p>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
                        ${landsHtml}
                    </div>
                </div>

                <!-- Active Property Developments (Portofolio Sewa) -->
                <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                    <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>🏢</span> Portofolio Properti Sewa & Aset Riil Aktif
                    </h3>
                    <div style="overflow-x: auto; width: 100%;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                                    <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Nama Properti / Lokasi</th>
                                    <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Klasifikasi Zona</th>
                                    <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Nilai Akuisisi Total</th>
                                    <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Kinerja Keuangan Bulanan</th>
                                    <th style="padding: 0.6rem 0.5rem; text-align: right; font-weight: 800;">Likuidasi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${developmentsListHtml}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Dynamic stats update when changing zone selection
        container.querySelectorAll('.zone-select').forEach(select => {
            select.addEventListener('change', () => {
                const landId = select.dataset.landId;
                const selectedZone = select.value;
                
                const card = container.querySelector(`.land-card[data-land-id="${landId}"]`);
                if (!card) return;

                const m = parseFloat(card.dataset.multiplier);
                const price = parseInt(card.dataset.price);

                let buildCost = 0;
                let rev = 0;
                let maint = 0;

                if (selectedZone === 'commercial') {
                    buildCost = Math.round(120000 * m);
                    rev = Math.round(15000 * m);
                    maint = Math.round(2500 * m);
                } else if (selectedZone === 'residential') {
                    buildCost = Math.round(80000 * m);
                    rev = Math.round(9000 * m);
                    maint = Math.round(1200 * m);
                } else if (selectedZone === 'industrial') {
                    buildCost = Math.round(200000 * m);
                    rev = Math.round(28000 * m);
                    maint = Math.round(5500 * m);
                }

                // Update labels inside the preview box
                const previewBox = container.querySelector(`.zone-preview-box[data-land-id="${landId}"]`);
                if (previewBox) {
                    previewBox.querySelector('.lbl-build-cost').innerText = `$ ${buildCost.toLocaleString()}`;
                    previewBox.querySelector('.lbl-total-cost').innerText = `$ ${(price + buildCost).toLocaleString()}`;
                    previewBox.querySelector('.lbl-rev-est').innerText = `$ ${rev.toLocaleString()}`;
                    previewBox.querySelector('.lbl-maint-est').innerText = `$ ${maint.toLocaleString()}`;
                }
            });
        });

        // Survey Land
        const btnSurvey = container.querySelector('#btn-survey-land');
        if (btnSurvey) {
            btnSurvey.addEventListener('click', async () => {
                try {
                    businessManager.surveyInfrastructureLand();
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Develop Land
        container.querySelectorAll('.btn-develop-land').forEach(btn => {
            btn.addEventListener('click', async () => {
                const landId = btn.dataset.landId;
                const select = container.querySelector(`.zone-select[data-land-id="${landId}"]`);
                if (!select) return;

                const zoneType = select.value;
                let zoneName = '';
                if (zoneType === 'commercial') zoneName = 'Area Komersial (Mall / Ruko)';
                else if (zoneType === 'residential') zoneName = 'Pemukiman (Residensial)';
                else if (zoneType === 'industrial') zoneName = 'Industri (Kawasan Logistik)';

                const confirmed = await ui.confirm({
                    title: `Kembangkan Lahan Properti?`,
                    message: `Apakah Anda yakin ingin mengakuisisi lahan ini dan membangun zona "${zoneName}"? Dana treasury perusahaan akan terpotong untuk pembelian lahan dan biaya pembangunan.`,
                    confirmText: 'Mulai Konstruksi'
                });

                if (confirmed) {
                    try {
                        businessManager.developInfrastructureLand(landId, zoneType);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Decommission property (Sell)
        container.querySelectorAll('.btn-decommission-property').forEach(btn => {
            btn.addEventListener('click', async () => {
                const devId = btn.dataset.id;
                const name = btn.dataset.name;
                const resale = parseInt(btn.dataset.resale);

                const confirmed = await ui.confirm({
                    title: `Jual Aset Properti?`,
                    message: `Apakah Anda yakin ingin menjual properti "${name}"? Anda akan melikuidasi aset ini dan menerima kas bersih sebesar $ ${resale.toLocaleString()} (60% dari total nilai investasi).`,
                    confirmText: 'Jual Properti'
                });

                if (confirmed) {
                    try {
                        businessManager.decommissionInfrastructureDevelopment(devId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });
    }
};

export default InfrastructureOpsPanel;
