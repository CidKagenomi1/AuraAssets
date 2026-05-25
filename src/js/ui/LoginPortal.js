/**
 * LoginPortal.js - Immersive, premium corporate account portal.
 * Handles register, login, and profile selection for the Business Tycoon simulator.
 */

import gameState from '../game/GameState.js';
import ui from './UIManager.js';

class LoginPortal {
    show() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.id = 'login-portal-overlay';
            overlay.style.cssText = `
                position: fixed;
                inset: 0;
                background: radial-gradient(circle at center, #1e1b4b 0%, #09090b 100%);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif;
                color: #fff;
                padding: 1.5rem;
                overflow-y: auto;
            `;

            document.body.appendChild(overlay);

            this.render(overlay, resolve);
        });
    }

    render(container, resolve, mode = null) {
        if (!mode) {
            mode = gameState.currentUser ? 'character_select' : 'login';
        }

        const accounts = gameState.getAccounts();
        const accountKeys = Object.keys(accounts);

        const roleConfig = {
            karyawan: { label: 'Karyawan', color: '#6366f1', icon: '👔' },
            investor: { label: 'Investor', color: '#10b981', icon: '📈' },
            pebisnis: { label: 'Pebisnis', color: '#f59e0b', icon: '🏢' },
            survivor: { label: 'Survivor', color: '#ec4899', icon: '💀' }
        };

        if (mode === 'character_select') {
            const chars = gameState.getCharacters();
            const lowerUser = gameState.currentUser.toLowerCase();

            const charsListHTML = chars.map(charName => {
                const charKey = charName.toLowerCase();
                const savedDataStr = localStorage.getItem(`businessTycoon_save_${lowerUser}_char_${charKey}`);
                let charInfo = {
                    role: null,
                    balance: 0,
                    gameTime: { day: 1, month: 1, year: 2026 }
                };
                if (savedDataStr) {
                    try {
                        const parsed = JSON.parse(savedDataStr);
                        if (parsed.player) {
                            charInfo.role = parsed.player.role || null;
                            charInfo.balance = parsed.player.balance || 0;
                        }
                        if (parsed.gameTime) {
                            charInfo.gameTime = parsed.gameTime;
                        }
                    } catch (e) {
                        console.error('Failed to parse character data:', e);
                    }
                }

                const roleMeta = charInfo.role ? roleConfig[charInfo.role] : { label: 'Belum Memilih Peran', color: '#a1a1aa', icon: '👤' };
                
                let compactBalance = '';
                const num = charInfo.balance;
                if (!isFinite(num) || num >= 1e30) compactBalance = '∞';
                else if (num >= 1e15) compactBalance = '$ ' + (num / 1e15).toFixed(1) + ' Qa';
                else if (num >= 1e12) compactBalance = '$ ' + (num / 1e12).toFixed(1) + ' T';
                else if (num >= 1e9) compactBalance = '$ ' + (num / 1e9).toFixed(1) + ' B';
                else if (num >= 1e6) compactBalance = '$ ' + (num / 1e6).toFixed(1) + ' M';
                else compactBalance = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);

                const gameDate = `${charInfo.gameTime.day} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][charInfo.gameTime.month - 1]} ${charInfo.gameTime.year}`;

                return `
                    <div class="char-select-btn" data-charname="${charName}" style="
                        background: rgba(255,255,255,0.03);
                        border: 1px solid rgba(255,255,255,0.08);
                        padding: 1.25rem;
                        border-radius: 16px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 1rem;
                        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                        width: 100%;
                        margin-bottom: 0.75rem;
                        text-align: left;
                    ">
                        <div style="display: flex; align-items: center; gap: 1rem; min-width: 0; flex: 1;">
                            <div style="
                                width: 44px; height: 44px;
                                background: ${roleMeta.color}15;
                                border: 1px solid ${roleMeta.color}30;
                                border-radius: 12px;
                                display: flex; align-items: center; justify-content: center;
                                font-size: 1.5rem;
                                flex-shrink: 0;
                            ">${roleMeta.icon}</div>
                            <div style="min-width: 0; flex: 1;">
                                <div style="font-weight: 800; font-size: 1.05rem; color: #fff; margin-bottom: 2px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${charName}</div>
                                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                    <span style="
                                        font-size: 0.65rem; 
                                        font-weight: 800; 
                                        color: ${roleMeta.color}; 
                                        background: ${roleMeta.color}15; 
                                        padding: 2px 6px; 
                                        border-radius: 4px;
                                        letter-spacing: 0.05em;
                                        text-transform: uppercase;
                                    ">${roleMeta.label}</span>
                                    <span style="font-size: 0.75rem; color: var(--text-muted);">${gameDate}</span>
                                </div>
                            </div>
                        </div>
                        <div style="text-align: right; flex-shrink: 0;">
                            <div style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 2px;">Saldo Kas</div>
                            <div style="font-weight: 800; font-size: 0.95rem; color: var(--accent-primary);">${compactBalance}</div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div id="login-portal-card" style="
                    background: rgba(15, 23, 42, 0.65);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    width: 100%;
                    max-width: 450px;
                    border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1);
                    padding: 2.5rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    animation: login-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                ">
                    <!-- Portal Logo / Brand -->
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem;">
                        <div style="
                            width: 42px; height: 42px; 
                            border-radius: 12px;
                            background: linear-gradient(135deg, var(--accent-primary), #6366f1);
                            display: flex; align-items: center; justify-content: center;
                            box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
                        ">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="2" y="11" width="20" height="11" rx="2" />
                                <circle cx="12" cy="16.5" r="1.5" />
                                <path d="M6 16.5h.01M18 16.5h.01" />
                            </svg>
                        </div>
                        <div>
                            <h2 style="margin: 0; font-size: 1.25rem; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase;">AURAASSETS</h2>
                            <span style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em;">Corporate Portal</span>
                        </div>
                    </div>

                    <div style="text-align: center; margin-bottom: 1.75rem; width: 100%;">
                        <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); padding: 0.4rem 0.8rem; border-radius: 20px; margin-bottom: 1rem;">
                            <span style="font-size: 0.9rem;">👤</span>
                            <span style="font-size: 0.8rem; font-weight: 700; color: #a5b4fc;">Akun: ${gameState.currentUser}</span>
                        </div>
                        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;">Pilih Karakter</h3>
                        <p style="margin: 0; font-size: 0.85rem; color: var(--text-dim);">Silakan pilih profil eksekutif Anda atau buat baru untuk memulai.</p>
                    </div>

                    <div style="width: 100%; max-height: 280px; overflow-y: auto; padding-right: 4px; margin-bottom: 1.25rem; scrollbar-width: thin;">
                        ${charsListHTML}
                    </div>

                    <button id="btn-create-char-portal" style="
                        width: 100%;
                        background: rgba(255, 255, 255, 0.02);
                        border: 1px dashed rgba(255, 255, 255, 0.2);
                        border-radius: 12px;
                        padding: 0.875rem;
                        color: #cbd5e1;
                        font-weight: 700;
                        font-size: 0.85rem;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                        margin-bottom: 1rem;
                    ">
                        <span>➕ Buat Karakter Baru</span>
                    </button>

                    <button id="btn-switch-account-portal" style="
                        background: none;
                        border: none;
                        color: var(--accent-danger);
                        font-weight: 700;
                        font-size: 0.8rem;
                        cursor: pointer;
                        padding: 0.25rem 0.5rem;
                        text-decoration: underline;
                        transition: opacity 0.2s;
                    ">
                        🚪 Keluar / Ganti Akun
                    </button>
                </div>

                <style>
                    @keyframes login-fade-up {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .char-select-btn:hover {
                        background: rgba(255,255,255,0.08) !important;
                        border-color: var(--accent-primary) !important;
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    }
                    #btn-create-char-portal:hover {
                        background: rgba(255,255,255,0.05) !important;
                        border-color: var(--accent-primary) !important;
                        color: #fff !important;
                    }
                    #btn-switch-account-portal:hover {
                        opacity: 0.8;
                    }
                </style>
            `;

            // Event Listeners for character selection
            container.querySelectorAll('.char-select-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const charName = btn.dataset.charname;
                    localStorage.setItem(`businessTycoon_activeChar_${lowerUser}`, charName);
                    gameState.activeCharacter = charName;
                    gameState.load();

                    // Resolve portal
                    container.style.opacity = '0';
                    container.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => {
                        container.remove();
                        resolve();
                    }, 300);
                });
            });

            // Create new character
            container.querySelector('#btn-create-char-portal').addEventListener('click', () => {
                localStorage.removeItem(`businessTycoon_activeChar_${lowerUser}`);
                gameState.activeCharacter = null;
                gameState.state = gameState.getDefaultState();

                // Resolve portal to show character creation modal (Welcome screen)
                container.style.opacity = '0';
                container.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    container.remove();
                    resolve();
                }, 300);
            });

            // Switch Account
            container.querySelector('#btn-switch-account-portal').addEventListener('click', () => {
                gameState.logout();
            });

            return;
        }

        let accountsListHTML = '';
        if (mode === 'login' && accountKeys.length > 0) {
            accountsListHTML = `
                <div style="margin-bottom: 1.5rem; width: 100%;">
                    <label style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent-primary); font-weight: 700; margin-bottom: 0.5rem; display: block;">Profil Terdaftar</label>
                    <div style="display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem; scrollbar-width: none;">
                        ${accountKeys.map(key => {
                            const acc = accounts[key];
                            const initials = acc.username.substring(0, 2).toUpperCase();
                            return `
                                <div class="profile-select-btn" data-username="${acc.username}" style="
                                    background: rgba(255,255,255,0.03);
                                    border: 1px solid rgba(255,255,255,0.08);
                                    padding: 0.75rem 1rem;
                                    border-radius: 12px;
                                    cursor: pointer;
                                    display: flex;
                                    align-items: center;
                                    gap: 0.75rem;
                                    transition: all 0.2s;
                                    flex-shrink: 0;
                                ">
                                    <div style="
                                        width: 32px; height: 32px;
                                        background: linear-gradient(135deg, var(--accent-primary), #4f46e5);
                                        border-radius: 50%;
                                        display: flex; align-items: center; justify-content: center;
                                        font-size: 0.85rem; font-weight: 800; color: #fff;
                                    ">${initials}</div>
                                    <div style="font-weight: 700; font-size: 0.85rem; color: #cbd5e1;">${acc.username}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div id="login-portal-card" style="
                background: rgba(15, 23, 42, 0.65);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                width: 100%;
                max-width: 450px;
                border-radius: 24px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.1);
                padding: 2.5rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                animation: login-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            ">
                <!-- Portal Logo / Brand -->
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2rem;">
                    <div style="
                        width: 42px; height: 42px; 
                        border-radius: 12px;
                        background: linear-gradient(135deg, var(--accent-primary), #6366f1);
                        display: flex; align-items: center; justify-content: center;
                        box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
                    ">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <style>
                                .steam-line {
                                    animation: steamMove 2.5s infinite ease-in-out;
                                }
                                .steam-1 { animation-delay: 0s; }
                                .steam-2 { animation-delay: 0.8s; }
                                .steam-3 { animation-delay: 1.6s; }
                                @keyframes steamMove {
                                    0% { transform: translateY(1.5px); opacity: 0.15; }
                                    50% { opacity: 0.8; }
                                    100% { transform: translateY(-2.5px); opacity: 0.05; }
                                }
                                .dollar-glow {
                                    animation: dollarGlow 3s infinite ease-in-out;
                                }
                                .dg-1 { animation-delay: 0s; }
                                .dg-2 { animation-delay: 1.5s; }
                                @keyframes dollarGlow {
                                    0% { transform: translateY(1px); opacity: 0.2; }
                                    50% { opacity: 0.85; }
                                    100% { transform: translateY(-2px); opacity: 0.1; }
                                }
                            </style>
                            <!-- Steam / evaporation wave lines -->
                            <path class="steam-line steam-1" d="M 6 9 C 5 7.5, 7 6.5, 6 5 C 5 3.5, 7 2.5, 6 1" />
                            <path class="steam-line steam-2" d="M 12 9 C 13 7.5, 11 6.5, 12 5 C 13 3.5, 11 2.5, 12 1" />
                            <path class="steam-line steam-3" d="M 18 9 C 17 7.5, 19 6.5, 18 5 C 17 3.5, 19 2.5, 18 1" />
                            <!-- Floating mini dollar signs -->
                            <g transform="translate(2, 0.5) scale(0.22)">
                                <g class="dollar-glow dg-1">
                                    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke-width="2.5" />
                                </g>
                            </g>
                            <g transform="translate(14.5, -2) scale(0.18)">
                                <g class="dollar-glow dg-2">
                                    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke-width="2.5" />
                                </g>
                            </g>
                            <!-- Banknote at the bottom -->
                            <rect x="2" y="11" width="20" height="11" rx="2" />
                            <circle cx="12" cy="16.5" r="1.5" />
                            <path d="M6 16.5h.01M18 16.5h.01" />
                        </svg>
                    </div>
                    <div>
                        <h2 style="margin: 0; font-size: 1.25rem; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase;">AURAASSETS</h2>
                        <span style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em;">Corporate Portal</span>
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 1.75rem;">
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;">
                        ${mode === 'login' ? 'Selamat Datang Kembali' : 'Inisialisasi Akun Baru'}
                    </h3>
                    <p style="margin: 0; font-size: 0.85rem; color: var(--text-dim);">
                        ${mode === 'login' ? 'Silakan masuk untuk mengelola portofolio korporasi Anda' : 'Buat kredensial eksekutif Anda untuk memulai simulasi'}
                    </p>
                </div>

                <!-- Error Box -->
                <div id="login-error-box" class="hidden" style="
                    width: 100%;
                    background: rgba(239, 68, 68, 0.08);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    color: #ef4444;
                    font-size: 0.8rem;
                    font-weight: 600;
                    margin-bottom: 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                ">
                    <span>❌</span>
                    <span id="login-error-msg">Terjadi kesalahan</span>
                </div>

                <!-- Profiles List (Optional) -->
                ${accountsListHTML}

                <!-- Inputs Form -->
                <form id="portal-form" style="width: 100%;">
                    <div class="form-group" style="margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
                        <label for="input-username" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700;">Corporate ID (Username)</label>
                        <div style="position: relative; display: flex; align-items: center;">
                            <span style="position: absolute; left: 1rem; font-size: 1rem; opacity: 0.4;">👤</span>
                            <input id="input-username" type="text" placeholder="Contoh: Alif Rahmadi" required style="
                                width: 100%;
                                background: rgba(255, 255, 255, 0.03);
                                border: 1px solid rgba(255, 255, 255, 0.08);
                                border-radius: 12px;
                                padding: 0.875rem 1rem 0.875rem 2.5rem;
                                color: #fff;
                                font-size: 0.9rem;
                                font-weight: 500;
                                outline: none;
                                transition: all 0.2s;
                            " />
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 1.75rem; display: flex; flex-direction: column; gap: 0.5rem;">
                        <label for="input-password" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700;">Password</label>
                        <div style="position: relative; display: flex; align-items: center;">
                            <span style="position: absolute; left: 1rem; font-size: 1rem; opacity: 0.4;">🔑</span>
                            <input id="input-password" type="password" placeholder="••••••••" required style="
                                width: 100%;
                                background: rgba(255, 255, 255, 0.03);
                                border: 1px solid rgba(255, 255, 255, 0.08);
                                border-radius: 12px;
                                padding: 0.875rem 1rem 0.875rem 2.5rem;
                                color: #fff;
                                font-size: 0.9rem;
                                font-weight: 500;
                                outline: none;
                                transition: all 0.2s;
                            " />
                        </div>
                    </div>

                    <button type="submit" style="
                        width: 100%;
                        background: linear-gradient(135deg, var(--accent-primary) 0%, #4f46e5 100%);
                        border: none;
                        border-radius: 12px;
                        padding: 1rem;
                        color: #fff;
                        font-weight: 800;
                        font-size: 0.95rem;
                        cursor: pointer;
                        box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
                        transition: all 0.2s;
                        letter-spacing: 0.02em;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 0.5rem;
                    ">
                        <span>${mode === 'login' ? '🔐 Akses Portal' : '✨ Inisialisasi Akun'}</span>
                    </button>
                </form>

                <div style="margin-top: 1.5rem; text-align: center;">
                    <span style="font-size: 0.8rem; color: var(--text-dim);">
                        ${mode === 'login' ? 'Belum punya lisensi eksekutif?' : 'Sudah terdaftar sebagai eksekutif?'}
                    </span>
                    <button id="toggle-mode-btn" style="
                        background: none;
                        border: none;
                        color: var(--accent-primary);
                        font-weight: 700;
                        font-size: 0.8rem;
                        cursor: pointer;
                        padding: 0.25rem 0.5rem;
                        text-decoration: underline;
                        transition: opacity 0.2s;
                    ">
                        ${mode === 'login' ? 'Daftar Akun Baru' : 'Masuk di Sini'}
                    </button>
                </div>
            </div>

            <style>
                @keyframes login-fade-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .profile-select-btn:hover {
                    background: rgba(255,255,255,0.08) !important;
                    border-color: var(--accent-primary) !important;
                    transform: translateY(-2px);
                }
                #portal-form input:focus {
                    border-color: var(--accent-primary) !important;
                    background: rgba(255,255,255,0.05) !important;
                    box-shadow: 0 0 10px rgba(16, 185, 129, 0.15);
                }
                #toggle-mode-btn:hover {
                    opacity: 0.8;
                }
            </style>
        `;

        // Input Focus Visuals
        const inputs = container.querySelectorAll('#portal-form input');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.querySelector('span').style.opacity = '1';
            });
            input.addEventListener('blur', () => {
                input.parentElement.querySelector('span').style.opacity = '0.4';
            });
        });

        // Form Submit handler
        const form = container.querySelector('#portal-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const usernameInput = container.querySelector('#input-username');
            const passwordInput = container.querySelector('#input-password');
            const errorBox = container.querySelector('#login-error-box');
            const errorMsg = container.querySelector('#login-error-msg');

            const username = usernameInput.value;
            const password = passwordInput.value;

            try {
                if (mode === 'login') {
                    gameState.login(username, password);
                } else {
                    gameState.register(username, password);
                }

                // If they successfully logged in/registered, check if they have characters
                const chars = gameState.getCharacters();
                if (chars.length > 0) {
                    this.render(container, resolve, 'character_select');
                } else {
                    // Success: remove overlay and resolve promise
                    container.style.opacity = '0';
                    container.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => {
                        container.remove();
                        resolve();
                    }, 300);
                }

            } catch (err) {
                errorBox.classList.remove('hidden');
                errorMsg.textContent = err.message;
                // Shake card effect
                const card = container.querySelector('#login-portal-card');
                card.style.animation = 'none';
                void card.offsetWidth; // trigger reflow
                card.style.animation = 'login-shake 0.3s ease';
            }
        });

        // Toggle Mode
        const toggleBtn = container.querySelector('#toggle-mode-btn');
        toggleBtn.addEventListener('click', () => {
            const nextMode = mode === 'login' ? 'register' : 'login';
            this.render(container, resolve, nextMode);
        });

        // Profile select
        container.querySelectorAll('.profile-select-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.dataset.username;
                const usernameInput = container.querySelector('#input-username');
                const passwordInput = container.querySelector('#input-password');
                
                usernameInput.value = username;
                passwordInput.value = '';
                passwordInput.focus();
            });
        });
    }
}

// Global Shake Animation style injection
if (!document.getElementById('login-shake-style')) {
    const style = document.createElement('style');
    style.id = 'login-shake-style';
    style.textContent = `
        @keyframes login-shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-8px); }
            40%, 80% { transform: translateX(8px); }
        }
    `;
    document.head.appendChild(style);
}

export const loginPortal = new LoginPortal();
export default loginPortal;
