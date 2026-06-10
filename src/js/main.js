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
import businessManager from './business/BusinessManager.js';
import savingsManager from './finance/SavingsManager.js';
import propertyManager from './property/PropertyManager.js';
import passiveIncomeManager from './trading/PassiveIncomeManager.js';

// UI
import ui from './ui/UIManager.js';
import homeScreen from './ui/HomeScreen.js';
import viewManager from './ui/ViewManager.js';
import { fadeIn, staggerFadeUp } from './ui/Animations.js';
import workTaskManager from './core/databases/WorkTaskManager.js';
import loginPortal from './ui/LoginPortal.js';
import keyboardNavigation from './ui/KeyboardNavigation.js';
import politicsManager from './core/PoliticsManager.js';

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
            workTaskManager.ensureInit();
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

            // First-time player: show welcome → role selection
            if (!gameState.get('player.createdAt') || !gameState.get('player.role')) {
                // Finish loading first so modal is visible on top of app shell
                this.finishLoading();
                await this.showWelcomeScreen();
            }

            console.log('✅ Game initialized! Role:', roleManager.getRole());
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
    // WELCOME & ROLE SELECTION ONBOARDING
    // ==========================================

    async showWelcomeScreen() {
        return new Promise((resolve) => {
            const nameStep = `
                <div class="modal-header" style="border-bottom: 1px solid var(--border-color); padding: 1.5rem;">
                    <h3 class="modal-title" style="display: flex; align-items: center; gap: 0.5rem;">💼 Inisialisasi Profil</h3>
                </div>
                <div class="modal-body" style="text-align:center; padding: 2rem 1.5rem;">
                    <div style="margin-bottom:1.5rem; display: flex; justify-content: center;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                        </svg>
                    </div>
                    <h2 style="margin-bottom:0.5rem;font-size:1.75rem;font-weight:800;letter-spacing:-0.02em;">AuraAssets</h2>
                    <p style="color:var(--text-muted);margin-bottom:2rem;font-size:0.85rem;line-height:1.5;">
                        Workspace profesional untuk pemantauan portofolio terpadu, analitis karir, dan operasi korporat.
                    </p>
                    <div class="form-group" style="text-align:left;">
                        <label class="form-label">Nama Pengguna / ID</label>
                        <input type="text" id="player-name" class="form-input" placeholder="Masukkan nama..." value="Player" autocomplete="off">
                    </div>
                </div>
                <div class="modal-footer" style="border-top: 1px solid var(--border-color); padding: 1rem 1.5rem;">
                    <button class="btn btn-primary" style="width:100%" id="btn-next-role">
                        Lanjut →
                    </button>
                </div>
            `;

            ui.openModal(nameStep);

            document.getElementById('btn-next-role').addEventListener('click', () => {
                const name = document.getElementById('player-name').value.trim() || 'Player';
                gameState.set('player.name', name);
                this.showRoleSelection(resolve);
            });
        });
    }

    showRoleSelection(resolve) {
        const roles = roleManager.getAllRoles();

        const roleCardsHTML = roles.map(role => `
            <div class="role-card" data-role="${role.id}" style="
                background: var(--bg-surface);
                border: 2px solid var(--border-color);
                border-radius: var(--radius-lg);
                padding: 1.25rem;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-bottom: 0.75rem;
            ">
                <div style="display:flex;align-items:center;gap:0.875rem;margin-bottom:0.5rem;">
                    <span style="font-size:1.75rem;">${role.icon}</span>
                    <div style="flex:1;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="font-weight:700;font-size:1rem;color:var(--text-main);">${role.label}</div>
                            ${role.id === 'survivor' ? '<span style="font-size:0.6rem; background:#ec4899; color:white; padding:2px 6px; border-radius:4px; font-weight:800; letter-spacing:0.05em;">BUSY / HARD MODE</span>' : ''}
                        </div>
                        <div style="font-size:0.75rem;color:${role.color};font-weight:600;">
                            Modal awal: $ ${(role.startingBalance / 1000).toFixed(0)} K
                        </div>
                    </div>
                </div>
                <div style="font-size:0.85rem;color:var(--text-muted);line-height:1.4;">${role.desc}</div>
            </div>
        `).join('');

        const content = `
            <div class="modal-header">
                <h3 class="modal-title">🎯 Pilih Peran Kamu</h3>
            </div>
            <div class="modal-body">
                <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1.25rem;">
                    Peran menentukan fitur yang tersedia dan gaya bermainmu. Bisa diubah nanti di Pengaturan.
                </p>
                ${roleCardsHTML}
            </div>
        `;

        ui.openModal(content);

        // Hover & select role cards
        document.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.borderColor = 'var(--accent-primary)';
                card.style.background = 'var(--bg-surface-hover)';
            });
            card.addEventListener('mouseleave', () => {
                if (!card.classList.contains('selected')) {
                    card.style.borderColor = 'var(--border-color)';
                    card.style.background = 'var(--bg-surface)';
                }
            });
            card.addEventListener('click', () => {
                const roleId = card.dataset.role;
                this.confirmRoleSelection(roleId, resolve);
            });
        });
    }

    confirmRoleSelection(roleId, resolve) {
        const role = roleManager.getRoleData(roleId);

        const content = `
            <div class="modal-header">
                <h3 class="modal-title">${role.icon} Mulai sebagai ${role.label}?</h3>
            </div>
            <div class="modal-body" style="text-align:center;">
                <p style="color:var(--text-muted);margin-bottom:1rem;font-size:0.9rem;">${role.detail}</p>
                <div style="background:var(--bg-surface-hover);border-radius:var(--radius-md);padding:1rem;margin-bottom:1.25rem;">
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.25rem;">Modal Awal</div>
                    <div style="font-size:1.5rem;font-weight:800;color:var(--text-main);">
                        $ ${role.startingBalance.toLocaleString('en-US')}
                    </div>
                </div>
                <p style="font-size:0.8rem;color:var(--accent-primary);font-weight:600;">${role.id === 'survivor' ? '🔥 EKSTRIM: Semua sumber pendapatan aktif!' : role.monthlyEvent}</p>
            </div>
            <div class="modal-footer" style="gap:0.75rem;">
                <button class="btn btn-secondary" id="btn-back-role">← Kembali</button>
                <button class="btn btn-primary" id="btn-confirm-role">🚀 Mulai!</button>
            </div>
        `;

        ui.openModal(content);

        document.getElementById('btn-back-role').addEventListener('click', () => {
            this.showRoleSelection(resolve);
        });

        document.getElementById('btn-confirm-role').addEventListener('click', () => {
            // Apply role
            roleManager.setRole(roleId);
            
            const cheatBonus = this.checkCheatCode(gameState.get('player.name'));
            const startingBalance = role.startingBalance + cheatBonus;
            
            gameState.set('player.balance', startingBalance);
            gameState.set('player.monthStartBalance', startingBalance);
            gameState.set('player.createdAt', Date.now());

            ui.closeModal();
            
            if (cheatBonus > 0) {
                ui.success(`Cheat Activated! Saldo awal +$ 1 Triliun`, '💰 ULTRA RICH');
            }
            
            ui.success(`Selamat datang, ${gameState.get('player.name')}! Peran: ${role.label}`, '🎉');
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

        // Daily economy fluctuation & Corporate holding M&A auctions & Donasi/Luck tick
        timeManager.onDay(() => {
            globalEconomy.naturalFluctuation();
            businessManager.tickAuctions();

            // Process presidential politics daily effects
            politicsManager.tickDailyEffects();

            // Process assistant work for the day
            const assistantResult = workTaskManager.tickAssistant();
            if (assistantResult?.acted && assistantResult?.description) {
                ui.info(assistantResult.description, '🧑‍💼 Asisten Kantor');
            } else if (assistantResult?.acted === false && assistantResult?.description) {
                ui.warning(assistantResult.description, '⚠️ Asisten');
            }

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

        // Monthly: salary + business income + work career bonus
        timeManager.onMonth(() => {
            const economyIndex = globalEconomy.getIndex();
            businessManager.processMonthlyUpdate(economyIndex);

            // Career level salary for Karyawan & Survivor
            const careerSalary = workTaskManager.getMonthlyBonus();
            const currentRole = roleManager.getRole();
            if (careerSalary > 0 && (currentRole === 'karyawan' || currentRole === 'survivor')) {
                financeManager.addIncome(careerSalary, 'Gaji', 'Gaji bulanan');
                ui.success(`💰 Gaji bulanan +$ ${financeManager.formatCurrency(careerSalary, true)} diterima!`);
            }

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
