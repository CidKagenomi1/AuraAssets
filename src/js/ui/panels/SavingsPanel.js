/**
 * SavingsPanel.js - Deposito UI Panel
 * Simple savings/deposito interface
 */

import savingsManager from '../../finance/SavingsManager.js';
import financeManager from '../../finance/FinanceManager.js';
import gameState from '../../game/GameState.js';
import ui from '../UIManager.js';

class SavingsPanel {
    show() {
        const balance = savingsManager.getBalance();
        const interestInfo = savingsManager.getInterestInfo();
        const autoDepositEnabled = gameState.get('savings.autoDepositEnabled') || false;
        const autoDepositAmount = gameState.get('savings.autoDepositAmount') || 0;

        const content = `
            <div class="modal-header">
                <h3 class="modal-title">🏦 Deposito</h3>
                <button class="modal-close">✕</button>
            </div>
            <div class="modal-body">
                <!-- Savings Balance Card -->
                <div class="card" style="background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); margin-bottom: var(--space-lg);">
                    <div style="text-align: center;">
                        <div style="font-size: var(--font-size-sm); opacity: 0.8;">Saldo Deposito</div>
                        <div style="font-size: var(--font-size-2xl); font-weight: 800;">
                            $ ${financeManager.formatCurrency(balance)}
                        </div>
                        <div style="font-size: var(--font-size-xs); opacity: 0.7; margin-top: var(--space-xs);">
                            Bunga: ${interestInfo.monthlyRatePercent}%/bulan (${interestInfo.yearlyRatePercent}%/tahun)
                        </div>
                    </div>
                </div>

                <!-- Interest Info -->
                <div class="card" style="background: var(--accent-green-soft); border: 1px solid var(--accent-green); margin-bottom: var(--space-lg);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>💰 Estimasi Bunga/Bulan</span>
                        <span style="font-weight: 700; color: var(--accent-green);">
                            +$ ${financeManager.formatCurrency(Math.floor(balance * interestInfo.monthlyRate))}
                        </span>
                    </div>
                </div>

                <!-- Actions -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); margin-bottom: var(--space-lg);">
                    <button class="btn btn-success btn-lg" id="btn-deposit">
                        📥 Setor
                    </button>
                    <button class="btn btn-secondary btn-lg" id="btn-withdraw" ${balance <= 0 ? 'disabled' : ''}>
                        📤 Tarik
                    </button>
                </div>

                <!-- Auto Deposit Card -->
                <div class="card" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: var(--space-md); border-radius: var(--radius-md); margin-bottom: var(--space-lg);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                        <span style="font-weight: 700; font-size: 0.9rem; color: white;">⚙️ Auto Deposit Bulanan</span>
                        <label class="switch" style="position: relative; display: inline-block; width: 44px; height: 22px;">
                            <input type="checkbox" id="chk-auto-deposit" ${autoDepositEnabled ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span class="slider" style="position: absolute; cursor: pointer; inset: 0; background-color: ${autoDepositEnabled ? 'var(--accent-primary)' : '#4b5563'}; border-radius: 20px; transition: 0.3s; display: flex; align-items: center;">
                                <span class="knob" style="height: 16px; width: 16px; background-color: white; border-radius: 50%; transition: 0.3s; transform: translateX(${autoDepositEnabled ? '24px' : '4px'}); display: block;"></span>
                            </span>
                        </label>
                    </div>
                    
                    <div id="auto-deposit-settings-container" style="display: ${autoDepositEnabled ? 'block' : 'none'}; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">Jumlah setoran otomatis per bulan:</div>
                        <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem;">
                            <span style="font-weight: 700; color: white; font-size: 1rem;">$</span>
                            <input type="number" id="input-auto-deposit-amount" class="form-input" style="flex: 1; padding: 6px 10px; background: rgba(0,0,0,0.2);" value="${autoDepositAmount || 1000}" min="100">
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
                            <button class="btn btn-secondary btn-sm btn-auto-amt" data-amount="1000">$ 1K</button>
                            <button class="btn btn-secondary btn-sm btn-auto-amt" data-amount="5000">$ 5K</button>
                            <button class="btn btn-secondary btn-sm btn-auto-amt" data-amount="10000">$ 10K</button>
                            <button class="btn btn-secondary btn-sm btn-auto-amt" data-amount="50000">$ 50K</button>
                            <button class="btn btn-secondary btn-sm btn-auto-amt" data-amount="100000">$ 100K</button>
                        </div>
                    </div>
                </div>

                <!-- Info -->
                <div style="padding: var(--space-md); background: var(--bg-tertiary); border-radius: var(--radius-md);">
                    <div style="font-size: var(--font-size-sm); color: var(--text-muted);">
                        ℹ️ <strong>Cara Kerja:</strong><br>
                        • Setor uang ke deposito kapan saja<br>
                        • Bunga ditambahkan otomatis setiap awal bulan<br>
                        • Tarik uang kapan saja tanpa penalti
                    </div>
                </div>
            </div>
        `;

        ui.openModal(content);
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('btn-deposit')?.addEventListener('click', () => this.handleDeposit());
        document.getElementById('btn-withdraw')?.addEventListener('click', () => this.handleWithdraw());

        const chkAuto = document.getElementById('chk-auto-deposit');
        const settingsContainer = document.getElementById('auto-deposit-settings-container');
        const inputAmount = document.getElementById('input-auto-deposit-amount');

        if (chkAuto) {
            chkAuto.addEventListener('change', (e) => {
                const checked = e.target.checked;
                gameState.set('savings.autoDepositEnabled', checked);
                
                // Update switch style
                const slider = chkAuto.nextElementSibling;
                const knob = slider.querySelector('.knob');
                slider.style.backgroundColor = checked ? 'var(--accent-primary)' : '#4b5563';
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
            inputAmount.addEventListener('input', () => {
                const val = parseInt(inputAmount.value) || 0;
                gameState.set('savings.autoDepositAmount', val);
            });
        }

        document.querySelectorAll('.btn-auto-amt').forEach(btn => {
            btn.addEventListener('click', () => {
                const amt = parseInt(btn.dataset.amount) || 1000;
                gameState.set('savings.autoDepositAmount', amt);
                if (inputAmount) inputAmount.value = amt;
                ui.success(`Jumlah auto deposit diatur ke $ ${financeManager.formatCurrency(amt)}`);
            });
        });
    }

    async handleDeposit() {
        const amount = await ui.promptMoney({
            title: 'Setor Deposito',
            icon: '📥',
            maxAmount: null, // Use player balance
            confirmText: 'Setor'
        });

        if (amount && amount > 0) {
            try {
                savingsManager.deposit(amount);
                ui.success(`Berhasil menyetor $ ${financeManager.formatCurrency(amount)}`, 'Deposito');
                this.show(); // Refresh panel
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
                ui.success(`Berhasil menarik $ ${financeManager.formatCurrency(amount)}`, 'Deposito');
                this.show(); // Refresh panel
            } catch (e) {
                ui.error(e.message);
            }
        }
    }
}

export const savingsPanel = new SavingsPanel();
export default savingsPanel;
