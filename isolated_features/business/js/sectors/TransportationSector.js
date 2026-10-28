/**
 * TransportationSector.js - Core Online Ride-Hailing & Vehicle Rental Operations Simulator Engine
 * Encapsulates purchasing transport fleets, online driver allocations, rental contracts,
 * vehicle condition deterioration, and vehicle maintenance systems.
 */

import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../core/GlobalEconomy.js';

export const VEHICLE_CATALOG = [
    { id: 'lcgc', name: 'Mobil LCGC', type: 'LCGC', price: 12000, monthlyCost: 400, baseProfit: 1500, crewRequired: 1, wearRate: 2.2 },
    { id: 'sedan', name: 'Mobil Sedan', type: 'Sedan', price: 22000, monthlyCost: 700, baseProfit: 2800, crewRequired: 1, wearRate: 1.6 },
    { id: 'suv', name: 'Mobil SUV', type: 'SUV', price: 35000, monthlyCost: 1100, baseProfit: 4600, crewRequired: 1, wearRate: 1.4 },
    { id: 'truck', name: 'Cargo Truk', type: 'Truk', price: 80000, monthlyCost: 2500, baseProfit: 11500, crewRequired: 2, wearRate: 1.1 },
    { id: 'semitruck', name: 'Semi Truk Container', type: 'Semi Truk', price: 190000, monthlyCost: 5500, baseProfit: 29000, crewRequired: 2, wearRate: 0.8 }
];

export const TransportationSector = {
    getTransportationState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.transportation) {
            const sub = biz.subSector || 'ride_hailing';
            biz.transportation = {
                subSector: sub,
                fleet: [
                    // Start with 1 vehicle matching the sub-sector
                    {
                        id: 'vh_' + Math.random().toString(36).substr(2, 9),
                        ...(sub === 'ride_hailing' ? VEHICLE_CATALOG[0] : VEHICLE_CATALOG[1]),
                        engineType: 'ice',
                        engineLabel: 'BBM',
                        condition: 100,
                        ageMonths: 0,
                        mileage: 0
                    }
                ],
                demandFluctuation: 1.0
            };
            gameState.update('business', b => ({ ...b, transportation: biz.transportation }));
        }
        return biz.transportation;
    },

    buyVehicles(modelId, quantity, engineType = 'ice', manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const trans = this.getTransportationState(manager);

        const model = VEHICLE_CATALOG.find(v => v.id === modelId);
        if (!model) throw new Error('Model kendaraan tidak dikenal!');

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) throw new Error('Jumlah pembelian harus valid!');

        let priceMult = 1.0;
        let costMult = 1.0;
        let profitMult = 1.0;
        let engineLabel = 'BBM';

        if (engineType === 'hybrid') {
            priceMult = 1.20;
            costMult = 0.85;
            profitMult = 1.05;
            engineLabel = 'Hybrid';
        } else if (engineType === 'ev') {
            priceMult = 1.40;
            costMult = 0.65;
            profitMult = 1.10;
            engineLabel = 'EV';
        }

        const adjustedPrice = Math.round(model.price * priceMult);
        const adjustedMonthlyCost = Math.round(model.monthlyCost * costMult);
        const adjustedProfit = Math.round(model.baseProfit * profitMult);

        const totalCost = adjustedPrice * qty;
        if (biz.cash < totalCost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk membeli ${qty} unit ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(totalCost)})`);
        }

        biz.cash -= totalCost;
        
        for (let i = 0; i < qty; i++) {
            trans.fleet.push({
                id: 'vh_' + Math.random().toString(36).substr(2, 9),
                ...model,
                price: adjustedPrice,
                monthlyCost: adjustedMonthlyCost,
                baseProfit: adjustedProfit,
                engineType: engineType,
                engineLabel: engineLabel,
                condition: 100,
                ageMonths: 0,
                mileage: 0
            });
        }

        // Purchases raise valuation
        biz.valuation += totalCost * 1.25;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            transportation: trans
        }));

        ui.success(`Berhasil membeli ${qty} unit "${model.name} (${engineLabel})" untuk memperkuat armada!`, '🚗 Pembelian Armada');
        return true;
    },

    sellVehicle(vehicleId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const trans = this.getTransportationState(manager);

        const index = trans.fleet.findIndex(v => v.id === vehicleId);
        if (index === -1) throw new Error('Kendaraan tidak ditemukan!');

        const vehicle = trans.fleet[index];
        const cond = vehicle.condition !== undefined ? vehicle.condition : 100;
        
        // Resale value depends on condition (max 50% price)
        const resale = Math.round(vehicle.price * (cond / 100) * 0.50);

        biz.cash += resale;
        trans.fleet.splice(index, 1);
        biz.valuation = Math.max(0, biz.valuation - (vehicle.price * 1.25));

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            transportation: trans
        }));

        ui.success(`Berhasil menjual unit armada seharga $ ${resale.toLocaleString()}!`, '💰 Armada Likuid');
        return true;
    },

    repairVehicle(vehicleId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const trans = this.getTransportationState(manager);

        const vehicle = trans.fleet.find(v => v.id === vehicleId);
        if (!vehicle) throw new Error('Kendaraan tidak ditemukan!');

        const cond = vehicle.condition !== undefined ? vehicle.condition : 100;
        if (cond >= 100) throw new Error('Kendaraan dalam kondisi prima (100%)!');

        // Cost of repair scales with wear
        const repairCost = Math.round(vehicle.price * (1 - cond / 100) * 0.35);
        if (biz.cash < repairCost) {
            throw new Error(`Kas Treasury tidak mencukupi untuk pemeliharaan unit ini ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(repairCost)})`);
        }

        biz.cash -= repairCost;
        vehicle.condition = 100;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            transportation: trans
        }));

        ui.success(`Servis selesai! Unit "${vehicle.name}" kini kembali prima ke kondisi 100%.`, '🔧 Pemeliharaan Sukses');
        return true;
    },

    repairAllFleet(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const trans = this.getTransportationState(manager);

        let totalCost = 0;
        trans.fleet.forEach(vehicle => {
            const cond = vehicle.condition !== undefined ? vehicle.condition : 100;
            if (cond < 100) {
                totalCost += Math.round(vehicle.price * (1 - cond / 100) * 0.35);
            }
        });

        if (totalCost === 0) throw new Error('Seluruh armada kendaraan sudah dalam kondisi prima (100%)!');

        if (biz.cash < totalCost) {
            throw new Error(`Kas Treasury tidak mencukupi untuk servis massal ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(totalCost)})`);
        }

        biz.cash -= totalCost;
        trans.fleet.forEach(vehicle => {
            vehicle.condition = 100;
        });

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            transportation: trans
        }));

        ui.success(`Servis massal tuntas! Semua unit armada kembali ke kondisi 100% prima.`, '🔧 Servis Massal');
        return true;
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const trans = this.getTransportationState(manager);
        if (!trans) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Demand Fluctuation (dynamically driven by the global economic cycle)
        const econMult = globalEconomy.getDemandMultiplier('transportation') || 1.0;
        const randDev = (Math.random() - 0.5) * 0.12;
        trans.demandFluctuation = parseFloat(Math.max(0.4, Math.min(2.0, econMult + randDev)).toFixed(2));

        let totalRevenue = 0;
        let totalCost = 0;
        let wages = 0;

        trans.fleet.forEach(v => {
            if (v.condition === undefined) v.condition = 100;
            if (v.ageMonths === undefined) v.ageMonths = 0;
            if (v.mileage === undefined) v.mileage = 0;

            v.ageMonths += 1;

            // Deterioration over time based on wearRate
            const decay = v.wearRate * (1 + v.ageMonths * 0.02);
            v.condition = Math.max(0, parseFloat((v.condition - decay).toFixed(1)));

            // Fixed monthly baseline cost
            let baseMaint = v.price * 0.01;
            totalCost += baseMaint;

            // If condition < 40%, the vehicle is grounded/mogok and does not make profit!
            if (v.condition < 40) {
                return;
            }

            // Normal operation cost (fuel, wear and driver salary if ride-hailing)
            let opCost = v.monthlyCost;
            if (v.crewRequired > 0) {
                const driverWages = v.crewRequired * 1000; // $1,000 wage per driver
                wages += driverWages;
                opCost += driverWages;
            }

            // Apply JIT ERP and EV Fleet optimizations to operational expenses
            if (initiatives.trans_ev_fleet) {
                opCost *= 0.85; // EV fleet reduces fuel/electricity costs by 15%
            }
            if (ops.production === 'jit') {
                opCost *= 0.95; // JIT ERP schedules routes/fuel efficiency by 5%
            }

            totalCost += opCost;

            // Trip revenue
            let tripRev = v.baseProfit * trans.demandFluctuation;
            if (initiatives.trans_app_optimization) {
                tripRev *= 1.2; // GPS app route optimizer boosts trip matching speed by 20%
            }
            if (initiatives.trans_premium_fleet) {
                tripRev += 800; // VIP luxury rental surcharge
            }

            totalRevenue += tripRev;

            // Add odometer mileage per month
            const tripDistance = Math.floor(2500 + Math.random() * 2000);
            v.mileage += tripDistance;
        });

        gameState.update('business', b => ({
            ...b,
            transportation: trans
        }));

        return {
            wages: Math.round(wages),
            cost: Math.round(totalCost),
            revenue: Math.round(totalRevenue)
        };
    }
};

export default TransportationSector;
