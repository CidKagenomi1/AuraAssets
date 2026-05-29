/**
 * FinancePanel.js - Unified Financial Summary & Portfolio Panel with ECharts Cashflow Forecast
 */

import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../core/GameState.js';
import ui from '../../ui/UIManager.js';
import stockMarket from '../../trading/StockMarket.js';
import cryptoMarket from '../../trading/CryptoMarket.js';
import propertyManager from '../../property/PropertyManager.js';
import roleManager from '../../core/RoleManager.js';
import workTaskManager from '../../core/databases/WorkTaskManager.js';
import viewManager from '../../ui/ViewManager.js';

class FinancePanel {
    constructor() {
        this.activeTab = 'cashflow';
        this.chart = null;
        this.resizeHandler = null;
        this.historyData = [];

        // Dynamic updates for portfolio when in view
        gameState.on('stockBuy', () => this.updatePortfolioTabHTML());
        gameState.on('stockSell', () => this.updatePortfolioTabHTML());
        gameState.on('cryptoBuy', () => this.updatePortfolioTabHTML());
        gameState.on('cryptoSell', () => this.updatePortfolioTabHTML());
        gameState.on('propertyUpdate', () => this.updatePortfolioTabHTML());
    }

    updatePortfolioTabHTML() {
        const dynamicContent = document.getElementById('fp-tab-portfolio-content');
        if (!dynamicContent || dynamicContent.style.display === 'none') return;
        this.renderPortfolioTabContent();
    }

    show(initialTab = 'cashflow') {
        this.activeTab = initialTab;
        viewManager.activeDynamicTab = initialTab;

        const summary = financeManager.getMonthlySummary();
        const transactions = financeManager.getRecentTransactions(30);

        const workState = gameState.get('work') || {};
        const totalTasks = workState.totalTasksDone || 0;
        const careerLevel = workState.careerLevel || 1;
        const bizState = gameState.get('business') || {};
        const playerRole = gameState.get('player.role') || 'karyawan';
        
        // Calculate Net Worth for Cashflow Tab display
        const balance = gameState.getBalance();
        const totalStockValue = stockMarket.getPortfolioValue() || 0;
        const totalCryptoValue = cryptoMarket.getWalletValue() || 0;
        const totalPropertyValue = propertyManager.getTotalPropertyValue() || 0;
        const loans = gameState.get('loans') || [];
        const totalDebt = loans.reduce((sum, loan) => sum + (loan.remaining || 0), 0);
        const totalAssets = balance + totalStockValue + totalCryptoValue + totalPropertyValue;
        const totalNetWorth = totalAssets - totalDebt;
        
        const achievementsList = [
            {
                name: 'Intern Survivor',
                desc: 'Selesaikan 10 tugas kantor harian',
                icon: '🌱',
                unlocked: totalTasks >= 10
            },
            {
                name: 'Rising Star',
                desc: 'Capai level karir 4 (Team Lead / Asst. Director)',
                icon: '🌟',
                unlocked: careerLevel >= 4
            },
            {
                name: 'Elite Executive',
                desc: 'Capai level karir 8 (CEO / Menteri)',
                icon: '👑',
                unlocked: careerLevel >= 8
            },
            {
                name: 'Capital Pioneer',
                desc: 'Mendirikan bisnis pertama',
                icon: '🏢',
                unlocked: !!bizState.active
            },
            {
                name: 'Market Unicorn',
                desc: 'Valuasi bisnis mencapai $1.000.000',
                icon: '🦄',
                unlocked: bizState.active && (bizState.valuation >= 1000000)
            },
            {
                name: 'Empire Builder',
                desc: 'Miliki 2+ anak perusahaan holding',
                icon: '🐙',
                unlocked: bizState.active && bizState.subsidiaries && (bizState.subsidiaries.length >= 2)
            },
            {
                name: 'Go Public Listed',
                desc: 'Sukses melakukan IPO perusahaan',
                icon: '🔔',
                unlocked: bizState.active && bizState.ipo && bizState.ipo.active
            },
            {
                name: 'Survivor Ultimate',
                desc: 'Bermain menggunakan Peran Survivor',
                icon: '💀',
                unlocked: playerRole === 'survivor'
            }
        ];

        const careerHistory = [...(workState.history || [])].reverse();

        // Generate dynamic history data for the last 12 months
        const currentMonth = gameState.get('gameTime.month') || 1;
        const currentYear = gameState.get('gameTime.year') || 2010;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const historyData = [];

        for (let i = 11; i >= 0; i--) {
            let m = currentMonth - i;
            let y = currentYear;
            if (m <= 0) {
                m += 12;
                y -= 1;
            }
            historyData.push({
                month: m,
                year: y,
                label: `${monthNames[m - 1]} ${y}`,
                income: 0,
                expenses: 0,
                liabilities: 0,
                assets: 0,
                otherIncome: 0,
                bankAtEnd: 0
            });
        }

        const allTransactions = gameState.get('transactions') || [];
        const oldestTx = allTransactions[allTransactions.length - 1];
        const initialBalance = oldestTx ? (oldestTx.balance - (oldestTx.amount || 0)) : gameState.getBalance();

        historyData.forEach((h, idx) => {
            const monthTx = allTransactions.filter(t => t.gameTime?.month === h.month && t.gameTime?.year === h.year);

            h.income = monthTx
                .filter(t => t.amount > 0 && t.category !== 'Top Up' && t.category !== 'loan_received')
                .reduce((sum, t) => sum + t.amount, 0);

            h.otherIncome = monthTx
                .filter(t => t.amount > 0 && (t.category === 'Top Up' || t.category === 'loan_received'))
                .reduce((sum, t) => sum + t.amount, 0);

            h.expenses = monthTx
                .filter(t => t.amount < 0 && t.category !== 'loan_payment' && t.category !== 'loan_payoff' && t.category !== 'savings_deposit')
                .reduce((sum, t) => sum + t.amount, 0);

            h.liabilities = monthTx
                .filter(t => t.amount < 0 && (t.category === 'loan_payment' || t.category === 'loan_payoff'))
                .reduce((sum, t) => sum + t.amount, 0);

            h.assets = monthTx
                .filter(t => t.category === 'savings_deposit')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            if (monthTx.length > 0) {
                h.bankAtEnd = monthTx[0].balance || 0;
            } else {
                if (idx > 0) {
                    h.bankAtEnd = historyData[idx - 1].bankAtEnd;
                } else {
                    const beforeTx = allTransactions.find(t => {
                        const tVal = (t.gameTime?.year || 0) * 12 + (t.gameTime?.month || 0);
                        const hVal = h.year * 12 + h.month;
                        return tVal < hVal;
                    });
                    h.bankAtEnd = beforeTx ? (beforeTx.balance || 0) : initialBalance;
                }
            }
        });

        this.historyData = historyData;

        // Unified layout shell with Tab Navigation at the top
        const content = `
            <div class="hybrid-page-container" style="padding: 1.5rem; max-width: 1280px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 1rem;">
                
                <style>
                    .fp-tab-group {
                        display: flex;
                        gap: 0.75rem;
                        border-bottom: 1px solid rgba(255,255,255,0.06);
                        padding-bottom: 0.75rem;
                        margin-bottom: 0.5rem;
                    }
                    .fp-tab-btn {
                        background: none;
                        border: 1px solid transparent;
                        color: rgba(255,255,255,0.4);
                        font-size: 0.95rem;
                        font-weight: 800;
                        padding: 8px 16px;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 0.4rem;
                    }
                    .fp-tab-btn:hover {
                        color: #fff;
                        background: rgba(255,255,255,0.02);
                    }
                    .fp-tab-btn.active {
                        color: var(--accent-primary);
                        background: rgba(16, 185, 129, 0.1);
                        border-color: rgba(16, 185, 129, 0.2);
                        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.05);
                    }

                    .fp-hero-stat {
                        background: rgba(255,255,255,0.02);
                        border: 1px solid rgba(255,255,255,0.07);
                        border-radius: 16px;
                        padding: 1.25rem 1.5rem;
                        position: relative;
                        overflow: hidden;
                        transition: all 0.25s;
                    }
                    .fp-hero-stat:hover {
                        border-color: rgba(255,255,255,0.14);
                        transform: translateY(-2px);
                        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                    }
                    .fp-hero-stat::before {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        height: 3px;
                        border-radius: 0 0 16px 16px;
                    }
                    .fp-hero-stat.income::before { background: linear-gradient(to right, #10b981, #059669); }
                    .fp-hero-stat.expense::before { background: linear-gradient(to right, #ef4444, #dc2626); }
                    .fp-hero-stat.net::before { background: linear-gradient(to right, #6366f1, #818cf8); }
                    .fp-section-header {
                        display: flex;
                        align-items: center;
                        gap: 0.6rem;
                        margin-bottom: 1.25rem;
                        padding-bottom: 0.75rem;
                        border-bottom: 1px solid rgba(255,255,255,0.06);
                    }
                    .fp-section-title {
                        font-size: 0.95rem;
                        font-weight: 800;
                        color: #fff;
                        letter-spacing: -0.01em;
                    }
                    .fp-cat-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0.6rem 0;
                        border-bottom: 1px solid rgba(255,255,255,0.04);
                        transition: all 0.2s;
                    }
                    .fp-cat-row:last-child { border-bottom: none; }
                    .fp-cat-row:hover { padding-left: 4px; }
                    .fp-tx-row {
                        display: flex;
                        align-items: center;
                        gap: 0.875rem;
                        padding: 0.75rem;
                        border-radius: 10px;
                        background: rgba(255,255,255,0.01);
                        border: 1px solid transparent;
                        transition: all 0.2s;
                        margin-bottom: 0.5rem;
                    }
                    .fp-tx-row:hover {
                        background: rgba(255,255,255,0.03);
                        border-color: rgba(255,255,255,0.06);
                    }
                    .fp-tx-icon {
                        width: 38px;
                        height: 38px;
                        border-radius: 10px;
                        background: rgba(255,255,255,0.04);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.25rem;
                        flex-shrink: 0;
                    }
                    .fp-badge-unlocked {
                        background: rgba(251,191,36,0.08);
                        border: 1px solid rgba(251,191,36,0.25);
                        border-radius: 12px;
                        padding: 0.75rem;
                        text-align: center;
                        transition: all 0.25s;
                        cursor: default;
                    }
                    .fp-badge-unlocked:hover {
                        background: rgba(251,191,36,0.12);
                        transform: translateY(-3px);
                        box-shadow: 0 8px 20px rgba(251,191,36,0.1);
                    }
                    .fp-badge-locked {
                        background: rgba(255,255,255,0.02);
                        border: 1px solid rgba(255,255,255,0.05);
                        border-radius: 12px;
                        padding: 0.75rem;
                        text-align: center;
                        opacity: 0.35;
                    }
                    .fp-timeline-dot {
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        background: rgba(255,255,255,0.03);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1rem;
                        flex-shrink: 0;
                    }
                    .fp-card {
                        background: rgba(0,0,0,0.25);
                        border: 1px solid rgba(255,255,255,0.07);
                        border-radius: 18px;
                        padding: 1.5rem;
                    }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @media (max-width: 768px) {
                        .fp-two-col { grid-template-columns: 1fr !important; }
                        .fp-three-col { grid-template-columns: 1fr 1fr !important; }
                        .fp-four-col { grid-template-columns: 1fr 1fr !important; }
                        .fp-achievement-cols { grid-template-columns: 1fr !important; }
                    }
                    @media (max-width: 580px) {
                        .fp-three-col { grid-template-columns: 1fr !important; }
                        .fp-four-col { grid-template-columns: 1fr !important; }
                    }
                </style>

                <!-- Tab Header Group -->
                <div class="fp-tab-group">
                    <button class="fp-tab-btn" id="fp-tab-btn-cashflow" data-fp-tab="cashflow">
                        <span>📈</span> Arus Kas & Karir
                    </button>
                    <button class="fp-tab-btn" id="fp-tab-btn-portfolio" data-fp-tab="portfolio">
                        <span>💼</span> Portofolio & Aset
                    </button>
                </div>

                <!-- ================= TAB CONTENT: CASHFLOW & CAREER ================= -->
                <div id="fp-tab-cashflow-content" style="display: none; flex-direction: column; gap: 1.75rem;">
                    <!-- Chart Card -->
                    <div class="fp-card" style="background: linear-gradient(135deg, rgba(10,10,14,0.9), rgba(6,182,212,0.04));">
                        <div class="fp-section-header">
                            <div style="width:32px; height:32px; background:rgba(6,182,212,0.12); border:1px solid rgba(6,182,212,0.25); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1rem;">📊</div>
                            <div>
                                <div class="fp-section-title">Analisis & Proyeksi Arus Kas</div>
                                <div style="font-size:0.72rem; color:rgba(255,255,255,0.35); margin-top:1px;">12-bulan terakhir — data langsung dari transaksi</div>
                            </div>
                        </div>
                        <div id="finance-chart" style="width: 100%; height: 440px; min-height: 380px;">
                            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-size: 0.9rem; gap: 0.5rem;">
                                <span style="animation: spin 1s linear infinite; display:inline-block;">⟳</span> Memuat Grafik Analisis Keuangan...
                            </div>
                        </div>
                    </div>

                    <!-- Monthly Summary Hero Stats -->
                    <div class="fp-four-col" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
                        <div class="fp-hero-stat net" style="border-color:rgba(99,102,241,0.25);">
                            <div style="font-size:0.68rem; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:0.5rem;">👑 Kekayaan Bersih</div>
                            <div style="font-size:1.85rem; font-weight:900; color:#818cf8; letter-spacing:-0.02em; line-height:1;">$ ${financeManager.formatCurrency(totalNetWorth, true)}</div>
                            <div style="margin-top:0.6rem; height:4px; background:rgba(99,102,241,0.1); border-radius:2px; overflow:hidden;">
                                <div style="height:100%; width:100%; background:linear-gradient(to right,#6366f1,#818cf8); border-radius:2px;"></div>
                            </div>
                        </div>
                        <div class="fp-hero-stat income">
                            <div style="font-size:0.68rem; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:0.5rem;">📥 Pemasukan Bulan Ini</div>
                            <div style="font-size:2rem; font-weight:900; color:#10b981; letter-spacing:-0.02em; line-height:1;">+$ ${financeManager.formatCurrency(summary.totalIncome, true)}</div>
                            <div style="margin-top:0.6rem; height:4px; background:rgba(16,185,129,0.1); border-radius:2px; overflow:hidden;">
                                <div style="height:100%; width:${summary.totalIncome > 0 ? Math.min(100, (summary.totalIncome / Math.max(summary.totalIncome, summary.totalExpense)) * 100) : 0}%; background:linear-gradient(to right,#10b981,#059669); border-radius:2px;"></div>
                            </div>
                        </div>
                        <div class="fp-hero-stat expense">
                            <div style="font-size:0.68rem; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:0.5rem;">📤 Pengeluaran Bulan Ini</div>
                            <div style="font-size:2rem; font-weight:900; color:#ef4444; letter-spacing:-0.02em; line-height:1;">-$ ${financeManager.formatCurrency(summary.totalExpense, true)}</div>
                            <div style="margin-top:0.6rem; height:4px; background:rgba(239,68,68,0.1); border-radius:2px; overflow:hidden;">
                                <div style="height:100%; width:${summary.totalExpense > 0 ? Math.min(100, (summary.totalExpense / Math.max(summary.totalIncome, summary.totalExpense)) * 100) : 0}%; background:linear-gradient(to right,#ef4444,#dc2626); border-radius:2px;"></div>
                            </div>
                        </div>
                        <div class="fp-hero-stat net" style="${summary.netFlow >= 0 ? 'border-color:rgba(99,102,241,0.2);' : 'border-color:rgba(239,68,68,0.2);'}">
                            <div style="font-size:0.68rem; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:0.5rem;">⚡ Arus Kas Bersih</div>
                            <div style="font-size:2rem; font-weight:900; color:${summary.netFlow >= 0 ? '#818cf8' : '#ef4444'}; letter-spacing:-0.02em; line-height:1;">
                                ${summary.netFlow >= 0 ? '+' : '-'}$ ${financeManager.formatCurrency(Math.abs(summary.netFlow), true)}
                            </div>
                            <div style="margin-top:0.75rem; display:flex; align-items:center; gap:0.5rem; font-size:0.75rem; color:rgba(255,255,255,0.4);">
                                <span style="width:8px; height:8px; border-radius:50%; background:${summary.netFlow >= 0 ? '#818cf8' : '#ef4444'};"></span>
                                ${summary.netFlow >= 0 ? 'Surplus — Keuangan Sehat ✅' : 'Defisit — Pengeluaran Melebihi Pemasukan ⚠️'}
                            </div>
                        </div>
                    </div>

                    <!-- Analysis & Transactions Row -->
                    <div class="fp-two-col" style="display: grid; grid-template-columns: 1fr 1.1fr; gap: 1.25rem; align-items: start;">
                        <!-- Category Analysis -->
                        <div class="fp-card">
                            <div class="fp-section-header">
                                <div style="width:28px; height:28px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.25); border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:0.9rem;">📈</div>
                                <span class="fp-section-title">Analisis Kategori Bulan Ini</span>
                            </div>
                            <div style="display: flex; flex-direction: column;">
                                ${Object.entries(summary.incomeByCategory).length === 0 && Object.entries(summary.expenseByCategory).length === 0 ? `
                                    <div style="text-align:center; padding:2.5rem 0; color:rgba(255,255,255,0.25);">
                                        <div style="font-size:2rem; margin-bottom:0.5rem;">📭</div>
                                        <div style="font-size:0.85rem;">Tidak ada aktivitas transaksi bulan ini</div>
                                    </div>
                                ` : ''}
                                ${Object.entries(summary.incomeByCategory).map(([cat, amount]) => `
                                    <div class="fp-cat-row">
                                        <span style="font-size:0.88rem; color:rgba(255,255,255,0.65); display:flex; align-items:center; gap:0.5rem;">
                                            <span style="font-size:1rem;">${financeManager.getTransactionIcon(cat)}</span> ${cat}
                                        </span>
                                        <span style="color:#10b981; font-weight:800; font-size:0.9rem;">+$ ${financeManager.formatCurrency(amount, true)}</span>
                                    </div>
                                `).join('')}
                                ${Object.entries(summary.expenseByCategory).map(([cat, amount]) => `
                                    <div class="fp-cat-row">
                                        <span style="font-size:0.88rem; color:rgba(255,255,255,0.65); display:flex; align-items:center; gap:0.5rem;">
                                            <span style="font-size:1rem;">${financeManager.getTransactionIcon(cat)}</span> ${cat}
                                        </span>
                                        <span style="color:#ef4444; font-weight:800; font-size:0.9rem;">-$ ${financeManager.formatCurrency(amount, true)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Transaction History -->
                        <div class="fp-card">
                            <div class="fp-section-header">
                                <div style="width:28px; height:28px; background:rgba(20,184,166,0.12); border:1px solid rgba(20,184,166,0.25); border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:0.9rem;">📋</div>
                                <span class="fp-section-title">Riwayat Transaksi Terkini</span>
                            </div>
                            <div style="max-height: 420px; overflow-y: auto; padding-right: 4px;">
                                ${transactions.length === 0 ? `
                                    <div style="text-align:center; padding:2.5rem 0; color:rgba(255,255,255,0.25);">
                                        <div style="font-size:2rem; margin-bottom:0.5rem;">📭</div>
                                        <div style="font-size:0.85rem;">Belum ada riwayat transaksi</div>
                                    </div>
                                ` : transactions.map(t => `
                                    <div class="fp-tx-row">
                                        <div class="fp-tx-icon">${financeManager.getTransactionIcon(t.category)}</div>
                                        <div style="flex:1; min-width:0;">
                                            <div style="font-weight:700; font-size:0.875rem; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.description || t.category}</div>
                                            <div style="font-size:0.68rem; color:rgba(255,255,255,0.35); margin-top:2px;">${t.gameTime?.day}/${t.gameTime?.month}/${t.gameTime?.year}</div>
                                        </div>
                                        <div style="text-align:right; font-weight:800; font-size:0.9rem; color:${t.amount >= 0 ? '#10b981' : '#ef4444'}; white-space:nowrap;">
                                            ${t.amount >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(Math.abs(t.amount), true)}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Career Achievements & History Section -->
                    <div class="fp-card" style="background: linear-gradient(160deg, rgba(10,10,14,0.9), rgba(251,191,36,0.03));">
                        <div class="fp-section-header">
                            <div style="width:32px; height:32px; background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.25); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.1rem;">🏆</div>
                            <div>
                                <div class="fp-section-title">Prestasi & Riwayat Karir Profesional</div>
                                <div style="font-size:0.72rem; color:rgba(255,255,255,0.35); margin-top:1px;">Pencapaian yang telah Anda raih dalam perjalanan karir</div>
                            </div>
                        </div>
                        
                        <div class="fp-achievement-cols" style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 2rem; align-items: start;">
                            <!-- Column 1: Achievements -->
                            <div>
                                <div style="font-size:0.7rem; color:rgba(251,191,36,0.7); text-transform:uppercase; letter-spacing:0.1em; font-weight:800; margin-bottom:1rem;">🎖️ Lencana Pencapaian</div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.75rem;">
                                    ${achievementsList.map(ach => ach.unlocked ? `
                                        <div class="fp-badge-unlocked">
                                            <div style="font-size:2rem; margin-bottom:0.35rem;">${ach.icon}</div>
                                            <div style="font-size:0.75rem; font-weight:800; color:#fbbf24; margin-bottom:0.2rem;">${ach.name}</div>
                                            <div style="font-size:0.62rem; color:rgba(255,255,255,0.45); line-height:1.3;">${ach.desc}</div>
                                            <div style="margin-top:0.5rem; width:100%; height:2px; background:linear-gradient(to right,#fbbf24,#f59e0b); border-radius:1px;"></div>
                                        </div>
                                    ` : `
                                        <div class="fp-badge-locked">
                                            <div style="font-size:2rem; margin-bottom:0.35rem; filter:grayscale(1);">${ach.icon}</div>
                                            <div style="font-size:0.75rem; font-weight:700; color:rgba(255,255,255,0.3); margin-bottom:0.2rem;">${ach.name}</div>
                                            <div style="font-size:0.62rem; color:rgba(255,255,255,0.2); line-height:1.3;">${ach.desc}</div>
                                            <div style="margin-top:0.5rem; font-size:0.6rem; color:rgba(255,255,255,0.2);">🔒 Terkunci</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Column 2: Timeline -->
                            <div>
                                <div style="font-size:0.7rem; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.1em; font-weight:800; margin-bottom:1rem;">📜 Riwayat Jabatan & Bisnis</div>
                                <div style="max-height: 340px; overflow-y: auto; padding-right: 0.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
                                    ${careerHistory.length === 0 ? `
                                        <div style="text-align:center; padding:3rem 0; color:rgba(255,255,255,0.25);">
                                            <div style="font-size:2rem; margin-bottom:0.5rem;">📋</div>
                                            <div style="font-size:0.85rem;">Belum ada riwayat tercatat.</div>
                                            <div style="font-size:0.75rem; margin-top:0.25rem; color:rgba(255,255,255,0.2);">Mulai jenjang karir di menu Karir!</div>
                                        </div>
                                    ` : careerHistory.map((item, index) => {
                                        let icon = '💼';
                                        let color = '#a78bfa';
                                        if (item.type === 'select_path') { icon = '🎯'; color = '#60a5fa'; }
                                        else if (item.type === 'promotion') { icon = '📈'; color = '#34d399'; }
                                        else if (item.type === 'resign') { icon = '🚪'; color = '#f87171'; }
                                        else if (item.type === 'graduation') { icon = '🎓'; color = '#fbbf24'; }
                                        else if (item.type === 'graduation_decline') { icon = '👔'; color = '#94a3b8'; }
                                        else if (item.type === 'business_start') { icon = '🚀'; color = '#f59e0b'; }
                                        else if (item.type === 'business_ipo') { icon = '🔔'; color = '#818cf8'; }
                                        else if (item.type === 'business_exit') { icon = '💸'; color = '#10b981'; }

                                        return `
                                            <div style="display:flex; gap:0.875rem; position:relative;">
                                                ${index < careerHistory.length - 1 ? `
                                                    <div style="position:absolute; left:17px; top:36px; bottom:-12px; width:2px; background:linear-gradient(to bottom,${color}30,transparent);"></div>
                                                ` : ''}
                                                <div class="fp-timeline-dot" style="border:2px solid ${color}; box-shadow:0 0 10px ${color}30;">
                                                    ${icon}
                                                </div>
                                                <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:10px; padding:0.75rem 1rem; flex:1;">
                                                    <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:0.2rem;">
                                                        <span style="font-weight:800; font-size:0.875rem; color:#fff;">${item.description}</span>
                                                        <span style="font-size:0.65rem; color:rgba(255,255,255,0.35); font-weight:600; flex-shrink:0; margin-left:0.5rem;">${item.date}</span>
                                                    </div>
                                                    ${item.extra ? `<div style="font-size:0.72rem; color:rgba(255,255,255,0.4); margin-top:2px;">Detail: ${item.extra}</div>` : ''}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ================= TAB CONTENT: PORTFOLIO & ASSETS ================= -->
                <div id="fp-tab-portfolio-content" style="display: none; flex-direction: column; gap: 1.75rem;">
                    <!-- Wealth Summary Card Placeholder -->
                    <div id="portfolio-wealth-summary"></div>

                    <!-- Target & Distribution Grid -->
                    <div class="fp-two-col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; align-items: start;">
                        <!-- Distribution Table Card -->
                        <div class="fp-card">
                            <div class="fp-section-header">
                                <div style="width:28px; height:28px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.25); border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:0.9rem;">📊</div>
                                <span class="fp-section-title">Distribusi Alokasi Aset</span>
                            </div>
                            <div id="wealth-distribution-table">
                                <!-- Injected dynamically -->
                            </div>
                        </div>

                        <!-- Target Progress Card -->
                        <div class="fp-card">
                            <div class="fp-section-header">
                                <div style="width:28px; height:28px; background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.25); border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:0.9rem;">🎯</div>
                                <span class="fp-section-title">Target Kebebasan Finansial</span>
                            </div>
                            <div style="display:flex; align-items:baseline; gap:0.5rem; margin-bottom:1.25rem;">
                                <span class="text-muted" style="font-size:0.875rem;">Target Sasaran:</span>
                                <span style="font-weight:900; color:var(--accent-primary); font-size:1.6rem; letter-spacing:-0.01em;">$ 1.000.000.000</span>
                            </div>
                            <div style="height:8px; background:rgba(255,255,255,0.04); border-radius:var(--radius-full); overflow:hidden; border: 1px solid rgba(255,255,255,0.02); margin-bottom:0.85rem;">
                                <div id="plan-progress-fill" style="height:100%; background:linear-gradient(to right, var(--accent-primary), #059669); width: 0%; border-radius:var(--radius-full); transition: width 0.8s ease;"></div>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);">
                                <span>Kemajuan: <span id="plan-progress-text" style="font-weight:800; color:#fff;">0%</span></span>
                                <span id="plan-tier-text" style="font-weight:800; color:var(--accent-primary);">🏆 Whale Tier</span>
                            </div>
                        </div>
                    </div>

                    <!-- Owned Assets Table Card -->
                    <div class="fp-card">
                        <div class="fp-section-header">
                            <div style="width:28px; height:28px; background:rgba(168,85,247,0.12); border:1px solid rgba(168,85,247,0.25); border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:0.9rem;">🪙</div>
                            <span class="fp-section-title">Kepemilikan Aset Portofolio</span>
                        </div>
                        <div class="view-tabs" style="display:flex; gap:0.5rem; margin-bottom:1.25rem; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:0.75rem;">
                            <button class="tab-btn active" data-portfolio-tab="stocks">Saham</button>
                            <button class="tab-btn" data-portfolio-tab="crypto">Kripto</button>
                            <button class="tab-btn" data-portfolio-tab="property">Properti</button>
                        </div>
                        <div id="portfolio-stocks" class="asset-list"></div>
                        <div id="portfolio-crypto" class="asset-list" style="display:none;"></div>
                        <div id="portfolio-property" class="asset-list" style="display:none;"></div>
                    </div>

                    <!-- Passive Income Sources Card -->
                    <div class="fp-card">
                        <div class="fp-section-header">
                            <div style="width:28px; height:28px; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.25); border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:0.9rem;">💵</div>
                            <span class="fp-section-title">Sumber Aliran Kas Utama</span>
                        </div>
                        <div id="wealth-sources" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1rem;">
                            <!-- Injected dynamically -->
                        </div>
                    </div>
                </div>

            </div>
        `;

        // Clean up ECharts instance and resize handler before showing new page
        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        viewManager.showDynamicView('Laporan Keuangan', 'Ringkasan pemasukan, pengeluaran, dan arus kas', content);

        // Bind top-level tab buttons click listeners
        document.getElementById('fp-tab-btn-cashflow')?.addEventListener('click', () => this.switchTab('cashflow'));
        document.getElementById('fp-tab-btn-portfolio')?.addEventListener('click', () => this.switchTab('portfolio'));

        // Bind portfolio asset sub-tab click listeners
        document.querySelectorAll('[data-portfolio-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-portfolio-tab]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const subTab = btn.dataset.portfolioTab;
                const stocksEl = document.getElementById('portfolio-stocks');
                const cryptoEl = document.getElementById('portfolio-crypto');
                const propertyEl = document.getElementById('portfolio-property');

                if (stocksEl) stocksEl.style.display = subTab === 'stocks' ? 'block' : 'none';
                if (cryptoEl) cryptoEl.style.display = subTab === 'crypto' ? 'block' : 'none';
                if (propertyEl) propertyEl.style.display = subTab === 'property' ? 'block' : 'none';
            });
        });

        // Trigger the initial tab selection
        this.switchTab(initialTab);
    }

    switchTab(tabId) {
        this.activeTab = tabId;
        viewManager.activeDynamicTab = tabId;

        // Toggle button states
        const btnCashflow = document.getElementById('fp-tab-btn-cashflow');
        const btnPortfolio = document.getElementById('fp-tab-btn-portfolio');
        if (btnCashflow) btnCashflow.classList.toggle('active', tabId === 'cashflow');
        if (btnPortfolio) btnPortfolio.classList.toggle('active', tabId === 'portfolio');

        // Toggle content containers
        const cashflowContent = document.getElementById('fp-tab-cashflow-content');
        const portfolioContent = document.getElementById('fp-tab-portfolio-content');
        if (cashflowContent) cashflowContent.style.display = tabId === 'cashflow' ? 'flex' : 'none';
        if (portfolioContent) portfolioContent.style.display = tabId === 'portfolio' ? 'flex' : 'none';

        // Update headers in Dynamic View
        const titleEl = document.getElementById('dynamic-view-title');
        const subEl = document.getElementById('dynamic-view-subtitle');

        if (tabId === 'cashflow') {
            if (titleEl) titleEl.textContent = 'Laporan Keuangan';
            if (subEl) subEl.textContent = 'Ringkasan pemasukan, pengeluaran, dan arus kas';
            
            // Asynchronously load ECharts and display chart
            this.loadECharts().then(echarts => {
                if (echarts) {
                    this.renderChart(echarts, this.historyData);
                }
            });
        } else {
            if (titleEl) titleEl.textContent = 'Portofolio & Aset';
            if (subEl) subEl.textContent = 'Kekayaan bersih, alokasi aset, dan target finansial';
            
            this.renderPortfolioTabContent();
        }

        // Sync main navigation Highlights (Sidebar & Mobile Bottom Nav)
        viewManager.updateActiveNavigationHighlights();
    }

    renderPortfolioTabContent() {
        const balance = gameState.getBalance();
        const stockPortfolio = stockMarket.getPortfolio() || [];
        const cryptoWallet = cryptoMarket.getWallet() || [];
        const totalStockValue = stockMarket.getPortfolioValue() || 0;
        const totalCryptoValue = cryptoMarket.getWalletValue() || 0;
        const totalPropertyValue = propertyManager.getTotalPropertyValue() || 0;
        const ownedProperties = propertyManager.getOwnedProperties() || [];

        // Get debt info
        const loans = gameState.get('loans') || [];
        const totalDebt = loans.reduce((sum, loan) => sum + (loan.remaining || 0), 0);

        // Calculate true net worth: Assets - Liabilities
        const totalAssets = balance + totalStockValue + totalCryptoValue + totalPropertyValue;
        const totalNetWorth = totalAssets - totalDebt;

        const planTarget = 1000000000;
        const planProgress = Math.min(100, Math.max(0, (totalNetWorth / planTarget) * 100));

        const progressFill = document.getElementById('plan-progress-fill');
        const progressText = document.getElementById('plan-progress-text');
        if (progressFill) progressFill.style.width = planProgress.toFixed(1) + '%';
        if (progressText) progressText.textContent = planProgress.toFixed(1) + '%';

        // Update Wealth Tier dynamically
        let tierText = '🏆 Perintis Tier';
        if (totalNetWorth >= 1000000000) {
            tierText = '🏆 Whale Tier';
        } else if (totalNetWorth >= 100000000) {
            tierText = '🏆 Konglomerat Tier';
        } else if (totalNetWorth >= 50000000) {
            tierText = '🏆 Miliarder Tier';
        } else if (totalNetWorth >= 1000000) {
            tierText = '🏆 Jutawan Tier';
        } else if (totalNetWorth >= 100000) {
            tierText = '🏆 Menengah Tier';
        }
        const tierEl = document.getElementById('plan-tier-text');
        if (tierEl) tierEl.textContent = tierText;

        // Wealth Summary
        const summaryEl = document.getElementById('portfolio-wealth-summary');
        if (summaryEl) {
            summaryEl.innerHTML = `
                <div class="portfolio-wealth-card">
                  <div class="wealth-header">
                    <div class="wealth-title-group">
                      <span class="wealth-badge">💼 Ringkasan Portofolio</span>
                      <h3 class="wealth-label">Net Worth (Kekayaan Bersih)</h3>
                      <div class="wealth-value ${totalNetWorth >= 0 ? '' : 'negative'}">
                        $ ${financeManager.formatCurrency(totalNetWorth)}
                      </div>
                    </div>
                  </div>
                  
                  <div class="wealth-divider"></div>
                  
                  <div class="wealth-grid">
                    <div class="wealth-asset-item cash">
                      <div class="asset-icon-wrapper">💵</div>
                      <div class="asset-details">
                        <span class="asset-label">Cash & Simpanan</span>
                        <span class="asset-value">$ ${financeManager.formatCurrency(balance, true)}</span>
                      </div>
                    </div>
                    
                    <div class="wealth-asset-item stocks">
                      <div class="asset-icon-wrapper">📈</div>
                      <div class="asset-details">
                        <span class="asset-label">Bursa Saham</span>
                        <span class="asset-value">$ ${financeManager.formatCurrency(totalStockValue, true)}</span>
                      </div>
                    </div>
                    
                    <div class="wealth-asset-item crypto">
                      <div class="asset-icon-wrapper">🪙</div>
                      <div class="asset-details">
                        <span class="asset-label">Aset Kripto</span>
                        <span class="asset-value">$ ${financeManager.formatCurrency(totalCryptoValue, true)}</span>
                      </div>
                    </div>
                    
                    <div class="wealth-asset-item property">
                      <div class="asset-icon-wrapper">🏢</div>
                      <div class="asset-details">
                        <span class="asset-label">Properti Real Estate</span>
                        <span class="asset-value">$ ${financeManager.formatCurrency(totalPropertyValue, true)}</span>
                      </div>
                    </div>

                    ${totalDebt > 0 ? `
                      <div class="wealth-asset-item liabilities negative">
                        <div class="asset-icon-wrapper">💳</div>
                        <div class="asset-details">
                          <span class="asset-label">Pinjaman (${loans.length} Aktif)</span>
                          <span class="asset-value">-$ ${financeManager.formatCurrency(totalDebt, true)}</span>
                        </div>
                      </div>
                    ` : ''}
                  </div>
                </div>
            `;
        }

        // Render Distribution
        this.renderWealthDistributionTable(balance, totalStockValue, totalCryptoValue, totalPropertyValue);

        // Stocks portfolio list
        const stocksEl = document.getElementById('portfolio-stocks');
        if (stocksEl) {
            if (stockPortfolio.length) {
                stocksEl.innerHTML = stockPortfolio.map(h => `
                  <div class="asset-item" data-symbol="${h.symbol}" data-type="stock">
                    <div class="asset-icon">📊</div>
                    <div class="asset-info">
                      <div class="asset-name" style="font-weight:800; font-size:0.95rem; color:#fff;">${h.symbol}</div>
                      <div class="asset-symbol" style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                        ${h.shares} lot @ $ ${financeManager.formatCurrency(h.avgBuyPrice, true)}
                        <span style="color:var(--text-dim); margin-left: 6px;">(Modal: $ ${financeManager.formatCurrency(h.totalInvested, true)})</span>
                      </div>
                    </div>
                    <div class="asset-price" style="text-align: right;">
                      <div class="asset-current" style="font-weight: 800; font-size: 0.95rem; color: var(--accent-primary);">$ ${financeManager.formatCurrency(h.currentValue, true)}</div>
                      <div class="asset-change ${h.profit >= 0 ? 'positive' : 'negative'}" style="font-size: 0.72rem; font-weight: 700; margin-top: 2px;">
                        ${h.profit >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(h.profit, true)} (${h.profit >= 0 ? '+' : ''}${(h.profitPercent || 0).toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                `).join('');
            } else {
                stocksEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">Belum ada saham</div></div>';
            }
        }

        // Crypto wallet list
        const cryptoEl = document.getElementById('portfolio-crypto');
        if (cryptoEl) {
            if (cryptoWallet.length) {
                cryptoEl.innerHTML = cryptoWallet.map(h => `
                  <div class="asset-item" data-symbol="${h.symbol}" data-type="crypto">
                    <div class="asset-icon" style="font-size: 1.5rem;">${h.icon}</div>
                    <div class="asset-info">
                      <div class="asset-name" style="font-weight:800; font-size:0.95rem; color:#fff;">${h.symbol}</div>
                      <div class="asset-symbol" style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                        ${cryptoMarket.formatAmount(h.amount)} ${h.symbol} @ $ ${financeManager.formatCurrency(h.avgBuyPrice, true)}
                        <span style="color:var(--text-dim); margin-left: 6px;">(Modal: $ ${financeManager.formatCurrency(h.totalInvested, true)})</span>
                      </div>
                    </div>
                    <div class="asset-price" style="text-align: right;">
                      <div class="asset-current" style="font-weight: 800; font-size: 0.95rem; color: var(--accent-primary);">$ ${financeManager.formatCurrency(h.currentValue, true)}</div>
                      <div class="asset-change ${h.profit >= 0 ? 'positive' : 'negative'}" style="font-size: 0.72rem; font-weight: 700; margin-top: 2px;">
                        ${h.profit >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(h.profit, true)} (${h.profit >= 0 ? '+' : ''}${(h.profitPercent || 0).toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                `).join('');
            } else {
                cryptoEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🪙</div><div class="empty-state-text">Wallet kosong</div></div>';
            }
        }

        // Property portfolio list
        const propertyEl = document.getElementById('portfolio-property');
        if (propertyEl) {
            if (ownedProperties.length) {
                propertyEl.innerHTML = ownedProperties.map(h => `
                  <div class="asset-item portfolio-prop-item" data-id="${h.id}" data-type="property">
                    <div class="asset-icon" style="font-size: 1.5rem;">${h.icon}</div>
                    <div class="asset-info" style="min-width: 0;">
                      <div class="asset-name" style="font-weight: 800; font-size: 0.9rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${h.name}</div>
                      <div class="asset-symbol" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Nilai Beli: $ ${financeManager.formatCurrency(h.price, true)}</div>
                    </div>
                    <div class="asset-price" style="text-align: right; margin-right: 1.25rem;">
                      <div class="asset-current" style="color: var(--accent-primary); font-weight: 700; font-size: 0.9rem;">+$ ${financeManager.formatCurrency(h.monthlyRent, true)}/bln</div>
                      <div class="asset-change positive" style="font-size: 0.7rem; font-weight: 600; margin-top: 2px;">Passive Yield</div>
                    </div>
                    <button class="btn btn-sm btn-sell-portfolio-prop" data-sell="${h.id}" style="background: linear-gradient(135deg, #ef4444, #dc2626); border: none; color: #fff; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.2); height: fit-content;">
                      JUAL
                    </button>
                  </div>
                `).join('');

                // Bind sell buttons
                propertyEl.querySelectorAll('.btn-sell-portfolio-prop').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const propertyId = parseInt(btn.dataset.sell);
                        const { propertyPanel } = await import('../../property/panels/PropertyPanel.js');
                        await propertyPanel.handleSell(propertyId);
                        this.renderPortfolioTabContent();
                    });
                });
            } else {
                propertyEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏘️</div><div class="empty-state-text">Belum ada aset properti</div></div>';
            }
        }

        // Passive Income Sources
        this.renderWealthSources();
    }

    renderWealthDistributionTable(cash, stocks, crypto, property) {
        const container = document.getElementById('wealth-distribution-table');
        if (!container) return;

        const total = cash + stocks + crypto + property;
        if (total === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div>Belum ada aset</div></div>';
            return;
        }

        const rows = [
            { label: 'Cash', icon: '💵', value: cash, color: '#6366f1' },
            { label: 'Saham', icon: '📈', value: stocks, color: '#10b981' },
            { label: 'Kripto', icon: '🪙', value: crypto, color: '#a855f7' },
            { label: 'Properti', icon: '🏢', value: property, color: '#f59e0b' }
        ];

        container.innerHTML = rows.map(row => {
            const pct = total > 0 ? ((row.value / total) * 100).toFixed(1) : '0.0';
            return `
                <div class="wealth-dist-row">
                  <div class="wealth-dist-icon">${row.icon}</div>
                  <div class="wealth-dist-info">
                    <div class="wealth-dist-header">
                      <span class="wealth-dist-name">${row.label}</span>
                      <span class="wealth-dist-stats" style="color: ${row.color}">
                        <span class="wealth-dist-amt">$ ${financeManager.formatCurrency(row.value, true)}</span>
                        <span class="wealth-dist-pct">(${pct}%)</span>
                      </span>
                    </div>
                    <div class="wealth-dist-bar-bg">
                      <div class="wealth-dist-bar-fill" style="width: ${pct}%; background: ${row.color}"></div>
                    </div>
                  </div>
                </div>
            `;
        }).join('');
    }

    renderWealthSources() {
        const sourcesEl = document.getElementById('wealth-sources');
        if (!sourcesEl) return;

        const workState = gameState.get('work');
        const jobName = (workState && workState.careerPath)
            ? workTaskManager.getCareerLevelData().title
            : 'Tidak bekerja';
        const transactions = financeManager.getRecentTransactions(100);

        const tradingProfit = transactions
            .filter(t => t.category === 'Stock Sell' || t.category === 'Crypto Sell')
            .reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0);

        const salary = transactions
            .filter(t => t.category === 'Gaji')
            .reduce((sum, t) => sum + t.amount, 0);

        const topup = transactions
            .filter(t => t.category === 'Top Up')
            .reduce((sum, t) => sum + t.amount, 0);

        sourcesEl.innerHTML = `
          <div class="source-item">
            <div class="source-icon">💼</div>
            <div class="source-info">
              <div class="source-name">Gaji (${jobName})</div>
              <div class="source-desc">Pendapatan bulanan</div>
            </div>
            <div class="source-amount positive">+$ ${financeManager.formatCurrency(salary, true)}</div>
          </div>
          <div class="source-item">
            <div class="source-icon">📈</div>
            <div class="source-info">
              <div class="source-name">Trading Profit</div>
              <div class="source-desc">Keuntungan jual beli</div>
            </div>
            <div class="source-amount ${tradingProfit >= 0 ? 'positive' : 'negative'}">
              ${tradingProfit >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(tradingProfit, true)}
            </div>
          </div>
          <div class="source-item">
            <div class="source-icon">💰</div>
            <div class="source-info">
              <div class="source-name">Top Up</div>
              <div class="source-desc">Modal yang ditambahkan</div>
            </div>
            <div class="source-amount positive">+$ ${financeManager.formatCurrency(topup, true)}</div>
          </div>
        `;
    }

    loadECharts() {
        if (window.echarts) return Promise.resolve(window.echarts);
        if (window._echartsLoadingPromise) return window._echartsLoadingPromise;

        window._echartsLoadingPromise = new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';
            script.onload = () => {
                window._echartsLoadingPromise = null;
                resolve(window.echarts);
            };
            script.onerror = () => {
                console.error("Failed to load ECharts");
                window._echartsLoadingPromise = null;
                resolve(null);
            };
            document.head.appendChild(script);
        });

        return window._echartsLoadingPromise;
    }

    renderChart(echarts, historyData) {
        const chartDom = document.getElementById('finance-chart');
        if (!chartDom) return;

        chartDom.innerHTML = '';

        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }

        const chart = echarts.init(chartDom, 'dark');
        this.chart = chart;

        const labels = historyData.map(h => h.label);
        const incomes = historyData.map(h => h.income);
        const expenses = historyData.map(h => h.expenses);
        const liabilities = historyData.map(h => h.liabilities);
        const assets = historyData.map(h => h.assets);
        const otherIncomes = historyData.map(h => h.otherIncome);
        const bankAtEnds = historyData.map(h => h.bankAtEnd);
        const netFlows = historyData.map(h => {
            const inflow = h.income + h.otherIncome;
            const outflow = Math.abs(h.expenses) + Math.abs(h.liabilities) + Math.abs(h.assets);
            return inflow - outflow;
        });

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                backgroundColor: '#1e1e2e',
                borderColor: '#313244',
                borderWidth: 1,
                textStyle: {
                    color: '#cdd6f4',
                    fontSize: 12
                },
                formatter(params) {
                    let html = `<strong style="color:#ffffff;font-size:0.85rem;">${params[0].axisValue}</strong><br><br>`;
                    params.forEach(item => {
                        const val = Math.abs(item.value);
                        const sign = item.value >= 0 ? '+' : '-';
                        const displayVal = item.seriesName === 'Cash Balance' 
                            ? `$ ${new Intl.NumberFormat('en-US').format(Math.round(item.value))}` 
                            : `${sign}$ ${new Intl.NumberFormat('en-US').format(Math.round(val))}`;
                        
                        html += `
                            <div style="margin:4px 0;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;font-size:0.75rem;">
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <span style="display:inline-block;width:8px;height:8px;background:${item.color};border-radius:50%;"></span>
                                    <span style="color:#a6adc8;">${item.seriesName}</span>
                                </div>
                                <span style="font-weight:700;color:#ffffff;">${displayVal}</span>
                            </div>
                        `;
                    });
                    return html;
                }
            },
            legend: {
                top: 0,
                textStyle: {
                    color: '#a6adc8',
                    fontSize: 11
                },
                itemGap: 15
            },
            grid: {
                left: '1%',
                right: '1%',
                top: '15%',
                bottom: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: labels,
                axisLine: {
                    lineStyle: {
                        color: 'rgba(255,255,255,0.08)'
                    }
                },
                axisLabel: {
                    color: '#bac2de',
                    fontSize: 11
                }
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    color: '#bac2de',
                    fontSize: 11,
                    formatter(value) {
                        const sign = value >= 0 ? '' : '-';
                        const abs = Math.abs(value);
                        if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(1) + 'B';
                        if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(1) + 'M';
                        if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(0) + 'K';
                        return sign + '$' + abs;
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: 'rgba(255,255,255,0.03)'
                    }
                }
            },
            series: [
                {
                    name: 'Income',
                    type: 'bar',
                    stack: 'positive',
                    emphasis: {
                        focus: 'series'
                    },
                    itemStyle: {
                        borderRadius: [4, 4, 0, 0],
                        color: '#10b981'
                    },
                    data: incomes
                },
                {
                    name: 'Assets (Deposits)',
                    type: 'bar',
                    stack: 'positive',
                    itemStyle: {
                        color: '#06b6d4'
                    },
                    data: assets
                },
                {
                    name: 'Injections / Loans',
                    type: 'bar',
                    stack: 'positive',
                    itemStyle: {
                        color: '#f59e0b'
                    },
                    data: otherIncomes
                },
                {
                    name: 'Expenses',
                    type: 'bar',
                    stack: 'negative',
                    itemStyle: {
                        borderRadius: [0, 0, 4, 4],
                        color: '#3b82f6'
                    },
                    data: expenses
                },
                {
                    name: 'Liabilities (Repayments)',
                    type: 'bar',
                    stack: 'negative',
                    itemStyle: {
                        color: '#ef4444'
                    },
                    data: liabilities
                },
                {
                    name: 'Cash Balance',
                    type: 'line',
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 8,
                    lineStyle: {
                        width: 3,
                        color: '#818cf8'
                    },
                    itemStyle: {
                        color: '#818cf8'
                    },
                    data: bankAtEnds
                },
                {
                    name: 'Net Cashflow',
                    type: 'bar',
                    itemStyle: {
                        color: function(params) {
                            return params.value >= 0 ? '#10b981' : '#ef4444';
                        },
                        borderRadius: [4, 4, 4, 4]
                    },
                    data: netFlows
                }
            ]
        };

        chart.setOption(option);

        this.resizeHandler = () => {
            if (this.chart) this.chart.resize();
        };
        window.addEventListener('resize', this.resizeHandler);
        chartDom.resizeHandler = this.resizeHandler;
    }
}

export default new FinancePanel();
