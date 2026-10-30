/**
 * LoginPortal.js - Unified single-page account login & registration portal.
 * Akun 1:1 langsung terhubung ke profil pemain & database tanpa perantara karakter.
 */

import gameState from '../core/GameState.js';
import { getCloudAccounts } from '../core/SupabaseClient.js';

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

            this._renderAccountStep(overlay, resolve);

            // Background check for cloud accounts from Supabase
            getCloudAccounts().then((cloudAccs) => {
                if (cloudAccs && cloudAccs.length > 0) {
                    const localAccs = gameState.getAccounts();
                    let updated = false;
                    for (const ca of cloudAccs) {
                        const low = ca.username.toLowerCase();
                        if (!localAccs[low]) {
                            localAccs[low] = {
                                username: ca.display_name || ca.username,
                                password: '',
                                createdAt: new Date(ca.updated_at || Date.now()).getTime(),
                                fromCloud: true,
                                balance: ca.balance
                            };
                            updated = true;
                        }
                    }
                    if (updated && document.getElementById('login-portal-overlay')) {
                        gameState.saveAccounts(localAccs);
                        this._renderAccountStep(overlay, resolve);
                    }
                }
            }).catch(() => {});
        });
    }

    _renderAccountStep(container, resolve, opts = {}) {
        const { prefillUser = '', showRegister = false, message = null, errorMsg = null } = opts;
        const accounts   = gameState.getAccounts();
        const accountKeys = Object.keys(accounts);
        const isRegister  = showRegister || accountKeys.length === 0;

        // Build saved-accounts chips with their current balance snapshot
        let savedAccountsHTML = '';
        if (!isRegister && accountKeys.length > 0) {
            savedAccountsHTML = `
                <div style="margin-bottom:1.25rem;">
                    <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.35);font-weight:700;margin-bottom:0.6rem;">Akun Tersimpan</div>
                    <div style="display:flex;flex-direction:column;gap:0.45rem;max-height:200px;overflow-y:auto;padding-right:2px;scrollbar-width:thin;">
                        ${accountKeys.map(k => {
                            const acc = accounts[k];
                            const avatar = acc.avatar || '👤';
                            let balanceText = '';
                            try {
                                const saveRaw = localStorage.getItem(`businessTycoon_save_${k}`);
                                if (saveRaw) {
                                    const p = JSON.parse(saveRaw);
                                    if (p?.player?.balance !== undefined) {
                                        balanceText = fmtBalance(p.player.balance);
                                    }
                                }
                            } catch (e) {}

                            return `
                            <button class="lp-account-btn${prefillUser.toLowerCase()===k?' selected':''}" data-username="${acc.username}">
                                <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">${avatar}</div>
                                <div style="min-width:0;flex:1;">
                                    <div style="font-weight:800;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${acc.username}</div>
                                    <div style="font-size:0.7rem;color:var(--accent-primary);font-weight:600;">${balanceText ? `${balanceText}` : 'Klik untuk login'}</div>
                                </div>
                                <div style="color:rgba(255,255,255,0.3);font-size:1rem;">›</div>
                            </button>`;
                        }).join('')}
                    </div>
                </div>
                <div class="lp-divider">atau masukkan password akun</div>`;
        }

        container.innerHTML = `
        <div id="lp-card" style="
            background:rgba(12,18,36,0.85);
            backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
            border:1px solid rgba(255,255,255,0.1);
            width:100%;max-width:440px;
            border-radius:24px;
            box-shadow:0 30px 60px rgba(0,0,0,0.6),0 0 50px rgba(99,102,241,0.08);
            padding:2.25rem;
            display:flex;flex-direction:column;
            animation:lp-fade-up 0.45s cubic-bezier(0.16,1,0.3,1);
        ">
            ${logoHTML()}

            <div class="lp-step-badge">🔐 &nbsp;Autentikasi Akun Investor</div>

            <h3 style="margin:0 0 0.35rem;font-size:1.45rem;font-weight:800;letter-spacing:-0.02em;">
                ${isRegister ? 'Buat Akun Baru' : 'Selamat Datang Kembali'}
            </h3>
            <p style="margin:0 0 1.5rem;font-size:0.84rem;color:rgba(255,255,255,0.4);line-height:1.45;">
                ${isRegister
                    ? 'Daftarkan nama akun Anda untuk langsung memulai trading & manajemen portofolio.'
                    : 'Pilih akun yang tersimpan atau masukkan username & sandi Anda.'}
            </p>

            ${errorMsg   ? `<div class="lp-error-box">❌ <span>${errorMsg}</span></div>` : ''}
            ${message    ? `<div class="lp-success-box">✅ <span>${message}</span></div>` : ''}

            ${savedAccountsHTML}

            <form id="lp-form" style="display:flex;flex-direction:column;gap:0;">
                <div style="margin-bottom:1rem;">
                    <label style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.45);font-weight:700;display:block;margin-bottom:0.45rem;">
                        ${isRegister ? 'Nama Akun Pemain (Username)' : 'Username'}
                    </label>
                    <div style="position:relative;">
                        <span style="position:absolute;left:1rem;top:50%;transform:translateY(-50%);font-size:1rem;opacity:0.4;pointer-events:none;">👤</span>
                        <input id="lp-username" class="lp-input" type="text"
                            placeholder="${isRegister ? `Cth: ${this.suggestedName || 'Elon Smash'}` : 'Masukkan nama akun'}"
                            value="${prefillUser}" autocomplete="username" required />
                    </div>
                </div>

                <div style="margin-bottom:1.5rem;">
                    <label style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.45);font-weight:700;display:block;margin-bottom:0.45rem;">Password</label>
                    <div style="position:relative;">
                        <span style="position:absolute;left:1rem;top:50%;transform:translateY(-50%);font-size:1rem;opacity:0.4;pointer-events:none;">🔑</span>
                        <input id="lp-password" class="lp-input" type="password"
                            placeholder="••••••••" autocomplete="${isRegister?'new-password':'current-password'}" required />
                    </div>
                </div>

                <button type="submit" class="lp-btn-primary">
                    ${isRegister ? '✨ Buat Akun & Masuk Pasar' : '🔐 Masuk ke Terminal'}
                </button>
            </form>

            <div style="margin-top:1.1rem;text-align:center;">
                <span style="font-size:0.8rem;color:rgba(255,255,255,0.4);">
                    ${isRegister ? 'Sudah memiliki akun?' : 'Belum memiliki akun?'}
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
        container.querySelector('#lp-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = container.querySelector('#lp-username').value.trim();
            const password = container.querySelector('#lp-password').value;
            const submitBtn = container.querySelector('button[type="submit"]');
            const originalText = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>⏳ Sinkronisasi Cloud...</span>';
            }
            try {
                if (isRegister) {
                    await gameState.register(username, password);
                } else {
                    await gameState.login(username, password);
                }
                // Directly close and resolve: no character layer
                this._close(container, resolve);
            } catch (err) {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
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

    _close(container, resolve) {
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.remove();
            resolve();
        }, 300);
    }

    _shake(container) {
        const card = container.querySelector('#lp-card');
        if (!card) return;
        card.style.animation = 'none';
        void card.offsetWidth;
        card.style.animation = 'lp-shake 0.4s ease';
    }
}

export const loginPortal = new LoginPortal();
export default loginPortal;
