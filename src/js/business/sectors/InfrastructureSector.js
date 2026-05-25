/**
 * InfrastructureSector.js - Core Real Estate Development & Infrastructure Operations Simulator Engine
 * Encapsulates land research, zoning developments (Commercial, Residential, Industrial),
 * construction metrics, and monthly lease/rental income.
 */

import gameState from '../../game/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../game/GlobalEconomy.js';

export const InfrastructureSector = {
    getInfrastructureState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.infrastructure) {
            biz.infrastructure = {
                discoveredLands: [
                    { id: 'land_init_1', name: 'Kavling BSD City Blok A', price: 90000, multiplier: 1.2, status: 'available' },
                    { id: 'land_init_2', name: 'Kavling Sudirman Central', price: 180000, multiplier: 2.2, status: 'available' }
                ],
                developments: [
                    { id: 'dev_init_1', name: 'Kawasan Hunian Bintaro', zone: 'Pemukiman', buildCost: 100000, revenue: 10800, maintenance: 1440 }
                ],
                demandFluctuation: 1.0,
                surveyCost: 15000
            };
            gameState.update('business', b => ({ ...b, infrastructure: biz.infrastructure }));
        }
        return biz.infrastructure;
    },

    generateRandomLands(count) {
        const locations = ['BSD City', 'Menteng', 'Karawang Barat', 'PIK 2', 'Surabaya Barat', 'Cikarang Selatan', 'Sentul Hills', 'Jimbaran Hills'];
        const names = ['Kavling ', 'Lahan Strategis ', 'Area Ekspansi ', 'Tanah Lapang ', 'Blok Prospektif '];
        
        const lands = [];
        for (let i = 0; i < count; i++) {
            const loc = locations[Math.floor(Math.random() * locations.length)];
            const suffix = names[Math.floor(Math.random() * names.length)];
            const name = suffix + loc;
            
            const multiplier = parseFloat((0.8 + Math.random() * 1.6).toFixed(2)); // 0.8x to 2.4x
            const price = Math.round((60000 + Math.random() * 80000) * multiplier);

            lands.push({
                id: 'land_' + Math.random().toString(36).substr(2, 9),
                name,
                price,
                multiplier,
                status: 'available'
            });
        }
        return lands;
    },

    surveyLand(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const infra = this.getInfrastructureState(manager);
        
        const cost = infra.surveyCost;
        if (biz.cash < cost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk melakukan riset lahan ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(cost)})`);
        }

        biz.cash -= cost;
        const newLands = this.generateRandomLands(2);
        infra.discoveredLands = [...(infra.discoveredLands || []), ...newLands];

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            infrastructure: infra
        }));

        ui.success(`Riset geologis selesai! Ditemukan 2 prospek lahan mentah baru untuk dikembangkan.`, '🔍 Riset Lahan Sukses');
        return true;
    },

    developLand(landId, zoneType, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const infra = this.getInfrastructureState(manager);

        const index = infra.discoveredLands.findIndex(l => l.id === landId);
        if (index === -1) throw new Error('Prospek lahan tidak ditemukan!');

        const land = infra.discoveredLands[index];
        const mult = land.multiplier;

        let buildCost = 0;
        let baseRevenue = 0;
        let baseMaint = 0;
        let displayZone = '';

        if (zoneType === 'commercial') {
            displayZone = 'Area Komersial';
            buildCost = Math.round(120000 * mult);
            baseRevenue = Math.round(15000 * mult);
            baseMaint = Math.round(2500 * mult);
        } else if (zoneType === 'residential') {
            displayZone = 'Pemukiman';
            buildCost = Math.round(80000 * mult);
            baseRevenue = Math.round(9000 * mult);
            baseMaint = Math.round(1200 * mult);
        } else if (zoneType === 'industrial') {
            displayZone = 'Industri';
            buildCost = Math.round(200000 * mult);
            baseRevenue = Math.round(28000 * mult);
            baseMaint = Math.round(5500 * mult);
        } else {
            throw new Error('Zona pembangunan tidak valid!');
        }

        const totalAcquisitionCost = land.price + buildCost;

        if (biz.cash < totalAcquisitionCost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk mengakuisisi & membangun lahan ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(totalAcquisitionCost)})`);
        }

        biz.cash -= totalAcquisitionCost;

        // Add to active developments
        const newDevelopment = {
            id: 'dev_' + Math.random().toString(36).substr(2, 9),
            name: land.name.replace('Kavling ', '').replace('Lahan Strategis ', ''),
            zone: displayZone,
            buildCost: totalAcquisitionCost,
            revenue: baseRevenue,
            maintenance: baseMaint
        };

        infra.developments.push(newDevelopment);
        infra.discoveredLands.splice(index, 1); // remove from available land list

        // Valuation boost
        biz.valuation += totalAcquisitionCost * 1.5;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            infrastructure: infra
        }));

        ui.success(`Lahan "${newDevelopment.name}" resmi dikembangkan menjadi "${displayZone}"!`, '🏗️ Konstruksi Selesai');
        return true;
    },

    decommissionDevelopment(devId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const infra = this.getInfrastructureState(manager);

        const index = infra.developments.findIndex(d => d.id === devId);
        if (index === -1) throw new Error('Properti pembangunan tidak ditemukan!');

        const dev = infra.developments[index];
        const sellValue = Math.round(dev.buildCost * 0.60); // 60% liquidation value
        
        biz.cash += sellValue;
        infra.developments.splice(index, 1);

        biz.valuation = Math.max(0, biz.valuation - (dev.buildCost * 1.5));

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            infrastructure: infra
        }));

        ui.success(`Properti "${dev.name}" berhasil dijual seharga $ ${sellValue.toLocaleString()}!`, '💰 Properti Likuid');
        return true;
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const infra = this.getInfrastructureState(manager);
        if (!infra) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Demand Fluctuation (between 0.80 and 1.30)
        const econMult = globalEconomy.getDemandMultiplier('infrastructure');
        const randDev = (Math.random() - 0.5) * 0.15;
        infra.demandFluctuation = parseFloat(Math.max(0.6, Math.min(2.0, econMult + randDev)).toFixed(2));

        // 2. Compute Developments Financials
        let totalRevenue = 0;
        let totalMaintenance = 0;

        infra.developments.forEach(dev => {
            const revRate = dev.revenue;
            const maintRate = dev.maintenance;
            
            // Adjust calculations by ERP and demand
            let erpModifier = 1.0;
            if (ops.production === 'jit') erpModifier *= 1.10;
            if (ops.production === 'batch') erpModifier *= 1.05;
            
            totalRevenue += revRate * erpModifier * infra.demandFluctuation;
            totalMaintenance += maintRate;
        });

        // 3. Initiative Multiplier adjustments
        let initiativeRevBoost = 0;
        if (initiatives.infra_leed) {
            initiativeRevBoost += totalRevenue * 0.15; // +15% revenue green boost
            totalMaintenance *= 0.90; // -10% maintenance
        }
        if (initiatives.infra_precast) {
            totalMaintenance *= 0.95; // -5% maintenance
        }

        totalRevenue += initiativeRevBoost;

        if (initiatives.infra_township) {
            totalRevenue += 12000; // Flat monthly community rental revenue
        }

        // 4. Save state back
        gameState.update('business', b => ({
            ...b,
            infrastructure: infra
        }));

        return {
            wages: 0,
            cost: Math.round(totalMaintenance),
            revenue: Math.round(totalRevenue)
        };
    }
};

export default InfrastructureSector;
