/**
 * RetailOpsPanel.js - Premium Retail Operations Workspace
 * Refactored to feature slider-based Auto-Restock and Price adjustments.
 */
import gameState from '../../../core/GameState.js';
import financeManager from '../../../finance/FinanceManager.js';
import businessManager from '../../BusinessManager.js';
import ui from '../../../ui/UIManager.js';
import { STORE_TIERS } from '../../sectors/RetailSector.js';

const formatCompact = (num) => {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return new Intl.NumberFormat('en-US').format(Math.round(num));
};

export const RetailOpsPanel = {
    render(biz) {
        const retail = businessManager.getRetailState();
        if (!retail) return '';

        const currentStock = retail.currentStock || 0;
        const capacity = retail.warehouseCapacity || 5000;
        const stockPercent = Math.max(0, Math.min(100, Math.round((currentStock / capacity) * 100)));
        
        const sellingPrice = retail.sellingPrice || 5.50;
        const restockThreshold = retail.restockThreshold || 50;
        const lastTick = retail.lastTickInfo || { sold: 0, revenue: 0, restocked: 0, cost: 0 };

        let stockColor = '#10b981';
        if (stockPercent < 15) {
            stockColor = '#ef4444';
        } else if (stockPercent < 40) {
            stockColor = '#f59e0b';
        }

        // 1. Calculate active total stats
        let totalCustomerCapacity = 0;
        let totalMaintenance = 0;
        retail.stores.forEach(s => {
            totalCustomerCapacity += s.customerCapacity;
            totalMaintenance += s.maintenance;
        });

        // 2. Render Store Construction Catalog Card
        const storeTiersHtml = STORE_TIERS.map(tier => {
            return `
                <div class="card" style="padding: 1rem; border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                    <div>
                        <div style="font-weight: 800; color: #fff; font-size: 0.9rem;">${tier.name}</div>
                        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                            Kapasitas: <strong style="color: #10b981;">${tier.customerCapacity.toLocaleString()} Pax/bln</strong> | Pemeliharaan: <strong style="color: #ef4444;">$ ${tier.maintenance.toLocaleString()}/bln</strong>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm btn-build-store" data-id="${tier.id}" style="font-weight: 850; font-size: 0.7rem; background: linear-gradient(135deg, var(--accent-primary), #0284c7); border: none; padding: 6px 12px; border-radius: 6px; white-space: nowrap;">
                        🏛️ BANGUN ($ ${formatCompact(tier.price)})
                    </button>
                </div>
            `;
        }).join('');

        // 3. Render Built active stores list
        const builtStoresHtml = retail.stores.length === 0 ? `
            <div style="padding: 2rem 1rem; text-align: center; color: var(--text-dim); font-size: 0.75rem; border: 1px dashed var(--border-color); border-radius: 8px;">
                🏪 Tidak ada toko ritel aktif. Segera bangun toko pertama Anda di atas!
            </div>
        ` : retail.stores.map(store => {
            const refund = Math.round(store.price * 0.5);
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border: 1px solid rgba(255,255,255,0.03); border-radius: 8px; background: rgba(255,255,255,0.01);">
                    <div>
                        <div style="font-weight: 800; color: #fff; font-size: 0.85rem;">${store.name}</div>
                        <div style="font-size: 0.68rem; color: var(--text-dim); margin-top: 2px;">Kapasitas: ${store.customerCapacity.toLocaleString()} Pax | Ref: +$ ${formatCompact(refund)}</div>
                    </div>
                    <button class="btn btn-sm btn-demolish-store" data-id="${store.id}" data-name="${store.name}" data-refund="${refund}" style="font-weight: 900; font-size: 0.65rem; padding: 4px 10px; border-radius: 4px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); color: #f87171; cursor: pointer;">
                        💥 ROBOHKAN
                    </button>
                </div>
            `;
        }).join('');

        return `
            <div class="retail-ops-workspace" style="animation: fadeIn 0.3s ease-out;">
                <!-- Top Overview Metrics Box -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
                    <div class="card" style="border-left: 4px solid var(--accent-primary); padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Toko Ritel Aktif</div>
                        <div style="font-size: 1.85rem; font-weight: 900; color: #fff;">${retail.stores.length} <span style="font-size: 0.8rem; color: var(--text-dim);">outlet</span></div>
                        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Pangsa pasar ritel Anda</div>
                    </div>
                    <div class="card" style="border-left: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Kapasitas Konsumen Total</div>
                        <div style="font-size: 1.85rem; font-weight: 900; color: #10b981;">${totalCustomerCapacity.toLocaleString()} <span style="font-size: 0.8rem; color: var(--text-dim);">pax/bln</span></div>
                        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Target serapan penjualan maksimal</div>
                    </div>
                    <div class="card" style="border-left: 4px solid #f59e0b; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Stok Gudang Dagangan</div>
                        <div style="font-size: 1.85rem; font-weight: 900; color: #f59e0b;">${stockPercent}% <span style="font-size: 0.75rem; color: var(--text-dim);">(${currentStock.toLocaleString()} / ${capacity.toLocaleString()} unit)</span></div>
                        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Persediaan logistik barang</div>
                    </div>
                    <div class="card" style="border-left: 4px solid #ef4444; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Biaya Pemeliharaan Toko</div>
                        <div style="font-size: 1.85rem; font-weight: 900; color: #ef4444;">$ ${totalMaintenance.toLocaleString()}/bln</div>
                        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Biaya sewa & listrik outlet</div>
                    </div>
                </div>

                <!-- Two columns Workspace -->
                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 2rem;">
                    
                    <!-- LEFT COLUMN: RETAIL STORE CONSTRUCTIONS -->
                    <div>
                        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.15rem; font-weight: 900; color: #fff;">🏪 Konstruksi Ritel & Ekspansi Toko</h3>
                        <p class="text-muted" style="font-size: 0.8rem; line-height: 1.45; margin-bottom: 1.25rem;">
                            Bangun minimarket kelontong lokal hingga megamall raksasa di perkotaan untuk memperluas jaringan jangkauan serapan konsumen Anda.
                        </p>
                        
                        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem;">
                            ${storeTiersHtml}
                        </div>

                        <!-- Active built stores list -->
                        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.05rem; font-weight: 900; color: #f87171;">🏢 Toko Aktif & Area Dekonstruksi</h3>
                        <p class="text-muted" style="font-size: 0.78rem; line-height: 1.45; margin-bottom: 1rem;">
                            Robohkan toko retail Anda yang kurang aktif atau merugi untuk mendapatkan **50% pengembalian dana tunai** dari harga pembangunan awal.
                        </p>
                        
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 220px; overflow-y: auto; padding-right: 4px;" class="custom-scroll">
                            ${builtStoresHtml}
                        </div>
                    </div>

                    <!-- RIGHT COLUMN: LOGISTICS STORAGE & AUTO PROCUREMENTS SLIDERS -->
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        <!-- Warehouse meter storage card -->
                        <div class="card" style="padding: 1.5rem; background: rgba(255,255,255,0.015); border: 1px solid var(--border-color);">
                            <h3 style="margin: 0 0 0.75rem 0; font-size: 1.05rem; font-weight: 900; color: #fff;">📦 Logistik Gudang Penyimpanan</h3>
                            <p class="text-muted" style="font-size: 0.72rem; line-height: 1.45; margin-bottom: 1rem;">
                                Barang dagangan akan dikonsumsi oleh pembeli ritel setiap bulannya. Jika stok gudang Anda habis (0%), pendapatan retail Anda juga akan terhenti sepenuhnya!
                            </p>
                            
                            <!-- Progress stock indicator -->
                            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; font-weight: 800; color: var(--text-muted); margin-bottom: 6px;">
                                <span>Kapasitas Stok Terpakai</span>
                                <span style="color: ${stockColor}; font-weight: 900;">${currentStock.toLocaleString()} / ${capacity.toLocaleString()} Unit (${stockPercent}%)</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.04); border-radius: 4px; overflow: hidden; margin-bottom: 1.25rem;">
                                <div style="width: ${stockPercent}%; height: 100%; background: ${stockColor}; transition: width 0.4s ease;"></div>
                            </div>
                            
                            <button class="btn btn-secondary btn-sm" id="btn-upgrade-warehouse" style="width: 100%; font-weight: 850; font-size: 0.7rem; border-color: rgba(255,255,255,0.08); background: rgba(255,255,255,0.02);">
                                📦 PERLUAS GUDANG (+5.000 Unit) — $ 20K
                            </button>
                        </div>

                        <!-- Auto-Restock and Price Settings -->
                        <div class="card" style="padding: 1.5rem; background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1.25rem;">
                            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: #fff;">⚙️ Kontrol Pengadaan & Harga</h3>
                            
                            <!-- Price Slider -->
                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px; color: var(--text-muted);">
                                    <span>Harga Jual Eceran: <strong style="color: #fff;">$ ${sellingPrice.toFixed(2)} / unit</strong></span>
                                    <span>Pasar Wajar: $ 5.50</span>
                                </div>
                                <input type="range" id="slider-retail-price" min="3.0" max="15.0" step="0.1" value="${sellingPrice}" style="width: 100%; cursor: pointer;">
                            </div>

                            <!-- Auto-Restock Slider -->
                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px; color: var(--text-muted);">
                                    <span>Target Auto-Restock: <strong style="color: #10b981;">${restockThreshold}%</strong></span>
                                    <span>Penuhi hingga: ${Math.round(capacity * (restockThreshold/100)).toLocaleString()} unit</span>
                                </div>
                                <input type="range" id="slider-retail-restock" min="0" max="100" step="5" value="${restockThreshold}" style="width: 100%; cursor: pointer;">
                            </div>

                            <p style="font-size: 0.65rem; color: var(--text-dim); margin: 0; line-height: 1.4;">
                                💡 Setiap akhir bulan, sistem akan otomatis memesan stok tambahan dari supplier grosir untuk memenuhi target persen di atas. Diskon bulk grosir hingga 15% otomatis berlaku saat restok besar.
                            </p>
                        </div>

                        <!-- Last Cycle Report -->
                        <div class="card" style="padding: 1.25rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 8px;">
                            <h4 style="margin: 0 0 0.5rem 0; font-size: 0.8rem; text-transform: uppercase; color: var(--accent-primary); font-weight: 800; letter-spacing: 0.05em;">Laporan Penjualan Bulan Lalu</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.75rem;">
                                <div>Unit Terjual: <strong>${lastTick.sold.toLocaleString()} unit</strong></div>
                                <div style="color: #10b981;">Omset: <strong>+$ ${lastTick.revenue.toLocaleString()}</strong></div>
                                <div>Restok Otomatis: <strong>${lastTick.restocked.toLocaleString()} unit</strong></div>
                                <div style="color: #ef4444;">Biaya Restok: <strong>-$ ${lastTick.cost.toLocaleString()}</strong></div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Build Store action click
        container.querySelectorAll('.btn-build-store').forEach(btn => {
            btn.addEventListener('click', () => {
                const tierId = btn.dataset.id;
                try {
                    businessManager.buildStore(tierId);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });

        // Demolish Store click
        container.querySelectorAll('.btn-demolish-store').forEach(btn => {
            btn.addEventListener('click', async () => {
                const storeId = btn.dataset.id;
                const name = btn.dataset.name;
                const refund = parseInt(btn.dataset.refund);

                const confirmed = await ui.confirm({
                    title: `Robohkan Toko "${name}"?`,
                    message: `Apakah Anda yakin ingin merobohkan toko retail ini? Tindakan ini akan mengembalikan dana rekonstruksi kas sebesar $ ${refund.toLocaleString()} secara tunai dan menurunkan kapasitas konsumen bulanan Anda.`,
                    confirmText: 'Robohkan Toko'
                });

                if (confirmed) {
                    try {
                        businessManager.demolishStore(storeId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Upgrade Warehouse storage size click
        const btnUpgradeWh = container.querySelector('#btn-upgrade-warehouse');
        if (btnUpgradeWh) {
            btnUpgradeWh.addEventListener('click', async () => {
                const confirmed = await ui.confirm({
                    title: 'Upgrade Kapasitas Gudang Ritel?',
                    message: 'Apakah Anda yakin ingin menggelontorkan dana kas seharga $ 20.000 untuk memperluas area logistik gudang penyimpanan retail Anda sebesar +5.000 unit?',
                    confirmText: 'Perluas Sekarang'
                });

                if (confirmed) {
                    try {
                        businessManager.upgradeWarehouse();
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        };

        // Price Slider Change
        const sliderPrice = container.querySelector('#slider-retail-price');
        if (sliderPrice) {
            sliderPrice.addEventListener('change', () => {
                businessManager.updateRetailSlider('price', sliderPrice.value);
                if (parentPage) parentPage.render();
            });
        }

        // Restock Slider Change
        const sliderRestock = container.querySelector('#slider-retail-restock');
        if (sliderRestock) {
            sliderRestock.addEventListener('change', () => {
                businessManager.updateRetailSlider('restock', sliderRestock.value);
                if (parentPage) parentPage.render();
            });
        }
    }
};

export default RetailOpsPanel;
