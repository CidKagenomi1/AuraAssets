/**
 * MediaSector.js - Core Media Broadcasting & Social Platform Operations Simulator Engine
 * Encapsulates producing premium content showpieces, upgrading digital transmission server nodes,
 * configuring ad density monetization policies, and managing audience traction.
 */

import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../core/GlobalEconomy.js';

export const AD_DENSITIES = {
    low: { name: 'Rendah (User-Friendly)', revPerUser: 0.05, qualityDecay: 0.0, growthMult: 1.0 },
    medium: { name: 'Sedang (Standard)', revPerUser: 0.15, qualityDecay: 1.5, growthMult: 0.8 },
    high: { name: 'Tinggi (Agresif)', revPerUser: 0.35, qualityDecay: 4.5, growthMult: 0.4 }
};

export const MediaSector = {
    getMediaState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.media) {
            biz.media = {
                audienceSize: 50000, // Penonton/User Aktif
                maxAudienceCapacity: 200000, // Kapasitas Server/Broadcasting
                contentQuality: 50, // 0 - 100
                adDensity: 'low', // 'low', 'medium', 'high'
                serverLevel: 1,
                demandFluctuation: 1.0
            };
            gameState.update('business', b => ({ ...b, media: biz.media }));
        }
        return biz.media;
    },

    produceContent(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const media = this.getMediaState(manager);

        const cost = 12000;
        if (biz.cash < cost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk memproduksi konten premium ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(cost)})`);
        }

        biz.cash -= cost;
        media.contentQuality = Math.min(100, media.contentQuality + 15);
        biz.valuation += cost * 1.25; // Good content raises business value

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            media: media
        }));

        ui.success(`Produksi konten baru tuntas! Kualitas konten meningkat tajam menjadi ${media.contentQuality} Pt.`, '🎥 Konten Baru Rilis');
        return true;
    },

    upgradeServers(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const media = this.getMediaState(manager);

        const cost = 25000 * media.serverLevel;
        if (biz.cash < cost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk upgrade node transmisi ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(cost)})`);
        }

        biz.cash -= cost;
        media.serverLevel += 1;
        media.maxAudienceCapacity += 150000;
        biz.valuation += cost * 1.35; // Digital infrastructure raises valuation

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            media: media
        }));

        ui.success(`Upgrade server & kapasitas penyiaran selesai! Kapasitas user baru kini: ${media.maxAudienceCapacity.toLocaleString()} orang.`, '📡 Kapasitas Transmisi');
        return true;
    },

    setAdDensity(density, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const media = this.getMediaState(manager);

        if (!AD_DENSITIES[density]) throw new Error('Kepadatan iklan tidak valid!');

        media.adDensity = density;
        gameState.update('business', b => ({ ...b, media: media }));
        ui.success(`Kebijakan monetisasi iklan dialihkan ke "${AD_DENSITIES[density].name}"!`, '📢 Kebijakan Iklan');
        return true;
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const media = this.getMediaState(manager);
        if (!media) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Demand Fluctuations (dynamically driven by the global economic cycle)
        const econMult = globalEconomy.getDemandMultiplier('media') || 1.0;
        const randDev = (Math.random() - 0.5) * 0.10;
        media.demandFluctuation = parseFloat(Math.max(0.5, Math.min(2.0, econMult + randDev)).toFixed(2));

        const policy = AD_DENSITIES[media.adDensity] || AD_DENSITIES.low;

        // 2. Process Content Quality monthly decay
        let decay = 3.0 + policy.qualityDecay;
        media.contentQuality = Math.max(10, parseFloat((media.contentQuality - decay).toFixed(1)));

        // 3. Process Audience Growth
        // Higher quality content attracts more users
        const qualityFactor = media.contentQuality / 50; // scales centered around 50
        const baseGrowth = 15000 * qualityFactor * media.demandFluctuation * policy.growthMult;
        
        // Boost growth if active marketing campaigns
        let campaignBoost = 1.0;
        if (biz.marketingCampaign === 'local') campaignBoost = 1.25;
        else if (biz.marketingCampaign === 'social') campaignBoost = 1.6;
        else if (biz.marketingCampaign === 'global') campaignBoost = 2.5;

        // Apply strategic initiatives boosts
        if (initiatives.media_broadcasting) {
            campaignBoost += 0.3; // Broadcasting license boosts promotional effectiveness
        }

        const netGrowth = Math.round(baseGrowth * campaignBoost);
        media.audienceSize = Math.min(media.maxAudienceCapacity, Math.max(10000, media.audienceSize + netGrowth));

        // 4. Compute Financials
        // Revenue is calculated based on active users and ad density pricing
        let adRevenue = media.audienceSize * policy.revPerUser;

        if (initiatives.media_studio) {
            adRevenue *= 1.15; // Production quality increases ad slot pricing by 15%
        }

        let monthlyRevenue = adRevenue;
        if (initiatives.media_viral) {
            monthlyRevenue += 10000; // Flat viral social media sponsorship income
        }

        // Cost is composed of server maintenance and creator wages
        const serverMaintenance = media.serverLevel * 1500;
        const staffWages = media.serverLevel * 2000;

        let totalCost = serverMaintenance + staffWages;

        gameState.update('business', b => ({
            ...b,
            media: media
        }));

        return {
            wages: Math.round(staffWages),
            cost: Math.round(totalCost),
            revenue: Math.round(monthlyRevenue)
        };
    }
};

export default MediaSector;
