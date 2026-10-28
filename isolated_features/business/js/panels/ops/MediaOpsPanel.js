import gameState from '../../../core/GameState.js';
import financeManager from '../../../finance/FinanceManager.js';
import businessManager from '../../BusinessManager.js';
import ui from '../../../ui/UIManager.js';
import { AD_DENSITIES, MEDIA_CATEGORIES, MEDIA_GENRES } from '../../sectors/MediaSector.js';

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
        const trend = media.currentTrend || { category: 'film', genre: 'action', description: 'Penonton menyukai laga seru!' };
        const releasedContent = media.releasedContent || [];

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
                    
                    <!-- Left: Market Trend & Content Creation Studio -->
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        
                        <!-- Market Trend Card -->
                        <div class="card" style="padding: 1.5rem; border: 1px solid #f59e0b; background: rgba(245, 158, 11, 0.02); display: flex; flex-direction: column; gap: 0.5rem; position: relative; overflow: hidden;">
                            <div style="position: absolute; right: -10px; top: -10px; font-size: 4rem; opacity: 0.05; transform: rotate(15deg);">🔥</div>
                            <h3 style="margin: 0; font-size: 0.95rem; font-weight: 900; color: #f59e0b; display: flex; align-items: center; gap: 0.5rem;">
                                <span>🔥</span> Tren Pasar Penonton Saat Ini
                            </h3>
                            <div style="font-size: 0.85rem; font-weight: 800; color: #fff; margin-top: 0.25rem;">
                                Kategori: <span style="color: #f59e0b; text-transform: uppercase;">${MEDIA_CATEGORIES[trend.category]?.label || trend.category}</span> 
                                &bull; 
                                Genre: <span style="color: #f59e0b; text-transform: uppercase;">${MEDIA_GENRES[trend.genre]?.label || trend.genre}</span>
                            </div>
                            <p class="text-muted" style="font-size: 0.76rem; line-height: 1.4; margin: 4px 0 0 0; font-style: italic;">
                                "${trend.description}"
                            </p>
                        </div>

                        <!-- Content Production Card -->
                        <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); background: linear-gradient(135deg, rgba(16,185,129,0.03) 0%, transparent 100%);">
                            <h3 style="margin-top: 0; font-size: 1.05rem; font-weight: 900; color: #10b981; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
                                <span>🎥</span> Studio Rilis Konten Baru
                            </h3>
                            <div style="display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 1.25rem;">
                                <div>
                                    <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Nama Konten/Proyek</label>
                                    <input type="text" id="media-project-name" placeholder="cth: The Midnight Detective" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: #111; color: #fff; font-size: 0.82rem;" />
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem;">
                                    <div>
                                        <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Kategori</label>
                                        <select id="media-project-category" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: #111; color: #fff; font-size: 0.82rem; height: 36px;">
                                            ${Object.entries(MEDIA_CATEGORIES).map(([key, data]) => `<option value="${key}">${data.label}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Genre</label>
                                        <select id="media-project-genre" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: #111; color: #fff; font-size: 0.82rem; height: 36px;">
                                            ${Object.entries(MEDIA_GENRES).map(([key, data]) => `<option value="${key}">${data.label}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; display: flex; justify-content: space-between;">
                                        <span>Anggaran Rilis (Budget)</span>
                                        <span id="budget-value-display" style="color: #10b981; font-weight: 900;">$ 30.000</span>
                                    </label>
                                    <input type="range" id="media-project-budget" min="10000" max="500000" step="5000" value="30000" style="width: 100%; accent-color: #10b981; cursor: pointer;" />
                                    <div id="media-budget-guideline" style="font-size: 0.7rem; color: var(--text-dim); margin-top: 4px;">
                                        Min: $ 10.000 | Rekomendasi: $ 30.000
                                    </div>
                                </div>
                            </div>
                            <button class="btn btn-primary" id="btn-produce-content" style="font-weight: 950; font-size: 0.8rem; padding: 10px 24px; border-radius: 8px; width: 100%;">
                                🎬 RILIS KONTEN SEKARANG
                            </button>
                        </div>
                    </div>

                    <!-- Right: Server Upgrades, Ads Policy, and Release History -->
                    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                        
                        <!-- Audience filling bar & Server Upgrade -->
                        <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1rem;">
                            <div>
                                <h3 style="margin-top:0; font-size: 1.05rem; font-weight: 900; color: #fff; margin-bottom:0.75rem;">📡 Server & Transmisi Penyiaran</h3>
                                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; font-weight: 800; color: var(--text-muted); margin-bottom: 6px;">
                                    <span>Rasio Keterisian Pemirsa</span>
                                    <span style="color: #3b82f6; font-weight: 900;">${audienceSize.toLocaleString()} / ${maxCapacity.toLocaleString()} User (${fillPercent}%)</span>
                                </div>
                                <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.04); border-radius: 4px; overflow: hidden; margin-bottom: 1rem;">
                                    <div style="width: ${fillPercent}%; height: 100%; background: #3b82f6; transition: width 0.4s ease;"></div>
                                </div>
                            </div>
                            <button class="btn btn-gold" id="btn-upgrade-servers" style="font-weight: 950; font-size: 0.8rem; padding: 10px 24px; border-radius: 8px; width: 100%;">
                                📡 UPGRADE SERVER TRANSMISI ($ ${serverUpgradeCost.toLocaleString()})
                            </button>
                        </div>

                        <!-- Ad monetization select -->
                        <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1rem;">
                            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: #fff;">📢 Kebijakan Monetisasi Iklan</h3>
                            <div>
                                <label style="display: block; font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Kepadatan Iklan (Ad Density)</label>
                                <select id="ad-density-select" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: #111; color: #fff; font-size: 0.82rem; font-weight: 800; height: 38px;">
                                    <option value="low" ${adDensity === 'low' ? 'selected' : ''}>🟢 Rendah (Aman & User-Friendly)</option>
                                    <option value="medium" ${adDensity === 'medium' ? 'selected' : ''}>🟡 Sedang (Standard Berimbang)</option>
                                    <option value="high" ${adDensity === 'high' ? 'selected' : ''}>🔴 Tinggi (Agresif / Bakar User)</option>
                                </select>
                            </div>
                        </div>

                        <!-- Released Content History -->
                        <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1rem;">
                            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: #fff;">🎬 Riwayat Rilisan Konten</h3>
                            ${releasedContent.length === 0 ? `
                                <p class="text-muted" style="font-size: 0.78rem; text-align: center; margin: 1rem 0;">Belum ada konten yang diproduksi baru-baru ini.</p>
                            ` : `
                                <div style="display: flex; flex-direction: column; gap: 0.8rem; max-height: 300px; overflow-y: auto; padding-right: 4px;">
                                    ${releasedContent.map(item => {
                                        const isProfit = item.instantProfit >= item.budget;
                                        const profitColor = isProfit ? '#10b981' : '#ef4444';
                                        return `
                                        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 0.8rem; font-size: 0.78rem; display: flex; flex-direction: column; gap: 0.4rem;">
                                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                                <span style="font-weight: 900; color: #fff; font-size: 0.82rem;">${item.name}</span>
                                                <span style="color: #fbbf24; font-weight: 900;">★ ${item.rating}/10</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; color: var(--text-dim); font-size: 0.72rem;">
                                                <span>${item.categoryLabel} &bull; ${item.genreLabel}</span>
                                                <span>${item.date || ''}</span>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 0.4rem; margin-top: 0.2rem;">
                                                <div>Budget: <span style="font-weight: 700; color: #fff;">$ ${formatCompact(item.budget)}</span></div>
                                                <div style="color: ${profitColor}; font-weight: 800;">
                                                    ${isProfit ? 'Laba' : 'Rugi'}: $ ${formatCompact(Math.abs(item.instantProfit - item.budget))}
                                                </div>
                                            </div>
                                        </div>
                                        `;
                                    }).join('')}
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Produce Content Event Handling
        const selectCategory = container.querySelector('#media-project-category');
        const sliderBudget = container.querySelector('#media-project-budget');
        const displayBudgetValue = container.querySelector('#budget-value-display');
        const guidelineBudget = container.querySelector('#media-budget-guideline');
        const inputName = container.querySelector('#media-project-name');

        const updateBudgetUI = () => {
            if (!selectCategory || !sliderBudget) return;
            const category = selectCategory.value;
            const catData = MEDIA_CATEGORIES[category];
            if (catData) {
                sliderBudget.min = catData.minBudget;
                sliderBudget.max = catData.recBudget * 4;
                
                // Set initial value to recommended budget if it's currently invalid
                const currentVal = parseInt(sliderBudget.value);
                if (currentVal < catData.minBudget || currentVal > sliderBudget.max) {
                    sliderBudget.value = catData.recBudget;
                }
                
                displayBudgetValue.textContent = `$ ${financeManager.formatCurrency(parseInt(sliderBudget.value))}`;
                guidelineBudget.innerHTML = `Min: <strong>$ ${financeManager.formatCurrency(catData.minBudget)}</strong> | Rekomendasi: <strong>$ ${financeManager.formatCurrency(catData.recBudget)}</strong>`;
            }
        };

        if (selectCategory) {
            selectCategory.addEventListener('change', updateBudgetUI);
        }
        if (sliderBudget) {
            sliderBudget.addEventListener('input', () => {
                displayBudgetValue.textContent = `$ ${financeManager.formatCurrency(parseInt(sliderBudget.value))}`;
            });
        }
        
        // Execute initial UI update
        updateBudgetUI();

        const btnProduce = container.querySelector('#btn-produce-content');
        if (btnProduce) {
            btnProduce.addEventListener('click', async () => {
                const name = inputName ? inputName.value.trim() : '';
                if (!name) {
                    ui.error('Harap masukkan nama film/konten yang ingin dirilis!');
                    return;
                }

                const category = selectCategory.value;
                const genre = container.querySelector('#media-project-genre').value;
                const budget = parseInt(sliderBudget.value);

                const confirmed = await ui.confirm({
                    title: 'Rilis Konten Baru?',
                    message: `Apakah Anda yakin ingin memproduksi <strong>"${name}"</strong> (${MEDIA_CATEGORIES[category].label}) dengan anggaran <strong>$ ${financeManager.formatCurrency(budget)}</strong>?`,
                    confirmText: 'Mulai Rilis'
                });

                if (confirmed) {
                    try {
                        businessManager.produceMediaContent(name, category, genre, budget);
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
