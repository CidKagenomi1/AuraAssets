/**
 * RetailSector.js - Core Retail & Inventory Operations Engine
 * Features store construction, deconstruction, warehouse capacity upgrades, and supplier stock purchasing.
 */
import gameState from '../../game/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../game/GlobalEconomy.js';

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
                    { id: 'store_init_1', ...STORE_TIERS[0] } // Start with 1 retail store
                ],
                warehouseCapacity: 5000, // Stock units capacity
                currentStock: 2500, // Initial stock
                restockCostPerUnit: 2.2, // Supplier pricing
                demandFluctuation: 1.0
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

    purchaseStock(quantity, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const retail = this.getRetailState(manager);

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) throw new Error('Jumlah pembelian stok barang tidak valid!');

        if (retail.currentStock + qty > retail.warehouseCapacity) {
            throw new Error(`Gudang overload! Kapasitas tersisa hanya ${(retail.warehouseCapacity - retail.currentStock).toLocaleString()} unit. Upgrade gudang Anda terlebih dahulu!`);
        }

        // Supplier volume discounts: Buying more saves supplier markup
        let discount = 1.0;
        if (qty >= 10000) discount = 0.85; // 15% off
        else if (qty >= 5000) discount = 0.90; // 10% off
        else if (qty >= 2000) discount = 0.95; // 5% off

        const unitCost = retail.restockCostPerUnit * discount;
        const totalCost = Math.round(qty * unitCost);

        if (biz.cash < totalCost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk membeli pasokan barang dari Supplier ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(totalCost)})`);
        }

        biz.cash -= totalCost;
        retail.currentStock += qty;

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            retail: retail
        }));

        ui.success(`Sukses memasok ${qty.toLocaleString()} barang dagangan ke gudang dengan harga grosir supplier!`, '📦 Restock Berhasil');
        return true;
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const retail = this.getRetailState(manager);
        if (!retail) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Consumer demand fluctuations (dynamically driven by the global economic cycle)
        const econMult = globalEconomy.getDemandMultiplier('retail');
        const randDev = (Math.random() - 0.5) * 0.10; // slight consumer trend variance
        retail.demandFluctuation = parseFloat(Math.max(0.4, Math.min(2.0, econMult + randDev)).toFixed(2));

        let totalCustomerCapacity = 0;
        let totalStoreMaint = 0;
        retail.stores.forEach(s => {
            totalCustomerCapacity += s.customerCapacity;
            totalStoreMaint += s.maintenance;
        });

        // 2. Sales calculations (each customer buys 1 stock unit per month on average)
        const targetSalesUnits = Math.round(totalCustomerCapacity * retail.demandFluctuation);
        const actualSold = Math.min(retail.currentStock, targetSalesUnits);

        // Deduct from inventory stock
        retail.currentStock = Math.max(0, retail.currentStock - actualSold);

        // Sales Revenue ($5.50 average shelf ticket price)
        const salesRevenue = actualSold * 5.50;

        gameState.update('business', b => ({
            ...b,
            retail: retail
        }));

        return {
            wages: 0,
            cost: totalStoreMaint,
            revenue: Math.round(salesRevenue)
        };
    }
};

export default RetailSector;
