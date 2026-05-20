/**
 * LoanPanel.js - Premium Banking & Credit Terminal
 * Hybrid Full-Screen View for debt management
 */

import bankSystem from '../../finance/BankSystem.js';
import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../game/GameState.js';
import ui from '../UIManager.js';

class LoanPanel {
    show() {
        const creditScore = gameState.get('player.creditScore') || 700;
        const creditLevel = bankSystem.getCreditLevel(creditScore);
        const activeLoans = bankSystem.getActiveLoans();
        const products = bankSystem.getLoanProducts();

        const content = `
            <div class="hybrid-page-container" style="padding: 1.5rem; max-width: 1200px; margin: 0 auto; width: 100%;">
                
                <div style="display: grid; grid-template-columns: 350px 1fr; gap: 2rem; align-items: start;">
                    
                    <!-- Left: Credit Status -->
                    <div style="position: sticky; top: 1.5rem;">
                        <div class="card credit-score-card-premium">
                            <div class="credit-glow" style="background: var(--accent-${creditLevel.color === 'gold' ? 'gold' : creditLevel.color})"></div>
                            <div style="position: relative; z-index: 2;">
                                <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">Credit Health Score</div>
                                <div style="font-size: 3.5rem; font-weight: 900; color: white; line-height: 1;">${creditScore}</div>
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem;">
                                    <span style="font-size: 1.5rem;">${creditLevel.emoji}</span>
                                    <span style="font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent-${creditLevel.color === 'gold' ? 'gold' : creditLevel.color})">
                                        Tier: ${creditLevel.level}
                                    </span>
                                </div>
                                
                                <div class="credit-progress-bar">
                                    <div class="fill" style="width: ${((creditScore - 300) / 550) * 100}%; background: var(--accent-${creditLevel.color === 'gold' ? 'gold' : creditLevel.color})"></div>
                                </div>
                                <p style="font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 1rem; line-height: 1.5;">
                                    Skor Anda menentukan limit pinjaman dan tingkat suku bunga yang ditawarkan oleh bank.
                                </p>
                            </div>
                        </div>

                        <!-- Active Loans Sidebar with Detailed Explanations -->
                        <div class="card" style="margin-top: 1.5rem; background: rgba(255,255,255,0.02);">
                            <h4 style="margin-bottom: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
                                <span>📋</span> PINJAMAN AKTIF (${activeLoans.length})
                            </h4>
                            <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 320px; overflow-y: auto; padding-right: 0.5rem;">
                                ${activeLoans.length ? activeLoans.map(loan => `
                                    <div class="active-loan-item" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                            <span style="font-weight: 800; font-size: 0.85rem; color: white;">${loan.productName}</span>
                                            <span style="color: #f87171; font-weight: 800; font-size: 0.85rem;">
                                                ${loan.isCheat ? 'GRATIS / CHEAT' : `-$ ${financeManager.formatCurrency(loan.monthlyPayment)}/bln`}
                                            </span>
                                        </div>
                                        
                                        <!-- Detailed Breakdown Grid -->
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem 0.5rem; font-size: 0.65rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                                            <div>Pokok: <strong style="color: white;">$ ${financeManager.formatCurrency(loan.principal)}</strong></div>
                                            <div>Bunga: <strong style="color: var(--accent-primary);">${(loan.interestRate * 100).toFixed(1)}%/bln</strong></div>
                                            <div>Sisa Tenor: <strong style="color: white;">${loan.termMonths - loan.monthsPaid} bln</strong></div>
                                            <div>Sisa Hutang: <strong style="color: #f87171;">$ ${financeManager.formatCurrency(loan.remaining)}</strong></div>
                                        </div>

                                        <div class="loan-mini-progress" style="height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; margin-bottom: 0.5rem;">
                                            <div class="fill" style="width: ${(loan.monthsPaid / loan.termMonths) * 100}%; height: 100%; background: var(--accent-primary);"></div>
                                        </div>
                                        
                                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.65rem;">
                                            <span style="color: var(--text-muted);">Dibayar: ${loan.monthsPaid}/${loan.termMonths} bulan</span>
                                            <button class="text-btn-payoff" data-payoff="${loan.id}">LUNASI SEKARANG</button>
                                        </div>
                                    </div>
                                `).join('') : `
                                    <div style="text-align: center; padding: 2rem 0; opacity: 0.3;">
                                        <div style="font-size: 2rem;">🏦</div>
                                        <div style="font-size: 0.75rem;">Tidak ada hutang aktif</div>
                                    </div>
                                `}
                            </div>
                            
                            ${activeLoans.length >= 2 ? `
                                <button id="btn-pay-all" class="btn btn-primary" style="width: 100%; margin-top: 1.25rem; font-size: 0.8rem; font-weight: 800; padding: 0.75rem;">
                                    💰 LUNASI SEMUA (SAVE 10%)
                                </button>
                            ` : ''}
                        </div>

                        <!-- NEW: Credit Risk Assessment -->
                        <div class="card risk-assessment-card" style="margin-top: 1.5rem; border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.02);">
                            <h4 style="font-size: 0.8rem; font-weight: 800; margin-bottom: 1rem; color: #ef4444;">📊 RISK ASSESSMENT</h4>
                            
                            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                                    <span class="text-muted">Debt-to-Income (DTI)</span>
                                    <span style="font-weight: 800; color: ${bankSystem.getTotalDebt() / (gameState.getBalance() + 1) > 0.5 ? '#ef4444' : '#10b981'}">
                                        ${((bankSystem.getTotalDebt() / (gameState.getBalance() + 1)) * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                                    <span class="text-muted">Risk Profile</span>
                                    <span style="font-weight: 800; color: ${creditScore < 600 ? '#ef4444' : '#10b981'}">
                                        ${creditScore < 600 ? 'HIGH RISK' : 'STABLE'}
                                    </span>
                                </div>
                            </div>

                            <div class="risk-meter" style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; margin-top: 1rem; overflow: hidden; display: flex;">
                                <div style="width: 33%; height: 100%; background: #10b981; opacity: 0.3;"></div>
                                <div style="width: 33%; height: 100%; background: #fbbf24; opacity: 0.3;"></div>
                                <div style="width: 34%; height: 100%; background: #ef4444; opacity: 0.3;"></div>
                                <div class="risk-cursor" style="position: absolute; width: 4px; height: 10px; background: white; border-radius: 2px; margin-top: -2px; left: ${Math.min(100, (bankSystem.getTotalDebt() / (gameState.getBalance() + 1e6)) * 100)}%; transition: left 0.5s;"></div>
                            </div>
                            <p style="font-size: 0.65rem; color: var(--text-muted); margin-top: 0.75rem; line-height: 1.4;">
                                Perhatian: Gagal bayar cicilan akan menurunkan skor kredit secara drastis dan dikenakan denda keterlambatan 5%.
                            </p>
                        </div>
                    </div>

                    <!-- Right: Loan Marketplace -->
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                            <h3 style="font-weight: 800; font-size: 1.25rem; display: flex; align-items: center; gap: 0.75rem;">
                                <span>🚀</span> Loan Marketplace
                            </h3>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">
                                ${bankSystem.isCheatActive() 
                                    ? 'LIMIT GLOBAL: <span style="color: #10b981; font-weight: 800;">UNLIMITED (MODE DEWA)</span>' 
                                    : `LIMIT GLOBAL: <span style="color: var(--accent-primary); font-weight: 800;">$ ${financeManager.formatCurrency(100000000, true)}</span>`}
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.25rem;">
                            ${products.map(p => {
                                const isCheatActive = bankSystem.isCheatActive();
                                const interestText = isCheatActive ? '0% INTEREST (FREE)' : `${(p.interestRate * 100).toFixed(1)}% INTEREST`;
                                const limitText = isCheatActive ? 'UNLIMITED (DEWA)' : `$ ${financeManager.formatCurrency(p.availableAmount, true)}`;
                                
                                return `
                                <div class="loan-product-card-premium" data-product="${p.id}">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
                                        <div>
                                            <div class="product-name">${p.name}</div>
                                            <div class="interest-tag" style="color: ${isCheatActive ? '#34d399' : 'var(--accent-primary)'}; font-weight: 800;">${interestText}</div>
                                        </div>
                                        <div class="term-tag">${p.termMonths} MO</div>
                                    </div>
                                    
                                    <div class="limit-box" style="${isCheatActive ? 'border: 1px solid rgba(139, 92, 246, 0.3); background: rgba(139, 92, 246, 0.05);' : ''}">
                                        <div class="label">MAX LIMIT</div>
                                        <div class="value" style="${isCheatActive ? 'color: #c084fc;' : ''}">${limitText}</div>
                                    </div>
                                    
                                    <div class="product-features">
                                        <div class="feature"><span>✓</span> Pencairan Instan</div>
                                        <div class="feature"><span>✓</span> ${isCheatActive ? 'Bunga 0% Selamanya' : 'Bunga Kompetitif'}</div>
                                        <div class="feature"><span>✓</span> ${isCheatActive ? 'Bebas Potong Saldo' : 'Skor Kredit Aman'}</div>
                                    </div>
                                    
                                    <button class="btn btn-primary btn-block" style="margin-top: 1rem; padding: 0.875rem;">AJUKAN PINJAMAN</button>
                                </div>
                                `;
                            }).join('')}
                        </div>


                        <div class="card" style="margin-top: 2rem; background: linear-gradient(to right, rgba(14, 165, 233, 0.05), transparent); border-left: 4px solid #0ea5e9;">
                            <h4 style="color: #0ea5e9; font-weight: 800; font-size: 0.9rem; margin-bottom: 0.75rem;">📘 TIPS KELOLA HUTANG</h4>
                            <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.6;">Gunakan hutang sebagai daya ungkit (leverage) untuk membeli aset yang menghasilkan income (seperti Properti atau Bisnis). Jangan gunakan pinjaman untuk konsumsi pribadi yang tidak menghasilkan uang.</p>
                        </div>
                    </div>

                </div>
            </div>

            <style>
                .credit-score-card-premium {
                    background: #111827;
                    border: 1px solid rgba(255,255,255,0.05);
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                    border-radius: 20px;
                }
                .credit-glow {
                    position: absolute;
                    top: -50px;
                    right: -50px;
                    width: 200px;
                    height: 200px;
                    filter: blur(80px);
                    opacity: 0.2;
                    pointer-events: none;
                }
                .credit-progress-bar {
                    height: 8px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 4px;
                    margin-top: 1.5rem;
                    overflow: hidden;
                }
                .credit-progress-bar .fill {
                    height: 100%;
                    border-radius: 4px;
                    transition: width 1s ease-out;
                }

                .loan-product-card-premium {
                    background: var(--bg-surface);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    transition: all 0.2s;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                }
                .loan-product-card-premium:hover {
                    border-color: var(--accent-primary);
                    background: rgba(255,255,255,0.02);
                    transform: translateY(-2px);
                }
                .loan-product-card-premium .product-name {
                    font-size: 1.25rem;
                    font-weight: 900;
                    color: white;
                    margin-bottom: 0.25rem;
                }
                .interest-tag {
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: var(--accent-primary);
                    letter-spacing: 0.05em;
                }
                .term-tag {
                    background: rgba(255,255,255,0.05);
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    color: var(--text-muted);
                }
                .limit-box {
                    background: rgba(0,0,0,0.3);
                    padding: 1rem;
                    border-radius: 12px;
                    margin-bottom: 1.25rem;
                }
                .limit-box .label {
                    font-size: 0.65rem;
                    color: var(--text-muted);
                    font-weight: 700;
                    margin-bottom: 0.25rem;
                }
                .limit-box .value {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: white;
                }
                .product-features {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                }
                .feature {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .feature span { color: var(--accent-primary); font-weight: 900; }

                .active-loan-item {
                    padding: 1rem;
                    background: rgba(0,0,0,0.2);
                    border: 1px solid rgba(255,255,255,0.03);
                    border-radius: 12px;
                }
                .loan-mini-progress {
                    height: 4px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 2px;
                    overflow: hidden;
                }
                .loan-mini-progress .fill {
                    height: 100%;
                    background: var(--accent-primary);
                }
                .text-btn-payoff {
                    background: none;
                    border: none;
                    color: var(--accent-primary);
                    font-size: 0.65rem;
                    font-weight: 800;
                    cursor: pointer;
                    padding: 0;
                    letter-spacing: 0.05em;
                }
                .text-btn-payoff:hover { text-decoration: underline; }
            </style>
        `;

        import('../ViewManager.js').then(m => {
            const viewManager = m.default;
            viewManager.showDynamicView('Layanan Perbankan', 'Pinjaman modal & manajemen skor kredit', content);
            this.bindEvents();
        });
    }

    bindEvents() {
        const container = document.getElementById('dynamic-view-content');
        if (!container) return;

        // Apply for loan
        container.querySelectorAll('[data-product]').forEach(el => {
            el.addEventListener('click', () => this.showApplyModal(el.dataset.product));
        });

        // Pay off early
        container.querySelectorAll('[data-payoff]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const loanId = parseInt(btn.dataset.payoff);

                const confirmed = await ui.confirm({
                    title: 'Lunasi Pinjaman?',
                    message: 'Pelunasan dini memberikan diskon 10% dari sisa pokok pinjaman. Anda yakin?',
                    icon: '🏦',
                    confirmText: 'Lunasi Sekarang',
                    confirmClass: 'btn-success'
                });

                if (confirmed) {
                    try {
                        const result = bankSystem.payOffEarly(loanId);
                        ui.success(`Pinjaman lunas! Anda hemat $ ${financeManager.formatCurrency(result.saved, true)} bunga.`);
                        this.show(); // Refresh
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Pay ALL
        const payAllBtn = document.getElementById('btn-pay-all');
        if (payAllBtn) {
            payAllBtn.addEventListener('click', async () => {
                const totalPayoff = bankSystem.getTotalPayoffAmount();
                const confirmed = await ui.confirm({
                    title: 'Bersihkan Semua Hutang?',
                    message: `Lunasi semua pinjaman aktif sekaligus dengan total $ ${financeManager.formatCurrency(totalPayoff, true)}. Sudah termasuk diskon pelunasan 10%.`,
                    icon: '💰',
                    confirmText: 'Lunas Total',
                    confirmClass: 'btn-success'
                });

                if (confirmed) {
                    try {
                        const result = bankSystem.payAllLoans();
                        ui.success(`${result.count} pinjaman lunas! Total hemat: $ ${financeManager.formatCurrency(result.totalSaved, true)}`);
                        this.show(); // Refresh
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }
    }

    async showApplyModal(productId) {
        const products = bankSystem.getLoanProducts();
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const isCheatActive = bankSystem.isCheatActive();
        const interestText = isCheatActive ? '0% BUNGA/BLN (GRATIS)' : `${product.interestRate * 100}% BUNGA/BLN`;
        const limitDisplay = isCheatActive ? 'UNLIMITED (MODE DEWA)' : `$ ${financeManager.formatCurrency(product.availableAmount)}`;

        const modalContent = `
            <div class="modal-header">
                <h3 class="modal-title">🏦 Ajukan ${product.name}</h3>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <div class="card" style="background: rgba(0,0,0,0.2); margin-bottom: 1.5rem; text-align: center; ${isCheatActive ? 'border: 1px solid rgba(139, 92, 246, 0.3); background: rgba(139, 92, 246, 0.05);' : ''}">
                    <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Maksimal Pinjaman</div>
                    <div style="font-size: 2rem; font-weight: 800; color: white; margin: 0.25rem 0;">${limitDisplay}</div>
                    <div style="font-size: 0.75rem; color: ${isCheatActive ? '#10b981' : 'var(--accent-primary)'}; font-weight: 700;">${interestText} • ${product.termMonths} BULAN</div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">Jumlah Pinjaman (USD)</label>
                    <input type="number" id="loan-amount-input" class="modern-input" 
                           value="${isCheatActive ? '10000000' : Math.min(product.availableAmount, 100000)}" 
                           style="width: 100%; padding: 1rem; font-size: 1.25rem; text-align: center; font-weight: 800; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 12px; color: white;">
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.75rem; font-size: 0.8rem; color: var(--text-muted);">Batch Apply (Multi-Loan)</label>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;">
                        <button class="mult-btn active" data-mult="1">x1</button>
                        <button class="mult-btn" data-mult="2">x2</button>
                        <button class="mult-btn" data-mult="5">x5</button>
                        <button class="mult-btn" data-mult="10">x10</button>
                    </div>
                </div>

                <div class="card" style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="font-size: 0.8rem; color: var(--text-muted);">Total Diterima</span>
                        <span id="total-loan-display" style="font-size: 1.25rem; font-weight: 800; color: white;">$ 0</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.8rem; color: var(--text-muted);">Total Cicilan/bln</span>
                        <span id="monthly-payment-display" style="font-size: 1rem; font-weight: 700; color: #ef4444;">$ 0</span>
                    </div>
                </div>

                <button id="btn-submit-loan" class="btn btn-primary btn-block" style="padding: 1rem; font-weight: 800; font-size: 1.1rem;">🚀 KONFIRMASI PINJAMAN</button>
            </div>

            <style>
                .mult-btn {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid var(--border-color);
                    padding: 0.5rem;
                    border-radius: 8px;
                    color: white;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .mult-btn.active {
                    background: var(--accent-primary);
                    border-color: var(--accent-primary);
                }
            </style>
        `;

        ui.openModal(modalContent);
        this.bindApplyModalEvents(productId, product);
    }

    bindApplyModalEvents(productId, product) {
        const modal = document.getElementById('modal-content');
        const amountInput = document.getElementById('loan-amount-input');
        if (amountInput) {
            ui.setupNumericInput(amountInput);
        }
        const totalDisplay = document.getElementById('total-loan-display');
        const monthlyDisplay = document.getElementById('monthly-payment-display');
        
        let selectedMultiplier = 1;

        const updateSummary = () => {
            const amount = amountInput.getNumericValue ? amountInput.getNumericValue() : (parseInt(amountInput.value.replace(/,/g, ''), 10) || 0);
            const mult = selectedMultiplier;
            const total = amount * mult;
            const isCheatActive = bankSystem.isCheatActive();
            const monthlyPerLoan = isCheatActive ? 0 : ((amount + (amount * product.interestRate * product.termMonths)) / product.termMonths);
            const totalMonthly = monthlyPerLoan * mult;

            totalDisplay.textContent = `$ ${financeManager.formatCurrency(total, true)}`;
            monthlyDisplay.textContent = isCheatActive ? 'GRATIS (0% BUNGA)' : `$ ${financeManager.formatCurrency(totalMonthly, true)}`;
        };

        modal.querySelectorAll('.mult-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.mult-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedMultiplier = parseInt(btn.dataset.mult);
                updateSummary();
            });
        });

        amountInput.addEventListener('input', updateSummary);

        document.getElementById('btn-submit-loan').addEventListener('click', async () => {
            const amount = amountInput.getNumericValue ? amountInput.getNumericValue() : (parseInt(amountInput.value.replace(/,/g, ''), 10) || 0);
            if (!amount || amount <= 0) {
                ui.error('Masukkan jumlah yang valid');
                return;
            }

            const mult = selectedMultiplier;
            const total = amount * mult;

            const confirmed = await ui.confirm({
                title: 'Konfirmasi Pinjaman',
                message: `Anda akan meminjam total $ ${financeManager.formatCurrency(total)} dengan ${mult} kontrak pinjaman. Lanjutkan?`,
                icon: '🏦',
                confirmText: 'Ya, Setuju',
                confirmClass: 'btn-primary'
            });

            if (confirmed) {
                try {
                    let count = 0;
                    for (let i = 0; i < mult; i++) {
                        bankSystem.applyLoan(productId, amount);
                        count++;
                    }
                    ui.success(`${count} Pinjaman disetujui! Dana telah masuk ke saldo.`);
                    ui.closeModal();
                    this.show();
                } catch (e) {
                    ui.error(e.message);
                }
            }
        });

        updateSummary();
    }
}

export default new LoanPanel();
