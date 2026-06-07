/**
 * InfrastructureSector.js - Core Civil Contracting & Heavy Equipment Operations Simulator Engine
 * Encapsulates heavy machinery acquisition, bidding on civil construction projects (Government & Private),
 * construction milestone progression, and monthly contract revenues.
 */

import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../core/GlobalEconomy.js';

export const EQUIPMENT_CATALOG = [
    { id: 'excavator', name: 'Excavator Cat 320', type: 'Excavator', price: 35000, maintenance: 1000, speedBoost: 0.1 },
    { id: 'bulldozer', name: 'Bulldozer D6R', type: 'Bulldozer', price: 45000, maintenance: 1200, speedBoost: 0.1 },
    { id: 'tower_crane', name: 'Tower Crane TC6013', type: 'Tower Crane', price: 110000, maintenance: 3000, speedBoost: 0.25 }
];

export const CONTRACT_TEMPLATES = [
    { id: 'proj_road', name: 'Rehabilitasi Jalan Raya Nasional', source: 'Pemerintah', budget: 150000, duration: 4, req: { excavator: 1, bulldozer: 1 } },
    { id: 'proj_bridge', name: 'Pondasi Jembatan Sungai Metro', source: 'Pemerintah', budget: 380000, duration: 6, req: { excavator: 1, tower_crane: 1 } },
    { id: 'proj_dock', name: 'Perluasan Dermaga Terminal Petikemas', source: 'Swasta', budget: 450000, duration: 5, req: { excavator: 2, tower_crane: 1 } },
    { id: 'proj_subway', name: 'Stasiun Bawah Tanah MRT Jalur Barat', source: 'Pemerintah', budget: 850000, duration: 8, req: { excavator: 2, bulldozer: 1, tower_crane: 1 } },
    { id: 'proj_apart', name: 'Konstruksi Gedung Apartemen Kemayoran', source: 'Swasta', budget: 1200000, duration: 10, req: { excavator: 2, bulldozer: 1, tower_crane: 2 } }
];

export const InfrastructureSector = {
    getInfrastructureState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.infrastructure) {
            biz.infrastructure = {
                heavyEquipment: [
                    { id: 'eq_init_1', ...EQUIPMENT_CATALOG[0] } // Starts with 1 excavator
                ],
                activeProjects: [],
                availableProjects: [
                    { ...CONTRACT_TEMPLATES[0], id: 'proj_av_' + Math.random().toString(36).substr(2, 5) },
                    { ...CONTRACT_TEMPLATES[1], id: 'proj_av_' + Math.random().toString(36).substr(2, 5) }
                ],
                demandFluctuation: 1.0
            };
            gameState.update('business', b => ({ ...b, infrastructure: biz.infrastructure }));
        }
        return biz.infrastructure;
    },

    buyEquipment(equipId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const infra = this.getInfrastructureState(manager);

        const spec = EQUIPMENT_CATALOG.find(e => e.id === equipId);
        if (!spec) throw new Error('Alat berat tidak dikenal!');

        if (biz.cash < spec.price) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(spec.price)})`);
        }

        biz.cash -= spec.price;
        infra.heavyEquipment.push({
            id: 'eq_' + Math.random().toString(36).substr(2, 9),
            ...spec
        });
        biz.valuation += spec.price * 1.3; // Asset ownership raises valuation

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            infrastructure: infra
        }));

        ui.success(`Sukses membeli alat berat "${spec.name}"! Jaringan konstruksi Anda menguat.`, '🚜 Alat Berat Baru');
        return true;
    },

    sellEquipment(instanceId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const infra = this.getInfrastructureState(manager);

        const index = infra.heavyEquipment.findIndex(e => e.id === instanceId);
        if (index === -1) throw new Error('Alat berat tidak ditemukan!');

        const equip = infra.heavyEquipment[index];
        const resaleValue = Math.round(equip.price * 0.55); // 55% resale value

        biz.cash += resaleValue;
        infra.heavyEquipment.splice(index, 1);
        biz.valuation = Math.max(0, biz.valuation - (equip.price * 1.3));

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            infrastructure: infra
        }));

        ui.success(`Berhasil menjual "${equip.name}" seharga $ ${resaleValue.toLocaleString()}!`, '🚜 Alat Berat Terjual');
        return true;
    },

    refreshAvailableProjects(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;
        const infra = this.getInfrastructureState(manager);

        infra.availableProjects = [];
        for (let i = 0; i < 3; i++) {
            const temp = CONTRACT_TEMPLATES[Math.floor(Math.random() * CONTRACT_TEMPLATES.length)];
            infra.availableProjects.push({
                ...temp,
                id: 'proj_av_' + Math.random().toString(36).substr(2, 5)
            });
        }

        gameState.update('business', b => ({ ...b, infrastructure: infra }));
    },

    bidProject(projectId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const infra = this.getInfrastructureState(manager);

        const proj = infra.availableProjects.find(p => p.id === projectId);
        if (!proj) throw new Error('Proyek tidak ditemukan di bursa tender!');

        // Check if player has the required equipment
        const ownedCounts = { excavator: 0, bulldozer: 0, tower_crane: 0 };
        infra.heavyEquipment.forEach(e => {
            if (ownedCounts[e.id] !== undefined) ownedCounts[e.id]++;
        });

        // We check equipment by id catalog
        for (const [reqKey, reqQty] of Object.entries(proj.req)) {
            const ownedQty = infra.heavyEquipment.filter(e => e.id === reqKey).length;
            if (ownedQty < reqQty) {
                const spec = EQUIPMENT_CATALOG.find(e => e.id === reqKey);
                throw new Error(`Tender ditolak! Anda kekurangan alat berat tipe "${spec?.name || reqKey}". Butuh: ${reqQty}, Dimiliki: ${ownedQty}.`);
            }
        }

        // Remove from available and add to active
        infra.availableProjects = infra.availableProjects.filter(p => p.id !== projectId);
        infra.activeProjects.push({
            ...proj,
            monthsLeft: proj.duration,
            progress: 0
        });

        gameState.update('business', b => ({ ...b, infrastructure: infra }));

        ui.success(`Tender proyek "${proj.name}" diterima! Kontrak sipil resmi ditandatangani.`, '🏗️ Kontrak Didapat');
        return true;
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const infra = this.getInfrastructureState(manager);
        if (!infra) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Demand Fluctuation (dynamically driven by the global economic cycle)
        const econMult = globalEconomy.getDemandMultiplier('infrastructure') || 1.0;
        const randDev = (Math.random() - 0.5) * 0.15;
        infra.demandFluctuation = parseFloat(Math.max(0.6, Math.min(2.0, econMult + randDev)).toFixed(2));

        let monthlyRevenue = 0;
        let equipmentMaintenance = 0;

        // Calculate heavy machinery maintenance
        infra.heavyEquipment.forEach(eq => {
            equipmentMaintenance += eq.maintenance;
        });

        // Speed modifications from equipment/initiatives
        let speedMult = 1.0;
        if (initiatives.infra_heavy_machinery) speedMult += 0.25;
        if (initiatives.infra_safety_first) equipmentMaintenance *= 0.95; // HSE reduces accidents/wear by 5%
        if (ops.production === 'jit') speedMult += 0.15; // JIT ERP schedules project milestones faster

        // 2. Process active projects progress
        let completedProjects = [];
        infra.activeProjects.forEach(proj => {
            // Calculate project progress rate
            const monthlyPayment = (proj.budget / proj.duration) * infra.demandFluctuation;
            
            // Strategic initiatives modifiers
            let milestoneModifier = 1.0;
            if (initiatives.infra_civil_license) {
                milestoneModifier += 0.25; // Civil licensing yields 25% higher payouts
            }
            
            monthlyRevenue += monthlyPayment * milestoneModifier;
            proj.progress += Math.round(100 / proj.duration * speedMult);
            proj.monthsLeft = Math.max(0, proj.monthsLeft - 1);

            if (proj.monthsLeft <= 0 || proj.progress >= 100) {
                completedProjects.push(proj.id);
            }
        });

        // Show toast notifications for completed civil projects
        if (completedProjects.length > 0) {
            infra.activeProjects = infra.activeProjects.filter(p => {
                if (completedProjects.includes(p.id)) {
                    setTimeout(() => {
                        ui.success(`Proyek konstruksi "${p.name}" telah selesai dengan sukses! Reputasi kontraktor meningkat.`, '🎉 Proyek Selesai');
                    }, 200);
                    // Grant one-time completion bonus
                    monthlyRevenue += p.budget * 0.1; // 10% completion bonus!
                    return false;
                }
                return true;
            });
        }

        // 3. Regrow available projects if empty or low
        if (infra.availableProjects.length < 2 || Math.random() < 0.3) {
            const temp = CONTRACT_TEMPLATES[Math.floor(Math.random() * CONTRACT_TEMPLATES.length)];
            infra.availableProjects.push({
                ...temp,
                id: 'proj_av_' + Math.random().toString(36).substr(2, 5)
            });
        }

        // Limit available projects to 4 maximum
        infra.availableProjects = infra.availableProjects.slice(0, 4);

        gameState.update('business', b => ({
            ...b,
            infrastructure: infra
        }));

        return {
            wages: 0,
            cost: Math.round(equipmentMaintenance),
            revenue: Math.round(monthlyRevenue)
        };
    }
};

export default InfrastructureSector;
