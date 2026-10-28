/**
 * WorkSimulation.js - Interactive Mini-Simulations for Daily Employee Tasks
 * Revamped with modern UX: Swipe Cards, Drag Reorder, Slider, Drag-to-Sort.
 */

import ui from '../ui/UIManager.js';
import workTaskManager from '../core/databases/WorkTaskManager.js';

class WorkSimulation {
    constructor() {
        this.activeSim = null;
        this.task = null;
        this.onCompleteCallback = null;
    }

    start(task, onComplete) {
        this.task = task;
        this.onCompleteCallback = onComplete;
        ui.showModal({
            title: `🎮 ${task.label}`,
            content: this.generateSimHTML(task.id),
            onShow: () => {
                this.initSimLogic(task.id, document.getElementById('simulation-body-container') || document);
            }
        });
    }

    renderInline(taskId, container, onComplete) {
        container.innerHTML = this.generateSimHTML(taskId);
        this.initSimLogic(taskId, container, onComplete);
    }

    // ── HTML Templates ──────────────────────────────────────────────────────

    generateSimHTML(taskId) {
        let innerHTML = '';

        switch (taskId) {

            // ── 1. COMPILE REPORT: Drag & Reorder ─────────────────────────
            case 'compile_report': {
                const items = [
                    { id: 'title',    icon: '📝', label: 'I. Report Title & Header' },
                    { id: 'summary',  icon: '📋', label: 'II. Executive Summary' },
                    { id: 'analysis', icon: '📈', label: 'III. Financial Data Analysis' },
                    { id: 'signoff',  icon: '✍️', label: 'IV. Executive Sign-Off' },
                ];
                const shuffled = this.shuffleArray([...items]);

                innerHTML = `
                    <div style="text-align:center; margin-bottom:1.25rem;">
                        <span style="font-size:2.5rem;">📊</span>
                        <h4 style="margin:0.5rem 0; color:white; font-size:1rem;">Compile Report</h4>
                        <p style="font-size:0.78rem; color:var(--text-muted);">Urutkan bagian dokumen dalam urutan yang benar dengan menekan ▲ ▼</p>
                    </div>
                    <div class="sortable-list" style="display:flex; flex-direction:column; gap:0.5rem; user-select:none;">
                        ${shuffled.map((item, i) => `
                            <div class="sort-item" data-id="${item.id}" draggable="true"
                                style="display:flex; align-items:center; gap:0.75rem; background:rgba(255,255,255,0.06); border:1px solid var(--border-color); border-radius:10px; padding:0.75rem 1rem; cursor:grab; transition:all 0.2s; touch-action:none;">
                                <span style="font-size:1.1rem; width:28px; text-align:center; pointer-events:none;">${item.icon}</span>
                                <span style="flex:1; font-size:0.85rem; font-weight:600; color:white; pointer-events:none;">${item.label}</span>
                                <div style="display:flex; flex-direction:column; gap:2px;">
                                    <button class="sort-up" data-idx="${i}" style="background:rgba(255,255,255,0.08); border:none; color:white; border-radius:5px; width:28px; height:24px; cursor:pointer; font-size:0.8rem; line-height:1; display:flex; align-items:center; justify-content:center;">▲</button>
                                    <button class="sort-down" data-idx="${i}" style="background:rgba(255,255,255,0.08); border:none; color:white; border-radius:5px; width:28px; height:24px; cursor:pointer; font-size:0.8rem; line-height:1; display:flex; align-items:center; justify-content:center;">▼</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="sort-feedback" style="margin-top:0.875rem; min-height:18px; font-size:0.78rem; text-align:center; font-weight:700; color:var(--text-muted);"></div>
                    <button class="btn btn-primary sort-submit" style="width:100%; margin-top:0.875rem; font-weight:800; opacity:0.5; cursor:default;" disabled>✔ Submit Urutan</button>
                `;
                break;
            }

            // ── 2. DOCUMENT APPROVAL: Swipe Card ─────────────────────────
            case 'document_approval': {
                const docType = this.getRandomItem([
                    { desc: 'Contract proposal from supplier: Total cost $25,000. (Rule: Approve if under $30K)', approve: true },
                    { desc: 'Purchase requisition for high-end server: Total cost $45,000. (Rule: Approve if under $30K)', approve: false },
                    { desc: 'Employee requests 4 days of paid leave. (Rule: Approve if 5 days or less)', approve: true },
                    { desc: 'Manager requests 12 days emergency leave. (Rule: Approve if 5 days or less)', approve: false },
                    { desc: 'Vendor invoice for office supplies: $8,500. (Rule: Approve if under $10K)', approve: true },
                    { desc: 'New laptop purchase request: $3,200. (Rule: Approve if under $3,000)', approve: false },
                ]);
                innerHTML = this._swipeCardHTML('document_approval',
                    '✍️', 'Document Approval',
                    'Geser kanan = Approve, kiri = Reject',
                    docType.desc,
                    docType.approve,
                    'APPROVE ✅', 'REJECT ❌'
                );
                break;
            }

            // ── 3. VERIFY INVOICE: Swipe Card ─────────────────────────────
            case 'verify_invoice': {
                const invoice = this.getRandomItem([
                    { sub: 500,  tax: 50,  total: 550,  valid: true  },
                    { sub: 1000, tax: 100, total: 1100, valid: true  },
                    { sub: 250,  tax: 25,  total: 275,  valid: true  },
                    { sub: 800,  tax: 80,  total: 950,  valid: false },
                    { sub: 400,  tax: 40,  total: 420,  valid: false },
                    { sub: 1200, tax: 120, total: 1300, valid: false },
                ]);
                const cardContent = `
                    <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.875rem; text-align:left;">
                        Periksa apakah Total = Subtotal + Tax (Tax = 10%)
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <span style="font-size:0.88rem; color:var(--text-muted);">Subtotal:</span>
                        <strong style="color:white;">$${invoice.sub}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <span style="font-size:0.88rem; color:var(--text-muted);">Tax (10%):</span>
                        <strong style="color:white;">$${invoice.tax}</strong>
                    </div>
                    <hr style="border:none; border-top:1px solid rgba(255,255,255,0.1); margin:0.75rem 0;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700; color:white;">TOTAL DUE:</span>
                        <strong style="color:var(--accent-primary); font-size:1.1rem;">$${invoice.total}</strong>
                    </div>
                `;
                innerHTML = this._swipeCardHTML('verify_invoice',
                    '🧾', 'Verify Invoice',
                    'Geser kanan = Valid, kiri = Ada Error',
                    cardContent,
                    invoice.valid,
                    'VALID ✅', 'CONTAINS ERROR ❌',
                    true /* raw HTML content */
                );
                break;
            }

            // ── 4. DRAG DROP DATA: Swipe to Sort ─────────────────────────
            case 'drag_drop_data': {
                const items = this.shuffleArray([
                    { name: 'Founder Salary',         cat: 'expense', icon: '💼' },
                    { name: 'Stock Dividends',         cat: 'income',  icon: '📈' },
                    { name: 'Server Hosting Bill',     cat: 'expense', icon: '🖥️' },
                    { name: 'Consulting Fee Received', cat: 'income',  icon: '🤝' },
                    { name: 'Office Rent Payment',     cat: 'expense', icon: '🏢' },
                    { name: 'Cryptocurrency Profit',   cat: 'income',  icon: '₿' },
                ]);
                innerHTML = `
                    <div style="text-align:center; margin-bottom:1rem;">
                        <span style="font-size:2.5rem;">🗂️</span>
                        <h4 style="margin:0.5rem 0; color:white; font-size:1rem;">Data Categorization</h4>
                        <p style="font-size:0.78rem; color:var(--text-muted);">Geser kanan = INCOME 💵 &nbsp;|&nbsp; Geser kiri = EXPENSE 💸</p>
                    </div>

                    <!-- Progress -->
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.875rem; font-size:0.75rem; color:var(--text-muted);">
                        <span class="sort-counter">Item 1 / ${items.length}</span>
                        <span class="sort-score" style="color:var(--accent-primary); font-weight:700;">✓ 0 Sorted</span>
                    </div>

                    <!-- Swipe stack -->
                    <div class="swipe-stack" style="position:relative; height:110px; margin-bottom:1rem;">
                        ${items.map((item, i) => `
                            <div class="swipe-sort-card" data-cat="${item.cat}" data-idx="${i}"
                                style="position:absolute; inset:0; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); border-radius:14px; padding:1.25rem 1rem; display:${i === 0 ? 'flex' : 'none'}; align-items:center; gap:0.875rem; cursor:grab; touch-action:none; transition:box-shadow 0.2s; will-change:transform;">
                                <span style="font-size:2rem; pointer-events:none;">${item.icon}</span>
                                <span style="font-weight:700; font-size:0.95rem; color:white; pointer-events:none;">${item.name}</span>
                                <!-- Swipe overlays -->
                                <div class="swipe-label-right" style="position:absolute; right:14px; top:50%; transform:translateY(-50%); font-size:0.78rem; font-weight:900; color:#10b981; opacity:0; transition:opacity 0.15s; pointer-events:none;">INCOME ✅</div>
                                <div class="swipe-label-left" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); font-size:0.78rem; font-weight:900; color:#ef4444; opacity:0; transition:opacity 0.15s; pointer-events:none;">EXPENSE ❌</div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Manual tap buttons -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                        <button class="btn tap-expense" style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); color:#f87171; font-weight:800; border-radius:10px; padding:0.75rem; cursor:pointer; font-size:0.85rem; transition:all 0.2s;">💸 EXPENSE</button>
                        <button class="btn tap-income" style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); color:#34d399; font-weight:800; border-radius:10px; padding:0.75rem; cursor:pointer; font-size:0.85rem; transition:all 0.2s;">💵 INCOME</button>
                    </div>
                    <div class="sort-items-data" style="display:none;" data-items='${JSON.stringify(items.map(i => i.cat))}'></div>
                `;
                break;
            }

            // ── 5. MATCH TRANSACTION: Tap-to-Match (visual upgrade) ───────
            case 'match_transaction': {
                const pairs = this.shuffleArray([
                    { val: '1,240', id: 'A' },
                    { val: '485',   id: 'B' },
                    { val: '9,300', id: 'C' },
                ]);
                const rightShuffled = this.shuffleArray([...pairs]);
                innerHTML = `
                    <div style="text-align:center; margin-bottom:1rem;">
                        <span style="font-size:2.5rem;">🔗</span>
                        <h4 style="margin:0.5rem 0; color:white; font-size:1rem;">Reconcile Transactions</h4>
                        <p style="font-size:0.78rem; color:var(--text-muted);">Tap nilai Bank Statement, lalu tap nilai yang sama di Company Ledger.</p>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:0.5rem; align-items:center; margin-bottom:1.25rem;">
                        <!-- Left col -->
                        <div>
                            <div style="font-size:0.65rem; text-align:center; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.5rem;">Bank Statement</div>
                            <div style="display:flex; flex-direction:column; gap:0.5rem;" class="match-left-col">
                                ${pairs.map(p => `
                                    <button class="match-btn left-btn" data-val="${p.id}"
                                        style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:white; border-radius:10px; padding:0.7rem 0.5rem; font-weight:700; font-size:0.88rem; cursor:pointer; transition:all 0.2s; width:100%;">
                                        $${p.val}
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Center connector area -->
                        <div style="display:flex; flex-direction:column; gap:0.5rem; align-items:center;" class="connector-col">
                            ${pairs.map(p => `
                                <div class="connector-line" data-id="${p.id}"
                                    style="width:28px; height:40px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.15); font-size:1.1rem; transition:all 0.3s;">
                                    ──
                                </div>
                            `).join('')}
                        </div>

                        <!-- Right col -->
                        <div>
                            <div style="font-size:0.65rem; text-align:center; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.5rem;">Company Ledger</div>
                            <div style="display:flex; flex-direction:column; gap:0.5rem;" class="match-right-col">
                                ${rightShuffled.map(p => `
                                    <button class="match-btn right-btn" data-val="${p.id}"
                                        style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:white; border-radius:10px; padding:0.7rem 0.5rem; font-weight:700; font-size:0.88rem; cursor:pointer; transition:all 0.2s; width:100%;">
                                        $${p.val}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="reconciled-status" style="text-align:center; font-size:0.8rem; color:var(--text-muted); padding:0.5rem; background:rgba(255,255,255,0.03); border-radius:8px;">
                        Matches cleared: <strong class="match-count" style="color:var(--accent-primary);">0</strong> / 3
                    </div>
                `;
                break;
            }

            // ── 6. BALANCE CASHFLOW: Slider ───────────────────────────────
            case 'balance_cashflow': {
                const targetAssets = this.getRandomItem([300, 450, 600, 750, 900, 1200]);
                const liab = targetAssets - this.getRandomItem([50, 100, 150, 75, 125]);
                const neededEquity = targetAssets - liab;
                const sliderMin = -200;
                const sliderMax = neededEquity + 200;
                innerHTML = `
                    <div style="text-align:center; margin-bottom:1.25rem;">
                        <span style="font-size:2.5rem;">⚖️</span>
                        <h4 style="margin:0.5rem 0; color:white; font-size:1rem;">Balance Sheet Cashflow</h4>
                        <p style="font-size:0.78rem; color:var(--text-muted); margin:0;">Geser slider hingga <strong style="color:white;">Assets = Liabilities + Equity</strong></p>
                    </div>

                    <!-- The equation display -->
                    <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:0.5rem; align-items:stretch; margin-bottom:1.25rem; text-align:center;">
                        <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:0.875rem;">
                            <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.25rem;">Total Assets</div>
                            <div style="font-size:1.4rem; font-weight:900; color:white;">$${targetAssets}</div>
                        </div>
                        <div style="display:flex; align-items:center; color:var(--text-muted); font-size:1.2rem; font-weight:700; padding:0 0.25rem;">=</div>
                        <div class="rhs-box" style="background:rgba(255,255,255,0.04); border:2px solid rgba(255,255,255,0.12); border-radius:12px; padding:0.875rem; transition:border-color 0.3s;">
                            <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.25rem;">Liab + Equity</div>
                            <div class="rhs-value" style="font-size:1.4rem; font-weight:900; color:#ef4444; transition:color 0.3s;">$${liab}</div>
                        </div>
                    </div>

                    <!-- Breakdown -->
                    <div style="background:rgba(255,255,255,0.03); border:1px dashed rgba(255,255,255,0.1); border-radius:12px; padding:0.875rem; margin-bottom:1.25rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; font-size:0.85rem;">
                            <span style="color:var(--text-muted);">Liabilities <span style="font-size:0.7rem;">(fixed)</span></span>
                            <strong style="color:white;">$${liab}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
                            <span style="color:var(--text-muted);">Equity <span style="font-size:0.7rem;">(adjustable)</span></span>
                            <strong class="equity-display" style="color:var(--accent-primary); font-size:1rem; font-weight:900;">$0</strong>
                        </div>

                        <!-- Slider -->
                        <div style="margin-top:1rem; padding:0 0.25rem;">
                            <input type="range" class="equity-slider"
                                min="${sliderMin}" max="${sliderMax}" value="0" step="5"
                                style="width:100%; height:6px; accent-color:var(--accent-primary); cursor:pointer;">
                            <div style="display:flex; justify-content:space-between; font-size:0.65rem; color:var(--text-dim); margin-top:0.25rem;">
                                <span>$${sliderMin}</span>
                                <span>$${sliderMax}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Feedback bar -->
                    <div class="balance-feedback" style="text-align:center; font-size:0.8rem; color:var(--text-muted); margin-bottom:0.875rem; min-height:20px; font-weight:600;">
                        Sesuaikan slider untuk menyeimbangkan...
                    </div>

                    <button class="btn btn-primary btn-submit-balance" style="width:100%; font-weight:800; opacity:0.4; cursor:default;" disabled
                        data-assets="${targetAssets}" data-liab="${liab}">
                        ⚖️ SUBMIT BALANCE SHEET
                    </button>
                `;
                break;
            }
        }

        return `<div style="padding:0.25rem 0.5rem;" class="simulation-body-container">${innerHTML}</div>`;
    }

    // ── Swipe Card Template Helper ─────────────────────────────────────────
    _swipeCardHTML(taskId, icon, title, hint, content, correctRight, labelRight, labelLeft, rawContent = false) {
        const cardBody = rawContent ? content : `<p style="font-size:0.88rem; color:white; line-height:1.6; text-align:center;">"${content}"</p>`;
        return `
            <div style="text-align:center; margin-bottom:1.25rem;">
                <span style="font-size:2.5rem;">${icon}</span>
                <h4 style="margin:0.5rem 0; color:white; font-size:1rem;">${title}</h4>
                <p style="font-size:0.78rem; color:var(--text-muted);">${hint}</p>
            </div>

            <!-- Swipe direction hints -->
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.7rem; font-weight:700;">
                <span style="color:#ef4444; opacity:0.6;">← ${labelLeft}</span>
                <span style="color:#10b981; opacity:0.6;">${labelRight} →</span>
            </div>

            <!-- Swipeable card -->
            <div class="swipe-card-wrapper" style="position:relative; margin-bottom:1.25rem;">
                <div class="swipe-card" data-correct="${correctRight}"
                    style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:16px; padding:1.5rem; cursor:grab; touch-action:none; will-change:transform; transition:box-shadow 0.2s; user-select:none; min-height:90px; display:flex; flex-direction:column; justify-content:center; position:relative; overflow:hidden;">
                    <!-- Swipe overlays -->
                    <div class="swipe-overlay-right" style="position:absolute; inset:0; background:rgba(16,185,129,0.12); border-radius:16px; opacity:0; transition:opacity 0.15s; display:flex; align-items:center; justify-content:flex-end; padding:1.5rem; pointer-events:none;">
                        <span style="font-size:0.88rem; font-weight:900; color:#10b981;">${labelRight} →</span>
                    </div>
                    <div class="swipe-overlay-left" style="position:absolute; inset:0; background:rgba(239,68,68,0.12); border-radius:16px; opacity:0; transition:opacity 0.15s; display:flex; align-items:center; justify-content:flex-start; padding:1.5rem; pointer-events:none;">
                        <span style="font-size:0.88rem; font-weight:900; color:#ef4444;">← ${labelLeft}</span>
                    </div>
                    <!-- Content -->
                    ${cardBody}
                </div>
            </div>

            <!-- Manual buttons -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                <button class="swipe-btn-left btn" style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); color:#f87171; font-weight:800; border-radius:10px; padding:0.75rem; cursor:pointer; font-size:0.85rem; transition:all 0.2s;">← ${labelLeft}</button>
                <button class="swipe-btn-right btn" style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); color:#34d399; font-weight:800; border-radius:10px; padding:0.75rem; cursor:pointer; font-size:0.85rem; transition:all 0.2s;">${labelRight} →</button>
            </div>
        `;
    }

    // ── Event Logic ─────────────────────────────────────────────────────────

    initSimLogic(taskId, container = document, onComplete = null) {
        const handleComplete = (success) => {
            if (onComplete) onComplete(success);
            else this.completeSimulation(success);
        };
        const find  = (sel) => container.querySelector(sel);
        const findAll = (sel) => container.querySelectorAll(sel);

        switch (taskId) {

            // ── COMPILE REPORT: Drag & Sort with ▲▼ ──────────────────────
            case 'compile_report': {
                const TARGET = ['title', 'summary', 'analysis', 'signoff'];
                const list = find('.sortable-list');
                const feedback = find('.sort-feedback');
                const submitBtn = find('.sort-submit');

                const getOrder = () => Array.from(list.querySelectorAll('.sort-item')).map(el => el.dataset.id);

                const checkOrder = () => {
                    const current = getOrder();
                    const correct = current.every((id, i) => id === TARGET[i]);
                    if (correct) {
                        feedback.textContent = '🎉 Urutan sudah benar!';
                        feedback.style.color = '#10b981';
                        submitBtn.disabled = false;
                        submitBtn.style.opacity = '1';
                        submitBtn.style.cursor = 'pointer';
                    } else {
                        feedback.textContent = 'Urutkan hingga benar, lalu Submit.';
                        feedback.style.color = 'var(--text-muted)';
                        submitBtn.disabled = true;
                        submitBtn.style.opacity = '0.5';
                        submitBtn.style.cursor = 'default';
                    }
                };

                // ▲ ▼ button logic
                list.addEventListener('click', (e) => {
                    const upBtn = e.target.closest('.sort-up');
                    const downBtn = e.target.closest('.sort-down');
                    const btn = upBtn || downBtn;
                    if (!btn) return;

                    const items = Array.from(list.querySelectorAll('.sort-item'));
                    const item = btn.closest('.sort-item');
                    const idx = items.indexOf(item);

                    if (upBtn && idx > 0) {
                        list.insertBefore(item, items[idx - 1]);
                    } else if (downBtn && idx < items.length - 1) {
                        list.insertBefore(items[idx + 1], item);
                    }

                    // Update button indices
                    Array.from(list.querySelectorAll('.sort-item')).forEach((el, i) => {
                        el.querySelector('.sort-up').dataset.idx   = i;
                        el.querySelector('.sort-down').dataset.idx = i;
                    });
                    checkOrder();
                });

                // Drag & Drop (desktop)
                this._initDragSort(list, checkOrder);

                submitBtn.addEventListener('click', () => {
                    if (getOrder().every((id, i) => id === TARGET[i])) {
                        handleComplete(true);
                    }
                });

                checkOrder();
                break;
            }

            // ── SWIPE CARD: Document Approval ─────────────────────────────
            case 'document_approval':
            case 'verify_invoice': {
                const card = find('.swipe-card');
                const correctRight = card.dataset.correct === 'true';

                const decide = (isRight) => {
                    const correct = (isRight === correctRight);
                    const overlay = isRight ? find('.swipe-overlay-right') : find('.swipe-overlay-left');
                    overlay.style.opacity = '1';
                    card.style.transform = `translateX(${isRight ? 80 : -80}px) rotate(${isRight ? 8 : -8}deg)`;
                    card.style.transition = 'transform 0.35s ease, opacity 0.35s';
                    card.style.opacity = '0';
                    setTimeout(() => handleComplete(correct), 400);
                };

                // Swipe gesture
                this._initSwipe(card,
                    () => decide(true),  // swipe right
                    () => decide(false), // swipe left
                    (ratio) => {         // onDrag
                        const oR = find('.swipe-overlay-right');
                        const oL = find('.swipe-overlay-left');
                        oR.style.opacity = ratio > 0 ? Math.min(ratio, 1) : 0;
                        oL.style.opacity = ratio < 0 ? Math.min(-ratio, 1) : 0;
                    }
                );

                find('.swipe-btn-right').addEventListener('click', () => decide(true));
                find('.swipe-btn-left').addEventListener('click',  () => decide(false));
                break;
            }

            // ── DRAG DROP DATA: Swipe to Sort ────────────────────────────
            case 'drag_drop_data': {
                const rawItems = JSON.parse(find('.sort-items-data').dataset.items);
                const cards = Array.from(findAll('.swipe-sort-card'));
                const counter = find('.sort-counter');
                const scoreEl = find('.sort-score');
                let currentIdx = 0;
                let correctCount = 0;

                const advance = (chosenCat) => {
                    const card = cards[currentIdx];
                    const correct = card.dataset.cat === chosenCat;
                    // Animate card out
                    const dir = chosenCat === 'income' ? 1 : -1;
                    card.style.transition = 'transform 0.3s ease, opacity 0.3s';
                    card.style.transform = `translateX(${dir * 120}px) rotate(${dir * 10}deg)`;
                    card.style.opacity = '0';

                    setTimeout(() => {
                        card.style.display = 'none';
                        currentIdx++;
                        correctCount += correct ? 1 : 0;
                        scoreEl.textContent = `✓ ${correctCount} Sorted`;

                        if (currentIdx < cards.length) {
                            const next = cards[currentIdx];
                            next.style.transform = 'translateX(0) rotate(0)';
                            next.style.opacity = '1';
                            next.style.transition = '';
                            next.style.display = 'flex';
                            counter.textContent = `Item ${currentIdx + 1} / ${rawItems.length}`;
                        } else {
                            handleComplete(correctCount >= rawItems.length - 1);
                        }
                    }, 300);
                };

                // Swipe on current card
                cards.forEach((card, idx) => {
                    if (idx !== 0) return;
                    this._initSwipe(card,
                        () => advance('income'),
                        () => advance('expense'),
                        (ratio) => {
                            const rLabel = card.querySelector('.swipe-label-right');
                            const lLabel = card.querySelector('.swipe-label-left');
                            if (rLabel) rLabel.style.opacity = ratio > 0 ? Math.min(ratio * 2, 1) : 0;
                            if (lLabel) lLabel.style.opacity = ratio < 0 ? Math.min(-ratio * 2, 1) : 0;
                        }
                    );
                });

                find('.tap-income').addEventListener('click',  () => { if (currentIdx < cards.length) advance('income'); });
                find('.tap-expense').addEventListener('click', () => { if (currentIdx < cards.length) advance('expense'); });

                // Re-init swipe when card changes
                const origAdvance = advance;
                const reinitSwipe = () => {
                    if (currentIdx < cards.length) {
                        this._initSwipe(cards[currentIdx],
                            () => origAdvance('income'),
                            () => origAdvance('expense'),
                            (ratio) => {
                                const card = cards[currentIdx];
                                if (!card) return;
                                const rLabel = card.querySelector('.swipe-label-right');
                                const lLabel = card.querySelector('.swipe-label-left');
                                if (rLabel) rLabel.style.opacity = ratio > 0 ? Math.min(ratio * 2, 1) : 0;
                                if (lLabel) lLabel.style.opacity = ratio < 0 ? Math.min(-ratio * 2, 1) : 0;
                            }
                        );
                    }
                };

                // Override advance to reinit swipe
                find('.tap-income').addEventListener('click',  () => setTimeout(reinitSwipe, 310));
                find('.tap-expense').addEventListener('click', () => setTimeout(reinitSwipe, 310));
                break;
            }

            // ── MATCH TRANSACTION: Tap Left then Right ────────────────────
            case 'match_transaction': {
                let selectedLeft  = null;
                let matchesCleared = 0;
                const matchCount = find('.match-count');

                const setHighlight = (btn, on) => {
                    btn.style.background  = on ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)';
                    btn.style.borderColor = on ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.12)';
                    btn.style.color       = on ? '#fbbf24' : 'white';
                };
                const setMatched = (btn) => {
                    btn.style.background  = 'rgba(16,185,129,0.15)';
                    btn.style.borderColor = 'rgba(16,185,129,0.4)';
                    btn.style.color       = '#34d399';
                    btn.disabled = true;
                    btn.textContent = '✓ ' + btn.textContent;
                };
                const setError = (btn) => {
                    btn.style.background  = 'rgba(239,68,68,0.15)';
                    btn.style.borderColor = 'rgba(239,68,68,0.4)';
                    btn.style.color       = '#f87171';
                    btn.style.animation   = 'shake 0.35s';
                    setTimeout(() => {
                        btn.style.animation = '';
                        setHighlight(btn, false);
                    }, 400);
                };

                findAll('.left-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (btn.disabled) return;
                        findAll('.left-btn').forEach(b => { if (!b.disabled) setHighlight(b, false); });
                        setHighlight(btn, true);
                        selectedLeft = btn;
                    });
                });

                findAll('.right-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (btn.disabled || !selectedLeft) return;
                        if (btn.dataset.val === selectedLeft.dataset.val) {
                            // Match!
                            setMatched(selectedLeft);
                            setMatched(btn);
                            // Update connector line
                            const line = find(`.connector-line[data-id="${btn.dataset.val}"]`);
                            if (line) {
                                line.textContent = '✓';
                                line.style.color = '#10b981';
                                line.style.fontWeight = '900';
                                line.style.fontSize = '1rem';
                            }
                            matchesCleared++;
                            matchCount.textContent = matchesCleared;
                            selectedLeft = null;
                            if (matchesCleared === 3) handleComplete(true);
                        } else {
                            // Mismatch
                            setError(selectedLeft);
                            setError(btn);
                            selectedLeft = null;
                        }
                    });
                });
                break;
            }

            // ── BALANCE CASHFLOW: Slider ──────────────────────────────────
            case 'balance_cashflow': {
                const submitBtn = find('.btn-submit-balance');
                const slider    = find('.equity-slider');
                const eqDisplay = find('.equity-display');
                const rhsValue  = find('.rhs-value');
                const rhsBox    = find('.rhs-box');
                const feedbackEl = find('.balance-feedback');
                const assets    = parseInt(submitBtn.dataset.assets);
                const liab      = parseInt(submitBtn.dataset.liab);

                const update = () => {
                    const equity = parseInt(slider.value);
                    const rhs    = liab + equity;
                    eqDisplay.textContent = `${equity >= 0 ? '+' : ''}$${equity}`;
                    rhsValue.textContent  = `$${rhs}`;

                    const balanced = rhs === assets;
                    const diff = assets - rhs;

                    rhsValue.style.color  = balanced ? '#10b981' : '#ef4444';
                    rhsBox.style.borderColor = balanced ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.12)';

                    if (balanced) {
                        feedbackEl.textContent   = '✅ Balance sheet balanced! Klik Submit.';
                        feedbackEl.style.color   = '#10b981';
                        submitBtn.disabled       = false;
                        submitBtn.style.opacity  = '1';
                        submitBtn.style.cursor   = 'pointer';
                    } else {
                        feedbackEl.textContent   = diff > 0 ? `▲ Naikkan Equity sebesar $${diff}` : `▼ Turunkan Equity sebesar $${Math.abs(diff)}`;
                        feedbackEl.style.color   = 'var(--text-muted)';
                        submitBtn.disabled       = true;
                        submitBtn.style.opacity  = '0.4';
                        submitBtn.style.cursor   = 'default';
                    }
                };

                slider.addEventListener('input', update);
                update();

                submitBtn.addEventListener('click', () => {
                    const equity = parseInt(slider.value);
                    if (liab + equity === assets) handleComplete(true);
                });
                break;
            }
        }
    }

    // ── Reusable: Swipe Gesture ─────────────────────────────────────────────
    _initSwipe(el, onSwipeRight, onSwipeLeft, onDrag) {
        let startX = null;
        let startY = null;
        let dragging = false;
        const THRESHOLD = 80; // px before triggering
        const RATIO_DIV = 150;

        const start = (x, y) => { startX = x; startY = y; dragging = true; };
        const move  = (x, y) => {
            if (!dragging || startX === null) return;
            const dx = x - startX;
            const dy = y - startY;
            // Ignore if mostly vertical
            if (Math.abs(dy) > Math.abs(dx) * 1.5) return;
            el.style.transform = `translateX(${dx}px) rotate(${dx * 0.04}deg)`;
            el.style.transition = 'none';
            if (onDrag) onDrag(dx / RATIO_DIV);
        };
        const end = (x) => {
            if (!dragging) return;
            dragging = false;
            const dx = x - startX;
            el.style.transition = 'transform 0.3s ease';
            if (dx > THRESHOLD) {
                el.style.transform = `translateX(150px) rotate(12deg)`;
                setTimeout(onSwipeRight, 300);
            } else if (dx < -THRESHOLD) {
                el.style.transform = `translateX(-150px) rotate(-12deg)`;
                setTimeout(onSwipeLeft, 300);
            } else {
                el.style.transform = 'translateX(0) rotate(0)';
                if (onDrag) onDrag(0);
            }
            startX = null;
        };

        // Touch
        el.addEventListener('touchstart', e => start(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
        el.addEventListener('touchmove',  e => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
        el.addEventListener('touchend',   e => end(e.changedTouches[0].clientX));

        // Mouse
        el.addEventListener('mousedown', e => { start(e.clientX, e.clientY); e.preventDefault(); });
        window.addEventListener('mousemove', e => { if (dragging) move(e.clientX, e.clientY); });
        window.addEventListener('mouseup',   e => { if (dragging) end(e.clientX); });
    }

    // ── Reusable: Drag-to-Sort List ─────────────────────────────────────────
    _initDragSort(list, onChange) {
        let draggingEl = null;

        list.addEventListener('dragstart', e => {
            draggingEl = e.target.closest('.sort-item');
            if (draggingEl) {
                draggingEl.style.opacity = '0.4';
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        list.addEventListener('dragend', () => {
            if (draggingEl) draggingEl.style.opacity = '1';
            draggingEl = null;
            onChange();
        });

        list.addEventListener('dragover', e => {
            e.preventDefault();
            const target = e.target.closest('.sort-item');
            if (!target || target === draggingEl) return;
            const rect = target.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            if (e.clientY < midY) {
                list.insertBefore(draggingEl, target);
            } else {
                list.insertBefore(draggingEl, target.nextSibling);
            }
        });
    }

    // ── Misc ────────────────────────────────────────────────────────────────
    completeSimulation(success) {
        setTimeout(() => {
            ui.closeModal();
            if (this.onCompleteCallback) this.onCompleteCallback(success);
        }, 600);
    }

    getRandomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    shuffleArray(arr)  { return [...arr].sort(() => Math.random() - 0.5); }
}

const workSimulation = new WorkSimulation();
export default workSimulation;
