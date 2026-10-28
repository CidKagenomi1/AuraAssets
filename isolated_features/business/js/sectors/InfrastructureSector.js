/**
 * InfrastructureSector.js - Core Civil Contracting & Heavy Equipment Operations Simulator Engine
 * Encapsulates heavy machinery acquisition, bidding on civil construction projects,
 * construction milestone progression, and contract revenues.
 */

import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../core/GlobalEconomy.js';

export const EQUIPMENT_CATALOG = [
    { id: 'excavator', name: 'Excavator Cat 320', type: 'Excavator', price: 35000, maintenance: 1000, crewReq: 1 },
    { id: 'bulldozer', name: 'Bulldozer D6R', type: 'Bulldozer', price: 45000, maintenance: 1200, crewReq: 1 },
    { id: 'wheel_loader', name: 'Wheel Loader WA380', type: 'Wheel Loader', price: 50000, maintenance: 1400, crewReq: 1 },
    { id: 'dump_truck', name: 'Dump Truck Hino 500', type: 'Dump Truck', price: 25000, maintenance: 600, crewReq: 1 },
    { id: 'concrete_mixer', name: 'Concrete Mixer Truck', type: 'Concrete Mixer Truck', price: 60000, maintenance: 1800, crewReq: 1 },
    { id: 'concrete_pump', name: 'Concrete Pump Truck', type: 'Concrete Pump Truck', price: 75000, maintenance: 2200, crewReq: 1 },
    { id: 'tower_crane', name: 'Tower Crane TC6013', type: 'Tower Crane', price: 110000, maintenance: 3000, crewReq: 2 },
    { id: 'mobile_crane', name: 'Mobile Crane Sany', type: 'Mobile Crane', price: 85000, maintenance: 2500, crewReq: 1 },
    { id: 'road_roller', name: 'Road Roller Dynapac', type: 'Road Roller', price: 30000, maintenance: 800, crewReq: 1 },
    { id: 'forklift', name: 'Forklift Toyota 2.5T', type: 'Forklift', price: 15000, maintenance: 400, crewReq: 1 }
];

// Progressive project names based on level
const PROJECT_NAMES = {
    lvl1: [
        'Rehabilitasi Jalan Raya Nasional',
        'Pondasi Saluran Irigasi Desa',
        'Pemadatan Lahan Komplek Ruko',
        'Pengerukan Parit Pemukiman'
    ],
    lvl2: [
        'Pondasi Jembatan Sungai Metro',
        'Pengaspalan Jalan Penghubung Kec.',
        'Pematangan Lahan Industri Baru',
        'Konstruksi Talud Penahan Banjir'
    ],
    lvl3: [
        'Perluasan Dermaga Petikemas',
        'Stasiun Bawah Tanah MRT Jalur Barat',
        'Struktur Dasar Mall Kemayoran',
        'Flyover Simpang Susun Kota'
    ],
    lvl4: [
        'Gedung Apartemen 40 Lantai',
        'Konstruksi Jalan Tol Trans-Jawa',
        'Terminal Penumpang Bandara Internasional',
        'Bendungan Pembangkit Listrik Hidro'
    ]
};

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
                availableProjects: [],
                demandFluctuation: 1.0,
                projectsCompletedCount: 0,
                crewBaseSalary: 800,
                crewAllocationMode: 'normal' // 'overstaffed', 'normal', 'efficient'
            };
            // Generate initial available projects
            this.generateInitialProjects(biz.infrastructure);
            gameState.update('business', b => ({ ...b, infrastructure: biz.infrastructure }));
        }
        
        // Ensure properties exist for older save files
        if (biz.infrastructure.projectsCompletedCount === undefined) biz.infrastructure.projectsCompletedCount = 0;
        if (biz.infrastructure.crewBaseSalary === undefined) biz.infrastructure.crewBaseSalary = 800;
        if (biz.infrastructure.crewAllocationMode === undefined) biz.infrastructure.crewAllocationMode = 'normal';
        
        return biz.infrastructure;
    },

    generateInitialProjects(infra) {
        infra.availableProjects = [];
        for (let i = 0; i < 3; i++) {
            infra.availableProjects.push(this.generateRandomProject(infra.projectsCompletedCount || 0, false));
        }
    },

    generateRandomProject(completedCount, isQuick = false) {
        const sources = ['Pemerintah', 'Swasta', 'BUMN'];
        const paymentMethods = ['upfront', 'weekly', 'daily', 'monthly'];
        const source = sources[Math.floor(Math.random() * sources.length)];
        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        
        let level = 1;
        if (completedCount >= 12) level = 4;
        else if (completedCount >= 7) level = 3;
        else if (completedCount >= 3) level = 2;

        let nameList = PROJECT_NAMES[`lvl${level}`];
        let baseName = nameList[Math.floor(Math.random() * nameList.length)];
        if (isQuick) baseName = `[⚡ Tender Cepat] ${baseName}`;

        let budget, duration, req = {};
        
        if (isQuick) {
            // Quick Tender: shorter, cheaper, lower reqs
            duration = Math.floor(Math.random() * 2) + 1; // 1-2 months
            budget = Math.round((20000 + Math.random() * 30000) * level);
            
            // Choose 1 simple requirement
            const candidateReqs = ['excavator', 'bulldozer', 'dump_truck', 'road_roller', 'forklift'];
            const chosen = candidateReqs[Math.floor(Math.random() * candidateReqs.length)];
            req[chosen] = 1;
        } else {
            // Natural Progressive Tenders
            if (level === 1) {
                budget = Math.round(100000 + Math.random() * 100000);
                duration = Math.floor(Math.random() * 3) + 2; // 2-4 months
                req.excavator = 1;
                if (Math.random() > 0.5) req.bulldozer = 1;
                else req.forklift = 1;
            } else if (level === 2) {
                budget = Math.round(250000 + Math.random() * 200000);
                duration = Math.floor(Math.random() * 4) + 3; // 3-6 months
                req.excavator = 1;
                req.road_roller = 1;
                req.dump_truck = 1;
                if (Math.random() > 0.5) req.wheel_loader = 1;
            } else if (level === 3) {
                budget = Math.round(600000 + Math.random() * 500000);
                duration = Math.floor(Math.random() * 5) + 5; // 5-9 months
                req.tower_crane = 1;
                req.concrete_mixer = 1;
                req.mobile_crane = 1;
                req.excavator = 2;
                if (Math.random() > 0.5) req.concrete_pump = 1;
            } else {
                budget = Math.round(1500000 + Math.random() * 2500000);
                duration = Math.floor(Math.random() * 9) + 8; // 8-16 months
                req.tower_crane = 2;
                req.mobile_crane = 1;
                req.concrete_pump = 1;
                req.concrete_mixer = 2;
                req.excavator = 3;
                req.bulldozer = 1;
            }
        }

        return {
            id: 'proj_av_' + Math.random().toString(36).substr(2, 5),
            name: baseName,
            source,
            budget,
            duration,
            req,
            paymentMethod,
            isQuickTender: isQuick,
            daysProcessed: 0,
            weeksProcessed: 0
        };
    },

    setCrewSalary(salary, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const infra = this.getInfrastructureState(manager);
        
        infra.crewBaseSalary = Math.max(500, Math.min(1500, Math.round(salary)));
        gameState.update('business', b => ({ ...b, infrastructure: infra }));
        return true;
    },

    setCrewAllocationMode(mode, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const infra = this.getInfrastructureState(manager);
        
        if (!['overstaffed', 'normal', 'efficient'].includes(mode)) {
            throw new Error('Mode alokasi kru tidak dikenal');
        }
        infra.crewAllocationMode = mode;
        gameState.update('business', b => ({ ...b, infrastructure: infra }));
        return true;
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
            catalogId: spec.id,
            ...spec
        });
        biz.valuation += spec.price * 1.3;

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
        const resaleValue = Math.round(equip.price * 0.55);

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

    generateQuickTender(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const infra = this.getInfrastructureState(manager);

        // Limit available projects to 5
        if (infra.availableProjects.length >= 5) {
            throw new Error('Bursa tender penuh! Tolong ambil atau selesaikan tender yang ada.');
        }

        const quickTender = this.generateRandomProject(infra.projectsCompletedCount || 0, true);
        infra.availableProjects.push(quickTender);

        gameState.update('business', b => ({ ...b, infrastructure: infra }));
        ui.success(`Tender cepat "${quickTender.name}" berhasil dibuka di bursa!`, '⚡ Tender Cepat');
        return true;
    },

    refreshAvailableProjects(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;
        const infra = this.getInfrastructureState(manager);

        infra.availableProjects = [];
        for (let i = 0; i < 3; i++) {
            infra.availableProjects.push(this.generateRandomProject(infra.projectsCompletedCount || 0, false));
        }

        gameState.update('business', b => ({ ...b, infrastructure: infra }));
    },

    bidProject(projectId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const infra = this.getInfrastructureState(manager);

        const proj = infra.availableProjects.find(p => p.id === projectId);
        if (!proj) throw new Error('Proyek tidak ditemukan di bursa tender!');

        // Count owned equipment types (matching catalogId or id)
        const ownedCounts = {};
        EQUIPMENT_CATALOG.forEach(cat => { ownedCounts[cat.id] = 0; });
        infra.heavyEquipment.forEach(e => {
            const cid = e.catalogId || e.id;
            if (ownedCounts[cid] !== undefined) ownedCounts[cid]++;
        });

        // Check equipment requirements
        for (const [reqKey, reqQty] of Object.entries(proj.req)) {
            const ownedQty = ownedCounts[reqKey] || 0;
            if (ownedQty < reqQty) {
                const spec = EQUIPMENT_CATALOG.find(e => e.id === reqKey);
                throw new Error(`Tender ditolak! Anda kekurangan alat berat tipe "${spec?.name || reqKey}". Butuh: ${reqQty}, Dimiliki: ${ownedQty}.`);
            }
        }

        // Remove from available and add to active
        infra.availableProjects = infra.availableProjects.filter(p => p.id !== projectId);
        
        const activeProj = {
            ...proj,
            monthsLeft: proj.duration,
            progress: 0,
            daysProcessed: 0,
            weeksProcessed: 0
        };

        // Pay upfront if chosen payment method is upfront
        if (activeProj.paymentMethod === 'upfront') {
            // Apply civil license modifier if present
            let milestoneModifier = 1.0;
            const initiatives = biz.initiatives || {};
            if (initiatives.infra_civil_license) milestoneModifier += 0.25;
            
            const netPayout = Math.round(activeProj.budget * milestoneModifier);
            biz.cash += netPayout;
            ui.info(`Pembayaran Di Depan diterima: +$ ${netPayout.toLocaleString()} langsung masuk ke kas Treasury!`, '💰 Upfront Payout');
        }

        infra.activeProjects.push(activeProj);

        gameState.update('business', b => ({ ...b, cash: biz.cash, infrastructure: infra }));

        ui.success(`Tender proyek "${proj.name}" diterima! Kontrak sipil resmi ditandatangani.`, '🏗️ Kontrak Didapat');
        return true;
    },

    processDailyUpdate(manager, biz) {
        const infra = this.getInfrastructureState(manager);
        if (!infra || !infra.activeProjects || infra.activeProjects.length === 0) return;

        const day = gameState.get('gameTime.day') || 1;
        const initiatives = biz.initiatives || {};
        const econMult = globalEconomy.getDemandMultiplier('infrastructure') || 1.0;

        let modifier = 1.0;
        if (initiatives.infra_civil_license) modifier += 0.25;

        let cashInflow = 0;

        infra.activeProjects.forEach(proj => {
            proj.daysProcessed = (proj.daysProcessed || 0) + 1;
            const totalDays = proj.duration * 30;

            if (proj.paymentMethod === 'daily') {
                const dailyRate = proj.budget / totalDays;
                const pay = dailyRate * econMult * modifier;
                cashInflow += pay;
            } else if (proj.paymentMethod === 'weekly') {
                // If it is a multiple of 7, or if it is the end of the project and some weeks were missed
                if (proj.daysProcessed % 7 === 0) {
                    const totalWeeks = Math.ceil(totalDays / 7);
                    const weeklyRate = proj.budget / totalWeeks;
                    const pay = weeklyRate * econMult * modifier;
                    cashInflow += pay;
                    proj.weeksProcessed = (proj.weeksProcessed || 0) + 1;
                }
            }
        });

        if (cashInflow > 0) {
            biz.cash = (biz.cash || 0) + Math.round(cashInflow);
            gameState.update('business', b => ({ ...b, cash: biz.cash, infrastructure: infra }));
        }
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

        // 2. Crew Management & Salary Calculations
        let standardCrewNeeded = 0;
        infra.heavyEquipment.forEach(eq => {
            standardCrewNeeded += eq.crewReq || 1;
        });

        let activeCrew = standardCrewNeeded;
        let wageMultiplier = 1.0;
        let crewSpeedMult = 1.0;

        const mode = infra.crewAllocationMode || 'normal';
        if (mode === 'overstaffed') {
            activeCrew = Math.round(standardCrewNeeded * 1.3);
            wageMultiplier = 1.0;
            crewSpeedMult = 1.2;
        } else if (mode === 'efficient') {
            activeCrew = Math.round(standardCrewNeeded * 0.7);
            wageMultiplier = 1.5; // Overtime wage multiplier
            crewSpeedMult = 0.9;
        }

        const crewBase = infra.crewBaseSalary || 800;
        // Higher base salary yields speed factor
        const motivationSpeedFactor = crewBase / 800;
        const speedMult = crewSpeedMult * motivationSpeedFactor * (ops.production === 'jit' ? 1.15 : 1.0) * (initiatives.infra_heavy_machinery ? 1.25 : 1.0);

        const totalCrewWages = activeCrew * (crewBase * wageMultiplier);

        if (initiatives.infra_safety_first) equipmentMaintenance *= 0.95;

        // 3. Process active projects progress
        let completedProjects = [];
        infra.activeProjects.forEach(proj => {
            // Process revenue for 'monthly' payment method
            if (proj.paymentMethod === 'monthly') {
                const monthlyPayment = (proj.budget / proj.duration) * infra.demandFluctuation;
                let milestoneModifier = 1.0;
                if (initiatives.infra_civil_license) milestoneModifier += 0.25;
                monthlyRevenue += monthlyPayment * milestoneModifier;
            }
            
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
                    infra.projectsCompletedCount = (infra.projectsCompletedCount || 0) + 1;
                    setTimeout(() => {
                        ui.success(`Proyek konstruksi "${p.name}" telah selesai dengan sukses! Reputasi kontraktor meningkat.`, '🎉 Proyek Selesai');
                    }, 200);
                    // Grant one-time completion bonus
                    monthlyRevenue += p.budget * 0.1; 
                    return false;
                }
                return true;
            });
        }

        // 4. Regrow available projects if empty or low
        if (infra.availableProjects.length < 2 || Math.random() < 0.3) {
            infra.availableProjects.push(this.generateRandomProject(infra.projectsCompletedCount || 0, false));
        }

        // Limit available projects to 4 maximum (excluding newly added quick tenders)
        infra.availableProjects = infra.availableProjects.slice(0, 5);

        gameState.update('business', b => ({
            ...b,
            infrastructure: infra
        }));

        return {
            wages: Math.round(totalCrewWages),
            cost: Math.round(equipmentMaintenance),
            revenue: Math.round(monthlyRevenue)
        };
    }
};

export default InfrastructureSector;
