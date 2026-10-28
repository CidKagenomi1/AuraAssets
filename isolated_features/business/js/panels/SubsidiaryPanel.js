/**
 * SubsidiaryPanel.js - Premium Holding Corporate M&A & Supplier Contracting Workspace
 * Features both competitive corporate auctions and premium instant direct acquisitions,
 * supporting multi-source financing (Corporate Treasury or Personal Wallet).
 * Organized into exactly 2 pages: Lelang and Akuisisi.
 * Dynamically adjusts terminology to "Supplier" for Retail and "Anak Perusahaan" for other industries.
 */

import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import businessManager from '../../business/BusinessManager.js';
import ui from '../../ui/UIManager.js';

const formatCompact = (num) => {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return new Intl.NumberFormat('en-US').format(Math.round(num));
};

export const SubsidiaryPanel = {
    activeSubTab: 'lelang', // Default to Lelang page

    render(biz, parentPage) {
        this.activeSubTab = this.activeSubTab || 'lelang';
        const subs = biz.subsidiaries || [];
        const auctions = biz.auctions || [];

        const isRetail = (biz && (biz.industry === 'retail' || biz.industry === 'fnb'));
        const isInfrastructure = (biz && (biz.industry === 'infrastructure' || biz.industry === 'property'));

        // Define dynamic terminology strings
        const terms = {
            emptyTitle: isRetail 
                ? (this.activeSubTab === 'lelang' ? 'Belum Ada Kontrak Supplier' : 'Belum Ada Supplier Premium')
                : isInfrastructure
                    ? (this.activeSubTab === 'lelang' ? 'Belum Ada Kontrak Fendor' : 'Belum Ada Fendor Premium')
                    : (this.activeSubTab === 'lelang' ? 'Belum Ada Hasil Lelang' : 'Belum Ada Akuisisi Premium'),
            emptyDesc: isRetail
                ? (this.activeSubTab === 'lelang' ? 'Menangkan bidding tender supplier di sebelah kiri untuk mengamankan kemitraan baru.' : 'Beli langsung hak pasok eksklusif di sebelah kiri untuk supplier premium.')
                : isInfrastructure
                    ? (this.activeSubTab === 'lelang' ? 'Menangkan bidding tender fendor di sebelah kiri untuk mengamankan kemitraan baru.' : 'Beli langsung hak kerjasama fendor eksklusif di sebelah kiri untuk fendor premium.')
                    : (this.activeSubTab === 'lelang' ? 'Menangkan bidding lelang di sebelah kiri untuk menambah entitas baru ke holding.' : 'Beli langsung perusahaan di sebelah kiri untuk menambah entitas premium.'),
            emptyEmoji: isRetail ? '🤝' : (isInfrastructure ? '🏗️' : '🐙'),
            subTypeBadge: (s) => s.isPremium
                ? (isRetail ? 'PREMIUM SUPPLIER' : (isInfrastructure ? 'PREMIUM FENDOR' : 'PREMIUM ACQUIRED'))
                : (isRetail ? 'TENDER SUPPLIER' : (isInfrastructure ? 'TENDER FENDOR' : 'AUCTION WIN')),
            profitLabel: isRetail ? 'Efisiensi / Laba Pasokan' : (isInfrastructure ? 'Efisiensi / Laba Fendor' : 'Dividen Bulanan'),
            assetValLabel: isRetail ? 'Valuasi Pasokan' : (isInfrastructure ? 'Valuasi Fendor' : 'Kontribusi Aset'),
            badgeDirectText: (isRetail || isInfrastructure) ? '⚡ KONTRAK INSTAN' : '⚡ BUYOUT INSTAN',
            metricsProfitLabel: isRetail ? 'Estimasi Profit Bahan Baku' : (isInfrastructure ? 'Estimasi Profit Fendor' : 'Estimasi Profit Bulanan'),
            metricsValLabel: isRetail ? 'Valuasi Supply Chain' : (isInfrastructure ? 'Valuasi Jaringan Fendor' : 'Valuasi Dasar'),
            priceBoardLabel: isRetail ? 'Biaya Kontrak Eksklusif Supplier (Market Price)' : (isInfrastructure ? 'Biaya Kontrak Eksklusif Fendor (Market Price)' : 'Harga Akuisisi Langsung (Market Price)'),
            priceBoardDesc: isRetail ? 'Dapatkan 100% kendali supply secara instan tanpa bidding lelang' : (isInfrastructure ? 'Dapatkan 100% kendali fendor secara instan tanpa bidding lelang' : 'Dapatkan 100% kendali secara instan tanpa bidding lelang'),
            buyoutBtnText: (isRetail || isInfrastructure) ? 'Amankan Kontrak' : 'Beli Perusahaan',
            aucProfitLabel: isRetail ? 'Estimasi Profit Pasokan' : (isInfrastructure ? 'Estimasi Profit Fendor' : 'Estimasi Profit Bulanan'),
            aucProfitDesc: isRetail ? 'Kapasitas Pasokan Optimal' : (isInfrastructure ? 'Kapasitas Kinerja Fendor' : 'IP-Heavy (Kurang Modal)'),
            aucValLabel: isRetail ? 'Valuasi Kontrak' : (isInfrastructure ? 'Valuasi Kontrak Fendor' : 'Valuasi Sektor'),
            aucValDesc: (isRetail || isInfrastructure) ? 'Tender Harga Kompetitif' : 'Harga Lelang Murah',
            aucBidLeading: (isRetail || isInfrastructure) ? '🏆 POSISI MEMIMPIN' : '🏆 POSISI LEADING',
            aucBidBehind: (isRetail || isInfrastructure) ? '⚠️ ANDA DIKALAHKAN' : '⚠️ ANDA TERTINGGAL',
            aucBidBtnText: (isRetail || isInfrastructure) ? 'Ajukan Bid Tender' : 'Ajukan Bid Deal',
            subTab1Text: isRetail ? '⚖️ Kontrak Lelang Pemasok' : (isInfrastructure ? '⚖️ Kontrak Lelang Fendor' : '⚖️ Live Lelang (Bidding)'),
            subTab2Text: isRetail ? '⚡ Supplier Premium (Instan)' : (isInfrastructure ? '⚡ Fendor Premium (Instan)' : '⚡ Akuisisi Instan (Marketplace)'),
            summaryCard1Title: isRetail
                ? (this.activeSubTab === 'lelang' ? 'Tender Won Pemasok' : 'Premium Supplier Pemasok')
                : isInfrastructure
                    ? (this.activeSubTab === 'lelang' ? 'Tender Won Fendor' : 'Premium Fendor Partner')
                    : (this.activeSubTab === 'lelang' ? 'Lelang Won Entities' : 'Premium Buyout Entities'),
            summaryCard1ValText: isRetail ? 'Mitra Pemasok' : (isInfrastructure ? 'Mitra Fendor' : 'Entitas Bisnis'),
            summaryCard1Desc: isRetail ? 'Kemitraan supplier aktif' : (isInfrastructure ? 'Kemitraan fendor aktif' : 'Anak perusahaan terakuisisi'),
            summaryCard2Title: isRetail ? 'Total Supply Valuation' : (isInfrastructure ? 'Total Fendor Valuation' : 'Total Assets Value'),
            summaryCard2Desc: isRetail ? 'Kekuatan rantai pasokan bahan baku' : (isInfrastructure ? 'Kekuatan jaringan fendor properti' : 'Valuasi gabungan anak usaha'),
            summaryCard3Title: isRetail ? 'Dividen & Efisiensi Bahan Baku' : (isInfrastructure ? 'Dividen & Efisiensi Fendor' : 'Laba Masuk Dividen Bulanan'),
            summaryCard3Desc: isRetail ? 'Auto-ditambahkan ke kas utama sebagai efisiensi' : (isInfrastructure ? 'Auto-ditambahkan ke kas utama holding' : 'Auto-ditambahkan ke kas utama holding'),
            leftColTitle: isRetail
                ? (this.activeSubTab === 'lelang' ? '⚖️ Live Tender Supplier (Bidding Pit)' : '⚡ Premium Supplier & Eksklusif (Instan)')
                : isInfrastructure
                    ? (this.activeSubTab === 'lelang' ? '⚖️ Live Tender Fendor (Bidding Pit)' : '⚡ Premium Fendor & Eksklusif (Instan)')
                    : (this.activeSubTab === 'lelang' ? '⚖️ Live M&A Auctions (Bidding Pit)' : '⚡ Premium Corporate Marketplace (Buyout)'),
            leftColDesc: isRetail
                ? (this.activeSubTab === 'lelang' ? 'Ikuti persaingan lelang akuisisi pasokan dengan penawaran (bidding) tender dinamis melawan korporasi raksasa lainnya. Sangat cocok untuk mengamankan bahan baku dengan harga murah.' : 'Mulai kerja sama dengan supplier besar secara premium secara instan tanpa bidding tender lelang. Mendapatkan bonus efisiensi bahan baku bulanan +80% secara signifikan!')
                : isInfrastructure
                    ? (this.activeSubTab === 'lelang' ? 'Ikuti persaingan lelang fendor properti dengan penawaran (bidding) tender dinamis melawan korporasi raksasa lainnya. Sangat cocok untuk mengamankan mitra kerja dengan harga kompetitif.' : 'Mulai kerja sama dengan fendor besar secara premium secara instan tanpa bidding tender lelang. Mendapatkan bonus efisiensi fendor bulanan +80% secara signifikan!')
                    : (this.activeSubTab === 'lelang' ? 'Ikuti persaingan lelang akuisisi dengan penawaran (bidding) dinamis melawan kompetitor holding raksasa lainnya. Sangat cocok untuk perusahaan berpotensi tinggi dengan dana cekak.' : 'Akusisi langsung perusahaan mapan secara instan tanpa bidding lelang. Mendapatkan bonus revenue bulanan +80% serta pelipat ganda valuasi holding jangka panjang!'),
            rightColTitle: isRetail
                ? (this.activeSubTab === 'lelang' ? 'Kemitraan Tender' : 'Kemitraan Premium')
                : isInfrastructure
                    ? (this.activeSubTab === 'lelang' ? 'Kemitraan Tender' : 'Kemitraan Premium')
                    : (this.activeSubTab === 'lelang' ? 'Portofolio Lelang' : 'Portofolio Akuisisi'),
            rightColDesc: isRetail
                ? (this.activeSubTab === 'lelang' ? 'Daftar mitra supplier hasil menang tender lelang.' : 'Daftar mitra supplier hasil akuisisi premium instan.')
                : isInfrastructure
                    ? (this.activeSubTab === 'lelang' ? 'Daftar mitra fendor hasil menang tender lelang.' : 'Daftar mitra fendor hasil akuisisi premium instan.')
                    : (this.activeSubTab === 'lelang' ? 'Daftar anak perusahaan hasil menang lelang.' : 'Daftar anak perusahaan hasil akuisisi premium.')
        };

        // Dynamic Spawner: If auctions is empty, generate initial list (now 4 items in marketplace)
        if (auctions.length === 0) {
            setTimeout(() => {
                businessManager.tickAuctions();
                if (parentPage) parentPage.render();
            }, 50);
        }

        // Filter based on active subtab
        const displayAuctions = auctions.filter(auc => {
            const isDirect = auc.type === 'direct';
            return this.activeSubTab === 'lelang' ? !isDirect : isDirect;
        });

        const displaySubs = subs.filter(s => {
            return this.activeSubTab === 'lelang' ? !s.isPremium : s.isPremium;
        });

        // 1. Calculate Holding Overview Stats for current page
        let totalSubsVal = 0;
        let totalSubsProfit = 0;
        displaySubs.forEach(s => {
            let subVal = s.valuation || 0;
            if (s.isPremium) subVal *= 1.35; // Reflect premium multiplier
            totalSubsVal += subVal;
            totalSubsProfit += s.monthlyProfit || 0;
        });

        // 2. Render Subsidiary Ledger (Right column)
        let subRows = '';
        if (displaySubs.length === 0) {
            subRows = `
                <div style="text-align: center; padding: 2.5rem 1rem; background: rgba(255,255,255,0.01); border-radius: 12px; border: 1px dashed var(--border-color);">
                    <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">${terms.emptyEmoji}</div>
                    <h4 style="margin:0 0 4px 0; font-size: 0.95rem; color:#fff; font-weight:800;">
                        ${terms.emptyTitle}
                    </h4>
                    <p class="text-muted" style="font-size:0.75rem; max-width: 250px; margin: 0 auto; line-height: 1.4;">
                        ${terms.emptyDesc}
                    </p>
                </div>
            `;
        } else {
            displaySubs.forEach(s => {
                const subTypeBadgeText = terms.subTypeBadge(s);
                const subTypeBadge = s.isPremium
                    ? `<span style="background: rgba(16, 185, 129, 0.08); border:1px solid rgba(16, 185, 129, 0.15); padding: 2px 8px; border-radius: 4px; font-size:0.6rem; font-weight:800; color:#10b981; text-transform:uppercase;">${subTypeBadgeText}</span>`
                    : `<span style="background: rgba(59, 130, 246, 0.08); border:1px solid rgba(59, 130, 246, 0.15); padding: 2px 8px; border-radius: 4px; font-size:0.6rem; font-weight:800; color:#3b82f6; text-transform:uppercase;">${subTypeBadgeText}</span>`;
                
                let sVal = s.valuation || 0;
                if (s.isPremium) sVal *= 1.35;

                subRows += `
                    <div class="card" style="padding: 1rem; background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); display:flex; flex-direction:column; justify-content:space-between; transition: all 0.2s; gap: 0.5rem;">
                        <div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.25rem;">
                                <div style="font-size: 1.6rem;">${s.icon || '🏢'}</div>
                                ${subTypeBadge}
                            </div>
                            <h4 style="margin:0 0 2px 0; font-size: 0.95rem; font-weight:900; color:#fff;">${s.name}</h4>
                            <div style="font-size:0.65rem; color:var(--text-dim); margin-bottom:0.5rem;">Terakuisisi Kalender: ${s.foundedAt || 2010}</div>
                            
                            <div style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; background:rgba(0,0,0,0.15); padding:8px; border-radius:8px; margin-bottom:0.5rem;">
                                <div style="display:flex; justify-content:space-between;">
                                    <span style="color:var(--text-muted);">${terms.profitLabel}</span>
                                    <span style="font-weight:800; color:#10b981;">+$ ${financeManager.formatCurrency(s.monthlyProfit)}/bln</span>
                                </div>
                                <div style="display:flex; justify-content:space-between;">
                                    <span style="color:var(--text-muted);">${terms.assetValLabel}</span>
                                    <span style="font-weight:800; color:#f59e0b;">$ ${formatCompact(sVal)}</span>
                                </div>
                            </div>

                            <!-- Invest Panel inside Card -->
                            <div style="display: flex; gap: 0.25rem; align-items: center; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 0.5rem;">
                                <select class="invest-source" id="invest-source-${s.id}" style="padding: 4px; font-size: 0.65rem; background: #111; color: #fff; border: 1px solid var(--border-color); border-radius: 4px; flex: 1; outline: none; cursor: pointer;">
                                    <option value="treasury">🏢 Treasury</option>
                                    <option value="personal">💼 Pribadi</option>
                                </select>
                                <select class="invest-qty" id="invest-qty-${s.id}" style="padding: 4px; font-size: 0.65rem; background: #111; color: #fff; border: 1px solid var(--border-color); border-radius: 4px; flex: 1.2; outline: none; cursor: pointer;">
                                    <option value="25000">Suntik $ 25K</option>
                                    <option value="100000">Suntik $ 100K</option>
                                    <option value="500000">Suntik $ 500K</option>
                                </select>
                                <button class="btn btn-primary btn-sm btn-invest-sub" data-id="${s.id}" style="padding: 4px 8px; font-size: 0.65rem; font-weight: 800; border-radius: 4px;">
                                    📈 Invest
                                </button>
                            </div>
                            <div style="margin-top: 0.5rem; display: flex;">
                                <button class="btn btn-sm btn-ipo-sub" data-id="${s.id}" data-name="${s.name}" data-val="${sVal}" style="width: 100%; padding: 4px 8px; font-size: 0.65rem; font-weight: 850; border-radius: 4px; background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3); color: #c084fc; cursor: pointer; transition: all 0.2s;">
                                    🚀 IPO Spinoff (+$ ${formatCompact(sVal)})
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        // 3. Render M&A Deal Marketplace (Left column)
        let dealRows = '';
        if (displayAuctions.length === 0) {
            dealRows = `
                <div style="text-align: center; padding: 4rem 2rem; color: var(--text-dim);">
                    <div class="spinner" style="border: 2px solid rgba(255,255,255,0.05); border-top: 2px solid var(--accent-primary); border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 0 auto 1rem auto;"></div>
                    <span>Mempersiapkan deal room target baru...</span>
                </div>
            `;
        } else {
            displayAuctions.forEach(auc => {
                const isDirect = auc.type === 'direct';
                
                if (isDirect) {
                    // Direct premium buyouts
                    dealRows += `
                        <div class="card auction-card" style="padding: 1.5rem; background: linear-gradient(180deg, rgba(16, 185, 129, 0.02) 0%, transparent 100%); border-radius: 12px; margin-bottom: 1.25rem; border: 1px solid rgba(16, 185, 129, 0.22); box-shadow: 0 4px 20px rgba(16, 185, 129, 0.03); transition: all 0.3s ease;">
                            <!-- Company Title -->
                            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1rem;">
                                <div style="display:flex; align-items:center; gap:0.75rem;">
                                    <div style="font-size:2.5rem;">${auc.icon || '🏢'}</div>
                                    <div>
                                        <h4 style="margin:0; font-size:1.15rem; font-weight:850; color:#fff; display:flex; align-items:center; gap:0.5rem;">
                                            ${auc.name}
                                        </h4>
                                        <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.04em;">${auc.industry}</span>
                                    </div>
                                </div>
                                <span style="background:rgba(16, 185, 129, 0.12); border:1px solid rgba(16, 185, 129, 0.3); color:#10b981; font-size:0.65rem; font-weight:900; padding:6px 12px; border-radius:20px; letter-spacing:0.04em;">${terms.badgeDirectText}</span>
                            </div>
 
                            <!-- Target Financial Metrics -->
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1.25rem; background:rgba(0,0,0,0.15); padding:12px; border-radius:8px;">
                                <div>
                                    <div style="font-size:0.65rem; color:var(--text-dim); text-transform:uppercase;">${terms.metricsProfitLabel}</div>
                                    <div style="font-size:1.1rem; font-weight:850; color:#10b981;">+$ ${financeManager.formatCurrency(auc.profit)}/bln</div>
                                    <span style="font-size:0.55rem; color:#10b981; display:block; font-weight:700; margin-top:2px;">🚀 +80% Revenue Boost (Premium)</span>
                                </div>
                                <div>
                                    <div style="font-size:0.65rem; color:var(--text-dim); text-transform:uppercase;">${terms.metricsValLabel}</div>
                                    <div style="font-size:1.1rem; font-weight:850; color:#f59e0b;">$ ${financeManager.formatCurrency(auc.valuation)}</div>
                                    <span style="font-size:0.55rem; color:#f59e0b; display:block; font-weight:700; margin-top:2px;">📈 +35% Valuasi Jangka Panjang</span>
                                </div>
                            </div>
 
                            <!-- Price Board -->
                            <div style="border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color); padding:0.875rem 0; margin-bottom:1.25rem; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="font-size:0.65rem; color:var(--text-dim); text-transform:uppercase;">${terms.priceBoardLabel}</div>
                                    <div style="font-size:1.45rem; font-weight:900; color:#10b981;">$ ${financeManager.formatCurrency(auc.price)}</div>
                                    <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${terms.priceBoardDesc}</div>
                                </div>
                            </div>
 
                            <!-- Buyout Action Box -->
                            <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-color); padding:1rem; border-radius:8px; display:flex; flex-direction:column; gap:0.75rem;">
                                <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:0.5rem; align-items:center;">
                                    <div>
                                        <select id="buyout-source-${auc.id}" style="width:100%; padding:8px 10px; border:1px solid var(--border-color); background:#111; color:#fff; font-size:0.8rem; font-weight:700; border-radius:6px; outline:none; cursor:pointer;">
                                            <option value="treasury">🏢 Treasury ($ ${financeManager.formatCurrency(biz.cash)})</option>
                                            <option value="personal">💼 Rekening ($ ${financeManager.formatCurrency(gameState.getBalance())})</option>
                                        </select>
                                    </div>
                                    <button class="btn btn-primary btn-sm btn-buyout-direct" data-id="${auc.id}" style="background:linear-gradient(135deg, #10b981, #059669); border:none; font-weight:850; font-size:0.75rem; height:36px; padding:0; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(16,185,129,0.2);">${terms.buyoutBtnText}</button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    // Traditional competitive auctions
                    const isLeading = auc.highestBidderIsPlayer;
                    const borderStyle = isLeading ? 'border: 1px solid rgba(16, 185, 129, 0.4); box-shadow: 0 4px 20px rgba(16, 185, 129, 0.05);' : 'border: 1px solid var(--border-color);';
                    
                    const totalDays = auc.totalDays || 15;
                    const progressPct = Math.max(0, Math.min(100, (auc.daysLeft / totalDays) * 100));
                    const progressColor = auc.daysLeft <= 3 ? '#ef4444' : (auc.daysLeft <= 7 ? '#f59e0b' : 'var(--accent-primary)');

                    const recommendedBid = auc.highestBid + Math.round(auc.minBid * 0.05);

                    dealRows += `
                        <div class="card auction-card" style="padding: 1.5rem; background: linear-gradient(180deg, rgba(255,255,255,0.015) 0%, transparent 100%); border-radius: 12px; margin-bottom: 1.25rem; transition: all 0.3s ease; ${borderStyle}">
                            <!-- Company Title -->
                            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1rem;">
                                <div style="display:flex; align-items:center; gap:0.75rem;">
                                    <div style="font-size:2.5rem;">${auc.icon || '🏢'}</div>
                                    <div>
                                        <h4 style="margin:0; font-size:1.15rem; font-weight:850; color:#fff; display:flex; align-items:center; gap:0.5rem;">
                                            ${auc.name}
                                        </h4>
                                        <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.04em;">${auc.industry}</span>
                                    </div>
                                </div>
                                <!-- Countdown Indicator -->
                                <div style="text-align:right;">
                                    <div style="font-size:0.8rem; font-weight:800; color:${progressColor};">📅 ${auc.daysLeft} Hari Lagi</div>
                                    <div style="width:75px; height:4px; background:rgba(255,255,255,0.05); border-radius:2px; margin-top:4px; overflow:hidden;">
                                        <div style="width:${progressPct}%; height:100%; background:${progressColor}; transition: width 0.5s ease;"></div>
                                    </div>
                                </div>
                            </div>
 
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1.25rem; background:rgba(0,0,0,0.15); padding:12px; border-radius:8px;">
                                <div>
                                    <div style="font-size:0.65rem; color:var(--text-dim); text-transform:uppercase;">${terms.aucProfitLabel}</div>
                                    <div style="font-size:1.1rem; font-weight:850; color:#10b981;">+$ ${financeManager.formatCurrency(auc.profit)}/bln</div>
                                    <span style="font-size:0.55rem; color:var(--text-muted); display:block; margin-top:2px;">${terms.aucProfitDesc}</span>
                                </div>
                                <div>
                                    <div style="font-size:0.65rem; color:var(--text-dim); text-transform:uppercase;">${terms.aucValLabel}</div>
                                    <div style="font-size:1.1rem; font-weight:850; color:#f59e0b;">$ ${financeManager.formatCurrency(auc.valuation)}</div>
                                    <span style="font-size:0.55rem; color:var(--text-muted); display:block; margin-top:2px;">${terms.aucValDesc}</span>
                                </div>
                            </div>
 
                            <!-- Bidding Status Board -->
                            <div style="border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color); padding:0.875rem 0; margin-bottom:1.25rem; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <div style="font-size:0.65rem; color:var(--text-dim); text-transform:uppercase;">Penawaran Tertinggi (Highest Bid)</div>
                                    <div style="font-size:1.35rem; font-weight:900; color:#fff;">$ ${financeManager.formatCurrency(auc.highestBid)}</div>
                                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Oleh: <span style="font-weight:700; color:${isLeading ? 'var(--accent-primary)' : '#fff'};">${auc.highestBidder}</span></div>
                                </div>
                                <div>
                                    ${isLeading ? `
                                        <span style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); color:#10b981; font-size:0.65rem; font-weight:900; padding:6px 12px; border-radius:20px; letter-spacing:0.04em;">${terms.aucBidLeading}</span>
                                    ` : `
                                        <span style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:#ef4444; font-size:0.65rem; font-weight:900; padding:6px 12px; border-radius:20px; letter-spacing:0.04em;">${terms.aucBidBehind}</span>
                                    `}
                                </div>
                            </div>
 
                            <!-- Bid Entry Form -->
                            <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-color); padding:1rem; border-radius:8px; display:flex; flex-direction:column; gap:0.75rem;">
                                <div>
                                    <label style="font-size:0.7rem; color:var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Sumber Dana Penawaran</label>
                                    <select id="bid-source-${auc.id}" style="width:100%; padding:8px 10px; border:1px solid var(--border-color); background:#111; color:#fff; font-size:0.8rem; font-weight:700; border-radius:6px; outline:none; cursor:pointer;">
                                        <option value="treasury">🏢 Treasury ($ ${financeManager.formatCurrency(biz.cash)})</option>
                                        <option value="personal">💼 Rekening ($ ${financeManager.formatCurrency(gameState.getBalance())})</option>
                                    </select>
                                </div>
                                <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:0.5rem; align-items:center;">
                                    <div style="position:relative;">
                                        <span style="position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:0.85rem; font-weight:700; color:var(--text-dim);">$</span>
                                        <input type="number" id="bid-amount-${auc.id}" value="${recommendedBid}" min="${auc.highestBid + 1}"
                                            style="width:100%; padding:8px 8px 8px 24px; border:1px solid var(--border-color); background:rgba(0,0,0,0.3); color:#fff; font-size:0.95rem; font-weight:800; border-radius:6px; outline:none;">
                                    </div>
                                    <button class="btn btn-primary btn-sm btn-place-bid" data-id="${auc.id}" style="font-weight:850; font-size:0.75rem; height:36px; padding:0; display:flex; align-items:center; justify-content:center;">${terms.aucBidBtnText}</button>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });
        }

        return `
            <div class="ma-workspace-tab">
                <!-- Sub-tab Navigation (Exactly 2 Pages: Lelang and Akuisisi) -->
                <div class="sub-tab-group" style="display: flex; gap: 0.5rem; background: rgba(255,255,255,0.02); padding: 4px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 1.5rem; width: fit-content;">
                    <button class="sub-tab-btn ${this.activeSubTab === 'lelang' ? 'active' : ''}" data-subtab="lelang" style="padding: 8px 20px; font-size: 0.8rem; border-radius: 8px; font-weight: 700; background: ${this.activeSubTab === 'lelang' ? 'var(--accent-primary)' : 'transparent'}; color: ${this.activeSubTab === 'lelang' ? '#000' : 'var(--text-muted)'}; border: none; cursor: pointer; transition: all 0.2s;">
                        ${terms.subTab1Text}
                    </button>
                    <button class="sub-tab-btn ${this.activeSubTab === 'akuisisi' ? 'active' : ''}" data-subtab="akuisisi" style="padding: 8px 20px; font-size: 0.8rem; border-radius: 8px; font-weight: 700; background: ${this.activeSubTab === 'akuisisi' ? 'var(--accent-primary)' : 'transparent'}; color: ${this.activeSubTab === 'akuisisi' ? '#000' : 'var(--text-muted)'}; border: none; cursor: pointer; transition: all 0.2s;">
                        ${terms.subTab2Text}
                    </button>
                </div>

                <!-- holding Header Summary cards -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
                    <div class="card" style="border-left: 4px solid var(--accent-primary); padding: 1.25rem; background: rgba(255,255,255,0.01);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">
                            ${terms.summaryCard1Title}
                        </div>
                        <div style="font-size: 1.85rem; font-weight: 900; color: #fff;">${displaySubs.length} ${terms.summaryCard1ValText}</div>
                        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">${terms.summaryCard1Desc}</div>
                    </div>
                    <div class="card" style="border-left: 4px solid #f59e0b; padding: 1.25rem; background: rgba(255,255,255,0.01);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">${terms.summaryCard2Title}</div>
                        <div style="font-size: 1.85rem; font-weight: 900; color: #f59e0b;">$ ${formatCompact(totalSubsVal)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">${terms.summaryCard2Desc}</div>
                    </div>
                    <div class="card" style="border-left: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.01);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">${terms.summaryCard3Title}</div>
                        <div style="font-size: 1.85rem; font-weight: 900; color: #10b981;">+$ ${financeManager.formatCurrency(totalSubsProfit)}/bln</div>
                        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">${terms.summaryCard3Desc}</div>
                    </div>
                </div>

                <!-- Dual Columns Workspace Layout -->
                <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 2rem;">
                    <!-- LEFT COLUMN: M&A AUCTIONS BIDDING PIT / MARKETPLACE -->
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                            <h3 style="margin:0; font-size:1.15rem; font-weight:900; display:flex; align-items:center; gap:0.5rem;">
                                ${terms.leftColTitle}
                            </h3>
                        </div>
                        <p class="text-muted" style="font-size:0.8rem; line-height:1.45; margin-bottom:1.5rem;">
                            ${terms.leftColDesc}
                        </p>
                        
                        <div class="auctions-container">
                            ${dealRows}
                        </div>
                    </div>

                    <!-- RIGHT COLUMN: SUBSIDIARIES LEDGER -->
                    <div>
                        <h3 style="margin:0 0 1rem 0; font-size:1.15rem; font-weight:900; display:flex; align-items:center; gap:0.5rem;">
                            <span>${isRetail ? '🤝' : '💼'}</span> ${terms.rightColTitle}
                        </h3>
                        <p class="text-muted" style="font-size:0.8rem; line-height:1.45; margin-bottom:1.5rem;">
                            ${terms.rightColDesc}
                        </p>
                        
                        <div style="display:flex; flex-direction:column; gap:1rem;">
                            ${subRows}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        const isRetail = (biz && (biz.industry === 'retail' || biz.industry === 'fnb'));

        // Bind Sub-tab clicks
        container.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeSubTab = btn.dataset.subtab;
                if (parentPage) parentPage.render();
            });
        });

        // Format all M&A bid inputs with commas as the player types
        container.querySelectorAll('[id^="bid-amount-"]').forEach(amountInput => {
            ui.setupNumericInput(amountInput);
        });

        // Place Bid Listeners
        container.querySelectorAll('.btn-place-bid').forEach(btn => {
            btn.addEventListener('click', () => {
                const aucId = btn.dataset.id;
                const sourceEl = container.querySelector(`#bid-source-${aucId}`);
                const amountEl = container.querySelector(`#bid-amount-${aucId}`);

                if (!sourceEl || !amountEl) return;

                const source = sourceEl.value;
                const amount = amountEl.getNumericValue ? amountEl.getNumericValue() : parseInt(amountEl.value.replace(/,/g, ''), 10);

                if (isNaN(amount) || amount <= 0) {
                    ui.error("Mohon masukkan nominal tawaran yang valid!");
                    return;
                }

                try {
                    businessManager.placeBid(aucId, amount, source);
                    
                    // Trigger instant render update
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });

        // Buyout Direct Listeners
        container.querySelectorAll('.btn-buyout-direct').forEach(btn => {
            btn.addEventListener('click', async () => {
                const dealId = btn.dataset.id;
                const sourceEl = container.querySelector(`#buyout-source-${dealId}`);
                if (!sourceEl) return;

                const source = sourceEl.value;

                const confirmed = await ui.confirm({
                    title: isRetail ? 'Ambil Kontrak Supplier Instan?' : 'Beli Perusahaan Instan?',
                    message: isRetail
                        ? `Apakah Anda yakin ingin membeli kontrak eksklusif supplier premium ini secara instan dengan dana ${source === 'treasury' ? 'Treasury Perusahaan' : 'Rekening Pribadi'} Anda?`
                        : `Apakah Anda yakin ingin mengakuisisi langsung perusahaan ini secara premium dengan dana ${source === 'treasury' ? 'Treasury Perusahaan' : 'Rekening Pribadi'} Anda?`,
                    confirmText: isRetail ? 'Ya, Ambil Kontrak!' : 'Ya, Beli Instan!',
                    confirmClass: 'btn-success'
                });

                if (confirmed) {
                    try {
                        businessManager.buyoutDirect(dealId, source);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Invest in Subsidiary Listeners
        container.querySelectorAll('.btn-invest-sub').forEach(btn => {
            btn.addEventListener('click', async () => {
                const subId = btn.dataset.id;
                const sourceEl = container.querySelector(`#invest-source-${subId}`);
                const qtyEl = container.querySelector(`#invest-qty-${subId}`);
                if (!sourceEl || !qtyEl) return;

                const source = sourceEl.value;
                const amount = parseInt(qtyEl.value);

                const confirmed = await ui.confirm({
                    title: 'Investasi pada Anak Usaha?',
                    message: `Apakah Anda yakin ingin menyuntikkan dana sebesar $ ${amount.toLocaleString()} dari ${source === 'treasury' ? 'Treasury Perusahaan' : 'Rekening Pribadi'} ke anak usaha ini? Ini akan meningkatkan kapasitas profitabilitas dan nilai valuasinya secara signifikan.`,
                    confirmText: 'Suntik Modal'
                });

                if (confirmed) {
                    try {
                        businessManager.investInSubsidiary(subId, amount, source);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // IPO Spinoff Listener
        container.querySelectorAll('.btn-ipo-sub').forEach(btn => {
            btn.addEventListener('click', async () => {
                const subId = btn.dataset.id;
                const name = btn.dataset.name;
                const valStr = btn.dataset.val;
                const val = parseInt(valStr, 10);

                const confirmed = await ui.confirm({
                    title: `Lakukan IPO Spinoff ${name}?`,
                    message: `Apakah Anda yakin ingin meluncurkan IPO Spinoff untuk anak perusahaan/mitra "${name}"? Tindakan ini akan melepas kepemilikan Anda sepenuhnya dan menyuntikkan dana kas tunai sebesar $ ${val.toLocaleString()} (100% dari valuasinya) langsung ke kas Treasury perusahaan utama Anda.`,
                    confirmText: 'Luncurkan IPO Spinoff',
                    confirmClass: 'btn-success'
                });

                if (confirmed) {
                    try {
                        businessManager.ipoSubsidiary(subId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });
    }
};

export default SubsidiaryPanel;
