/**
 * BusinessAuctions.js - Corporate M&A Deal Marketplace
 *
 * Contains all auction/deal constants and M&A logic previously in BusinessManager.
 * Kept separate to reduce BusinessManager size and improve editability of M&A features.
 */

import gameState from '../core/GameState.js';
import financeManager from '../finance/FinanceManager.js';
import ui from '../ui/UIManager.js';

// ============================================================
// STATIC CONSTANTS
// ============================================================

export const COMPANY_PREFIXES = [
    'Nusa', 'Zetta', 'Apex', 'Sinar', 'Global', 'Vertex', 'Pioneer', 'Mega',
    'Sinergi', 'Aditya', 'Quantum', 'Bintang', 'Sovereign', 'Agro', 'Mandiri',
    'Alpha', 'Aegis', 'Kencana', 'Integra', 'Prisma', 'Eldorado', 'Omni',
    'Sakti', 'Gading', 'Delta', 'Pinnacle', 'Summit'
];

export const COMPANY_SUFFIXES = {
    'tech':          ['Systems', 'Software', 'AI Technologies', 'Digital', 'Robotics', 'Labs'],
    'logistics':     ['Logistics', 'Trans', 'Express', 'Supply Chain', 'Freighters', 'Cargo'],
    'retail':        ['Mart', 'Retail Group', 'Goods', 'Outlet', 'Franchise', 'Supermart'],
    'energy':        ['Energy', 'Power', 'Renewables', 'Utilities', 'Solar', 'Biofuels'],
    'manufacturing': ['Industries', 'Forge', 'Heavy Manufacturing', 'Assembler', 'Automotive', 'Aerospace'],
    'finance':       ['Capital', 'Ventures', 'Fintech', 'Holdings', 'Securities', 'Equities']
};

export const AUCTION_INDUSTRIES = [
    { id: 'tech',          name: 'Teknologi & AI',              icon: '💻', baseProfit: 12000,  baseVal: 240000  },
    { id: 'logistics',     name: 'Rantai Pasok & Logistik',     icon: '🚚', baseProfit: 8000,   baseVal: 160000  },
    { id: 'retail',        name: 'Barang Konsumsi & Ritel',     icon: '🛒', baseProfit: 4500,   baseVal: 90000   },
    { id: 'energy',        name: 'Energi & Utilitas',           icon: '⚡', baseProfit: 35000,  baseVal: 700000  },
    { id: 'manufacturing', name: 'Manufaktur & Dirgantara',     icon: '🏭', baseProfit: 50000,  baseVal: 1000000 },
    { id: 'finance',       name: 'Jasa Keuangan',               icon: '🏦', baseProfit: 25000,  baseVal: 500000  }
];

const AI_COMPETITORS = [
    'Artha Capital', 'Mega Corp', 'Wira Group', 'Candra & Co',
    'Sovereign Wealth', 'Nusantara Fund', 'Mahardika Trust',
    'Pacific Equity', 'Nusa Ventures', 'Jaya Group'
];

// ============================================================
// AUCTION GENERATOR
// ============================================================

/**
 * Generate a randomized target company for the deal marketplace.
 * Returns either a 'direct' buyout or an 'auction' deal object.
 */
export function generateRandomAuction() {
    const industry = AUCTION_INDUSTRIES[Math.floor(Math.random() * AUCTION_INDUSTRIES.length)];
    const prefix   = COMPANY_PREFIXES[Math.floor(Math.random() * COMPANY_PREFIXES.length)];
    const suffixes = COMPANY_SUFFIXES[industry.id];
    const suffix   = suffixes[Math.floor(Math.random() * suffixes.length)];
    const name     = `${prefix} ${suffix}`;

    const isDirect   = Math.random() < 0.5;
    const multiplier = 0.80 + Math.random() * 0.60; // 0.80 – 1.40
    let profit    = Math.round(industry.baseProfit * multiplier);
    let valuation = Math.round(industry.baseVal   * multiplier);

    if (isDirect) {
        // Direct-premium buyouts yield higher revenue and persistent valuation uplift
        profit    = Math.round(profit    * 1.8);
        valuation = Math.round(valuation * 1.5);
        const price = Math.round(valuation * 1.6);
        return {
            id: 'deal_' + Math.random().toString(36).substr(2, 9),
            name, type: 'direct',
            industry: industry.name, industryId: industry.id, icon: industry.icon,
            profit, valuation, price,
            paymentSource: null
        };
    }

    // Bidding auction
    const minBid  = Math.round(valuation * (0.90 + Math.random() * 0.20));
    const daysLeft = 8 + Math.floor(Math.random() * 12);
    const aiName  = AI_COMPETITORS[Math.floor(Math.random() * AI_COMPETITORS.length)];
    const initialBid = Math.round(minBid * (0.85 + Math.random() * 0.15));

    return {
        id: 'deal_' + Math.random().toString(36).substr(2, 9),
        name, type: 'auction',
        industry: industry.name, industryId: industry.id, icon: industry.icon,
        profit, valuation,
        minBid,
        highestBid: initialBid,
        highestBidder: aiName,
        highestBidderIsPlayer: false,
        paymentSource: null,
        daysLeft, totalDays: daysLeft
    };
}

// ============================================================
// TICK AUCTIONS  (called from BusinessManager.processMonthlyUpdate path)
// ============================================================

/**
 * Process calendar daily decrement and competitive bidding AI reactions.
 * Mutates gameState 'business.auctions' in-place.
 */
export function tickAuctions() {
    const biz = gameState.get('business');
    if (!biz || !biz.active) return;

    let auctions = biz.auctions || [];

    // Initialise deal marketplace with 4 items when empty
    if (auctions.length === 0) {
        auctions = [
            generateRandomAuction(), generateRandomAuction(),
            generateRandomAuction(), generateRandomAuction()
        ];
        gameState.update('business', b => ({ ...b, auctions }));
        return;
    }

    let updatedAuctions = [];
    let stateChanged    = false;

    for (let auc of auctions) {
        // Direct buyouts don't tick down
        if (auc.type === 'direct') {
            updatedAuctions.push(auc);
            continue;
        }

        auc.daysLeft--;

        // AI counter-bid (35% chance each tick)
        if (auc.daysLeft > 0 && Math.random() < 0.35) {
            const increment    = Math.round(auc.minBid * (0.05 + Math.random() * 0.08));
            const newBid       = auc.highestBid + increment;
            const newBidder    = AI_COMPETITORS[Math.floor(Math.random() * AI_COMPETITORS.length)];
            const wasPlayer    = auc.highestBidderIsPlayer;

            auc.highestBid            = newBid;
            auc.highestBidder         = newBidder;
            auc.highestBidderIsPlayer = false;
            stateChanged = true;

            if (wasPlayer) {
                const isRetail   = biz.industry === 'retail';
                const alertTitle = isRetail ? '⚠️ Tender Supplier Dilampaui' : '⚠️ Bid M&A Dilampaui';
                const alertMsg   = isRetail
                    ? `Penawaran tender Anda untuk supplier ${auc.name} telah dilampaui oleh ${newBidder} ($ ${financeManager.formatCurrency(newBid)})!`
                    : `Tawaran Anda untuk lelang ${auc.name} telah dilampaui oleh ${newBidder} ($ ${financeManager.formatCurrency(newBid)})!`;
                ui.info(alertMsg, alertTitle);
            }
        }

        // Auction ends
        if (auc.daysLeft <= 0) {
            _resolveAuctionEnd(auc, biz);
            stateChanged = true;
        } else {
            updatedAuctions.push(auc);
        }
    }

    // Keep at least 4 active marketplace deals
    while (updatedAuctions.length < 4) {
        updatedAuctions.push(generateRandomAuction());
        stateChanged = true;
    }

    if (stateChanged) {
        gameState.update('business', b => ({ ...b, auctions: updatedAuctions }));
    }
}

/**
 * Internal helper: resolve what happens when an auction timer reaches 0.
 */
function _resolveAuctionEnd(auc, biz) {
    const isRetail = biz.industry === 'retail';

    if (!auc.highestBidderIsPlayer) {
        // Player did not win
        const infoTitle = isRetail ? '🏢 Tender Selesai' : '🏢 Lelang Selesai';
        const infoMsg   = isRetail
            ? `Tender Kontrak ${auc.name} selesai. Pemenang: ${auc.highestBidder} dengan nilai penawaran akhir $ ${financeManager.formatCurrency(auc.highestBid)}.`
            : `Lelang Akuisisi ${auc.name} selesai. Pemenang: ${auc.highestBidder} dengan nilai penawaran akhir $ ${financeManager.formatCurrency(auc.highestBid)}.`;
        ui.info(infoMsg, infoTitle);
        return;
    }

    // Player won — process payment
    const amount = auc.highestBid;
    let paymentSuccess = false;

    if (auc.paymentSource === 'treasury') {
        if (biz.cash >= amount) {
            biz.cash -= amount;
            paymentSuccess = true;
        } else {
            const failTitle = isRetail ? '❌ Kontrak Supplier Gagal' : '❌ Akuisisi Gagal';
            const failMsg   = isRetail
                ? `Kontrak supplier ${auc.name} BATAL! Saldo Treasury tidak mencukupi ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(amount)}).`
                : `Akuisisi ${auc.name} BATAL! Saldo Treasury Perusahaan tidak mencukupi ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(amount)}).`;
            ui.error(failMsg, failTitle);
        }
    } else {
        const playerBal = gameState.getBalance();
        if (playerBal >= amount) {
            gameState.addBalance(-amount, 'expense', `Akuisisi M&A: ${auc.name}`);
            paymentSuccess = true;
        } else {
            const failTitle = isRetail ? '❌ Kontrak Supplier Gagal' : '❌ Akuisisi Gagal';
            const failMsg   = isRetail
                ? `Kontrak supplier ${auc.name} BATAL! Rekening Pribadi tidak mencukupi ($ ${financeManager.formatCurrency(playerBal)} / Butuh $ ${financeManager.formatCurrency(amount)}).`
                : `Akuisisi ${auc.name} BATAL! Rekening Pribadi tidak mencukupi ($ ${financeManager.formatCurrency(playerBal)} / Butuh $ ${financeManager.formatCurrency(amount)}).`;
            ui.error(failMsg, failTitle);
        }
    }

    if (!paymentSuccess) return;

    const newSub = {
        category: auc.industryId,
        name: auc.name,
        monthlyProfit: auc.profit,
        valuation: auc.valuation,
        isPremium: false,
        icon: auc.icon,
        foundedAt: gameState.get('gameTime.year') || 2010
    };

    gameState.update('business', b => ({
        ...b,
        cash: biz.cash,
        subsidiaries: [...(b.subsidiaries || []), newSub]
    }));

    const succTitle = isRetail ? '🎉 Tender Kontrak Ditutup' : '🎉 M&A Deal Closed';
    const succMsg   = isRetail
        ? `🏆 KEMITRAAN SUPPLIER DIRESMIKAN! ${auc.name} resmi bekerja sama sebagai supplier terpercaya Anda. Efisiensi bulanan: +$ ${financeManager.formatCurrency(auc.profit)}/bln!`
        : `🏆 AKUISISI TUNTAS! ${auc.name} resmi beroperasi sebagai anak perusahaan di bawah holding Anda. Profit bulanan: +$ ${financeManager.formatCurrency(auc.profit)}/bln!`;
    ui.success(succMsg, succTitle);
}

// ============================================================
// PLACE BID
// ============================================================

/**
 * Submit a player bid for a target company auction.
 */
export function placeBid(auctionId, amount, source) {
    const biz = gameState.get('business');
    if (!biz || !biz.active) throw new Error('Bisnis utama Anda tidak aktif!');

    const auctions = [...(biz.auctions || [])];
    const index    = auctions.findIndex(a => a.id === auctionId);
    if (index === -1) throw new Error('Lelang tidak ditemukan!');

    const auc = { ...auctions[index] };

    if (amount <= auc.highestBid)
        throw new Error(`Nilai penawaran harus lebih tinggi dari penawaran tertinggi saat ini ($ ${financeManager.formatCurrency(auc.highestBid)})!`);
    if (amount < auc.minBid)
        throw new Error(`Nilai penawaran tidak boleh kurang dari harga dasar lelang ($ ${financeManager.formatCurrency(auc.minBid)})!`);

    if (source === 'treasury') {
        if (biz.cash < amount)
            throw new Error(`Saldo Treasury Perusahaan tidak mencukupi untuk melakukan penawaran ($ ${financeManager.formatCurrency(biz.cash)})!`);
    } else {
        const playerBal = gameState.getBalance();
        if (playerBal < amount)
            throw new Error(`Rekening pribadi tidak mencukupi untuk melakukan penawaran ($ ${financeManager.formatCurrency(playerBal)})!`);
    }

    auc.highestBid            = amount;
    auc.highestBidder         = 'Anda';
    auc.highestBidderIsPlayer = true;
    auc.paymentSource         = source;
    auctions[index]           = auc;

    gameState.update('business', b => ({ ...b, auctions }));

    const isRetail   = biz.industry === 'retail';
    const alertTitle = isRetail ? '✍️ Tender Diajukan' : '✍️ Bid Berhasil';
    const alertMsg   = isRetail
        ? `Tawaran tender senilai $ ${financeManager.formatCurrency(amount)} berhasil diajukan untuk ${auc.name}!`
        : `Tawaran senilai $ ${financeManager.formatCurrency(amount)} berhasil diajukan untuk ${auc.name}!`;
    ui.success(alertMsg, alertTitle);
}

// ============================================================
// DIRECT BUYOUT
// ============================================================

/**
 * Buy out a direct-sale premium deal instantly from the marketplace.
 * @returns {boolean} true on success
 */
export function buyoutDirect(dealId, source, recalculateValuation) {
    const biz = gameState.get('business');
    if (!biz || !biz.active) throw new Error('Bisnis utama Anda tidak aktif!');

    const auctions = [...(biz.auctions || [])];
    const index    = auctions.findIndex(a => a.id === dealId);
    if (index === -1) throw new Error('Penawaran perusahaan tidak ditemukan!');

    const deal = auctions[index];
    if (deal.type !== 'direct') throw new Error('Ini bukan tipe akuisisi langsung!');

    const price = deal.price;

    if (source === 'treasury') {
        if (biz.cash < price)
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(price)})`);
        biz.cash -= price;
    } else {
        const playerBal = gameState.getBalance();
        if (playerBal < price)
            throw new Error(`Rekening Pribadi tidak mencukupi ($ ${financeManager.formatCurrency(playerBal)} / Butuh $ ${financeManager.formatCurrency(price)})`);
        gameState.addBalance(-price, 'expense', `Akuisisi M&A: ${deal.name}`);
    }

    const newSub = {
        category: deal.industryId,
        name: deal.name,
        monthlyProfit: deal.profit,
        valuation: deal.valuation,
        isPremium: true, // Premium tag for direct purchases
        icon: deal.icon,
        foundedAt: gameState.get('gameTime.year') || 2010
    };

    auctions.splice(index, 1);
    auctions.push(generateRandomAuction());

    gameState.update('business', b => ({
        ...b,
        cash: biz.cash,
        subsidiaries: [...(b.subsidiaries || []), newSub],
        auctions
    }));

    if (typeof recalculateValuation === 'function') recalculateValuation();

    const isRetail   = biz.industry === 'retail';
    const alertTitle = isRetail ? '🎉 Premium Supplier' : '🎉 Premium M&A';
    const alertMsg   = isRetail
        ? `🏆 KONTRAK SUPPLIER PREMIUM DIRESMIKAN! ${deal.name} resmi menjamin pasokan logistik bulanan Anda! Efisiensi: +$ ${financeManager.formatCurrency(deal.profit)}/bln dengan efek premium jangka panjang!`
        : `🏆 AKUISISI PREMIUM TUNTAS! ${deal.name} resmi diakuisisi langsung secara penuh! Revenue bulanan: +$ ${financeManager.formatCurrency(deal.profit)}/bln dengan dampak premium jangka panjang!`;
    ui.success(alertMsg, alertTitle);
    return true;
}
