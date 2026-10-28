/**
 * RetailSector.js - Core Retail & Inventory Operations Engine
 * Features store construction, deconstruction, warehouse capacity upgrades, and auto-restock / price sliders.
 */
import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../core/GlobalEconomy.js';

export const STORE_TIERS = [
    { id: 'toko_kelontong', name: 'Minimarket Kelontong', price: 15000, customerCapacity: 1500, maintenance: 500, prestige: 5 },
    { id: 'supermarket', name: 'Supermarket Wilayah', price: 60000, customerCapacity: 8000, maintenance: 2500, prestige: 25 },
    { id: 'megamall', name: 'Megamall Pusat Kota', price: 250000, customerCapacity: 40000, maintenance: 12000, prestige: 110 }
];

export const RetailSector = {
    getRetailState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.retail) {
            biz.retail = {
                stores: [
                    { id: 'store_init_1', ...STORE_TIERS[0] }
                ],
                warehouseCapacity: 5000,
                currentStock: 2500,
                restockCostPerUnit: 2.2,
                demandFluctuation: 1.0,
                sellingPrice: 5.5,
                restockThreshold: 50,
                lastTickInfo: { sold: 0, revenue: 0, restocked: 0, cost: 0 }
            };
            gameState.update('business', b => ({ ...b, retail: biz.retail }));
        }
        return biz.retail;
    },

    buildStore(tierId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const retail = this.getRetailState(manager);

        const tier = STORE_TIERS.find(t => t.id === tierId);
        if (!tier) throw new Error('Tipe toko tidak dikenal!');

        if (biz.cash < tier.price) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk mendirikan toko ini ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(tier.price)})`);
        }

        biz.cash -= tier.price;
        const newStore = {
            id: 'str_' + Math.random().toString(36).substr(2, 9),
            ...tier
        };
        retail.stores.push(newStore);
        biz.valuation += tier.price * 1.4;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            retail: retail
        }));

        ui.success(`Berhasil mendirikan toko "${tier.name}" baru! Pangsa pasar konsumen Anda meluas.`, '🏪 Ekspansi Ritel');
        return true;
    },

    demolishStore(storeId, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const retail = this.getRetailState(manager);

        const index = retail.stores.findIndex(s => s.id === storeId);
        if (index === -1) throw new Error('Toko tidak ditemukan!');

        const store = retail.stores[index];
        const refund = Math.round(store.price * 0.5);
        
        biz.cash += refund;
        retail.stores.splice(index, 1);
        biz.valuation = Math.max(0, biz.valuation - (store.price * 1.4));

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            retail: retail
        }));

        ui.success(`Berhasil merobohkan "${store.name}"! Memperoleh pengembalian dana rekonstruksi sebesar $ ${refund.toLocaleString()}`, '🏪 Toko Dirobohkan');
        return true;
    },

    upgradeWarehouse(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const retail = this.getRetailState(manager);

        const cost = 20000;
        if (biz.cash < cost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk perluasan kapasitas gudang ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(cost)})`);
        }

        biz.cash -= cost;
        retail.warehouseCapacity += 5000;
        biz.valuation += cost * 1.2;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            retail: retail
        }));

        ui.success(`Kapasitas gudang logistik berhasil ditingkatkan menjadi ${retail.warehouseCapacity.toLocaleString()} unit!`, '📦 Gudang Diperluas');
        return true;
    },

    updateSlider(field, value, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;
        const retail = this.getRetailState(manager);

        if (field === 'price') {
            retail.sellingPrice = Math.max(1.0, parseFloat(value));
        } else if (field === 'restock') {
            retail.restockThreshold = Math.max(0, Math.min(100, parseInt(value)));
        }

        gameState.update('business', b => ({ ...b, retail }));
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const retail = this.getRetailState(manager);
        if (!retail) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Consumer demand fluctuations
        const econMult = globalEconomy.getDemandMultiplier('retail');
        const randDev = (Math.random() - 0.5) * 0.10;
        retail.demandFluctuation = parseFloat(Math.max(0.4, Math.min(2.0, econMult + randDev)).toFixed(2));

        let totalCustomerCapacity = 0;
        let totalStoreMaint = 0;
        retail.stores.forEach(s => {
            totalCustomerCapacity += s.customerCapacity;
            totalStoreMaint += s.maintenance;
        });

        // 2. Sales volume calculation based on player pricing vs standard price ($5.50)
        const sellingPrice = retail.sellingPrice || 5.50;
        const basePrice = 5.50;

        let priceElasticity = 1.0;
        if (sellingPrice > basePrice) {
            priceElasticity = Math.max(0, 1 - (sellingPrice - basePrice) / (basePrice * 0.8));
        } else {
            priceElasticity = 1.0 + (basePrice - sellingPrice) / (basePrice * 2.0);
        }

        const targetSalesUnits = Math.round(totalCustomerCapacity * retail.demandFluctuation * priceElasticity);
        const actualSold = Math.min(retail.currentStock, targetSalesUnits);

        // Deduct stock
        retail.currentStock = Math.max(0, retail.currentStock - actualSold);

        // Sales Revenue
        const salesRevenue = actualSold * sellingPrice;

        // 3. Auto-Restock logic
        const targetPercent = retail.restockThreshold || 0;
        const targetStock = Math.round(retail.warehouseCapacity * (targetPercent / 100));
        
        let qtyToBuy = 0;
        let restockCost = 0;

        if (retail.currentStock < targetStock) {
            qtyToBuy = targetStock - retail.currentStock;

            let discount = 1.0;
            if (qtyToBuy >= 10000) discount = 0.85;
            else if (qtyToBuy >= 5000) discount = 0.90;
            else if (qtyToBuy >= 2000) discount = 0.95;

            const unitCost = retail.restockCostPerUnit * discount;
            restockCost = Math.round(qtyToBuy * unitCost);

            if (biz.cash < restockCost) {
                if (biz.cash > 0) {
                    qtyToBuy = Math.floor(biz.cash / unitCost);
                    restockCost = Math.round(qtyToBuy * unitCost);
                } else {
                    qtyToBuy = 0;
                    restockCost = 0;
                }
            }

            biz.cash = Math.max(0, biz.cash - restockCost);
            retail.currentStock += qtyToBuy;
        }

        // Save last tick info
        retail.lastTickInfo = {
            sold: actualSold,
            revenue: Math.round(salesRevenue),
            restocked: qtyToBuy,
            cost: restockCost
        };

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            retail: retail
        }));

        return {
            wages: 0,
            cost: Math.round(totalStoreMaint + restockCost),
            revenue: Math.round(salesRevenue)
        };
    }
};

export default RetailSector;
