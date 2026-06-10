import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../core/GlobalEconomy.js';

export const AD_DENSITIES = {
    low: { name: 'Rendah (User-Friendly)', revPerUser: 0.05, qualityDecay: 0.0, growthMult: 1.0 },
    medium: { name: 'Sedang (Standard)', revPerUser: 0.15, qualityDecay: 1.5, growthMult: 0.8 },
    high: { name: 'Tinggi (Agresif)', revPerUser: 0.35, qualityDecay: 4.5, growthMult: 0.4 }
};

export const MEDIA_CATEGORIES = {
    tvshow: { label: 'TV Show', minBudget: 10000, recBudget: 30000, valMult: 1.1 },
    film: { label: 'Film', minBudget: 50000, recBudget: 150000, valMult: 1.4 },
    series: { label: 'Series', minBudget: 25000, recBudget: 75000, valMult: 1.25 },
    franchise: { label: 'Franchise (Continuity)', minBudget: 100000, recBudget: 300000, valMult: 1.6 }
};

export const MEDIA_GENRES = {
    action: { label: 'Action' },
    comedy: { label: 'Comedy' },
    drama: { label: 'Drama' },
    scifi: { label: 'Sci-Fi' },
    horror: { label: 'Horror' },
    romance: { label: 'Romance' }
};

export const MediaSector = {
    generateRandomTrend() {
        const categories = Object.keys(MEDIA_CATEGORIES);
        const genres = Object.keys(MEDIA_GENRES);
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        const randomGenre = genres[Math.floor(Math.random() * genres.length)];
        
        const descriptions = [
            `Penonton saat ini mendambakan tontonan bertema ${MEDIA_GENRES[randomGenre].label} dalam format ${MEDIA_CATEGORIES[randomCat].label}!`,
            `Pasar sedang hype dengan genre ${MEDIA_GENRES[randomGenre].label}, terutama jika dikemas sebagai ${MEDIA_CATEGORIES[randomCat].label}.`,
            `Survei membuktikan bahwa ${MEDIA_CATEGORIES[randomCat].label} dengan bumbu ${MEDIA_GENRES[randomGenre].label} sedang viral dicari.`,
            `Rating tertinggi bulan ini didominasi oleh rilis ${MEDIA_CATEGORIES[randomCat].label} bergenre ${MEDIA_GENRES[randomGenre].label}!`
        ];
        const randomDesc = descriptions[Math.floor(Math.random() * descriptions.length)];

        return {
            category: randomCat,
            genre: randomGenre,
            description: randomDesc
        };
    },

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
                demandFluctuation: 1.0,
                currentTrend: this.generateRandomTrend(),
                releasedContent: []
            };
            gameState.update('business', b => ({ ...b, media: biz.media }));
        } else {
            let updated = false;
            if (!biz.media.currentTrend) {
                biz.media.currentTrend = this.generateRandomTrend();
                updated = true;
            }
            if (!biz.media.releasedContent) {
                biz.media.releasedContent = [];
                updated = true;
            }
            if (updated) {
                gameState.update('business', b => ({ ...b, media: biz.media }));
            }
        }
        return biz.media;
    },

    produceContent(manager, name, category, genre, budget) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const media = this.getMediaState(manager);

        if (!name || name.trim() === '') {
            throw new Error('Nama konten tidak boleh kosong!');
        }

        const catData = MEDIA_CATEGORIES[category];
        if (!catData) throw new Error('Kategori konten tidak valid!');

        const genData = MEDIA_GENRES[genre];
        if (!genData) throw new Error('Genre konten tidak valid!');

        const minBudget = catData.minBudget;
        if (budget < minBudget) {
            throw new Error(`Anggaran untuk rilis ${catData.label} minimal adalah $ ${financeManager.formatCurrency(minBudget)}!`);
        }

        if (biz.cash < budget) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(budget)})`);
        }

        // Deduct money from treasury
        biz.cash -= budget;

        // Calculate rating based on market fit and budget adequacy
        const trend = media.currentTrend;
        
        // 1. Category fit (base points: 30)
        let catScore = 15; // default partially matched
        if (category === trend.category) {
            catScore = 30;
        }

        // 2. Genre fit (base points: 30)
        let genreScore = 15; // default partially matched
        if (genre === trend.genre) {
            genreScore = 30;
        }

        // 3. Budget fit (base points: 40)
        // If budget is at recBudget or higher, we get 40 points.
        // If budget is between minBudget and recBudget, scale between 15 and 40.
        let budgetScore = 15;
        if (budget >= catData.recBudget) {
            budgetScore = 40;
            // Add a small bonus if over-funded (up to +5 extra bonus points)
            const overFundRatio = Math.min(2, budget / catData.recBudget);
            budgetScore += (overFundRatio - 1) * 5;
        } else {
            const ratio = (budget - catData.minBudget) / (catData.recBudget - catData.minBudget);
            budgetScore = 15 + ratio * 25;
        }

        // 4. Random variance factor (-5 to +5 points)
        const luck = (Math.random() - 0.5) * 10;
        
        let totalScore = Math.max(10, Math.min(100, Math.round(catScore + genreScore + budgetScore + luck)));
        
        // Convert to a 10-star rating
        const rating = parseFloat((totalScore / 10).toFixed(1));

        // Quality boost: Higher rating gives more content quality boost
        // Max contentQuality is 100
        const qualityBoost = Math.round((totalScore / 100) * 25);
        media.contentQuality = Math.min(100, media.contentQuality + qualityBoost);

        // Valuation increase: rating * budget multiplier
        const valuationBoost = Math.round(budget * catData.valMult * (totalScore / 100));
        biz.valuation += valuationBoost;

        // Immediate cash profit or ticket sales/royalties bonus based on success!
        // Instant revenue = budget * (totalScore / 100) * (matching trend multiplier)
        let trendMult = 1.0;
        if (category === trend.category) trendMult += 0.25;
        if (genre === trend.genre) trendMult += 0.25;
        
        // If rating is high, we can double the budget investment
        const profitMult = (totalScore / 60) * trendMult; // 60 is break-even score
        const instantProfit = Math.round(budget * profitMult);
        biz.cash += instantProfit;

        // Record the release
        const newRelease = {
            id: Date.now().toString(),
            name: name,
            category: category,
            categoryLabel: catData.label,
            genre: genre,
            genreLabel: genData.label,
            budget: budget,
            rating: rating,
            instantProfit: instantProfit,
            qualityBoost: qualityBoost,
            date: new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
        };

        if (!media.releasedContent) media.releasedContent = [];
        media.releasedContent.unshift(newRelease);
        
        // Limit history to 6 entries
        if (media.releasedContent.length > 6) {
            media.releasedContent.pop();
        }

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            media: media
        }));

        const profitSign = instantProfit >= budget ? 'Laba' : 'Rugi';
        const profitColor = instantProfit >= budget ? '#10b981' : '#ef4444';
        ui.success(
            `"${name}" (${catData.label} - ${genData.label}) berhasil dirilis!<br>` +
            `Rating: <strong>★ ${rating}/10</strong><br>` +
            `Biaya Produksi: <strong>$ ${financeManager.formatCurrency(budget)}</strong><br>` +
            `Pendapatan Kotor Rilis: <strong style="color: ${profitColor}">$ ${financeManager.formatCurrency(instantProfit)}</strong> (${profitSign})<br>` +
            `Dampak Mutu Platform: <strong>+${qualityBoost} Pt.</strong> (Total: ${media.contentQuality} Pt.)`,
            '🎬 Produksi Konten Sukses!'
        );

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

        // 5. Update trends periodically (35% chance each month)
        if (!media.currentTrend || Math.random() < 0.35) {
            media.currentTrend = this.generateRandomTrend();
        }

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
