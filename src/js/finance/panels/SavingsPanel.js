/**
 * SavingsPanel.js - Deposito & Investasi Panel (Premium Redesign)
 * Full-screen dynamic view with deposito + reksa dana + adjustable interest
 */

import savingsManager from '../../finance/SavingsManager.js';
import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../core/GameState.js';
import ui from '../../ui/UIManager.js';

class SavingsPanel {
    constructor() {
        this.activeTab = 'deposito'; // 'deposito' | 'reksadana'
    }

    show() {
        const balance = savingsManager.getBalance();
        const interestInfo = savingsManager.getInterestInfo();
        const autoDepositEnabled = gameState.get('savings.autoDepositEnabled') || false;
        const autoDepositAmount = gameState.get('savings.autoDepositAmount') || 0;
        const customRate = gameState.get('savings.customInterestRate');
        const currentRate = customRate !== undefined ? customRate : 0.005;
        const rdPortfolio = gameState.get('savings.reksaDana') || {};
        const playerBalance = gameState.getBalance();

        // Reksa dana funds data
        const rdFunds = [
            {
                id: 'pasar_uang',
                name: 'Manulife Dana Kas II',
                type: '💵 Pasar Uang',
                risk: 'Rendah',
                riskColor: '#10b981',
                returnAnnual: 4.8,
                returnMonthly: 0.4,
                description: 'Reksa dana pasar uang dengan likuiditas tinggi & risiko rendah',
                minInvest: 10000,
                nav: 1.042,
            },
            {
                id: 'pendapatan_tetap',
                name: 'Schroder Dana Prestasi Plus',
                type: '📄 Pendapatan Tetap',
                risk: 'Menengah',
                riskColor: '#f59e0b',
                returnAnnual: 8.2,
                returnMonthly: 0.68,
                description: 'Portofolio obligasi pemerintah & korporasi pilihan',
                minInvest: 50000,
                nav: 1.238,
            },
            {
                id: 'campuran',
                name: 'Batavia Dana Dinamis',
                type: '⚖️ Campuran',
                risk: 'Menengah-Tinggi',
                riskColor: '#f97316',
                returnAnnual: 13.5,
                returnMonthly: 1.125,
                description: 'Kombinasi saham & obligasi untuk pertumbuhan optimal',
                minInvest: 100000,
                nav: 2.115,
            },
            {
                id: 'saham',
                name: 'Eastspring Investments Value Discovery',
                type: '📈 Saham',
                risk: 'Tinggi',
                riskColor: '#ef4444',
                returnAnnual: 22.0,
                returnMonthly: 1.833,
                description: 'Portofolio saham pilihan strategi value investing',
                minInvest: 100000,
                nav: 3.871,
            },
        ];

        // Calculate total RD value
        let totalRdValue = 0;
        rdFunds.forEach(f => {
            const holding = rdPortfolio[f.id];
            if (holding && holding.units > 0) {
                totalRdValue += holding.units * f.nav * 1000;
            }
        });

        const totalSavingsAssets = balance + totalRdValue;

        const content = `
            <div class="savings-page-root" style="padding: 1.5rem; max-width: 1200px; margin: 0 auto; width: 100%;">

                <style>
                    .savings-tab-bar {
                        display: flex;
                        gap: 0.5rem;
                        background: rgba(0,0,0,0.3);
                        border: 1px solid rgba(255,255,255,0.08);
                        padding: 0.35rem;
                        border-radius: 14px;
                        margin-bottom: 2rem;
                    }
                    .savings-tab {
                        flex: 1;
                        padding: 0.7rem 1rem;
                        border-radius: 10px;
                        border: none;
                        background: transparent;
                        color: rgba(255,255,255,0.5);
                        font-weight: 700;
                        font-size: 0.88rem;
                        cursor: pointer;
                        transition: all 0.25s;
                        font-family: inherit;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                    }
                    .savings-tab.active {
                        background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(6, 182, 212, 0.15));
                        color: #0ea5e9;
                        border: 1px solid rgba(14, 165, 233, 0.35);
                        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
                    }
                    .savings-tab.active.rd-active {
                        background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.15));
                        color: #a855f7;
                        border-color: rgba(168, 85, 247, 0.35);
                        box-shadow: 0 4px 12px rgba(168, 85, 247, 0.15);
                    }
                    .savings-tab:hover:not(.active) {
                        background: rgba(255,255,255,0.04);
                        color: rgba(255,255,255,0.8);
                    }
                    .asset-overview-card {
                        background: linear-gradient(135deg, rgba(15,15,18,0.95) 0%, rgba(14,165,233,0.06) 100%);
                        border: 1px solid rgba(14,165,233,0.2);
                        border-radius: 20px;
                        padding: 1.75rem;
                        margin-bottom: 1.5rem;
                        position: relative;
                        overflow: hidden;
                    }
                    .asset-overview-card::before {
                        content: '';
                        position: absolute;
                        top: -60px;
                        right: -60px;
                        width: 220px;
                        height: 220px;
                        background: radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%);
                        pointer-events: none;
                    }
                    .rate-slider-card {
                        background: rgba(255,255,255,0.02);
                        border: 1px solid rgba(255,255,255,0.08);
                        border-radius: 14px;
                        padding: 1.25rem;
                        margin-bottom: 1.25rem;
                    }
                    .rate-slider {
                        width: 100%;
                        -webkit-appearance: none;
                        appearance: none;
                        height: 6px;
                        border-radius: 3px;
                        background: linear-gradient(to right, #0ea5e9 0%, #0ea5e9 var(--fill-pct, 16.67%), rgba(255,255,255,0.1) var(--fill-pct, 16.67%), rgba(255,255,255,0.1) 100%);
                        outline: none;
                        cursor: pointer;
                        margin: 0.75rem 0;
                    }
                    .rate-slider::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #0ea5e9, #06b6d4);
                        cursor: pointer;
                        box-shadow: 0 2px 8px rgba(14,165,233,0.5);
                        border: 2px solid rgba(255,255,255,0.2);
                        transition: transform 0.1s;
                    }
                    .rate-slider::-webkit-slider-thumb:hover {
                        transform: scale(1.2);
                    }
                    .rd-fund-card {
                        background: rgba(255,255,255,0.02);
                        border: 1px solid rgba(255,255,255,0.08);
                        border-radius: 16px;
                        padding: 1.25rem;
                        transition: all 0.25s;
                        cursor: pointer;
                    }
                    .rd-fund-card:hover {
                        background: rgba(255,255,255,0.04);
                        border-color: rgba(255,255,255,0.16);
                        transform: translateY(-2px);
                        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                    }
                    .rd-fund-card.has-holding {
                        border-color: rgba(168, 85, 247, 0.3);
                        background: rgba(168, 85, 247, 0.04);
                    }
                    .stats-mini-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 1rem;
                        margin-bottom: 1.5rem;
                    }
                    .stats-mini-card {
                        background: rgba(255,255,255,0.02);
                        border: 1px solid rgba(255,255,255,0.06);
                        border-radius: 12px;
                        padding: 1rem;
                        text-align: center;
                    }
                    @media (max-width: 600px) {
                        .stats-mini-grid { grid-template-columns: 1fr 1fr; }
                        .rd-funds-grid { grid-template-columns: 1fr !important; }
                    }
                </style>

                <!-- Tab Navigation -->
                <div class="savings-tab-bar">
                    <button class="savings-tab ${this.activeTab === 'deposito' ? 'active' : ''}" id="tab-deposito">
                        🏦 Deposito
                    </button>
                    <button class="savings-tab ${this.activeTab === 'reksadana' ? 'active rd-active' : ''}" id="tab-reksadana">
                        📊 Reksa Dana
                    </button>
                </div>

                <!-- Overview Card -->
                <div class="asset-overview-card">
                    <div style="display:grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: center;">
                        <div>
                            <div style="font-size:0.7rem; color: rgba(255,255,255,0.45); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:0.4rem;">
                                TOTAL ASET INVESTASI
                            </div>
                            <div style="font-size:2.5rem; font-weight:900; color:#fff; letter-spacing:-0.02em; line-height:1;">
                                <span style="color:#0ea5e9; font-size:1.6rem;">$</span> ${financeManager.formatCurrency(totalSavingsAssets)}
                            </div>
                            <div style="display:flex; gap:1.5rem; margin-top:0.75rem; flex-wrap:wrap;">
                                <div style="font-size:0.8rem; color:rgba(255,255,255,0.5);">
                                    <span style="color:#0ea5e9;">●</span> Deposito: <strong style="color:#fff;">$ ${financeManager.formatCurrency(balance, true)}</strong>
                                </div>
                                <div style="font-size:0.8rem; color:rgba(255,255,255,0.5);">
                                    <span style="color:#a855f7;">●</span> Reksa Dana: <strong style="color:#fff;">$ ${financeManager.formatCurrency(totalRdValue, true)}</strong>
                                </div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.7rem; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.08em; font-weight:700;">SALDO AKTIF</div>
                            <div style="font-size:1.1rem; font-weight:800; color:#10b981; margin-top:0.3rem;">$ ${financeManager.formatCurrency(playerBalance, true)}</div>
                            <div style="font-size:0.7rem; color:rgba(255,255,255,0.35); margin-top:0.2rem;">Saldo Rekening</div>
                        </div>
                    </div>
                </div>

                <!-- DEPOSITO TAB CONTENT -->
                <div id="section-deposito" style="display: ${this.activeTab === 'deposito' ? 'block' : 'none'};">

                    <!-- Stats Mini Grid -->
                    <div class="stats-mini-grid">
                        <div class="stats-mini-card">
                            <div style="font-size:1.5rem; margin-bottom:0.25rem;">💰</div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; margin-bottom:0.25rem;">Saldo Deposito</div>
                            <div style="font-size:1.1rem; font-weight:800; color:#0ea5e9;">$ ${financeManager.formatCurrency(balance, true)}</div>
                        </div>
                        <div class="stats-mini-card">
                            <div style="font-size:1.5rem; margin-bottom:0.25rem;">📈</div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; margin-bottom:0.25rem;">Bunga Bulanan</div>
                            <div style="font-size:1.1rem; font-weight:800; color:#10b981;">+$ ${financeManager.formatCurrency(Math.floor(balance * currentRate), true)}</div>
                        </div>
                        <div class="stats-mini-card">
                            <div style="font-size:1.5rem; margin-bottom:0.25rem;">🎯</div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; margin-bottom:0.25rem;">Rate / Tahun</div>
                            <div style="font-size:1.1rem; font-weight:800; color:#f59e0b;">${(currentRate * 12 * 100).toFixed(1)}%</div>
                        </div>
                    </div>

                    <!-- Rate Adjuster Card -->
                    <div class="rate-slider-card">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                            <div>
                                <div style="font-size:0.9rem; font-weight:700; color:#fff;">⚙️ Atur Suku Bunga Deposito</div>
                                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Pilih tingkat bunga sesuai toleransi risiko Anda</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:1.4rem; font-weight:900; color:#0ea5e9;" id="display-monthly-rate">${(currentRate * 100).toFixed(2)}%</div>
                                <div style="font-size:0.65rem; color:rgba(255,255,255,0.4);">per bulan</div>
                            </div>
                        </div>

                        <input 
                            type="range" 
                            class="rate-slider" 
                            id="slider-interest-rate"
                            min="2" 
                            max="30" 
                            step="1"
                            value="${Math.round(currentRate * 1000)}"
                            style="--fill-pct: ${((Math.round(currentRate * 1000) - 2) / (30 - 2) * 100).toFixed(1)}%"
                        >

                        <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:rgba(255,255,255,0.35); font-weight:600;">
                            <span>0.2%/bln (Risiko Sangat Rendah)</span>
                            <span>3.0%/bln (Risiko Tinggi)</span>
                        </div>

                        <!-- Rate Tier Badges -->
                        <div style="display:flex; gap:0.5rem; margin-top:1rem; flex-wrap:wrap;" id="rate-tier-badges">
                            ${this._getRateTierBadges(currentRate)}
                        </div>

                        <div style="margin-top:1rem; padding:0.75rem; background:rgba(14,165,233,0.06); border:1px solid rgba(14,165,233,0.15); border-radius:10px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap;">
                                <div style="font-size:0.8rem; color:rgba(255,255,255,0.6);">
                                    📊 Proyeksi bunga tahunan pada saldo saat ini:
                                </div>
                                <div style="font-size:1rem; font-weight:800; color:#10b981;" id="display-yearly-projection">
                                    +$ ${financeManager.formatCurrency(Math.floor(balance * currentRate * 12), true)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
                        <button class="btn btn-success btn-lg" id="btn-deposit" style="
                            background: linear-gradient(135deg, #10b981, #059669);
                            border: none;
                            padding: 0.875rem;
                            border-radius: 12px;
                            font-weight: 800;
                            font-size: 0.95rem;
                            color: #000;
                            box-shadow: 0 4px 16px rgba(16,185,129,0.3);
                            cursor: pointer;
                            transition: all 0.2s;
                        " onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(16,185,129,0.4)'" onmouseleave="this.style.transform='';this.style.boxShadow='0 4px 16px rgba(16,185,129,0.3)'">
                            📥 Setor Deposito
                        </button>
                        <button class="btn btn-secondary btn-lg" id="btn-withdraw" ${balance <= 0 ? 'disabled' : ''} style="
                            background: ${balance <= 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'};
                            border: 1px solid ${balance <= 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)'};
                            padding: 0.875rem;
                            border-radius: 12px;
                            font-weight: 800;
                            font-size: 0.95rem;
                            color: ${balance <= 0 ? 'rgba(255,255,255,0.3)' : '#fff'};
                            cursor: ${balance <= 0 ? 'not-allowed' : 'pointer'};
                            transition: all 0.2s;
                        ">
                            📤 Tarik Deposito
                        </button>
                    </div>

                    <!-- Auto Deposit Card -->
                    <div class="rate-slider-card" style="margin-bottom:1.25rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                            <div>
                                <div style="font-size:0.9rem; font-weight:700; color:#fff;">⚡ Auto Deposit Bulanan</div>
                                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Transfer otomatis setiap awal bulan</div>
                            </div>
                            <label class="switch" style="position:relative; display:inline-block; width:44px; height:22px;">
                                <input type="checkbox" id="chk-auto-deposit" ${autoDepositEnabled ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                                <span class="slider" style="position:absolute; cursor:pointer; inset:0; background-color:${autoDepositEnabled ? '#0ea5e9' : '#374151'}; border-radius:20px; transition:0.3s; display:flex; align-items:center;">
                                    <span class="knob" style="height:16px; width:16px; background-color:white; border-radius:50%; transition:0.3s; transform:translateX(${autoDepositEnabled ? '24px' : '4px'}); display:block;"></span>
                                </span>
                            </label>
                        </div>
                        
                        <div id="auto-deposit-settings-container" style="display:${autoDepositEnabled ? 'block' : 'none'}; border-top:1px solid rgba(255,255,255,0.06); padding-top:0.75rem;">
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">Jumlah setoran otomatis per bulan:</div>
                            <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.75rem;">
                                <span style="font-weight:700; color:#0ea5e9; font-size:1.1rem;">$</span>
                                <input type="number" id="input-auto-deposit-amount" class="form-input" style="flex:1; padding:8px 12px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#fff; font-weight:700;" value="${autoDepositAmount || 1000}" min="100">
                            </div>
                            <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
                                <button class="btn btn-secondary btn-sm btn-auto-amt" data-amount="1000" style="font-size:0.75rem; padding:4px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.7); cursor:pointer;">$1K</button>
                                <button class="btn btn-secondary btn-sm btn-auto-amt" data-amount="5000" style="font-size:0.75rem; padding:4px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.7); cursor:pointer;">$5K</button>
                                <button class="btn btn-secondary btn-sm btn-auto-amt" data-amount="10000" style="font-size:0.75rem; padding:4px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.7); cursor:pointer;">$10K</button>
                                <button class="btn btn-secondary btn-sm btn-auto-amt" data-amount="50000" style="font-size:0.75rem; padding:4px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.7); cursor:pointer;">$50K</button>
                                <button class="btn btn-secondary btn-sm btn-auto-amt" data-amount="100000" style="font-size:0.75rem; padding:4px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.7); cursor:pointer;">$100K</button>
                                <button class="btn btn-secondary btn-sm btn-auto-amt" data-amount="500000" style="font-size:0.75rem; padding:4px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.7); cursor:pointer;">$500K</button>
                            </div>
                        </div>
                    </div>

                    <!-- Info -->
                    <div style="padding:1rem; background:rgba(14,165,233,0.05); border:1px solid rgba(14,165,233,0.12); border-radius:12px; font-size:0.8rem; color:rgba(255,255,255,0.6); line-height:1.7;">
                        ℹ️ <strong style="color:#0ea5e9;">Cara Kerja Deposito:</strong><br>
                        • Setor dana kapan saja tanpa batas minimal<br>
                        • Bunga ditambahkan langsung ke rekening utama setiap awal bulan<br>
                        • Atur tingkat bunga sesuai kondisi ekonomi game<br>
                        • Tarik dana kapan saja tanpa penalti
                    </div>
                </div>

                <!-- REKSA DANA TAB CONTENT -->
                <div id="section-reksadana" style="display: ${this.activeTab === 'reksadana' ? 'block' : 'none'};">
                    
                    ${totalRdValue > 0 ? `
                    <!-- My Portfolio Summary -->
                    <div style="background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(139,92,246,0.04)); border: 1px solid rgba(168,85,247,0.2); border-radius:16px; padding:1.25rem; margin-bottom:1.5rem;">
                        <div style="font-size:0.75rem; color:rgba(168,85,247,0.8); text-transform:uppercase; font-weight:700; letter-spacing:0.08em; margin-bottom:0.75rem;">📊 Portofolio Reksa Dana Saya</div>
                        <div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
                            <div>
                                <div style="font-size:0.7rem; color:rgba(255,255,255,0.4); margin-bottom:0.2rem;">Total Nilai</div>
                                <div style="font-size:1.4rem; font-weight:900; color:#a855f7;">$ ${financeManager.formatCurrency(totalRdValue, true)}</div>
                            </div>
                            ${rdFunds.map(f => {
                                const h = rdPortfolio[f.id];
                                if (!h || h.units <= 0) return '';
                                const val = h.units * f.nav * 1000;
                                const profit = val - (h.investedAmount || 0);
                                const pct = h.investedAmount > 0 ? ((profit / h.investedAmount) * 100).toFixed(1) : '0.0';
                                return `
                                    <div>
                                        <div style="font-size:0.7rem; color:rgba(255,255,255,0.4); margin-bottom:0.2rem;">${f.type}</div>
                                        <div style="font-size:0.95rem; font-weight:800; color:#fff;">$ ${financeManager.formatCurrency(val, true)}</div>
                                        <div style="font-size:0.7rem; color:${profit >= 0 ? '#10b981' : '#ef4444'}; font-weight:700;">${profit >= 0 ? '+' : ''}${pct}%</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Fund List -->
                    <div style="font-size:0.8rem; color:rgba(255,255,255,0.4); font-weight:700; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:1rem;">📋 Pilih Dana Investasi</div>
                    <div class="rd-funds-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
                        ${rdFunds.map(f => {
                            const holding = rdPortfolio[f.id];
                            const hasHolding = holding && holding.units > 0;
                            const holdingValue = hasHolding ? holding.units * f.nav * 1000 : 0;
                            const profitAmt = hasHolding ? holdingValue - (holding.investedAmount || 0) : 0;
                            const profitPct = hasHolding && holding.investedAmount > 0 ? ((profitAmt / holding.investedAmount) * 100).toFixed(1) : '0.0';

                            return `
                            <div class="rd-fund-card ${hasHolding ? 'has-holding' : ''}" id="rd-card-${f.id}" data-fund-id="${f.id}">
                                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                                    <div>
                                        <div style="font-size:0.7rem; color:${f.riskColor}; font-weight:700; margin-bottom:0.25rem;">${f.type}</div>
                                        <div style="font-size:0.88rem; font-weight:800; color:#fff; line-height:1.2;">${f.name}</div>
                                    </div>
                                    <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:4px 8px; text-align:center; flex-shrink:0; margin-left:0.5rem;">
                                        <div style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:700;">NAV</div>
                                        <div style="font-size:0.85rem; font-weight:800; color:#fff;">${f.nav.toFixed(3)}</div>
                                    </div>
                                </div>

                                <div style="font-size:0.75rem; color:rgba(255,255,255,0.45); margin-bottom:0.75rem; line-height:1.4;">${f.description}</div>

                                <div style="display:flex; gap:0.75rem; margin-bottom:0.75rem; flex-wrap:wrap;">
                                    <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); border-radius:8px; padding:0.35rem 0.6rem; text-align:center;">
                                        <div style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:700;">Return/Tahun</div>
                                        <div style="font-size:0.9rem; font-weight:900; color:#10b981;">+${f.returnAnnual}%</div>
                                    </div>
                                    <div style="background:rgba(14,165,233,0.08); border:1px solid rgba(14,165,233,0.2); border-radius:8px; padding:0.35rem 0.6rem; text-align:center;">
                                        <div style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:700;">Return/Bulan</div>
                                        <div style="font-size:0.9rem; font-weight:900; color:#0ea5e9;">+${f.returnMonthly}%</div>
                                    </div>
                                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:0.35rem 0.6rem; text-align:center;">
                                        <div style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:700;">Risiko</div>
                                        <div style="font-size:0.8rem; font-weight:800; color:${f.riskColor};">${f.risk}</div>
                                    </div>
                                </div>

                                ${hasHolding ? `
                                <div style="background:rgba(168,85,247,0.06); border:1px solid rgba(168,85,247,0.15); border-radius:10px; padding:0.6rem; margin-bottom:0.75rem;">
                                    <div style="display:flex; justify-content:space-between; font-size:0.78rem;">
                                        <span style="color:rgba(255,255,255,0.5);">Nilai Investasi Saya</span>
                                        <span style="font-weight:800; color:#a855f7;">$ ${financeManager.formatCurrency(holdingValue, true)}</span>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-top:4px;">
                                        <span style="color:rgba(255,255,255,0.4);">Imbal Hasil</span>
                                        <span style="font-weight:700; color:${profitAmt >= 0 ? '#10b981' : '#ef4444'};">${profitAmt >= 0 ? '+' : ''}$ ${financeManager.formatCurrency(Math.abs(profitAmt), true)} (${profitPct}%)</span>
                                    </div>
                                </div>
                                ` : ''}

                                <div style="display:flex; gap:0.5rem;">
                                    <button class="btn-rd-buy" data-fund-id="${f.id}" style="
                                        flex:1; padding:0.6rem; border-radius:8px;
                                        background: linear-gradient(135deg, rgba(168,85,247,0.2), rgba(139,92,246,0.15));
                                        border: 1px solid rgba(168,85,247,0.3);
                                        color:#a855f7; font-weight:800; font-size:0.8rem;
                                        cursor:pointer; transition:all 0.2s; font-family:inherit;
                                    " onmouseenter="this.style.background='linear-gradient(135deg,rgba(168,85,247,0.35),rgba(139,92,246,0.25))'" 
                                      onmouseleave="this.style.background='linear-gradient(135deg,rgba(168,85,247,0.2),rgba(139,92,246,0.15))'">
                                        📥 Beli
                                    </button>
                                    ${hasHolding ? `
                                    <button class="btn-rd-sell" data-fund-id="${f.id}" style="
                                        flex:1; padding:0.6rem; border-radius:8px;
                                        background: rgba(239,68,68,0.08);
                                        border: 1px solid rgba(239,68,68,0.2);
                                        color:#ef4444; font-weight:800; font-size:0.8rem;
                                        cursor:pointer; transition:all 0.2s; font-family:inherit;
                                    " onmouseenter="this.style.background='rgba(239,68,68,0.15)'" 
                                      onmouseleave="this.style.background='rgba(239,68,68,0.08)'">
                                        📤 Jual
                                    </button>
                                    ` : ''}
                                </div>

                                <div style="margin-top:0.5rem; font-size:0.7rem; color:rgba(255,255,255,0.35);">Min. investasi: $ ${financeManager.formatCurrency(f.minInvest, true)}</div>
                            </div>
                            `;
                        }).join('')}
                    </div>

                    <!-- Reksa Dana Info -->
                    <div style="padding:1rem; background:rgba(168,85,247,0.05); border:1px solid rgba(168,85,247,0.12); border-radius:12px; font-size:0.8rem; color:rgba(255,255,255,0.6); line-height:1.7;">
                        ℹ️ <strong style="color:#a855f7;">Cara Kerja Reksa Dana:</strong><br>
                        • Investasi di berbagai instrumen sesuai tipe dana<br>
                        • Return dihitung setiap bulan & masuk ke rekening utama<br>
                        • NAV (Nilai Aktiva Bersih) bergerak mengikuti performa pasar<br>
                        • Risiko lebih tinggi = potensi imbal hasil lebih besar
                    </div>
                </div>

            </div>
        `;

        import('../../ui/ViewManager.js').then(m => {
            m.default.showDynamicView('Deposito & Investasi', 'Kelola simpanan & reksa dana Anda', content);
            this._bindEvents();
        });
    }

    _getRateTierBadges(rate) {
        const tiers = [
            { label: 'Konservatif', min: 0, max: 0.008, color: '#10b981' },
            { label: 'Moderat', min: 0.008, max: 0.015, color: '#0ea5e9' },
            { label: 'Agresif', min: 0.015, max: 0.022, color: '#f59e0b' },
            { label: 'Spekulatif', min: 0.022, max: 1, color: '#ef4444' },
        ];
        return tiers.map(t => {
            const isActive = rate >= t.min && rate < t.max;
            return `<div style="
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 0.7rem;
                font-weight: 700;
                background: ${isActive ? `rgba(${t.color === '#10b981' ? '16,185,129' : t.color === '#0ea5e9' ? '14,165,233' : t.color === '#f59e0b' ? '245,158,11' : '239,68,68'},0.15)` : 'rgba(255,255,255,0.03)'};
                border: 1px solid ${isActive ? t.color + '50' : 'rgba(255,255,255,0.06)'};
                color: ${isActive ? t.color : 'rgba(255,255,255,0.3)'};
                transition: all 0.2s;
            ">${t.label}</div>`;
        }).join('');
    }

    _bindEvents() {
        // Tab switching
        document.getElementById('tab-deposito')?.addEventListener('click', () => {
            this.activeTab = 'deposito';
            const sec1 = document.getElementById('section-deposito');
            const sec2 = document.getElementById('section-reksadana');
            const tab1 = document.getElementById('tab-deposito');
            const tab2 = document.getElementById('tab-reksadana');
            if (sec1) sec1.style.display = 'block';
            if (sec2) sec2.style.display = 'none';
            if (tab1) { tab1.classList.add('active'); tab1.classList.remove('rd-active'); }
            if (tab2) { tab2.classList.remove('active', 'rd-active'); }
        });

        document.getElementById('tab-reksadana')?.addEventListener('click', () => {
            this.activeTab = 'reksadana';
            const sec1 = document.getElementById('section-deposito');
            const sec2 = document.getElementById('section-reksadana');
            const tab1 = document.getElementById('tab-deposito');
            const tab2 = document.getElementById('tab-reksadana');
            if (sec1) sec1.style.display = 'none';
            if (sec2) sec2.style.display = 'block';
            if (tab1) tab1.classList.remove('active');
            if (tab2) { tab2.classList.add('active', 'rd-active'); }
        });

        // Deposit / Withdraw
        document.getElementById('btn-deposit')?.addEventListener('click', () => this.handleDeposit());
        document.getElementById('btn-withdraw')?.addEventListener('click', () => this.handleWithdraw());

        // Auto deposit toggle
        const chkAuto = document.getElementById('chk-auto-deposit');
        const settingsContainer = document.getElementById('auto-deposit-settings-container');
        const inputAmount = document.getElementById('input-auto-deposit-amount');

        if (chkAuto) {
            chkAuto.addEventListener('change', (e) => {
                const checked = e.target.checked;
                gameState.set('savings.autoDepositEnabled', checked);
                const slider = chkAuto.nextElementSibling;
                const knob = slider.querySelector('.knob');
                slider.style.backgroundColor = checked ? '#0ea5e9' : '#374151';
                knob.style.transform = `translateX(${checked ? '24px' : '4px'})`;
                if (checked) {
                    settingsContainer.style.display = 'block';
                    if (!gameState.get('savings.autoDepositAmount')) {
                        gameState.set('savings.autoDepositAmount', 1000);
                        if (inputAmount) inputAmount.value = 1000;
                    }
                    ui.success('Auto Deposit Bulanan Diaktifkan');
                } else {
                    settingsContainer.style.display = 'none';
                    ui.info('Auto Deposit Bulanan Dinonaktifkan');
                }
            });
        }

        if (inputAmount) {
            ui.setupNumericInput(inputAmount, {
                isDecimal: false,
                showZeroAppend: true,
                showMax: true,
                maxAmount: () => gameState.getBalance()
            });
            inputAmount.addEventListener('input', () => {
                const val = inputAmount.getNumericValue ? inputAmount.getNumericValue() : (parseInt(inputAmount.value.replace(/,/g, '')) || 0);
                gameState.set('savings.autoDepositAmount', val);
            });
        }

        document.querySelectorAll('.btn-auto-amt').forEach(btn => {
            btn.addEventListener('click', () => {
                const amt = parseInt(btn.dataset.amount) || 1000;
                gameState.set('savings.autoDepositAmount', amt);
                if (inputAmount) {
                    inputAmount.value = String(amt);
                    inputAmount.dispatchEvent(new Event('input', { bubbles: true }));
                }
                ui.success(`Jumlah auto deposit diatur ke $ ${financeManager.formatCurrency(amt)}`);
            });
        });

        // Interest Rate Slider
        const slider = document.getElementById('slider-interest-rate');
        if (slider) {
            slider.addEventListener('input', () => {
                const sliderVal = parseInt(slider.value); // 2-30 (representing 0.2% - 3.0% per month)
                const rate = sliderVal / 1000;
                const fillPct = ((sliderVal - 2) / (30 - 2) * 100).toFixed(1);
                slider.style.setProperty('--fill-pct', `${fillPct}%`);

                const monthlyDisplay = document.getElementById('display-monthly-rate');
                const yearlyProj = document.getElementById('display-yearly-projection');
                const tierBadges = document.getElementById('rate-tier-badges');

                if (monthlyDisplay) monthlyDisplay.textContent = `${(rate * 100).toFixed(2)}%`;

                const balance = savingsManager.getBalance();
                if (yearlyProj) yearlyProj.textContent = `+$ ${financeManager.formatCurrency(Math.floor(balance * rate * 12), true)}`;

                if (tierBadges) tierBadges.innerHTML = this._getRateTierBadges(rate);

                // Save to state and update manager
                gameState.set('savings.customInterestRate', rate);
                savingsManager.interestRate = rate;
            });
        }

        // Reksa Dana buy/sell buttons
        document.querySelectorAll('.btn-rd-buy').forEach(btn => {
            btn.addEventListener('click', () => this.handleRdBuy(btn.dataset.fundId));
        });
        document.querySelectorAll('.btn-rd-sell').forEach(btn => {
            btn.addEventListener('click', () => this.handleRdSell(btn.dataset.fundId));
        });
    }

    async handleDeposit() {
        const amount = await ui.promptMoney({
            title: 'Setor Deposito',
            icon: '📥',
            maxAmount: null,
            confirmText: 'Setor'
        });

        if (amount && amount > 0) {
            try {
                savingsManager.deposit(amount);
                ui.success(`Berhasil menyetor $ ${financeManager.formatCurrency(amount)} ke deposito`, '🏦 Deposito');
                this.show();
            } catch (e) {
                ui.error(e.message);
            }
        }
    }

    async handleWithdraw() {
        const balance = savingsManager.getBalance();
        const amount = await ui.promptMoney({
            title: 'Tarik Deposito',
            icon: '📤',
            maxAmount: balance,
            confirmText: 'Tarik'
        });

        if (amount && amount > 0) {
            try {
                savingsManager.withdraw(amount);
                ui.success(`Berhasil menarik $ ${financeManager.formatCurrency(amount)} dari deposito`, '🏦 Deposito');
                this.show();
            } catch (e) {
                ui.error(e.message);
            }
        }
    }

    async handleRdBuy(fundId) {
        const rdFunds = this._getRdFundData();
        const fund = rdFunds.find(f => f.id === fundId);
        if (!fund) return;

        const playerBalance = gameState.getBalance();
        const amount = await ui.promptMoney({
            title: `Beli ${fund.name}`,
            icon: '📥',
            maxAmount: playerBalance,
            confirmText: 'Beli Sekarang'
        });

        if (amount && amount > 0) {
            if (amount < fund.minInvest) {
                ui.error(`Minimal investasi $ ${financeManager.formatCurrency(fund.minInvest)} untuk dana ini`);
                return;
            }
            if (amount > playerBalance) {
                ui.error('Saldo tidak mencukupi');
                return;
            }

            // Deduct from balance
            gameState.update('player', p => ({ ...p, balance: p.balance - amount }));

            // Add units
            const units = amount / (fund.nav * 1000);
            const rdPortfolio = gameState.get('savings.reksaDana') || {};
            const existing = rdPortfolio[fundId] || { units: 0, investedAmount: 0 };
            rdPortfolio[fundId] = {
                units: existing.units + units,
                investedAmount: (existing.investedAmount || 0) + amount
            };
            gameState.set('savings.reksaDana', rdPortfolio);

            // Record transaction
            financeManager.recordTransaction({
                type: 'expense',
                category: 'savings_deposit',
                amount: -amount,
                description: `Beli Reksa Dana - ${fund.name}`
            });

            ui.success(`Berhasil membeli reksa dana ${fund.name} senilai $ ${financeManager.formatCurrency(amount, true)}`, '📊 Reksa Dana');
            this.show();
        }
    }

    async handleRdSell(fundId) {
        const rdFunds = this._getRdFundData();
        const fund = rdFunds.find(f => f.id === fundId);
        if (!fund) return;

        const rdPortfolio = gameState.get('savings.reksaDana') || {};
        const holding = rdPortfolio[fundId];
        if (!holding || holding.units <= 0) {
            ui.error('Tidak ada unit yang dimiliki');
            return;
        }

        const currentValue = Math.floor(holding.units * fund.nav * 1000);

        const confirmed = await ui.confirm({
            title: `Jual ${fund.name}?`,
            message: `Anda akan menjual seluruh unit reksa dana senilai $ ${financeManager.formatCurrency(currentValue, true)}. Lanjutkan?`,
            confirmText: 'Ya, Jual',
            confirmClass: 'btn-danger'
        });

        if (confirmed) {
            // Add proceeds to balance
            gameState.update('player', p => ({ ...p, balance: p.balance + currentValue }));

            // Remove holding
            rdPortfolio[fundId] = { units: 0, investedAmount: 0 };
            gameState.set('savings.reksaDana', rdPortfolio);

            // Record transaction
            financeManager.recordTransaction({
                type: 'income',
                category: 'Investasi',
                amount: currentValue,
                description: `Jual Reksa Dana - ${fund.name}`
            });

            ui.success(`Berhasil menjual reksa dana senilai $ ${financeManager.formatCurrency(currentValue, true)}`, '📊 Reksa Dana');
            this.show();
        }
    }

    _getRdFundData() {
        return [
            { id: 'pasar_uang', name: 'Manulife Dana Kas II', nav: 1.042, returnMonthly: 0.004, minInvest: 10000 },
            { id: 'pendapatan_tetap', name: 'Schroder Dana Prestasi Plus', nav: 1.238, returnMonthly: 0.0068, minInvest: 50000 },
            { id: 'campuran', name: 'Batavia Dana Dinamis', nav: 2.115, returnMonthly: 0.01125, minInvest: 100000 },
            { id: 'saham', name: 'Eastspring Investments Value Discovery', nav: 3.871, returnMonthly: 0.01833, minInvest: 100000 },
        ];
    }
}

export const savingsPanel = new SavingsPanel();
export default savingsPanel;
