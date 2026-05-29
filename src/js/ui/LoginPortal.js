/**
 * LoginPortal.js - Unified single-page login & character selection portal.
 * Step 1: Pilih/buat akun  →  Step 2: Pilih/buat karakter  (semuanya di satu layar)
 */

import gameState from '../core/GameState.js';

// ─── Inject global styles once ───────────────────────────────────────────────
if (!document.getElementById('lp-global-style')) {
    const s = document.createElement('style');
    s.id = 'lp-global-style';
    s.textContent = `
        @keyframes lp-fade-up {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes lp-shake {
            0%,100% { transform: translateX(0); }
            20%,60%  { transform: translateX(-8px); }
            40%,80%  { transform: translateX(8px);  }
        }
        @keyframes lp-slide-in {
            from { opacity: 0; transform: translateX(24px); }
            to   { opacity: 1; transform: translateX(0);    }
        }
        .lp-account-btn {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 14px;
            padding: 0.85rem 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
            width: 100%;
            text-align: left;
            color: #fff;
            font-family: inherit;
        }
        .lp-account-btn:hover {
            background: rgba(99,102,241,0.1) !important;
            border-color: rgba(99,102,241,0.4) !important;
            transform: translateX(4px);
        }
        .lp-account-btn.selected {
            background: rgba(99,102,241,0.12) !important;
            border-color: rgba(99,102,241,0.5) !important;
        }
        .lp-char-btn {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 14px;
            padding: 1rem 1.15rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
            width: 100%;
            text-align: left;
            color: #fff;
            font-family: inherit;
            margin-bottom: 0.6rem;
        }
        .lp-char-btn:hover {
            background: rgba(255,255,255,0.07) !important;
            border-color: var(--accent-primary) !important;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.25);
        }
        .lp-input {
            width: 100%;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 0.875rem 1rem 0.875rem 2.75rem;
            color: #fff;
            font-size: 0.9rem;
            font-weight: 500;
            outline: none;
            transition: all 0.2s;
            font-family: inherit;
            box-sizing: border-box;
        }
        .lp-input:focus {
            border-color: var(--accent-primary) !important;
            background: rgba(255,255,255,0.07) !important;
            box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .lp-btn-primary {
            width: 100%;
            background: linear-gradient(135deg, var(--accent-primary) 0%, #4f46e5 100%);
            border: none;
            border-radius: 12px;
            padding: 1rem;
            color: #fff;
            font-weight: 800;
            font-size: 0.95rem;
            cursor: pointer;
            box-shadow: 0 8px 20px rgba(99,102,241,0.35);
            transition: all 0.2s;
            letter-spacing: 0.02em;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            font-family: inherit;
        }
        .lp-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 28px rgba(99,102,241,0.45);
        }
        .lp-btn-ghost {
            background: none;
            border: none;
            color: var(--accent-primary);
            font-weight: 700;
            font-size: 0.82rem;
            cursor: pointer;
            padding: 0.3rem 0.5rem;
            text-decoration: underline;
            transition: opacity 0.2s;
            font-family: inherit;
        }
        .lp-btn-ghost:hover { opacity: 0.75; }
        .lp-btn-ghost.danger { color: #ef4444; }
        .lp-divider {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin: 1.25rem 0;
            color: rgba(255,255,255,0.2);
            font-size: 0.75rem;
        }
        .lp-divider::before, .lp-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255,255,255,0.08);
        }
        .lp-step-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(99,102,241,0.1);
            border: 1px solid rgba(99,102,241,0.25);
            padding: 0.35rem 0.85rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 700;
            color: #a5b4fc;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            margin-bottom: 1rem;
        }
        .lp-error-box {
            width: 100%;
            background: rgba(239,68,68,0.08);
            border: 1px solid rgba(239,68,68,0.25);
            padding: 0.7rem 1rem;
            border-radius: 10px;
            color: #f87171;
            font-size: 0.82rem;
            font-weight: 600;
            margin-bottom: 1.1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .lp-success-box {
            width: 100%;
            background: rgba(16,185,129,0.08);
            border: 1px solid rgba(16,185,129,0.25);
            padding: 0.7rem 1rem;
            border-radius: 10px;
            color: #34d399;
            font-size: 0.82rem;
            font-weight: 600;
            margin-bottom: 1.1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
    `;
    document.head.appendChild(s);
}

// ─── Role config ──────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
    karyawan: { label: 'Karyawan',  color: '#6366f1', icon: '👔' },
    investor:  { label: 'Investor', color: '#10b981', icon: '📈' },
    pebisnis:  { label: 'Pebisnis', color: '#f59e0b', icon: '🏢' },
    survivor:  { label: 'Survivor', color: '#ec4899', icon: '💀' }
};

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function fmtBalance(num) {
    if (!isFinite(num) || num >= 1e30) return '∞';
    if (num >= 1e15) return '$ ' + (num/1e15).toFixed(1) + ' Qa';
    if (num >= 1e12) return '$ ' + (num/1e12).toFixed(1) + ' T';
    if (num >= 1e9)  return '$ ' + (num/1e9).toFixed(1)  + ' B';
    if (num >= 1e6)  return '$ ' + (num/1e6).toFixed(1)  + ' M';
    return new Intl.NumberFormat('id-ID',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(num);
}

// ─── Logo HTML ────────────────────────────────────────────────────────────────
function logoHTML() {
    return `
        <div style="display:flex;align-items:center;gap:0.85rem;margin-bottom:2rem;">
            <div style="
                width:44px;height:44px;border-radius:13px;
                background:linear-gradient(135deg,var(--accent-primary),#6366f1);
                display:flex;align-items:center;justify-content:center;
                box-shadow:0 0 24px rgba(99,102,241,0.45);flex-shrink:0;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="11" width="20" height="11" rx="2"/>
                    <circle cx="12" cy="16.5" r="1.5"/>
                    <path d="M6 16.5h.01M18 16.5h.01"/>
                    <path d="M6 11V7a6 6 0 0 1 12 0v4"/>
                </svg>
            </div>
            <div>
                <div style="font-size:1.2rem;font-weight:900;letter-spacing:0.06em;text-transform:uppercase;color:#fff;">AURAASSETS</div>
                <div style="font-size:0.62rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.1em;">Corporate Portal</div>
            </div>
        </div>`;
}

// ─── Main Portal Class ────────────────────────────────────────────────────────
class LoginPortal {
    show() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.id = 'login-portal-overlay';
            Object.assign(overlay.style, {
                position: 'fixed', inset: '0',
                background: 'radial-gradient(ellipse at 50% 0%, #1e1b4b 0%, #09090b 70%)',
                zIndex: '10000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Outfit','Inter',system-ui,sans-serif",
                color: '#fff', padding: '1.5rem', overflowY: 'auto'
            });
            document.body.appendChild(overlay);

            // Select a random name suggestion
            const suggestions = ['Elon Smash', 'Zark Mackerberg', 'Jeff Bozo', 'Bill Gateskeeper', 'Warren Buffetless'];
            this.suggestedName = suggestions[Math.floor(Math.random() * suggestions.length)];

            // Decide entry step
            if (gameState.currentUser) {
                this._renderCharacterStep(overlay, resolve);
            } else {
                this._renderAccountStep(overlay, resolve);
            }
        });
    }

    // ── STEP 1: Account (list saved accounts + login form + register) ──────────
    _renderAccountStep(container, resolve, opts = {}) {
        const { prefillUser = '', showRegister = false, message = null, errorMsg = null } = opts;
        const accounts   = gameState.getAccounts();
        const accountKeys = Object.keys(accounts);
        const isRegister  = showRegister || accountKeys.length === 0;

        // Build saved-accounts chips
        let savedAccountsHTML = '';
        if (!isRegister && accountKeys.length > 0) {
            savedAccountsHTML = `
                <div style="margin-bottom:1.25rem;">
                    <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.35);font-weight:700;margin-bottom:0.6rem;">Akun Tersimpan</div>
                    <div style="display:flex;flex-direction:column;gap:0.45rem;">
                        ${accountKeys.map(k => {
                            const acc = accounts[k];
                            const initials = acc.username.substring(0,2).toUpperCase();
                            return `
                            <button class="lp-account-btn${prefillUser.toLowerCase()===k?' selected':''}" data-username="${acc.username}">
                                <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent-primary),#4f46e5);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.9rem;flex-shrink:0;">${initials}</div>
                                <div>
                                    <div style="font-weight:700;font-size:0.9rem;">${acc.username}</div>
                                    <div style="font-size:0.68rem;color:rgba(255,255,255,0.35);">Klik untuk masuk</div>
                                </div>
                                <div style="margin-left:auto;color:rgba(255,255,255,0.2);">›</div>
                            </button>`;
                        }).join('')}
                    </div>
                </div>
                <div class="lp-divider">atau masuk dengan password</div>`;
        }

        container.innerHTML = `
        <div id="lp-card" style="
            background:rgba(12,18,36,0.75);
            backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
            border:1px solid rgba(255,255,255,0.08);
            width:100%;max-width:440px;
            border-radius:24px;
            box-shadow:0 30px 60px rgba(0,0,0,0.6),0 0 50px rgba(99,102,241,0.08);
            padding:2.25rem;
            display:flex;flex-direction:column;
            animation:lp-fade-up 0.45s cubic-bezier(0.16,1,0.3,1);
        ">
            ${logoHTML()}

            <div class="lp-step-badge">🔐 &nbsp;Langkah 1 dari 2 &nbsp;·&nbsp; Akun</div>

            <h3 style="margin:0 0 0.35rem;font-size:1.45rem;font-weight:800;letter-spacing:-0.02em;">
                ${isRegister ? 'Buat Akun Baru' : 'Selamat Datang Kembali'}
            </h3>
            <p style="margin:0 0 1.5rem;font-size:0.84rem;color:rgba(255,255,255,0.4);">
                ${isRegister
                    ? 'Daftarkan kredensial eksekutif Anda untuk mulai simulasi'
                    : 'Pilih akun atau masukkan username & password Anda'}
            </p>

            ${errorMsg   ? `<div class="lp-error-box">❌ <span>${errorMsg}</span></div>` : ''}
            ${message    ? `<div class="lp-success-box">✅ <span>${message}</span></div>` : ''}

            ${savedAccountsHTML}

            <form id="lp-form" style="display:flex;flex-direction:column;gap:0;">
                <div style="margin-bottom:1rem;">
                    <label style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.35);font-weight:700;display:block;margin-bottom:0.45rem;">
                        ${isRegister ? 'Nama Pengguna (Username)' : 'Username'}
                    </label>
                    <div style="position:relative;">
                        <span style="position:absolute;left:1rem;top:50%;transform:translateY(-50%);font-size:1rem;opacity:0.35;pointer-events:none;">👤</span>
                        <input id="lp-username" class="lp-input" type="text"
                            placeholder="${isRegister ? `Cth: ${this.suggestedName || 'Elon Smash'}` : 'Masukkan username'}"
                            value="${prefillUser}" autocomplete="username" required />
                    </div>
                </div>

                <div style="margin-bottom:1.5rem;">
                    <label style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.35);font-weight:700;display:block;margin-bottom:0.45rem;">Password</label>
                    <div style="position:relative;">
                        <span style="position:absolute;left:1rem;top:50%;transform:translateY(-50%);font-size:1rem;opacity:0.35;pointer-events:none;">🔑</span>
                        <input id="lp-password" class="lp-input" type="password"
                            placeholder="••••••••" autocomplete="${isRegister?'new-password':'current-password'}" required />
                    </div>
                </div>

                <button type="submit" class="lp-btn-primary">
                    ${isRegister ? '✨ Buat Akun & Lanjut' : '🔐 Masuk & Lanjut'}
                </button>
            </form>

            <div style="margin-top:1.1rem;text-align:center;">
                <span style="font-size:0.8rem;color:rgba(255,255,255,0.3);">
                    ${isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}
                </span>
                <button id="lp-toggle" class="lp-btn-ghost">
                    ${isRegister ? 'Masuk di Sini' : 'Daftar Akun Baru'}
                </button>
            </div>
        </div>`;

        // ── Events ──
        // Saved account chips → prefill username
        container.querySelectorAll('.lp-account-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._renderAccountStep(container, resolve, {
                    prefillUser: btn.dataset.username,
                    showRegister: false
                });
                // Auto-focus password
                setTimeout(() => container.querySelector('#lp-password')?.focus(), 80);
            });
        });

        // Toggle register/login
        container.querySelector('#lp-toggle').addEventListener('click', () => {
            this._renderAccountStep(container, resolve, { showRegister: !isRegister });
        });

        // Form submit
        container.querySelector('#lp-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = container.querySelector('#lp-username').value.trim();
            const password = container.querySelector('#lp-password').value;
            try {
                if (isRegister) {
                    gameState.register(username, password);
                } else {
                    gameState.login(username, password);
                }
                // → Step 2
                this._renderCharacterStep(container, resolve, { newAccount: isRegister });
            } catch (err) {
                this._shake(container);
                this._renderAccountStep(container, resolve, {
                    prefillUser: username,
                    showRegister: isRegister,
                    errorMsg: err.message
                });
            }
        });

        // Focus first empty field
        const u = container.querySelector('#lp-username');
        const p = container.querySelector('#lp-password');
        setTimeout(() => (prefillUser ? p?.focus() : u?.focus()), 60);
    }

    // ── STEP 2: Character selection ────────────────────────────────────────────
    _renderCharacterStep(container, resolve, opts = {}) {
        const { newAccount = false } = opts;
        const lowerUser = gameState.currentUser.toLowerCase();
        const chars     = gameState.getCharacters();

        const charsHTML = chars.map(charName => {
            const charKey = charName.toLowerCase();
            let charInfo  = { role: null, balance: 0, gameTime: { day:1, month:1, year:2010 } };
            try {
                const raw = localStorage.getItem(`businessTycoon_save_${lowerUser}_char_${charKey}`);
                if (raw) {
                    const p = JSON.parse(raw);
                    if (p.player)   { charInfo.role = p.player.role || null; charInfo.balance = p.player.balance || 0; }
                    if (p.gameTime) charInfo.gameTime = p.gameTime;
                }
            } catch(_) {}

            const roleMeta = charInfo.role
                ? ROLE_CONFIG[charInfo.role]
                : { label:'Belum Memilih Peran', color:'#71717a', icon:'👤' };
            const gameDate = `${charInfo.gameTime.day} ${MONTHS[charInfo.gameTime.month-1]} ${charInfo.gameTime.year}`;

            return `
            <button class="lp-char-btn" data-charname="${charName}">
                <div style="display:flex;align-items:center;gap:0.9rem;min-width:0;flex:1;">
                    <div style="
                        width:46px;height:46px;border-radius:13px;flex-shrink:0;
                        background:${roleMeta.color}18;border:1px solid ${roleMeta.color}35;
                        display:flex;align-items:center;justify-content:center;font-size:1.55rem;">
                        ${roleMeta.icon}
                    </div>
                    <div style="min-width:0;flex:1;">
                        <div style="font-weight:800;font-size:1rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;">${charName}</div>
                        <div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">
                            <span style="font-size:0.62rem;font-weight:800;color:${roleMeta.color};background:${roleMeta.color}15;padding:2px 7px;border-radius:5px;text-transform:uppercase;letter-spacing:0.05em;">${roleMeta.label}</span>
                            <span style="font-size:0.72rem;color:rgba(255,255,255,0.3);">${gameDate}</span>
                        </div>
                    </div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                    <div style="font-size:0.65rem;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.05em;font-weight:700;margin-bottom:3px;">Saldo</div>
                    <div style="font-weight:800;font-size:0.92rem;color:var(--accent-primary);">${fmtBalance(charInfo.balance)}</div>
                </div>
            </button>`;
        }).join('');

        container.innerHTML = `
        <div id="lp-card" style="
            background:rgba(12,18,36,0.75);
            backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
            border:1px solid rgba(255,255,255,0.08);
            width:100%;max-width:440px;
            border-radius:24px;
            box-shadow:0 30px 60px rgba(0,0,0,0.6),0 0 50px rgba(99,102,241,0.08);
            padding:2.25rem;
            display:flex;flex-direction:column;
            animation:lp-slide-in 0.4s cubic-bezier(0.16,1,0.3,1);
        ">
            ${logoHTML()}

            <div class="lp-step-badge">👤 &nbsp;Langkah 2 dari 2 &nbsp;·&nbsp; Karakter</div>

            <!-- Logged-in account badge -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.1rem;">
                <div>
                    <h3 style="margin:0 0 0.2rem;font-size:1.4rem;font-weight:800;letter-spacing:-0.02em;">Pilih Karakter</h3>
                    <p style="margin:0;font-size:0.83rem;color:rgba(255,255,255,0.38);">
                        Akun: <span style="color:#a5b4fc;font-weight:700;">${gameState.currentUser}</span>
                    </p>
                </div>
                <button id="lp-logout" class="lp-btn-ghost danger" style="text-decoration:none;font-size:0.78rem;white-space:nowrap;">🚪 Ganti Akun</button>
            </div>

            ${newAccount && chars.length === 0
                ? `<div class="lp-success-box">✅ <span>Akun berhasil dibuat! Buat karakter pertama Anda di bawah.</span></div>`
                : ''}

            ${chars.length > 0
                ? `<div style="max-height:300px;overflow-y:auto;padding-right:2px;margin-bottom:1rem;scrollbar-width:thin;">${charsHTML}</div>`
                : `<div style="text-align:center;padding:2rem 0;color:rgba(255,255,255,0.3);font-size:0.88rem;margin-bottom:1rem;">
                       <div style="font-size:2.5rem;margin-bottom:0.5rem;">🎭</div>
                       <div>Belum ada karakter. Buat yang pertama!</div>
                   </div>`}

            <button id="lp-new-char" style="
                width:100%;
                background:rgba(255,255,255,0.02);
                border:1.5px dashed rgba(255,255,255,0.18);
                border-radius:12px;
                padding:0.85rem;
                color:#94a3b8;
                font-weight:700;font-size:0.85rem;
                cursor:pointer;
                transition:all 0.2s;
                display:flex;align-items:center;justify-content:center;gap:0.5rem;
                font-family:inherit;
            ">
                ➕ Buat Karakter Baru
            </button>
        </div>`;

        // ── Events ──
        container.querySelectorAll('.lp-char-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const charName = btn.dataset.charname;
                localStorage.setItem(`businessTycoon_activeChar_${lowerUser}`, charName);
                gameState.activeCharacter = charName;
                gameState.load();
                this._close(container, resolve);
            });
        });

        container.querySelector('#lp-new-char').addEventListener('click', () => {
            localStorage.removeItem(`businessTycoon_activeChar_${lowerUser}`);
            gameState.activeCharacter = null;
            gameState.state = gameState.getDefaultState();
            this._close(container, resolve);
        });

        container.querySelector('#lp-logout').addEventListener('click', () => {
            gameState.logout();
        });

        // hover for new char btn
        const newCharBtn = container.querySelector('#lp-new-char');
        newCharBtn.addEventListener('mouseenter', () => {
            newCharBtn.style.borderColor = 'rgba(99,102,241,0.5)';
            newCharBtn.style.background  = 'rgba(99,102,241,0.06)';
            newCharBtn.style.color = '#c7d2fe';
        });
        newCharBtn.addEventListener('mouseleave', () => {
            newCharBtn.style.borderColor = 'rgba(255,255,255,0.18)';
            newCharBtn.style.background  = 'rgba(255,255,255,0.02)';
            newCharBtn.style.color = '#94a3b8';
        });
    }

    _close(container, resolve) {
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => { container.remove(); resolve(); }, 300);
    }

    _shake(container) {
        const card = container.querySelector('#lp-card');
        if (!card) return;
        card.style.animation = 'none';
        void card.offsetWidth;
        card.style.animation = 'lp-shake 0.35s ease';
    }
}

export const loginPortal = new LoginPortal();
export default loginPortal;
