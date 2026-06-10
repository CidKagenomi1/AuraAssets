/**
 * PropertySector.js - Core Real Estate Development & Property Operations Simulator Engine
 * Encapsulates land research, zoning developments (Commercial, Residential, Industrial),
 * construction metrics, and monthly lease/rental income.
 */

import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../core/GlobalEconomy.js';

export const PropertySector = {
    getPropertyState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.property) {
            biz.property = {
                discoveredLands: [
                    { id: 'land_init_1', name: 'Kavling BSD City Blok A', price: 90000, pricePerSqm: 90, multiplier: 1.2, status: 'available' },
                    { id: 'land_init_2', name: 'Kavling Sudirman Central', price: 180000, pricePerSqm: 180, multiplier: 2.2, status: 'available' }
                ],
                developments: [
                    { id: 'dev_init_1', name: 'Kawasan Hunian Bintaro', zone: 'Pemukiman', sqm: 1000, buildCost: 100000, revenue: 10800, maintenance: 1440 }
                ],
                demandFluctuation: 1.0,
                surveyCost: 15000
            };
            gameState.update('business', b => ({ ...b, property: biz.property }));
        }
        return biz.property;
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
            const pricePerSqm = Math.round((60 + Math.random() * 80) * multiplier);
            const price = pricePerSqm * 1000; // default/base price for 1000 m²

            lands.push({
                id: 'land_' + Math.random().toString(36).substr(2, 9),
                name,
                price,
                pricePerSqm,
                multiplier,
                status: 'available'
            });
        }
        return lands;
    },

    surveyLand(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const prop = this.getPropertyState(manager);
        
        const cost = prop.surveyCost;
        if (biz.cash < cost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk melakukan riset lahan ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(cost)})`);
        }

        biz.cash -= cost;
        const newLands = this.generateRandomLands(2);
        prop.discoveredLands = [...(prop.discoveredLands || []), ...newLands];

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            property: prop
        }));

        ui.success(`Riset geologis selesai! Ditemukan 2 prospek lahan mentah baru untuk dikembangkan.`, '🔍 Riset Lahan Sukses');
        return true;
    },

    developLand(landId, zoneType, sqm, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const prop = this.getPropertyState(manager);

        const index = prop.discoveredLands.findIndex(l => l.id === landId);
        if (index === -1) throw new Error('Prospek lahan tidak ditemukan!');

        const land = prop.discoveredLands[index];
        const mult = land.multiplier;

        const pricePerSqm = land.pricePerSqm || Math.round(land.price / 1000) || 90;
        const landPrice = Math.round(pricePerSqm * sqm);

        let buildCost = 0;
        let baseRevenue = 0;
        let baseMaint = 0;
        let displayZone = '';

        if (zoneType === 'commercial') {
            displayZone = 'Area Komersial';
            buildCost = Math.round(120 * sqm * mult);
            baseRevenue = Math.round(15 * sqm * mult);
            baseMaint = Math.round(2.5 * sqm * mult);
        } else if (zoneType === 'residential') {
            displayZone = 'Pemukiman';
            buildCost = Math.round(80 * sqm * mult);
            baseRevenue = Math.round(9 * sqm * mult);
            baseMaint = Math.round(1.2 * sqm * mult);
        } else if (zoneType === 'industrial') {
            displayZone = 'Industri';
            buildCost = Math.round(200 * sqm * mult);
            baseRevenue = Math.round(28 * sqm * mult);
            baseMaint = Math.round(5.5 * sqm * mult);
        } else {
            throw new Error('Zona pembangunan tidak valid!');
        }

        const totalAcquisitionCost = landPrice + buildCost;

        if (biz.cash < totalAcquisitionCost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk mengakuisisi & membangun lahan ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(totalAcquisitionCost)})`);
        }

        biz.cash -= totalAcquisitionCost;

        // Add to active developments
        const newDevelopment = {
            id: 'dev_' + Math.random().toString(36).substr(2, 9),
            name: land.name.replace('Kavling ', '').replace('Lahan Strategis ', ''),
            zone: displayZone,
            sqm: sqm,
            buildCost: totalAcquisitionCost,
            revenue: baseRevenue,
            maintenance: baseMaint
        };

        prop.developments.push(newDevelopment);
        prop.discoveredLands.splice(index, 1); // remove from available land list

        // Valuation boost
        biz.valuation += totalAcquisitionCost * 1.5;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            property: prop
        }));

        ui.success(`Lahan "${newDevelopment.name}" (${sqm.toLocaleString()} m²) resmi dikembangkan menjadi "${displayZone}"!`, '🏗️ Konstruksi Selesai');
        return true;
    },

    decommissionDevelopment(devId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const prop = this.getPropertyState(manager);

        const index = prop.developments.findIndex(d => d.id === devId);
        if (index === -1) throw new Error('Properti pembangunan tidak ditemukan!');

        const dev = prop.developments[index];
        const sellValue = Math.round(dev.buildCost * 0.60); // 60% liquidation value
        
        biz.cash += sellValue;
        prop.developments.splice(index, 1);

        biz.valuation = Math.max(0, biz.valuation - (dev.buildCost * 1.5));

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            property: prop
        }));

        ui.success(`Properti "${dev.name}" berhasil dijual seharga $ ${sellValue.toLocaleString()}!`, '💰 Properti Likuid');
        return true;
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const prop = this.getPropertyState(manager);
        if (!prop) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Demand Fluctuation (between 0.80 and 1.30)
        const econMult = globalEconomy.getDemandMultiplier('property') || 1.0;
        const randDev = (Math.random() - 0.5) * 0.15;
        prop.demandFluctuation = parseFloat(Math.max(0.6, Math.min(2.0, econMult + randDev)).toFixed(2));

        // 2. Compute Developments Financials
        let totalRevenue = 0;
        let totalMaintenance = 0;

        prop.developments.forEach(dev => {
            const revRate = dev.revenue;
            const maintRate = dev.maintenance;
            
            // Adjust calculations by ERP and demand
            let erpModifier = 1.0;
            if (ops.production === 'jit') erpModifier *= 1.10;
            if (ops.production === 'batch') erpModifier *= 1.05;
            
            totalRevenue += revRate * erpModifier * prop.demandFluctuation;
            totalMaintenance += maintRate;
        });

        // 3. Initiative adjustments
        let initiativeRevBoost = 0;
        if (initiatives.prop_green_cert) {
            initiativeRevBoost += totalRevenue * 0.15; // +15% revenue green boost
            totalMaintenance *= 0.90; // -10% maintenance
        }
        if (initiatives.prop_modular) {
            totalMaintenance *= 0.95; // -5% maintenance
        }

        totalRevenue += initiativeRevBoost;

        if (initiatives.prop_township) {
            totalRevenue += 12000; // Flat monthly community rental revenue
        }

        // 4. Save state back
        gameState.update('business', b => ({
            ...b,
            property: prop
        }));

        return {
            wages: 0,
            cost: Math.round(totalMaintenance),
            revenue: Math.round(totalRevenue)
        };
    }
};

export default PropertySector;
