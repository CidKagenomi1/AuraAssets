/**
 * BusinessManager.js - Manage Player's Company (Extended Enterprise Edition)
 * Handles startup/UMKM creation, operations, holding companies (subsidiaries), and IPO.
 */

import gameState from '../game/GameState.js';
import financeManager from '../finance/FinanceManager.js';
import globalEconomy from '../game/GlobalEconomy.js';
import ui from '../ui/UIManager.js';
import stockMarket from '../finance/StockMarket.js';
import TechSector from './sectors/TechSector.js';
import FinanceSector from './sectors/FinanceSector.js';
import EnergySector from './sectors/EnergySector.js';
import AerospaceSector from './sectors/AerospaceSector.js';
import AutomotiveSector from './sectors/AutomotiveSector.js';
import RetailSector from './sectors/RetailSector.js';
import HealthcareSector from './sectors/HealthcareSector.js';
import InfrastructureSector from './sectors/InfrastructureSector.js';
import { INDUSTRY_INITIATIVES } from './IndustryInitiatives.js';
import CorporateGovernance from './CorporateGovernance.js';
import {
    generateRandomAuction,
    tickAuctions,
    placeBid,
    buyoutDirect
} from './BusinessAuctions.js';

class BusinessManager {
    constructor() {
        this.businessTypes = {
            umkm: {
                name: "UMKM / Small Business",
                description: "Risiko rendah, profit stabil. Cocok untuk pemula.",
                icon: "🏪",
                setupCost: 10000, // $10,000
                baseRevenue: 1500, // $1,500/mo
                growthRate: 0.05, // 5% monthly growth
                valuationMultiplier: 2, // 2x Annual Revenue
                maxLevel: 10
            },
            startup: {
                name: "Tech Startup",
                description: "High Risk, High Reward. Bakar uang di awal.",
                icon: "🚀",
                setupCost: 50000, // $50,000
                baseRevenue: 0, // Starts at 0
                maxRevenue: 500000, // Potential $500,000/mo
                growthRate: 0.20, // 20% monthly growth potential
                burnRate: 2000, // $2,000/mo initial burn
                valuationMultiplier: 15, // 15x Annual Revenue (Tech multiple)
                maxLevel: 100
            }
        };

        this.industries = {
            tech: { name: "Teknologi & Telekomunikasi", multiplier: 2.5, volatility: 0.3 },
            finance: { name: "Jasa Keuangan", multiplier: 2.0, volatility: 0.2 },
            energy: { name: "Energi & Utilitas", multiplier: 1.5, volatility: 0.1 },
            manufacturing: { name: "Manufaktur & Dirgantara", multiplier: 1.8, volatility: 0.15 },
            automotive: { name: "Otomotif & Transportasi", multiplier: 1.6, volatility: 0.2 },
            healthcare: { name: "Kesehatan & Bioteknologi", multiplier: 1.4, volatility: 0.05 },
            retail: { name: "Barang Konsumsi (FMCG) & Ritel", multiplier: 1.1, volatility: 0.1 },
            infrastructure: { name: "Infrastruktur & Properti", multiplier: 2.2, volatility: 0.2 }
        };

        this.subsidiaryTypes = {
            retail: { name: "UMKM Retail Store", cost: 15000, monthlyProfit: 2000, valuation: 40000, icon: "🛒" },
            tech: { name: "Tech Software Studio", cost: 75000, monthlyProfit: 12000, valuation: 250000, icon: "💻" },
            factory: { name: "Luxury Automotive Assembler", cost: 400000, monthlyProfit: 80000, valuation: 1500000, icon: "🏭" }
        };
    }

    _addBusinessHistory(type, description, extra = null) {
        const work = gameState.get('work') || {};
        if (!work.history) work.history = [];
        
        const day = gameState.get('gameTime.day') || 1;
        const month = gameState.get('gameTime.month') || 1;
        const year = gameState.get('gameTime.year') || 2010;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const dateText = `${day} ${months[month - 1]} ${year}`;

        work.history.push({
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            type,
            description,
            extra,
            date: dateText
        });
        gameState.set('work', work);
    }

    startBusiness(name, type, industryKey, customCapital = null) {
        const typeData = this.businessTypes[type];
        const playerBalance = gameState.getBalance();

        let setupCost = typeData.setupCost;
        let startingCash = type === 'umkm' ? 5000 : 25000;

        if (type === 'startup' && customCapital !== null) {
            const parsed = parseFloat(customCapital);
            if (isNaN(parsed) || parsed <= 0) {
                throw new Error("Nominal modal awal startup tidak valid!");
            }
            if (parsed < 25000) {
                throw new Error("Minimal modal awal startup adalah $ 25.000!");
            }
            setupCost = parsed;
            startingCash = parsed; // The startup gets all the cash injected into its treasury!
        }

        if (playerBalance < setupCost) {
            throw new Error(`Saldo tidak cukup. Anda membutuhkan $ ${financeManager.formatCurrency(setupCost)} dari saldo pribadi.`);
        }

        // Deduct setup cost
        financeManager.donate(setupCost, 'Business Setup', 'Business Setup');

        // Initialize business state
        gameState.update('business', {
            active: true,
            name: name,
            type: type,
            industry: industryKey,
            level: 1,
            valuation: setupCost,
            revenue: typeData.baseRevenue,
            cash: startingCash,
            employees: 1,
            marketing: 1,
            productQuality: 1,
            rdLevel: 1,
            marketingCampaign: 'none',
            managers: { ops: false, marketing: false, rd: false },
            ipo: { active: false, ticker: '', totalShares: 0, publicShares: 0, publicSharePercent: 0, sharePrice: 0 },
            subsidiaries: [],
            operations: { supplier: 'local', production: 'manual' }, // Initial Supply Chain State
            foundedAt: {
                month: gameState.get('gameTime.month') || 1,
                year: gameState.get('gameTime.year') || 2010
            },
            history: []
        });

        // Set career to 'entrepreneur' automatically
        gameState.set('career.currentJob', 'entrepreneur');

        // Log history
        const indName = this.industries[industryKey]?.name || industryKey;
        const typeText = type === 'startup' ? 'Tech Startup' : 'UMKM';
        this._addBusinessHistory('business_start', `Mendirikan Perusahaan "${name}" (${typeText}) di industri ${indName} & resmi menjabat sebagai CEO.`, name);

        ui.success(`Bisnis "${name}" berhasil didirikan dengan modal $ ${financeManager.formatCurrency(setupCost)}!`, '🚀 Bisnis Dimulai');

        return true;
    }

    /**
     * Update Supply Chain and Production Operational parameters
     */
    updateOperations(supplier, production) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');

        gameState.update('business', b => ({
            ...b,
            operations: { supplier, production }
        }));

        this.recalculateValuation();

        ui.success('Konfigurasi rantai pasok dan produksi ERP berhasil dioptimalkan!', '⚙️ ERP Terkalibrasi');
    }

    /**
     * Recalculate corporate valuation instantly on state changes (R&D upgrades, subsidiaries, treasury actions)
     */
    recalculateValuation() {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;
        const typeData = this.businessTypes[biz.type];
        const industry = this.industries[biz.industry];
        const initiatives = biz.initiatives || {};

        let annualRunRate = (biz.revenue || 0) * 12;
        
        // Initiative Multiplier Boosts
        let industryMultiplier = industry.multiplier;
        if (initiatives.tech_ai_features) industryMultiplier += 0.3;
        if (initiatives.mfg_aerospace) industryMultiplier += 0.5;
        if (initiatives.hc_vaccine) industryMultiplier += 0.4;
        if (initiatives.infra_leed) industryMultiplier += 0.4;

        let mainValuation = annualRunRate * industryMultiplier * typeData.valuationMultiplier;
        
        let subsidiariesValuation = 0;
        (biz.subsidiaries || []).forEach(sub => {
            let subVal = sub.valuation || 0;
            if (sub.isPremium) subVal *= 1.35;
            subsidiariesValuation += subVal;
        });

        let totalValuation = mainValuation + subsidiariesValuation;

        // Initiative Valuation percentage bonus
        let valBonusPercent = 1.0;
        if (initiatives.energy_renewable) valBonusPercent += 0.25;
        if (initiatives.fin_audit) valBonusPercent += 0.15;
        if (initiatives.auto_hypercar) valBonusPercent += 0.20;
        if (initiatives.retail_green) valBonusPercent += 0.15;

        totalValuation *= valBonusPercent;

        if (initiatives.infra_township) {
            totalValuation += 350000;
        }

        totalValuation = Math.max(totalValuation, (biz.cash || 0) + (typeData.setupCost * 0.5));

        const isPublic = biz.ipo && biz.ipo.active;
        if (isPublic) {
            const stockData = stockMarket.getStock(biz.ipo.ticker);
            if (stockData) {
                totalValuation = stockData.price * biz.ipo.totalShares;
            }
        }

        gameState.update('business', b => ({
            ...b,
            valuation: totalValuation
        }));
    }

    /**
     * Process Monthly Business Cycle
     */
    processMonthlyUpdate(economyIndex) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;

        const typeData = this.businessTypes[biz.type];
        const industry = this.industries[biz.industry];
        const ops = biz.operations || { supplier: 'local', production: 'manual' };
        const initiatives = biz.initiatives || {};

        // 1. Calculate Operations & Supply Chain Parameters
        let supplierCost = 500;
        let supplierQuality = 0.50;
        let supplierLeadTime = 14;
        
        if (ops.supplier === 'national') {
            supplierCost = 2500;
            supplierQuality = 0.85;
            supplierLeadTime = 7;
        } else if (ops.supplier === 'global') {
            supplierCost = 9000;
            supplierQuality = 0.98;
            supplierLeadTime = 3;
        }

        let prodCost = 1500;
        let prodSpeed = 1.0;
        let defectBase = 0.02;

        if (ops.production === 'batch') {
            prodCost = 6000;
            prodSpeed = 2.0;
            defectBase = 0.06;
        } else if (ops.production === 'jit') {
            prodCost = 20000;
            prodSpeed = 4.5;
            defectBase = 0.12;
        }

        // Apply Initiative modifications to Production Parameters
        if (initiatives.mfg_robots) {
            defectBase = Math.max(0.001, defectBase - 0.06);
            prodSpeed += 2.0;
        }
        if (initiatives.mfg_lean) {
            prodCost *= 0.8;
        }
        if (initiatives.retail_warehouse) {
            supplierCost *= 0.85;
        }
        if (initiatives.infra_precast) {
            prodSpeed *= 1.43; // reduces cycle time by ~30%
        }
        if (initiatives.energy_smart_grid) {
            defectBase = Math.max(0.001, defectBase - 0.04);
        }

        // Defect rate spikes if you run low quality local inputs in JIT/Batch machinery!
        const supplierMismatchedMultiplier = (ops.production === 'jit' && ops.supplier === 'local') ? 2.5 
                                           : (ops.production === 'batch' && ops.supplier === 'local') ? 1.5 
                                           : 1.0;
        const defectRate = Math.max(0.005, defectBase * (1.5 - supplierQuality) * supplierMismatchedMultiplier);
        let totalLeadTime = supplierLeadTime + Math.round(15 / prodSpeed);

        if (initiatives.retail_warehouse) {
            totalLeadTime = Math.max(1, totalLeadTime - 5);
        }

        // Calculate Defect Penalties and Speed Bonuses
        let defectPenalty = 1.0;
        if (defectRate > 0.10) {
            defectPenalty = 0.5; // Customer complaints, returns & recalls: 50% revenue cut!
        } else if (defectRate > 0.05) {
            defectPenalty = 0.8; // 20% penalty
        }

        let speedBonus = 1.0;
        if (biz.type === 'startup') {
            // Startups scale aggressively on high quality inputs and fast cycle times
            if (ops.supplier === 'global' && ops.production === 'jit') {
                speedBonus = 2.5; // Perfect JIT global alignment!
            } else if (ops.supplier === 'national' && ops.production === 'batch') {
                speedBonus = 1.2;
            } else {
                speedBonus = 0.7; // Local manual is too slow and poor quality for tech scaling
            }
        } else {
            // UMKMs scale on mid-level, cost-effective regional structures
            if (ops.supplier === 'national' && ops.production === 'batch') {
                speedBonus = 1.8; // Perfect local efficiency combo!
            } else if (ops.supplier === 'local' && ops.production === 'manual') {
                speedBonus = 1.2;
            } else if (ops.production === 'jit') {
                speedBonus = 0.6; // Overhead is too costly, drains margins!
            }
        }

        const opMultiplier = speedBonus * defectPenalty;

        // 2. Calculate Growth multipliers
        const employees = biz.employees || 1;
        const marketing = biz.marketing || 1;
        const quality = biz.productQuality || 1;
        const rd = biz.rdLevel || 1;
        const managers = biz.managers || { ops: false, marketing: false, rd: false };

        const economyFactor = economyIndex / 1000;
        
        // Campaign boosts
        let campaignCost = 0;
        let campaignBoost = 1.0;
        if (biz.marketingCampaign === 'local') {
            campaignCost = 1000;
            campaignBoost = 1.25;
        } else if (biz.marketingCampaign === 'social') {
            campaignCost = 5000;
            campaignBoost = 1.6;
        } else if (biz.marketingCampaign === 'global') {
            campaignCost = 25000;
            campaignBoost = 2.5;
        }

        // Apply Initiative marketing boosts
        if (initiatives.tech_global_server) campaignBoost += 0.5;
        if (initiatives.auto_hypercar) campaignBoost += 0.4;
        if (initiatives.retail_alliance) campaignBoost += 0.3;

        const managerMarketingMultiplier = managers.marketing ? 2.0 : 1.0;
        const managerRDMultiplier = managers.rd ? 1.5 : 1.0;

        const marketingEffect = 1 + (marketing * 0.1 * campaignBoost * managerMarketingMultiplier);
        const qualityEffect = 1 + (quality * 0.1 * (rd * 0.15) * managerRDMultiplier);

        let multiplier = 1 + (typeData.growthRate * economyFactor * marketingEffect * qualityEffect);

        // Volatility
        let finalVolatility = industry.volatility;
        if (initiatives.fin_hft) finalVolatility += 0.1; // Increases volatility
        if (initiatives.fin_audit) finalVolatility = Math.max(0.01, finalVolatility - 0.1); // Decreases volatility

        const volatility = (Math.random() - 0.5) * 2 * finalVolatility;
        multiplier += volatility;

        // Startup or UMKM Revenue and Expenses
        let monthlyRevenue = (biz.revenue || 0);
        let monthlyExpense = employees * 1000; // $1,000 avg wage
        let industryDetails = null;

        if (biz.industry === 'tech') {
            const techResult = TechSector.processMonthlyTick(this, biz, typeData, industry, ops, initiatives, managers);
            monthlyExpense = techResult.wages + techResult.cost;
            monthlyRevenue += techResult.revenue;
            industryDetails = {
                label: 'Operasional Tech R&D & Server',
                cost: techResult.wages + techResult.cost,
                breakdown: [
                    { label: 'Gaji Programmer & Engineer', val: techResult.wages },
                    { label: 'Biaya Server & Cloud Hosting', val: techResult.cost }
                ]
            };
        } else if (biz.industry === 'finance') {
            const financeResult = FinanceSector.processMonthlyTick(this, biz, typeData, industry, ops, initiatives, managers);
            monthlyExpense = financeResult.wages + financeResult.cost;
            monthlyRevenue += financeResult.revenue;
            if (financeResult.liquidityPenalty && financeResult.liquidityPenalty < 1.0) {
                multiplier *= financeResult.liquidityPenalty;
            }
            industryDetails = {
                label: 'Holding Keuangan & Likuiditas',
                cost: financeResult.wages + financeResult.cost,
                breakdown: [
                    { label: 'Beban Gaji Teller & Staf Bank', val: financeResult.wages },
                    { label: 'Beban Bunga Deposito Nasabah', val: financeResult.cost }
                ]
            };
        } else if (biz.industry === 'energy') {
            const energyResult = EnergySector.processMonthlyTick(this, biz, typeData, industry, ops, initiatives, managers);
            monthlyExpense = energyResult.wages + energyResult.cost;
            monthlyRevenue += energyResult.revenue;
            industryDetails = {
                label: 'Sektor Energi & Kilang',
                cost: energyResult.wages + energyResult.cost,
                breakdown: [
                    { label: 'Gaji Pekerja Tambang & Teknisi', val: energyResult.wages },
                    { label: 'Biaya Pemeliharaan Kilang & Bor', val: energyResult.cost }
                ]
            };
        } else if (biz.industry === 'manufacturing') {
            const aeroResult = AerospaceSector.processMonthlyTick(this, biz, typeData, industry, ops, initiatives, managers);
            monthlyExpense = aeroResult.wages + aeroResult.cost;
            monthlyRevenue += aeroResult.revenue;
            industryDetails = {
                label: 'Sektor Manufaktur & Dirgantara',
                cost: aeroResult.wages + aeroResult.cost,
                breakdown: [
                    { label: 'Gaji Pilot, Staf Bandara & Mekanik', val: aeroResult.wages },
                    { label: 'Biaya Maint Pesawat & Grounding', val: aeroResult.cost }
                ]
            };
        } else if (biz.industry === 'automotive') {
            const autoResult = AutomotiveSector.processMonthlyTick(this, biz, typeData, industry, ops, initiatives, managers);
            monthlyExpense = autoResult.wages + autoResult.cost;
            monthlyRevenue += autoResult.revenue;
            industryDetails = {
                label: 'Sektor Otomotif & Pabrik',
                cost: autoResult.wages + autoResult.cost,
                breakdown: [
                    { label: 'Gaji Buruh & Operator Pabrik', val: autoResult.wages },
                    { label: 'Biaya Riset Model & Bahan Perakitan', val: autoResult.cost }
                ]
            };
        } else if (biz.industry === 'retail') {
            const retailResult = RetailSector.processMonthlyTick(this, biz, typeData, industry, ops, initiatives, managers);
            monthlyExpense = retailResult.wages + retailResult.cost;
            monthlyRevenue += retailResult.revenue;
            industryDetails = {
                label: 'Sektor Retail & Supply Chain',
                cost: retailResult.wages + retailResult.cost,
                breakdown: [
                    { label: 'Gaji Kasir & Pramuniaga Toko', val: retailResult.wages },
                    { label: 'Biaya Sewa Toko & Manajemen Gudang', val: retailResult.cost }
                ]
            };
        } else if (biz.industry === 'healthcare') {
            const hcResult = HealthcareSector.processMonthlyTick(this, biz, typeData, industry, ops, initiatives, managers);
            monthlyExpense = hcResult.wages + hcResult.cost;
            monthlyRevenue += hcResult.revenue;
            industryDetails = {
                label: 'Operasional Kesehatan & Rumah Sakit',
                cost: hcResult.wages + hcResult.cost,
                breakdown: [
                    { label: 'Gaji Tenaga Medis (Dokter & Perawat)', val: hcResult.wages },
                    { label: 'Biaya Pemeliharaan RS & Klinik', val: hcResult.cost }
                ]
            };
        } else if (biz.industry === 'infrastructure') {
            const infraResult = InfrastructureSector.processMonthlyTick(this, biz, typeData, industry, ops, initiatives, managers);
            monthlyExpense = infraResult.wages + infraResult.cost;
            monthlyRevenue += infraResult.revenue;
            industryDetails = {
                label: 'Operasional Properti & Tata Kota',
                cost: infraResult.wages + infraResult.cost,
                breakdown: [
                    { label: 'Gaji Pengawas & Pekerja Konstruksi', val: infraResult.wages },
                    { label: 'Biaya Pemeliharaan Aset Properti', val: infraResult.cost }
                ]
            };
        }

        // R&D cost-reduction coefficient: reduces base cost by up to 25%
        const rdCostDiscount = Math.min(rd * 0.02, 0.25);
        const managerOpsDiscount = managers.ops ? 0.05 : 0.0;

        // Initiative Expense Discounts
        let initiativeExpenseDiscount = 0;
        if (initiatives.energy_renewable) initiativeExpenseDiscount += 0.15;
        if (initiatives.hc_ehr) initiativeExpenseDiscount += 0.12;
        if (initiatives.tech_opt_app) initiativeExpenseDiscount += 0.10;

        // Initiative Revenue Modifiers
        let revMultiplier = 1.0;
        if (initiatives.tech_ai_features) revMultiplier += 0.15;
        if (initiatives.tech_global_server) revMultiplier += 0.20;
        if (initiatives.energy_smart_grid) revMultiplier += 0.10;
        if (initiatives.fin_hft) revMultiplier += 0.15;
        if (initiatives.retail_alliance) revMultiplier += 0.20;
        if (initiatives.hc_vaccine) revMultiplier += 0.25;

        // Initiative flat bonuses
        let flatRevenueBonus = 0;
        if (initiatives.energy_find_resource) flatRevenueBonus += 10000;
        if (initiatives.fin_wealth) flatRevenueBonus += 8000;
        if (initiatives.auto_dealers) flatRevenueBonus += 12000;
        if (initiatives.hc_robots) flatRevenueBonus += 6500;

        let finalBaseBurn = 0;
        let finalBurnDiscount = 0;
        let finalUMKMRatioCost = 0;

        if (biz.type === 'startup') {
            monthlyRevenue = Math.max(monthlyRevenue * multiplier * opMultiplier * revMultiplier + flatRevenueBonus, 0);
            if (monthlyRevenue === 0 && biz.level > 0) monthlyRevenue = 500 * opMultiplier; // Early traction
            
            // Burn rate increases with startup scale, discounted by R&D and Ops Manager and Initiatives
            const baseBurn = typeData.burnRate * (1 + (biz.level * 0.2));
            const totalBurnDiscount = Math.min(0.60, rdCostDiscount + managerOpsDiscount + initiativeExpenseDiscount);
            monthlyExpense += baseBurn * (1 - totalBurnDiscount);

            finalBaseBurn = baseBurn;
            finalBurnDiscount = totalBurnDiscount;
        } else {
            monthlyRevenue = (monthlyRevenue * Math.max(1, multiplier) * opMultiplier * revMultiplier) + flatRevenueBonus;
            // UMKM operating expense ratio gets improved by R&D efficiency and Initiatives
            const totalUMKMDiscount = Math.min(0.60, rdCostDiscount + managerOpsDiscount + initiativeExpenseDiscount);
            const expRatio = Math.max(0.20, 0.60 - totalUMKMDiscount);
            monthlyExpense += monthlyRevenue * expRatio;

            finalUMKMRatioCost = monthlyRevenue * expRatio;
        }

        // Add campaign cost, executive salaries, and supply/production costs
        monthlyExpense += campaignCost + supplierCost + prodCost;
        let executiveCost = 0;
        if (managers.ops) {
            monthlyExpense += 3000;
            executiveCost += 3000;
        }
        if (managers.marketing) {
            monthlyExpense += 3000;
            executiveCost += 3000;
        }
        if (managers.rd) {
            monthlyExpense += 3000;
            executiveCost += 3000;
        }

        // 3. Contributions from subsidiaries (Holding Company Gurita Bisnis)
        let subsidiariesValuation = 0;
        let subsidiariesProfit = 0;
        const subsidiariesList = biz.subsidiaries || [];
        subsidiariesList.forEach(sub => {
            subsidiariesProfit += sub.monthlyProfit || 0;
            let subVal = sub.valuation || 0;
            if (sub.isPremium) subVal *= 1.35;
            subsidiariesValuation += subVal;
        });

        // 4. Update corporate cash
        const luckActive = (gameState.get('donations.luckTicksRemaining') || 0) > 0;
        let finalRevenue = monthlyRevenue;
        let finalSubsidiariesProfit = subsidiariesProfit;
        if (luckActive) {
            finalRevenue *= 1.5;
            finalSubsidiariesProfit *= 1.5;
        }

        let newCash = biz.cash + finalRevenue + finalSubsidiariesProfit - monthlyExpense;

        // Warn bankruptcy
        if (newCash < 0) {
            ui.error(`Peringatan: Arus Kas ${biz.name} Defisit ($ ${financeManager.formatCurrency(newCash)})! Mohon suntik modal (Inject Treasury) segera!`, '⚠️ Cashflow Defisit');
        }

        // 5. Calculate Corporate Valuation
        let industryMultiplier = industry.multiplier;
        if (initiatives.tech_ai_features) industryMultiplier += 0.3;
        if (initiatives.mfg_aerospace) industryMultiplier += 0.5;
        if (initiatives.hc_vaccine) industryMultiplier += 0.4;
        if (initiatives.infra_leed) industryMultiplier += 0.4;

        let annualRunRate = finalRevenue * 12;
        let mainValuation = annualRunRate * industryMultiplier * typeData.valuationMultiplier;
        let totalValuation = mainValuation + subsidiariesValuation;

        // Initiative Valuation percentage bonus
        let valBonusPercent = 1.0;
        if (initiatives.energy_renewable) valBonusPercent += 0.25;
        if (initiatives.fin_audit) valBonusPercent += 0.15;
        if (initiatives.auto_hypercar) valBonusPercent += 0.20;
        if (initiatives.retail_green) valBonusPercent += 0.15;

        totalValuation *= valBonusPercent;

        if (initiatives.infra_township) {
            totalValuation += 350000;
        }

        // Minimum valuation is cash assets
        totalValuation = Math.max(totalValuation, newCash + (typeData.setupCost * 0.5));

        // 6. If company is public, synchronize the Valuation with Stock Market Price!
        const isPublic = biz.ipo && biz.ipo.active;
        if (isPublic) {
            const stockData = stockMarket.getStock(biz.ipo.ticker);
            if (stockData) {
                totalValuation = stockData.price * biz.ipo.totalShares;
            }
        }

        let finalCash = newCash;
        // Founder's salary (Only pays if private, cash is high, and company is positive)
        if (!isPublic && newCash > 15000) {
            const salary = 1500;
            financeManager.addIncome(salary, 'Gaji', `CEO salary from ${biz.name}`);
            finalCash = newCash - salary;
        }

        // Board Management Monthly Tick
        let updatedBoard = null;
        if (isPublic && biz.ipo.board) {
            updatedBoard = [...biz.ipo.board];
            updatedBoard.forEach(m => {
                // Natural fluctuations based on performance:
                if (m.preference === 'growth') {
                    if (finalRevenue > (biz.revenue || 0)) {
                        m.relationship = Math.min(100, m.relationship + Math.floor(Math.random() * 4) + 1);
                    } else {
                        m.relationship = Math.max(0, m.relationship - Math.floor(Math.random() * 4) - 1);
                    }
                }
                
                if (m.preference === 'dividend') {
                    if (finalCash < 30000) {
                        m.relationship = Math.max(0, m.relationship - 5);
                    } else {
                        m.relationship = Math.min(100, m.relationship + Math.floor(Math.random() * 2));
                    }
                }
                
                if (m.preference === 'compliance') {
                    if (finalCash < 15000) {
                        m.relationship = Math.max(0, m.relationship - 6);
                    } else {
                        m.relationship = Math.min(100, m.relationship + Math.floor(Math.random() * 2) - 1);
                    }
                }
            });

            // Kudeta (Ouster Risk) if average board relationship is dangerously low (< 25%)
            const avgRelation = updatedBoard.reduce((sum, m) => sum + m.relationship, 0) / updatedBoard.length;
            if (avgRelation < 25 && Math.random() < 0.15) {
                const percent = biz.ipo.publicSharePercent;
                const boardSharesPercent = updatedBoard.reduce((sum, m) => sum + (m.sharesPercent || 0), 0);
                const playerSharesPercent = 100 - percent - boardSharesPercent;
                
                let boardVotesNo = 0;
                let boardVotesYes = 0;
                updatedBoard.forEach(m => {
                    if (m.relationship >= 50) boardVotesYes += m.sharesPercent;
                    else boardVotesNo += m.sharesPercent;
                });
                
                boardVotesNo += percent; // Public joins the no-confidence vote
                
                const passedOuster = boardVotesNo > (playerSharesPercent + boardVotesYes);
                if (passedOuster) {
                    setTimeout(() => {
                        ui.error(`🚨 MOSI TIDAK PERCAYA: Dewan Direksi & Pemegang Saham Publik mengadakan rapat darurat dan MEMECAT Anda dari posisi CEO ${biz.name}! Seluruh sisa saham Anda dilikuidasi paksa.`, '🚨 DIIPECAT DARI CEO');
                        
                        const ticker = biz.ipo.ticker;
                        const stocks = gameState.get('stocks') || {};
                        let cashFromLiquidation = 0;
                        if (stocks[ticker]) {
                            const sharePrice = biz.ipo.sharePrice || 1.0;
                            cashFromLiquidation = stocks[ticker].shares * sharePrice;
                            delete stocks[ticker];
                            gameState.set('stocks', stocks);
                        }
                        
                        gameState.addBalance(cashFromLiquidation, 'income', `Likuidasi Saham Paksa (${biz.name})`);
                        
                        gameState.update('business', {
                            active: false,
                            name: "",
                            type: "",
                            level: 1,
                            valuation: 0,
                            revenue: 0,
                            cash: 0,
                            history: []
                        });
                        
                        gameState.set('career.currentJob', 'unemployed');
                    }, 1000);
                } else {
                    setTimeout(() => {
                        ui.info(`⚠️ ANCAMAN KUDETA GAGAL: Dewan Direksi mengajukan mosi tidak percaya untuk memecat Anda, namun kepemilikan saham Anda yang kuat berhasil menggagalkannya!`, '⚠️ Kudeta Dewan Gagal');
                    }, 1000);
                }
            }
        }

        // Update State
        gameState.update('business', b => {
            const nextHistory = [...b.history, {
                month: gameState.get('gameTime.month'),
                year: gameState.get('gameTime.year'),
                revenue: finalRevenue,
                valuation: totalValuation
            }].slice(-24);

            let newIPO = b.ipo;
            if (isPublic && updatedBoard) {
                newIPO = {
                    ...b.ipo,
                    board: updatedBoard
                };
            }

            return {
                ...b,
                cash: finalCash,
                revenue: finalRevenue,
                valuation: totalValuation,
                history: nextHistory,
                ipo: newIPO,
                lastCashFlow: {
                    revenue: finalRevenue,
                    subsidiariesProfit: finalSubsidiariesProfit,
                    employeesCount: employees,
                    employeesWages: employees * 1000,
                    supplierCost: supplierCost,
                    productionCost: prodCost,
                    campaignCost: campaignCost,
                    executiveCost: executiveCost,
                    startupBurn: biz.type === 'startup' ? (finalBaseBurn * (1 - finalBurnDiscount)) : 0,
                    umkmRatioCost: biz.type === 'umkm' ? finalUMKMRatioCost : 0,
                    industryDetails: industryDetails,
                    totalExpense: monthlyExpense,
                    netProfit: finalRevenue + finalSubsidiariesProfit - monthlyExpense
                }
            };
        });
    }

    /**
     * Corporate treasury: Inject cash from personal wallet
     */
    injectTreasury(amount) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');

        const personalBalance = gameState.getBalance();
        if (personalBalance < amount) throw new Error('Saldo pribadi Anda tidak cukup');

        financeManager.donate(amount, 'Corporate Treasury Injection', 'Corporate Injection');

        gameState.update('business', b => ({
            ...b,
            cash: b.cash + amount
        }));

        this.recalculateValuation();

        ui.success(`Suntik modal $ ${financeManager.formatCurrency(amount)} ke kas perusahaan berhasil!`, '🏦 Kas Perusahaan');
    }

    /**
     * Corporate treasury: Withdraw cash from company to personal wallet (private only or within dividend boundaries)
     */
    withdrawTreasury(amount) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');

        if (biz.ipo && biz.ipo.active) {
            throw new Error('Tidak bisa menarik kas secara acak setelah perusahaan IPO! Gunakan mekanisme Dividend.');
        }

        if (biz.cash < amount + 5000) {
            throw new Error('Kas perusahaan tidak cukup (harus menyisakan minimal $ 5,000)');
        }

        gameState.update('business', b => ({
            ...b,
            cash: b.cash - amount
        }));

        gameState.update('player', p => ({
            ...p,
            balance: p.balance + amount
        }));

        financeManager.addIncome(amount, 'Treasury Withdrawal', `Penarikan kas pribadi dari ${biz.name}`);
        
        this.recalculateValuation();

        ui.success(`Berhasil menarik $ ${financeManager.formatCurrency(amount)} ke rekening pribadi!`, '💸 Kas Pribadi');
    }

    /**
     * Upgrade corporate technology (R&D level)
     */
    upgradeRD() {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;

        const rd = biz.rdLevel || 1;
        const cost = 12000 * rd;

        if (biz.cash < cost) {
            throw new Error(`Kas perusahaan tidak cukup. Butuh $ ${financeManager.formatCurrency(cost)} dari kas.`);
        }

        gameState.update('business', b => ({
            ...b,
            cash: b.cash - cost,
            rdLevel: rd + 1,
            productQuality: (b.productQuality || 1) + 1
        }));

        this.recalculateValuation();

        ui.success(`Divisi R&D berhasil ditingkatkan ke Tingkat ${rd + 1}! Efisiensi biaya meningkat.`, '💻 R&D Upgrade');
    }

    /**
     * Launch a marketing campaign
     */
    launchCampaign(campaignType) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;

        gameState.update('business', b => ({
            ...b,
            marketingCampaign: campaignType,
            marketing: (b.marketing || 1) + (campaignType === 'none' ? 0 : 2)
        }));

        this.recalculateValuation();

        ui.success(`Kampanye pemasaran ${campaignType.toUpperCase()} berhasil diluncurkan!`, '📢 Kampanye Aktif');
    }

    /**
     * Hire an executive manager
     */
    hireExecutive(role) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;

        if (biz.managers && biz.managers[role]) {
            throw new Error('Manajer di posisi ini sudah aktif!');
        }

        const cost = 15000; // Sign-on fee
        if (biz.cash < cost) {
            throw new Error(`Kas tidak cukup untuk sign-on fee manajer ($ ${financeManager.formatCurrency(cost)})`);
        }

        gameState.update('business', b => {
            const nextManagers = { ...b.managers };
            nextManagers[role] = true;
            return {
                ...b,
                cash: b.cash - cost,
                managers: nextManagers,
                employees: (b.employees || 1) + 1
            };
        });

        this.recalculateValuation();

        const names = { ops: 'COO (Chief Operating Officer)', marketing: 'CMO (Chief Marketing Officer)', rd: 'CTO (Chief Technology Officer)' };
        ui.success(`Eksekutif baru ${names[role]} berhasil direkrut!`, '👔 Manajemen Baru');
    }

    /**
     * Execute a specific industry-specific strategic initiative
     */
    executeIndustryInitiative(initiativeKey) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');

        const industryKey = biz.industry;
        const list = INDUSTRY_INITIATIVES[industryKey] || [];
        const initData = list.find(item => item.key === initiativeKey);

        if (!initData) throw new Error('Inisiatif strategis tidak ditemukan');

        const initiatives = biz.initiatives || {};
        if (initiatives[initiativeKey]) {
            throw new Error('Inisiatif ini sudah aktif diluncurkan!');
        }

        if (biz.cash < initData.cost) {
            throw new Error(`Kas perusahaan tidak cukup. Butuh $ ${financeManager.formatCurrency(initData.cost)} dari kas treasury.`);
        }

        // Deduct treasury cash
        gameState.update('business', b => {
            const nextInitiatives = { ...b.initiatives };
            nextInitiatives[initiativeKey] = true;

            let nextRD = b.rdLevel || 1;
            let nextQuality = b.productQuality || 1;

            // Apply immediate upgrades
            if (initiativeKey === 'tech_opt_app') {
                nextQuality += 1;
            } else if (initiativeKey === 'auto_solid_state') {
                nextRD += 2;
                nextQuality += 3;
            } else if (initiativeKey === 'hc_robots') {
                nextQuality += 2;
            } else if (initiativeKey === 'retail_green') {
                nextQuality += 1;
            }

            return {
                ...b,
                cash: b.cash - initData.cost,
                initiatives: nextInitiatives,
                rdLevel: nextRD,
                productQuality: nextQuality
            };
        });

        this.recalculateValuation();

        ui.success(`Inisiatif "${initData.name}" berhasil diluncurkan! Performa bisnis dioptimalkan.`, '🎯 Inisiatif Sukses');
        return true;
    }

    /**
     * Establish a new private subsidiary under parent holding company
     */
    createSubsidiary(name, category) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;

        const subData = this.subsidiaryTypes[category];
        if (!subData) throw new Error('Kategori anak perusahaan tidak valid');

        if (biz.cash < subData.cost) {
            throw new Error(`Kas induk perusahaan tidak cukup. Butuh $ ${financeManager.formatCurrency(subData.cost)}`);
        }

        const newSub = {
            id: Date.now() + Math.random(),
            name,
            category,
            typeName: subData.name,
            monthlyProfit: subData.monthlyProfit,
            valuation: subData.valuation,
            icon: subData.icon,
            foundedAt: gameState.get('gameTime.year')
        };

        gameState.update('business', b => ({
            ...b,
            cash: b.cash - subData.cost,
            subsidiaries: [...(b.subsidiaries || []), newSub]
        }));

        ui.success(`Anak perusahaan "${name}" (${subData.name}) resmi didirikan di bawah holding Anda!`, '🏢 Gurita Bisnis');
    }

    /**
     * Launch Initial Public Offering (IPO)
     */
    launchIPO(tickerSymbol, publicSharePercent, boardSharePercent = 37) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;

        if (biz.ipo && biz.ipo.active) {
            throw new Error('Perusahaan sudah terdaftar sebagai emiten publik (IPO)!');
        }

        if (biz.valuation < 1000000) {
            throw new Error(`Perusahaan belum layak IPO. Valuasi minimal harus mencapai $ 1,000,000 (Valuasi saat ini: $ ${financeManager.formatCurrency(biz.valuation)})`);
        }

        const ticker = tickerSymbol.toUpperCase().trim();
        if (ticker.length < 3 || ticker.length > 5) {
            throw new Error('Kode ticker saham harus berkisar 3-5 huruf!');
        }

        // Check if ticker already exists in stock exchange
        if (stockMarket.getStock(ticker)) {
            throw new Error(`Kode ticker ${ticker} sudah digunakan oleh emiten lain di bursa!`);
        }

        const totalShares = 1000000; // Standard 1M shares
        const percent = parseFloat(publicSharePercent);
        if (isNaN(percent) || percent < 10 || percent > 49) {
            throw new Error('Alokasi IPO saham ke publik harus berkisar antara 10% s.d 49% (Founder tetap memegang kendali privat mayoritas).');
        }

        const boardPercent = parseFloat(boardSharePercent);
        if (isNaN(boardPercent) || boardPercent < 0 || boardPercent > 40) {
            throw new Error('Alokasi saham ke Dewan Direksi harus berkisar antara 0% s.d 40%.');
        }

        const founderPercent = 100 - percent - boardPercent;
        if (founderPercent < 30) {
            throw new Error('Founder harus mempertahankan minimal 30% kepemilikan saham untuk memimpin perusahaan!');
        }

        const publicShares = totalShares * (percent / 100);
        const founderShares = totalShares * (founderPercent / 100);
        const initialPrice = biz.valuation / totalShares;

        // Calculate direct treasury funding raised
        const fundingRaised = publicShares * initialPrice;

        // Calculate dynamic board shares proportionally
        const nusantaraShare = boardPercent > 0 ? Math.round(boardPercent * (15 / 37) * 10) / 10 : 0;
        const arthaShare = boardPercent > 0 ? Math.round(boardPercent * (12 / 37) * 10) / 10 : 0;
        const globalShare = boardPercent > 0 ? Math.max(0, Math.round((boardPercent - nusantaraShare - arthaShare) * 10) / 10) : 0;

        // 1. Update Corporate state
        gameState.update('business', b => ({
            ...b,
            cash: b.cash + fundingRaised,
            ipo: {
                active: true,
                ticker: ticker,
                totalShares: totalShares,
                publicShares: publicShares,
                publicSharePercent: percent,
                sharePrice: initialPrice,
                board: [
                    { id: 'board_nusantara', name: 'Suryo Hadiningrat', title: 'Perwakilan Nusantara Fund', sharesPercent: nusantaraShare, relationship: 50, preference: 'dividend' },
                    { id: 'board_artha', name: 'Clarissa Wijaya', title: 'Managing Partner Artha Capital', sharesPercent: arthaShare, relationship: 55, preference: 'growth' },
                    { id: 'board_global', name: 'Hendry Morgan', title: 'Director of Global Sentinel Trust', sharesPercent: globalShare, relationship: 50, preference: 'compliance' }
                ]
            }
        }));

        // 2. Register stock ticker in Wall Street Stock Exchange
        stockMarket.registerIPO(ticker, biz.name, initialPrice, this.industries[biz.industry].name, 0.025);

        // 3. Award the founder (player) their major equity stake in the stock portfolio
        const stocks = gameState.get('stocks') || {};
        stocks[ticker] = {
            shares: founderShares,
            avgBuyPrice: initialPrice,
            totalInvested: founderShares * initialPrice,
            reservedShares: 0
        };
        gameState.set('stocks', stocks);

        // Set career to executive CEO
        gameState.set('career.currentJob', 'ceo');

        // Log history
        const fundingText = `$ ${financeManager.formatCurrency(fundingRaised)}`;
        const priceText = `$ ${initialPrice.toFixed(2)}`;
        this._addBusinessHistory('business_ipo', `Melakukan IPO untuk "${biz.name}" (NYSE: ${ticker}) dengan harga perdana ${priceText}/lembar, berhasil meraup dana segar ${fundingText}.`, ticker);

        ui.success(`🔔 IPO Sukses! Emiten [${ticker}] resmi melantai di Wall Street. Kas perusahaan meroket +$ ${financeManager.formatCurrency(fundingRaised)} dari publik!`, '🔔 IPO PERUSAHAAN');
        
        return fundingRaised;
    }

    /**
     * Declare Dividend payout to public and founder
     */
    declareDividend(dividendPerShare) {
        const biz = gameState.get('business');
        if (!biz || !biz.active || !biz.ipo || !biz.ipo.active) {
            throw new Error('Hanya perusahaan terbuka (IPO) yang dapat membagikan deviden!');
        }

        const payout = biz.ipo.totalShares * dividendPerShare;
        if (biz.cash < payout + 20000) {
            throw new Error(`Kas perusahaan tidak mencukupi untuk membagikan deviden senilai $ ${financeManager.formatCurrency(payout)} (Kas harus menyisakan minimal $ 20,000)`);
        }

        // Deduct company treasury cash
        gameState.update('business', b => ({
            ...b,
            cash: b.cash - payout
        }));

        // Transfer player portion
        const ticker = biz.ipo.ticker;
        const stocks = gameState.get('stocks') || {};
        const playerShares = stocks[ticker] ? stocks[ticker].shares : (biz.ipo.totalShares - biz.ipo.publicShares - (biz.ipo.board || []).reduce((sum, m) => sum + (m.sharesPercent || 0), 0) * (biz.ipo.totalShares / 100));
        const playerDividend = playerShares * dividendPerShare;

        gameState.update('player', p => ({
            ...p,
            balance: p.balance + playerDividend
        }));

        financeManager.addIncome(playerDividend, 'Dividend Income', `Deviden dari kepemilikan saham di ${biz.name}`);

        // Update Board relations
        const board = [...(biz.ipo.board || [])];
        board.forEach(m => {
            if (m.preference === 'dividend') m.relationship = Math.min(100, m.relationship + 22);
            else if (m.preference === 'compliance') m.relationship = Math.min(100, m.relationship + 14);
            else m.relationship = Math.min(100, m.relationship + 8);
        });

        gameState.update('business', b => ({
            ...b,
            ipo: {
                ...b.ipo,
                board: board
            }
        }));

        ui.success(`Deviden dibagikan! Kas Induk -$ ${financeManager.formatCurrency(payout)}. Rekening Pribadi Anda +$ ${financeManager.formatCurrency(playerDividend)}! Hubungan dengan para Dewan Direksi meningkat!`, '💸 Dividend Declared');
    }

    /**
     * Exit Strategy: Sell Company (Acquisition)
     */
    sellCompany() {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;

        const exitValue = biz.valuation;
        const isPublic = biz.ipo && biz.ipo.active;

        let payout = exitValue;
        if (isPublic) {
            // Founder only gets payout for their ownership percentage
            const ticker = biz.ipo.ticker;
            const stocks = gameState.get('stocks') || {};
            const playerShares = stocks[ticker] ? stocks[ticker].shares : (biz.ipo.totalShares - biz.ipo.publicShares - (biz.ipo.board || []).reduce((sum, m) => sum + (m.sharesPercent || 0), 0) * (biz.ipo.totalShares / 100));
            const ownershipRatio = playerShares / biz.ipo.totalShares;
            payout = exitValue * ownershipRatio;
        }

        const tax = payout * 0.15;
        const netProfit = payout - tax;

        // Transfer to player
        gameState.update('player', p => ({
            ...p,
            balance: p.balance + netProfit
        }));

        // Calculate duration and details before reset
        const currentMonth = gameState.get('gameTime.month') || 1;
        const currentYear = gameState.get('gameTime.year') || 2010;
        let startMonth = 1;
        let startYear = 2010;
        if (biz.foundedAt) {
            if (typeof biz.foundedAt === 'object') {
                startMonth = biz.foundedAt.month || 1;
                startYear = biz.foundedAt.year || 2010;
            } else if (typeof biz.foundedAt === 'number') {
                startYear = biz.foundedAt;
            }
        }

        const totalMonths = (currentYear - startYear) * 12 + (currentMonth - startMonth);
        let durationText = '';
        if (totalMonths >= 12) {
            const yrs = Math.floor(totalMonths / 12);
            const mos = totalMonths % 12;
            if (mos > 0) {
                durationText = `${yrs} tahun ${mos} bulan`;
            } else {
                durationText = `${yrs} tahun`;
            }
        } else {
            durationText = `${totalMonths} bulan`;
        }

        const valuationText = `$ ${financeManager.formatCurrency(exitValue)}`;
        const payoutText = `$ ${financeManager.formatCurrency(netProfit)}`;

        let ipoSegment = '';
        if (isPublic) {
            ipoSegment = ` dan telah meluncurkan IPO (NYSE: ${biz.ipo.ticker})`;
        }

        const exitDescription = `Menjabat CEO "${biz.name}" selama ${durationText}, mencapai valuasi akhir ${valuationText}${ipoSegment}, lalu exit dengan perolehan bersih ${payoutText}.`;
        this._addBusinessHistory('business_exit', exitDescription, `Exit Value: ${valuationText}`);

        financeManager.addIncome(netProfit, 'Business Exit', `Penjualan kepemilikan ${biz.name} (Corporate Exit)`);

        // If public, remove the ticker from stockMarket listings and player portfolio
        if (isPublic) {
            const ticker = biz.ipo.ticker;
            if (stockMarket.stocks[ticker]) {
                delete stockMarket.stocks[ticker];
            }
            const stocks = gameState.get('stocks') || {};
            if (stocks[ticker]) {
                delete stocks[ticker];
                gameState.set('stocks', stocks);
            }
        }

        // Reset Business
        gameState.update('business', {
            active: false,
            name: "",
            type: "",
            level: 1,
            valuation: 0,
            revenue: 0,
            cash: 0,
            history: []
        });

        // Set career to CEO or Managing Director
        gameState.set('career.currentJob', 'ceo');

        ui.success(`Bisnis terjual! Anda memperoleh dana bersih $ ${financeManager.formatCurrency(netProfit)}!`, '🎉 EXIT BERHASIL');
    }

    /**
     * Corporate M&A: Generate a randomized target company for the deal marketplace
     * Delegated to BusinessAuctions.js
     */
    generateRandomAuction() {
        return generateRandomAuction();
    }

    /**
     * Corporate M&A: Process calendar daily decrement and competitive bidding AI reactions
     * Delegated to BusinessAuctions.js
     */
    tickAuctions() {
        tickAuctions();
    }

    /**
     * Corporate M&A: Submit a player bid for target company
     * Delegated to BusinessAuctions.js
     */
    placeBid(auctionId, amount, source) {
        return placeBid(auctionId, amount, source);
    }

    /**
     * Corporate M&A: Buy out a direct-sale premium deal from the marketplace instantly
     * Delegated to BusinessAuctions.js
     */
    buyoutDirect(dealId, source) {
        return buyoutDirect(dealId, source, () => this.recalculateValuation());
    }


    // ==========================================
    // TECH INDUSTRY MANAGEMENT METHODS (DELEGATED)
    // ==========================================
    getTechState() {
        return TechSector.getTechState(this);
    }

    generateRandomCandidates(count) {
        const biz = gameState.get('business');
        if (biz && biz.industry === 'finance') {
            return FinanceSector.generateRandomCandidates(count);
        }
        return TechSector.generateRandomCandidates(count);
    }

    hireCandidate(candidateId) {
        const biz = gameState.get('business');
        if (biz && biz.industry === 'finance') {
            return FinanceSector.hireCandidate(candidateId, this);
        }
        return TechSector.hireCandidate(candidateId, this);
    }

    fireEmployee(employeeId) {
        const biz = gameState.get('business');
        if (biz && biz.industry === 'finance') {
            return FinanceSector.fireEmployee(employeeId, this);
        }
        return TechSector.fireEmployee(employeeId, this);
    }

    purchaseServers(type, quantity) {
        return TechSector.purchaseServers(type, quantity, this);
    }

    sellServers(type, quantity) {
        return TechSector.sellServers(type, quantity, this);
    }

    startNewProject(name, type, budget) {
        return TechSector.startNewProject(name, type, budget, this);
    }

    accelerateProject() {
        return TechSector.accelerateProject(this);
    }

    rebootServers() {
        return TechSector.rebootServers(this);
    }

    launchTechProduct(project) {
        return TechSector.launchTechProduct(project, this);
    }

    // ==========================================
    // FINANCE INDUSTRY MANAGEMENT METHODS (DELEGATED)
    // ==========================================
    getFinanceState() {
        return FinanceSector.getFinanceState(this);
    }

    adjustRates(depositRate, lendingRate, premiumRate) {
        return FinanceSector.adjustRates(depositRate, lendingRate, premiumRate, this);
    }

    startCorporateDeal(name, type) {
        return FinanceSector.startCorporateDeal(name, type, this);
    }

    startCustomCorporateDeal(name, totalValue, couponRate, tenor, playerShare) {
        return FinanceSector.startCustomCorporateDeal(name, totalValue, couponRate, tenor, playerShare, this);
    }

    accelerateDeal() {
        return FinanceSector.accelerateDeal(this);
    }

    buyBlueChipEquity(sharesCount) {
        return FinanceSector.buyBlueChipEquity(sharesCount, this);
    }

    sellBlueChipEquity(sharesCount) {
        return FinanceSector.sellBlueChipEquity(sharesCount, this);
    }

    injectPersonalReserve(amount) {
        return FinanceSector.injectPersonalReserve(amount, this);
    }

    // ==========================================
    // ENERGY INDUSTRY MANAGEMENT METHODS (DELEGATED)
    // ==========================================
    getEnergyState() {
        return EnergySector.getEnergyState(this);
    }

    surveyEnergyExploration() {
        return EnergySector.surveyExploration(this);
    }

    developEnergyDiscovery(discoveryId) {
        return EnergySector.developDiscovery(discoveryId, this);
    }

    decommissionEnergyRefinery(refineryId) {
        return EnergySector.decommissionRefinery(refineryId, this);
    }

    // ==========================================
    // AEROSPACE INDUSTRY MANAGEMENT METHODS
    // ==========================================
    getAerospaceState() {
        return AerospaceSector.getAerospaceState(this);
    }

    buyAircraft(id, quantity = 1) {
        return AerospaceSector.buyAircraft(id, quantity, this);
    }

    buildAirport(id) {
        return AerospaceSector.buildAirport(id, this);
    }

    repairAircraft(planeId) {
        return AerospaceSector.repairAircraft(planeId, this);
    }

    repairAllFleet() {
        return AerospaceSector.repairAllFleet(this);
    }

    sellAircraft(planeId) {
        return AerospaceSector.sellAircraft(planeId, this);
    }

    demolishAirport(airportId) {
        return AerospaceSector.demolishAirport(airportId, this);
    }

    // ==========================================
    // AUTOMOTIVE INDUSTRY DELEGATES
    // ==========================================
    getAutomotiveState() {
        return AutomotiveSector.getAutomotiveState(this);
    }

    setProductionVolume(volume) {
        return AutomotiveSector.setProductionVolume(volume, this);
    }

    setActiveModel(modelId) {
        return AutomotiveSector.setActiveModel(modelId, this);
    }

    upgradeAutomotiveService() {
        return AutomotiveSector.upgradeService(this);
    }

    hostRacingEvent() {
        return AutomotiveSector.hostRacingEvent(this);
    }

    // ==========================================
    // RETAIL INDUSTRY DELEGATES
    // ==========================================
    getRetailState() {
        return RetailSector.getRetailState(this);
    }

    buildStore(tierId) {
        return RetailSector.buildStore(tierId, this);
    }

    demolishStore(storeId) {
        return RetailSector.demolishStore(storeId, this);
    }

    upgradeWarehouse() {
        return RetailSector.upgradeWarehouse(this);
    }

    purchaseStock(quantity) {
        return RetailSector.purchaseStock(quantity, this);
    }

    // ==========================================
    // HEALTHCARE INDUSTRY MANAGEMENT METHODS
    // ==========================================
    getHealthcareState() {
        return HealthcareSector.getHealthcareState(this);
    }

    buildHealthcareFacility(facilityId) {
        return HealthcareSector.buildFacility(facilityId, this);
    }

    sellHealthcareFacility(facilityId) {
        return HealthcareSector.sellFacility(facilityId, this);
    }

    produceMedicine(name, type, color, qty) {
        return HealthcareSector.produceMedicine(name, type, color, qty, this);
    }

    disposeMedicine(medicineId) {
        return HealthcareSector.disposeMedicine(medicineId, this);
    }

    // ==========================================
    // INFRASTRUCTURE INDUSTRY MANAGEMENT METHODS
    // ==========================================
    getInfrastructureState() {
        return InfrastructureSector.getInfrastructureState(this);
    }

    surveyInfrastructureLand() {
        return InfrastructureSector.surveyLand(this);
    }

    developInfrastructureLand(landId, zoneType) {
        return InfrastructureSector.developLand(landId, zoneType, this);
    }

    decommissionInfrastructureDevelopment(devId) {
        return InfrastructureSector.decommissionDevelopment(devId, this);
    }

    lobbyBoardMember(boardId, source) {
        return CorporateGovernance.lobbyBoardMember(boardId, source, this);
    }

    alignStrategy(strategyType) {
        return CorporateGovernance.alignStrategy(strategyType, this);
    }

    callRUPS(proposalType) {
        return CorporateGovernance.callRUPS(proposalType, this);
    }
}

// Constants moved to BusinessAuctions.js for cleaner separation of concerns
export { INDUSTRY_INITIATIVES } from './IndustryInitiatives.js';
export { COMPANY_PREFIXES, COMPANY_SUFFIXES, AUCTION_INDUSTRIES } from './BusinessAuctions.js';

export const businessManager = new BusinessManager();
export default businessManager;
