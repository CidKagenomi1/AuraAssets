/**
 * FinancePanel.js - Hybrid Financial Summary Panel with ECharts Cashflow Forecast
 */

import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../game/GameState.js';
import ui from '../UIManager.js';

class FinancePanel {
    show() {
        const summary = financeManager.getMonthlySummary();
        const transactions = financeManager.getRecentTransactions(30);

        const workState = gameState.get('work') || {};
        const totalTasks = workState.totalTasksDone || 0;
        const careerLevel = workState.careerLevel || 1;
        const bizState = gameState.get('business') || {};
        const playerRole = gameState.get('player.role') || 'karyawan';
        
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
        const currentYear = gameState.get('gameTime.year') || 2026;
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

        historyData.forEach(h => {
            const monthTx = allTransactions.filter(t => t.gameTime?.month === h.month && t.gameTime?.year === h.year);

            // Sum standard income (salary, freelance, investments, etc.)
            h.income = monthTx
                .filter(t => t.amount > 0 && t.category !== 'Top Up' && t.category !== 'loan_received')
                .reduce((sum, t) => sum + t.amount, 0);

            // Sum other injections / loans received
            h.otherIncome = monthTx
                .filter(t => t.amount > 0 && (t.category === 'Top Up' || t.category === 'loan_received'))
                .reduce((sum, t) => sum + t.amount, 0);

            // Sum standard expenses (shopping, food, transport, bills, taxes, etc.)
            h.expenses = monthTx
                .filter(t => t.amount < 0 && t.category !== 'loan_payment' && t.category !== 'loan_payoff' && t.category !== 'savings_deposit')
                .reduce((sum, t) => sum + t.amount, 0);

            // Sum loan repayments/liabilities
            h.liabilities = monthTx
                .filter(t => t.amount < 0 && (t.category === 'loan_payment' || t.category === 'loan_payoff'))
                .reduce((sum, t) => sum + t.amount, 0);

            // Sum assets additions (e.g., deposits)
            h.assets = monthTx
                .filter(t => t.category === 'savings_deposit')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            // Bank at end (the balance after the latest transaction in this month)
            if (monthTx.length > 0) {
                h.bankAtEnd = monthTx[0].balance || 0;
            } else {
                const beforeTx = allTransactions.find(t => {
                    const tVal = (t.gameTime?.year || 0) * 12 + (t.gameTime?.month || 0);
                    const hVal = h.year * 12 + h.month;
                    return tVal < hVal;
                });
                h.bankAtEnd = beforeTx ? (beforeTx.balance || 0) : gameState.getBalance();
            }
        });

        // Set fallbacks for bankAtEnd
        historyData.forEach((h, idx) => {
            if (h.bankAtEnd === 0) {
                if (idx > 0) {
                    h.bankAtEnd = historyData[idx - 1].bankAtEnd;
                } else {
                    h.bankAtEnd = gameState.getBalance();
                }
            }
        });

        // Pre-build layout structure with chart container on top
        const content = `
            <div class="hybrid-page-container" style="padding: 1.5rem; max-width: 1200px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 2rem;">
                
                <!-- Chart Card -->
                <div class="card" style="background: rgba(0, 0, 0, 0.2); padding: 1.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
                    <h3 style="margin-bottom: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem; color: white;">
                        <span>📊</span> Analisis & Proyeksi Arus Kas (ECharts Live)
                    </h3>
                    <div id="finance-chart" style="width: 100%; height: 420px; min-height: 380px;">
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-size: 0.9rem;">
                            ⏳ Memuat Grafik Analisis Keuangan...
                        </div>
                    </div>
                </div>

                <!-- Monthly Summary Cards -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
                    <div class="card" style="background: rgba(16, 185, 129, 0.08); border-left: 4px solid var(--accent-primary); border-radius: var(--radius-md);">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 700;">Pemasukan Bulan Ini</div>
                        <div style="font-size: 1.75rem; font-weight: 800; color: var(--accent-primary);">+$ ${financeManager.formatCurrency(summary.totalIncome, true)}</div>
                    </div>
                    <div class="card" style="background: rgba(239, 68, 68, 0.08); border-left: 4px solid var(--accent-danger); border-radius: var(--radius-md);">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 700;">Pengeluaran Bulan Ini</div>
                        <div style="font-size: 1.75rem; font-weight: 800; color: var(--accent-danger);">-$ ${financeManager.formatCurrency(summary.totalExpense, true)}</div>
                    </div>
                    <div class="card" style="background: rgba(255,255,255,0.02); border-left: 4px solid ${summary.netFlow >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)'}; border-radius: var(--radius-md);">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 700;">Arus Kas Bersih (Net)</div>
                        <div style="font-size: 1.75rem; font-weight: 800; color: white;">${summary.netFlow >= 0 ? '+' : '-'}$ ${financeManager.formatCurrency(Math.abs(summary.netFlow), true)}</div>
                    </div>
                </div>

                <!-- Bottom Analysis Tables -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: start;">
                    <!-- Left: Categories -->
                    <div>
                        <div class="card" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                            <h4 style="margin-bottom: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; color: white;"><span>📈</span> Analisis Kategori</h4>
                            
                            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                ${Object.entries(summary.incomeByCategory).length === 0 && Object.entries(summary.expenseByCategory).length === 0 ? `
                                    <div style="text-align: center; padding: 2rem 0; color: var(--text-muted); font-size: 0.85rem;">Tidak ada aktivitas transaksi bulan ini.</div>
                                ` : ''}
                                ${Object.entries(summary.incomeByCategory).map(([cat, amount]) => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                        <span style="font-size: 0.9rem; color: var(--text-muted);">${financeManager.getTransactionIcon(cat)} ${cat}</span>
                                        <span style="color: var(--accent-primary); font-weight: 700;">+$ ${financeManager.formatCurrency(amount, true)}</span>
                                    </div>
                                `).join('')}
                                
                                ${Object.entries(summary.expenseByCategory).map(([cat, amount]) => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                        <span style="font-size: 0.9rem; color: var(--text-muted);">${financeManager.getTransactionIcon(cat)} ${cat}</span>
                                        <span style="color: var(--accent-danger); font-weight: 700;">-$ ${financeManager.formatCurrency(amount, true)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Right: History -->
                    <div>
                        <div class="card" style="background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                            <h4 style="margin-bottom: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; color: white;"><span>📋</span> Riwayat Transaksi</h4>
                            <div style="max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
                                ${transactions.length === 0 ? `
                                    <div style="text-align: center; padding: 2rem 0; color: var(--text-muted); font-size: 0.85rem;">Belum ada riwayat transaksi.</div>
                                ` : transactions.map(t => `
                                    <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                        <div style="font-size: 1.5rem; background: rgba(255,255,255,0.03); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px;">
                                            ${financeManager.getTransactionIcon(t.category)}
                                        </div>
                                        <div style="flex: 1;">
                                            <div style="font-weight: 600; font-size: 0.9rem; color: white;">${t.description || t.category}</div>
                                            <div style="font-size: 0.7rem; color: var(--text-muted);">${t.gameTime?.day}/${t.gameTime?.month}/${t.gameTime?.year}</div>
                                        </div>
                                        <div style="text-align: right; font-weight: 700; color: ${t.amount >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)'};">
                                            ${t.amount >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(Math.abs(t.amount), true)}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Career Achievements & History Section -->
                <div class="card" style="background: rgba(0, 0, 0, 0.2); padding: 1.5rem; border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
                    <h3 style="margin-bottom: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem; color: white;">
                        <span>🏆</span> Prestasi & Riwayat Karir Profesional
                    </h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 2rem; align-items: start;">
                        <!-- Column 1: Achievements -->
                        <div>
                            <h4 style="margin-bottom: 1rem; color: var(--accent-primary); font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800;">
                                🎖️ Lencana Pencapaian
                            </h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem;">
                                ${achievementsList.map(ach => `
                                    <div style="
                                        background: ${ach.unlocked ? 'rgba(251, 191, 36, 0.06)' : 'rgba(255, 255, 255, 0.02)'};
                                        border: 1px solid ${ach.unlocked ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255, 255, 255, 0.05)'};
                                        padding: 0.75rem;
                                        border-radius: var(--radius-md);
                                        text-align: center;
                                        opacity: ${ach.unlocked ? 1 : 0.4};
                                        transition: all 0.3s;
                                        position: relative;
                                    " class="${ach.unlocked ? 'hover-scale' : ''}">
                                        <div style="font-size: 2rem; margin-bottom: 0.25rem;">${ach.icon}</div>
                                        <div style="font-size: 0.8rem; font-weight: 800; color: ${ach.unlocked ? '#fbbf24' : 'var(--text-muted)'}; margin-bottom: 0.15rem;">
                                            ${ach.name}
                                        </div>
                                        <div style="font-size: 0.65rem; color: var(--text-muted); line-height: 1.2;">
                                            ${ach.desc}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Column 2: Timeline -->
                        <div>
                            <h4 style="margin-bottom: 1rem; color: var(--accent-primary); font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800;">
                                📜 Riwayat Jabatan & Bisnis
                            </h4>
                            <div style="max-height: 320px; overflow-y: auto; padding-right: 0.5rem; display: flex; flex-direction: column; gap: 1rem;">
                                ${careerHistory.length === 0 ? `
                                    <div style="text-align: center; padding: 3rem 0; color: var(--text-muted); font-size: 0.85rem;">
                                        Belum ada riwayat tercatat. Silakan mulai jenjang karir Anda di menu Karir!
                                    </div>
                                ` : careerHistory.map((item, index) => {
                                    let icon = '💼';
                                    let color = '#a78bfa'; // Purple fallback
                                    if (item.type === 'select_path') { icon = '🎯'; color = '#60a5fa'; }
                                    else if (item.type === 'promotion') { icon = '📈'; color = '#34d399'; }
                                    else if (item.type === 'resign') { icon = '🚪'; color = '#f87171'; }
                                    else if (item.type === 'graduation') { icon = '🎓'; color = '#fbbf24'; }
                                    else if (item.type === 'graduation_decline') { icon = '👔'; color = '#94a3b8'; }
                                    else if (item.type === 'business_start') { icon = '🚀'; color = '#f59e0b'; }
                                    else if (item.type === 'business_ipo') { icon = '🔔'; color = '#818cf8'; }
                                    else if (item.type === 'business_exit') { icon = '💸'; color = '#10b981'; }

                                    return `
                                        <div style="display: flex; gap: 1rem; position: relative;">
                                            <!-- Timeline Line -->
                                            ${index < careerHistory.length - 1 ? `
                                                <div style="position: absolute; left: 17px; top: 34px; bottom: -20px; width: 2px; background: rgba(255,255,255,0.05);"></div>
                                            ` : ''}
                                            <!-- Timeline Icon -->
                                            <div style="
                                                width: 36px;
                                                height: 36px;
                                                border-radius: 50%;
                                                background: rgba(255,255,255,0.03);
                                                border: 2px solid ${color};
                                                display: flex;
                                                align-items: center;
                                                justify-content: center;
                                                font-size: 1rem;
                                                flex-shrink: 0;
                                                box-shadow: 0 0 10px ${color}33;
                                            ">
                                                ${icon}
                                            </div>
                                            <!-- Timeline Content -->
                                            <div style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: var(--radius-md); padding: 0.75rem 1rem; flex: 1;">
                                                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.25rem;">
                                                    <span style="font-weight: 800; font-size: 0.9rem; color: white;">${item.description}</span>
                                                    <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">${item.date}</span>
                                                </div>
                                                ${item.extra ? `<div style="font-size: 0.75rem; color: var(--text-muted);">Detail: ${item.extra}</div>` : ''}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        import('../ViewManager.js').then(m => {
            m.default.showDynamicView('Laporan Keuangan', 'Ringkasan pemasukan, pengeluaran, dan arus kas', content);

            // Asynchronously load ECharts and display chart
            this.loadECharts().then(echarts => {
                if (echarts) {
                    this.renderChart(echarts, historyData);
                }
            });
        });
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

        // Clear placeholder contents
        chartDom.innerHTML = '';

        const chart = echarts.init(chartDom, 'dark');

        const labels = historyData.map(h => h.label);
        const incomes = historyData.map(h => h.income);
        const expenses = historyData.map(h => h.expenses);
        const liabilities = historyData.map(h => h.liabilities);
        const assets = historyData.map(h => h.assets);
        const otherIncomes = historyData.map(h => h.otherIncome);
        const bankAtEnds = historyData.map(h => h.bankAtEnd);

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
                }
            ]
        };

        chart.setOption(option);

        // Keep reference to handle resizing
        const resizeHandler = () => {
            chart.resize();
        };
        window.addEventListener('resize', resizeHandler);
        chartDom.resizeHandler = resizeHandler;
    }
}

export default new FinancePanel();
