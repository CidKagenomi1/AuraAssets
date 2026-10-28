/**
 * AutomotiveOpsPanel.js - Premium Automotive Operations Workspace
 * Handles target monthly production volumes, model catalog selection, dealership servicing upgrades, and GP racing events.
 */
import gameState from '../../../core/GameState.js';
import financeManager from '../../../finance/FinanceManager.js';
import businessManager from '../../BusinessManager.js';
import ui from '../../../ui/UIManager.js';
import { VEHICLE_MODELS } from '../../sectors/AutomotiveSector.js';

const formatCompact = (num) => {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return new Intl.NumberFormat('en-US').format(Math.round(num));
};

export const AutomotiveOpsPanel = {
    render(biz) {
        const auto = businessManager.getAutomotiveState();
        if (!auto) return '';

        const activeModel = VEHICLE_MODELS.find(m => m.id === auto.activeModel) || VEHICLE_MODELS[0];
        const serviceCost = 25000 * (1 + (auto.serviceQuality - 50) / 10);
        
        // Render Vehicle Model Catalog HTML
        const modelsHtml = VEHICLE_MODELS.map(model => {
            const isActive = model.id === auto.activeModel;
            const borderStyle = isActive ? 'border: 2px solid #818cf8; box-shadow: 0 4px 20px rgba(129, 140, 248, 0.15);' : 'border: 1px solid var(--border-color);';
            const btnText = isActive ? '🏎️ LINI AKTIF' : '⚙️ AKTIFKAN LINI';
            
            return `
                <div class="card" style="padding: 1.25rem; background: rgba(255,255,255,0.015); border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.25s ease; ${borderStyle}">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                            <span style="background: rgba(129, 140, 248, 0.1); border: 1px solid rgba(129, 140, 248, 0.25); font-size: 0.65rem; font-weight: 800; color: #818cf8; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">${model.type}</span>
                            ${isActive ? '<span style="color:#818cf8; font-weight:900; font-size:0.75rem; display:flex; align-items:center; gap:3px;">● SEDANG DIPRODUKSI</span>' : ''}
                        </div>
                        <h4 style="margin: 0 0 0.5rem 0; font-size: 1.05rem; font-weight: 900; color: #fff;">${model.name}</h4>
                        <p class="text-muted" style="font-size: 0.72rem; line-height: 1.45; margin-bottom: 1rem; min-height: 48px;">${model.desc}</p>
                        
                        <div style="background: rgba(0,0,0,0.15); padding: 8px 12px; border-radius: 8px; font-size: 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1.25rem;">
                            <div style="display:flex; justify-content:space-between;">
                                <span style="color: var(--text-muted);">Biaya Produksi / Unit:</span>
                                <span style="font-weight: 800; color: #ef4444;">$ ${model.cost.toLocaleString()}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between;">
                                <span style="color: var(--text-muted);">Harga Jual Pabrik:</span>
                                <span style="font-weight: 800; color: #10b981;">$ ${model.price.toLocaleString()}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; border-top: 1px solid rgba(255,255,255,0.05); padding-top:4px; margin-top:4px;">
                                <span style="color: var(--text-muted); font-weight:700;">Margin Profit Bersih:</span>
                                <span style="font-weight: 900; color: #10b981;">+$ ${(model.price - model.cost).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <button class="btn btn-sm btn-select-model" data-id="${model.id}" ${isActive ? 'disabled' : ''} style="width: 100%; font-weight: 850; font-size: 0.72rem; padding: 8px 0; border-radius: 6px; background: ${isActive ? 'rgba(129, 140, 248, 0.08)' : 'linear-gradient(135deg, #818cf8, #4f46e5)'}; color: ${isActive ? '#818cf8' : '#fff'}; border: ${isActive ? '1px dashed rgba(129, 140, 248, 0.3)' : 'none'}; cursor: ${isActive ? 'not-allowed' : 'pointer'};">
                        ${btnText}
                    </button>
                </div>
            `;
        }).join('');

        // Render Grand Prix logs
        const raceLogHtml = auto.lastRaceResult ? `
            <div style="background: rgba(16,185,129,0.02); border: 1px solid rgba(16,185,129,0.15); border-radius: 8px; padding: 1rem; margin-top: 1rem;">
                <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-dim); margin-bottom: 0.5rem;">
                    <span>BALAPAN TERAKHIR</span>
                    <span>${auto.lastRaceResult.date || ''}</span>
                </div>
                <div style="font-weight: 900; color: #fff; font-size: 0.95rem; margin-bottom: 0.35rem; display:flex; align-items:center; gap:0.5rem;">
                    <span>🏁</span> Posisi Finis: Podium #${auto.lastRaceResult.place}
                </div>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0 0 0.5rem 0; line-height: 1.45;">${auto.lastRaceResult.message}</p>
                <div style="display: flex; gap: 1rem; font-size: 0.7rem; font-weight: 800; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px;">
                    <span style="color: #10b981;">💰 Hadiah Sponsor: +$ ${auto.lastRaceResult.prize.toLocaleString()}</span>
                    <span style="color: #f59e0b;">✨ Prestasi/Prestige: +${auto.lastRaceResult.prestige} Pt</span>
                </div>
            </div>
        ` : `
            <div style="padding: 2rem 1rem; text-align: center; color: var(--text-dim); font-size: 0.75rem; border: 1px dashed var(--border-color); border-radius: 8px; margin-top: 1rem;">
                🏎️ Belum mensponsori event balapan GP musim ini.
            </div>
        `;

        return `
            <div class="automotive-ops-workspace">
                <!-- Top Overview Metrics Box -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
                    <div class="card" style="border-left: 4px solid #818cf8; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Target Volume Produksi</div>
                        <div style="font-size: 1.85rem; font-weight: 900; color: #fff;">${(auto.productionVolume || 0).toLocaleString()} <span style="font-size: 0.8rem; color: var(--text-dim);">unit/bln</span></div>
                        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Kapasitas pabrik saat ini</div>
                    </div>
                    <div class="card" style="border-left: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Model Aktif Diproduksi</div>
                        <div style="font-size: 1.45rem; font-weight: 900; color: #10b981; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${activeModel.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Margin profit: +$ ${(activeModel.price - activeModel.cost).toLocaleString()}</div>
                    </div>
                    <div class="card" style="border-left: 4px solid #f59e0b; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Kualitas Servis Dealer</div>
                        <div style="font-size: 1.85rem; font-weight: 900; color: #f59e0b;">${auto.serviceQuality}%</div>
                        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Meningkatkan demand & margin servis</div>
                    </div>
                    <div class="card" style="border-left: 4px solid #ec4899; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Brand Prestige / Reputasi</div>
                        <div style="font-size: 1.85rem; font-weight: 900; color: #ec4899;">${auto.prestige || 10} Pt</div>
                        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Dari Grand Prix balapan balap</div>
                    </div>
                </div>

                <!-- Two columns Workspace -->
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem;">
                    
                    <!-- LEFT COLUMN: LINEUP CATALOG & PRODUCTION CONTROLS -->
                    <div>
                        <!-- Vehicle Models section -->
                        <h3 style="margin: 0 0 1rem 0; font-size: 1.15rem; font-weight: 900; color: #fff;">🏎️ Katalog Lini & Model Perakitan</h3>
                        <p class="text-muted" style="font-size: 0.8rem; line-height: 1.45; margin-bottom: 1.5rem;">
                            Alihkan lini manufaktur pabrik Anda ke model kendaraan dengan margin profit dan demand AI yang optimal. Sektor otomotif diatur oleh faktor volatilitas permintaan pasar bulanan secara dinamis.
                        </p>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
                            ${modelsHtml}
                        </div>

                        <!-- Production volume setting card -->
                        <div class="card" style="padding: 1.5rem; background: rgba(255,255,255,0.01);">
                            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.05rem; font-weight: 900; color: #fff;">⚙️ Manajemen Kecepatan Produksi Pabrik</h3>
                            <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 1.25rem; line-height: 1.45;">
                                Atur volume produksi kendaraan bulanan Anda. Memproduksi unit berlebih yang melampaui demand pasar AI akan menghabiskan modal kas di gudang penyimpanan pabrik Anda.
                            </p>
                            
                            <div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;">
                                <div style="flex: 1; min-width: 250px;">
                                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">
                                        <span>Target Produksi</span>
                                        <span id="prod-val-indicator" style="color: #fff; font-weight: 800;">${auto.productionVolume} unit/bln</span>
                                    </div>
                                    <input type="range" id="automotive-prod-slider" min="10" max="1000" step="10" value="${auto.productionVolume}" style="width: 100%; accent-color: #818cf8; cursor: pointer;">
                                </div>
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <input type="number" id="automotive-prod-input" value="${auto.productionVolume}" style="width: 80px; padding: 8px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.85rem; font-weight: 800; border-radius: 6px; text-align: center;">
                                    <button class="btn btn-primary btn-sm" id="btn-save-production" style="font-weight: 850; font-size: 0.72rem; height: 35px; background: linear-gradient(135deg, #818cf8, #4f46e5); border: none;">SESUAIKAN</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- RIGHT COLUMN: SERVICES & RACING SPONSORS -->
                    <div>
                        <!-- Jaringan Servis Card -->
                        <div class="card" style="padding: 1.25rem; background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
                            <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 900; color: #fff;">🔧 Bengkel & Layanan Servis</h3>
                            <p class="text-muted" style="font-size: 0.7rem; line-height: 1.45; margin-bottom: 1rem;">
                                Tingkatkan standar kualitas bengkel resmi dealer Anda. Kualitas servis yang baik memberikan arus pendapatan dividen bulanan dari biaya perbaikan mobil pasca-penjualan.
                            </p>
                            
                            <div style="background: rgba(0,0,0,0.15); padding: 8px 12px; border-radius: 8px; font-size: 0.72rem; margin-bottom: 1rem;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                                    <span style="color:var(--text-dim);">Layanan Saat Ini:</span>
                                    <span style="font-weight:800; color:#fff;">${auto.serviceQuality}% Kondisi</span>
                                </div>
                                <div style="display:flex; justify-content:space-between;">
                                    <span style="color:var(--text-dim);">Upgrade Biaya:</span>
                                    <span style="font-weight:800; color:#f59e0b;">$ ${serviceCost.toLocaleString()}</span>
                                </div>
                            </div>
                            
                            <button class="btn btn-secondary btn-sm" id="btn-upgrade-service" style="width: 100%; font-weight: 850; font-size: 0.7rem; border-color: rgba(255,255,255,0.08); background: rgba(255,255,255,0.02);" ${auto.serviceQuality >= 100 ? 'disabled' : ''}>
                                🔧 UPGRADE LAYANAN BENGKEL
                            </button>
                        </div>

                        <!-- Racing Sponsor GP Card -->
                        <div class="card" style="padding: 1.25rem; background: rgba(255,255,255,0.015); border: 1px solid var(--border-color);">
                            <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 900; color: #fff;">🏁 Sponsor Tim Balap GP</h3>
                            <p class="text-muted" style="font-size: 0.7rem; line-height: 1.45; margin-bottom: 1rem;">
                                Sponsori mobil tim balap F1/GT internal Anda senilai **$ 80.000**. Naik ke podium kemenangan balap internasional akan meroketkan prestise brand di mata dunia serta mendulang bonus sponsor besar!
                            </p>
                            
                            <button class="btn btn-primary btn-sm" id="btn-host-race" style="width: 100%; font-weight: 850; font-size: 0.72rem; background: linear-gradient(135deg, #ec4899, #be185d); border: none; box-shadow: 0 4px 12px rgba(236,72,153,0.15);">
                                🏎️ SPONSORI BALAPAN ($ 80K)
                            </button>
                            
                            ${raceLogHtml}
                        </div>
                    </div>

                </div>
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Active Model Select Clicks
        container.querySelectorAll('.btn-select-model').forEach(btn => {
            btn.addEventListener('click', () => {
                const modelId = btn.dataset.id;
                try {
                    businessManager.setActiveModel(modelId);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });

        // Sync target slider and input fields in real-time
        const slider = container.querySelector('#automotive-prod-slider');
        const input = container.querySelector('#automotive-prod-input');
        const indicator = container.querySelector('#prod-val-indicator');
        
        if (slider && input) {
            slider.addEventListener('input', () => {
                input.value = slider.value;
                if (indicator) indicator.textContent = `${parseInt(slider.value).toLocaleString()} unit/bln`;
            });
            input.addEventListener('input', () => {
                const parsed = parseInt(input.value);
                if (!isNaN(parsed) && parsed >= 0) {
                    slider.value = parsed;
                    if (indicator) indicator.textContent = `${parsed.toLocaleString()} unit/bln`;
                }
            });
        }

        // Adjust Production Volume button click
        const btnSaveProd = container.querySelector('#btn-save-production');
        if (btnSaveProd && input) {
            btnSaveProd.addEventListener('click', () => {
                const vol = parseInt(input.value);
                try {
                    businessManager.setProductionVolume(vol);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Upgrade Dealership Service Center click
        const btnUpgradeServ = container.querySelector('#btn-upgrade-service');
        if (btnUpgradeServ) {
            btnUpgradeServ.addEventListener('click', async () => {
                const auto = businessManager.getAutomotiveState();
                const cost = 25000 * (1 + (auto.serviceQuality - 50) / 10);
                
                const confirmed = await ui.confirm({
                    title: 'Upgrade Jaringan Servis Bengkel?',
                    message: `Apakah Anda yakin ingin meningkatkan kualitas bengkel resmi dealer Anda seharga $ ${cost.toLocaleString()}? Ini akan mendongkrak ketertarikan pasar bulanan dan pendapatan servis purna jual.`,
                    confirmText: 'Upgrade Sekarang'
                });
                
                if (confirmed) {
                    try {
                        businessManager.upgradeAutomotiveService();
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }

        // Host Grand Prix Race Event click
        const btnHostRace = container.querySelector('#btn-host-race');
        if (btnHostRace) {
            btnHostRace.addEventListener('click', async () => {
                const confirmed = await ui.confirm({
                    title: 'Sponsori Tim Balap Grand Prix?',
                    message: 'Apakah Anda yakin ingin menggelontorkan kas perusahaan sebesar $ 80.000 untuk mendanai pebalap dan mendaftarkan tim pabrikan Anda ke ajang kejuaraan balap internasional Grand Prix?',
                    confirmText: 'Ya, Sponsori & Balapan!',
                    confirmClass: 'btn-danger'
                });
                
                if (confirmed) {
                    try {
                        businessManager.hostRacingEvent();
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }
    }
};

export default AutomotiveOpsPanel;
