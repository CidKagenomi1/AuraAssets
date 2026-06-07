/**
 * MediaOpsPanel.js - Custom High-Fidelity Management Dashboard for Media Sector
 * Manage platform audience traction, produce content showpieces, configure monetization ad density, and upgrade servers.
 */

import gameState from '../../../core/GameState.js';
import financeManager from '../../../finance/FinanceManager.js';
import businessManager from '../../BusinessManager.js';
import ui from '../../../ui/UIManager.js';
import { AD_DENSITIES } from '../../sectors/MediaSector.js';

const formatCompact = (num) => {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return new Intl.NumberFormat('id-ID').format(Math.round(num));
};

export const MediaOpsPanel = {
    render(biz) {
        const media = businessManager.getMediaState();
        if (!media) return `<p class="text-muted" style="padding: 2rem; text-align: center;">Memuat data divisi media...</p>`;

        const audienceSize = media.audienceSize || 50000;
        const maxCapacity = media.maxAudienceCapacity || 200000;
        const contentQuality = media.contentQuality || 50;
        const adDensity = media.adDensity || 'low';
        const serverLevel = media.serverLevel || 1;
        const demand = media.demandFluctuation || 1.0;
        const demandPercent = Math.round(demand * 100);

        const activePolicy = AD_DENSITIES[adDensity] || AD_DENSITIES.low;
        const serverUpgradeCost = 25000 * serverLevel;
        const fillPercent = Math.max(0, Math.min(100, Math.round((audienceSize / maxCapacity) * 100)));

        return `
            <div class="media-ops-workspace" style="animation: fadeIn 0.3s ease-out; display: flex; flex-direction: column; gap: 1.5rem;">
                
                <!-- Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                    <div class="card" style="border-left: 4px solid #3b82f6; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Pemirsa Aktif (MAU)</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #3b82f6;">${audienceSize.toLocaleString()} Jiwa</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Tingkat keterisian: ${fillPercent}% dari kapasitas</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Standard Mutu Konten</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #10b981;">★ ${contentQuality} Pt.</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Kualitas konten menurun bertahap tiap bulan</div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #fbbf24; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Monetisasi Iklan</div>
                        <div style="font-size: 1.4rem; font-weight: 900; color: #fbbf24; text-transform: capitalize;">${activePolicy.name}</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Tarif/user: $ ${activePolicy.revPerUser.toFixed(2)}</div>
                    </div>
 
                    <div class="card" style="border-left: 4px solid #ec4899; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Node Transmisi Server</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #ec4899;">Tingkat ${serverLevel}</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">Batas kapasitas: ${maxCapacity.toLocaleString()} user</div>
                    </div>
                </div>

                <!-- Two-Column Workspace -->
                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 2rem;">
                    
                    <!-- Left: Content Creation & Server Node Upgrades -->
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        
                        <!-- Content Production Card -->
                        <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); background: linear-gradient(135deg, rgba(16,185,129,0.03) 0%, transparent 100%);">
                            <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #10b981; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                                <span>🎥</span> Studio Rilis Produksi Konten Baru
                            </h3>
                            <p class="text-muted" style="font-size: 0.78rem; margin-bottom: 1.25rem; line-height: 1.45;">
                                Gelontorkan modal studio sebesar <strong>$ 12.000</strong> untuk memproduksi konten eksklusif/serial film premium. Setiap rilis menaikkan kualitas konten platform sebesar <strong>+15 Pt.</strong>, menarik pemirsa/pengguna aktif bulanan lebih masif.
                            </p>
                            <button class="btn btn-primary" id="btn-produce-content" style="font-weight: 950; font-size: 0.8rem; padding: 10px 24px; border-radius: 8px; width: 100%;">
                                🎥 RILIS KONTEN PREMIUM ($ 12.000)
                            </button>
                        </div>

                        <!-- Server Expansion Card -->
                        <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); background: linear-gradient(135deg, rgba(236,72,153,0.03) 0%, transparent 100%);">
                            <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #ec4899; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                                <span>📡</span> Perluasan Server & Node Transmisi Penyiaran
                            </h3>
                            <p class="text-muted" style="font-size: 0.78rem; margin-bottom: 1.25rem; line-height: 1.45;">
                                Tambah kapasitas infrastruktur data center penyiaran Anda. Setiap peningkatan node transmisi menambah limit kapasitas pemirsa aktif sebesar <strong>+150.000 user</strong> secara permanen.
                            </p>
                            <button class="btn btn-gold" id="btn-upgrade-servers" style="font-weight: 950; font-size: 0.8rem; padding: 10px 24px; border-radius: 8px; width: 100%;">
                                📡 UPGRADE TRANSMISI SERVER ($ ${serverUpgradeCost.toLocaleString()})
                            </button>
                        </div>
                    </div>

                    <!-- Right: Monetization Policy & Audience Capacity Meter -->
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        
                        <!-- Audience filling bar -->
                        <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color);">
                            <h3 style="margin-top:0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom:0.75rem;">📊 Keterisian Kapasitas Penonton</h3>
                            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; font-weight: 800; color: var(--text-muted); margin-bottom: 6px;">
                                <span>Rasio Keterisian Pemirsa</span>
                                <span style="color: #3b82f6; font-weight: 900;">${audienceSize.toLocaleString()} / ${maxCapacity.toLocaleString()} User (${fillPercent}%)</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.04); border-radius: 4px; overflow: hidden;">
                                <div style="width: ${fillPercent}%; height: 100%; background: #3b82f6; transition: width 0.4s ease;"></div>
                            </div>
                        </div>

                        <!-- Ad monetization select -->
                        <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1rem;">
                            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: #fff;">📢 Kebijakan Monetisasi Iklan</h3>
                            <p class="text-muted" style="font-size: 0.72rem; line-height: 1.45; margin:0;">
                                Sesuaikan kepadatan iklan di platform Anda. Iklan agresif menaikkan pendapatan iklan per user tajam, namun mempercepat penurunan retensi/kepuasan pemirsa dan mematikan laju pertumbuhan user baru.
                            </p>
                            
                            <div>
                                <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Kepadatan Iklan (Ad Density)</label>
                                <select id="ad-density-select" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: #111; color: #fff; font-size: 0.82rem; font-weight: 800; height: 38px;">
                                    <option value="low" ${adDensity === 'low' ? 'selected' : ''}>🟢 Rendah (Aman & User-Friendly)</option>
                                    <option value="medium" ${adDensity === 'medium' ? 'selected' : ''}>🟡 Sedang (Standard Berimbang)</option>
                                    <option value="high" ${adDensity === 'high' ? 'selected' : ''}>🔴 Tinggi (Agresif / Bakar User)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Produce Content
        const btnProduce = container.querySelector('#btn-produce-content');
        if (btnProduce) {
            btnProduce.addEventListener('click', async () => {
                const confirmed = await ui.confirm({
                    title: 'Rilis Konten Baru?',
                    message: 'Apakah Anda yakin ingin menggelontorkan kas treasury sebesar $ 12.000 untuk memproduksi konten premium baru?',
                    confirmText: 'Mulai Produksi'
                });

                if (confirmed) {
                    try {
                        businessManager.produceMediaContent();
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }

        // Upgrade Servers
        const btnUpgrade = container.querySelector('#btn-upgrade-servers');
        if (btnUpgrade) {
            btnUpgrade.addEventListener('click', async () => {
                const media = businessManager.getMediaState();
                const cost = 25000 * media.serverLevel;
                const confirmed = await ui.confirm({
                    title: 'Upgrade Kapasitas Server?',
                    message: `Apakah Anda yakin ingin melakukan ekspansi node transmisi server sebesar $ ${cost.toLocaleString()} dari kas perusahaan?`,
                    confirmText: 'Upgrade Server'
                });

                if (confirmed) {
                    try {
                        businessManager.upgradeMediaServers();
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }

        // Set Ad Density
        const selectDensity = container.querySelector('#ad-density-select');
        if (selectDensity) {
            selectDensity.addEventListener('change', () => {
                const density = selectDensity.value;
                try {
                    businessManager.setMediaAdDensity(density);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }
    }
};

export default MediaOpsPanel;
