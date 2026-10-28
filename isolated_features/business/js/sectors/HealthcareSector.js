/**
 * HealthcareSector.js - Core Healthcare & Biotechnology Operations Simulator Engine
 * Encapsulates hospital and clinic management, auto-staffing of doctors and nurses,
 * and medicine manufacturing with custom colors, dosages, and production runs.
 */

import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../core/GlobalEconomy.js';

export const FACILITY_CATALOG = [
    { id: 'klinik', name: 'Klinik Pratama', type: 'Klinik', price: 100000, doctorRequired: 2, nurseRequired: 5, capacity: 500, maintenance: 3000, revenuePerPatient: 25, icon: '🩺' },
    { id: 'puskesmas', name: 'Puskesmas Kecamatan', type: 'Puskesmas', price: 300000, doctorRequired: 5, nurseRequired: 12, capacity: 1500, maintenance: 8000, revenuePerPatient: 18, icon: '🏢' },
    { id: 'rumah_sakit', name: 'Rumah Sakit Umum', type: 'Rumah Sakit', price: 1200000, doctorRequired: 15, nurseRequired: 40, capacity: 6000, maintenance: 35000, revenuePerPatient: 45, icon: '🏥' }
];

export const HealthcareSector = {
    getHealthcareState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.healthcare) {
            biz.healthcare = {
                doctorCount: 2,
                nurseCount: 5,
                facilities: [
                    // Start with 1 clinic
                    { 
                        id: 'fac_init_1', 
                        ...FACILITY_CATALOG[0]
                    }
                ],
                medicines: [
                    // Start with some basic medicines
                    { id: 'med_init_1', name: 'Paracetamol Forte', type: 'pil', color: 'Biru', qty: 500, unitCost: 1, sellPrice: 4 }
                ],
                demandFluctuation: 1.0,
                doctorWage: 6000,
                nurseWage: 2500
            };
            gameState.update('business', b => ({ ...b, healthcare: biz.healthcare }));
        }
        return biz.healthcare;
    },

    buildFacility(facilityId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const hc = this.getHealthcareState(manager);

        const facModel = FACILITY_CATALOG.find(f => f.id === facilityId);
        if (!facModel) throw new Error('Model fasilitas tidak dikenali!');

        if (biz.cash < facModel.price) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk membangun fasilitas ini ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(facModel.price)})`);
        }

        biz.cash -= facModel.price;
        
        const newFacility = {
            id: 'fac_' + Math.random().toString(36).substr(2, 9),
            ...facModel
        };
        hc.facilities.push(newFacility);

        // Purchases bump valuation
        biz.valuation += facModel.price * 1.4;

        // Auto-match doctor and nurse count
        let totalDocs = 0;
        let totalNurses = 0;
        hc.facilities.forEach(f => {
            totalDocs += f.doctorRequired;
            totalNurses += f.nurseRequired;
        });
        hc.doctorCount = totalDocs;
        hc.nurseCount = totalNurses;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            healthcare: hc
        }));

        ui.success(`Pembangunan "${facModel.name}" berhasil diselesaikan! Dokter dan perawat direkrut secara otomatis.`, '🏥 Fasilitas Kesehatan Baru');
        return true;
    },

    sellFacility(facilityId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const hc = this.getHealthcareState(manager);

        const index = hc.facilities.findIndex(f => f.id === facilityId);
        if (index === -1) throw new Error('Fasilitas tidak ditemukan!');

        const facility = hc.facilities[index];
        
        // Resale value: 60% of original price
        const saleValue = Math.round(facility.price * 0.60);
        
        biz.cash += saleValue;
        
        // Remove facility from list
        hc.facilities.splice(index, 1);

        // Reduce valuation
        biz.valuation = Math.max(0, biz.valuation - (facility.price * 1.4));

        // Auto-match doctor and nurse count
        let totalDocs = 0;
        let totalNurses = 0;
        hc.facilities.forEach(f => {
            totalDocs += f.doctorRequired;
            totalNurses += f.nurseRequired;
        });
        hc.doctorCount = totalDocs;
        hc.nurseCount = totalNurses;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            healthcare: hc
        }));

        ui.success(`Berhasil melikuidasi "${facility.name}" seharga $ ${saleValue.toLocaleString()}!`, '🩺 Fasilitas Dijual');
        return true;
    },

    produceMedicine(name, type, color, qty, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const hc = this.getHealthcareState(manager);

        const parsedQty = parseInt(qty);
        if (isNaN(parsedQty) || parsedQty <= 0) throw new Error('Jumlah produksi obat harus berupa angka positif!');

        if (!name.trim()) throw new Error('Nama obat tidak boleh kosong!');

        const unitCost = 1; // fixed raw material cost per medicine unit
        const totalCost = unitCost * parsedQty;

        if (biz.cash < totalCost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk memproduksi obat ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(totalCost)})`);
        }

        biz.cash -= totalCost;

        // Check if medicine with same name, type, and color already exists
        const existing = hc.medicines.find(m => m.name.toLowerCase() === name.toLowerCase() && m.type === type && m.color === color);
        if (existing) {
            existing.qty += parsedQty;
        } else {
            hc.medicines.push({
                id: 'med_' + Math.random().toString(36).substr(2, 9),
                name,
                type,
                color,
                qty: parsedQty,
                unitCost,
                sellPrice: 4 // fixed sell price
            });
        }

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            healthcare: hc
        }));

        ui.success(`Produksi ${parsedQty.toLocaleString()} unit obat "${name}" (${type}, warna dosis: ${color}) telah selesai!`, '💊 Produksi Obat Sukses');
        return true;
    },

    disposeMedicine(medicineId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const hc = this.getHealthcareState(manager);

        const index = hc.medicines.findIndex(m => m.id === medicineId);
        if (index === -1) throw new Error('Obat tidak ditemukan!');

        const med = hc.medicines[index];
        hc.medicines.splice(index, 1);

        gameState.update('business', b => ({
            ...b,
            healthcare: hc
        }));

        ui.success(`Obat "${med.name}" telah dibuang dari penyimpanan.`, '🗑️ Buang Obat');
        return true;
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const hc = this.getHealthcareState(manager);
        if (!hc) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Patient Demand Fluctuation (based on global economy)
        const econMult = globalEconomy.getDemandMultiplier('healthcare');
        const randDev = (Math.random() - 0.5) * 0.10;
        hc.demandFluctuation = parseFloat(Math.max(0.5, Math.min(2.0, econMult + randDev)).toFixed(2));

        let totalPatientCapacity = 0;
        let totalMaintenance = 0;
        let totalPatientRevenue = 0;

        // Calculate healthcare facilities capacity and maintenance
        hc.facilities.forEach(fac => {
            totalPatientCapacity += fac.capacity;
            totalMaintenance += fac.maintenance;
        });

        // 2. Doctor and Nurse Salaries
        // Auto-match doctor and nurse count
        let totalDocs = 0;
        let totalNurses = 0;
        hc.facilities.forEach(f => {
            totalDocs += f.doctorRequired;
            totalNurses += f.nurseRequired;
        });
        hc.doctorCount = totalDocs;
        hc.nurseCount = totalNurses;

        const doctorWage = hc.doctorWage || 6000;
        const nurseWage = hc.nurseWage || 2500;
        const totalWages = (hc.doctorCount * doctorWage) + (hc.nurseCount * nurseWage);

        // 3. Process Patient Visits & Healthcare Revenues
        // Patient load ratio
        const loadFactor = Math.min(1.0, hc.demandFluctuation);
        const activePatients = Math.round(totalPatientCapacity * loadFactor);

        // Process patient treatments revenue
        hc.facilities.forEach(fac => {
            const facPatients = Math.round(fac.capacity * loadFactor);
            totalPatientRevenue += facPatients * fac.revenuePerPatient;
        });

        // 4. Medicine Sales
        let medicineRevenue = 0;
        let medicinesSoldThisMonth = 0;

        if (activePatients > 0 && hc.medicines.length > 0) {
            // Patient medicine buy rate: 60% of patients purchase 1 medicine
            let medsNeeded = Math.round(activePatients * 0.60);

            // Deplete inventories
            for (let i = 0; i < hc.medicines.length && medsNeeded > 0; i++) {
                const med = hc.medicines[i];
                if (med.qty > 0) {
                    const buyQty = Math.min(med.qty, medsNeeded);
                    med.qty -= buyQty;
                    medsNeeded -= buyQty;
                    medicinesSoldThisMonth += buyQty;
                    medicineRevenue += buyQty * med.sellPrice;
                }
            }

            // Remove completely empty medicine products
            hc.medicines = hc.medicines.filter(m => m.qty > 0);
        }

        // 5. Initiative Boosts & Modifiers
        let initiativeRevBoost = 0;
        if (initiatives.hc_vaccine) {
            initiativeRevBoost += totalPatientRevenue * 0.25; // 25% revenue bonus
        }
        if (initiatives.hc_ehr) {
            totalMaintenance *= 0.88; // 12% maintenance discount
        }
        if (initiatives.hc_robots) {
            initiativeRevBoost += 6500; // Flat profit bonus
        }

        const totalRevenue = Math.round(totalPatientRevenue + medicineRevenue + initiativeRevBoost);
        const totalCost = Math.round(totalMaintenance);

        // Update healthcare state
        gameState.update('business', b => ({
            ...b,
            healthcare: hc
        }));

        return {
            wages: totalWages,
            cost: totalCost,
            revenue: totalRevenue
        };
    }
};

export default HealthcareSector;
