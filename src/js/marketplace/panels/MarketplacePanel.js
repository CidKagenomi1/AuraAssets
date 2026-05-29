import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../core/GameState.js';
import ui from '../../ui/UIManager.js';
import { CAR_DATABASE } from '../../core/databases/CarDatabase.js';

class MarketplacePanel {
    constructor() {
        this.activeTab = 'upgrades'; // 'upgrades', 'collectibles', 'inventory'
    }

    show(initialTab = 'upgrades') {
        this.activeTab = initialTab;
        this.render();
    }

    render() {
        const balance = gameState.getBalance();
        const marketplace = gameState.get('marketplace') || { inventory: [], purchasedUpgrades: [], rolexMarketPrice: 15000 };
        const rolexPrice = marketplace.rolexMarketPrice || 15000;

        const upgrades = [
            {
                id: 'executive_suit',
                name: 'Executive Suit Setelan Jas',
                icon: '👔',
                cost: 10000,
                desc: 'Jas wol Italia berkualitas tinggi. Memberikan bonus gaji bulanan +15% di pekerjaan tetap Anda secara permanen.',
                benefit: 'Permanen Gaji Karir +15%'
            },
            {
                id: 'erp_software',
                name: 'Cloud ERP System Software',
                icon: '🖥️',
                cost: 50000,
                desc: 'Sistem ERP terpadu untuk efisiensi bisnis. Mengurangi biaya operasional/pengeluaran bulanan bisnis Anda sebesar 10% secara permanen.',
                benefit: 'Pengeluaran Bisnis -10%'
            },
            {
                id: 'gayo_coffee',
                name: 'Kopi Premium Gayo (Booster)',
                icon: '☕',
                cost: 500,
                desc: 'Kopi arabika berkualitas untuk stamina ekstra. Menambah performa kerja kantor (+25% XP harian) instan untuk 3 hari game berikutnya.',
                benefit: '+25% XP Karir Selama 3 Hari'
            },
            {
                id: 'viral_bot_campaign',
                name: 'Viral Bot Campaign (Booster)',
                icon: '🤖',
                cost: 25000,
                desc: 'Kampanye promosi viral berbasis bot AI. Meningkatkan loyalitas pelanggan dan kualitas produk bisnis Anda (+1 Kualitas) secara instan.',
                benefit: '+1 Kualitas Produk Bisnis'
            }
        ];

        const collectibles = [
            {
                id: 'rolex_submariner',
                name: 'Rolex Submariner Oystersteel',
                icon: '⌚',
                cost: rolexPrice,
                desc: 'Jam tangan mewah legendaris. Nilainya fluktuatif setiap bulan dan dapat diperjualbelikan kembali di pasar ini untuk mengambil keuntungan.',
                benefit: 'Aset Kolektif Fluktuatif'
            },
            ...CAR_DATABASE.map(car => ({
                id: car.id,
                name: `${car.brand} ${car.model} (${car.year})`,
                icon: car.icon || '🚗',
                cost: car.price,
                desc: car.desc || `Mobil mewah kelas ${car.brand}.`,
                benefit: `+${car.prestige} Prestige Status`
            })),
            {
                id: 'private_jet',
                name: 'Corporate Private Jet Gulf G700',
                icon: '✈️',
                cost: 2500000,
                desc: 'Gaya hidup konglomerat papan atas. Memberikan bonus pasif prestise dan meningkatkan limit pinjaman bank Anda sebesar 50%.',
                benefit: '+50% Limit Pinjaman Bank'
            }
        ];

        const isPurchased = (id) => (marketplace.purchasedUpgrades || []).includes(id);
        const inventory = marketplace.inventory || [];

        const content = `
            <div class="hybrid-page-container" style="padding: 1.5rem; max-width: 1000px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 1.5rem;">
                
                <!-- Header Wallet Summary -->
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15); border-radius:14px; padding:1.25rem; flex-wrap:wrap; gap:1rem;">
                    <div>
                        <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.1em; font-weight:700;">Saldo Kas Utama Anda</span>
                        <div style="font-size:2rem; font-weight:900; color:#10b981; margin-top:2px;">$ ${financeManager.formatCurrency(balance, true)}</div>
                    </div>
                    <div style="display:flex; gap:0.5rem; background:rgba(0,0,0,0.25); padding:4px; border-radius:30px; border:1px solid var(--border-color);">
                        <button class="tab-btn ${this.activeTab === 'upgrades' ? 'active' : ''}" id="market-tab-upgrades" style="padding: 8px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; cursor:pointer;">⚡ Booster & Upgrades</button>
                        <button class="tab-btn ${this.activeTab === 'collectibles' ? 'active' : ''}" id="market-tab-collectibles" style="padding: 8px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; cursor:pointer;">💎 Status & Koleksi</button>
                        <button class="tab-btn ${this.activeTab === 'inventory' ? 'active' : ''}" id="market-tab-inventory" style="padding: 8px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; cursor:pointer;">🎒 Inventory Saya (${inventory.length})</button>
                    </div>
                </div>

                <!-- Tab 1: Upgrades & Boosters -->
                <div id="market-upgrades-section" style="display: ${this.activeTab === 'upgrades' ? 'grid' : 'none'}; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.25rem;">
                    ${upgrades.map(u => {
                        const owned = isPurchased(u.id);
                        return `
                            <div class="card" style="background: rgba(255,255,255,0.02); border: 1px solid ${owned ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'}; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; border-radius:14px; position:relative; overflow:hidden;">
                                ${owned ? `<div style="position:absolute; top:12px; right:12px; background:rgba(16,185,129,0.12); color:#10b981; font-size:0.65rem; padding:2px 8px; border-radius:6px; font-weight:800; border:1px solid rgba(16,185,129,0.25);">TERPASANG</div>` : ''}
                                <div style="display:flex; gap:1rem; margin-bottom:1rem;">
                                    <span style="font-size:2.2rem; width:54px; height:54px; background:rgba(255,255,255,0.03); border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${u.icon}</span>
                                    <div>
                                        <h4 style="margin:0 0 4px 0; font-size:0.95rem; font-weight:800; color:#fff;">${u.name}</h4>
                                        <span style="font-size:0.7rem; color:#818cf8; font-weight:700;">★ ${u.benefit}</span>
                                    </div>
                                </div>
                                <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.5; margin-bottom:1.25rem;">${u.desc}</p>
                                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.04); padding-top:1rem; margin-top:auto;">
                                    <div>
                                        <span style="font-size:0.65rem; color:var(--text-dim); text-transform:uppercase; display:block;">Harga Pembelian</span>
                                        <span style="font-size:1.15rem; font-weight:900; color:#fff;">$ ${financeManager.formatCurrency(u.cost, true)}</span>
                                    </div>
                                    <button class="btn btn-primary btn-sm btn-buy-market" data-id="${u.id}" data-type="upgrade" data-cost="${u.cost}" ${owned ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                                        ${owned ? 'Miliki' : 'Beli Item'}
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Tab 2: Collectibles & Status -->
                <div id="market-collectibles-section" style="display: ${this.activeTab === 'collectibles' ? 'grid' : 'none'}; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.25rem;">
                    ${collectibles.map(c => {
                        const owned = isPurchased(c.id);
                        const isRolex = c.id === 'rolex_submariner';
                        return `
                            <div class="card" style="background: rgba(255,255,255,0.02); border: 1px solid ${owned ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'}; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; border-radius:14px; position:relative; overflow:hidden;">
                                ${owned ? `<div style="position:absolute; top:12px; right:12px; background:rgba(16,185,129,0.12); color:#10b981; font-size:0.65rem; padding:2px 8px; border-radius:6px; font-weight:800; border:1px solid rgba(16,185,129,0.25);">TERPASANG</div>` : ''}
                                <div style="display:flex; gap:1rem; margin-bottom:1rem;">
                                    <span style="font-size:2.2rem; width:54px; height:54px; background:rgba(255,255,255,0.03); border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${c.icon}</span>
                                    <div>
                                        <h4 style="margin:0 0 4px 0; font-size:0.95rem; font-weight:800; color:#fff;">${c.name}</h4>
                                        <span style="font-size:0.7rem; color:#f59e0b; font-weight:700;">★ ${c.benefit}</span>
                                    </div>
                                </div>
                                <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.5; margin-bottom:1.25rem;">${c.desc}</p>
                                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.04); padding-top:1rem; margin-top:auto;">
                                    <div>
                                        <span style="font-size:0.65rem; color:var(--text-dim); text-transform:uppercase; display:block;">Harga Pembelian</span>
                                        <span style="font-size:1.15rem; font-weight:900; color:#fbbf24;">$ ${financeManager.formatCurrency(c.cost, true)}</span>
                                    </div>
                                    <button class="btn btn-primary btn-sm btn-buy-market" data-id="${c.id}" data-type="${isRolex ? 'tradeable' : 'status'}" data-cost="${c.cost}" ${owned ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                                        ${isRolex ? 'Beli Aset' : (owned ? 'Miliki' : 'Beli Item')}
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Tab 3: My Inventory -->
                <div id="market-inventory-section" style="display: ${this.activeTab === 'inventory' ? 'flex' : 'none'}; flex-direction: column; gap: 0.75rem;">
                    ${inventory.length === 0 ? `
                        <div class="card" style="text-align:center; padding:3.5rem 2rem; color:var(--text-muted); border-radius:14px; border:1px solid var(--border-color);">
                            <span style="font-size:3.5rem; display:block; margin-bottom:1rem;">🎒</span>
                            <div style="font-size:1rem; font-weight:800; color:white; margin-bottom:4px;">Inventory Anda Masih Kosong</div>
                            <div style="font-size:0.8rem; opacity:0.6;">Beli barang koleksi atau upgrades di marketplace terlebih dahulu.</div>
                        </div>
                    ` : inventory.map((item, index) => {
                        const isRolex = item.id === 'rolex_submariner';
                        const currentVal = isRolex ? rolexPrice : item.buyPrice;
                        const profit = currentVal - item.buyPrice;
                        const profitPct = ((profit / item.buyPrice) * 100).toFixed(2);
                        return `
                            <div class="card" style="background:rgba(255,255,255,0.015); border:1px solid var(--border-color); border-radius:12px; padding:1rem 1.25rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
                                <div style="display:flex; align-items:center; gap:1rem; min-width:250px;">
                                    <span style="font-size:1.8rem; width:44px; height:44px; background:rgba(255,255,255,0.03); border-radius:10px; display:flex; align-items:center; justify-content:center;">${isRolex ? '⌚' : '💎'}</span>
                                    <div>
                                        <h4 style="margin:0 0 2px 0; font-size:0.9rem; font-weight:800; color:white;">${item.name}</h4>
                                        <span style="font-size:0.72rem; color:var(--text-muted);">Beli: $ ${financeManager.formatCurrency(item.buyPrice, true)}</span>
                                    </div>
                                </div>
                                <div style="text-align:right;">
                                    <span style="font-size:0.65rem; color:var(--text-dim); text-transform:uppercase; display:block;">Nilai Saat Ini</span>
                                    <span style="font-size:1rem; font-weight:800; color:#fff;">$ ${financeManager.formatCurrency(currentVal, true)}</span>
                                    ${isRolex ? `
                                        <span style="font-size:0.72rem; color:${profit >= 0 ? '#10b981' : '#ef4444'}; font-weight:700; display:block; margin-top:2px;">
                                            ${profit >= 0 ? '+' : ''}${profitPct}% ($ ${financeManager.formatCurrency(profit, true)})
                                        </span>
                                    ` : ''}
                                </div>
                                ${isRolex ? `
                                    <button class="btn btn-secondary btn-sm btn-sell-market" data-index="${index}" data-sellprice="${rolexPrice}" style="background:linear-gradient(135deg, #10b981, #059669); border:none; color:black; font-weight:900;">
                                        JUAL KE PASAR
                                    </button>
                                ` : `
                                    <span style="font-size:0.75rem; color:#10b981; font-weight:800; padding:4px 10px; background:rgba(16,185,129,0.08); border-radius:6px; border:1px solid rgba(16,185,129,0.2);">KOLEKTIBEL PRIBADI</span>
                                `}
                            </div>
                        `;
                    }).join('')}
                </div>

            </div>
        `;

        import('../../ui/ViewManager.js').then(m => {
            m.default.showDynamicView('Corporate Marketplace', 'Pusat belanja lisensi korporasi, boosters, dan aset status sosial', content);
            this.bindEvents();
        });
    }

    bindEvents() {
        // Tab binding
        document.getElementById('market-tab-upgrades')?.addEventListener('click', () => {
            this.activeTab = 'upgrades';
            this.render();
        });
        document.getElementById('market-tab-collectibles')?.addEventListener('click', () => {
            this.activeTab = 'collectibles';
            this.render();
        });
        document.getElementById('market-tab-inventory')?.addEventListener('click', () => {
            this.activeTab = 'inventory';
            this.render();
        });

        // Buy buttons binding
        document.querySelectorAll('.btn-buy-market').forEach(btn => {
            btn.addEventListener('click', async () => {
                const itemId = btn.dataset.id;
                const itemType = btn.dataset.type;
                const cost = parseInt(btn.dataset.cost);

                const currentBalance = gameState.getBalance();
                if (currentBalance < cost) {
                    ui.error('Saldo Anda tidak mencukupi untuk melakukan transaksi ini!');
                    return;
                }

                const confirmed = await ui.confirm({
                    title: 'Konfirmasi Pembelian',
                    message: `Apakah Anda yakin ingin membeli item ini seharga $ ${financeManager.formatCurrency(cost)}?`,
                    confirmText: 'Ya, Beli Sekarang',
                    confirmClass: 'btn-primary'
                });

                if (confirmed) {
                    try {
                        const marketplace = gameState.get('marketplace') || { inventory: [], purchasedUpgrades: [], rolexMarketPrice: 15000 };
                        
                        // Deduct balance and record transaction
                        gameState.addBalance(-cost, 'Belanja', `Beli item: ${itemId}`);

                        try {
                            import('../../ui/AuraSound.js').then(m => m.default.playPurchase());
                        } catch (e) {}

                        if (itemType === 'upgrade' || itemType === 'status') {
                            // Register permanent upgrade / status car
                            marketplace.purchasedUpgrades.push(itemId);
                            
                            // Check if this was a car from CAR_DATABASE
                            const car = CAR_DATABASE.find(c => c.id === itemId);
                            if (car) {
                                ui.success(`Mobil mewah ${car.brand} ${car.model} berhasil dibeli! Gengsi Anda meningkat +${car.prestige}.`);
                            } else if (itemId === 'executive_suit') {
                                ui.success('Setelan jas terpasang! Bonus karir aktif.');
                            } else if (itemId === 'erp_software') {
                                ui.success('Sistem Cloud ERP berhasil terpasang di jaringan bisnis Anda!');
                            } else if (itemId === 'private_jet') {
                                ui.success('Jet Pribadi terbeli! Gengsi korporasi melonjak tinggi.');
                            }
                        } else if (itemType === 'tradeable') {
                            // Rolex
                            marketplace.inventory.push({
                                id: itemId,
                                name: itemId === 'rolex_submariner' ? 'Rolex Submariner Oystersteel' : 'Koleksi Barang',
                                buyPrice: cost,
                                date: Date.now()
                            });
                            ui.success('Aset jam tangan Rolex berhasil ditambahkan ke inventory Anda!');
                        }

                        // Apply boosters instantly
                        if (itemId === 'gayo_coffee') {
                            gameState.set('work.performance', Math.min(100, (gameState.get('work.performance') || 100) + 15));
                            ui.success('Kopi Gayo diminum! Performa kerja Anda langsung meningkat instan.');
                        } else if (itemId === 'viral_bot_campaign') {
                            const biz = gameState.get('business');
                            if (biz && biz.active) {
                                gameState.set('business.productQuality', Math.min(10, (biz.productQuality || 1) + 1));
                                ui.success('Kampanye Bot AI sukses! Kualitas produk bisnis Anda meningkat +1.');
                            } else {
                                ui.warning('Anda belum mendirikan bisnis, booster disimpan.');
                            }
                        }

                        gameState.set('marketplace', marketplace);
                        this.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Sell buttons binding
        document.querySelectorAll('.btn-sell-market').forEach(btn => {
            btn.addEventListener('click', async () => {
                const index = parseInt(btn.dataset.index);
                const sellPrice = parseInt(btn.dataset.sellprice);

                const marketplace = gameState.get('marketplace') || { inventory: [], purchasedUpgrades: [], rolexMarketPrice: 15000 };
                const item = marketplace.inventory[index];
                if (!item) return;

                const confirmed = await ui.confirm({
                    title: 'Konfirmasi Penjualan',
                    message: `Jual "${item.name}" Anda kembali ke pasar seharga $ ${financeManager.formatCurrency(sellPrice)}?`,
                    confirmText: 'Ya, Jual',
                    confirmClass: 'btn-primary'
                });

                if (confirmed) {
                    try {
                        // Credit balance and record transaction
                        gameState.addBalance(sellPrice, 'Penjualan', `Jual item: ${item.id}`);

                        // Remove from inventory
                        marketplace.inventory.splice(index, 1);
                        gameState.set('marketplace', marketplace);
                        
                        ui.success(`Berhasil menjual "${item.name}" seharga $ ${financeManager.formatCurrency(sellPrice)}!`);
                        this.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });
    }
}

export default new MarketplacePanel();
