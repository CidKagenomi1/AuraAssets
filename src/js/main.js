/**
 * main.js - Application Entry Point (v2)
 * Simplified: No AI competitor, no news feed, no real-price fetching.
 * Role-based gameplay system introduced.
 */

// Game Systems
import gameState from './core/GameState.js';
import timeManager from './core/TimeManager.js';
import globalEconomy from './core/GlobalEconomy.js';
import earnManager from './core/EarnManager.js';
import roleManager from './core/RoleManager.js';

// Financial Systems
import financeManager from './finance/FinanceManager.js';
import stockMarket from './trading/StockMarket.js';
import cryptoMarket from './trading/CryptoMarket.js';
import bankSystem from './finance/BankSystem.js';
import taxSystem from './finance/TaxSystem.js';
import savingsManager from './finance/SavingsManager.js';
import propertyManager from './property/PropertyManager.js';
import passiveIncomeManager from './trading/PassiveIncomeManager.js';

// UI
import ui from './ui/UIManager.js';
import homeScreen from './ui/HomeScreen.js';
import viewManager from './ui/ViewManager.js';
import { fadeIn, staggerFadeUp } from './ui/Animations.js';
import loginPortal from './ui/LoginPortal.js';
import keyboardNavigation from './ui/KeyboardNavigation.js';

class BusinessTycoonGame {
    constructor() {
        this.isInitialized = false;
    }

    async init() {
        console.log('💼 AuraAssets v2 - Initializing Professional Workspace...');

        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }

        try {
            ui.init();

            // Show portal if: not logged in, OR logged in but no character is active yet
            if (!gameState.currentUser || !gameState.activeCharacter) {
                await loginPortal.show();
            }

            homeScreen.init();
            viewManager.init();
            keyboardNavigation.init();

            // Apply role-based visibility after UI is ready
            roleManager.applyVisibility();

            this.startGameSystems();

            // Start 24h session checker
            setInterval(() => {
                gameState.checkSession();
            }, 10000);

            // BUG-05 FIX: Handle session expiry with non-blocking notification
            document.addEventListener('sessionExpired', (e) => {
                ui.warning(e.detail?.message || 'Sesi Anda telah berakhir. Silakan login kembali.', '⏰ Sesi Berakhir', { deviceNotify: true });
            }, { once: true });
            
            // If not a first-time player, finish loading immediately
            if (gameState.get('player.createdAt') && gameState.get('player.role')) {
                this.finishLoading();
            }

            // First-time player: show welcome → risk profile questionnaire
            if (!gameState.get('player.createdAt') || !gameState.get('player.role')) {
                // Finish loading first so modal is visible on top of app shell
                this.finishLoading();
                await this.showWelcomeScreen();
            }

            // Navigate directly to the Trading Dashboard
            viewManager.switchView('market');

            console.log('✅ Game initialized! Risk Profile:', roleManager.getRole());
            this.isInitialized = true;
        } catch (error) {
            console.error('❌ Critical Initialization Error:', error);
            this.showError(error);
        }

        window.game = {
            state: gameState,
            time: timeManager,
            economy: globalEconomy,
            finance: financeManager,
            stocks: stockMarket,
            crypto: cryptoMarket,
            bank: bankSystem,
            tax: taxSystem,
            ui,
            role: roleManager,
            passiveIncome: passiveIncomeManager
        };
    }

    // ==========================================
    // WELCOME & INVESTOR RISK PROFILE ASSESSMENT
    // ==========================================

    async showWelcomeScreen() {
        return new Promise((resolve) => {
            const defaultName = gameState.activeCharacter || gameState.currentUser || 'Player';
            const nameStep = `
                <div class="modal-header" style="border-bottom: 1px solid var(--border-color); padding: 1.5rem;">
                    <h3 class="modal-title" style="display: flex; align-items: center; gap: 0.5rem;">💼 Inisialisasi Profil Investor</h3>
                </div>
                <div class="modal-body" style="text-align:center; padding: 2rem 1.5rem;">
                    <div style="margin-bottom:1.5rem; display: flex; justify-content: center;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                    </div>
                    <h2 style="margin-bottom:0.5rem;font-size:1.75rem;font-weight:800;letter-spacing:-0.02em;">AuraAssets</h2>
                    <p style="color:var(--text-muted);margin-bottom:2rem;font-size:0.85rem;line-height:1.5;">
                        Terminal perdagangan saham & manajemen portofolio terpadu. Mari tentukan profil risiko investasi Anda sebelum masuk ke lantai bursa.
                    </p>
                    <div class="form-group" style="text-align:left;">
                        <label class="form-label">Nama Investor / Trader ID</label>
                        <input type="text" id="player-name" class="form-input" placeholder="Masukkan nama..." value="${defaultName}" autocomplete="off">
                    </div>
                </div>
                <div class="modal-footer" style="border-top: 1px solid var(--border-color); padding: 1rem 1.5rem;">
                    <button class="btn btn-primary" style="width:100%" id="btn-next-role">
                        Mulai Analisis Profil Risiko →
                    </button>
                </div>
            `;

            ui.openModal(nameStep);

            document.getElementById('btn-next-role').addEventListener('click', () => {
                const name = document.getElementById('player-name').value.trim() || defaultName;
                gameState.set('player.name', name);
                this.showRiskAssessment(resolve, 0, []);
            });
        });
    }

    showRiskAssessment(resolve, stepIndex = 0, answers = []) {
        const questions = roleManager.getQuestions();
        if (stepIndex >= questions.length) {
            const concludedId = roleManager.evaluateRiskProfile(answers);
            this.showRiskConclusion(concludedId, answers, resolve);
            return;
        }

        const q = questions[stepIndex];
        const progressPct = Math.round(((stepIndex + 1) / questions.length) * 100);

        const optionsHTML = q.options.map((opt, idx) => `
            <div class="risk-option-card" data-score="${opt.score}" style="
                background: var(--bg-surface);
                border: 2px solid var(--border-color);
                border-radius: var(--radius-lg);
                padding: 1rem 1.15rem;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-bottom: 0.75rem;
                display: flex;
                align-items: flex-start;
                gap: 0.85rem;
            ">
                <div style="
                    width: 28px; height: 28px; border-radius: 50%;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid var(--border-color);
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 800; font-size: 0.8rem; color: var(--accent-primary);
                    flex-shrink: 0; margin-top: 2px;
                ">${String.fromCharCode(65 + idx)}</div>
                <div style="flex: 1;">
                    <div style="font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent-primary); margin-bottom: 0.2rem;">
                        ${opt.tag}
                    </div>
                    <div style="font-size: 0.88rem; color: var(--text-main); line-height: 1.45; font-weight: 600;">
                        ${opt.text}
                    </div>
                </div>
            </div>
        `).join('');

        const content = `
            <div class="modal-header" style="flex-direction: column; align-items: stretch; gap: 0.65rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 class="modal-title" style="font-size: 1.05rem;">🧭 Kuesioner Profil Risiko</h3>
                    <span style="font-size: 0.75rem; font-weight: 800; color: var(--accent-primary); background: rgba(16,185,129,0.12); padding: 3px 10px; border-radius: 20px;">
                        Pertanyaan ${stepIndex + 1} / ${questions.length}
                    </span>
                </div>
                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${progressPct}%; height: 100%; background: var(--accent-primary); transition: width 0.3s ease;"></div>
                </div>
            </div>
            <div class="modal-body">
                <p style="color: var(--text-main); font-size: 0.96rem; font-weight: 700; line-height: 1.5; margin-bottom: 1.25rem;">
                    ${q.question}
                </p>
                ${optionsHTML}
            </div>
            ${stepIndex > 0 ? `
            <div class="modal-footer" style="justify-content: flex-start;">
                <button class="btn btn-secondary btn-sm" id="btn-prev-question" style="width: auto;">← Pertanyaan Sebelumnya</button>
            </div>
            ` : ''}
        `;

        ui.openModal(content);

        document.querySelectorAll('.risk-option-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.borderColor = 'var(--accent-primary)';
                card.style.background = 'var(--bg-surface-hover)';
                card.style.transform = 'translateY(-1px)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.borderColor = 'var(--border-color)';
                card.style.background = 'var(--bg-surface)';
                card.style.transform = '';
            });
            card.addEventListener('click', () => {
                const score = Number(card.dataset.score);
                const nextAnswers = [...answers.slice(0, stepIndex), score];
                this.showRiskAssessment(resolve, stepIndex + 1, nextAnswers);
            });
        });

        document.getElementById('btn-prev-question')?.addEventListener('click', () => {
            this.showRiskAssessment(resolve, stepIndex - 1, answers.slice(0, stepIndex - 1));
        });
    }

    showRiskConclusion(profileId, answers, resolve) {
        const profile = roleManager.getRoleData(profileId);
        const totalScore = answers.reduce((a, b) => a + b, 0);

        const content = `
            <div class="modal-header">
                <h3 class="modal-title">📊 Hasil Analisis Profil Risiko</h3>
            </div>
            <div class="modal-body" style="text-align:center;">
                <div style="
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 68px; height: 68px; border-radius: 20px;
                    background: ${profile.color}18; border: 2px solid ${profile.color}55;
                    font-size: 2.25rem; margin-bottom: 0.85rem;
                ">${profile.icon}</div>

                <div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 0.25rem;">
                    Kesimpulan Karakteristik Anda (Skor Risiko: ${totalScore}/9)
                </div>
                <h2 style="font-size: 1.5rem; font-weight: 900; color: ${profile.color}; margin-bottom: 0.65rem;">
                    ${profile.label}
                </h2>

                <p style="color: var(--text-muted); margin-bottom: 1rem; font-size: 0.88rem; line-height: 1.55;">
                    ${profile.detail}
                </p>

                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1rem; text-align: left;">
                    <div style="font-size: 0.7rem; font-weight: 800; color: ${profile.color}; text-transform: uppercase; margin-bottom: 0.25rem;">
                        🧭 Strategi Portofolio Disarankan
                    </div>
                    <div style="font-size: 0.82rem; color: var(--text-main); font-weight: 600;">
                        ${profile.strategy}
                    </div>
                </div>

                <div style="background:var(--bg-surface-hover);border-radius:var(--radius-md);padding:0.9rem;margin-bottom:0.5rem;">
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.2rem;">Modal Awal Akun Trading</div>
                    <div style="font-size:1.45rem;font-weight:800;color:var(--text-main);">
                        $ ${profile.startingBalance.toLocaleString('en-US')}
                    </div>
                </div>
            </div>
            <div class="modal-footer" style="gap:0.75rem;">
                <button class="btn btn-secondary" id="btn-retake-risk">↺ Ulangi Kuesioner</button>
                <button class="btn btn-primary" id="btn-confirm-role">📈 Masuk ke Dashboard Trading</button>
            </div>
        `;

        ui.openModal(content);

        document.getElementById('btn-retake-risk').addEventListener('click', () => {
            this.showRiskAssessment(resolve, 0, []);
        });

        document.getElementById('btn-confirm-role').addEventListener('click', () => {
            roleManager.setRole(profile.id);
            roleManager.applyVisibility();

            const cheatBonus = this.checkCheatCode(gameState.get('player.name'));
            const startingBalance = profile.startingBalance + cheatBonus;

            gameState.set('player.balance', startingBalance);
            gameState.set('player.monthStartBalance', startingBalance);
            gameState.set('player.createdAt', Date.now());

            ui.closeModal();

            if (cheatBonus > 0) {
                ui.success(`Cheat Activated! Saldo awal +$ 1 Triliun`, '💰 ULTRA RICH');
            }

            ui.success(`Profil Anda: ${profile.label}. Selamat bertransaksi di Bursa!`, '📈 Terminal Siap');
            resolve();
        });
    }

    checkCheatCode(name) {
        if (!name) return 0;
        const cheats = ['SENTOT', 'BEAR', 'TRUMP', 'GOLD', 'Dollar', 'ELON', 'SATOSHI', 'PANGESTU'];
        return cheats.includes(name.toUpperCase()) ? 1000000000000 : 0;
    }

    // ==========================================
    // GAME SYSTEMS
    // ==========================================

    startGameSystems() {
        timeManager.start();
        earnManager.start();

        // Market updates — simulated only (no real API calls)
        stockMarket.startUpdates(6000);
        cryptoMarket.startUpdates(4000);

        // Daily economy fluctuation & Donasi/Luck tick
        timeManager.onDay(() => {
            globalEconomy.naturalFluctuation();

            // Decrement luck ticks
            const donations = gameState.get('donations') || { totalDonated: 0, luckMultiplier: 1.0, luckTicksRemaining: 0 };
            if (donations.luckTicksRemaining > 0) {
                const newTicks = donations.luckTicksRemaining - 1;
                gameState.set('donations', {
                    ...donations,
                    luckTicksRemaining: newTicks,
                    luckMultiplier: newTicks > 0 ? 1.5 : 1.0
                });
                if (newTicks === 0) {
                    ui.info('✨ Efek Keberuntungan dari Donasi telah selesai.');
                }
            }
        });

        // Monthly: dividends & portfolio evaluations
        timeManager.onMonth(() => {
            // Fluctuate Rolex price in marketplace
            const marketplace = gameState.get('marketplace') || { inventory: [], purchasedUpgrades: [], rolexMarketPrice: 15000 };
            const changePercent = (Math.random() - 0.5) * 0.2; // -10% to +10%
            const newPrice = Math.max(8000, Math.round(marketplace.rolexMarketPrice * (1 + changePercent)));
            gameState.set('marketplace', {
                ...marketplace,
                rolexMarketPrice: newPrice
            });
        });

        gameState.on('interestReceived', (data) => {
            ui.success(`🏦 Bunga Deposito +$ ${financeManager.formatCurrency(data.amount)} diterima!`, 'Deposito Berbunga');
        });

        gameState.on('rentCollected', (data) => {
            ui.success(`🏠 Sewa Properti +$ ${financeManager.formatCurrency(data.amount)} diterima!`, 'Sewa Properti');
        });

        console.log('⚙️ Game systems started');
    }

    finishLoading() {
        const loader = document.getElementById('loading-screen');
        const appShell = document.querySelector('.app-shell');
        if (loader && appShell) {
            appShell.classList.remove('hidden');
            fadeIn(appShell, 500);
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }

    showError(error) {
        const loader = document.getElementById('loading-screen');
        if (loader) {
            loader.innerHTML = `
                <div style="text-align:center; padding: 2rem; background: rgba(220, 38, 38, 0.1); border: 1px solid #dc2626; border-radius: 1rem; max-width: 500px; color: white;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h2 style="color: #ef4444; margin-bottom: 0.5rem;">Sistem Gagal Dimuat</h2>
                    <p style="color: #cbd5e1; font-size: 0.85rem; margin-bottom: 1.5rem;">
                        Terjadi kesalahan saat memproses data game. Silakan hubungi pengembang atau reset data.
                    </p>
                    <div style="background: rgba(0,0,0,0.5); padding: 1rem; border-radius: 0.5rem; font-family: 'Consolas', monospace; font-size: 0.75rem; color: #fca5a5; text-align: left; margin-bottom: 1.5rem; overflow-x: auto; border: 1px solid rgba(239, 68, 68, 0.3);">
                        <strong>Error:</strong> ${error.message}<br><br>
                        <strong>Stack:</strong><br>
                        ${error.stack ? error.stack.split('\n').slice(0, 3).join('<br>') : 'No stack trace available'}
                    </div>
                    <button onclick="localStorage.clear(); location.reload();" class="btn btn-danger" style="width: 100%; padding: 0.75rem; font-weight: 700; cursor: pointer;">
                        🗑️ Reset Data & Reload
                    </button>
                </div>
            `;
            loader.style.background = '#0f172a';
            loader.style.display = 'flex';
            loader.style.opacity = '1';
            loader.style.zIndex = '9999';
        }
    }

    // Dev helpers
    pause() { timeManager.setSpeed(0); }
    resume() { timeManager.setSpeed(1); }
    reset() {
        if (confirm('Reset semua progress? Data akan hilang!')) {
            gameState.reset();
            location.reload();
        }
    }
    save() {
        const saved = gameState.save();
        if (saved) {
            ui.success('Game tersimpan!', null, { deviceNotify: true });
        } else {
            ui.error('Gagal menyimpan game!');
        }
    }
}

const game = new BusinessTycoonGame();
game.init();

export default game;
