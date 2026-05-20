/**
 * TaxPanel.js - Premium Tax Management Terminal
 * Hybrid Full-Screen View for annual tax obligations
 */

import taxSystem from '../../finance/TaxSystem.js';
import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../game/GameState.js';
import ui from '../UIManager.js';

class TaxPanel {
    show() {
        const summary = taxSystem.getTaxSummary();
        const breakdown = taxSystem.getTaxBreakdown();
        const isOverdue = taxSystem.isTaxOverdue();
        const penalty = taxSystem.calculatePenalty();

        const content = `
            <div class="hybrid-page-container" style="padding: 1.5rem; max-width: 900px; margin: 0 auto; width: 100%;">
                
                <!-- Main Header Status -->
                <div class="card tax-status-premium ${summary.remaining > 0 ? 'overdue-glow' : 'safe-glow'}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 0.5rem;">Yearly Tax Compliance — ${gameState.get('gameTime.year')}</div>
                            <h2 style="font-size: 2rem; font-weight: 900; color: white;">
                                ${summary.remaining > 0 ? 'Action Required' : 'Fully Compliant'}
                            </h2>
                            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">Deadline: <span style="color: white; font-weight: 800;">${summary.deadline}</span></div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em;">Effective Rate</div>
                            <div style="font-size: 2.5rem; font-weight: 900; color: var(--accent-primary);">${summary.effectiveRate.toFixed(1)}%</div>
                        </div>
                    </div>

                    ${isOverdue ? `
                        <div class="penalty-alert">
                            <span class="pulse-icon">⚠️</span>
                            <div>
                                <div style="font-weight: 800; font-size: 0.9rem;">TAX OVERDUE</div>
                                <div style="font-size: 0.75rem; opacity: 0.8;">Penalty added: +$ ${financeManager.formatCurrency(penalty)}</div>
                            </div>
                        </div>
                    ` : ''}

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 2rem;">
                        <div class="tax-stat-box">
                            <div class="label">EST. TAX DUE</div>
                            <div class="value">$ ${financeManager.formatCurrency(summary.taxDue, true)}</div>
                        </div>
                        <div class="tax-stat-box">
                            <div class="label">TAX PAID</div>
                            <div class="value" style="color: var(--accent-primary);">$ ${financeManager.formatCurrency(summary.taxPaid, true)}</div>
                        </div>
                        <div class="tax-stat-box highlight">
                            <div class="label">NET REMAINING</div>
                            <div class="value" style="color: ${summary.remaining > 0 ? '#ef4444' : 'var(--accent-primary)'}">$ ${financeManager.formatCurrency(summary.remaining, true)}</div>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 300px; gap: 2rem; margin-top: 2rem; align-items: start;">
                    
                    <!-- Left: Detailed Breakdown -->
                    <div class="card" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color);">
                        <h4 style="margin-bottom: 1.5rem; font-weight: 800; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.05em;">Income Bracket Breakdown</h4>
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            ${breakdown.map(b => `
                                <div class="bracket-row">
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.85rem; font-weight: 700; color: white;">${b.bracket}</div>
                                        <div style="font-size: 0.7rem; color: var(--text-muted);">Taxable: $ ${financeManager.formatCurrency(b.taxableAmount, true)}</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 0.85rem; font-weight: 800; color: white;">$ ${financeManager.formatCurrency(b.tax, true)}</div>
                                        <div style="font-size: 0.7rem; color: var(--accent-primary); font-weight: 700;">Rate: ${b.rate}%</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Right: Quick Pay & Info -->
                    <div>
                        ${summary.remaining > 0 ? `
                            <button id="btn-pay-tax" class="btn btn-primary btn-block" style="padding: 1.25rem; font-weight: 900; font-size: 1rem; margin-bottom: 1.5rem; box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.3);">
                                💰 PAY REMAINING TAX
                            </button>
                        ` : `
                            <div class="card" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); text-align: center; padding: 1.5rem; margin-bottom: 1.5rem;">
                                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🏛️</div>
                                <div style="font-weight: 800; color: var(--accent-primary); font-size: 0.9rem;">ACCOUNT CLEAR</div>
                                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.25rem;">No outstanding obligations.</div>
                            </div>
                        `}

                        <div class="card" style="background: rgba(255,255,255,0.02); font-size: 0.8rem; line-height: 1.6;">
                            <h5 style="margin-bottom: 0.75rem; font-weight: 800; color: var(--text-muted);">IRS GUIDELINES</h5>
                            <ul style="padding-left: 1rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.5rem;">
                                <li>Failure to pay by March 31st results in a 2% monthly penalty.</li>
                                <li>All income (Job, Business, Trading) is combined for final calculation.</li>
                                <li>Higher income brackets apply only to the portion of income within that range.</li>
                            </ul>
                        </div>
                    </div>
                </div>

            </div>

            <style>
                .tax-status-premium {
                    background: #111827;
                    border: 1px solid rgba(255,255,255,0.05);
                    padding: 2.5rem;
                    border-radius: 24px;
                    position: relative;
                    overflow: hidden;
                }
                .overdue-glow { border-top: 4px solid #ef4444; }
                .safe-glow { border-top: 4px solid var(--accent-primary); }

                .tax-stat-box {
                    background: rgba(255,255,255,0.03);
                    padding: 1.25rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.02);
                }
                .tax-stat-box .label {
                    font-size: 0.65rem;
                    color: var(--text-muted);
                    font-weight: 800;
                    letter-spacing: 0.05em;
                    margin-bottom: 0.5rem;
                }
                .tax-stat-box .value {
                    font-size: 1.25rem;
                    font-weight: 900;
                    color: white;
                }
                .tax-stat-box.highlight {
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.05);
                }

                .penalty-alert {
                    background: rgba(239, 68, 68, 0.15);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: #fca5a5;
                    padding: 1rem;
                    border-radius: 12px;
                    margin-top: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .pulse-icon {
                    animation: pulse-warn 2s infinite;
                    font-size: 1.5rem;
                }
                @keyframes pulse-warn {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .bracket-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: rgba(0,0,0,0.2);
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.02);
                }
            </style>
        `;

        import('../ViewManager.js').then(m => {
            m.default.showDynamicView('IRS Terminal', 'Annual tax reporting & compliance', content);
            this.bindEvents();
        });
    }

    bindEvents() {
        const payBtn = document.getElementById('btn-pay-tax');
        if (payBtn) {
            payBtn.addEventListener('click', async () => {
                const summary = taxSystem.getTaxSummary();

                const confirmed = await ui.confirm({
                    title: 'Confirm Tax Payment',
                    message: `Authorize payment of $ ${financeManager.formatCurrency(summary.remaining)} to the Internal Revenue Service?`,
                    icon: '🏛️',
                    confirmText: 'Authorize Payment',
                    confirmClass: 'btn-primary'
                });

                if (confirmed) {
                    try {
                        taxSystem.payAllTax();
                        ui.success('Tax payment authorized successfully.');
                        this.show(); // Refresh
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }
    }
}

export default new TaxPanel();
