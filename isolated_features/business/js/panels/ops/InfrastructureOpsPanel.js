/**
 * InfrastructureOpsPanel.js - Custom High-Fidelity Management Dashboard for Infrastructure/Contracting Sector
 * Manage heavy equipment purchases, crew wages, and bid on civil construction projects.
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
        
        const crewBaseSalary = infra.crewBaseSalary || 800;
        const crewMode = infra.crewAllocationMode || 'normal';

        // Count owned equipment types for UI reference
        const ownedCounts = {};
        EQUIPMENT_CATALOG.forEach(cat => { ownedCounts[cat.id] = 0; });
        ownedEquipment.forEach(eq => {
            const cid = eq.catalogId || eq.id;
            if (ownedCounts[cid] !== undefined) ownedCounts[cid]++;
        });

        // Calculate crew metrics
        let standardCrewNeeded = 0;
        ownedEquipment.forEach(eq => {
            standardCrewNeeded += eq.crewReq || 1;
        });

        let activeCrew = standardCrewNeeded;
        let wageMultiplier = 1.0;
        if (crewMode === 'overstaffed') {
            activeCrew = Math.round(standardCrewNeeded * 1.3);
        } else if (crewMode === 'efficient') {
            activeCrew = Math.round(standardCrewNeeded * 0.7);
            wageMultiplier = 1.5; // Overtime rate
        }

        const crewWagesPerMonth = activeCrew * (crewBaseSalary * wageMultiplier);

        // 1. Calculate active totals
        let activeBridgesCount = activeProjects.length;
        let totalActiveBudget = activeProjects.reduce((acc, curr) => acc + curr.budget, 0);
        let monthlyEquipMaint = ownedEquipment.reduce((acc, curr) => acc + curr.maintenance, 0);

        // Payment method mapping
        const paymentLabel = {
            upfront: 'Bayar Di Depan',
            weekly: 'Cicil Mingguan',
            daily: 'Cicil Harian',
            monthly: 'Cicil Bulanan'
        };

        const paymentColor = {
            upfront: '#10b981',
            weekly: '#3b82f6',
            daily: '#f59e0b',
            monthly: '#ec4899'
        };

        // 2. Available projects HTML
        const availableHtml = availableProjects.length === 0 ? `
            <div style="grid-column: 1 / -1; padding: 2.5rem; text-align: center; color: var(--text-dim); border: 1px dashed var(--border-color); border-radius: 8px; background: rgba(0,0,0,0.15);">
                🏢 Tidak ada tender proyek aktif saat ini. Klik Tender Cepat untuk membuka proyek instan!
            </div>
        ` : availableProjects.map(proj => {
            const reqTexts = [];
            let meetsAllReqs = true;

            for (const [reqKey, reqQty] of Object.entries(proj.req)) {
                const ownedQty = ownedCounts[reqKey] || 0;
                const matches = ownedQty >= reqQty;
                if (!matches) meetsAllReqs = false;

                const spec = EQUIPMENT_CATALOG.find(e => e.id === reqKey);
                const label = spec ? spec.name : reqKey;
                reqTexts.push(`
                    <div style="display:flex; justify-content:space-between; align-items:center; color:${matches ? '#10b981' : '#f87171'}; font-weight:700;">
                        <span>⚙️ ${label} (Butuh ${reqQty})</span>
                        <span>Miliki: ${ownedQty}</span>
                    </div>
                `);
            }

            const methodLabel = paymentLabel[proj.paymentMethod] || proj.paymentMethod;
            const methodColor = paymentColor[proj.paymentMethod] || '#fff';

            return `
                <div class="card tender-card" data-id="${proj.id}" style="padding: 1.25rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.01); display: flex; flex-direction: column; gap: 0.75rem; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                                <span style="font-size: 0.65rem; color: #a855f7; font-weight: 800; text-transform: uppercase;">Tender ${proj.source}</span>
                                ${proj.isQuickTender ? `<span style="font-size: 0.6rem; background: #ef4444; color: #fff; padding: 1px 4px; border-radius: 3px; font-weight: 800;">⚡ CEPAT</span>` : ''}
                            </div>
                            <div style="font-size: 0.95rem; font-weight: 900; color: #fff; line-height: 1.3;">${proj.name}</div>
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.75rem; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 6px;">
                        <div style="display: flex; justify-content: space-between;"><span>Nilai Kontrak:</span> <strong style="color: #fbbf24;">$ ${proj.budget.toLocaleString()}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Durasi Proyek:</span> <strong style="color: #fff;">${proj.duration} Bulan</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span>Metode Bayar:</span> <strong style="color: ${methodColor}; font-weight: 800;">${methodLabel}</strong></div>
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
                <td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2.5rem; font-size: 0.85rem;">
                    📭 Belum ada proyek sipil yang sedang berjalan. Ajukan penawaran tender di atas!
                </td>
            </tr>
        ` : activeProjects.map(proj => {
            const progress = proj.progress || 0;
            const methodLabel = paymentLabel[proj.paymentMethod] || proj.paymentMethod;
            const methodColor = paymentColor[proj.paymentMethod] || '#fff';
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
                        <span style="color: ${methodColor}; font-weight: 800; font-size: 0.75rem;">${methodLabel}</span>
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
            return `
                <div class="card" style="padding: 1rem; border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                    <div>
                        <div style="font-weight: 800; color: #fff; font-size: 0.88rem;">🚜 ${eq.name}</div>
                        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                            Maint: <strong style="color: #ef4444;">$ ${eq.maintenance.toLocaleString()}/bln</strong> | Kru: <strong style="color: #3b82f6;">${eq.crewReq} Orang</strong>
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
                            Biaya Pemeliharaan: <span style="color: #ef4444;">$ ${eq.maintenance.toLocaleString()}/bln</span> | Kru: <span style="color: #3b82f6;">${eq.crewReq} Orang</span>
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
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Total kebutuhan kru standar: ${standardCrewNeeded} orang</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Proyek Sipil Berjalan</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #10b981;">${activeBridgesCount} Proyek Aktif</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Total nilai kontrak: $ ${totalActiveBudget.toLocaleString()}</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #f59e0b; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Gaji Kru & Pemeliharaan Alat</div>
                        <div style="font-size: 1.4rem; font-weight: 900; color: #ef4444;">-$ ${(crewWagesPerMonth + monthlyEquipMaint).toLocaleString()} / bln</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Gaji: $ ${crewWagesPerMonth.toLocaleString()} (${activeCrew} kru) | Maint: $ ${monthlyEquipMaint.toLocaleString()}</div>
                    </div>
 
                    <div class="card" style="border-left: 4px solid #ec4899; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Tingkat Suku Bunga & Demand</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${demandPercent > 100 ? '#10b981' : '#ec4899'};">${demandPercent}%</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Siklus ekonomi mempengaruhi nilai pembayaran</div>
                    </div>
                </div>

                <!-- Crew Management Panel -->
                <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1.25rem;">
                    <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>🧑‍🔧</span> Manajemen Kru & Gaji Proyek
                    </h3>
                    <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 0.5rem;">
                        Kelola gaji bulanan kru dan alokasi jumlah pekerja untuk setiap proyek. Aturan kepegawaian mempengaruhi moral, kecepatan, dan beban operasional.
                    </p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 2rem;">
                        <!-- Left: Salary Slider -->
                        <div style="display: flex; flex-direction: column; gap: 0.75rem; background: rgba(0,0,0,0.15); padding: 1rem; border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 0.8rem; font-weight: 800; color: #fff;">Gaji Pokok Kru</span>
                                <strong style="color: #fbbf24; font-family: monospace; font-size: 0.9rem;">$ ${crewBaseSalary.toLocaleString()}/bln</strong>
                            </div>
                            <input type="range" id="crew-salary-slider" min="500" max="1500" step="50" value="${crewBaseSalary}" style="width: 100%; accent-color: #a855f7;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-dim);">
                                <span>Minimal ($500)</span>
                                <span>Standar ($800)</span>
                                <span>Maximal ($1500)</span>
                            </div>
                            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px;">
                                💡 Kecepatan pengerjaan proyek saat ini: <strong style="color: #10b981;">${Math.round(crewBaseSalary / 8 * 10)}%</strong>
                            </div>
                        </div>

                        <!-- Right: Crew Allocation Mode -->
                        <div style="display: flex; flex-direction: column; gap: 0.75rem; background: rgba(0,0,0,0.15); padding: 1rem; border-radius: 8px;">
                            <span style="font-size: 0.8rem; font-weight: 800; color: #fff;">Alokasi & Manajemen Kru</span>
                            
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; font-size: 0.75rem; color: #fff; padding: 4px 0;">
                                    <input type="radio" name="crew-alloc" value="overstaffed" ${crewMode === 'overstaffed' ? 'checked' : ''} style="accent-color: #a855f7;">
                                    <div>
                                        <strong>Lebih dari Biasa (130% Kru)</strong>
                                        <div style="font-size: 0.65rem; color: var(--text-muted);">Proyek dipercepat (+20% progres), gaji per kru normal.</div>
                                    </div>
                                </label>

                                <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; font-size: 0.75rem; color: #fff; padding: 4px 0;">
                                    <input type="radio" name="crew-alloc" value="normal" ${crewMode === 'normal' ? 'checked' : ''} style="accent-color: #a855f7;">
                                    <div>
                                        <strong>Wajar (100% Kru)</strong>
                                        <div style="font-size: 0.65rem; color: var(--text-muted);">Kinerja standar. Jumlah kru & pengeluaran wajar.</div>
                                    </div>
                                </label>

                                <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; font-size: 0.75rem; color: #fff; padding: 4px 0;">
                                    <input type="radio" name="crew-alloc" value="efficient" ${crewMode === 'efficient' ? 'checked' : ''} style="accent-color: #a855f7;">
                                    <div>
                                        <strong>Efisien / Mode Lembur (70% Kru)</strong>
                                        <div style="font-size: 0.65rem; color: var(--text-muted);">Otomatis Kerja Lembur. Gaji per kru 1.5x, total biaya kru lebih hemat. Kecepatan stabil (90%).</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
 
                <!-- Tender Projects Bursa (Bursa Tender Kontrak) -->
                <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h3 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
                            <span>🗺️</span> Bursa Tender Proyek Sipil & Infrastruktur Nasional
                        </h3>
                        <button id="btn-quick-tender" class="btn btn-primary btn-sm" style="font-weight: 900; padding: 6px 14px; border-radius: 6px; background: linear-gradient(135deg, #ec4899, #8b5cf6); border: none;">
                            ⚡ AMBIL TENDER CEPAT
                        </button>
                    </div>
                    <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.5rem;">
                        Daftar tender proyek yang dibuka. Tender cepat menawarkan durasi pendek dan modal rendah, sedangkan tender alami meningkat skalanya seiring bertambahnya portofolio proyek selesai Anda.
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
                        <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 300px; overflow-y: auto; padding-right: 4px;" class="custom-scroll">
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
                                    <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Metode Pembayaran</th>
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
        // Crew Salary Slider
        const salarySlider = container.querySelector('#crew-salary-slider');
        if (salarySlider) {
            salarySlider.addEventListener('change', () => {
                const val = parseInt(salarySlider.value);
                try {
                    businessManager.setInfrastructureCrewSalary(val);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Crew Allocation Mode Radio Change
        container.querySelectorAll('input[name="crew-alloc"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const mode = radio.value;
                try {
                    businessManager.setInfrastructureCrewAllocationMode(mode);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });

        // Quick Tender Trigger Button
        const btnQuickTender = container.querySelector('#btn-quick-tender');
        if (btnQuickTender) {
            btnQuickTender.addEventListener('click', () => {
                try {
                    businessManager.generateInfrastructureQuickTender();
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

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
