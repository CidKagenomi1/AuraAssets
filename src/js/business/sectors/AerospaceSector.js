/**
 * AerospaceSector.js - Core Aviation & Aerospace Operations Simulator Engine
 * Encapsulates airline operations, airport/terminal management, 
 * aircraft fleet purchases (Boeing, Airbus, Bombardier), automatic crew staffing, and dynamic aircraft maintenance.
 */

import gameState from '../../game/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../game/GlobalEconomy.js';

export const AIRCRAFT_CATALOG = [
    { id: 'bombardier_crj900', name: 'Bombardier CRJ900', type: 'Regional Jet', price: 450000, capacity: 90, flightCost: 8000, ticketPrice: 150, flightsPerMonth: 40, crewRequired: 4 },
    { id: 'airbus_a320neo', name: 'Airbus A320neo', type: 'Narrow-body', price: 1100000, capacity: 180, flightCost: 15000, ticketPrice: 200, flightsPerMonth: 30, crewRequired: 6 },
    { id: 'boeing_737max9', name: 'Boeing 737 MAX 9', type: 'Narrow-body', price: 1200000, capacity: 200, flightCost: 16500, ticketPrice: 210, flightsPerMonth: 30, crewRequired: 6 },
    { id: 'boeing_787_dreamliner', name: 'Boeing 787 Dreamliner', type: 'Wide-body', price: 2500000, capacity: 290, flightCost: 35000, ticketPrice: 450, flightsPerMonth: 20, crewRequired: 10 },
    { id: 'airbus_a350_900', name: 'Airbus A350-900', type: 'Wide-body', price: 2800000, capacity: 325, flightCost: 38000, ticketPrice: 480, flightsPerMonth: 20, crewRequired: 11 },
    { id: 'boeing_777_300er', name: 'Boeing 777-300ER', type: 'Wide-body', price: 3200000, capacity: 396, flightCost: 45000, ticketPrice: 550, flightsPerMonth: 15, crewRequired: 13 },
    { id: 'airbus_a380_800', name: 'Airbus A380-800', type: 'Jumbo Jet', price: 4500000, capacity: 525, flightCost: 65000, ticketPrice: 650, flightsPerMonth: 12, crewRequired: 18 }
];

export const AIRPORT_TIERS = [
    { id: 'terminal_domestik', name: 'Terminal Domestik', price: 500000, paxCapacity: 5000, maintenance: 25000, prestige: 20 },
    { id: 'bandara_regional', name: 'Bandara Regional', price: 1500000, paxCapacity: 20000, maintenance: 80000, prestige: 60 },
    { id: 'hub_internasional', name: 'Hub Internasional T3', price: 5000000, paxCapacity: 80000, maintenance: 200000, prestige: 250 }
];

export const AerospaceSector = {
    getAerospaceState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.aerospace) {
            biz.aerospace = {
                crewCount: 4, // Auto-staffed crew members
                fleet: [
                    // Start with 1 small regional jet
                    { 
                        id: 'flt_init_1', 
                        ...AIRCRAFT_CATALOG[0], 
                        condition: 100, 
                        ageMonths: 0 
                    }
                ],
                airports: [
                    // Start with 1 domestic terminal
                    { id: 'apt_init_1', ...AIRPORT_TIERS[0] }
                ],
                demandFluctuation: 1.0, // Fluctuate passenger traffic
            };
            gameState.update('business', b => ({ ...b, aerospace: biz.aerospace }));
        }
        return biz.aerospace;
    },

    buyAircraft(planeModelId, quantity, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const aerospace = this.getAerospaceState(manager);

        const planeModel = AIRCRAFT_CATALOG.find(p => p.id === planeModelId);
        if (!planeModel) throw new Error('Model pesawat tidak dikenali!');

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) throw new Error('Jumlah pembelian pesawat harus valid!');

        const totalCost = planeModel.price * qty;
        if (biz.cash < totalCost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk membeli ${qty} pesawat ini ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(totalCost)})`);
        }

        biz.cash -= totalCost;
        
        // Add aircraft in bulk
        for (let i = 0; i < qty; i++) {
            const newPlane = {
                id: 'flt_' + Math.random().toString(36).substr(2, 9),
                ...planeModel,
                condition: 100,
                ageMonths: 0
            };
            aerospace.fleet.push(newPlane);
        }

        // Purchases bump valuation
        biz.valuation += totalCost * 1.2;

        // Auto-match crew count after bulk purchases
        let totalCrewRequired = 0;
        aerospace.fleet.forEach(p => {
            totalCrewRequired += (p.crewRequired || 4);
        });
        aerospace.crewCount = totalCrewRequired;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            aerospace: aerospace
        }));

        ui.success(`Berhasil membeli ${qty} pesawat "${planeModel.name}" secara massal!`, '✈️ Pembelian Armada');
        return true;
    },

    buildAirport(airportTierId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const aerospace = this.getAerospaceState(manager);

        const aptTier = AIRPORT_TIERS.find(a => a.id === airportTierId);
        if (!aptTier) throw new Error('Tipe bandara tidak dikenali!');

        // Check if existing capacity is saturated by active planes passenger capacity
        let totalPaxCapacity = 0;
        aerospace.airports.forEach(apt => {
            totalPaxCapacity += apt.paxCapacity;
        });

        let totalFlightPax = 0;
        aerospace.fleet.forEach(p => {
            const cond = p.condition !== undefined ? p.condition : 100;
            if (cond >= 40) { // Only active non-grounded planes count
                totalFlightPax += (p.capacity * p.flightsPerMonth);
            }
        });

        const fillPercent = totalPaxCapacity > 0 ? (totalFlightPax / totalPaxCapacity) * 100 : 100;

        if (fillPercent < 80) {
            throw new Error(`Kapasitas terminal saat ini belum terpenuhi. Penuhi minimal 80% kapasitas terminal saat ini (${totalPaxCapacity.toLocaleString()} Pax) dengan menambah armada pesawat Anda terlebih dahulu! (Daya angkut armada saat ini: ${totalFlightPax.toLocaleString()} Pax, Terisi: ${Math.round(fillPercent)}%)`);
        }

        if (biz.cash < aptTier.price) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk konstruksi bandara ini ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(aptTier.price)})`);
        }

        biz.cash -= aptTier.price;
        const newAirport = {
            id: 'apt_' + Math.random().toString(36).substr(2, 9),
            ...aptTier
        };
        aerospace.airports.push(newAirport);

        biz.valuation += aptTier.price * 1.5; // Infrastructure grants higher valuation

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            aerospace: aerospace
        }));

        ui.success(`Konstruksi "${aptTier.name}" tuntas. Kapasitas penumpang maskapai meningkat tajam!`, '🏢 Infrastruktur Aviasi');
        return true;
    },

    repairAircraft(planeId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const aerospace = this.getAerospaceState(manager);

        const plane = aerospace.fleet.find(p => p.id === planeId);
        if (!plane) throw new Error('Pesawat tidak ditemukan!');

        const cond = plane.condition !== undefined ? plane.condition : 100;
        if (cond >= 100) throw new Error('Pesawat dalam kondisi prima (100%)!');

        // Cost of repair is proportional to the wear-and-tear
        const repairCost = Math.round(plane.price * (1 - cond / 100) * 0.35);
        if (biz.cash < repairCost) {
            throw new Error(`Kas Treasury tidak mencukupi untuk pemeliharaan pesawat ini ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(repairCost)})`);
        }

        biz.cash -= repairCost;
        plane.condition = 100;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            aerospace: aerospace
        }));

        ui.success(`Pemeliharaan pesawat "${plane.name}" selesai! Kondisi kembali ke 100%.`, '🔧 Pemeliharaan Sukses');
        return true;
    },

    repairAllFleet(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const aerospace = this.getAerospaceState(manager);

        let totalCost = 0;
        aerospace.fleet.forEach(plane => {
            const cond = plane.condition !== undefined ? plane.condition : 100;
            if (cond < 100) {
                totalCost += Math.round(plane.price * (1 - cond / 100) * 0.35);
            }
        });

        if (totalCost === 0) throw new Error('Seluruh armada pesawat sudah dalam kondisi prima (100%)!');

        if (biz.cash < totalCost) {
            throw new Error(`Kas Treasury tidak mencukupi untuk pemeliharaan seluruh armada ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(totalCost)})`);
        }

        biz.cash -= totalCost;
        aerospace.fleet.forEach(plane => {
            plane.condition = 100;
        });

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            aerospace: aerospace
        }));

        ui.success(`Pemeliharaan seluruh armada selesai! Semua pesawat kembali ke kondisi 100%.`, '🔧 Pemeliharaan Massal');
        return true;
    },

    sellAircraft(planeId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const aerospace = this.getAerospaceState(manager);

        const index = aerospace.fleet.findIndex(p => p.id === planeId);
        if (index === -1) throw new Error('Pesawat tidak ditemukan!');

        const plane = aerospace.fleet[index];
        const cond = plane.condition !== undefined ? plane.condition : 100;
        
        // Resale value: 60% of original price scaled by condition
        const saleValue = Math.round(plane.price * (cond / 100) * 0.60);
        
        biz.cash += saleValue;
        
        // Remove plane from fleet
        aerospace.fleet.splice(index, 1);

        // Reduce valuation by original price * 1.2
        biz.valuation = Math.max(0, biz.valuation - (plane.price * 1.2));

        // Auto-match crew count after plane is sold
        let totalCrewRequired = 0;
        aerospace.fleet.forEach(p => {
            totalCrewRequired += (p.crewRequired || 4);
        });
        aerospace.crewCount = totalCrewRequired;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            aerospace: aerospace
        }));

        ui.success(`Berhasil menjual "${plane.name}"! Memperoleh kas masuk sebesar $ ${saleValue.toLocaleString()} (Kondisi: ${cond}%)`, '✈️ Armada Terjual');
        return true;
    },

    demolishAirport(airportId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const aerospace = this.getAerospaceState(manager);

        const index = aerospace.airports.findIndex(a => a.id === airportId);
        if (index === -1) throw new Error('Bandara tidak ditemukan!');

        const apt = aerospace.airports[index];
        
        // Give 50% cash refund
        const refund = Math.round(apt.price * 0.5);
        biz.cash += refund;
        
        // Remove from list
        aerospace.airports.splice(index, 1);
        
        // Reduce valuation
        biz.valuation = Math.max(0, biz.valuation - (apt.price * 1.5));

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            aerospace: aerospace
        }));

        ui.success(`Berhasil merobohkan "${apt.name}"! Memperoleh pengembalian dana rekonstruksi sebesar $ ${refund.toLocaleString()}`, '🏢 Terminal Dirobohkan');
        return true;
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const aerospace = this.getAerospaceState(manager);
        if (!aerospace) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Demand Fluctuation (dynamically driven by the global economic cycle)
        const econMult = globalEconomy.getDemandMultiplier();
        const randDev = (Math.random() - 0.5) * 0.12; // slight industry variance
        aerospace.demandFluctuation = parseFloat(Math.max(0.4, Math.min(2.0, econMult + randDev)).toFixed(2));

        let totalRevenue = 0;
        let totalFlightCosts = 0;
        let totalAptMaintenance = 0;

        // 2. Compute Airport Operations
        let totalPaxCapacity = 0;
        aerospace.airports.forEach(apt => {
            totalPaxCapacity += apt.paxCapacity;
            totalAptMaintenance += apt.maintenance;
            // Airports also earn slight retail/duty-free revenue per capacity
            totalRevenue += apt.paxCapacity * 3.5 * aerospace.demandFluctuation;
        });

        // 3. Compute Staffing & Crew requirements (Automatic staff matching)
        let totalCrewRequired = 0;
        aerospace.fleet.forEach(plane => {
            totalCrewRequired += (plane.crewRequired || 4);
        });

        // Sync hired crew count directly to required crew
        aerospace.crewCount = totalCrewRequired;

        // Hired Crew Wages ($2,500/mo salary per crew member)
        const crewWages = aerospace.crewCount * 2500;

        // Since crew staffing is automatic, staff ratio is always 100% (1.0)
        const staffRatio = 1.0;

        // 4. Compute Airline/Fleet Operations
        let totalPaxFlown = 0;
        aerospace.fleet.forEach(plane => {
            // Set default age/condition if missing
            if (plane.condition === undefined) plane.condition = 100;
            if (plane.ageMonths === undefined) plane.ageMonths = 0;

            // Age increases by 1 month
            plane.ageMonths += 1;

            // Condition degrades monthly based on usage & age
            const decay = 1.2 + (plane.ageMonths * 0.04); // Accelerated wear-and-tear as it ages
            plane.condition = Math.max(0, parseFloat((plane.condition - decay).toFixed(1)));

            // Fixed monthly baseline cost (0.5% of plane value per month)
            const baseMaint = plane.price * 0.005;
            totalFlightCosts += baseMaint;

            // If plane condition drops below 40%, it is grounded and cannot perform flights!
            if (plane.condition < 40) {
                return; // No flights, only base maintenance!
            }

            // Normal Flight Cost (depends on fuel, flights per month, catering, and staff availability)
            const actualFlightCost = plane.flightCost * plane.flightsPerMonth * staffRatio;
            
            // Ticket revenue based on capacity, demand, and staff ratio
            const loadFactor = Math.min(1.0, aerospace.demandFluctuation);
            const monthlyPax = plane.capacity * plane.flightsPerMonth * loadFactor * staffRatio;
            const actualTicketRev = monthlyPax * plane.ticketPrice;

            totalFlightCosts += actualFlightCost;
            totalPaxFlown += monthlyPax;
            
            // Limit flights by Airport terminal capacity!
            if (totalPaxFlown <= totalPaxCapacity) {
                totalRevenue += actualTicketRev;
            } else {
                totalRevenue += actualTicketRev * 0.4; // 60% penalty for over-capacity chaos
            }
        });

        // 5. Save state back
        gameState.update('business', b => ({
            ...b,
            aerospace: aerospace
        }));

        const totalCost = Math.round(totalFlightCosts + totalAptMaintenance + crewWages);

        return {
            wages: crewWages,
            cost: totalCost,
            revenue: Math.round(totalRevenue)
        };
    }
};

export default AerospaceSector;
