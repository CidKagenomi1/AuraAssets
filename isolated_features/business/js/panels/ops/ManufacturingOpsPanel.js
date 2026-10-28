/**
 * ManufacturingOpsPanel.js - Custom High-Fidelity Management Dashboard for Manufacture Sector
 * Supports dynamic model catalogs depending on sub-sector (Mobil, Elektronik, Furnitur),
 * target volume adjustments, QC upgrades, and marketing sponsorship events.
 */

import gameState from '../../../core/GameState.js';
import financeManager from '../../../finance/FinanceManager.js';
import businessManager from '../../BusinessManager.js';
import ui from '../../../ui/UIManager.js';
import { MFG_MODELS } from '../../sectors/ManufacturingSector.js';

const formatCompact = (num) => {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
};

export const ManufacturingOpsPanel = {
    render(biz) {
        const mfg = businessManager.getManufacturingState();
        if (!mfg) return `<p class="text-muted" style="padding: 2rem; text-align: center;">Memuat data divisi manufaktur...</p>`;

        const sub = mfg.subSector || 'mobil';
        const models = MFG_MODELS[sub] || MFG_MODELS.mobil;
        const activeModelId = mfg.activeModel || models[0].id;
        const currentVolume = mfg.productionVolume || 50;
        const serviceQuality = mfg.serviceQuality || 50;
        const prestige = mfg.prestige || 10;
        const demand = mfg.demandFluctuation || 1.0;
        const demandPercent = Math.round(demand * 100);

        const subNames = { mobil: 'Otomotif & Mobil', electronic: 'Elektronik & Gadget', furniture: 'Mebel & Furnitur' };
        const subName = subNames[sub] || sub;

        // Calculate upgrade service cost
        const upgradeCost = 25000 * (1 + (serviceQuality - 50) / 10);
        const canAffordUpgrade = biz.cash >= upgradeCost;

        // Marketing Event details
        let eventCost = 80000;
        let eventName = 'Grand Prix Balapan GP';
        let eventIcon = '🏎️';
        if (sub === 'electronic') {
            eventCost = 50000;
            eventName = 'Esports Tournament';
            eventIcon = '🎮';
        } else if (sub === 'furniture') {
            eventCost = 30000;
            eventName = 'Design Expo';
            eventIcon = '📐';
        }
        const canAffordEvent = biz.cash >= eventCost;

        // Render models list table
        const modelsHtml = models.map(m => {
            const isActive = m.id === activeModelId;
            return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); background: ${isActive ? 'rgba(129,140,248,0.02)' : 'transparent'};">
                    <td style="padding: 0.85rem 0.5rem; font-weight: 850; color: #fff;">
                        ${m.name} ${isActive ? '<span style="font-size:0.6rem; color:#818cf8; background:rgba(129,140,248,0.1); border:1px solid rgba(129,140,248,0.2); border-radius:3px; padding:1px 4px; font-weight:800; margin-left:6px;">PRODUKSI</span>' : ''}
                        <div style="font-size:0.7rem; color:var(--text-muted); font-weight:400; margin-top:3px; line-height:1.35; max-width:320px;">${m.desc}</div>
                    </td>
                    <td style="padding: 0.85rem 0.5rem; font-weight:700; color:#ccc;">
                        ${m.type}
                    </td>
                    <td style="padding: 0.85rem 0.5rem; font-family: monospace; color: #fbbf24; font-weight:800;">
                        $ ${m.price.toLocaleString()}
                    </td>
                    <td style="padding: 0.85rem 0.5rem; font-family: monospace; color: #f87171;">
                        $ ${m.cost.toLocaleString()}
                    </td>
                    <td style="padding: 0.85rem 0.5rem; text-align: right;">
                        <button class="btn btn-sm btn-select-model ${isActive ? 'btn-secondary' : 'btn-primary'}" data-id="${m.id}" ${isActive ? 'disabled' : ''} style="padding: 4px 10px; font-size: 0.68rem; font-weight: 900; border-radius: 6px;">
                            ${isActive ? 'AKTIF' : '🚀 PILIH LINI'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Event result display box
        let eventResultHtml = '';
        if (mfg.lastEventResult) {
            const ev = mfg.lastEventResult;
            eventResultHtml = `
                <div style="margin-top: 1rem; border: 1px solid var(--border-color); border-radius: 8px; background: rgba(0,0,0,0.25); padding: 1rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:6px; margin-bottom:6px;">
                        <span style="font-weight:800; color:#fff; font-size:0.8rem;">${ev.eventIcon} Hasil ${ev.eventName} Terakhir</span>
                        <span style="font-size:0.65rem; color:var(--text-dim);">${ev.date}</span>
                    </div>
                    <div style="font-size:0.75rem; color:#ccc; line-height:1.45;">${ev.message}</div>
                    <div style="display:flex; gap:1.5rem; margin-top:8px; font-size:0.75rem;">
                        <div>Prestige: <strong style="color:#fbbf24;">+${ev.prestige} Pt.</strong></div>
                        <div>Hadiah Tunai: <strong style="color:#10b981;">+$ ${ev.prize.toLocaleString()}</strong></div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="manufacturing-tab-wrapper" style="animation: fadeIn 0.3s ease-out; display: flex; flex-direction: column; gap: 1.5rem;">
                
                <!-- Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                    <div class="card" style="border-left: 4px solid #818cf8; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Sub-Sektor Pabrik</div>
                        <div style="font-size: 1.45rem; font-weight: 900; color: #818cf8;">${subName}</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Menggunakan lini rakitan ${sub}</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Volume Target Produksi</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #10b981;">${currentVolume.toLocaleString()} Unit / bln</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Kapasitas Terpakai Pabrik</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #f59e0b; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">QC & Jaringan Purna Jual</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #fbbf24;">${serviceQuality}%</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Meningkatkan serapan penjualan maksimum</div>
                    </div>
 
                    <div class="card" style="border-left: 4px solid #ec4899; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Prestige Brand / Pasar</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #ec4899;">${prestige} Pt.</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Ditingkatkan melalui event sponsorship</div>
                    </div>
                </div>

                <!-- Split Layout: Adjust Volume & Service Upgrades / Marketing Events -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem;">
                    
                    <!-- Left: Control Volume & QC Upgrade -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1.25rem;">
                        <h3 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: #fff;">⚙️ Kontrol Produksi & Penjaminan Mutu (QC)</h3>
                        
                        <div>
                            <label style="display: block; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Set Volume Target Produksi Bulanan</label>
                            <div style="display:flex; gap:0.75rem;">
                                <input type="number" id="mfg-volume-input" value="${currentVolume}" min="1" style="flex:1; padding: 8px 12px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.3); color: #fff; font-size: 0.9rem; font-weight: 700; border-radius: 6px;">
                                <button class="btn btn-primary" id="btn-set-volume" style="font-weight: 850; font-size: 0.75rem; padding: 0 16px; border-radius: 6px;">
                                    ⚙️ SET TARGET
                                </button>
                            </div>
                            <span style="font-size: 0.65rem; color: var(--text-dim); margin-top: 4px; display:block;">Maksimal kapasitas sub-sektor ${sub}: ${sub === 'mobil' ? '5.000' : sub === 'electronic' ? '100.000' : '30.000'} unit/bln.</span>
                        </div>

                        <div style="border-top:1px solid var(--border-color); padding-top:1.25rem; display:flex; justify-content:space-between; align-items:center; gap:2rem;">
                            <div style="flex:1;">
                                <h4 style="margin:0; font-size:0.85rem; font-weight:900; color:#fbbf24;">🔧 Upgrade Layanan Purna Jual & QC</h4>
                                <p class="text-muted" style="font-size:0.7rem; margin:3px 0 0 0; line-height:1.35;">Menaikkan kualitas penjaminan mutu dan layanan purna jual untuk menekan retur defect produk.</p>
                            </div>
                            <button class="btn btn-gold btn-sm" id="btn-upgrade-qc" style="font-weight: 900; font-size: 0.7rem; padding: 10px 16px; border-radius: 6px; white-space:nowrap;">
                                🔧 UPGRADE QC ($ ${upgradeCost.toLocaleString()})
                            </button>
                        </div>
                    </div>

                    <!-- Right: Marketing Event Sponsorship -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); display: flex; flex-direction: column;">
                        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.05rem; font-weight: 900; color: #fff;">🏆 Pemasaran & Event Sponsorship</h3>
                        <p class="text-muted" style="font-size:0.72rem; line-height:1.45; margin:0 0 1rem 0;">
                            Sponsori kejuaraan internasional di bidang sub-sektor Anda untuk melejitkan Prestige brand Anda dan memperebutkan hadiah juara jutaan dolar.
                        </p>
                        
                        <div style="margin-top:auto; display:flex; flex-direction:column; gap:0.5rem;">
                            <button class="btn btn-primary" id="btn-sponsor-event" style="font-weight:950; font-size:0.8rem; padding:10px 24px; border-radius:8px; width:100%;">
                                ${eventIcon} SPONSORI ${eventName.toUpperCase()} ($ ${eventCost.toLocaleString()})
                            </button>
                        </div>
                        ${eventResultHtml}
                    </div>
                </div>

                <!-- Product Catalog (Lini Perakitan Lini Produk) -->
                <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                    <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>🏭</span> Lini Katalog Model Produk Sub-Sektor
                    </h3>
                    <div style="overflow-x: auto; width: 100%;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.8rem;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                                    <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Model / Rancangan</th>
                                    <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Klasifikasi</th>
                                    <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Harga Jual / Unit</th>
                                    <th style="padding: 0.6rem 0.5rem; font-weight: 800;">Biaya Produksi / Unit</th>
                                    <th style="padding: 0.6rem 0.5rem; text-align: right; font-weight: 800;">Lini Aktif</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${modelsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Set volume target
        const btnSetVol = container.querySelector('#btn-set-volume');
        const inputVol = container.querySelector('#mfg-volume-input');
        if (btnSetVol && inputVol) {
            btnSetVol.addEventListener('click', () => {
                const vol = parseInt(inputVol.value);
                try {
                    businessManager.setManufacturingProductionVolume(vol);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Upgrade QC / after-sales service
        const btnUpgradeQc = container.querySelector('#btn-upgrade-qc');
        if (btnUpgradeQc) {
            btnUpgradeQc.addEventListener('click', async () => {
                const infra = businessManager.getManufacturingState();
                const serviceQuality = infra.serviceQuality || 50;
                const cost = 25000 * (1 + (serviceQuality - 50) / 10);
                
                const confirmed = await ui.confirm({
                    title: 'Upgrade Layanan Purna Jual & QC?',
                    message: `Apakah Anda yakin ingin mengeluarkan $ ${cost.toLocaleString()} untuk memperkuat standard mutu lini manufaktur Anda?`,
                    confirmText: 'Mulai Upgrade'
                });

                if (confirmed) {
                    try {
                        businessManager.upgradeManufacturingService();
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }

        // Host event sponsorship
        const btnSponsor = container.querySelector('#btn-sponsor-event');
        if (btnSponsor) {
            btnSponsor.addEventListener('click', async () => {
                const infra = businessManager.getManufacturingState();
                const sub = infra.subSector;
                let eventCost = 80000;
                let eventName = 'Grand Prix Balapan GP';
                if (sub === 'electronic') {
                    eventCost = 50000;
                    eventName = 'Esports Tournament';
                } else if (sub === 'furniture') {
                    eventCost = 30000;
                    eventName = 'Design Expo';
                }

                const confirmed = await ui.confirm({
                    title: `Sponsori ${eventName}?`,
                    message: `Apakah Anda yakin ingin menyponsori ajang kejuaraan ini dengan alokasi biaya kontribusi kas $ ${eventCost.toLocaleString()}?`,
                    confirmText: 'Sponsori Ajang'
                });

                if (confirmed) {
                    try {
                        businessManager.hostManufacturingMarketingEvent();
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }

        // Select active model
        container.querySelectorAll('.btn-select-model').forEach(btn => {
            btn.addEventListener('click', () => {
                const modelId = btn.dataset.id;
                try {
                    businessManager.setManufacturingActiveModel(modelId);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });
    }
};

export default ManufacturingOpsPanel;
