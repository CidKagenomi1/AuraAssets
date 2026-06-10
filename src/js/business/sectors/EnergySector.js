/**
 * EnergySector.js - Core Energy, Utilities, & Fossil/Green Operations Simulator Engine
 * Refactored to support slider-based supply and price controls for Oil, Gas, Coal, and Electricity.
 * Integrates power plant mix mechanics affecting fossil fuel demands.
 */

import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';

export const EnergySector = {
    getEnergyState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.energy || biz.energy.refineries || biz.energy.explorations) {
            // Re-initialize or migrate to new slider + mix system
            biz.energy = {
                capacities: { oil: 100000, gas: 150000, coal: 200000, electricity: 120000 },
                productionTargets: { oil: 50, gas: 50, coal: 50, electricity: 50 },
                prices: { oil: 15, gas: 12, coal: 8, electricity: 25 },
                powerPlants: {
                    coal_pltu: 40,
                    gas_pltg: 30,
                    oil_pltd: 10,
                    renewable_nuclear: 20
                },
                marketDemand: { oil: 1.0, gas: 1.0, coal: 1.0, electricity: 1.0 },
                lastTickInfo: {
                    oilConsumed: 0,
                    gasConsumed: 0,
                    coalConsumed: 0,
                    oilPurchased: 0,
                    gasPurchased: 0,
                    coalPurchased: 0,
                    oilDeficitCost: 0,
                    gasDeficitCost: 0,
                    coalDeficitCost: 0
                }
            };
            gameState.update('business', b => ({ ...b, energy: biz.energy }));
        }
        return biz.energy;
    },

    upgradeCapacity(type, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const energy = this.getEnergyState(manager);
        
        const costMap = {
            oil: 100000,
            gas: 80000,
            coal: 60000,
            electricity: 150000
        };
        const incrementMap = {
            oil: 50000,
            gas: 50000,
            coal: 100000,
            electricity: 50000
        };

        const cost = costMap[type] || 100000;
        const inc = incrementMap[type] || 50000;

        if (biz.cash < cost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk melakukan ekspansi kapasitas ${type} ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(cost)})`);
        }

        biz.cash -= cost;
        energy.capacities[type] = (energy.capacities[type] || 0) + inc;
        biz.valuation += cost * 1.5;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            energy: energy
        }));

        ui.success(`Kapasitas produksi ${type.toUpperCase()} berhasil diekspansi sebesar +${inc.toLocaleString('id-ID')} unit!`, '⚡ Ekspansi Sukses');
        return true;
    },

    updatePowerPlantMix(mix, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const energy = this.getEnergyState(manager);

        const total = Object.values(mix).reduce((a, b) => a + b, 0);
        if (Math.abs(total - 100) > 0.1) {
            throw new Error('Total persentase bauran pembangkit harus tepat 100%!');
        }

        energy.powerPlants = { ...mix };
        gameState.update('business', b => ({ ...b, energy }));
        ui.success('Konfigurasi bauran pembangkit grid listrik berhasil diperbarui!', '⚡ Bauran Diperbarui');
        return true;
    },

    updateSlider(type, field, value, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;
        const energy = this.getEnergyState(manager);

        if (field === 'production') {
            energy.productionTargets[type] = Math.max(0, Math.min(100, parseInt(value)));
        } else if (field === 'price') {
            energy.prices[type] = Math.max(1, parseFloat(value));
        }

        gameState.update('business', b => ({ ...b, energy }));
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const energy = this.getEnergyState(manager);
        if (!energy) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Demand Fluctuation (between 0.80 and 1.25)
        energy.marketDemand.oil = parseFloat((0.80 + Math.random() * 0.45).toFixed(2));
        energy.marketDemand.gas = parseFloat((0.80 + Math.random() * 0.45).toFixed(2));
        energy.marketDemand.coal = parseFloat((0.80 + Math.random() * 0.45).toFixed(2));
        energy.marketDemand.electricity = parseFloat((0.80 + Math.random() * 0.45).toFixed(2));

        const baseMarketPrice = { oil: 15, gas: 12, coal: 8, electricity: 25 };

        // Calculate actual production outputs
        const prodOutputs = {};
        for (const type of ['oil', 'gas', 'coal', 'electricity']) {
            const cap = energy.capacities[type] || 100000;
            const targetPercent = energy.productionTargets[type] || 0;
            
            let erpModifier = 1.0;
            if (ops.production === 'jit') erpModifier *= 1.15;
            if (ops.production === 'batch') erpModifier *= 1.05;

            prodOutputs[type] = Math.round(cap * (targetPercent / 100) * erpModifier);
        }

        // 2. Electricity Production dependency on natural resources
        const electProd = prodOutputs['electricity'];
        const plants = energy.powerPlants || { coal_pltu: 40, gas_pltg: 30, oil_pltd: 10, renewable_nuclear: 20 };

        const coalNeeded = Math.round(electProd * (plants.coal_pltu / 100) * 0.5);
        const gasNeeded = Math.round(electProd * (plants.gas_pltg / 100) * 0.4);
        const oilNeeded = Math.round(electProd * (plants.oil_pltd / 100) * 0.3);

        // Own production vs consumption
        const oilDeficit = Math.max(0, oilNeeded - prodOutputs['oil']);
        const gasDeficit = Math.max(0, gasNeeded - prodOutputs['gas']);
        const coalDeficit = Math.max(0, coalNeeded - prodOutputs['coal']);

        // Available supply left for direct sale
        const saleVolumes = {
            oil: Math.max(0, prodOutputs['oil'] - oilNeeded),
            gas: Math.max(0, prodOutputs['gas'] - gasNeeded),
            coal: Math.max(0, prodOutputs['coal'] - coalNeeded),
            electricity: electProd
        };

        // Purchase costs for deficits (at market prices + 30% import premium markup)
        const marketPriceNow = (type) => baseMarketPrice[type] * energy.marketDemand[type];
        const oilCostDeficit = Math.round(oilDeficit * marketPriceNow('oil') * 1.3);
        const gasCostDeficit = Math.round(gasDeficit * marketPriceNow('gas') * 1.3);
        const coalCostDeficit = Math.round(coalDeficit * marketPriceNow('coal') * 1.3);

        const totalDeficitPurchaseCost = oilCostDeficit + gasCostDeficit + coalCostDeficit;

        // Save tick details
        energy.lastTickInfo = {
            oilConsumed: oilNeeded,
            gasConsumed: gasNeeded,
            coalConsumed: coalNeeded,
            oilPurchased: oilDeficit,
            gasPurchased: gasDeficit,
            coalPurchased: coalDeficit,
            oilDeficitCost: oilCostDeficit,
            gasDeficitCost: gasCostDeficit,
            coalDeficitCost: coalDeficitCost
        };

        // 3. Sales revenue calculation based on player price elasticity vs market
        let totalRevenue = 0;
        for (const type of ['oil', 'gas', 'coal', 'electricity']) {
            const playerPrice = energy.prices[type] || baseMarketPrice[type];
            const currentMarketPrice = marketPriceNow(type);
            const volume = saleVolumes[type];

            let soldPercent = 1.0;
            if (playerPrice > currentMarketPrice) {
                soldPercent = Math.max(0, 1 - (playerPrice - currentMarketPrice) / (currentMarketPrice * 0.8));
            }
            
            const soldQty = volume * soldPercent;
            totalRevenue += soldQty * playerPrice;
        }

        if (initiatives.energy_renewable) {
            totalRevenue += totalRevenue * 0.15;
        }

        // 4. Maintenance / Operations costs
        let totalMaintenance = 0;
        for (const type of ['oil', 'gas', 'coal', 'electricity']) {
            const cap = energy.capacities[type] || 100000;
            const targetPercent = energy.productionTargets[type] || 0;

            let baseRate = 0.04;
            let utilRate = 0.02;

            if (type === 'electricity') {
                const fossilRatio = (plants.coal_pltu + plants.gas_pltg + plants.oil_pltd) / 100;
                baseRate = (fossilRatio * 0.06) + ((1 - fossilRatio) * 0.02);
                utilRate = (fossilRatio * 0.04) + ((1 - fossilRatio) * 0.01);
            }

            totalMaintenance += (cap * baseRate) + ((targetPercent / 100) * cap * utilRate);
        }

        if (initiatives.energy_smart_grid) {
            totalMaintenance *= 0.85;
        }

        // Save updated energy state
        gameState.update('business', b => ({
            ...b,
            energy: energy
        }));

        const totalCost = Math.round(totalMaintenance + totalDeficitPurchaseCost);

        return {
            wages: 0,
            cost: totalCost,
            revenue: Math.round(totalRevenue)
        };
    }
};

export default EnergySector;
