/**
 * TransportationOpsPanel.js - Custom High-Fidelity Management Dashboard for Transportation Sector
 * Manage ride-hailing and vehicle rental fleets, driver/crew payrolls, and individual vehicle repairs.
 */

import gameState from '../../../core/GameState.js';
import financeManager from '../../../finance/FinanceManager.js';
import businessManager from '../../BusinessManager.js';
import ui from '../../../ui/UIManager.js';
import { VEHICLE_CATALOG } from '../../sectors/TransportationSector.js';

const formatCompact = (num) => {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
};

export const TransportationOpsPanel = {
    getVehicleIcon(type) {
        switch(type.toLowerCase()) {
            case 'lcgc': return '🚗';
            case 'sedan': return '🚘';
            case 'suv': return '🚙';
            case 'truk': return '🚚';
            case 'semi truk': return '🚛';
            default: return '🚗';
        }
    },

    render(biz) {
        const trans = businessManager.getTransportationState();
        if (!trans) return `<p class="text-muted" style="padding: 2rem; text-align: center;">Memuat data divisi transportasi...</p>`;

        const fleet = trans.fleet || [];
        const demand = trans.demandFluctuation || 1.0;
        const demandPercent = Math.round(demand * 100);

        // Count fleet models by passenger vs cargo
        let passengerCount = 0;
        let cargoCount = 0;
        let groundedCount = 0;
        let repairAllCost = 0;

        fleet.forEach(v => {
            if (['lcgc', 'sedan', 'suv'].includes(v.id)) {
                passengerCount++;
            } else {
                cargoCount++;
            }
            if (v.condition < 40) {
                groundedCount++;
            }
            if (v.condition < 100) {
                repairAllCost += Math.round(v.price * (1 - v.condition / 100) * 0.35);
            }
        });

        // Vehicle catalog options HTML
        const catalogHtml = VEHICLE_CATALOG.map(v => {
            const vIcon = this.getVehicleIcon(v.type);
            return `
                <div class="card" style="padding: 1rem; border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); border-radius: 8px; display: flex; flex-direction: column; gap: 0.8rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                        <div>
                            <div style="font-weight: 800; color: #fff; font-size: 0.88rem;">${vIcon} ${v.name}</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                                Biaya: <strong style="color: #ef4444;">$ ${v.monthlyCost}/bln</strong> &bull; Profit: <strong style="color: #10b981;">+$ ${v.baseProfit}/bln</strong> &bull; Kru: <strong style="color:#fbbf24;">${v.crewRequired} orang</strong>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <input type="number" class="buy-qty-input" data-id="${v.id}" value="1" min="1" max="20" style="width: 45px; padding: 4px; border-radius: 4px; border:1px solid var(--border-color); background:#111; color:#fff; text-align:center; font-weight:700; height: 28px;">
                            <button class="btn btn-primary btn-sm btn-buy-vehicle" data-id="${v.id}" style="font-weight: 850; font-size: 0.7rem; padding: 6px 12px; border-radius: 6px; white-space: nowrap; height: 28px;">
                                🛒 BELI ($ ${formatCompact(v.price)})
                            </button>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; border-top: 1px dashed rgba(255,255,255,0.04); padding-top: 8px;">
                        <label style="font-size: 0.65rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase;">Tipe Mesin:</label>
                        <select class="engine-type-select" data-id="${v.id}" style="padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color); background: #222; color: #fff; font-size: 0.72rem; font-weight: 700; height: 24px; cursor: pointer; flex: 1;">
                            <option value="ice">BBM Standar (Base Price)</option>
                            <option value="hybrid">Hybrid (+20% Harga, -15% Opex, +5% Profit)</option>
                            <option value="ev">Listrik / EV (+40% Harga, -35% Opex, +10% Profit)</option>
                        </select>
                    </div>
                </div>
            `;
        }).join('');

        // Owned fleet list HTML
        const fleetListHtml = fleet.length === 0 ? `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-dim); padding: 2.5rem; font-size: 0.85rem;">
                    📭 Belum ada armada kendaraan terdaftar. Beli kendaraan di sebelah kanan!
                </td>
            </tr>
        ` : fleet.map(v => {
            const cond = v.condition !== undefined ? v.condition : 100;
            const isGrounded = cond < 40;
            const repairCost = Math.round(v.price * (1 - cond / 100) * 0.35);
            const resale = Math.round(v.price * (cond / 100) * 0.50);
            const vIcon = this.getVehicleIcon(v.type);

            let condColor = '#10b981';
            if (cond < 40) condColor = '#ef4444';
            else if (cond < 75) condColor = '#f59e0b';

            let engineColor = '#94a3b8';
            if (v.engineType === 'hybrid') engineColor = '#fbbf24';
            else if (v.engineType === 'ev') engineColor = '#10b981';

            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <td style="padding: 0.85rem 0.5rem; font-weight: 850; color: #fff;">
                        ${vIcon} ${v.name}
                        ${isGrounded ? '<span style="font-size:0.6rem; color:#ef4444; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); border-radius:3px; padding:1px 4px; font-weight:800; margin-left:6px;">MOGOK</span>' : ''}
                        <span style="font-size:0.65rem; background:${engineColor}18; color:${engineColor}; border:1px solid ${engineColor}33; border-radius:4px; padding:2px 6px; font-weight:800; margin-left:6px; letter-spacing:0.03em;">${v.engineLabel || 'BBM'}</span>
                    </td>
                    <td style="padding: 0.85rem 0.5rem;">
                        <span style="background: rgba(168,85,247,0.12); color: #c084fc; font-weight: 800; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(168,85,247,0.25);">
                            ${v.type}
                        </span>
                    </td>
                    <td style="padding: 0.85rem 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="font-weight: 700; color: ${condColor};">${cond}%</div>
                            <div style="font-size: 0.72rem; color: var(--text-dim); background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); padding: 1px 6px; border-radius: 4px; font-weight:800;">
                                ${(v.mileage || 0).toLocaleString('id-ID')} km
                            </div>
                        </div>
                        <div style="font-size: 0.65rem; color: var(--text-dim); margin-top:2px;">${v.ageMonths || 0} bulan beroperasi</div>
                    </td>
                    <td style="padding: 0.85rem 0.5rem; font-family: monospace; color: #fbbf24; font-weight:800;">
                        +$ ${Math.round(v.baseProfit * demand).toLocaleString()} / bln
                    </td>
                    <td style="padding: 0.85rem 0.5rem; text-align: right;">
                        <div style="display:flex; gap:0.4rem; justify-content: flex-end;">
                            <button class="btn btn-sm btn-repair-vehicle" data-id="${v.id}" data-cost="${repairCost}" ${cond >= 100 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} style="padding: 4px 8px; font-size: 0.65rem; font-weight: 900; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); color:#34d399; border-radius: 4px;">
                                🔧 SERVIS ($ ${repairCost.toLocaleString()})
                            </button>
                            <button class="btn btn-sm btn-sell-vehicle" data-id="${v.id}" data-resale="${resale}" style="padding: 4px 8px; font-size: 0.65rem; font-weight: 900; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #f87171; border-radius: 4px;">
                                💰 JUAL ($ ${resale.toLocaleString()})
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="transportation-tab-wrapper" style="animation: fadeIn 0.3s ease-out; display: flex; flex-direction: column; gap: 1.5rem;">
                
                <!-- Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                    <div class="card" style="border-left: 4px solid #a855f7; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Total Armada Kendaraan</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #a855f7;">${fleet.length} Unit Armada</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Ringan: ${passengerCount} | Kargo Berat: ${cargoCount}</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #ef4444; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Unit Mogok / Grounded</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${groundedCount > 0 ? '#ef4444' : '#10b981'};">${groundedCount} Kendaraan</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Armada dengan kondisi di bawah 40%</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Servis Massal Armada</div>
                        <div style="font-size: 1.25rem; font-weight: 900; color: #fff; margin-top:0.25rem;">
                            <button class="btn btn-primary btn-sm" id="btn-repair-all" ${repairAllCost === 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} style="font-weight:900; font-size:0.75rem; padding:6px 12px; border-radius:6px;">
                                🔧 SERVIS MASSAL ($ ${repairAllCost.toLocaleString()})
                            </button>
                        </div>
                        <div style="font-size: 0.75rem; margin-top: 0.4rem; color: var(--text-dim);">Memulihkan semua kendaraan ke 100%</div>
                    </div>
 
                    <div class="card" style="border-left: 4px solid #ec4899; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Tingkat Mobilitas & Demand</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${demandPercent > 100 ? '#10b981' : '#ec4899'};">${demandPercent}%</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Faktor pengali tarif perjalanan logistik</div>
                    </div>
                </div>

                <!-- Two-Column Layout: Catalog & Fleet Lists -->
                <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 1.5rem;">
                    
                    <!-- Left: Buy Vehicle Depot -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                        <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>🏢</span> Depot Pembelian Armada Baru
                        </h3>
                        <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.25rem;">
                            Lakukan pengadaan armada untuk kebutuhan mobilitas ringan (LCGC, Sedan, SUV) hingga pengiriman kargo logistik kelas berat (Truk, Semi Truk).
                        </p>
                        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                            ${catalogHtml}
                        </div>
                    </div>

                    <!-- Right: Active Fleet Table -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                        <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>🚗</span> Portofolio Armada Kendaraan Aktif
                        </h3>
                        <div style="overflow-x: auto; width: 100%;">
                            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem;">
                                <thead>
                                    <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                                        <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Mobil / Armada</th>
                                        <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Model</th>
                                        <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Kondisi & Odometer</th>
                                        <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Est. Omset / Bln</th>
                                        <th style="padding: 0.6rem 0.5rem; text-align: right; font-weight: 800;">Tindakan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${fleetListHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Buy Vehicles
        container.querySelectorAll('.btn-buy-vehicle').forEach(btn => {
            btn.addEventListener('click', async () => {
                const modelId = btn.dataset.id;
                const card = btn.closest('.card');
                const qtyInput = card.querySelector('.buy-qty-input');
                const qty = qtyInput ? parseInt(qtyInput.value) : 1;

                const engineSelect = card.querySelector('.engine-type-select');
                const engineType = engineSelect ? engineSelect.value : 'ice';

                const modelSpec = VEHICLE_CATALOG.find(v => v.id === modelId);
                if (!modelSpec) return;

                let priceMult = 1.0;
                let engineLabel = 'BBM';
                if (engineType === 'hybrid') { priceMult = 1.2; engineLabel = 'Hybrid'; }
                else if (engineType === 'ev') { priceMult = 1.4; engineLabel = 'EV'; }

                const finalPrice = Math.round(modelSpec.price * priceMult);
                const totalCost = finalPrice * qty;

                const confirmed = await ui.confirm({
                    title: `Beli Armada Kendaraan?`,
                    message: `Apakah Anda yakin ingin membelanjakan dana kas treasury perusahaan sebesar $ ${totalCost.toLocaleString()} untuk membeli ${qty} unit "${modelSpec.name} (${engineLabel})"?`,
                    confirmText: 'Beli Unit'
                });

                if (confirmed) {
                    try {
                        businessManager.buyTransportationVehicles(modelId, qty, engineType);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Sell Vehicle
        container.querySelectorAll('.btn-sell-vehicle').forEach(btn => {
            btn.addEventListener('click', async () => {
                const vehicleId = btn.dataset.id;
                const resale = parseInt(btn.dataset.resale);

                const confirmed = await ui.confirm({
                    title: `Jual Kendaraan Dari Armada?`,
                    message: `Apakah Anda yakin ingin melikuidasi kendaraan ini seharga $ ${resale.toLocaleString()} secara tunai?`,
                    confirmText: 'Jual Unit'
                });

                if (confirmed) {
                    try {
                        businessManager.sellTransportationVehicle(vehicleId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Repair Vehicle
        container.querySelectorAll('.btn-repair-vehicle').forEach(btn => {
            btn.addEventListener('click', async () => {
                const vehicleId = btn.dataset.id;
                const cost = parseInt(btn.dataset.cost);

                const confirmed = await ui.confirm({
                    title: `Servis Kendaraan?`,
                    message: `Apakah Anda yakin ingin mengeluarkan kas sebesar $ ${cost.toLocaleString()} untuk melakukan pemeliharaan pada unit armada ini?`,
                    confirmText: 'Servis Unit'
                });

                if (confirmed) {
                    try {
                        businessManager.repairTransportationVehicle(vehicleId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Repair All Fleet
        const btnRepairAll = container.querySelector('#btn-repair-all');
        if (btnRepairAll) {
            btnRepairAll.addEventListener('click', async () => {
                const confirmed = await ui.confirm({
                    title: `Servis Massal Seluruh Armada?`,
                    message: `Apakah Anda yakin ingin melakukan servis massal pada seluruh kendaraan armada yang aus? Tindakan ini akan merestorasi seluruh unit ke kondisi prima 100%.`,
                    confirmText: 'Servis Massal'
                });

                if (confirmed) {
                    try {
                        businessManager.repairTransportationAllFleet();
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }
    }
};

export default TransportationOpsPanel;
