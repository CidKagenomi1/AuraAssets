/**
 * InfrastructureOpsPanel.js - Custom High-Fidelity Management Dashboard for Infrastructure/Contracting Sector
 * Manage heavy equipment purchases (Excavators, Bulldozers, Cranes) and bid on civil construction projects.
 */

import gameState from '../../../core/GameState.js';
import financeManager from '../../../finance/FinanceManager.js';
import businessManager from '../../BusinessManager.js';
import ui from '../../../ui/UIManager.js';
import { EQUIPMENT_CATALOG } from '../../sectors/InfrastructureSector.js';

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
        if (!infra) return `<p class="text-muted" style="padding: 2rem; text-align: center;">Memuat data divisi infrastruktur...</p>`;

        const ownedEquipment = infra.heavyEquipment || [];
        const activeProjects = infra.activeProjects || [];
        const availableProjects = infra.availableProjects || [];
        const demand = infra.demandFluctuation || 1.0;
        const demandPercent = Math.round(demand * 100);

        // Count owned equipment types for UI reference
        const ownedCounts = { excavator: 0, bulldozer: 0, tower_crane: 0 };
        ownedEquipment.forEach(eq => {
            if (eq.id === 'excavator' || eq.id === 'bulldozer' || eq.id === 'tower_crane') {
                ownedCounts[eq.id]++;
            } else if (eq.name.toLowerCase().includes('excavator')) {
                ownedCounts.excavator++;
            } else if (eq.name.toLowerCase().includes('bulldozer')) {
                ownedCounts.bulldozer++;
            } else if (eq.name.toLowerCase().includes('crane')) {
                ownedCounts.tower_crane++;
            }
        });

        // 1. Calculate active totals
        let activeBridgesCount = activeProjects.length;
        let totalActiveBudget = activeProjects.reduce((acc, curr) => acc + curr.budget, 0);
        let monthlyEquipMaint = ownedEquipment.reduce((acc, curr) => acc + curr.maintenance, 0);

        // 2. Available projects HTML
        const availableHtml = availableProjects.length === 0 ? `
            <div style="grid-column: 1 / -1; padding: 2.5rem; text-align: center; color: var(--text-dim); border: 1px dashed var(--border-color); border-radius: 8px; background: rgba(0,0,0,0.15);">
                🏢 Tidak ada tender proyek aktif saat ini. Tunggu bulan depan untuk pembukaan proyek baru!
            </div>
        ` : availableProjects.map(proj => {
            // Check requirements
            const reqTexts = [];
            let meetsAllReqs = true;

            for (const [reqKey, reqQty] of Object.entries(proj.req)) {
                const ownedQty = ownedCounts[reqKey] || 0;
                const matches = ownedQty >= reqQty;
                if (!matches) meetsAllReqs = false;

                const nameMapping = { excavator: 'Excavator', bulldozer: 'Bulldozer', tower_crane: 'Tower Crane' };
                const label = nameMapping[reqKey] || reqKey;
                reqTexts.push(`
                    <div style="display:flex; justify-content:space-between; align-items:center; color:${matches ? '#10b981' : '#f87171'}; font-weight:700;">
                        <span>⚙️ ${label} (Butuh ${reqQty})</span>
                        <span>Miliki: ${ownedQty}</span>
                    </div>
                `);
            }

            return `
                <div class="card tender-card" data-id="${proj.id}" style="padding: 1.25rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.01); display: flex; flex-direction: column; gap: 0.75rem; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                        <div>
                            <div style="font-size: 0.65rem; color: #a855f7; font-weight: 800; text-transform: uppercase;">Tender ${proj.source}</div>
                            <div style="font-size: 0.95rem; font-weight: 900; color: #fff; line-height: 1.3;">${proj.name}</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.75rem; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 6px;">
                        <div style="display: flex; justify-content: space-between;"><span>Nilai Kontrak:</span> <strong style="color: #fbbf24;">$ ${proj.budget.toLocaleString()}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Durasi Proyek:</span> <strong style="color: #fff;">${proj.duration} Bulan</strong></div>
                    </div>

                    <div style="font-size: 0.72rem; color: var(--text-dim); background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 0.6rem 0.75rem; border-radius: 6px; display: flex; flex-direction: column; gap: 0.35rem;">
                        <div style="font-weight: 800; color:#ccc; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px; margin-bottom:2px;">Persyaratan Alat Berat:</div>
                        ${reqTexts.join('')}
                    </div>

                    <div style="margin-top: auto; display: flex; flex-direction: column; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                        <button class="btn btn-sm btn-bid-project ${meetsAllReqs ? 'btn-primary' : 'btn-secondary'}" data-id="${proj.id}" ${meetsAllReqs ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"'} style="font-weight: 900; padding: 6px 12px; border-radius: 6px; width: 100%;">
                            ${meetsAllReqs ? '🏗️ AJUKAN TENDER' : '❌ ALAT BERAT TIDAK CUKUP'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // 3. Active projects table HTML
        const activeProjectsHtml = activeProjects.length === 0 ? `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-dim); padding: 2.5rem; font-size: 0.85rem;">
                    📭 Belum ada proyek sipil yang sedang berjalan. Ajukan penawaran tender di atas!
                </td>
            </tr>
        ` : activeProjects.map(proj => {
            const progress = proj.progress || 0;
            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 0.85rem 0.5rem; font-weight: 850; color: #fff;">
                        🏢 ${proj.name}
                    </td>
                    <td style="padding: 0.85rem 0.5rem;">
                        <span style="background: rgba(168,85,247,0.12); color: #c084fc; font-weight: 800; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(168,85,247,0.25);">
                            ${proj.source}
                        </span>
                    </td>
                    <td style="padding: 0.85rem 0.5rem; font-family: monospace; color: #ccc;">
                        $ ${proj.budget.toLocaleString()}
                    </td>
                    <td style="padding: 0.85rem 0.5rem;">
                        <div style="font-weight: 800; color: #fbbf24;">${proj.monthsLeft} bln tersisa</div>
                        <div style="font-size: 0.65rem; color: var(--text-muted);">Durasi total: ${proj.duration} bln</div>
                    </td>
                    <td style="padding: 0.85rem 0.5rem; width: 150px; text-align: right;">
                        <div style="display:flex; align-items:center; gap:0.5rem; justify-content: flex-end;">
                            <span style="font-size:0.75rem; font-weight:700;">${progress}%</span>
                            <div style="width: 80px; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                                <div style="width: ${Math.min(100, progress)}%; height: 100%; background: #10b981;"></div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // 4. Equipment Catalog HTML
        const equipmentCatalogHtml = EQUIPMENT_CATALOG.map(eq => {
            const canAfford = biz.cash >= eq.price;
            return `
                <div class="card" style="padding: 1rem; border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                    <div>
                        <div style="font-weight: 800; color: #fff; font-size: 0.88rem;">🚜 ${eq.name}</div>
                        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                            Maint: <strong style="color: #ef4444;">$ ${eq.maintenance.toLocaleString()}/bln</strong> | Progres: <strong style="color: #10b981;">+${eq.speedBoost * 100}% speed</strong>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm btn-buy-machinery" data-id="${eq.id}" style="font-weight: 850; font-size: 0.7rem; padding: 6px 12px; border-radius: 6px; white-space: nowrap;">
                        🚜 BELI ($ ${formatCompact(eq.price)})
                    </button>
                </div>
            `;
        }).join('');

        // 5. Owned heavy equipment list HTML
        const ownedEquipmentHtml = ownedEquipment.length === 0 ? `
            <div style="padding: 2rem; text-align: center; color: var(--text-dim); font-size: 0.8rem; border: 1px dashed var(--border-color); border-radius: 8px;">
                📭 Tidak ada alat berat yang dimiliki. Beli armada konstruksi di sebelah kanan!
            </div>
        ` : ownedEquipment.map(eq => {
            const resale = Math.round(eq.price * 0.55);
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border: 1px solid rgba(255,255,255,0.03); border-radius: 6px; background: rgba(255,255,255,0.01); margin-bottom: 0.5rem;">
                    <div>
                        <div style="font-weight: 800; color: #fff; font-size: 0.85rem;">🚜 ${eq.name}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">
                            Biaya Pemeliharaan: <span style="color: #ef4444;">$ ${eq.maintenance.toLocaleString()}/bln</span>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-sell-machinery" data-id="${eq.id}" data-name="${eq.name}" data-resale="${resale}" style="font-weight: 900; font-size: 0.65rem; padding: 4px 10px; border-radius: 4px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); color: #f87171; transition: all 0.2s;">
                        💰 JUAL (+$ ${formatCompact(resale)})
                    </button>
                </div>
            `;
        }).join('');

        return `
            <div class="infrastructure-tab-wrapper" style="animation: fadeIn 0.3s ease-out; display: flex; flex-direction: column; gap: 1.5rem;">
                
                <!-- Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                    <div class="card" style="border-left: 4px solid #a855f7; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Alat Berat Aktif</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #a855f7;">${ownedEquipment.length} Unit Alat</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Exca: ${ownedCounts.excavator} | Bulldozer: ${ownedCounts.bulldozer} | Crane: ${ownedCounts.tower_crane}</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Proyek Sipil Berjalan</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #10b981;">${activeBridgesCount} Proyek Aktif</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Total nilai kontrak: $ ${totalActiveBudget.toLocaleString()}</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #f59e0b; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Beban Maint. Alat Berat</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #ef4444;">-$ ${monthlyEquipMaint.toLocaleString()} / bln</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Biaya perawatan armada aktif</div>
                    </div>
 
                    <div class="card" style="border-left: 4px solid #ec4899; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Tingkat Suku Bunga & Demand</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${demandPercent > 100 ? '#10b981' : '#ec4899'};">${demandPercent}%</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Siklus ekonomi mempengaruhi nilai pembayaran bulanan</div>
                    </div>
                </div>
 
                <!-- Tender Projects Bursa (Bursa Tender Kontrak) -->
                <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                    <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>🗺️</span> Bursa Tender Proyek Sipil & Infrastruktur Nasional
                    </h3>
                    <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.5rem;">
                        Daftar tender proyek pemerintah dan swasta yang dibuka. Untuk mengajukan penawaran kontrak, perusahaan Anda wajib memiliki jenis alat berat yang disyaratkan dalam kondisi siap beroperasi.
                    </p>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
                        ${availableHtml}
                    </div>
                </div>

                <!-- Two-Column Heavy Equipment & Inventory Panel -->
                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem;">
                    
                    <!-- Left: Inventory list -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                        <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>🚜</span> Inventori Alat Berat Perusahaan
                        </h3>
                        <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.25rem;">
                            Daftar mesin konstruksi aktif Anda. Alat berat dapat dilikuidasi / dijual seharga **55% dari nilai pembelian awal**.
                        </p>
                        <div style="max-height: 300px; overflow-y: auto; padding-right: 4px;" class="custom-scroll">
                            ${ownedEquipmentHtml}
                        </div>
                    </div>

                    <!-- Right: Buy Catalog -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                        <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>🏗️</span> Depot Pembelian Alat Berat Baru
                        </h3>
                        <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.25rem;">
                            Beli alat berat modern untuk memperluas kapabilitas konstruksi Anda dan memenuhi spesifikasi tender proyek sipil yang lebih besar.
                        </p>
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            ${equipmentCatalogHtml}
                        </div>
                    </div>
                </div>
 
                <!-- Active Projects Portfolio (Kontrak Berjalan) -->
                <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                    <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>🏢</span> Portofolio Kontrak Konstruksi Sipil Aktif
                    </h3>
                    <div style="overflow-x: auto; width: 100%;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                                    <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Nama Kontrak / Proyek</th>
                                    <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Pemberi Tugas</th>
                                    <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Nilai Proyek</th>
                                    <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Sisa Waktu Pengerjaan</th>
                                    <th style="padding: 0.6rem 0.5rem; text-align: right; font-weight: 800;">Milestone Konstruksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${activeProjectsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
 
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Buy heavy machinery
        container.querySelectorAll('.btn-buy-machinery').forEach(btn => {
            btn.addEventListener('click', async () => {
                const equipId = btn.dataset.id;
                const spec = EQUIPMENT_CATALOG.find(e => e.id === equipId);
                if (!spec) return;

                const confirmed = await ui.confirm({
                    title: `Beli ${spec.name}?`,
                    message: `Apakah Anda yakin ingin membelanjakan dana kas treasury perusahaan sebesar $ ${spec.price.toLocaleString()} untuk membeli alat berat ini?`,
                    confirmText: 'Beli Alat Berat'
                });

                if (confirmed) {
                    try {
                        businessManager.buyInfrastructureEquipment(equipId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Sell heavy machinery
        container.querySelectorAll('.btn-sell-machinery').forEach(btn => {
            btn.addEventListener('click', async () => {
                const instanceId = btn.dataset.id;
                const name = btn.dataset.name;
                const resale = parseInt(btn.dataset.resale);

                const confirmed = await ui.confirm({
                    title: `Jual ${name}?`,
                    message: `Apakah Anda yakin ingin melikuidasi alat berat ini seharga $ ${resale.toLocaleString()} secara tunai?`,
                    confirmText: 'Jual Alat Berat'
                });

                if (confirmed) {
                    try {
                        businessManager.sellInfrastructureEquipment(instanceId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Bid Project
        container.querySelectorAll('.btn-bid-project').forEach(btn => {
            btn.addEventListener('click', async () => {
                const projectId = btn.dataset.id;
                try {
                    businessManager.bidInfrastructureProject(projectId);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });
    }
};

export default InfrastructureOpsPanel;
