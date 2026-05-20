/**
 * PropertyPanel.js - Premium Real Estate Dashboard
 * Hybrid Full-Screen View for global property investment
 */

import propertyManager from '../../property/PropertyManager.js';
import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../game/GameState.js';
import ui from '../UIManager.js';
import { PROPERTY_TIERS } from '../../game/PropertyDatabase.js';

class PropertyPanel {
    constructor() {
        this.activeFilter = 'ALL';
    }

    show() {
        const ownedProperties = propertyManager.getOwnedProperties();
        const propertyTypes = propertyManager.getPropertyTypes();
        const totalRent = propertyManager.getTotalMonthlyRent();
        const totalValue = propertyManager.getTotalPropertyValue();
        const balance = gameState.getBalance();

        // Calculate total prestige
        const totalPrestige = ownedProperties.reduce((sum, p) => {
            const type = propertyManager.getPropertyType(p.typeId);
            return sum + (type?.prestige || 0);
        }, 0);

        // Filter properties
        const filteredTypes = this.activeFilter === 'ALL' 
            ? propertyTypes 
            : propertyTypes.filter(p => p.tier.toUpperCase() === this.activeFilter);

        const content = `
            <div class="hybrid-page-container" style="padding: 1.5rem; max-width: 100%; margin: 0 auto; width: 100%;">
                
                <!-- Header / Summary -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
                    <div class="card" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), transparent); border-left: 4px solid #6366f1;">
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Unit Dimiliki</div>
                        <div style="font-size: 1.75rem; font-weight: 800; color: white;">${ownedProperties.length} <span style="font-size: 1rem; color: var(--text-muted); font-weight: 400;">Units</span></div>
                    </div>
                    <div class="card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), transparent); border-left: 4px solid var(--accent-primary);">
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Passive Income / Bln</div>
                        <div style="font-size: 1.75rem; font-weight: 800; color: var(--accent-primary);">+$ ${financeManager.formatCurrency(totalRent, true)}</div>
                    </div>
                    <div class="card" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), transparent); border-left: 4px solid #f59e0b;">
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Prestige Score</div>
                        <div style="font-size: 1.75rem; font-weight: 800; color: #f59e0b;">${totalPrestige.toLocaleString()} <span style="font-size: 1.2rem;">⭐</span></div>
                    </div>
                </div>

                <div class="property-layout-grid">
                    
                    <!-- Left: Marketplace -->
                    <div style="width: 100%;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                            <h3 style="font-weight: 800; font-size: 1.25rem; display: flex; align-items: center; gap: 0.75rem;">
                                <span>🏪</span> Global Real Estate Market
                            </h3>
                            <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 5px;">
                                <button class="filter-btn ${this.activeFilter === 'ALL' ? 'active' : ''}" data-filter="ALL">Semua</button>
                                ${Object.values(PROPERTY_TIERS).map(tier => `
                                    <button class="filter-btn ${this.activeFilter === tier.id.toUpperCase() ? 'active' : ''}" data-filter="${tier.id.toUpperCase()}">${tier.label}</button>
                                `).join('')}
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                            ${filteredTypes.map(prop => {
                                const canBuy = balance >= prop.price;
                                const tierInfo = PROPERTY_TIERS[prop.tier.toUpperCase()];
                                return `
                                    <div class="property-card-premium ${!canBuy ? 'locked' : ''}">
                                        <div class="prop-tier-badge" style="background: ${tierInfo.color}">${tierInfo.label}</div>
                                        <div class="prop-icon-large">${prop.icon}</div>
                                        <div class="prop-details">
                                            <div class="prop-location">📍 ${prop.location}</div>
                                            <div class="prop-name">${prop.name}</div>
                                            <div class="prop-desc">${prop.desc}</div>
                                            <div class="prop-stats">
                                                <div class="prop-stat">
                                                    <span class="label">Sewa</span>
                                                    <span class="value">+$ ${financeManager.formatCurrency(prop.monthlyRent, true)}/bln</span>
                                                </div>
                                                <div class="prop-stat">
                                                    <span class="label">Prestige</span>
                                                    <span class="value" style="color: #f59e0b;">+${prop.prestige} ⭐</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="prop-footer">
                                            <div class="prop-price">$ ${financeManager.formatCurrency(prop.price, true)}</div>
                                            <button class="btn ${canBuy ? 'btn-primary' : 'btn-secondary'} btn-sm btn-buy-prop" data-buy="${prop.id}" ${!canBuy ? 'disabled' : ''}>
                                                ${canBuy ? 'INVESTASI' : 'DANA KURANG'}
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                </div>
            </div>

            <style>
                .property-layout-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                    align-items: start;
                    width: 100%;
                }
                @media (max-width: 1024px) {
                    .property-layout-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .filter-btn {
                    padding: 0.4rem 1rem;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid var(--border-color);
                    color: var(--text-muted);
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.2s;
                }
                .filter-btn.active {
                    background: var(--accent-primary);
                    color: white;
                    border-color: var(--accent-primary);
                }
                .property-card-premium {
                    background: var(--bg-surface);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 1.25rem;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: default;
                    overflow: hidden;
                }
                .property-card-premium:hover {
                    transform: translateY(-5px);
                    border-color: var(--accent-primary);
                    box-shadow: 0 10px 30px -10px rgba(16, 185, 129, 0.2);
                }
                .property-card-premium.locked {
                    opacity: 0.75;
                }
                .prop-tier-badge {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    font-size: 0.6rem;
                    font-weight: 800;
                    padding: 2px 8px;
                    border-radius: 4px;
                    color: white;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .prop-icon-large {
                    font-size: 2.5rem;
                    margin-top: 0.5rem;
                }
                .prop-location {
                    font-size: 0.65rem;
                    color: var(--accent-primary);
                    font-weight: 700;
                    text-transform: uppercase;
                    margin-bottom: 0.25rem;
                }
                .prop-name {
                    font-weight: 800;
                    font-size: 1.1rem;
                    color: white;
                    margin-bottom: 0.5rem;
                }
                .prop-desc {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    height: 2.8em;
                }
                .prop-stats {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    background: rgba(0,0,0,0.2);
                    padding: 0.75rem;
                    border-radius: 8px;
                }
                .prop-stat {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.75rem;
                }
                .prop-stat .label { color: var(--text-muted); }
                .prop-stat .value { font-weight: 700; color: white; }

                .prop-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: auto;
                    padding-top: 1rem;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }
                .prop-price {
                    font-size: 1.1rem;
                    font-weight: 800;
                    color: white;
                }
                .btn-sell-prop:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
                }
            </style>
        `;

        import('../ViewManager.js').then(m => {
            const viewManager = m.default;
            viewManager.showDynamicView('Global Real Estate', 'Portofolio properti dunia & pendapatan pasif', content);
            this.bindEvents();
        });
    }

    bindEvents() {
        const container = document.getElementById('dynamic-view-content');
        if (!container) return;

        // Filter buttons
        container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeFilter = btn.dataset.filter;
                this.show();
            });
        });

        // Buy buttons
        container.querySelectorAll('[data-buy]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const typeId = btn.dataset.buy;
                this.handleBuy(typeId);
            });
        });

        // Sell buttons
        container.querySelectorAll('[data-sell]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const propertyId = parseInt(btn.dataset.sell);
                this.handleSell(propertyId);
            });
        });
    }

    async handleBuy(typeId) {
        const propertyType = propertyManager.getPropertyType(typeId);
        const balance = gameState.getBalance();

        if (balance < propertyType.price) {
            ui.warning(`Saldo tidak cukup. Anda butuh $ ${financeManager.formatCurrency(propertyType.price)}.`);
            return;
        }

        const confirmed = await ui.confirm({
            title: `Investasi Properti?`,
            message: `Beli ${propertyType.name} di ${propertyType.location} seharga $ ${financeManager.formatCurrency(propertyType.price)}?`,
            icon: propertyType.icon,
            confirmText: 'Beli Properti',
            confirmClass: 'btn-primary'
        });

        if (confirmed) {
            try {
                propertyManager.buyProperty(typeId);
                ui.success(`Berhasil membeli ${propertyType.name}! Pendapatan pasif Anda meningkat.`);
                this.show(); // Refresh
            } catch (e) {
                ui.error(e.message);
            }
        }
    }

    async handleSell(propertyId) {
        const properties = propertyManager.getOwnedProperties();
        const property = properties.find(p => p.id === propertyId);

        if (!property) return;

        const sellPrice = Math.floor(property.price * 0.9);

        const confirmed = await ui.confirm({
            title: `Jual Properti?`,
            message: `Anda akan menjual ${property.name} seharga $ ${financeManager.formatCurrency(sellPrice)} (90% nilai beli). Lanjutkan?`,
            icon: property.icon,
            confirmText: 'Jual Sekarang',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            try {
                propertyManager.sellProperty(propertyId);
                ui.success(`Properti berhasil terjual! Dana telah masuk ke saldo.`);
                this.show(); // Refresh
            } catch (e) {
                ui.error(e.message);
            }
        }
    }
}

export const propertyPanel = new PropertyPanel();
export default propertyPanel;
