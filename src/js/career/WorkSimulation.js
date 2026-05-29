/**
 * WorkSimulation.js - Interactive Mini-Simulations for Daily Employee Tasks
 * High-fidelity, zero-dependency, keyboard-accessible interactive work tasks.
 */

import ui from '../ui/UIManager.js';
import workTaskManager from '../core/databases/WorkTaskManager.js';
import financeManager from '../finance/FinanceManager.js';

class WorkSimulation {
    constructor() {
        this.activeSim = null;
        this.task = null;
        this.onCompleteCallback = null;
    }

    /**
     * Start a simulation for a specific work task (Modal fallback)
     */
    start(task, onComplete) {
        this.task = task;
        this.onCompleteCallback = onComplete;
        
        // Show interactive simulation modal
        ui.showModal({
            title: `🎮 Work Simulation: ${task.label}`,
            content: this.generateSimHTML(task.id),
            onShow: () => {
                this.initSimLogic(task.id, document.getElementById('simulation-body-container') || document);
            }
        });
    }

    /**
     * Render a simulation directly inside an inline container
     */
    renderInline(taskId, container, onComplete) {
        container.innerHTML = this.generateSimHTML(taskId);
        this.initSimLogic(taskId, container, onComplete);
    }

    generateSimHTML(taskId) {
        let innerHTML = '';

        switch (taskId) {
            case 'compile_report':
                innerHTML = `
                    <div style="text-align: center; margin-bottom: 1rem;">
                        <span style="font-size: 2.5rem;">📊</span>
                        <h4 style="margin: 0.5rem 0; color: white;">Compile Report</h4>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Urutkan dokumen: <strong>Title → Summary → Analysis → Sign-Off</strong></p>
                    </div>
                    <div class="seq-container" style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">
                        <button class="btn btn-secondary seq-btn" data-step="analysis" style="text-align: left; padding: 10px 15px; font-size: 0.85rem;">📈 III. Financial Data Analysis</button>
                        <button class="btn btn-secondary seq-btn" data-step="title" style="text-align: left; padding: 10px 15px; font-size: 0.85rem;">📝 I. Report Title & Header</button>
                        <button class="btn btn-secondary seq-btn" data-step="signoff" style="text-align: left; padding: 10px 15px; font-size: 0.85rem;">✍️ IV. Executive Sign-Off</button>
                        <button class="btn btn-secondary seq-btn" data-step="summary" style="text-align: left; padding: 10px 15px; font-size: 0.85rem;">📋 II. Executive Summary</button>
                    </div>
                    <div class="sim-feedback" style="margin-top: 1rem; height: 20px; font-size: 0.8rem; text-align: center; font-weight: 700;"></div>
                `;
                break;

            case 'document_approval':
                const docType = this.getRandomItem([
                    { desc: 'Contract proposal from supplier: Total cost $25,000. (Rule: Approve if cost is under $30,000)', approve: true },
                    { desc: 'Purchase requisition for high-end server: Total cost $45,000. (Rule: Approve if cost is under $30,000)', approve: false },
                    { desc: 'Employee requests 4 days of paid leave. (Rule: Approve if request is 5 days or less)', approve: true },
                    { desc: 'Manager requests 12 days of paid emergency leave. (Rule: Approve if request is 5 days or less)', approve: false }
                ]);
                innerHTML = `
                    <div style="text-align: center; margin-bottom: 1rem;">
                        <span style="font-size: 2.5rem;">✍️</span>
                        <h4 style="margin: 0.5rem 0; color: white;">Document Approval</h4>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Beri keputusan yang tepat berdasarkan peraturan perusahaan.</p>
                    </div>
                    <div class="card doc-card" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 1.25rem; font-size: 0.9rem; line-height: 1.5; color: #fff; text-align: center; min-height: 80px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;" data-correct="${docType.approve}">
                        "${docType.desc}"
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <button class="btn btn-danger btn-lg approval-btn" data-decision="reject">❌ REJECT</button>
                        <button class="btn btn-success btn-lg approval-btn" data-decision="approve">✅ APPROVE</button>
                    </div>
                `;
                break;

            case 'verify_invoice':
                const invoice = this.getRandomItem([
                    { sub: 500, tax: 50, total: 550, valid: true }, // 10% tax
                    { sub: 1000, tax: 100, total: 1100, valid: true },
                    { sub: 250, tax: 25, total: 275, valid: true },
                    { sub: 800, tax: 80, total: 950, valid: false }, // Math error
                    { sub: 400, tax: 40, total: 420, valid: false }, // Math error
                    { sub: 1200, tax: 120, total: 1300, valid: false }
                ]);
                innerHTML = `
                    <div style="text-align: center; margin-bottom: 1rem;">
                        <span style="font-size: 2.5rem;">🧾</span>
                        <h4 style="margin: 0.5rem 0; color: white;">Verify Invoice</h4>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Periksa matematika invoice. Total harus = Subtotal + Tax (Tax = 10% Subtotal).</p>
                    </div>
                    <div class="card invoice-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 1.5rem; margin-bottom: 1.5rem;" data-valid="${invoice.valid}">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
                            <span style="color: var(--text-muted);">Subtotal:</span>
                            <strong style="color: white;">$${invoice.sub}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
                            <span style="color: var(--text-muted);">Tax (10%):</span>
                            <strong style="color: white;">$${invoice.tax}</strong>
                        </div>
                        <hr style="border-color: var(--border-color); margin: 0.75rem 0;">
                        <div style="display: flex; justify-content: space-between; font-size: 1.1rem;">
                            <span style="color: white; font-weight: 700;">TOTAL DUE:</span>
                            <strong style="color: var(--accent-primary);">$${invoice.total}</strong>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <button class="btn btn-danger btn-lg verify-btn" data-val="false">❌ CONTAINS ERROR</button>
                        <button class="btn btn-success btn-lg verify-btn" data-val="true">✅ VALID & ACCURATE</button>
                    </div>
                `;
                break;

            case 'drag_drop_data':
                const itemsToCategorize = this.shuffleArray([
                    { name: 'Founder Salary', cat: 'expense' },
                    { name: 'Stock Dividends', cat: 'income' },
                    { name: 'Server Hosting bill', cat: 'expense' },
                    { name: 'Consulting Fee received', cat: 'income' },
                    { name: 'Office Rent payment', cat: 'expense' },
                    { name: 'Cryptocurrency profit', cat: 'income' }
                ]);
                innerHTML = `
                    <div style="text-align: center; margin-bottom: 1rem;">
                        <span style="font-size: 2.5rem;">🗂️</span>
                        <h4 style="margin: 0.5rem 0; color: white;">Data Categorization</h4>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Klasifikasikan transaksi berikut ke kolom Kas yang benar.</p>
                    </div>
                    <div class="drag-items-container" style="display: flex; flex-direction: column; align-items: center; margin-bottom: 1.5rem;">
                        ${itemsToCategorize.map((item, idx) => `
                            <div class="drag-item-card" data-cat="${item.cat}" data-idx="${idx}" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; font-weight: 700; color: white; width: 100%; text-align: center; display: ${idx === 0 ? 'block' : 'none'}; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                                📝 ${item.name}
                            </div>
                        `).join('')}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <button class="btn btn-danger btn-lg sort-btn" data-choice="expense" style="font-weight: 800;">💸 EXPENSE</button>
                        <button class="btn btn-success btn-lg sort-btn" data-choice="income" style="font-weight: 800;">💵 INCOME</button>
                    </div>
                    <div style="text-align: center; margin-top: 1rem; font-size: 0.8rem; color: var(--text-dim);" class="sort-progress">
                        Items Sorted: 0 / ${itemsToCategorize.length}
                    </div>
                `;
                break;

            case 'match_transaction':
                innerHTML = `
                    <div style="text-align: center; margin-bottom: 0.75rem;">
                        <span style="font-size: 2.5rem;">🔗</span>
                        <h4 style="margin: 0.5rem 0; color: white;">Reconcile Transactions</h4>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Cocokkan nilai Bank Statement (Kiri) dan Company Ledger (Kanan).</p>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                        <div>
                            <div style="font-size: 0.75rem; text-align: center; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">Bank Statement</div>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;" class="match-left-col">
                                <button class="btn btn-secondary match-btn left-btn" data-val="1240">$1,240</button>
                                <button class="btn btn-secondary match-btn left-btn" data-val="485">$485</button>
                                <button class="btn btn-secondary match-btn left-btn" data-val="9300">$9,300</button>
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; text-align: center; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">Company Ledger</div>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;" class="match-right-col">
                                <button class="btn btn-secondary match-btn right-btn" data-val="485">$485</button>
                                <button class="btn btn-secondary match-btn right-btn" data-val="9300">$9,300</button>
                                <button class="btn btn-secondary match-btn right-btn" data-val="1240">$1,240</button>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: center; font-size: 0.8rem; color: var(--text-dim);" class="reconciled-status">Matches cleared: 0 / 3</div>
                `;
                break;

            case 'balance_cashflow':
                const targetVal = this.getRandomItem([300, 450, 600, 750, 900]);
                const randAsset = targetVal;
                const randLiab = targetVal - this.getRandomItem([50, 100, 150, -50, -100]);
                innerHTML = `
                    <div style="text-align: center; margin-bottom: 1rem;">
                        <span style="font-size: 2.5rem;">⚖️</span>
                        <h4 style="margin: 0.5rem 0; color: white;">Balance Sheet Cashflow</h4>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Sesuaikan Equity agar: <strong>Total Assets = Liabilities + Equity</strong></p>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; text-align: center;">
                        <div class="card" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 1rem;">
                            <div style="font-size: 0.75rem; color: var(--text-muted);">TOTAL ASSETS</div>
                            <div class="val-assets" style="font-size: 1.5rem; font-weight: 900; color: white;" data-val="${randAsset}">$${randAsset}</div>
                        </div>
                        <div class="card" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 1rem;">
                            <div style="font-size: 0.75rem; color: var(--text-muted);">LIABILITIES + EQUITY</div>
                            <div class="val-liab-equity" style="font-size: 1.5rem; font-weight: 900; color: white;">Calculating...</div>
                        </div>
                    </div>

                    <div class="card" style="background: rgba(255,255,255,0.03); border: 1px dashed var(--border-color); padding: 1rem; margin-bottom: 1.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 0.85rem;">
                            <span>Liabilities (Fixed):</span>
                            <span style="font-weight: 700; color: white;" class="val-liabilities" data-val="${randLiab}">$${randLiab}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem;">
                            <span>Equity (Adjustable):</span>
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <button class="btn btn-secondary btn-sm btn-eq-down" style="padding: 2px 10px; font-weight: 900;">-10</button>
                                <span style="font-weight: 800; color: var(--accent-primary); font-size: 1.1rem; width: 50px; text-align: center;" class="val-equity" data-val="0">$0</span>
                                <button class="btn btn-secondary btn-sm btn-eq-up" style="padding: 2px 10px; font-weight: 900;">+10</button>
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-submit-balance" style="width: 100%; font-weight: 800;">SUBMIT SHEET</button>
                `;
                break;
        }

        return `
            <div style="padding: 1rem;" class="simulation-body-container">
                ${innerHTML}
            </div>
        `;
    }

    initSimLogic(taskId, container = document, onComplete = null) {
        const handleComplete = (success) => {
            if (onComplete) {
                onComplete(success);
            } else {
                this.completeSimulation(success);
            }
        };

        const find = (sel) => container.querySelector(sel);
        const findAll = (sel) => container.querySelectorAll(sel);

        switch (taskId) {
            case 'compile_report': {
                const targetSeq = ['title', 'summary', 'analysis', 'signoff'];
                let currentStepIdx = 0;
                const buttons = findAll('.seq-btn');
                const feedback = find('.sim-feedback');

                buttons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const step = btn.dataset.step;
                        if (step === targetSeq[currentStepIdx]) {
                            btn.classList.remove('btn-secondary');
                            btn.classList.add('btn-success');
                            btn.disabled = true;
                            currentStepIdx++;
                            feedback.textContent = `✅ Step ${currentStepIdx} compiled!`;
                            feedback.style.color = '#10b981';

                            if (currentStepIdx === targetSeq.length) {
                                feedback.textContent = '🎉 Report Compiled Successfully!';
                                handleComplete(true);
                            }
                        } else {
                            btn.classList.add('shake');
                            feedback.textContent = '❌ Wrong sequence order! Try again.';
                            feedback.style.color = '#ef4444';
                            setTimeout(() => btn.classList.remove('shake'), 400);
                        }
                    });
                });
                break;
            }

            case 'document_approval': {
                const docCard = find('.doc-card');
                const isCorrectApprove = docCard.dataset.correct === 'true';
                const buttons = findAll('.approval-btn');

                buttons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const decision = btn.dataset.decision;
                        const isApproved = decision === 'approve';
                        
                        if (isApproved === isCorrectApprove) {
                            btn.classList.add('btn-success');
                            handleComplete(true);
                        } else {
                            btn.classList.add('shake');
                            ui.error("Wrong decision for this document's rules!");
                            setTimeout(() => {
                                btn.classList.remove('shake');
                                handleComplete(false);
                            }, 1000);
                        }
                    });
                });
                break;
            }

            case 'verify_invoice': {
                const card = find('.invoice-card');
                const isValid = card.dataset.valid === 'true';
                const buttons = findAll('.verify-btn');

                buttons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const choice = btn.dataset.val === 'true';
                        if (choice === isValid) {
                            btn.classList.add('btn-success');
                            handleComplete(true);
                        } else {
                            btn.classList.add('shake');
                            ui.error("Incorrect verification analysis!");
                            setTimeout(() => {
                                btn.classList.remove('shake');
                                handleComplete(false);
                            }, 1000);
                        }
                    });
                });
                break;
            }

            case 'drag_drop_data': {
                const cards = Array.from(findAll('.drag-item-card'));
                const buttons = findAll('.sort-btn');
                const progressText = find('.sort-progress');
                let currentIndex = 0;

                buttons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (currentIndex >= cards.length) return;
                        
                        const choice = btn.dataset.choice;
                        const currentCard = cards[currentIndex];
                        const correctCat = currentCard.dataset.cat;

                        if (choice === correctCat) {
                            currentCard.style.display = 'none';
                            currentIndex++;
                            progressText.textContent = `Items Sorted: ${currentIndex} / ${cards.length}`;

                            if (currentIndex < cards.length) {
                                cards[currentIndex].style.display = 'block';
                            } else {
                                handleComplete(true);
                            }
                        } else {
                            btn.classList.add('shake');
                            ui.error("Incorrect categorization!");
                            setTimeout(() => btn.classList.remove('shake'), 400);
                        }
                    });
                });
                break;
            }

            case 'match_transaction': {
                let selectedLeft = null;
                let selectedRight = null;
                let matchesCleared = 0;
                const lCol = find('.match-left-col');
                const rCol = find('.match-right-col');
                const status = find('.reconciled-status');

                const checkMatch = () => {
                    if (selectedLeft && selectedRight) {
                        const valL = selectedLeft.dataset.val;
                        const valR = selectedRight.dataset.val;

                        if (valL === valR) {
                            selectedLeft.style.visibility = 'hidden';
                            selectedRight.style.visibility = 'hidden';
                            selectedLeft.disabled = true;
                            selectedRight.disabled = true;
                            matchesCleared++;
                            status.textContent = `Matches cleared: ${matchesCleared} / 3`;

                            if (matchesCleared === 3) {
                                handleComplete(true);
                            }
                        } else {
                            selectedLeft.classList.remove('btn-primary');
                            selectedRight.classList.remove('btn-primary');
                            selectedLeft.classList.add('btn-danger', 'shake');
                            selectedRight.classList.add('btn-danger', 'shake');
                            const slL = selectedLeft;
                            const slR = selectedRight;
                            setTimeout(() => {
                                slL.classList.remove('btn-danger', 'shake');
                                slR.classList.remove('btn-danger', 'shake');
                                slL.classList.add('btn-secondary');
                                slR.classList.add('btn-secondary');
                            }, 600);
                        }

                        selectedLeft = null;
                        selectedRight = null;
                    }
                };

                lCol.querySelectorAll('.match-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        lCol.querySelectorAll('.match-btn').forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
                        btn.classList.replace('btn-secondary', 'btn-primary');
                        selectedLeft = btn;
                        checkMatch();
                    });
                });

                rCol.querySelectorAll('.match-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        rCol.querySelectorAll('.match-btn').forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
                        btn.classList.replace('btn-secondary', 'btn-primary');
                        selectedRight = btn;
                        checkMatch();
                    });
                });
                break;
            }

            case 'balance_cashflow': {
                const valAssets = parseInt(find('.val-assets').dataset.val);
                const valLiab = parseInt(find('.val-liabilities').dataset.val);
                const eqText = find('.val-equity');
                const valLiabEqText = find('.val-liab-equity');
                let currentEquity = 0;

                const updateSum = () => {
                    const sum = valLiab + currentEquity;
                    valLiabEqText.textContent = `$${sum}`;
                    eqText.textContent = `${currentEquity >= 0 ? '+' : ''}$${currentEquity}`;
                    eqText.dataset.val = currentEquity;

                    if (sum === valAssets) {
                        valLiabEqText.style.color = '#10b981';
                    } else {
                        valLiabEqText.style.color = '#ef4444';
                    }
                };

                updateSum();

                find('.btn-eq-up').addEventListener('click', () => {
                    currentEquity += 10;
                    updateSum();
                });

                find('.btn-eq-down').addEventListener('click', () => {
                    currentEquity -= 10;
                    updateSum();
                });

                find('.btn-submit-balance').addEventListener('click', () => {
                    const finalSum = valLiab + currentEquity;
                    if (finalSum === valAssets) {
                        handleComplete(true);
                    } else {
                        find('.btn-submit-balance').classList.add('shake');
                        ui.error("Equation does not balance! Total Assets must equal Liabilities + Equity.");
                        setTimeout(() => find('.btn-submit-balance').classList.remove('shake'), 400);
                    }
                });
                break;
            }
        }
    }

    completeSimulation(success) {
        setTimeout(() => {
            ui.closeModal();
            if (this.onCompleteCallback) {
                this.onCompleteCallback(success);
            }
        }, 600);
    }

    // Helper functions
    getRandomItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    shuffleArray(arr) {
        return [...arr].sort(() => Math.random() - 0.5);
    }
}

const workSimulation = new WorkSimulation();
export default workSimulation;
