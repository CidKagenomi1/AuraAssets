/**
 * BusinessPage.js - Premium Hybrid Corporate Management and IPO Dashboard (Modular v2)
 * Features real-time ERP tools, treasury injection/withdrawal, holding company subsidiaries, and public stock exchange listings.
 */

import gameState from '../core/GameState.js';
import ui from '../ui/UIManager.js';
import businessManager, { INDUSTRY_INITIATIVES } from './BusinessManager.js';
import financeManager from '../finance/FinanceManager.js';
import stockMarket from '../trading/StockMarket.js';
import { slideInFromRight, pulseElement } from '../ui/Animations.js';
import SubsidiaryPanel from './panels/SubsidiaryPanel.js';
import IPOPanel from './panels/IPOPanel.js';
import TechOpsPanel from './panels/ops/TechOpsPanel.js';
import FinanceOpsPanel from './panels/ops/FinanceOpsPanel.js';
import EnergyOpsPanel from './panels/ops/EnergyOpsPanel.js';
import AerospaceOpsPanel from './panels/ops/AerospaceOpsPanel.js';
import AutomotiveOpsPanel from './panels/ops/AutomotiveOpsPanel.js';
import RetailOpsPanel from './panels/ops/RetailOpsPanel.js';
import BoardPanel from './panels/BoardPanel.js';
import SetupWizardPanel from './panels/SetupWizardPanel.js';
import HealthcareOpsPanel from './panels/ops/HealthcareOpsPanel.js';
import InfrastructureOpsPanel from './panels/ops/InfrastructureOpsPanel.js';
import { renderSVGChart, bindChartHoverEvents } from './panels/BusinessChart.js';
import { renderOpsTab, bindOpsTabEvents } from './panels/BusinessOpsTab.js';


const formatCompact = (num) => {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return new Intl.NumberFormat('en-US').format(Math.round(num));
};

class BusinessPage {
    constructor() {
        this.isOpen = false;
        this.container = null;
        this.activeTab = 'overview'; // 'overview', 'ops', 'subsidiaries', 'ipo', 'board'
        this.ipoSimulating = false;
        this.ipoTickerTmp = '';
        this.ipoPercentTmp = 25;
        this.ipoBoardTmp = 37;
        this.chartType = 'valuation';
        this.onMonthPass = null;
        this.onStateChange = null;
        // Guard: prevent tick-driven re-renders from wiping DOM during user interaction
        this._userInteracting = false;
        this._interactionTimer = null;
        this._pendingRender = false;
    }

    /**
     * Mark that the user is currently interacting with the page.
     * While this flag is true, tick-driven full re-renders are suppressed.
     * Resets automatically 600ms after the last interaction.
     */
    _markInteracting() {
        this._userInteracting = true;
        if (this._interactionTimer) clearTimeout(this._interactionTimer);
        this._interactionTimer = setTimeout(() => {
            this._userInteracting = false;
            // If a render was deferred while user was interacting, run it now
            if (this._pendingRender && this.isOpen) {
                this._pendingRender = false;
                this.render();
            }
        }, 600);
    }

    /**
     * Attach interaction guards to all interactive elements in the container.
     * Call this after every render() to keep guards active.
     */
    _attachInteractionGuards() {
        if (!this.container) return;
        const handler = () => this._markInteracting();
        // Listen on focus (inputs, selects, textareas) and touchstart/mousedown on buttons
        this.container.querySelectorAll('input, select, textarea').forEach(el => {
            el.addEventListener('focus', handler, { passive: true });
            el.addEventListener('input', handler, { passive: true });
        });
        this.container.querySelectorAll('button').forEach(el => {
            el.addEventListener('mousedown', handler, { passive: true });
            el.addEventListener('touchstart', handler, { passive: true });
        });
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;

        const viewContainer = document.querySelector('.view-container');
        if (!viewContainer) return;

        this.toggleHomeVisibility(false);

        const container = document.createElement('div');
        container.id = 'business-page';
        container.className = 'view-panel active';
        container.style.cssText = `
            position: absolute;
            inset: 0;
            background: var(--bg-root);
            z-index: 100;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            padding-bottom: 80px;
        `;
        
        viewContainer.appendChild(container);
        this.container = container;

        this.render();
        slideInFromRight(container);

        // Real-time Event Listeners for Date and State updates (Pulses valuation and updates)
        this.onMonthPass = () => {
            if (!this.isOpen) return;
            if (this._userInteracting) {
                // Defer the full render until after user finishes interaction
                this._pendingRender = true;
                // Still do a lightweight in-place valuation update if possible
                this._updateValuationInPlace();
                return;
            }
            this.render();
            setTimeout(() => {
                const valCard = document.getElementById('biz-valuation-card');
                if (valCard) {
                    pulseElement(valCard);
                }
            }, 100);
        };

        this.onStateChange = () => {
            if (!this.isOpen) return;
            this._updateValuationInPlace();
        };

        this.onDayPass = () => {
            if (!this.isOpen) return;
            if (this.activeTab === 'subsidiaries') {
                if (this._userInteracting) {
                    this._pendingRender = true;
                    return;
                }
                this.render();
            }
        };

        this.onStocksUpdate = (stocks) => {
            if (!this.isOpen) return;
            if (this.activeTab === 'ipo') {
                const biz = gameState.get('business');
                if (biz && biz.ipo && biz.ipo.active) {
                    const symbol = biz.ipo.ticker;
                    const stock = stocks[symbol];
                    if (stock) {
                        IPOPanel.updateLiveStockData(this.container, biz, stock);
                    }
                }
            }
        };

        gameState.on('monthPass', this.onMonthPass);
        gameState.on('change', this.onStateChange);
        gameState.on('dayPass', this.onDayPass);
        gameState.on('stocksUpdate', this.onStocksUpdate);
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        if (this.onMonthPass) {
            gameState.off('monthPass', this.onMonthPass);
        }
        if (this.onStateChange) {
            gameState.off('change', this.onStateChange);
        }
        if (this.onDayPass) {
            gameState.off('dayPass', this.onDayPass);
        }
        if (this.onStocksUpdate) {
            gameState.off('stocksUpdate', this.onStocksUpdate);
        }

        if (this.container) {
            this.container.remove();
            this.container = null;
        }

        this.toggleHomeVisibility(true);

        // Reset ViewManager's currentView to home to keep everything in sync
        import('../ui/ViewManager.js').then(m => {
            if (m.default.currentView === 'business') {
                m.default.currentView = 'home';
                // Also update the active sidebar/bottom-nav links
                document.querySelectorAll('.nav-btn, .sidebar-link').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.view === 'home');
                });
            }
        });
    }

    toggleHomeVisibility(visible) {
        const homeSections = ['view-home', 'balance-card', 'market-pulse-widget', 'earn-panel', 'company-dashboard', '.quick-actions', 'footer-dashboard-grid'];
        homeSections.forEach(sel => {
            try {
                const el = document.querySelector(sel) || document.getElementById(sel);
                if (el) el.style.display = visible ? '' : 'none';
            } catch (e) {}
        });
        
        const homeView = document.getElementById('view-home');
        if (homeView) homeView.style.display = visible ? '' : 'none';
    }

    /**
     * In-place valuation update — does NOT touch the DOM structure,
     * only updates the text of the valuation card to avoid destroying user interaction.
     */
    _updateValuationInPlace() {
        if (!this.container) return;
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;
        const valCard = document.getElementById('biz-valuation-card');
        if (!valCard) return;
        const isPublic = biz.ipo && biz.ipo.active;
        let currentValuation = biz.valuation || 0;
        if (isPublic) {
            const stockData = stockMarket.getStock(biz.ipo.ticker);
            if (stockData) {
                currentValuation = stockData.price * biz.ipo.totalShares;
            }
        }
        const valueEl = valCard.querySelector('.val-text-value');
        if (valueEl) {
            valueEl.textContent = `$ ${formatCompact(currentValuation)}`;
        }
    }

    render() {
        if (!this.container) return;

        const biz = gameState.get('business');

        if (!biz || !biz.active) {
            SetupWizardPanel.render(this.container, this);
        } else if (this.ipoSimulating) {
            this.container.innerHTML = IPOPanel.renderIPOSimulator(biz, this.ipoTickerTmp, this.ipoPercentTmp, this);
            IPOPanel.simulateIPOMatchingProcess(biz, this.ipoTickerTmp, this.ipoPercentTmp, this);
        } else {
            this.renderDashboard(biz);
        }
        // Re-attach interaction guards after every render
        this._attachInteractionGuards();
    }

    // ==========================================
    // DASHBOARD & TAB HANDLING
    // ==========================================

    renderDashboard(biz) {
        const isPublic = biz.ipo && biz.ipo.active;
        const brandColor = biz.type === 'startup' ? '#818cf8' : 'var(--accent-primary)';
        
        this.container.innerHTML = `
            <div class="biz-page-header">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <button class="btn-back" id="biz-back" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">←</button>
                    <div>
                        <h2 style="margin:0; font-size: 1.45rem; font-weight: 900; color: ${brandColor};">${biz.name}</h2>
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.25rem;">
                            <span style="font-size: 0.65rem; background: ${isPublic ? '#10b981' : brandColor}; color: ${isPublic ? '#fff' : '#000'}; padding: 2px 8px; border-radius: 4px; font-weight: 800; letter-spacing: 0.05em;">
                                ${isPublic ? `PUBLIC (NYSE: ${biz.ipo.ticker})` : biz.type.toUpperCase()}
                            </span>
                            <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">${biz.industry}</span>
                        </div>
                    </div>
                </div>
                <div class="biz-tab-group">
                    <button class="tab-btn ${this.activeTab === 'overview' ? 'active' : ''}" data-tab="overview" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; transition: all 0.2s;">Dashboard</button>
                    ${biz.industry === 'tech' ? `
                    <button class="tab-btn ${this.activeTab === 'tech' ? 'active' : ''}" data-tab="tech" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; transition: all 0.2s;">🖥️ Lab R&D & Server</button>
                    ` : biz.industry === 'finance' ? `
                    <button class="tab-btn ${this.activeTab === 'finance_ops' ? 'active' : ''}" data-tab="finance_ops" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; transition: all 0.2s;">🏦 Operasional Bank & Holding</button>
                    ` : biz.industry === 'energy' ? `
                    <button class="tab-btn ${this.activeTab === 'energy_ops' ? 'active' : ''}" data-tab="energy_ops" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; transition: all 0.2s;">⚡ Eksplorasi & Kilang</button>
                    ` : biz.industry === 'manufacturing' ? `
                    <button class="tab-btn ${this.activeTab === 'manufacturing_ops' ? 'active' : ''}" data-tab="manufacturing_ops" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; transition: all 0.2s;">✈️ Manajerial</button>
                    ` : biz.industry === 'automotive' ? `
                    <button class="tab-btn ${this.activeTab === 'automotive_ops' ? 'active' : ''}" data-tab="automotive_ops" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; transition: all 0.2s;">🏎️ Divisi Otomotif</button>
                    ` : biz.industry === 'retail' ? `
                    <button class="tab-btn ${this.activeTab === 'retail_ops' ? 'active' : ''}" data-tab="retail_ops" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; transition: all 0.2s;">🛒 Divisi Ritel</button>
                    ` : biz.industry === 'healthcare' ? `
                    <button class="tab-btn ${this.activeTab === 'healthcare_ops' ? 'active' : ''}" data-tab="healthcare_ops" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; transition: all 0.2s;">🏥 Manajemen RS & Farmasi</button>
                    ` : biz.industry === 'infrastructure' ? `
                    <button class="tab-btn ${this.activeTab === 'infrastructure_ops' ? 'active' : ''}" data-tab="infrastructure_ops" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; transition: all 0.2s;">🏗️ Divisi Properti & Lahan</button>
                    ` : `
                    <button class="tab-btn ${this.activeTab === 'ops' ? 'active' : ''}" data-tab="ops" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; transition: all 0.2s;">Manajemen</button>
                    `}
                    <button class="tab-btn ${this.activeTab === 'subsidiaries' ? 'active' : ''}" data-tab="subsidiaries" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; transition: all 0.2s;">${biz.industry === 'retail' ? '🤝 Supplier' : (biz.industry === 'infrastructure' ? '🤝 Fendor' : '💼 Anak Bisnis')}</button>
                    <button class="tab-btn ${this.activeTab === 'ipo' ? 'active' : ''}" data-tab="ipo" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; transition: all 0.2s;">${isPublic ? 'Bursa & Deviden' : 'Go Public (IPO)'}</button>
                    ${isPublic ? `
                    <button class="tab-btn ${this.activeTab === 'board' ? 'active' : ''}" data-tab="board" style="padding: 6px 16px; font-size: 0.8rem; border-radius: 20px; font-weight: 700; transition: all 0.2s;">🤝 Investor & Direksi</button>
                    ` : ''}
                </div>
            </div>

            <div style="padding: 1.5rem; max-width: 1200px; margin: 0 auto; width: 100%;">
                ${this.renderActiveTabContent(biz)}
            </div>
        `;
        
        // Add tab CSS styles in page context safely
        const style = document.createElement('style');
        style.innerHTML = `
            .tab-btn.active {
                background: ${brandColor} !important;
                color: ${biz.type === 'startup' ? '#fff' : '#000'} !important;
            }
        `;
        this.container.appendChild(style);

        this.bindDashboardEvents(biz);
    }

    renderActiveTabContent(biz) {
        switch (this.activeTab) {
            case 'overview':
                return this.renderOverviewTab(biz);
            case 'ops':
                return this.renderOpsTab(biz);
            case 'tech':
                return TechOpsPanel.render(biz);
            case 'finance_ops':
                return FinanceOpsPanel.render(biz);
            case 'energy_ops':
                return EnergyOpsPanel.render(biz);
            case 'manufacturing_ops':
                return AerospaceOpsPanel.render(biz);
            case 'automotive_ops':
                return AutomotiveOpsPanel.render(biz);
            case 'retail_ops':
                return RetailOpsPanel.render(biz);
            case 'healthcare_ops':
                return HealthcareOpsPanel.render(biz);
            case 'infrastructure_ops':
                return InfrastructureOpsPanel.render(biz);
            case 'subsidiaries':
                return SubsidiaryPanel.render(biz, this);
            case 'ipo':
                return IPOPanel.render(biz);
            case 'board':
                return BoardPanel.render(biz);
            default:
                return this.renderOverviewTab(biz);
        }
    }

    // ==========================================
    // TAB 1: OVERVIEW & TREASURY + DETAILED CASH FLOW STATEMENT
    // ==========================================

    renderOverviewTab(biz) {
        const isPublic = biz.ipo && biz.ipo.active;
        const brandColor = biz.type === 'startup' ? '#818cf8' : 'var(--accent-primary)';
        
        // Retrieve operations configurations
        const ops = biz.operations || { supplier: 'local', production: 'manual' };
        
        // Calculate supply cost
        let supplierCost = 500;
        if (ops.supplier === 'national') supplierCost = 2500;
        else if (ops.supplier === 'global') supplierCost = 9000;

        // Calculate assembly cost
        let prodCost = 1500;
        if (ops.production === 'batch') prodCost = 6000;
        else if (ops.production === 'jit') prodCost = 20000;

        // Calculate wages & campaigns
        const employees = biz.employees || 1;
        let campaignCost = 0;
        if (biz.marketingCampaign === 'local') campaignCost = 1000;
        else if (biz.marketingCampaign === 'social') campaignCost = 5000;
        else if (biz.marketingCampaign === 'global') campaignCost = 25000;

        let executiveCost = 0;
        if (biz.managers?.ops) executiveCost += 3000;
        if (biz.managers?.marketing) executiveCost += 3000;
        if (biz.managers?.rd) executiveCost += 3000;

        const rd = biz.rdLevel || 1;
        const rdCostDiscount = Math.min(rd * 0.02, 0.25);
        const opsDiscount = biz.managers?.ops ? 0.05 : 0.0;

        let opExpense = employees * 1000 + campaignCost + supplierCost + prodCost + executiveCost;
        if (biz.type === 'startup') {
            opExpense += (businessManager.businessTypes.startup.burnRate * (1 + (biz.level * 0.2)) * (1 - rdCostDiscount - opsDiscount));
        } else {
            const expRatio = Math.max(0.35, 0.60 - rdCostDiscount - opsDiscount);
            opExpense += (biz.revenue * expRatio);
        }

        // Add subsidiaries profit
        let subsidiariesProfit = 0;
        let subsidiariesValuation = 0;
        (biz.subsidiaries || []).forEach(s => {
            subsidiariesProfit += s.monthlyProfit || 0;
            subsidiariesValuation += s.valuation || 0;
        });

        const netProfit = biz.revenue + subsidiariesProfit - opExpense;

        let displayRevenue = (biz.revenue || 0);
        let displaySubsProfit = subsidiariesProfit;
        let displayTotalInflow = displayRevenue + displaySubsProfit;

        let displayWages = employees * 1000;
        let displaySupplierCost = supplierCost;
        let displayProductionCost = prodCost;
        let displayCampaignCost = campaignCost;
        let displayExecutiveCost = executiveCost;
        let displayStartupBurn = biz.type === 'startup' ? (businessManager.businessTypes.startup.burnRate * (1 + (biz.level * 0.2)) * (1 - rdCostDiscount - opsDiscount)) : 0;
        let displayUMKMRatioCost = biz.type === 'umkm' ? (biz.revenue * Math.max(0.35, 0.60 - rdCostDiscount - opsDiscount)) : 0;
        let displayTotalExpense = opExpense;
        let displayNetProfit = netProfit;
        let industryCostRows = '';

        if (biz.lastCashFlow) {
            const lcf = biz.lastCashFlow;
            displayRevenue = lcf.revenue || 0;
            displaySubsProfit = lcf.subsidiariesProfit || 0;
            displayTotalInflow = displayRevenue + displaySubsProfit;

            displayWages = lcf.employeesWages || 0;
            displaySupplierCost = lcf.supplierCost || 0;
            displayProductionCost = lcf.productionCost || 0;
            displayCampaignCost = lcf.campaignCost || 0;
            displayExecutiveCost = lcf.executiveCost || 0;
            displayStartupBurn = lcf.startupBurn || 0;
            displayUMKMRatioCost = lcf.umkmRatioCost || 0;
            displayTotalExpense = lcf.totalExpense || 0;
            displayNetProfit = lcf.netProfit || 0;

            if (lcf.industryDetails && lcf.industryDetails.breakdown) {
                lcf.industryDetails.breakdown.forEach(item => {
                    if (item.val > 0) {
                        industryCostRows += `
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;">
                                <span style="color: var(--text-muted);">${item.label}</span>
                                <span style="font-weight: 800; color: #ef4444;">-$ ${financeManager.formatCurrency(item.val)}</span>
                            </div>
                        `;
                    }
                });
            }
        } else {
            // Apply industry-specific estimates for month 1 fallback
            if (biz.industry === 'healthcare') {
                const hc = biz.healthcare || { doctorCount: 2, nurseCount: 5, facilities: [] };
                const doctorWage = hc.doctorWage || 6000;
                const nurseWage = hc.nurseWage || 2500;
                const totalWages = (hc.doctorCount * doctorWage) + (hc.nurseCount * nurseWage);
                let totalMaintenance = 0;
                (hc.facilities || []).forEach(f => { totalMaintenance += f.maintenance; });
                
                industryCostRows += `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;">
                        <span style="color: var(--text-muted);">Gaji Tenaga Medis (Dokter & Perawat)</span>
                        <span style="font-weight: 800; color: #ef4444;">-$ ${financeManager.formatCurrency(totalWages)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;">
                        <span style="color: var(--text-muted);">Biaya Pemeliharaan RS & Klinik</span>
                        <span style="font-weight: 800; color: #ef4444;">-$ ${financeManager.formatCurrency(totalMaintenance)}</span>
                    </div>
                `;
                displayTotalExpense += totalWages + totalMaintenance;
                displayNetProfit = displayTotalInflow - displayTotalExpense;
            } else if (biz.industry === 'infrastructure') {
                const infra = biz.infrastructure || { developments: [] };
                let totalMaint = 0;
                (infra.developments || []).forEach(d => { totalMaint += d.maintenance || 0; });
                
                industryCostRows += `
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;">
                        <span style="color: var(--text-muted);">Biaya Pemeliharaan Aset Properti</span>
                        <span style="font-weight: 800; color: #ef4444;">-$ ${financeManager.formatCurrency(totalMaint)}</span>
                    </div>
                `;
                displayTotalExpense += totalMaint;
                displayNetProfit = displayTotalInflow - displayTotalExpense;
            }
        }

        const netProfitColor = displayNetProfit >= 0 ? '#10b981' : '#ef4444';

        let currentValuation = biz.valuation || 0;
        if (isPublic) {
            const stockData = stockMarket.getStock(biz.ipo.ticker);
            if (stockData) {
                currentValuation = stockData.price * biz.ipo.totalShares;
            }
        }

        return `
            <div class="corporate-overview">
                <!-- ERP Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                    <div class="card" style="border-top: 4px solid ${brandColor}; padding: 1.5rem; background: rgba(255,255,255,0.01);">
                        <div class="text-muted" style="font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 800; letter-spacing: 0.05em;">Kas Treasury Perusahaan</div>
                        <div style="font-size: 2.1rem; font-weight: 900; color: #fff;">$ ${financeManager.formatCurrency(biz.cash || 0)}</div>
                        <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--text-dim);">Liquid cash reserve</div>
                    </div>
                    
                    <div id="biz-valuation-card" class="card" style="border-top: 4px solid #f59e0b; padding: 1.5rem; background: rgba(255,255,255,0.01); transition: all 0.3s ease;">
                        <div class="text-muted" style="font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 800; letter-spacing: 0.05em;">Valuasi Perusahaan (Enterprise Value)</div>
                        <div class="val-text-value" style="font-size: 2.1rem; font-weight: 900; color: #f59e0b;">$ ${formatCompact(currentValuation)}</div>
                        <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--text-dim);">${isPublic ? 'Market Cap on Listed Exchange' : 'Based on asset + annual run-rate'}</div>
                    </div>
                    
                    <div class="card" style="border-top: 4px solid ${netProfitColor}; padding: 1.5rem; background: rgba(255,255,255,0.01);">
                        <div class="text-muted" style="font-size: 0.75rem; text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 800; letter-spacing: 0.05em;">Arus Kas Bulanan Bersih</div>
                        <div style="font-size: 2.1rem; font-weight: 900; color: ${netProfitColor};">${displayNetProfit >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(displayNetProfit)}</div>
                        <div style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--text-dim);">Revenue + anak bisnis - operasional</div>
                    </div>
                </div>

                <!-- Historical Chart -->
                ${this.renderSVGChart(biz)}

                <!-- Detailed Monthly Cashflow Ledger Statement (Highly Requested) -->
                <div class="card" style="padding: 1.75rem; margin-bottom: 2rem; border: 1px solid var(--border-color); background: linear-gradient(180deg, rgba(255,255,255,0.01) 0%, transparent 100%);">
                    <h3 style="margin-top:0; font-size: 1.2rem; font-weight: 900; margin-bottom: 0.5rem; display:flex; align-items:center; gap:0.5rem; color: var(--accent-primary);">
                        <span>🧾</span> Laporan Arus Kas Bulanan (Monthly Cash Flow Statement)
                    </h3>
                    <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.5rem;">
                        Tinjauan transparan alokasi keuangan perusahaan Anda. Ketahui asal muasal laba masuk dan rincian pengeluaran logistik untuk menjaga kestabilan neraca likuiditas treasury.
                    </p>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
                        <!-- Inflow Ledger -->
                        <div>
                            <h4 style="margin: 0 0 1rem 0; font-size: 0.9rem; font-weight: 800; color: #10b981; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(16, 185, 129, 0.15); padding-bottom: 6px; display: flex; justify-content: space-between;">
                                <span>🟢 Arus Kas Masuk (Inflows)</span>
                                <span>TOTAL</span>
                            </h4>
                            <div style="display: flex; flex-direction: column; gap: 0.8rem; font-size: 0.85rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;">
                                    <span style="color: var(--text-muted);">Pendapatan Operasional Utama</span>
                                    <span style="font-weight: 800; color: #10b981;">+$ ${financeManager.formatCurrency(displayRevenue)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;">
                                    <span style="color: var(--text-muted);">Laba Bersih Anak Perusahaan (Holding)</span>
                                    <span style="font-weight: 800; color: #10b981;">+$ ${financeManager.formatCurrency(displaySubsProfit)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 900; font-size: 0.95rem; margin-top: 0.5rem; color: #fff;">
                                    <span>Subtotal Pemasukan</span>
                                    <span style="color: #10b981;">+$ ${financeManager.formatCurrency(displayTotalInflow)}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Outflow Ledger -->
                        <div>
                            <h4 style="margin: 0 0 1rem 0; font-size: 0.9rem; font-weight: 800; color: #ef4444; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(239, 68, 68, 0.15); padding-bottom: 6px; display: flex; justify-content: space-between;">
                                <span>🔴 Arus Kas Keluar (Outflows)</span>
                                <span>TOTAL</span>
                            </h4>
                            <div style="display: flex; flex-direction: column; gap: 0.8rem; font-size: 0.85rem;">
                                ${displayWages > 0 ? `
                                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;">
                                    <span style="color: var(--text-muted);">Beban Gaji Karyawan (${employees} Orang)</span>
                                    <span style="font-weight: 800; color: #ef4444;">-$ ${financeManager.formatCurrency(displayWages)}</span>
                                </div>
                                ` : ''}
                                ${displaySupplierCost > 0 ? `
                                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;">
                                    <span style="color: var(--text-muted);">Biaya Rantai Pasok (${ops.supplier.toUpperCase()})</span>
                                    <span style="font-weight: 800; color: #ef4444;">-$ ${financeManager.formatCurrency(displaySupplierCost)}</span>
                                </div>
                                ` : ''}
                                ${displayProductionCost > 0 ? `
                                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;">
                                    <span style="color: var(--text-muted);">Beban Metode Perakitan (${ops.production.toUpperCase()})</span>
                                    <span style="font-weight: 800; color: #ef4444;">-$ ${financeManager.formatCurrency(displayProductionCost)}</span>
                                </div>
                                ` : ''}
                                ${displayCampaignCost > 0 ? `
                                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;">
                                    <span style="color: var(--text-muted);">Biaya Kampanye Iklan & Humas</span>
                                    <span style="font-weight: 800; color: #ef4444;">-$ ${financeManager.formatCurrency(displayCampaignCost)}</span>
                                </div>
                                ` : ''}
                                ${displayExecutiveCost > 0 ? `
                                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;">
                                    <span style="color: var(--text-muted);">Tunjangan Eksekutif (COO/CMO/CTO)</span>
                                    <span style="font-weight: 800; color: #ef4444;">-$ ${financeManager.formatCurrency(displayExecutiveCost)}</span>
                                </div>
                                ` : ''}
                                ${displayStartupBurn > 0 ? `
                                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;">
                                    <span style="color: var(--text-muted);">Beban Burn Rate & Teknologi Startup</span>
                                    <span style="font-weight: 800; color: #ef4444;">-$ ${financeManager.formatCurrency(displayStartupBurn)}</span>
                                </div>
                                ` : ''}
                                ${displayUMKMRatioCost > 0 ? `
                                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 6px;">
                                    <span style="color: var(--text-muted);">Rasio Operasional & Bahan Baku UMKM</span>
                                    <span style="font-weight: 800; color: #ef4444;">-$ ${financeManager.formatCurrency(displayUMKMRatioCost)}</span>
                                </div>
                                ` : ''}
                                ${industryCostRows}
                                <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 900; font-size: 0.95rem; margin-top: 0.5rem; color: #fff;">
                                    <span>Subtotal Pengeluaran</span>
                                    <span style="color: #ef4444;">-$ ${financeManager.formatCurrency(displayTotalExpense)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1.2fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                    <!-- Treasury Actions -->
                    <div class="card" style="padding: 1.5rem;">
                        <h3 style="margin-top:0; font-size: 1.15rem; font-weight: 900; margin-bottom: 1.2rem; display:flex; align-items:center; gap:0.5rem;">
                            <span>🏦</span> Manajemen Kas Treasury (Suntik & Tarik Dana)
                        </h3>
                        <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.5rem;">
                            Sebagai direktur utama/founder, Anda dapat mentransfer saldo pribadi Anda ke dalam kas treasury perusahaan untuk mendanai riset R&D atau kampanye iklan. Anda juga dapat menarik sisa kas surplus perusahaan ke rekening bank pribadi (khusus kepemilikan privat).
                        </p>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; background: rgba(255,255,255,0.02); padding: 1.2rem; border-radius: 12px; border: 1px solid var(--border-color);">
                            <div>
                                <label style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; display:block; margin-bottom: 6px;">Alokasi Nominal Dana ($)</label>
                                <input type="number" id="treasury-amount-input" placeholder="Masukkan jumlah dana..." 
                                    style="width: 100%; padding: 10px 14px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.3); color: #fff; font-size: 1rem; font-weight: 700; border-radius: 8px; outline: none;">
                            </div>
                            <div style="display: flex; flex-direction: column; justify-content: flex-end; gap: 0.5rem;">
                                <button class="btn btn-primary btn-sm" id="btn-inject-cash" style="width: 100%; font-weight: 800; font-size: 0.85rem;">🏦 Suntik Modal (Inject Cash)</button>
                                ${isPublic ? `
                                    <button class="btn btn-secondary btn-sm" disabled style="width: 100%; font-weight: 800; font-size: 0.85rem; opacity:0.5; cursor:not-allowed;">🚫 Penarikan Dikunci (IPO)</button>
                                ` : `
                                    <button class="btn btn-secondary btn-sm" id="btn-withdraw-cash" style="width: 100%; font-weight: 800; font-size: 0.85rem;">💸 Tarik Kas Pribadi (Withdraw)</button>
                                `}
                            </div>
                        </div>
                    </div>

                    <!-- Company Health Card -->
                    <div class="card" style="padding: 1.5rem; display:flex; flex-direction:column; justify-content:space-between;">
                        <div>
                            <h3 style="margin-top:0; font-size: 1.15rem; font-weight: 900; margin-bottom: 1.2rem;">📊 Struktur Kepemilikan</h3>
                            <div style="display:flex; flex-direction:column; gap:0.75rem;">
                                <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
                                    <span>Tipe Entitas</span>
                                    <span style="font-weight: 800; color: ${brandColor};">${biz.type.toUpperCase()}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
                                    <span>Faktor Kualitas Produk</span>
                                    <span style="font-weight: 800; color: #fbbf24;">★ ${biz.productQuality || 1}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
                                    <span>R&D Level</span>
                                    <span style="font-weight: 800; color: #3b82f6;">Level ${biz.rdLevel || 1}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
                                    <span>Struktur Pemegang Saham</span>
                                    <span style="font-weight: 800;">
                                        ${isPublic ? `${100 - biz.ipo.publicSharePercent}% Founder / ${biz.ipo.publicSharePercent}% Publik` : '100% Privat (Anda)'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-danger btn-sm" id="btn-exit-corporate" style="width: 100%; font-weight: 800; margin-top: 1.5rem;">🚪 Likuidasi & Exit Bisnis</button>
                    </div>
                </div>
            </div>
        `;
    }

    // ==========================================
    // TAB 2: OPERATIONS, R&D AND MANAGERS
    // Delegated to panels/business/BusinessOpsTab.js
    // ==========================================

    renderOpsTab(biz) {
        return renderOpsTab(biz, financeManager, businessManager, INDUSTRY_INITIATIVES);
    }


    // ==========================================
    // SVG PERFORMANCE CHART
    // Delegated to panels/business/BusinessChart.js
    // ==========================================

    renderSVGChart(biz) {
        return renderSVGChart(biz, this.chartType, financeManager, businessManager);
    }



    // ==========================================
    // INTERACTIVE ERP BIND EVENTS
    // ==========================================

    bindDashboardEvents(biz) {
        this.container.querySelector('#biz-back').addEventListener('click', () => this.close());

        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeTab = btn.dataset.tab;
                this.render();
            });
        });

        // Chart type toggles
        this.container.querySelectorAll('.btn-chart-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                this.chartType = btn.dataset.type;
                this.render();
            });
        });

        // Hover tooltip - Delegated to BusinessChart.js
        bindChartHoverEvents(this.container, financeManager);


        // Overview Events
        const input = document.getElementById('treasury-amount-input');
        if (input) {
            ui.setupNumericInput(input);
        }

        const btnInject = document.getElementById('btn-inject-cash');
        if (btnInject) {
            btnInject.addEventListener('click', () => {
                const amt = input.getNumericValue ? input.getNumericValue() : parseFloat(input.value.replace(/,/g, ''));
                if (isNaN(amt) || amt <= 0) {
                    ui.error('Harap isi nominal modal yang valid!');
                    return;
                }
                try {
                    businessManager.injectTreasury(amt);
                    input.value = '';
                    this.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        const btnWithdraw = document.getElementById('btn-withdraw-cash');
        if (btnWithdraw) {
            btnWithdraw.addEventListener('click', () => {
                const amt = input.getNumericValue ? input.getNumericValue() : parseFloat(input.value.replace(/,/g, ''));
                if (isNaN(amt) || amt <= 0) {
                    ui.error('Harap isi nominal penarikan kas yang valid!');
                    return;
                }
                try {
                    businessManager.withdrawTreasury(amt);
                    input.value = '';
                    this.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Likuidasi Exit Corporate
        const btnExit = document.getElementById('btn-exit-corporate');
        if (btnExit) {
            btnExit.addEventListener('click', async () => {
                const isPublic = biz.ipo?.active;
                const confirmed = await ui.confirm({
                    title: isPublic ? 'Likuidasi Emiten Publik?' : 'Exit & Likuidasi Perusahaan?',
                    message: isPublic 
                        ? 'Apakah Anda yakin ingin melikuidasi emiten Anda? Seluruh sisa saham publik akan di-delisting secara paksa dan Anda akan ditarik pajaknya.'
                        : 'Apakah Anda yakin ingin menjual/melikuidasi perusahaan? Seluruh kas dan aset perusahaan akan dialihkan ke saldo tunai pribadi Anda dikurangi pajak 15%.',
                    confirmText: 'Ya, Likuidasi!',
                    confirmClass: 'btn-danger'
                });
                if (confirmed) {
                    try {
                        businessManager.sellCompany();
                        this.close();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }

        // Operations & ERP - Delegated to BusinessOpsTab.js
        if (this.activeTab === 'ops') {
            bindOpsTabEvents(this.container, biz, businessManager, financeManager, ui, () => this.render());
        }



        // Delegate Subsidiary Panel Events
        if (this.activeTab === 'subsidiaries') {
            SubsidiaryPanel.bindEvents(biz, this.container, this);
        }

        // Delegate IPO Panel Events
        if (this.activeTab === 'ipo') {
            IPOPanel.bindEvents(biz, this.container, this);
        }

        // Delegate Tech Panel Events
        if (this.activeTab === 'tech') {
            TechOpsPanel.bindEvents(biz, this.container, this);
        }

        // Delegate Finance Panel Events
        if (this.activeTab === 'finance_ops') {
            FinanceOpsPanel.bindEvents(biz, this.container, this);
        }

        // Delegate Energy Panel Events
        if (this.activeTab === 'energy_ops') {
            EnergyOpsPanel.bindEvents(biz, this.container, this);
        }

        // Delegate Aerospace/Manufacturing Panel Events
        if (this.activeTab === 'manufacturing_ops') {
            AerospaceOpsPanel.bindEvents(biz, this.container, this);
        }
        
        // Delegate Automotive Panel Events
        if (this.activeTab === 'automotive_ops') {
            AutomotiveOpsPanel.bindEvents(biz, this.container, this);
        }

        // Delegate Retail Panel Events
        if (this.activeTab === 'retail_ops') {
            RetailOpsPanel.bindEvents(biz, this.container, this);
        }

        // Delegate Healthcare Panel Events
        if (this.activeTab === 'healthcare_ops') {
            HealthcareOpsPanel.bindEvents(biz, this.container, this);
        }

        // Delegate Infrastructure Panel Events
        if (this.activeTab === 'infrastructure_ops') {
            InfrastructureOpsPanel.bindEvents(biz, this.container, this);
        }

        // Delegate Board Panel Events
        if (this.activeTab === 'board') {
            BoardPanel.bindEvents(biz, this.container, this);
        }
    }
}

export const businessPage = new BusinessPage();
export default businessPage;
