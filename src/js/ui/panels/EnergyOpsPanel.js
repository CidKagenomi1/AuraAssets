/**
 * EnergyOpsPanel.js - Custom High-Fidelity Management Dashboard for Energy & Utilities Sector
 * Features Seismographic Exploration Surveys, Potential Oil/Gas/Coal/Green Discoveries Ledger,
 * Refinery and Grid Plant Operations Management, and scrapping controls.
 */

import gameState from '../../game/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import businessManager from '../../business/BusinessManager.js';
import ui from '../UIManager.js';

export const EnergyOpsPanel = {
    render(biz) {
        const energy = businessManager.getEnergyState();
        if (!energy) return `<p class="text-muted" style="padding: 2rem; text-align: center;">Memuat data divisi energi & utilitas...</p>`;

        const explorations = energy.explorations || [];
        const refineries = energy.refineries || [];
        const demand = energy.demandFluctuation || 1.0;

        // Dynamic styling variables
        const demandPercent = Math.round(demand * 100);
        const demandColor = demand > 1.1 ? '#10b981' : demand > 0.95 ? '#fbbf24' : '#ef4444';
        
        let totalOutput = 0;
        let totalMaint = 0;
        let estRevenue = 0;

        refineries.forEach(r => {
            totalOutput += r.capacity;
            totalMaint += r.maintenance;
            estRevenue += r.capacity * r.revenueRate * demand;
        });

        if (biz.initiatives?.energy_renewable) {
            estRevenue += estRevenue * 0.15;
        }

        // Active Refineries Table rows
        let refineriesHtml = '';
        if (refineries.length === 0) {
            refineriesHtml = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;">
                        ⚠️ Tidak ada kilang atau pembangkit aktif. Mulailah eksplorasi geologi dan bangun kilang baru!
                    </td>
                </tr>
            `;
        } else {
            refineriesHtml = refineries.map(r => {
                let typeBadge = '';
                if (r.type === 'oil') typeBadge = `<span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 800;">🛢️ MINYAK</span>`;
                else if (r.type === 'gas') typeBadge = `<span style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 800;">🔥 GAS ALAM</span>`;
                else if (r.type === 'coal') typeBadge = `<span style="background: rgba(107, 114, 128, 0.15); color: #9ca3af; border: 1px solid rgba(107, 114, 128, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 800;">🪨 BATUBARA</span>`;
                else typeBadge = `<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 800;">🍃 HIJAU</span>`;

                const scrapCash = Math.round(r.maintenance * 4);
                
                return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.02); vertical-align: middle;">
                        <td style="padding: 12px 8px;">
                            <strong style="color: #fff; font-size: 0.85rem; display: block;">${r.name}</strong>
                            <span style="font-size: 0.7rem; color: var(--text-dim);">ID Node: ${r.id}</span>
                        </td>
                        <td style="padding: 12px 8px;">${typeBadge}</td>
                        <td style="padding: 12px 8px; font-weight: 800; color: #fff;">${r.capacity.toLocaleString('en-US')} u/bln</td>
                        <td style="padding: 12px 8px; font-weight: 700; color: #ef4444;">-$ ${financeManager.formatCurrency(r.maintenance)}</td>
                        <td style="padding: 12px 8px; text-align: right;">
                            <button class="btn btn-danger btn-sm btn-decom-refinery" data-id="${r.id}" style="padding: 4px 10px; font-size: 0.65rem; font-weight: 800; border-radius: 4px;">
                                ❌ DECOM (+$ ${financeManager.formatCurrency(scrapCash)})
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Potential Discoveries Table rows
        let discoveriesHtml = '';
        if (explorations.length === 0) {
            discoveriesHtml = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;">
                        🔍 Belum ada potensi wilayah baru. Jalankan survei eksplorasi seismik di atas!
                    </td>
                </tr>
            `;
        } else {
            discoveriesHtml = explorations.map(d => {
                let typeBadge = '';
                if (d.type === 'oil') typeBadge = `<span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 800;">🛢️ POTENSI MINYAK</span>`;
                else if (d.type === 'gas') typeBadge = `<span style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 800;">🔥 POTENSI GAS</span>`;
                else if (d.type === 'coal') typeBadge = `<span style="background: rgba(107, 114, 128, 0.15); color: #9ca3af; border: 1px solid rgba(107, 114, 128, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 800;">🪨 POTENSI BATUBARA</span>`;
                else typeBadge = `<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 800;">🍃 HIJAU / TERBARUKAN</span>`;

                return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.02); vertical-align: middle;">
                        <td style="padding: 12px 8px;">
                            <strong style="color: #fff; font-size: 0.85rem;">${d.name}</strong>
                        </td>
                        <td style="padding: 12px 8px;">${typeBadge}</td>
                        <td style="padding: 12px 8px; font-weight: 800; color: #fff;">${d.capacity.toLocaleString('en-US')} u/bln</td>
                        <td style="padding: 12px 8px; font-weight: 800; color: #fbbf24;">$ ${financeManager.formatCurrency(d.buildCost)}</td>
                        <td style="padding: 12px 8px; text-align: right;">
                            <button class="btn btn-primary btn-sm btn-build-refinery" data-id="${d.id}" style="padding: 6px 14px; font-size: 0.7rem; font-weight: 900; border-radius: 6px; box-shadow: 0 4px 10px rgba(16,185,129,0.25);">
                                ⚙️ BANGUN UNIT
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        return `
            <div class="energy-tab-wrapper" style="animation: fadeIn 0.3s ease-out;">
                <!-- Row 1: Energy Stats Widgets -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="card" style="border-left: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Estimasi Hasil Bersih Bulanan</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #10b981;">+$ ${financeManager.formatCurrency(Math.round(estRevenue - totalMaint))}</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Est. Revenue: $ ${financeManager.formatCurrency(Math.round(estRevenue))}</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #ef4444; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Biaya Pemeliharaan Kilang</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #ef4444;">-$ ${financeManager.formatCurrency(totalMaint)}</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Total ${refineries.length} Kilang / Pembangkit</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #fbbf24; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Kapasitas Output Grid</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #fff;">${totalOutput.toLocaleString('en-US')} u/mo</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Grid Load: Stabil (100% Demand)</div>
                    </div>

                    <div class="card" style="border-left: 4px solid ${demandColor}; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Fluktuasi Harga Pasar</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${demandColor};">${demandPercent}%</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Permintaan energi global</div>
                    </div>
                </div>

                <!-- Row 2: Geophysical Survey & Exploration System -->
                <div class="card" style="padding: 1.75rem; margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(245,158,11,0.03) 0%, transparent 100%); border: 1px solid var(--border-color);">
                    <h3 style="margin-top: 0; font-size: 1.2rem; font-weight: 900; color: #f59e0b; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <span>🔍</span> Eksplorasi Geologi Seismik & Pencarian Sumber Baru
                    </h3>
                    <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.5rem;">
                        Lakukan survei satelit geofisika dan eksplorasi geologi secara aktif. Setiap survei yang diselenggarakan akan mendeteksi potensi area cadangan migas, deposit batubara, atau titik optimal pembangkit energi hijau terbarukan yang siap dikembangkan menjadi kilang.
                    </p>
                    
                    <button class="btn btn-primary" id="btn-survey-energy" style="font-weight: 900; letter-spacing: 0.05em; padding: 12px 24px; border: none; background: linear-gradient(135deg, #f59e0b, #d97706); box-shadow: 0 4px 15px rgba(245,158,11,0.25); display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <span>🔍</span> JALANKAN SURVEI SEISMIK BARU (Biaya: $ ${financeManager.formatCurrency(energy.surveyCost)})
                    </button>
                </div>

                <!-- Row 3: Discoveries Ledger & Active Refineries Grid -->
                <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem;">
                    
                    <!-- Potential Discoveries -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                        <h3 style="margin-top: 0; font-size: 1.1rem; font-weight: 900; color: #fff; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>🗺️</span> Wilayah Hasil Temuan Potensial (Discovered Areas)
                        </h3>
                        <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.2rem; line-height: 1.4;">
                            Daftar area potensi energi yang terdeteksi dari hasil survei eksplorasi. Kembangkan area ini dengan membangun kilang atau pembangkit listrik baru untuk mulai menyuplai grid energi dan meraup omzet bulanan.
                        </p>
                        
                        <div style="overflow-x: auto; width: 100%;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-weight: 800; text-transform: uppercase;">
                                        <th style="padding: 8px 8px;">Wilayah Temuan</th>
                                        <th style="padding: 8px 8px;">Klasifikasi Sumber</th>
                                        <th style="padding: 8px 8px;">Kapasitas Potensi</th>
                                        <th style="padding: 8px 8px;">Biaya Konstruksi</th>
                                        <th style="padding: 8px 8px; text-align: right;">Aksi Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${discoveriesHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Operational Refineries -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                        <h3 style="margin-top: 0; font-size: 1.1rem; font-weight: 900; color: #fff; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>🏢</span> Pengelolaan Kilang & Pembangkit Aktif (Active Assets)
                        </h3>
                        <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.2rem; line-height: 1.4;">
                            Rincian kilang minyak, gas, tambang batubara, dan pembangkit hijau yang sedang beroperasi penuh menyuplai grid transmisi daya. Anda dapat menonaktifkan (*decommission*) kilang dengan sisa besi tua dijual kembali ke kas treasury.
                        </p>
                        
                        <div style="overflow-x: auto; width: 100%;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-weight: 800; text-transform: uppercase;">
                                        <th style="padding: 8px 8px;">Nama Aset Aset</th>
                                        <th style="padding: 8px 8px;">Tipe Kilang</th>
                                        <th style="padding: 8px 8px;">Kapasitas Output</th>
                                        <th style="padding: 8px 8px;">Biaya Pemeliharaan</th>
                                        <th style="padding: 8px 8px; text-align: right;">Aksi Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${refineriesHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Survey Event click
        const btnSurvey = container.querySelector('#btn-survey-energy');
        if (btnSurvey) {
            btnSurvey.addEventListener('click', () => {
                try {
                    businessManager.surveyEnergyExploration();
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Build Refinery Click
        container.querySelectorAll('.btn-build-refinery').forEach(btn => {
            btn.addEventListener('click', () => {
                const discId = btn.dataset.id;
                try {
                    businessManager.developEnergyDiscovery(discId);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });

        // Decommission Refinery Click
        container.querySelectorAll('.btn-decom-refinery').forEach(btn => {
            btn.addEventListener('click', async () => {
                const refId = btn.dataset.id;
                const confirmed = await ui.confirm({
                    title: 'Nonaktifkan Kilang?',
                    message: 'Apakah Anda yakin ingin menonaktifkan kilang ini secara permanen? Sisa logam bekas akan dijual ke kas treasury.',
                    confirmText: 'Ya, Decommission',
                    confirmClass: 'btn-danger'
                });
                if (confirmed) {
                    try {
                        businessManager.decommissionEnergyRefinery(refId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });
    }
};

export default EnergyOpsPanel;
