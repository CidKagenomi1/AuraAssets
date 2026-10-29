/**
 * SavingsPanel.js - Professional Time Deposit & Bank Savings Terminal
 * Integrated with macroeconomic cycles, realistic tenors, and certificates.
 */

import savingsManager from '../../finance/SavingsManager.js';
import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../core/GameState.js';
import ui from '../../ui/UIManager.js';
import { Icons } from '../../ui/Icons.js';

class SavingsPanel {
    show() {
        this.render();
    }

    render() {
        const balance = savingsManager.getBalance();
        const timeDeposits = savingsManager.getTimeDeposits();
        const totalSavings = savingsManager.getTotalSavings();
        const interestInfo = savingsManager.getInterestInfo();
        const autoDepositEnabled = gameState.get('savings.autoDepositEnabled') || false;
        const autoDepositAmount = gameState.get('savings.autoDepositAmount') || 0;
        const playerBalance = gameState.getBalance();
        const tenors = savingsManager.getTenorOptions();
        const econ = gameState.get('economy') || {};

        const totalActiveDeposits = timeDeposits.reduce((sum, d) => sum + (d.principal || 0), 0);
        const totalProjectedInterest = timeDeposits.reduce((sum, d) => sum + (d.projectedInterest || 0), 0);

        const content = `
            <div class="savings-page-root" style="padding: 1.5rem; max-width: 1100px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 1.5rem;">

                <!-- 1. Central Bank & Macroeconomic Benchmark Rate Banner -->
                <div style="
                    background: linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(30, 41, 59, 0.5) 100%);
                    border: 1px solid rgba(14, 165, 233, 0.3);
                    border-radius: var(--radius-lg);
                    padding: 1.25rem 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                ">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="
                            width: 52px; height: 52px; border-radius: 14px;
                            background: rgba(14, 165, 233, 0.15);
                            border: 1px solid rgba(14, 165, 233, 0.35);
                            display: flex; align-items: center; justify-content: center;
                            font-size: 1.6rem;
                        ">🏛️</div>
                        <div>
                            <div style="font-size: 0.72rem; color: #38bdf8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px;">
                                Bank Sentral • Kebijakan Moneter
                            </div>
                            <h2 style="font-size: 1.15rem; font-weight: 900; color: #fff; margin: 0;">
                                Suku Bunga Acuan Pasar: <span style="color: #38bdf8;">${interestInfo.benchmarkRate.toFixed(2)}% p.a.</span>
                            </h2>
                            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 3px 0 0 0;">
                                Siklus Makroekonomi: <strong style="color: #fff;">${econ.phase || 'Ekspansi'}</strong> · Suku bunga deposito dijamin lembaga penjamin simpanan.
                            </p>
                        </div>
                    </div>

                    <div style="display: flex; gap: 0.75rem; align-items: center;">
                        <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 6px 14px; text-align: right;">
                            <div style="font-size: 0.68rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Tabungan Fleksibel</div>
                            <div style="font-size: 0.95rem; font-weight: 800; color: #10b981;">${interestInfo.flexibleAnnualRate.toFixed(2)}% p.a.</div>
                        </div>
                        <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 6px 14px; text-align: right;">
                            <div style="font-size: 0.68rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Max Yield Deposito</div>
                            <div style="font-size: 0.95rem; font-weight: 800; color: #38bdf8;">${tenors[tenors.length - 1].rateAnnual.toFixed(2)}% p.a.</div>
                        </div>
                    </div>
                </div>

                <!-- 2. Portfolio Balance Overview Cards -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
                    
                    <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.15rem;">
                        <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Total Aset Simpanan Bank</span>
                        <div style="font-size: 1.75rem; font-weight: 900; color: #38bdf8; margin: 4px 0 2px 0;">
                            $ ${financeManager.formatCurrency(totalSavings, true)}
                        </div>
                        <span style="font-size: 0.72rem; color: var(--text-dim);">Tabungan Fleksibel + Deposito Berjangka</span>
                    </div>

                    <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.15rem;">
                        <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Tabungan Kas Fleksibel</span>
                        <div style="font-size: 1.75rem; font-weight: 900; color: #10b981; margin: 4px 0 2px 0;">
                            $ ${financeManager.formatCurrency(balance, true)}
                        </div>
                        <span style="font-size: 0.72rem; color: var(--text-dim);">Likuid instan · Bunga ${(interestInfo.flexibleMonthlyRate * 100).toFixed(2)}%/bulan</span>
                    </div>

                    <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.15rem;">
                        <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Deposito Berjangka Aktif</span>
                        <div style="font-size: 1.75rem; font-weight: 900; color: #fbbf24; margin: 4px 0 2px 0;">
                            $ ${financeManager.formatCurrency(totalActiveDeposits, true)}
                        </div>
                        <span style="font-size: 0.72rem; color: var(--text-dim);">${timeDeposits.length} Sertifikat Aktif · Proyeksi Bunga: +$ ${financeManager.formatCurrency(totalProjectedInterest, true)}</span>
                    </div>

                </div>

                <!-- 3. Form Pembukaan Sertifikat Deposito Berjangka Baru -->
                <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem;">
                    
                    <div style="margin-bottom: 1.25rem;">
                        <h2 style="font-size: 1.1rem; font-weight: 900; color: #fff; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                            <span>📑</span> Buka Sertifikat Deposito Berjangka (Time Deposit)
                        </h2>
                        <p style="font-size: 0.78rem; color: var(--text-muted); margin: 3px 0 0 0;">
                            Kunci dana kas dengan jaminan imbal hasil pasti hingga jatuh tempo. Tanpa risiko fluktuasi pasar bursa.
                        </p>
                    </div>

                    <!-- Tenor Selection Cards -->
                    <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.6rem;">
                        1. Pilih Tenor Jangka Waktu
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem;">
                        ${tenors.map((t, idx) => `
                            <div class="tenor-option-card ${idx === 1 ? 'selected' : ''}" data-tenor-days="${t.tenorDays}" data-rate="${t.rateAnnual}" data-min="${t.minDeposit}" style="
                                background: ${idx === 1 ? 'rgba(14, 165, 233, 0.12)' : 'rgba(255,255,255,0.02)'};
                                border: 1.5px solid ${idx === 1 ? '#0ea5e9' : 'rgba(255,255,255,0.07)'};
                                border-radius: var(--radius-md);
                                padding: 1rem;
                                cursor: pointer;
                                transition: all 0.2s;
                            ">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
                                    <span style="font-weight: 800; font-size: 0.92rem; color: #fff;">${t.label}</span>
                                    <span style="font-size: 0.85rem; font-weight: 900; color: #38bdf8; background: rgba(56, 189, 248, 0.12); padding: 2px 6px; border-radius: 6px;">
                                        ${t.rateAnnual.toFixed(2)}% p.a.
                                    </span>
                                </div>
                                <div style="font-size: 0.72rem; color: var(--text-dim); margin-bottom: 0.5rem; line-height: 1.35;">
                                    ${t.desc}
                                </div>
                                <div style="font-size: 0.68rem; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.4rem;">
                                    Min: <strong style="color: #fff;">$ ${financeManager.formatCurrency(t.minDeposit)}</strong>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Input Nominal & Simulation -->
                    <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.6rem;">
                        2. Masukkan Nominal Deposito (Saldo Kas Utama: $ ${financeManager.formatCurrency(playerBalance, true)})
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                        <div>
                            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <div style="position: relative; flex: 1;">
                                    <span style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-weight: 800;">$</span>
                                    <input type="number" id="input-deposit-amount" value="10000" min="1000" step="500" style="
                                        width: 100%;
                                        background: rgba(255,255,255,0.03);
                                        border: 1px solid var(--border-color);
                                        border-radius: var(--radius-md);
                                        padding: 0.75rem 1rem 0.75rem 2rem;
                                        color: #fff;
                                        font-weight: 800;
                                        font-size: 1.1rem;
                                    ">
                                </div>
                                <button class="btn btn-secondary" id="btn-quick-max-deposit" style="font-size: 0.78rem; font-weight: 800; padding: 0 14px;">
                                    MAKS
                                </button>
                            </div>
                            <!-- Quick amount pills -->
                            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                                <button class="btn-quick-amount btn btn-secondary btn-sm" data-amount="2500" style="font-size: 0.7rem; padding: 3px 8px;">+$ 2.5K</button>
                                <button class="btn-quick-amount btn btn-secondary btn-sm" data-amount="5000" style="font-size: 0.7rem; padding: 3px 8px;">+$ 5K</button>
                                <button class="btn-quick-amount btn btn-secondary btn-sm" data-amount="10000" style="font-size: 0.7rem; padding: 3px 8px;">+$ 10K</button>
                                <button class="btn-quick-amount btn btn-secondary btn-sm" data-amount="50000" style="font-size: 0.7rem; padding: 3px 8px;">+$ 50K</button>
                            </div>
                        </div>

                        <!-- Real-time Projection Summary Box -->
                        <div id="deposit-simulation-box" style="
                            background: rgba(0,0,0,0.25);
                            border: 1px solid rgba(255,255,255,0.06);
                            border-radius: var(--radius-md);
                            padding: 0.85rem 1rem;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                        ">
                            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                                <span style="color: var(--text-muted);">Proyeksi Imbal Hasil Bunga:</span>
                                <strong id="sim-interest" style="color: #10b981; font-size: 0.95rem;">+$ 168.75</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px;">
                                <span style="color: var(--text-muted);">Total Pengembalian Jatuh Tempo:</span>
                                <strong id="sim-total-payout" style="color: #fff; font-size: 0.95rem;">$ 10,168.75</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-dim); border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px;">
                                <span>Penalti Pencairan Dini:</span>
                                <span id="sim-penalty">Bunga hangus + biaya 0.5%</span>
                            </div>
                        </div>
                    </div>

                    <!-- Auto Roll Over (ARO) Toggle -->
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1.25rem;">
                        <div>
                            <strong style="color: #fff; font-size: 0.85rem; display: block;">Perpanjangan Otomatis (Automatic Roll-Over / ARO)</strong>
                            <span style="font-size: 0.72rem; color: var(--text-dim);">Saat jatuh tempo, pokok diperpanjang otomatis dan keuntungan bunga langsung dicairkan ke kas utama.</span>
                        </div>
                        <label class="switch" style="position:relative; display:inline-block; width:44px; height:22px; flex-shrink:0;">
                            <input type="checkbox" id="chk-deposit-aro" checked style="opacity:0; width:0; height:0;">
                            <span class="slider" style="position:absolute; cursor:pointer; inset:0; background-color:#0ea5e9; border-radius:20px; transition:0.3s; display:flex; align-items:center;">
                                <span class="knob" style="height:16px; width:16px; background-color:white; border-radius:50%; transition:0.3s; transform:translateX(24px); display:block;"></span>
                            </span>
                        </label>
                    </div>

                    <button id="btn-submit-deposit" class="btn btn-primary" style="
                        width: 100%;
                        font-weight: 800;
                        font-size: 0.9rem;
                        padding: 12px 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.25);
                    ">
                        <span>🔒</span> BUKA SERTIFIKAT DEPOSITO SEKARANG
                    </button>
                </div>

                <!-- 4. Daftar Sertifikat Deposito Aktif Milik Pemain -->
                <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                        <div>
                            <h2 style="font-size: 1.1rem; font-weight: 900; color: #fff; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                                <span>📜</span> Sertifikat Deposito Aktif Anda
                            </h2>
                            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0 0;">
                                Portofolio deposito yang sedang berjalan dan mengakumulasi imbal hasil pasti.
                            </p>
                        </div>
                        <span style="font-size: 0.72rem; font-weight: 800; color: #38bdf8; background: rgba(56, 189, 248, 0.12); padding: 4px 10px; border-radius: 8px;">
                            ${timeDeposits.length} Sertifikat Terbit
                        </span>
                    </div>

                    <div id="active-deposits-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
                        ${timeDeposits.length === 0 ? `
                            <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-dim); background: rgba(255,255,255,0.01); border-radius: var(--radius-md); border: 1px dashed rgba(255,255,255,0.08);">
                                <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🏦</div>
                                <div style="font-weight: 700; color: #fff; margin-bottom: 0.25rem;">Belum Ada Sertifikat Deposito Aktif</div>
                                <div style="font-size: 0.75rem;">Pilih tenor dan investasikan modal kas Anda di atas untuk memperoleh imbal hasil pasti.</div>
                            </div>
                        ` : timeDeposits.map(dep => {
                            const progressPct = Math.max(0, Math.min(100, Math.floor(((dep.tenorDays - dep.daysRemaining) / dep.tenorDays) * 100)));
                            return `
                                <div style="
                                    background: rgba(255,255,255,0.02);
                                    border: 1px solid rgba(255,255,255,0.07);
                                    border-radius: var(--radius-md);
                                    padding: 1rem 1.25rem;
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    flex-wrap: wrap;
                                    gap: 1rem;
                                ">
                                    <div style="min-width: 200px;">
                                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 4px;">
                                            <span style="font-weight: 900; font-size: 1.05rem; color: #fff;">
                                                $ ${financeManager.formatCurrency(dep.principal, true)}
                                            </span>
                                            <span style="font-size: 0.7rem; font-weight: 800; color: #38bdf8; background: rgba(56, 189, 248, 0.12); padding: 2px 6px; border-radius: 4px;">
                                                ${dep.tenorLabel} · ${dep.rateAnnual}% p.a.
                                            </span>
                                            ${dep.autoRollOver ? `
                                                <span style="font-size: 0.65rem; font-weight: 800; color: #10b981; background: rgba(16, 185, 129, 0.12); padding: 2px 6px; border-radius: 4px;">
                                                    ARO ON
                                                </span>
                                            ` : ''}
                                        </div>
                                        <div style="font-size: 0.72rem; color: var(--text-dim);">
                                            Sertifikat: <code style="color: var(--text-muted);">${dep.id}</code>
                                        </div>
                                    </div>

                                    <!-- Progress Days & Projection -->
                                    <div style="flex: 1; min-width: 180px; max-width: 320px;">
                                        <div style="display: flex; justify-content: space-between; font-size: 0.72rem; margin-bottom: 4px;">
                                            <span style="color: var(--text-muted);">Sisa Waktu: <strong style="color: #fff;">${dep.daysRemaining} Hari</strong></span>
                                            <span style="color: #10b981; font-weight: 800;">+$ ${financeManager.formatCurrency(dep.projectedInterest, true)}</span>
                                        </div>
                                        <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;">
                                            <div style="width: ${progressPct}%; height: 100%; background: linear-gradient(90deg, #0ea5e9, #10b981); border-radius: 3px;"></div>
                                        </div>
                                    </div>

                                    <div>
                                        <button class="btn btn-secondary btn-sm btn-break-deposit" data-id="${dep.id}" style="
                                            font-size: 0.75rem;
                                            font-weight: 800;
                                            padding: 6px 12px;
                                            border-color: rgba(239, 68, 68, 0.3);
                                            color: #f87171;
                                        ">
                                            Pencairan Dini (Break)
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- 5. Tabungan Fleksibel (Setor, Tarik, Auto-Deposit) -->
                <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem;">
                    <div style="margin-bottom: 1.25rem;">
                        <h2 style="font-size: 1.1rem; font-weight: 900; color: #fff; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                            <span>💵</span> Tabungan Kas Fleksibel (On-Demand)
                        </h2>
                        <p style="font-size: 0.78rem; color: var(--text-muted); margin: 3px 0 0 0;">
                            Likuiditas harian berbunga ${(interestInfo.flexibleAnnualRate).toFixed(2)}% p.a. Bebas setor dan tarik kapan saja tanpa masa tunggu.
                        </p>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem;">
                        <!-- Setor Kas -->
                        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-md); padding: 1rem;">
                            <div style="font-size: 0.75rem; font-weight: 800; color: #10b981; text-transform: uppercase; margin-bottom: 0.5rem;">
                                + Setor Kas ke Tabungan
                            </div>
                            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <input type="number" id="input-flex-deposit" placeholder="Nominal USD..." min="100" style="
                                    flex: 1;
                                    background: rgba(0,0,0,0.3);
                                    border: 1px solid var(--border-color);
                                    border-radius: var(--radius-md);
                                    padding: 8px 12px;
                                    color: #fff;
                                    font-weight: 700;
                                    font-size: 0.9rem;
                                ">
                                <button id="btn-submit-flex-deposit" class="btn btn-primary" style="font-weight: 800; font-size: 0.8rem; padding: 0 16px;">
                                    SETOR
                                </button>
                            </div>
                            <span style="font-size: 0.7rem; color: var(--text-dim);">Saldo Kas Utama: $ ${financeManager.formatCurrency(playerBalance, true)}</span>
                        </div>

                        <!-- Tarik Kas -->
                        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-md); padding: 1rem;">
                            <div style="font-size: 0.75rem; font-weight: 800; color: #38bdf8; text-transform: uppercase; margin-bottom: 0.5rem;">
                                - Tarik Kas ke Saldo Utama
                            </div>
                            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <input type="number" id="input-flex-withdraw" placeholder="Nominal USD..." min="100" style="
                                    flex: 1;
                                    background: rgba(0,0,0,0.3);
                                    border: 1px solid var(--border-color);
                                    border-radius: var(--radius-md);
                                    padding: 8px 12px;
                                    color: #fff;
                                    font-weight: 700;
                                    font-size: 0.9rem;
                                ">
                                <button id="btn-submit-flex-withdraw" class="btn btn-secondary" style="font-weight: 800; font-size: 0.8rem; padding: 0 16px;">
                                    TARIK
                                </button>
                            </div>
                            <span style="font-size: 0.7rem; color: var(--text-dim);">Saldo Tabungan Fleksibel: $ ${financeManager.formatCurrency(balance, true)}</span>
                        </div>
                    </div>

                    <!-- Auto-Deposit Bulanan -->
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-md); padding: 0.85rem 1rem; flex-wrap: wrap; gap: 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <span style="font-size: 1.4rem;">🔄</span>
                            <div>
                                <strong style="color: #fff; font-size: 0.85rem; display: block;">Auto-Deposit Bulanan Otomatis</strong>
                                <span style="font-size: 0.72rem; color: var(--text-dim);">Transfer otomatis sejumlah dana kas ke tabungan fleksibel setiap awal bulan game.</span>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <input type="number" id="input-auto-deposit-amt" value="${autoDepositAmount || 1000}" min="100" step="100" style="
                                width: 110px;
                                background: rgba(255,255,255,0.05);
                                border: 1px solid var(--border-color);
                                border-radius: 6px;
                                padding: 6px 10px;
                                color: #fff;
                                font-weight: 700;
                                font-size: 0.82rem;
                            ">
                            <label class="switch" style="position:relative; display:inline-block; width:44px; height:22px; flex-shrink:0;">
                                <input type="checkbox" id="chk-auto-deposit" ${autoDepositEnabled ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                                <span class="slider" style="position:absolute; cursor:pointer; inset:0; background-color:${autoDepositEnabled ? '#10b981' : '#374151'}; border-radius:20px; transition:0.3s; display:flex; align-items:center;">
                                    <span class="knob" style="height:16px; width:16px; background-color:white; border-radius:50%; transition:0.3s; transform:translateX(${autoDepositEnabled ? '24px' : '4px'}); display:block;"></span>
                                </span>
                            </label>
                        </div>
                    </div>

                </div>

            </div>
        `;

        import('../../ui/ViewManager.js').then(m => {
            const viewManager = m.default;
            viewManager.showDynamicView('Layanan Perbankan & Deposito', 'Manajemen sertifikat deposito berjangka & tabungan kas berbunga', content);
            this.bindEvents();
        });
    }

    bindEvents() {
        const container = document.getElementById('dynamic-view-content');
        if (!container) return;

        let selectedTenorDays = 7;
        let selectedRate = 0;
        let selectedMin = 1000;
        let selectedPenalty = 0.25;

        // Find initial selected tenor
        const selectedOption = container.querySelector('.tenor-option-card.selected');
        if (selectedOption) {
            selectedTenorDays = parseInt(selectedOption.dataset.tenorDays);
            selectedRate = parseFloat(selectedOption.dataset.rate);
            selectedMin = parseFloat(selectedOption.dataset.min);
        }

        const updateSimulation = () => {
            const amountInput = document.getElementById('input-deposit-amount');
            const amt = Math.max(0, parseFloat(amountInput?.value) || 0);
            const simInterestEl = document.getElementById('sim-interest');
            const simTotalPayoutEl = document.getElementById('sim-total-payout');
            const simPenaltyEl = document.getElementById('sim-penalty');

            const interest = amt > 0 ? Math.max(1, Math.round(amt * (selectedRate / 100) * (selectedTenorDays / 360))) : 0;
            const total = amt + interest;

            if (simInterestEl) simInterestEl.textContent = `+$ ${financeManager.formatCurrency(interest, true)}`;
            if (simTotalPayoutEl) simTotalPayoutEl.textContent = `$ ${financeManager.formatCurrency(total, true)}`;
            if (simPenaltyEl) {
                if (selectedTenorDays <= 3) {
                    simPenaltyEl.textContent = 'Bunga berjalan hangus jika ditarik dini';
                } else {
                    const penaltyPct = selectedTenorDays === 7 ? 0.25 : (selectedTenorDays === 14 ? 0.5 : 1.0);
                    simPenaltyEl.textContent = `Bunga hangus + biaya admin ${penaltyPct}%`;
                }
            }
        };

        // Tenor card click
        container.querySelectorAll('.tenor-option-card').forEach(card => {
            card.addEventListener('click', () => {
                container.querySelectorAll('.tenor-option-card').forEach(c => {
                    c.classList.remove('selected');
                    c.style.background = 'rgba(255,255,255,0.02)';
                    c.style.borderColor = 'rgba(255,255,255,0.07)';
                });
                card.classList.add('selected');
                card.style.background = 'rgba(14, 165, 233, 0.12)';
                card.style.borderColor = '#0ea5e9';

                selectedTenorDays = parseInt(card.dataset.tenorDays);
                selectedRate = parseFloat(card.dataset.rate);
                selectedMin = parseFloat(card.dataset.min);
                updateSimulation();
            });
        });

        // Input amount change
        document.getElementById('input-deposit-amount')?.addEventListener('input', updateSimulation);

        // Quick amount buttons
        container.querySelectorAll('.btn-quick-amount').forEach(btn => {
            btn.addEventListener('click', () => {
                const add = parseFloat(btn.dataset.amount);
                const input = document.getElementById('input-deposit-amount');
                if (input) {
                    input.value = (parseFloat(input.value) || 0) + add;
                    updateSimulation();
                }
            });
        });

        // Max deposit button
        document.getElementById('btn-quick-max-deposit')?.addEventListener('click', () => {
            const input = document.getElementById('input-deposit-amount');
            const playerBal = gameState.getBalance();
            if (input) {
                input.value = Math.max(0, Math.floor(playerBal));
                updateSimulation();
            }
        });

        // Submit new time deposit
        document.getElementById('btn-submit-deposit')?.addEventListener('click', () => {
            const input = document.getElementById('input-deposit-amount');
            const amt = parseFloat(input?.value) || 0;
            const aro = document.getElementById('chk-deposit-aro')?.checked || false;

            try {
                const dep = savingsManager.openTimeDeposit(amt, selectedTenorDays, aro);
                ui.success(
                    `Sertifikat Deposito $ ${financeManager.formatCurrency(dep.principal)} berhasil dibuka (${dep.tenorLabel} @ ${dep.rateAnnual}% p.a.)!`,
                    '🏦 Deposito Sukses'
                );
                this.render();
            } catch (err) {
                ui.error(err.message);
            }
        });

        // Break active deposit
        container.querySelectorAll('.btn-break-deposit').forEach(btn => {
            btn.addEventListener('click', async () => {
                const depId = btn.dataset.id;
                const deposits = savingsManager.getTimeDeposits();
                const dep = deposits.find(d => d.id === depId);
                if (!dep) return;

                const penaltyAmt = Math.floor(dep.principal * (dep.penaltyPercent / 100));
                const refundAmt = dep.principal - penaltyAmt;

                const confirmed = await ui.confirm({
                    title: 'Pencairan Dini Deposito?',
                    message: `Deposito ini belum jatuh tempo (sisa ${dep.daysRemaining} hari). Pencairan sekarang akan membatalkan seluruh bunga proyeksi ($ ${financeManager.formatCurrency(dep.projectedInterest)}) dan dikenakan potongan biaya penalti admin $ ${financeManager.formatCurrency(penaltyAmt)}. Total pengembalian: $ ${financeManager.formatCurrency(refundAmt)}. Apakah Anda yakin?`,
                    confirmText: 'Ya, Cairkan Sekarang',
                    danger: true
                });

                if (confirmed) {
                    try {
                        savingsManager.breakTimeDeposit(depId);
                        ui.success(`Deposito berhasil dicairkan lebih awal. Kas +$ ${financeManager.formatCurrency(refundAmt)} telah masuk ke saldo utama.`, 'Pencairan Berhasil');
                        this.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Flexible Deposit
        document.getElementById('btn-submit-flex-deposit')?.addEventListener('click', () => {
            const input = document.getElementById('input-flex-deposit');
            const amt = parseFloat(input?.value) || 0;
            try {
                savingsManager.deposit(amt);
                ui.success(`Berhasil menyetor $ ${financeManager.formatCurrency(amt)} ke tabungan fleksibel!`);
                this.render();
            } catch (err) {
                ui.error(err.message);
            }
        });

        // Flexible Withdraw
        document.getElementById('btn-submit-flex-withdraw')?.addEventListener('click', () => {
            const input = document.getElementById('input-flex-withdraw');
            const amt = parseFloat(input?.value) || 0;
            try {
                savingsManager.withdraw(amt);
                ui.success(`Berhasil menarik $ ${financeManager.formatCurrency(amt)} dari tabungan fleksibel ke saldo kas!`);
                this.render();
            } catch (err) {
                ui.error(err.message);
            }
        });

        // Auto-deposit toggle & amount
        const chkAuto = document.getElementById('chk-auto-deposit');
        const inputAutoAmt = document.getElementById('input-auto-deposit-amt');

        chkAuto?.addEventListener('change', (e) => {
            const checked = e.target.checked;
            gameState.set('savings.autoDepositEnabled', checked);
            const slider = chkAuto.nextElementSibling;
            const knob = slider.querySelector('.knob');
            slider.style.backgroundColor = checked ? '#10b981' : '#374151';
            knob.style.transform = `translateX(${checked ? '24px' : '4px'})`;
            ui.success(checked ? 'Auto-deposit bulanan diaktifkan' : 'Auto-deposit bulanan dinonaktifkan');
        });

        inputAutoAmt?.addEventListener('change', (e) => {
            const val = Math.max(100, parseFloat(e.target.value) || 100);
            gameState.set('savings.autoDepositAmount', val);
            ui.success(`Nominal auto-deposit bulanan diubah ke $ ${financeManager.formatCurrency(val)}`);
        });

        // Initial simulation update
        updateSimulation();
    }
}

export const savingsPanel = new SavingsPanel();
export default savingsPanel;
