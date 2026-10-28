/**
 * FnBSector.js - Core Restaurant & Food Service Operations Simulator Engine
 * Encapsulates sanitizing/cleaning kitchens, renovating interior comfort, research recipes/chefs,
 * determining star ratings, and menu pricing policies. Includes the MBG 10x profit easter egg.
 */

import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../core/GlobalEconomy.js';

export const PRICING_POLICIES = {
    cheap: { name: 'Ekonomis (Murah)', price: 8, demandMult: 1.35 },
    standard: { name: 'Standard (Menengah)', price: 15, demandMult: 1.0 },
    premium: { name: 'Premium (Mewah)', price: 40, demandMult: 0.5 }
};

export const FnBSector = {
    getFnBState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.fnb) {
            const sub = biz.subSector || 'restaurant';
            biz.fnb = {
                subSector: sub,
                cleanliness: 70, // 0 - 100
                comfort: 60, // 0 - 100
                taste: 65, // 0 - 100
                pricing: 'standard',
                demandFluctuation: 1.0
            };
            gameState.update('business', b => ({ ...b, fnb: biz.fnb }));
        }
        return biz.fnb;
    },

    cleanKitchen(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const fnb = this.getFnBState(manager);

        const cost = 3000;
        if (biz.cash < cost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk pembersihan dapur ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(cost)})`);
        }

        biz.cash -= cost;
        fnb.cleanliness = Math.min(100, fnb.cleanliness + 35);
        biz.valuation += cost * 1.2;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            fnb: fnb
        }));

        ui.success(`Sanitasi dapur selesai! Kebersihan resto kini: ${fnb.cleanliness} Pt.`, '🍳 Sanitasi Dapur');
        return true;
    },

    renovateAmbience(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const fnb = this.getFnBState(manager);

        const cost = 8000;
        if (biz.cash < cost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk renovasi interior ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(cost)})`);
        }

        biz.cash -= cost;
        fnb.comfort = Math.min(100, fnb.comfort + 25);
        biz.valuation += cost * 1.35; // Better interior raises valuation

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            fnb: fnb
        }));

        ui.success(`Renovasi resto selesai! Kenyamanan dining room naik menjadi ${fnb.comfort} Pt.`, '🛋️ Renovasi Interior');
        return true;
    },

    researchRecipe(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const fnb = this.getFnBState(manager);

        const cost = 15000;
        if (biz.cash < cost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk riset menu ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(cost)})`);
        }

        biz.cash -= cost;
        fnb.taste = Math.min(100, fnb.taste + 20);
        biz.valuation += cost * 1.3;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            fnb: fnb
        }));

        ui.success(`Riset resep & rekrutmen chef baru selesai! Kelezatan hidangan naik ke ${fnb.taste} Pt.`, '👨‍🍳 Riset Kuliner');
        return true;
    },

    setMenuPricing(policyKey, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const fnb = this.getFnBState(manager);

        if (!PRICING_POLICIES[policyKey]) throw new Error('Kebijakan harga tidak valid!');

        fnb.pricing = policyKey;
        gameState.update('business', b => ({ ...b, fnb: fnb }));
        ui.success(`Kebijakan harga resto dialihkan ke "${PRICING_POLICIES[policyKey].name}"!`, '💵 Harga Menu');
        return true;
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const fnb = this.getFnBState(manager);
        if (!fnb) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Demand Fluctuations (dynamically driven by the global economic cycle)
        const econMult = globalEconomy.getDemandMultiplier('fnb') || 1.0;
        const randDev = (Math.random() - 0.5) * 0.15;
        fnb.demandFluctuation = parseFloat(Math.max(0.4, Math.min(2.0, econMult + randDev)).toFixed(2));

        // 2. Metrics deterioration over time
        fnb.cleanliness = Math.max(10, parseFloat((fnb.cleanliness - (4.0 + Math.random() * 2.0)).toFixed(1)));
        fnb.comfort = Math.max(10, parseFloat((fnb.comfort - (2.0 + Math.random() * 1.5)).toFixed(1)));
        fnb.taste = Math.max(10, parseFloat((fnb.taste - (1.0 + Math.random() * 0.5)).toFixed(1)));

        // 3. Determine Rating stars (1 to 5)
        const avg = (fnb.cleanliness + fnb.comfort + fnb.taste) / 3;
        let rating = 1;
        if (avg >= 90) rating = 5;
        else if (avg >= 75) rating = 4;
        else if (avg >= 55) rating = 3;
        else if (avg >= 35) rating = 2;

        fnb.stars = rating;

        // 4. Calculate Customer Traffic
        const policy = PRICING_POLICIES[fnb.pricing] || PRICING_POLICIES.standard;
        
        // Base monthly customers based on rating
        let baseCustomers = 1000 * Math.pow(rating, 1.8);
        
        // Premium pricing has customer drop penalties if rating is too low (< 3 stars)
        let priceDemandFactor = policy.demandMult;
        if (fnb.pricing === 'premium' && rating < 3) {
            priceDemandFactor *= 0.3; // severe drop
        }

        // Boost traffic if marketing campaigns are running
        let campaignBoost = 1.0;
        if (biz.marketingCampaign === 'local') campaignBoost = 1.25;
        else if (biz.marketingCampaign === 'social') campaignBoost = 1.6;
        else if (biz.marketingCampaign === 'global') campaignBoost = 2.4;

        const customerCount = Math.round(baseCustomers * priceDemandFactor * campaignBoost * fnb.demandFluctuation);

        // 5. Compute Financials
        let customerRevenue = customerCount * policy.price;
        
        if (initiatives.fnb_franchise_expansion) {
            customerRevenue += 9000; // Flat monthly franchise licensing fee
        }

        // Easter Egg: Makan Siang Gratis (MBG) -> Multiply net monthly revenue by 10x!
        if (biz.isMBG) {
            customerRevenue *= 10;
        }

        // Operating Costs: staff wages and ingredients/utilities
        const baseChefWage = 2000;
        const totalWages = baseChefWage + (rating * 800); // More stars require premium service staff
        
        let ingredientCost = customerCount * (policy.price * 0.45); // 45% ingredient cost ratio
        
        // Apply strategic initiatives discounts
        if (initiatives.fnb_kitchen_upgrade) {
            ingredientCost *= 0.90; // modern kitchen reduces waste by 10%
        }
        if (ops.production === 'jit') {
            ingredientCost *= 0.92; // JIT ERP schedules ingredient supply lines by 8%
        }

        const totalCost = totalWages + ingredientCost;

        gameState.update('business', b => ({
            ...b,
            fnb: fnb
        }));

        return {
            wages: Math.round(totalWages),
            cost: Math.round(totalCost),
            revenue: Math.round(customerRevenue)
        };
    }
};

export default FnBSector;
