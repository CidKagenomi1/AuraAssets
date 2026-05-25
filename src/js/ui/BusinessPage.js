/**
 * BusinessPage.js - Premium Hybrid Corporate Management and IPO Dashboard (Modular v2)
 * Features real-time ERP tools, treasury injection/withdrawal, holding company subsidiaries, and public stock exchange listings.
 */

import gameState from '../game/GameState.js';
import ui from './UIManager.js';
import businessManager, { INDUSTRY_INITIATIVES } from '../business/BusinessManager.js';
import financeManager from '../finance/FinanceManager.js';
import stockMarket from '../finance/StockMarket.js';
import { slideInFromRight, pulseElement } from './Animations.js';
import SubsidiaryPanel from './panels/SubsidiaryPanel.js';
import IPOPanel from './panels/IPOPanel.js';
import TechOpsPanel from './panels/TechOpsPanel.js';
import FinanceOpsPanel from './panels/FinanceOpsPanel.js';
import EnergyOpsPanel from './panels/EnergyOpsPanel.js';
import AerospaceOpsPanel from './panels/AerospaceOpsPanel.js';
import AutomotiveOpsPanel from './panels/AutomotiveOpsPanel.js';
import RetailOpsPanel from './panels/RetailOpsPanel.js';
import BoardPanel from './panels/BoardPanel.js';
import SetupWizardPanel from './panels/SetupWizardPanel.js';
import HealthcareOpsPanel from './panels/HealthcareOpsPanel.js';
import InfrastructureOpsPanel from './panels/InfrastructureOpsPanel.js';

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
            const valCard = document.getElementById('biz-valuation-card');
            if (valCard) {
                const biz = gameState.get('business');
                if (biz && biz.active) {
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
            }
        };

        this.onDayPass = () => {
            if (!this.isOpen) return;
            if (this.activeTab === 'subsidiaries') {
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
        import('./ViewManager.js').then(m => {
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
    }

    // ==========================================
    // DASHBOARD & TAB HANDLING
    // ==========================================

    renderDashboard(biz) {
        const isPublic = biz.ipo && biz.ipo.active;
        const brandColor = biz.type === 'startup' ? '#818cf8' : 'var(--accent-primary)';
        
        this.container.innerHTML = `
            <div class="panel-header" style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; position: sticky; top:0; background: var(--bg-root); z-index: 10;">
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
                <div class="tab-group" style="display: flex; gap: 0.4rem; background: rgba(255,255,255,0.03); padding: 4px; border-radius: 30px; border: 1px solid var(--border-color);">
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
    // ==========================================

    renderOpsTab(biz) {
        const rd = biz.rdLevel || 1;
        const rdCost = 12000 * rd;
        const managers = biz.managers || { ops: false, marketing: false, rd: false };
        const ops = biz.operations || { supplier: 'local', production: 'manual' };

        const industryKey = biz.industry;
        const initiativesList = INDUSTRY_INITIATIVES[industryKey] || [];
        const activeInitiatives = biz.initiatives || {};

        let initiativeCardsHtml = '';
        initiativesList.forEach(init => {
            const isActive = activeInitiatives[init.key] || false;
            const buttonHtml = isActive 
                ? `<span style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); color: #10b981; padding: 8px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; width: 100%;">✓ AKTIF / LAUNCHED</span>`
                : `<button class="btn btn-primary btn-sm btn-execute-initiative" data-key="${init.key}" style="font-weight: 800; font-size: 0.75rem; padding: 8px 12px; width: 100%; box-shadow: 0 4px 10px rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.3);">Luncurkan ($ ${financeManager.formatCurrency(init.cost)})</button>`;

            initiativeCardsHtml += `
                <div class="card" style="padding: 1.25rem; background: rgba(255, 255, 255, 0.015); border: 1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s; position: relative; overflow: hidden; ${isActive ? 'box-shadow: 0 4px 15px rgba(16, 185, 129, 0.04);' : ''}">
                    ${isActive ? `<div style="position: absolute; top: 0; right: 0; width: 50px; height: 50px; background: linear-gradient(135deg, transparent 50%, rgba(16, 185, 129, 0.15) 50%); display: flex; align-items: flex-end; justify-content: flex-end; padding: 4px;"></div>` : ''}
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                            <span style="font-size: 1.85rem;">${init.icon}</span>
                            <div>
                                <h4 style="margin: 0; font-size: 0.95rem; font-weight: 850; color: #fff;">${init.name}</h4>
                                <span style="font-size: 0.65rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;">INISIATIF STRATEGIS</span>
                            </div>
                        </div>
                        <p class="text-muted" style="font-size: 0.75rem; line-height: 1.4; margin-bottom: 1rem; min-height: 48px;">
                            ${init.description}
                        </p>
                    </div>
                    <div>
                        <div style="background: rgba(0, 0, 0, 0.2); padding: 8px 10px; border-radius: 6px; font-size: 0.7rem; color: #fff; margin-bottom: 1rem; border-left: 2px solid ${isActive ? '#10b981' : '#fbbf24'};">
                            <div style="font-size: 0.55rem; color: var(--text-dim); text-transform: uppercase; font-weight: 800; margin-bottom: 2px;">Dampak Efek</div>
                            <span style="font-weight: 700;">${init.benefit}</span>
                        </div>
                        <div style="display: flex; justify-content: center; width: 100%;">
                            ${buttonHtml}
                        </div>
                    </div>
                </div>
            `;
        });

        return `
            <div class="ops-tab-wrapper">
                <!-- ERP Production & Supply Chain Optimizer Card -->
                <div class="card" style="padding: 1.75rem; margin-bottom: 1.5rem; background: radial-gradient(circle at top left, rgba(16, 185, 129, 0.06) 0%, rgba(0,0,0,0) 80%); border: 1px solid var(--border-color);">
                    <h3 style="margin-top:0; font-size: 1.25rem; font-weight: 900; margin-bottom: 0.5rem; color: var(--accent-primary); display:flex; align-items:center; gap:0.5rem;">
                        <span>⚙️</span> ERP Production & Supply Chain Optimizer
                    </h3>
                    <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.5rem;">
                        Kelola integrasi operasional manufaktur dan logistik Anda. Keseimbangan parameter antara penyuplai bahan baku (Supply Chain) dan metode perakitan menentukan efisiensi siklus, tingkat cacat produk, dan margin pendapatan utama perusahaan Anda.
                    </p>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 0.5rem;">
                        <!-- Left: Configuration Selectors -->
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <!-- Supplier Sourcing -->
                            <div>
                                <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; display: block;">🚚 Rantai Pasok (Bahan Baku)</label>
                                <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); cursor: pointer; font-size: 0.8rem;">
                                        <span><input type="radio" name="ops-supplier" value="local" ${ops.supplier === 'local' ? 'checked' : ''} style="margin-right: 8px;"> 🏡 Pemasok Lokal (Murah)</span>
                                        <span style="color: var(--text-dim); font-size: 0.75rem;">$500/bln | Kualitas 50% | 14 Hari</span>
                                    </label>
                                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); cursor: pointer; font-size: 0.8rem;">
                                        <span><input type="radio" name="ops-supplier" value="national" ${ops.supplier === 'national' ? 'checked' : ''} style="margin-right: 8px;"> 🇮🇩 Pemasok Nasional (Premium)</span>
                                        <span style="color: var(--text-dim); font-size: 0.75rem;">$2.5k/bln | Kualitas 85% | 7 Hari</span>
                                    </label>
                                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); cursor: pointer; font-size: 0.8rem;">
                                        <span><input type="radio" name="ops-supplier" value="global" ${ops.supplier === 'global' ? 'checked' : ''} style="margin-right: 8px;"> 🌍 Pemasok Global (Impor)</span>
                                        <span style="color: var(--text-dim); font-size: 0.75rem;">$9k/bln | Kualitas 98% | 3 Hari</span>
                                    </label>
                                </div>
                            </div>

                            <!-- Production Methodology -->
                            <div>
                                <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; display: block;">🛠️ Metode Perakitan / Produksi</label>
                                <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); cursor: pointer; font-size: 0.8rem;">
                                        <span><input type="radio" name="ops-production" value="manual" ${ops.production === 'manual' ? 'checked' : ''} style="margin-right: 8px;"> 🤝 Manual (Seni Kerajinan Tangan)</span>
                                        <span style="color: var(--text-dim); font-size: 0.75rem;">$1.5k/bln | Kec. 1x | Cacat 2%</span>
                                    </label>
                                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); cursor: pointer; font-size: 0.8rem;">
                                        <span><input type="radio" name="ops-production" value="batch" ${ops.production === 'batch' ? 'checked' : ''} style="margin-right: 8px;"> 🏭 Perakitan Batch (Lini Produksi)</span>
                                        <span style="color: var(--text-dim); font-size: 0.75rem;">$6k/bln | Kec. 2x | Cacat 6%</span>
                                    </label>
                                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); cursor: pointer; font-size: 0.8rem;">
                                        <span><input type="radio" name="ops-production" value="jit" ${ops.production === 'jit' ? 'checked' : ''} style="margin-right: 8px;"> ⚡ Otomasi Just-in-Time (JIT)</span>
                                        <span style="color: var(--text-dim); font-size: 0.75rem;">$20k/bln | Kec. 4.5x | Cacat 12%</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Live ERP Analytics Board -->
                        <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <h4 style="margin: 0 0 1rem 0; font-size: 0.9rem; font-weight: 800; color: #fff; display: flex; align-items: center; justify-content: space-between;">
                                    <span>📊 Live Data Analytics</span>
                                    <span id="oes-rating" style="font-size: 0.75rem; background: rgba(16, 185, 129, 0.15); color: var(--accent-primary); border: 1px solid rgba(16, 185, 129, 0.25); padding: 3px 8px; border-radius: 4px;">CALIBRATING</span>
                                </h4>

                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-bottom: 1rem;">
                                    <!-- OES -->
                                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 0.6rem; border-radius: var(--radius-sm); text-align: center;">
                                        <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.2rem;">OES Score</div>
                                        <div id="live-oes" style="font-size: 1.3rem; font-weight: 900; color: var(--accent-primary);">--%</div>
                                    </div>
                                    <!-- Defect Rate -->
                                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 0.6rem; border-radius: var(--radius-sm); text-align: center;">
                                        <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.2rem;">Tingkat Cacat</div>
                                        <div id="live-defect" style="font-size: 1.3rem; font-weight: 900; color: #ef4444;">--%</div>
                                    </div>
                                    <!-- Cycle Time -->
                                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 0.6rem; border-radius: var(--radius-sm); text-align: center;">
                                        <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.2rem;">Waktu Siklus</div>
                                        <div id="live-lead" style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-top: 0.15rem;">-- Hari</div>
                                    </div>
                                    <!-- Profit Multiplier -->
                                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 0.6rem; border-radius: var(--radius-sm); text-align: center;">
                                        <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.2rem;">Dampak Omzet</div>
                                        <div id="live-multiplier" style="font-size: 1.1rem; font-weight: 800; color: #fbbf24; margin-top: 0.15rem;">x 1.0</div>
                                    </div>
                                </div>

                                <!-- Live Recommendation Box -->
                                <div id="live-advice" style="font-size: 0.75rem; line-height: 1.5; color: var(--text-muted); background: rgba(255,255,255,0.03); border-radius: 6px; padding: 8px 12px; border-left: 3px solid #6b7280; min-height: 52px; display: flex; align-items: center;">
                                    Sedang menganalisis konfigurasi operasional...
                                </div>
                            </div>

                            <button class="btn btn-primary btn-sm" id="btn-apply-operations" style="width: 100%; font-weight: 900; letter-spacing: 0.05em; margin-top: 1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">
                                ⚙️ OPTIMALKAN SISTEM OPERASIONAL
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Strategic Industry Initiatives Card -->
                <div class="card" style="padding: 1.75rem; margin-bottom: 1.5rem; background: radial-gradient(circle at top right, rgba(251, 191, 36, 0.03) 0%, rgba(0,0,0,0) 80%); border: 1px solid var(--border-color);">
                    <h3 style="margin-top:0; font-size: 1.25rem; font-weight: 900; margin-bottom: 0.5rem; color: #fbbf24; display:flex; align-items:center; gap:0.5rem;">
                        <span>🎯</span> Sistem Menejerial Sektor (${businessManager.industries[biz.industry]?.name || biz.industry})
                    </h3>
                    <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.5rem;">
                        Kembangkan inisiatif strategis menejerial yang dikustomisasi khusus untuk industri bisnis Anda saat ini. Luncurkan program dengan menggunakan dana kas treasury perusahaan Anda demi mendongkrak omzet bulanan, meningkatkan efisiensi biaya, atau melipatgandakan valuasi korporasi secara permanen.
                    </p>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem;">
                        ${initiativeCardsHtml}
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
                    <!-- Technology & R&D -->
                    <div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <h3 style="margin-top:0; font-size: 1.15rem; font-weight: 900; margin-bottom: 0.75rem; color: #3b82f6; display:flex; align-items:center; gap:0.5rem;">
                                <span>💻</span> Divisi R&D & Rekayasa Teknologi
                            </h3>
                            <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.2rem;">
                                Tingkatkan R&D secara berkala. R&D memperkuat mutu produk, meningkatkan traksi kepuasan pelanggan, serta memotong efisiensi pengeluaran operasional perusahaan s.d 25%.
                            </p>
                            <div style="background: rgba(59, 130, 246, 0.06); padding: 1rem; border-radius: 10px; border: 1px solid rgba(59, 130, 246, 0.15); margin-bottom: 1.2rem;">
                                <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.4rem;">
                                    <span>Tingkat R&D Saat Ini</span>
                                    <span style="font-weight:800; color:#3b82f6;">Level ${rd}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
                                    <span>Efisiensi Biaya Operasional</span>
                                    <span style="font-weight:800; color:#10b981;">-${Math.min(rd * 2, 25)}%</span>
                                </div>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-sm" id="btn-upgrade-rd" style="width:100%; border: 1px solid rgba(59, 130, 246, 0.3); font-weight:800;">
                            🚀 Tingkatkan Teknologi (Biaya: $ ${financeManager.formatCurrency(rdCost)})
                        </button>
                    </div>

                    <!-- Marketing Campaigns -->
                    <div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <h3 style="margin-top:0; font-size: 1.15rem; font-weight: 900; margin-bottom: 0.75rem; color: #fbbf24; display:flex; align-items:center; gap:0.5rem;">
                                <span>📢</span> Kampanye Pemasaran & Publikasi
                            </h3>
                            <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.2rem;">
                                Pilih model kampanye pemasaran aktif untuk memompa pertumbuhan traksi omzet pendapatan bulanan Anda secara agresif.
                            </p>
                            
                            <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom: 1.2rem;">
                                <label style="display:flex; align-items:center; justify-content:space-between; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.1); cursor:pointer; font-size:0.85rem;">
                                    <span><input type="radio" name="marketing-radio" value="none" ${biz.marketingCampaign === 'none' ? 'checked' : ''} style="margin-right:8px;"> Tanpa Pemasaran Aktif</span>
                                    <span style="font-weight:800; color:var(--text-muted);">$ 0/bln</span>
                                </label>
                                <label style="display:flex; align-items:center; justify-content:space-between; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.1); cursor:pointer; font-size:0.85rem;">
                                    <span><input type="radio" name="marketing-radio" value="local" ${biz.marketingCampaign === 'local' ? 'checked' : ''} style="margin-right:8px;"> 📰 Iklan Media Lokal (+25% Growth)</span>
                                    <span style="font-weight:800; color:#fbbf24;">$ 1,000/bln</span>
                                </label>
                                <label style="display:flex; align-items:center; justify-content:space-between; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.1); cursor:pointer; font-size:0.85rem;">
                                    <span><input type="radio" name="marketing-radio" value="social" ${biz.marketingCampaign === 'social' ? 'checked' : ''} style="margin-right:8px;"> 📱 Media Sosial & Key Opinion Leader (+60% Growth)</span>
                                    <span style="font-weight:800; color:#fbbf24;">$ 5,000/bln</span>
                                </label>
                                <label style="display:flex; align-items:center; justify-content:space-between; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.1); cursor:pointer; font-size:0.85rem;">
                                    <span><input type="radio" name="marketing-radio" value="global" ${biz.marketingCampaign === 'global' ? 'checked' : ''} style="margin-right:8px;"> 🏆 TV Sponsor & Papan Iklan Global (+150% Growth)</span>
                                    <span style="font-weight:800; color:#fbbf24;">$ 25,000/bln</span>
                                </label>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm" id="btn-apply-marketing" style="width:100%; font-weight:800;">Simpan Kampanye Pemasaran</button>
                    </div>

                    <!-- Executive Managers Hires -->
                    <div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; grid-column: span 2;">
                        <div>
                            <h3 style="margin-top:0; font-size: 1.15rem; font-weight: 900; margin-bottom: 0.75rem; color: #10b981; display:flex; align-items:center; gap:0.5rem;">
                                <span>👔</span> Jajaran Direksi Eksekutif & Manajemen Kunci (COO, CMO, CTO)
                            </h3>
                            <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.2rem;">
                                Rekrut manajer eksekutif profesional untuk mengotomatisasi efisiensi operasional. Jajaran eksekutif memakan biaya sign-on fee rekrutmen awal sebesar <strong>$ 15,000</strong> dan gaji bulanan <strong>$ 3,000</strong> per orang.
                            </p>
                            
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                                <!-- COO -->
                                <div style="background: rgba(255,255,255,0.02); padding: 1.2rem; border-radius: 12px; border: 1px solid var(--border-color); text-align:center;">
                                    <div style="font-size:2.2rem; margin-bottom:0.5rem;">👨‍💼</div>
                                    <h4 style="margin:0; font-size:1rem; font-weight:800; color:#fff;">COO (Chief Operating Officer)</h4>
                                    <p class="text-muted" style="font-size:0.75rem; margin: 8px 0 12px 0; min-height: 36px;">Meningkatkan efisiensi kerja karyawan s.d -15% biaya & +1 mutu produk secara permanen.</p>
                                    ${managers.ops ? `
                                        <span style="background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2); padding:6px 16px; border-radius:30px; font-size:0.75rem; font-weight:800;">AKTIF MENJABAT</span>
                                    ` : `
                                        <button class="btn btn-secondary btn-sm btn-hire" data-role="ops" style="padding:6px 16px; font-size:0.75rem; font-weight:800; width:100%;">REKRUT EKSEKUTIF</button>
                                    `}
                                </div>
                                <!-- CMO -->
                                <div style="background: rgba(255,255,255,0.02); padding: 1.2rem; border-radius: 12px; border: 1px solid var(--border-color); text-align:center;">
                                    <div style="font-size:2.2rem; margin-bottom:0.5rem;">👩‍💼</div>
                                    <h4 style="margin:0; font-size:1rem; font-weight:800; color:#fff;">CMO (Chief Marketing Officer)</h4>
                                    <p class="text-muted" style="font-size:0.75rem; margin: 8px 0 12px 0; min-height: 36px;">Melipatgandakan seluruh performa kampanye marketing aktif agar menuai omzet berlipat.</p>
                                    ${managers.marketing ? `
                                        <span style="background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2); padding:6px 16px; border-radius:30px; font-size:0.75rem; font-weight:800;">AKTIF MENJABAT</span>
                                    ` : `
                                        <button class="btn btn-secondary btn-sm btn-hire" data-role="marketing" style="padding:6px 16px; font-size:0.75rem; font-weight:800; width:100%;">REKRUT EKSEKUTIF</button>
                                    `}
                                </div>
                                <!-- CTO -->
                                <div style="background: rgba(255,255,255,0.02); padding: 1.2rem; border-radius: 12px; border: 1px solid var(--border-color); text-align:center;">
                                    <div style="font-size:2.2rem; margin-bottom:0.5rem;">👨‍💻</div>
                                    <h4 style="margin:0; font-size:1rem; font-weight:800; color:#fff;">CTO (Chief Technology Officer)</h4>
                                    <p class="text-muted" style="font-size:0.75rem; margin: 8px 0 12px 0; min-height: 36px;">Meningkatkan performa divisi riset teknologi R&D dan melipatgandakan produk mutu.</p>
                                    ${managers.rd ? `
                                        <span style="background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2); padding:6px 16px; border-radius:30px; font-size:0.75rem; font-weight:800;">AKTIF MENJABAT</span>
                                    ` : `
                                        <button class="btn btn-secondary btn-sm btn-hire" data-role="rd" style="padding:6px 16px; font-size:0.75rem; font-weight:800; width:100%;">REKRUT EKSEKUTIF</button>
                                    `}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderSVGChart(biz) {
        let history = [...(biz.history || [])];
        const isValuation = this.chartType === 'valuation';
        const brandColor = biz.type === 'startup' ? '#818cf8' : 'var(--accent-primary)';
        
        // If history is empty, generate mock history starting from setup cost
        if (history.length < 2) {
            const setupCost = businessManager.businessTypes[biz.type]?.setupCost || 50000;
            const currentVal = biz.valuation || setupCost;
            const currentRev = biz.revenue || 0;
            history = [
                { month: 1, year: 2010, valuation: setupCost, revenue: 0 },
                { month: 2, year: 2010, valuation: currentVal * 0.7, revenue: currentRev * 0.5 },
                { month: 3, year: 2010, valuation: currentVal * 0.9, revenue: currentRev * 0.8 },
                { month: 4, year: 2010, valuation: currentVal, revenue: currentRev }
            ];
        }

        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const data = history.map((h, i) => {
            const dateStr = `${months[(h.month - 1) % 12]} ${h.year}`;
            return {
                label: dateStr,
                value: isValuation ? (h.valuation || 0) : (h.revenue || 0),
                rawValuation: h.valuation || 0,
                rawRevenue: h.revenue || 0
            };
        });

        const values = data.map(d => d.value);
        let minVal = Math.min(...values);
        let maxVal = Math.max(...values);
        
        if (maxVal === minVal) {
            minVal = Math.max(0, minVal - 1000);
            maxVal = maxVal + 1000;
        } else {
            const pad = (maxVal - minVal) * 0.1;
            minVal = Math.max(0, minVal - pad);
            maxVal = maxVal + pad;
        }

        const width = 800;
        const height = 220;
        const padding = { top: 15, right: 80, bottom: 35, left: 80 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;

        const getX = (index) => padding.left + index * (chartW / (data.length - 1 || 1));
        const getY = (val) => padding.top + chartH - ((val - minVal) / (maxVal - minVal || 1) * chartH);

        let gridHtml = '';
        const gridSteps = 4;
        for (let i = 0; i <= gridSteps; i++) {
            const val = minVal + (i * (maxVal - minVal) / gridSteps);
            const y = padding.top + chartH - (i * chartH / gridSteps);
            gridHtml += `
                <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="3 3" />
                <text x="${padding.left - 10}" y="${y + 4}" fill="rgba(255,255,255,0.4)" font-size="10px" font-weight="600" text-anchor="end">$ ${formatCompact(val)}</text>
            `;
        }

        let points = '';
        data.forEach((d, i) => {
            points += `${getX(i)},${getY(d.value)} `;
        });

        const linePath = `M ${points}`;
        const areaPath = `${linePath} L ${getX(data.length - 1)},${padding.top + chartH} L ${getX(0)},${padding.top + chartH} Z`;

        const strokeColor = isValuation ? '#f59e0b' : '#3b82f6';
        const gradId = isValuation ? 'grad-val' : 'grad-rev';
        const gradColors = isValuation 
            ? ['rgba(245, 158, 11, 0.25)', 'rgba(245, 158, 11, 0.01)']
            : ['rgba(59, 130, 246, 0.25)', 'rgba(59, 130, 246, 0.01)'];

        let xLabelsHtml = '';
        const stepX = data.length > 12 ? 2 : 1;
        data.forEach((d, i) => {
            if (i % stepX === 0 || i === data.length - 1) {
                xLabelsHtml += `
                    <text x="${getX(i)}" y="${height - 10}" fill="rgba(255,255,255,0.4)" font-size="10px" font-weight="600" text-anchor="middle">${d.label}</text>
                    <line x1="${getX(i)}" y1="${padding.top + chartH}" x2="${getX(i)}" y2="${padding.top + chartH + 4}" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
                `;
            }
        });

        let hoverBarsHtml = '';
        const barWidth = chartW / data.length;
        data.forEach((d, i) => {
            const xLeft = getX(i) - barWidth / 2;
            const xCenter = getX(i);
            const yVal = getY(d.value);
            
            hoverBarsHtml += `
                <g class="chart-hover-trigger" data-index="${i}" data-label="${d.label}" data-val="${d.value}" data-valuation="${d.rawValuation}" data-revenue="${d.rawRevenue}" data-x="${xCenter}" data-y="${yVal}">
                    <rect x="${xLeft}" y="${padding.top}" width="${barWidth}" height="${chartH}" fill="transparent" style="cursor:crosshair;" />
                </g>
            `;
        });

        return `
            <div class="card" style="padding: 1.5rem; margin-bottom: 2rem; border: 1px solid var(--border-color); background: rgba(255,255,255,0.01); position:relative;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem; flex-wrap:wrap; gap:0.5rem;">
                    <h3 style="margin:0; font-size: 1.15rem; font-weight: 900; display:flex; align-items:center; gap:0.5rem; color: #fff;">
                        <span>📈</span> Grafik Tren Kinerja Korporasi
                    </h3>
                    <div style="display:flex; gap:0.35rem; background:rgba(0,0,0,0.2); padding:3px; border-radius:8px; border:1px solid var(--border-color);">
                        <button class="btn-chart-toggle ${isValuation ? 'active' : ''}" data-type="valuation" style="padding:4px 12px; font-size:0.75rem; font-weight:700; border-radius:6px; border:none; cursor:pointer; transition:all 0.2s; font-family:inherit;">Valuasi</button>
                        <button class="btn-chart-toggle ${!isValuation ? 'active' : ''}" data-type="revenue" style="padding:4px 12px; font-size:0.75rem; font-weight:700; border-radius:6px; border:none; cursor:pointer; transition:all 0.2s; font-family:inherit;">Revenue</button>
                    </div>
                </div>

                <div class="svg-chart-container" style="position:relative; width:100%; overflow:hidden;">
                    <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; overflow:visible;">
                        <defs>
                            <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="${gradColors[0]}" />
                                <stop offset="100%" stop-color="${gradColors[1]}" />
                            </linearGradient>
                        </defs>

                        <!-- Horizontal Grid Lines -->
                        ${gridHtml}

                        <!-- Area Fill -->
                        <path d="${areaPath}" fill="url(#${gradId})" />

                        <!-- Line Path -->
                        <path d="${linePath}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />

                        <!-- Dots on data points -->
                        ${data.map((d, i) => `
                            <circle cx="${getX(i)}" cy="${getY(d.value)}" r="4.5" fill="#18181b" stroke="${strokeColor}" stroke-width="2" class="chart-dot chart-dot-${i}" />
                        `).join('')}

                        <!-- X Labels -->
                        ${xLabelsHtml}

                        <!-- Hover guides -->
                        <line id="chart-hover-line" x1="0" y1="${padding.top}" x2="0" y2="${padding.top + chartH}" stroke="rgba(255,255,255,0.25)" stroke-width="1.5" stroke-dasharray="3 3" style="display:none;" />
                        <circle id="chart-hover-circle" cx="0" cy="0" r="6" fill="${strokeColor}" stroke="#fff" stroke-width="2" style="display:none;" />

                        <!-- Hover Triggers -->
                        ${hoverBarsHtml}
                    </svg>

                    <!-- Floating Tooltip Card -->
                    <div id="biz-chart-tooltip" style="
                        position: absolute; display: none; pointer-events: none;
                        background: rgba(9, 9, 11, 0.95); border: 1px solid rgba(255,255,255,0.1);
                        padding: 8px 12px; border-radius: 8px; font-size: 11px; z-index: 10;
                        backdrop-filter: blur(8px); box-shadow: 0 10px 20px rgba(0,0,0,0.5);
                        color: white; width: 170px; font-family:inherit;
                    "></div>
                </div>

                <style>
                    .btn-chart-toggle {
                        background: transparent;
                        color: var(--text-muted);
                    }
                    .btn-chart-toggle.active {
                        background: ${brandColor};
                        color: ${biz.type === 'startup' ? '#fff' : '#000'} !important;
                    }
                </style>
            </div>
        `;
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

        // Hover tooltip triggers
        const tooltip = this.container.querySelector('#biz-chart-tooltip');
        const hoverLine = this.container.querySelector('#chart-hover-line');
        const hoverCircle = this.container.querySelector('#chart-hover-circle');
        const chartContainer = this.container.querySelector('.svg-chart-container');

        if (chartContainer) {
            this.container.querySelectorAll('.chart-hover-trigger').forEach(trigger => {
                trigger.addEventListener('mousemove', (e) => {
                    const idx = trigger.dataset.index;
                    const label = trigger.dataset.label;
                    const x = parseFloat(trigger.dataset.x);
                    const y = parseFloat(trigger.dataset.y);
                    const val = parseFloat(trigger.dataset.val);
                    const rawVal = parseFloat(trigger.dataset.valuation);
                    const rawRev = parseFloat(trigger.dataset.revenue);

                    if (hoverLine) {
                        hoverLine.setAttribute('x1', x);
                        hoverLine.setAttribute('x2', x);
                        hoverLine.style.display = 'block';
                    }
                    if (hoverCircle) {
                        hoverCircle.setAttribute('cx', x);
                        hoverCircle.setAttribute('cy', y);
                        hoverCircle.style.display = 'block';
                    }

                    if (tooltip) {
                        tooltip.style.display = 'block';
                        const percentX = (x / 800) * 100;
                        tooltip.style.left = `calc(${percentX}% + ${percentX > 50 ? '-190px' : '15px'})`;
                        tooltip.style.top = `40px`;
                        tooltip.innerHTML = `
                            <div style="font-weight:800; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:4px; margin-bottom:4px; color:#fff;">${label}</div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                                <span style="color:var(--text-muted);">Valuasi:</span>
                                <span style="font-weight:700; color:#fbbf24;">$ ${financeManager.formatCurrency(rawVal)}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between;">
                                <span style="color:var(--text-muted);">Revenue:</span>
                                <span style="font-weight:700; color:#3b82f6;">$ ${financeManager.formatCurrency(rawRev)}</span>
                            </div>
                        `;
                    }
                });

                trigger.addEventListener('mouseleave', () => {
                    if (hoverLine) hoverLine.style.display = 'none';
                    if (hoverCircle) hoverCircle.style.display = 'none';
                    if (tooltip) tooltip.style.display = 'none';
                });
            });
        }

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

        // Operations & R&D
        const btnRD = document.getElementById('btn-upgrade-rd');
        if (btnRD) {
            btnRD.addEventListener('click', () => {
                try {
                    businessManager.upgradeRD();
                    this.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        const btnMarketing = document.getElementById('btn-apply-marketing');
        if (btnMarketing) {
            btnMarketing.addEventListener('click', () => {
                const selected = this.container.querySelector('input[name="marketing-radio"]:checked')?.value || 'none';
                try {
                    businessManager.launchCampaign(selected);
                    this.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Setup live ERP calculations
        const updateLiveERP = () => {
            const supplier = this.container.querySelector('input[name="ops-supplier"]:checked')?.value || 'local';
            const production = this.container.querySelector('input[name="ops-production"]:checked')?.value || 'manual';

            // Math
            let supplierQuality = 0.50;
            let supplierLeadTime = 14;
            if (supplier === 'national') { supplierQuality = 0.85; supplierLeadTime = 7; }
            else if (supplier === 'global') { supplierQuality = 0.98; supplierLeadTime = 3; }

            let prodSpeed = 1.0;
            let defectBase = 0.02;
            if (production === 'batch') { prodSpeed = 2.0; defectBase = 0.06; }
            else if (production === 'jit') { prodSpeed = 4.5; defectBase = 0.12; }

            const mismatchMult = (production === 'jit' && supplier === 'local') ? 2.5 
                               : (production === 'batch' && supplier === 'local') ? 1.5 
                               : 1.0;
            const defectRate = defectBase * (1.5 - supplierQuality) * mismatchMult;
            const totalLeadTime = supplierLeadTime + Math.round(15 / prodSpeed);

            let defectPenalty = 1.0;
            if (defectRate > 0.10) defectPenalty = 0.5;
            else if (defectRate > 0.05) defectPenalty = 0.8;

            let speedBonus = 1.0;
            let advice = "";
            let alignmentText = "MISALIGNED";
            let alignmentColor = "#ef4444";
            let alignmentBg = "rgba(239, 68, 68, 0.15)";

            if (biz.type === 'startup') {
                if (supplier === 'global' && production === 'jit') {
                    speedBonus = 2.5;
                    alignmentText = "SEMPURNA (JIT GLOBAL)";
                    alignmentColor = "var(--accent-primary)";
                    alignmentBg = "rgba(16, 185, 129, 0.15)";
                    advice = "🏆 Kombinasi optimal! Rantai pasok Global berkualitas tinggi mendukung laju otomatisasi JIT secara sempurna. Omzet naik 2.5x tanpa kegagalan mesin.";
                } else if (supplier === 'local' && production === 'jit') {
                    speedBonus = 0.7;
                    advice = "⚠️ Kritis! Otomasi JIT digabung dengan bahan baku murah lokal menimbulkan defect tinggi (18%)! Laju mesin Anda tersumbat bahan cacat.";
                } else {
                    speedBonus = 0.9;
                    advice = "💡 Rekomendasi: Tech Startup butuh kecepatan tinggi (JIT) dan mutu suku cadang global. Coba naikkan level logistik Anda!";
                }
            } else {
                // UMKM
                if (supplier === 'national' && production === 'batch') {
                    speedBonus = 1.8;
                    alignmentText = "SEMPURNA (EFISIEN REGIONAL)";
                    alignmentColor = "var(--accent-primary)";
                    alignmentBg = "rgba(16, 185, 129, 0.15)";
                    advice = "🏆 Kombinasi optimal! Lini Perakitan Batch dengan Pemasok Nasional memberikan efisiensi biaya regional terbaik untuk UMKM Anda. Omzet naik 1.8x!";
                } else if (supplier === 'local' && production === 'manual') {
                    speedBonus = 1.2;
                    alignmentText = "CUKUP (TRADISIONAL)";
                    alignmentColor = "#fbbf24";
                    alignmentBg = "rgba(251, 191, 36, 0.15)";
                    advice = "💡 Operasional tradisional berjalan dengan baik, defect kecil namun kapasitas produksi lambat. Cocok untuk fase awal.";
                } else if (production === 'jit') {
                    speedBonus = 0.6;
                    advice = "⚠️ Pemborosan! Penerapan otomatisasi JIT terlalu canggih untuk UMKM Anda, membebani kas operasional bulanan tanpa kenaikan margin yang berarti.";
                } else {
                    speedBonus = 1.0;
                    advice = "💡 Tips: UMKM mendapat margin optimal dengan menyeimbangkan biaya regional. Pemasok Nasional + Perakitan Batch sangat disarankan.";
                }
            }

            const opMultiplier = speedBonus * defectPenalty;
            const OES = Math.round(Math.min(100, (opMultiplier / 2.5) * 100));

            // Render live stats
            const oesEl = this.container.querySelector('#live-oes');
            const defectEl = this.container.querySelector('#live-defect');
            const leadEl = this.container.querySelector('#live-lead');
            const multEl = this.container.querySelector('#live-multiplier');
            const adviceEl = this.container.querySelector('#live-advice');
            const ratingEl = this.container.querySelector('#oes-rating');

            if (oesEl) oesEl.textContent = `${OES}%`;
            if (defectEl) {
                defectEl.textContent = `${(defectRate * 100).toFixed(1)}%`;
                defectEl.style.color = defectRate > 0.10 ? '#ef4444' : defectRate > 0.05 ? '#fbbf24' : '#10b981';
            }
            if (leadEl) leadEl.textContent = `${totalLeadTime} Hari`;
            if (multEl) {
                multEl.textContent = `x ${opMultiplier.toFixed(2)}`;
                multEl.style.color = opMultiplier >= 1.5 ? '#10b981' : opMultiplier >= 1.0 ? '#fbbf24' : '#ef4444';
            }
            if (adviceEl) {
                adviceEl.textContent = advice;
                adviceEl.style.borderLeftColor = defectRate > 0.10 ? '#ef4444' : opMultiplier >= 1.5 ? '#10b981' : '#fbbf24';
            }
            if (ratingEl) {
                ratingEl.textContent = alignmentText;
                ratingEl.style.color = alignmentColor;
                ratingEl.style.backgroundColor = alignmentBg;
                ratingEl.style.borderColor = alignmentColor.replace('1)', '0.3)');
            }
        };

        // Bind radio change listeners
        this.container.querySelectorAll('input[name="ops-supplier"], input[name="ops-production"]').forEach(input => {
            input.addEventListener('change', updateLiveERP);
        });

        // Initialize board immediately
        if (this.container.querySelector('input[name="ops-supplier"]')) {
            updateLiveERP();
        }

        // Apply ERP settings click
        const btnApplyOps = document.getElementById('btn-apply-operations');
        if (btnApplyOps) {
            btnApplyOps.addEventListener('click', () => {
                const supplier = this.container.querySelector('input[name="ops-supplier"]:checked')?.value || 'local';
                const production = this.container.querySelector('input[name="ops-production"]:checked')?.value || 'manual';
                try {
                    businessManager.updateOperations(supplier, production);
                    import('./Animations.js').then(anim => {
                        anim.createFloatingText(btnApplyOps, '⚙️ ERP OK', '#10b981');
                    });
                    this.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Hire Managers
        this.container.querySelectorAll('.btn-hire').forEach(btn => {
            btn.addEventListener('click', () => {
                const role = btn.dataset.role;
                try {
                    businessManager.hireExecutive(role);
                    this.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });

        // Execute Strategic Initiatives
        this.container.querySelectorAll('.btn-execute-initiative').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                try {
                    businessManager.executeIndustryInitiative(key);
                    import('./Animations.js').then(anim => {
                        anim.createFloatingText(btn, '🎯 LAUNCH OK', '#fbbf24');
                    });
                    this.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });

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
