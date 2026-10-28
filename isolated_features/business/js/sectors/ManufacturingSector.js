/**
 * ManufacturingSector.js - Core Manufacture Operations Engine
 * Features target production levels, model selection across sub-sectors (Mobil, Elektronik, Furnitur),
 * quality control upgrades, and strategic marketing events (GP Racing, Esports, Design Expo).
 */
import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../core/GlobalEconomy.js';

export const MFG_MODELS = {
    mobil: [
        { id: 'model_eco', name: 'Eco-Drive Sedan', type: 'Eco-Car', price: 18000, cost: 10000, demandFactor: 1.3, desc: 'Mobil ekonomis ramah lingkungan dengan volume demand sangat tinggi namun margin tipis.' },
        { id: 'model_suv', name: 'Family Explorer SUV', type: 'Premium SUV', price: 35000, cost: 20000, demandFactor: 1.0, desc: 'SUV tangguh untuk keluarga. Keseimbangan sempurna antara margin profit dan volume penjualan.' },
        { id: 'model_sport', name: 'GigaSport V12 Hypercar', type: 'Hypercar', price: 150000, cost: 90000, demandFactor: 0.4, desc: 'Hypercar premium eksklusif. Volume penjualan rendah (niche) tapi menghasilkan margin raksasa.' }
    ],
    electronic: [
        { id: 'elec_phone', name: 'Smart Phone X', type: 'Gadget', price: 800, cost: 450, demandFactor: 1.5, desc: 'Ponsel pintar dengan spesifikasi mumpuni. Demand sangat tinggi secara global.' },
        { id: 'elec_laptop', name: 'Pro Laptop Core', type: 'Komputer', price: 1800, cost: 1000, demandFactor: 1.1, desc: 'Laptop bertenaga untuk profesional kreatif dan developer. Margin seimbang.' },
        { id: 'elec_server', name: 'Enterprise Server AI', type: 'Server', price: 12000, cost: 7000, demandFactor: 0.5, desc: 'Komputasi awan bertenaga AI untuk skala industri enterprise. Margin profit masif.' }
    ],
    furniture: [
        { id: 'furn_chair', name: 'Minimalist Office Chair', type: 'Kursi', price: 150, cost: 80, demandFactor: 1.4, desc: 'Kursi kerja ergonomis dengan harga terjangkau. Volume demand stabil.' },
        { id: 'furn_table', name: 'Solid Oak Dining Table', type: 'Meja', price: 650, cost: 350, demandFactor: 0.9, desc: 'Meja makan kokoh dari kayu ek solid. Kualitas premium untuk keluarga.' },
        { id: 'furn_office', name: 'Executive Workstation Set', type: 'Set Mebel', price: 2500, cost: 1300, demandFactor: 0.4, desc: 'Meja kerja eksekutif mewah lengkap dengan laci dan partisi kedap suara.' }
    ]
};

export const ManufacturingSector = {
    getManufacturingState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.manufacturing) {
            const sub = biz.subSector || 'mobil';
            const models = MFG_MODELS[sub] || MFG_MODELS.mobil;
            biz.manufacturing = {
                subSector: sub,
                productionVolume: sub === 'mobil' ? 50 : sub === 'electronic' ? 1000 : 300,
                activeModel: models[0].id,
                serviceQuality: 50, // QC & purna jual
                prestige: 10,
                demandFluctuation: 1.0,
                lastEventResult: null
            };
            gameState.update('business', b => ({ ...b, manufacturing: biz.manufacturing }));
        }
        return biz.manufacturing;
    },

    setProductionVolume(volume, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const mfg = this.getManufacturingState(manager);

        const vol = parseInt(volume);
        if (isNaN(vol) || vol <= 0) throw new Error('Target produksi harus angka positif!');
        
        const limit = mfg.subSector === 'mobil' ? 5000 : mfg.subSector === 'electronic' ? 100000 : 30000;
        if (vol > limit) throw new Error(`Kapasitas pabrik sub-sektor Anda saat ini dibatasi maksimal ${limit.toLocaleString()} unit/bln!`);

        mfg.productionVolume = vol;
        gameState.update('business', b => ({ ...b, manufacturing: mfg }));
        ui.success(`Target produksi pabrik disesuaikan menjadi ${vol.toLocaleString()} unit per bulan!`, '⚙️ Pabrik Manufaktur');
        return true;
    },

    setActiveModel(modelId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const mfg = this.getManufacturingState(manager);

        const models = MFG_MODELS[mfg.subSector] || MFG_MODELS.mobil;
        const model = models.find(m => m.id === modelId);
        if (!model) throw new Error('Model produk tidak dikenal!');

        mfg.activeModel = modelId;
        gameState.update('business', b => ({ ...b, manufacturing: mfg }));
        ui.success(`Lini perakitan dialihkan untuk memproduksi "${model.name}"!`, '🏭 Model Aktif');
        return true;
    },

    upgradeService(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const mfg = this.getManufacturingState(manager);

        if (mfg.serviceQuality >= 100) throw new Error('Kualitas Layanan Purna Jual sudah mencapai level maksimal (100%)!');

        const cost = 25000 * (1 + (mfg.serviceQuality - 50) / 10);
        if (biz.cash < cost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk upgrade jaringan purna jual ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(cost)})`);
        }

        biz.cash -= cost;
        mfg.serviceQuality = Math.min(100, mfg.serviceQuality + 10);
        biz.valuation += cost * 1.3;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            manufacturing: mfg
        }));

        ui.success(`Jaringan Layanan Purna Jual & QC ditingkatkan ke ${mfg.serviceQuality}%`, '🔧 Layanan Purna Jual & QC');
        return true;
    },

    hostMarketingEvent(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const mfg = this.getManufacturingState(manager);

        const sub = mfg.subSector;
        let eventCost = 80000;
        let eventName = 'Grand Prix Balapan GP';
        let eventIcon = '🏎️';
        if (sub === 'electronic') {
            eventCost = 50000;
            eventName = 'Esports Championship Tournament';
            eventIcon = '🎮';
        } else if (sub === 'furniture') {
            eventCost = 30000;
            eventName = 'International Design Expo';
            eventIcon = '📐';
        }

        if (biz.cash < eventCost) {
            throw new Error(`Kas Treasury tidak mencukupi untuk menyponsori event ini ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(eventCost)})`);
        }

        biz.cash -= eventCost;

        const roll = Math.random() * 100;
        let place = 4;
        let prestigeGained = 0;
        let prizeMoney = 0;
        let message = '';

        if (sub === 'mobil') {
            if (roll > 85) {
                place = 1; prestigeGained = 50; prizeMoney = 150000;
                message = '🏆 PODIUM PERTAMA! Mobil sport hypercar Anda melesat tercepat dan meraih juara umum di Grand Prix!';
            } else if (roll > 55) {
                place = 2; prestigeGained = 30; prizeMoney = 80000;
                message = '🥈 PODIUM KEDUA! Performa luar biasa di sirkuit internasional. Brand Anda meroket tajam!';
            } else if (roll > 25) {
                place = 3; prestigeGained = 15; prizeMoney = 40000;
                message = '🥉 PODIUM KETIGA! Kerja keras tim mekanik mengantarkan pebalap Anda naik ke podium!';
            } else {
                place = 6; prestigeGained = 5; prizeMoney = 0;
                message = '🏁 FINISH POSISI #6. Kendaraan mengalami kendala ban di lap terakhir, tapi eksposur balapan tetap mendongkrak popularitas.';
            }
        } else if (sub === 'electronic') {
            if (roll > 85) {
                place = 1; prestigeGained = 40; prizeMoney = 90000;
                message = '🏆 JUARA PERTAMA! Tim esports bentukan Anda menyabet piala utama di turnamen dunia dengan dukungan gadget Anda!';
            } else if (roll > 55) {
                place = 2; prestigeGained = 25; prizeMoney = 50000;
                message = '🥈 JUARA KEDUA! Pertandingan sengit di babak final memberikan sorotan pasar yang luar biasa pada hardware Anda!';
            } else {
                place = 5; prestigeGained = 10; prizeMoney = 10000;
                message = '🎮 ELIMINASI SEMIFINAL. Tim Anda gugur di semifinal, namun promosi brand gadget tetap berjalan optimal.';
            }
        } else { // furniture
            if (roll > 80) {
                place = 1; prestigeGained = 30; prizeMoney = 60000;
                message = '🏆 GOLDEN AWARD! Furnitur minimalis Anda memenangkan penghargaan rancangan interior terbaik di Milan Design Week!';
            } else if (roll > 45) {
                place = 2; prestigeGained = 18; prizeMoney = 30000;
                message = '🥈 SILVER AWARD! Stand pameran Anda sangat ramai dipadati investor properti mancanegara!';
            } else {
                place = 4; prestigeGained = 8; prizeMoney = 5000;
                message = '📐 DESIGN NOMINEE! Rancangan Anda masuk nominasi karya terunik dan mendapatkan perhatian media furnitur.';
            }
        }

        biz.cash += prizeMoney;
        mfg.prestige = (mfg.prestige || 10) + prestigeGained;
        mfg.lastEventResult = {
            place: place,
            prestige: prestigeGained,
            prize: prizeMoney,
            message: message,
            eventName: eventName,
            eventIcon: eventIcon,
            date: new Date().toLocaleTimeString()
        };

        biz.valuation += prestigeGained * 5000;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            manufacturing: mfg
        }));

        ui.success(message, `${eventIcon} Hasil ${eventName} (Posisi #${place})`);
        return true;
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const mfg = this.getManufacturingState(manager);
        if (!mfg) return { wages: 0, cost: 0, revenue: 0 };

        const sub = mfg.subSector;
        const models = MFG_MODELS[sub] || MFG_MODELS.mobil;
        const model = models.find(m => m.id === mfg.activeModel) || models[0];

        // 1. Demand Fluctuations
        const econMult = globalEconomy.getDemandMultiplier('manufacturing') || 1.0;
        const prestigeBonus = (mfg.prestige || 10) / 100;
        const randDev = (Math.random() - 0.5) * 0.12;
        mfg.demandFluctuation = parseFloat(Math.min(2.0, Math.max(0.4, econMult + prestigeBonus + randDev)).toFixed(2));

        const targetVol = mfg.productionVolume || (sub === 'mobil' ? 50 : 500);

        // 1. Costs
        const productionCost = targetVol * model.cost;
        
        // 2. Sales
        const maxSalesQty = Math.round(targetVol * mfg.demandFluctuation * model.demandFactor * (mfg.serviceQuality / 100));
        const actualSold = Math.min(targetVol, maxSalesQty);

        const salesRevenue = actualSold * model.price;

        // 3. Post-Sales / Maintenance income
        const postSaleRate = sub === 'mobil' ? 1200 : sub === 'electronic' ? 55 : 40;
        const serviceRevenue = Math.round(actualSold * postSaleRate * (mfg.serviceQuality / 100));

        const totalRevenue = salesRevenue + serviceRevenue;
        const baseOverhead = targetVol * (sub === 'mobil' ? 250 : sub === 'electronic' ? 12 : 8);
        const totalCost = productionCost + baseOverhead;

        // Apply lean manufacturing / kaizen initiatives cost reduction
        let finalCost = totalCost;
        if (initiatives.mfg_lean) {
            finalCost *= 0.8;
        }

        gameState.update('business', b => ({
            ...b,
            manufacturing: mfg
        }));

        return {
            wages: 0,
            cost: Math.round(finalCost),
            revenue: Math.round(totalRevenue)
        };
    }
};

export default ManufacturingSector;
