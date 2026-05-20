/**
 * EnergySector.js - Core Energy, Utilities, & Fossil/Green Operations Simulator Engine
 * Encapsulates exploration surveys, oil/gas/coal/green energy discoveries,
 * refinery operations, dynamic capacity metrics, and monthly financials.
 */

import gameState from '../../game/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';

export const EnergySector = {
    getEnergyState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.energy) {
            biz.energy = {
                explorations: [
                    { id: 'exp_init_1', name: 'Blok Migas Mahakam Offshore', type: 'oil', capacity: 150000, buildCost: 250000, revenueRate: 0.25, maintenance: 25000, status: 'available' },
                    { id: 'exp_init_2', name: 'PLTS Green Selayar Island', type: 'green', capacity: 80000, buildCost: 120000, revenueRate: 0.15, maintenance: 5000, status: 'available' }
                ],
                refineries: [
                    { id: 'ref_init_1', name: 'Kilang Balikpapan Refinery', type: 'oil', capacity: 100000, status: 'active', revenueRate: 0.25, maintenance: 18000 }
                ],
                demandFluctuation: 1.0, // Fluctuate between 0.8 and 1.3
                surveyCost: 15000
            };
            gameState.update('business', b => ({ ...b, energy: biz.energy }));
        }
        return biz.energy;
    },

    generateRandomDiscoveries(count) {
        const oilNames = ['Rokan Basin', 'Cepu Block', 'Natuna Utara', 'Ambalat Offshore', 'Madura Deepwater', 'Sunda Straits'];
        const gasNames = ['Masela Block', 'Tangguh Gas', 'Senoro LNG Field', 'Arun Reserves', 'Bontang Gas Dome'];
        const coalNames = ['Kutai Mining Ridge', 'Sangatta Open-Pit', 'Muara Enim Basin', 'Lahat Coal Deposit', 'Ombilin Mines'];
        const greenNames = ['PLTS Kupang Solar Park', 'PLTB Sidrap Wind Farm', 'PLTA Cirata Floating Hydro', 'Kamojang Geothermal Field', 'Jeneponto Wind Complex', 'Asahan Cascading Hydro'];

        const types = ['oil', 'gas', 'coal', 'green'];
        const discoveries = [];

        for (let i = 0; i < count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            let name = '';
            let capacity = 0;
            let buildCost = 0;
            let maintenance = 0;
            let revenueRate = 0.20;

            if (type === 'oil') {
                name = 'Blok Migas ' + oilNames[Math.floor(Math.random() * oilNames.length)];
                capacity = Math.round(80000 + Math.random() * 170000); // 80k - 250k
                buildCost = Math.round(200000 + Math.random() * 400000); // 200k - 600k
                revenueRate = 0.28; // high revenue
                maintenance = Math.round(buildCost * 0.08); // 8% of build cost
            } else if (type === 'gas') {
                name = 'Sumber Gas ' + gasNames[Math.floor(Math.random() * gasNames.length)];
                capacity = Math.round(100000 + Math.random() * 200000); // 100k - 300k
                buildCost = Math.round(150000 + Math.random() * 250000);
                revenueRate = 0.20;
                maintenance = Math.round(buildCost * 0.07);
            } else if (type === 'coal') {
                name = 'Konsesi Batubara ' + coalNames[Math.floor(Math.random() * coalNames.length)];
                capacity = Math.round(150000 + Math.random() * 350000); // 150k - 500k
                buildCost = Math.round(100000 + Math.random() * 200000);
                revenueRate = 0.12;
                maintenance = Math.round(buildCost * 0.06);
            } else { // green
                name = greenNames[Math.floor(Math.random() * greenNames.length)];
                capacity = Math.round(60000 + Math.random() * 90000); // 60k - 150k
                buildCost = Math.round(120000 + Math.random() * 230000);
                revenueRate = 0.16;
                maintenance = Math.round(buildCost * 0.03); // very low maintenance!
            }

            discoveries.push({
                id: 'disc_' + Math.random().toString(36).substr(2, 9),
                name,
                type,
                capacity,
                buildCost,
                revenueRate,
                maintenance,
                status: 'available'
            });
        }
        return discoveries;
    },

    surveyExploration(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const energy = this.getEnergyState(manager);
        
        const cost = energy.surveyCost;
        if (biz.cash < cost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk survei eksplorasi ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(cost)})`);
        }

        biz.cash -= cost;
        const newDiscoveries = this.generateRandomDiscoveries(2);
        energy.explorations = [...(energy.explorations || []), ...newDiscoveries];

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            energy: energy
        }));

        ui.success(`Survei geologis tuntas! Ditemukan 2 potensi sumber daya energi baru. Cek tabel penemuan untuk detailnya!`, '🔍 Eksplorasi Sukses');
        return true;
    },

    developDiscovery(discoveryId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const energy = this.getEnergyState(manager);

        const index = energy.explorations.findIndex(d => d.id === discoveryId);
        if (index === -1) throw new Error('Sumber daya potensi tidak ditemukan!');

        const disc = energy.explorations[index];
        if (biz.cash < disc.buildCost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk membangun kilang/pembangkit ini ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(disc.buildCost)})`);
        }

        // Deduct build cost
        biz.cash -= disc.buildCost;

        // Add to active refineries
        const newRefinery = {
            id: 'ref_' + Math.random().toString(36).substr(2, 9),
            name: disc.name.replace('Potensi ', '').replace('Konsesi ', 'Kilang ').replace('Sumber ', 'Kilang '),
            type: disc.type,
            capacity: disc.capacity,
            revenueRate: disc.revenueRate,
            maintenance: disc.maintenance,
            status: 'active'
        };

        energy.refineries.push(newRefinery);
        energy.explorations.splice(index, 1); // remove from potential list

        // Apply valuation adjustments (R&D level also increases based on refinery count slightly)
        let valuationBump = disc.buildCost * 1.5;
        if (disc.type === 'green') {
            valuationBump *= 1.4; // Green energy gives permanent valuation boost!
        }
        biz.valuation += valuationBump;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            energy: energy
        }));

        ui.success(`Kilang/Pembangkit "${newRefinery.name}" resmi didirikan dan mulai menyuplai grid energi!`, '⚡ Konstruksi Tuntas');
        return true;
    },

    decommissionRefinery(refineryId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const energy = this.getEnergyState(manager);

        const index = energy.refineries.findIndex(r => r.id === refineryId);
        if (index === -1) throw new Error('Kilang operasional tidak ditemukan!');

        const ref = energy.refineries[index];
        const scrapValue = Math.round(ref.maintenance * 4); // 4x monthly maintenance as liquid scrap cash
        
        biz.cash += scrapValue;
        energy.refineries.splice(index, 1);

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            energy: energy
        }));

        ui.success(`Kilang "${ref.name}" dinonaktifkan. Sisa logam dan tanah dijual seharga +$ ${financeManager.formatCurrency(scrapValue)} ke kas treasury.`, '❌ Kilang Dinonaktifkan');
        return true;
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const energy = this.getEnergyState(manager);
        if (!energy) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Demand Fluctuation (between 0.85 and 1.25)
        energy.demandFluctuation = parseFloat((0.85 + Math.random() * 0.40).toFixed(2));

        // 2. Compute Refineries Financial Contribution
        let totalRevenue = 0;
        let totalMaintenance = 0;
        
        // Count active refineries by type
        let greenCount = 0;
        energy.refineries.forEach(ref => {
            if (ref.type === 'green') greenCount++;
            
            // Raw monthly production
            const baseProd = ref.capacity;
            
            // Adjust production by supplier & production methodology (ERP integration!)
            let erpModifier = 1.0;
            if (ops.production === 'jit') erpModifier *= 1.15;
            if (ops.production === 'batch') erpModifier *= 1.05;
            
            const productionOutput = baseProd * erpModifier;
            const revenueRatePerUnit = ref.revenueRate * energy.demandFluctuation;
            
            totalRevenue += productionOutput * revenueRatePerUnit;
            totalMaintenance += ref.maintenance;
        });

        // 3. Initiative Boosts
        // energy_renewable boost
        let initiativeRevBoost = 0;
        if (initiatives.energy_renewable) {
            initiativeRevBoost += totalRevenue * 0.15; // 15% revenue bonus for renewable
        }
        if (initiatives.energy_smart_grid) {
            totalMaintenance *= 0.85; // 15% maintenance discount
        }

        totalRevenue += initiativeRevBoost;

        // 4. Save state back
        gameState.update('business', b => ({
            ...b,
            energy: energy
        }));

        return {
            wages: 0, // No candidate employees in Energy Sector! Only Manager Executives if hired
            cost: Math.round(totalMaintenance),
            revenue: Math.round(totalRevenue)
        };
    }
};

export default EnergySector;
