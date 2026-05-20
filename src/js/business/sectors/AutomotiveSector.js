/**
 * AutomotiveSector.js - Core Automotive Operations Engine
 * Features target production levels, model selection, service center network upgrades, and racing sponsors.
 */
import gameState from '../../game/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../game/GlobalEconomy.js';

export const VEHICLE_MODELS = [
    { id: 'model_eco', name: 'Eco-Drive Sedan', type: 'Eco-Car', price: 18000, cost: 10000, demandFactor: 1.3, desc: 'Mobil ekonomis ramah lingkungan dengan volume demand sangat tinggi namun margin tipis.' },
    { id: 'model_suv', name: 'Family Explorer SUV', type: 'Premium SUV', price: 35000, cost: 20000, demandFactor: 1.0, desc: 'SUV tangguh untuk keluarga. Keseimbangan sempurna antara margin profit dan volume penjualan.' },
    { id: 'model_sport', name: 'GigaSport V12 Hypercar', type: 'Hypercar', price: 150000, cost: 90000, demandFactor: 0.4, desc: 'Hypercar premium eksklusif. Volume penjualan rendah (niche) tapi menghasilkan margin raksasa.' }
];

export const AutomotiveSector = {
    getAutomotiveState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.automotive) {
            biz.automotive = {
                productionVolume: 50, // default target production per month
                activeModel: 'model_eco',
                serviceQuality: 50, // service center quality (50%)
                prestige: 10,
                demandFluctuation: 1.0,
                lastRaceResult: null
            };
            gameState.update('business', b => ({ ...b, automotive: biz.automotive }));
        }
        return biz.automotive;
    },

    setProductionVolume(volume, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const auto = this.getAutomotiveState(manager);

        const vol = parseInt(volume);
        if (isNaN(vol) || vol <= 0) throw new Error('Target produksi harus angka positif!');
        if (vol > 5000) throw new Error('Kapasitas lini pabrik perakitan Anda saat ini dibatasi maksimal 5.000 unit/bln!');

        auto.productionVolume = vol;
        gameState.update('business', b => ({ ...b, automotive: auto }));
        ui.success(`Target produksi pabrik disesuaikan menjadi ${vol} unit per bulan!`, '⚙️ Pabrik Otomotif');
        return true;
    },

    setActiveModel(modelId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const auto = this.getAutomotiveState(manager);

        const model = VEHICLE_MODELS.find(m => m.id === modelId);
        if (!model) throw new Error('Model kendaraan tidak dikenal!');

        auto.activeModel = modelId;
        gameState.update('business', b => ({ ...b, automotive: auto }));
        ui.success(`Lini perakitan dialihkan untuk memproduksi "${model.name}"!`, '🏎️ Model Aktif');
        return true;
    },

    upgradeService(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const auto = this.getAutomotiveState(manager);

        if (auto.serviceQuality >= 100) throw new Error('Kualitas Layanan Servis sudah mencapai level maksimal (100%)!');

        const cost = 25000 * (1 + (auto.serviceQuality - 50) / 10);
        if (biz.cash < cost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk upgrade jaringan Bengkel Servis ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(cost)})`);
        }

        biz.cash -= cost;
        auto.serviceQuality = Math.min(100, auto.serviceQuality + 10);
        biz.valuation += cost * 1.3;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            automotive: auto
        }));

        ui.success(`Jaringan bengkel resmi berhasil diperluas! Layanan naik ke ${auto.serviceQuality}%`, '🔧 Layanan Servis Otomotif');
        return true;
    },

    hostRacingEvent(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const auto = this.getAutomotiveState(manager);

        const eventCost = 80000;
        if (biz.cash < eventCost) {
            throw new Error(`Kas Treasury tidak mencukupi untuk menyponsori event balapan ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(eventCost)})`);
        }

        biz.cash -= eventCost;

        // Simulate racing performance based on service quality and sheer luck
        const roll = Math.random() * 100;
        let place = 4;
        let prestigeGained = 0;
        let prizeMoney = 0;
        let message = '';

        if (roll > 85) {
            place = 1;
            prestigeGained = 50;
            prizeMoney = 150000;
            message = '🏆 PODIUM PERTAMA! GigaSport Hypercar Anda melesat bagai kilat dan memenangkan piala Grand Prix! Sponsor membanjiri kas Anda!';
        } else if (roll > 55) {
            place = 2;
            prestigeGained = 30;
            prizeMoney = 80000;
            message = '🥈 PODIUM KEDUA! Penampilan luar biasa di sirkuit internasional. Brand Anda meroket tajam!';
        } else if (roll > 25) {
            place = 3;
            prestigeGained = 15;
            prizeMoney = 40000;
            message = '🥉 PODIUM KETIGA! Kerja keras tim mekanik mengantarkan pebalap Anda naik ke podium kemenangan!';
        } else {
            place = 6;
            prestigeGained = 5;
            prizeMoney = 0;
            message = '🏁 FINISH POSISI #6. Kendaraan Anda mengalami masalah ban di lap terakhir, namun eksposur balapan tetap mendongkrak reputasi pabrik!';
        }

        biz.cash += prizeMoney;
        auto.prestige = (auto.prestige || 10) + prestigeGained;
        auto.lastRaceResult = {
            place: place,
            prestige: prestigeGained,
            prize: prizeMoney,
            message: message,
            date: new Date().toLocaleTimeString()
        };

        // Increase valuation based on prestige
        biz.valuation += prestigeGained * 5000;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            automotive: auto
        }));

        ui.success(message, `🏁 Hasil Balapan GP (Posisi #${place})`);
        return true;
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const auto = this.getAutomotiveState(manager);
        if (!auto) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Demand Fluctuations (dynamically driven by the global economic cycle + prestige)
        const econMult = globalEconomy.getDemandMultiplier();
        const prestigeBonus = (auto.prestige || 10) / 100;
        const randDev = (Math.random() - 0.5) * 0.12; // slight model trend deviation
        auto.demandFluctuation = parseFloat(Math.min(2.0, Math.max(0.4, econMult + prestigeBonus + randDev)).toFixed(2));

        const model = VEHICLE_MODELS.find(m => m.id === auto.activeModel) || VEHICLE_MODELS[0];
        const targetVol = auto.productionVolume || 50;

        // 1. Costs (Production costs)
        const productionCost = targetVol * model.cost;
        
        // 2. Sales (Determined by model popularity, AI demand, and dealership services)
        const maxSalesQty = Math.round(targetVol * auto.demandFluctuation * model.demandFactor * (auto.serviceQuality / 100));
        const actualSold = Math.min(targetVol, maxSalesQty);

        const salesRevenue = actualSold * model.price;

        // 3. Dealer Maintenance income (dealers pay a constant fee per service center scale)
        const serviceRevenue = Math.round(actualSold * 1200 * (auto.serviceQuality / 100));

        const totalRevenue = salesRevenue + serviceRevenue;
        const totalCost = productionCost + (targetVol * 250); // raw assembly line overhead

        gameState.update('business', b => ({
            ...b,
            automotive: auto
        }));

        return {
            wages: 0,
            cost: totalCost,
            revenue: totalRevenue
        };
    }
};

export default AutomotiveSector;
