/**
 * FnBOpsPanel.js - Custom High-Fidelity Management Dashboard for Food & Beverage Sector
 * Manage cleanliness, dining comfort, food taste metrics, menu pricing, and monitor Easter Egg boosts.
 */

import gameState from '../../../core/GameState.js';
import financeManager from '../../../finance/FinanceManager.js';
import businessManager from '../../BusinessManager.js';
import ui from '../../../ui/UIManager.js';
import { PRICING_POLICIES } from '../../sectors/FnBSector.js';

const formatCompact = (num) => {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
};

export const FnBOpsPanel = {
    render(biz) {
        const fnb = businessManager.getFnBState();
        if (!fnb) return `<p class="text-muted" style="padding: 2rem; text-align: center;">Memuat data divisi FnB...</p>`;

        const cleanliness = fnb.cleanliness || 70;
        const comfort = fnb.comfort || 60;
        const taste = fnb.taste || 65;
        const stars = fnb.stars || 3;
        const pricing = fnb.pricing || 'standard';
        const demand = fnb.demandFluctuation || 1.0;
        const demandPercent = Math.round(demand * 100);

        const subSector = fnb.subSector || 'restaurant';
        const subSectorNames = { restaurant: 'Restoran', cafe: 'Kafe', catering: 'Katering Industri' };
        const subName = subSectorNames[subSector] || subSector;

        // Render stars rating stars string
        let starsString = '';
        for (let i = 0; i < 5; i++) {
            if (i < stars) {
                starsString += '★';
            } else {
                starsString += '☆';
            }
        }

        // Color coding for metrics
        const getMetricColor = (val) => {
            if (val >= 80) return '#10b981'; // Green
            if (val >= 50) return '#fbbf24'; // Orange
            return '#ef4444'; // Red
        };

        // Render MBG Alert if active
        let mbgBadgeHtml = '';
        if (biz.isMBG) {
            mbgBadgeHtml = `
                <div style="background: linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%); border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; animation: pulse 2s infinite;">
                    <div style="font-size: 2.2rem; filter: drop-shadow(0 0 8px rgba(16,185,129,0.4));">🇲🇨</div>
                    <div>
                        <h4 style="margin: 0; font-size: 0.95rem; font-weight: 950; color: #34d399; letter-spacing: 0.05em; text-transform: uppercase;">Program Makan Siang Gratis (MBG) Aktif</h4>
                        <p style="margin: 3px 0 0 0; font-size: 0.75rem; color: #a7f3d0; line-height: 1.4;">
                            BUMN Katering Industri menyuplai makanan bergizi secara nasional. **Keuntungan bulanan diveto dikali 10x lipat** secara permanen!
                        </p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="fnb-ops-workspace" style="animation: fadeIn 0.3s ease-out; display: flex; flex-direction: column; gap: 1.5rem;">
                
                ${mbgBadgeHtml}

                <!-- Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                    <div class="card" style="border-left: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Klasifikasi Rating Bintang</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #fbbf24; letter-spacing: 2px;">${starsString}</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim); text-transform: capitalize;">Divisi: ${subName}</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #3b82f6; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Sanitasi Dapur</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${getMetricColor(cleanliness)};">${cleanliness} Pt.</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Deteriorasi standard kebersihan berkala</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #a855f7; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Kenyamanan Dining Room</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${getMetricColor(comfort)};">${comfort} Pt.</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Estetika interior & kenyamanan mebel</div>
                    </div>
 
                    <div class="card" style="border-left: 4px solid #ec4899; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Cita Rasa Hidangan</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${getMetricColor(taste)};">${taste} Pt.</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Komposisi bumbu koki & riset menu</div>
                    </div>
                </div>

                <!-- Two-Column Workspace -->
                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 2rem;">
                    
                    <!-- Left: Kitchen & Dining Operations Upgrades -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1.5rem;">
                        <h3 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: #fff; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">🍳 Operasional & Standardisasi Kebersihan/Cita Rasa</h3>
                        
                        <!-- Actions List -->
                        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                            <!-- Clean Kitchen -->
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 1.5rem;">
                                <div style="flex: 1;">
                                    <h4 style="margin:0; font-size:0.85rem; font-weight:900; color:#34d399;">🍳 Sanitasi & Pembersihan Dapur</h4>
                                    <p class="text-muted" style="font-size:0.7rem; margin:3px 0 0 0; line-height:1.35;">Meningkatkan kebersihan dapur secara instan (+35 Pt.) untuk mencegah kontaminasi.</p>
                                </div>
                                <button class="btn btn-primary btn-sm btn-fnb-action" data-action="clean" style="font-weight: 900; font-size: 0.7rem; padding: 8px 16px; border-radius: 6px; white-space:nowrap;">
                                    🍳 SANITASI DAFUR ($ 3.000)
                                </button>
                            </div>

                            <!-- Renovate interior -->
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1.25rem;">
                                <div style="flex: 1;">
                                    <h4 style="margin:0; font-size:0.85rem; font-weight:900; color:#a855f7;">🛋️ Renovasi Dining Room & Interior</h4>
                                    <p class="text-muted" style="font-size:0.7rem; margin:3px 0 0 0; line-height:1.35;">Membeli mebel baru dan menata ulang tata pencahayaan dining room (+25 Pt.).</p>
                                </div>
                                <button class="btn btn-primary btn-sm btn-fnb-action" data-action="renovate" style="font-weight: 900; font-size: 0.7rem; padding: 8px 16px; border-radius: 6px; white-space:nowrap;">
                                    🛋️ RENOVASI INTERIOR ($ 8.000)
                                </button>
                            </div>

                            <!-- Culinary Research -->
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1.25rem;">
                                <div style="flex: 1;">
                                    <h4 style="margin:0; font-size:0.85rem; font-weight:900; color:#ec4899;">👨‍🍳 Riset Menu & Pelatihan Chef</h4>
                                    <p class="text-muted" style="font-size:0.7rem; margin:3px 0 0 0; line-height:1.35;">Mengirim chef untuk riset bumbu resep rahasia masakan baru (+20 Pt.).</p>
                                </div>
                                <button class="btn btn-primary btn-sm btn-fnb-action" data-action="research" style="font-weight: 900; font-size: 0.7rem; padding: 8px 16px; border-radius: 6px; white-space:nowrap;">
                                    👨‍🍳 RISET KULINER ($ 15.000)
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Menu Pricing Policies & Customer Statistics -->
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        
                        <!-- Pricing Policy Dropdown -->
                        <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1rem;">
                            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: #fff;">💵 Kebijakan Harga Menu Makanan</h3>
                            <p class="text-muted" style="font-size: 0.72rem; line-height: 1.45; margin:0;">
                                Pilih segmentasi harga makanan di menu Anda. Harga premium menuntut standard bintang restoran minimal 3 bintang agar pembeli tidak melarikan diri!
                            </p>
                            
                            <div>
                                <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Pilihan Pricing Restoran</label>
                                <select id="fnb-pricing-select" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: #111; color: #fff; font-size: 0.82rem; font-weight: 800; height: 38px;">
                                    <option value="cheap" ${pricing === 'cheap' ? 'selected' : ''}>🟢 Ekonomis (Murah / Fast Food)</option>
                                    <option value="standard" ${pricing === 'standard' ? 'selected' : ''}>🟡 Standard (Menengah / Kasual)</option>
                                    <option value="premium" ${pricing === 'premium' ? 'selected' : ''}>🔴 Premium (Mewah / Fine Dining)</option>
                                </select>
                            </div>
                        </div>

                        <!-- Statistics Panel -->
                        <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.05rem; font-weight: 900; color: #fff;">📊 Ringkasan Faktor Pasar FnB</h3>
                            <div style="display:flex; flex-direction:column; gap:0.5rem; font-size:0.75rem;">
                                <div style="display:flex; justify-content:space-between; border-bottom:1px dashed rgba(255,255,255,0.05); padding-bottom:4px;">
                                    <span>Tingkat Kunjungan Demand:</span>
                                    <strong style="color:${demandPercent > 100 ? '#10b981' : '#f87171'};">${demandPercent}%</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; border-bottom:1px dashed rgba(255,255,255,0.05); padding-bottom:4px;">
                                    <span>Harga Jual / Porsi:</span>
                                    <strong style="color:#fbbf24;">$ ${PRICING_POLICIES[pricing]?.price || 15}</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between;">
                                    <span>Rasio Defect / QC Makanan:</span>
                                    <strong style="color:#10b981;">Aman (0.01%)</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // FnB Clean Kitchen, Renovate interior, Research recipe actions
        container.querySelectorAll('.btn-fnb-action').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.action;
                let title = '';
                let message = '';

                if (action === 'clean') {
                    title = 'Sanitasi & Cuci Dapur?';
                    message = 'Apakah Anda yakin ingin membelanjakan $ 3.000 untuk mensterilkan seluruh peralatan dapur restoran Anda?';
                } else if (action === 'renovate') {
                    title = 'Renovasi Interior Dining?';
                    message = 'Apakah Anda yakin ingin menggelontorkan kas sebesar $ 8.000 untuk memperbarui interior restoran Anda?';
                } else if (action === 'research') {
                    title = 'Riset Menu Baru?';
                    message = 'Apakah Anda yakin ingin mengeluarkan dana R&D sebesar $ 15.000 untuk merancang resep rahasia masakan baru?';
                }

                const confirmed = await ui.confirm({
                    title,
                    message,
                    confirmText: 'Mulai Operasi'
                });

                if (confirmed) {
                    try {
                        if (action === 'clean') {
                            businessManager.cleanFnBKitchen();
                        } else if (action === 'renovate') {
                            businessManager.renovateFnBAmbience();
                        } else if (action === 'research') {
                            businessManager.researchFnBRecipe();
                        }
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Set Menu Pricing Policy
        const selectPricing = container.querySelector('#fnb-pricing-select');
        if (selectPricing) {
            selectPricing.addEventListener('change', () => {
                const policyKey = selectPricing.value;
                try {
                    businessManager.setFnBMenuPricing(policyKey);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }
    }
};

export default FnBOpsPanel;
