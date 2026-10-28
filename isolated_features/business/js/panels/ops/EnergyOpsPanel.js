/**
 * EnergyOpsPanel.js - Custom High-Fidelity Management Dashboard for Energy & Utilities Sector
 * Features slider-based target production and price control, capacity expansions,
 * and electrical grid power plant mix configuration.
 */

import gameState from '../../../core/GameState.js';
import financeManager from '../../../finance/FinanceManager.js';
import businessManager from '../../BusinessManager.js';
import ui from '../../../ui/UIManager.js';

export const EnergyOpsPanel = {
    render(biz) {
        const energy = businessManager.getEnergyState();
        if (!energy) return `<p class="text-muted" style="padding: 2rem; text-align: center;">Memuat data divisi energi & utilitas...</p>`;

        const capacities = energy.capacities || { oil: 100000, gas: 150000, coal: 200000, electricity: 120000 };
        const productionTargets = energy.productionTargets || { oil: 50, gas: 50, coal: 50, electricity: 50 };
        const prices = energy.prices || { oil: 15, gas: 12, coal: 8, electricity: 25 };
        const powerPlants = energy.powerPlants || { coal_pltu: 40, gas_pltg: 30, oil_pltd: 10, renewable_nuclear: 20 };
        const marketDemand = energy.marketDemand || { oil: 1.0, gas: 1.0, coal: 1.0, electricity: 1.0 };
        const lastTick = energy.lastTickInfo || {
            oilConsumed: 0, gasConsumed: 0, coalConsumed: 0,
            oilPurchased: 0, gasPurchased: 0, coalPurchased: 0,
            oilDeficitCost: 0, gasDeficitCost: 0, coalDeficitCost: 0
        };

        const basePrices = { oil: 15, gas: 12, coal: 8, electricity: 25 };
        const costMap = { oil: 100000, gas: 80000, coal: 60000, electricity: 150000 };
        const incrementMap = { oil: 50000, gas: 50000, coal: 100000, electricity: 50000 };

        // Realtime estimates
        let totalEstRevenue = 0;
        let totalEstMaintenance = 0;
        const actualOutputs = {};

        // Calculate outputs
        for (const type of ['oil', 'gas', 'coal', 'electricity']) {
            const cap = capacities[type];
            const target = productionTargets[type];
            let erpModifier = 1.0;
            if (biz.operations?.production === 'jit') erpModifier *= 1.15;
            if (biz.operations?.production === 'batch') erpModifier *= 1.05;

            actualOutputs[type] = Math.round(cap * (target / 100) * erpModifier);
        }

        // Electricity consumption simulation for preview
        const electProd = actualOutputs['electricity'];
        const estCoalNeeded = Math.round(electProd * (powerPlants.coal_pltu / 100) * 0.5);
        const estGasNeeded = Math.round(electProd * (powerPlants.gas_pltg / 100) * 0.4);
        const estOilNeeded = Math.round(electProd * (powerPlants.oil_pltd / 100) * 0.3);

        const estOilDeficit = Math.max(0, estOilNeeded - actualOutputs['oil']);
        const estGasDeficit = Math.max(0, estGasNeeded - actualOutputs['gas']);
        const estCoalDeficit = Math.max(0, estCoalNeeded - actualOutputs['coal']);

        const previewMarketPrice = (type) => basePrices[type] * marketDemand[type];
        const estOilDeficitCost = Math.round(estOilDeficit * previewMarketPrice('oil') * 1.3);
        const estGasDeficitCost = Math.round(estGasDeficit * previewMarketPrice('gas') * 1.3);
        const estCoalDeficitCost = Math.round(estCoalDeficit * previewMarketPrice('coal') * 1.3);

        const estDeficitCost = estOilDeficitCost + estGasDeficitCost + estCoalDeficitCost;

        // Sale volumes
        const saleVolumes = {
            oil: Math.max(0, actualOutputs['oil'] - estOilNeeded),
            gas: Math.max(0, actualOutputs['gas'] - estGasNeeded),
            coal: Math.max(0, actualOutputs['coal'] - estCoalNeeded),
            electricity: electProd
        };

        // Revenue & Maint calculation
        for (const type of ['oil', 'gas', 'coal', 'electricity']) {
            const playerPrice = prices[type];
            const currentMarketPrice = previewMarketPrice(type);
            const volume = saleVolumes[type];

            let soldPercent = 1.0;
            if (playerPrice > currentMarketPrice) {
                soldPercent = Math.max(0, 1 - (playerPrice - currentMarketPrice) / (currentMarketPrice * 0.8));
            }
            totalEstRevenue += volume * soldPercent * playerPrice;

            // Maintenance
            const cap = capacities[type];
            const targetPercent = productionTargets[type];
            let baseRate = 0.04;
            let utilRate = 0.02;
            if (type === 'electricity') {
                const fossilRatio = (powerPlants.coal_pltu + powerPlants.gas_pltg + powerPlants.oil_pltd) / 100;
                baseRate = (fossilRatio * 0.06) + ((1 - fossilRatio) * 0.02);
                utilRate = (fossilRatio * 0.04) + ((1 - fossilRatio) * 0.01);
            }
            totalEstMaintenance += (cap * baseRate) + ((targetPercent / 100) * cap * utilRate);
        }

        if (biz.initiatives?.energy_renewable) {
            totalEstRevenue += totalEstRevenue * 0.15;
        }
        if (biz.initiatives?.energy_smart_grid) {
            totalEstMaintenance *= 0.85;
        }

        const estNetProfit = Math.round(totalEstRevenue - totalEstMaintenance - estDeficitCost);

        // Grid Green Ratio
        const greenRatio = powerPlants.renewable_nuclear;

        // Resource details
        const resourceTypes = [
            { id: 'oil', name: 'Minyak Bumi', icon: '🛢️', unit: 'barrel', color: '#f59e0b' },
            { id: 'gas', name: 'Gas Alam', icon: '🔥', unit: 'MMBtu', color: '#3b82f6' },
            { id: 'coal', name: 'Batu Bara', icon: '🪨', unit: 'ton', color: '#9ca3af' },
            { id: 'electricity', name: 'Listrik & Grid', icon: '⚡', unit: 'MWh', color: '#10b981' }
        ];

        let commoditiesHtml = resourceTypes.map(res => {
            const cap = capacities[res.id];
            const target = productionTargets[res.id];
            const price = prices[res.id];
            const mktPrice = previewMarketPrice(res.id);
            const actualOut = actualOutputs[res.id];
            const upgradeCost = costMap[res.id];
            const upgradeInc = incrementMap[res.id];

            // Specific info for fossil inputs / electric outputs
            let consumptionInfo = '';
            if (res.id === 'electricity') {
                consumptionInfo = `
                    <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem;">
                        Estimasi Kebutuhan Bahan Grid:<br>
                        🛢️ Minyak: <strong>${estOilNeeded.toLocaleString()}</strong> |
                        🔥 Gas: <strong>${estGasNeeded.toLocaleString()}</strong> |
                        🪨 Batubara: <strong>${estCoalNeeded.toLocaleString()}</strong>
                    </div>
                `;
            } else {
                const consumed = res.id === 'oil' ? estOilNeeded : res.id === 'gas' ? estGasNeeded : estCoalNeeded;
                const deficit = res.id === 'oil' ? estOilDeficit : res.id === 'gas' ? estGasDeficit : estCoalDeficit;
                const deficitCost = res.id === 'oil' ? estOilDeficitCost : res.id === 'gas' ? estGasDeficitCost : estCoalDeficitCost;
                
                consumptionInfo = `
                    <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem;">
                        Dikonsumsi Grid Listrik: <strong>${consumed.toLocaleString()} ${res.unit}</strong><br>
                        ${deficit > 0 ? `<span style="color: #ef4444;">⚠️ Defisit: ${deficit.toLocaleString()} ${res.unit} (Impor: +$ ${deficitCost.toLocaleString()})</span>` : `<span style="color: #10b981;">✓ Mandiri (Sisa Jual: ${(actualOut - consumed).toLocaleString()} ${res.unit})</span>`}
                    </div>
                `;
            }

            return `
                <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.01);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <div>
                            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 0.4rem;">
                                <span style="color: ${res.color};">${res.icon}</span> ${res.name}
                            </h3>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">
                                Kapasitas: <strong>${cap.toLocaleString()} ${res.unit}/bln</strong>
                            </span>
                        </div>
                        <button class="btn btn-primary btn-sm btn-upgrade-capacity" data-type="${res.id}" style="padding: 4px 10px; font-size: 0.65rem; font-weight: 800; border-radius: 4px;">
                            🚀 Upgrade (+${upgradeInc.toLocaleString()} u, $ ${upgradeCost.toLocaleString()})
                        </button>
                    </div>

                    <!-- Slider 1: Production Target -->
                    <div style="margin-bottom: 1.25rem;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px; color: var(--text-muted);">
                            <span>Target Produksi: <strong>${target}%</strong></span>
                            <span style="color: #fff; font-weight: 800;">${actualOut.toLocaleString()} ${res.unit}</span>
                        </div>
                        <input type="range" class="slider-prod" data-type="${res.id}" min="0" max="100" value="${target}" style="width: 100%; cursor: pointer;">
                    </div>

                    <!-- Slider 2: Selling Price -->
                    <div style="margin-bottom: 0.5rem;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 4px; color: var(--text-muted);">
                            <span>Harga Jual: <strong style="color: #fff;">$ ${price}/unit</strong></span>
                            <span>Pasar: $ ${mktPrice.toFixed(1)}/unit</span>
                        </div>
                        <input type="range" class="slider-price" data-type="${res.id}" min="1" max="${Math.round(mktPrice * 2.5)}" value="${price}" style="width: 100%; cursor: pointer;">
                    </div>

                    ${consumptionInfo}
                </div>
            `;
        }).join('');

        return `
            <div class="energy-tab-wrapper" style="animation: fadeIn 0.3s ease-out;">
                <!-- Row 1: Energy Grid Stats Widgets -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="card" style="border-left: 4px solid ${estNetProfit >= 0 ? '#10b981' : '#ef4444'}; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Estimasi Hasil Bersih Bulanan</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: ${estNetProfit >= 0 ? '#10b981' : '#ef4444'};">
                            ${estNetProfit >= 0 ? '+' : ''}$ ${estNetProfit.toLocaleString()}
                        </div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">
                            Pendapatan: $ ${Math.round(totalEstRevenue).toLocaleString()} | Biaya: $ ${Math.round(totalEstMaintenance).toLocaleString()}
                        </div>
                    </div>
                    
                    <div class="card" style="border-left: 4px solid #3b82f6; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Konsumsi & Impor Bahan Mentah</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #fff;">
                            -$ ${estDeficitCost.toLocaleString()}
                        </div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">
                            Membeli batubara/gas/minyak pasar karena suplai kurang
                        </div>
                    </div>

                    <div class="card" style="border-left: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.65rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Grid Bauran Energi Hijau</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #10b981;">${greenRatio}%</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-dim);">
                            Mengurangi konsumsi bahan mentah batubara, minyak, & gas
                        </div>
                    </div>
                </div>

                <!-- Main Layout: Left Commodities, Right Power Plant Mix -->
                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem;">
                    
                    <!-- Left: Sliders Grid -->
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <h3 style="margin: 0; font-size: 1.1rem; font-weight: 900; color: #fff;">📊 Kontrol Suplai & Harga Energi</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            ${commoditiesHtml}
                        </div>
                    </div>

                    <!-- Right: Power Plant Mix Configuration -->
                    <div class="card" style="padding: 1.5rem; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 1.25rem;">
                        <h3 style="margin-top: 0; font-size: 1.1rem; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                            <span>🔌</span> Konfigurasi Bauran Pembangkit Listrik (Power Grid Mix)
                        </h3>
                        <p class="text-muted" style="font-size: 0.75rem; margin: 0; line-height: 1.4;">
                            Tentukan bauran teknologi pembangkit listrik dalam grid Anda. Pembangkit berbahan fosil membutuhkan bahan bakar mentah, sementara pembangkit terbarukan (angin, solar) & nuklir 100% bebas bahan baku. <strong>Total alokasi bauran harus tepat 100%!</strong>
                        </p>

                        <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem;">
                            <!-- Coal PLTU -->
                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
                                    <span>🪨 PLTU Batubara</span>
                                    <span style="font-weight: 800; color: #fff;"><span id="val-mix-coal">${powerPlants.coal_pltu}</span>%</span>
                                </div>
                                <input type="range" class="mix-slider" data-mix="coal_pltu" min="0" max="100" value="${powerPlants.coal_pltu}" style="width: 100%; cursor: pointer;">
                            </div>

                            <!-- Gas PLTG -->
                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
                                    <span>🔥 PLTG Gas Alam</span>
                                    <span style="font-weight: 800; color: #fff;"><span id="val-mix-gas">${powerPlants.gas_pltg}</span>%</span>
                                </div>
                                <input type="range" class="mix-slider" data-mix="gas_pltg" min="0" max="100" value="${powerPlants.gas_pltg}" style="width: 100%; cursor: pointer;">
                            </div>

                            <!-- Oil PLTD -->
                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
                                    <span>🛢️ PLTD Diesel Minyak</span>
                                    <span style="font-weight: 800; color: #fff;"><span id="val-mix-oil">${powerPlants.oil_pltd}</span>%</span>
                                </div>
                                <input type="range" class="mix-slider" data-mix="oil_pltd" min="0" max="100" value="${powerPlants.oil_pltd}" style="width: 100%; cursor: pointer;">
                            </div>

                            <!-- Renewable & Nuclear -->
                            <div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
                                    <span>🍃 PLTB/A/N Terbarukan & Nuklir</span>
                                    <span style="font-weight: 800; color: #10b981;"><span id="val-mix-renewable">${powerPlants.renewable_nuclear}</span>%</span>
                                </div>
                                <input type="range" class="mix-slider" data-mix="renewable_nuclear" min="0" max="100" value="${powerPlants.renewable_nuclear}" style="width: 100%; cursor: pointer;">
                            </div>
                        </div>

                        <div style="background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); text-align: center;">
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Akumulasi Alokasi Grid:</div>
                            <div style="font-size: 1.5rem; font-weight: 900; color: #fff;" id="mix-total-display">100%</div>
                        </div>

                        <button class="btn btn-primary" id="btn-save-mix" style="font-weight: 800; padding: 10px; border-radius: 6px; cursor: pointer;">
                            💾 Simpan Konfigurasi Grid
                        </button>
                    </div>

                </div>
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Upgrade Capacity
        container.querySelectorAll('.btn-upgrade-capacity').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                try {
                    businessManager.upgradeEnergyCapacity(type);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });

        // Sliders change event for Target Production
        container.querySelectorAll('.slider-prod').forEach(slider => {
            slider.addEventListener('change', () => {
                const type = slider.dataset.type;
                const value = slider.value;
                businessManager.updateEnergySlider(type, 'production', value);
                if (parentPage) parentPage.render();
            });
        });

        // Sliders change event for Selling Price
        container.querySelectorAll('.slider-price').forEach(slider => {
            slider.addEventListener('change', () => {
                const type = slider.dataset.type;
                const value = slider.value;
                businessManager.updateEnergySlider(type, 'price', value);
                if (parentPage) parentPage.render();
            });
        });

        // Mix Sliders live update validation
        const mixSliders = container.querySelectorAll('.mix-slider');
        const mixTotalDisplay = container.querySelector('#mix-total-display');
        const btnSaveMix = container.querySelector('#btn-save-mix');

        const updateMixDisplay = () => {
            let total = 0;
            mixSliders.forEach(slider => {
                const val = parseInt(slider.value);
                total += val;
                
                // Update live text labels
                const mixType = slider.dataset.mix;
                if (mixType === 'coal_pltu') container.querySelector('#val-mix-coal').textContent = val;
                else if (mixType === 'gas_pltg') container.querySelector('#val-mix-gas').textContent = val;
                else if (mixType === 'oil_pltd') container.querySelector('#val-mix-oil').textContent = val;
                else if (mixType === 'renewable_nuclear') container.querySelector('#val-mix-renewable').textContent = val;
            });

            if (mixTotalDisplay) {
                mixTotalDisplay.textContent = `${total}%`;
                if (total === 100) {
                    mixTotalDisplay.style.color = '#10b981';
                    btnSaveMix.disabled = false;
                    btnSaveMix.style.opacity = '1';
                } else {
                    mixTotalDisplay.style.color = '#ef4444';
                    btnSaveMix.disabled = true;
                    btnSaveMix.style.opacity = '0.5';
                }
            }
        };

        mixSliders.forEach(slider => {
            slider.addEventListener('input', updateMixDisplay);
        });

        // Save Mix configuration
        if (btnSaveMix) {
            btnSaveMix.addEventListener('click', () => {
                const mix = {};
                let total = 0;
                mixSliders.forEach(slider => {
                    const val = parseInt(slider.value);
                    mix[slider.dataset.mix] = val;
                    total += val;
                });

                if (total !== 100) {
                    ui.error(`Bauran transmisi grid saat ini adalah ${total}%. Total alokasi harus tepat 100%!`);
                    return;
                }

                try {
                    businessManager.updateEnergyPowerPlantMix(mix);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }
    }
};

export default EnergyOpsPanel;
