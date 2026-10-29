/**
 * SettingsPage.js - Comprehensive Full-Page Game & Account Management
 * Replaces modal popup with an intuitive, modern, responsive full-page settings terminal.
 * Directly bound 1:1 to User Account and synchronized with authoritative Supabase database.
 */

import gameState from '../../core/GameState.js';
import roleManager, { ROLES } from '../../core/RoleManager.js';
import ui from '../UIManager.js';
import { Icons } from '../Icons.js';
import { supabase } from '../../core/SupabaseClient.js';

class SettingsPage {
    render(containerEl) {
        if (!containerEl) return;

        const role = roleManager.getRoleData();
        const allRoles = roleManager.getAllRoles();

        const accounts = gameState.getAccounts() || {};
        const lowerUser = (gameState.currentUser || '').toLowerCase();
        const activeAcc = accounts[lowerUser] || {};
        const currentAvatar = activeAcc.avatar || '👤';

        const hideBalance = gameState.get('settings.hideBalance') === true;
        const soundEnabled = gameState.get('settings.soundEnabled') !== false;
        const toastNotifications = gameState.get('settings.toastNotifications') !== false;
        const defaultTimeframe = gameState.get('settings.defaultTimeframe') || '1d';
        const smoothChart = gameState.get('settings.smoothChart') !== false;

        // Render role cards
        const roleCardsHTML = allRoles.map(r => {
            const isActive = role?.id === r.id;
            return `
                <div class="settings-role-card ${isActive ? 'active' : ''}" data-role="${r.id}" style="
                    background: ${isActive ? `${r.color}15` : 'rgba(255,255,255,0.02)'};
                    border: 1.5px solid ${isActive ? r.color : 'rgba(255,255,255,0.07)'};
                    border-radius: var(--radius-lg);
                    padding: 1.15rem;
                    cursor: pointer;
                    transition: all 0.25s ease;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    position: relative;
                ">
                    ${isActive ? `
                        <div style="position: absolute; top: 12px; right: 12px; font-size: 0.7rem; font-weight: 800; color: ${r.color}; background: ${r.color}22; padding: 2px 8px; border-radius: 20px; border: 1px solid ${r.color}55;">
                            ✓ AKTIF
                        </div>
                    ` : ''}
                    <div>
                        <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.5rem;">
                            <span style="font-size: 1.5rem;">${r.icon}</span>
                            <div>
                                <div style="font-weight: 800; font-size: 0.95rem; color: #fff;">${r.label}</div>
                                <div style="font-size: 0.7rem; font-weight: 700; color: ${r.color}; text-transform: uppercase; letter-spacing: 0.05em;">
                                    Modal Awal: $ ${r.minStartingBalance.toLocaleString()} – $ ${r.maxStartingBalance.toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <p style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.45; margin-bottom: 0.75rem;">
                            ${r.desc}
                        </p>
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-dim); background: rgba(0,0,0,0.25); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.04);">
                        🧭 <strong style="color: #fff;">Strategi:</strong> ${r.strategy}
                    </div>
                </div>
            `;
        }).join('');

        containerEl.innerHTML = `
            <div class="settings-page-wrapper" style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 1060px; margin: 0 auto; width: 100%;">
                
                <!-- Page Top Navigation Header -->
                <div class="settings-page-header" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 1rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border-color);
                ">
                    <div style="display: flex; align-items: center; gap: 0.85rem;">
                        <button id="btn-settings-back" class="btn btn-secondary" style="
                            padding: 8px 14px;
                            font-size: 0.8rem;
                            font-weight: 700;
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            border-radius: var(--radius-md);
                        ">
                            ${Icons.arrowLeft(16, 'currentColor')} Kembali ke Beranda
                        </button>
                        <div>
                            <h1 style="font-size: 1.4rem; font-weight: 900; color: #fff; margin: 0; line-height: 1.2;">
                                ⚙️ Pengaturan Terminal & Akun
                            </h1>
                            <p style="font-size: 0.78rem; color: var(--text-muted); margin: 3px 0 0 0;">
                                Konfigurasi identitas akun, preferensi visual, grafik pasar, audio, dan cadangan data.
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <button id="btn-settings-save" class="btn btn-primary" style="
                            font-weight: 800;
                            font-size: 0.82rem;
                            letter-spacing: 0.04em;
                            padding: 8px 18px;
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
                        ">
                            💾 SIMPAN PROGRES
                        </button>
                    </div>
                </div>

                <!-- Section 1: Hero Akun & Profil Terpadu -->
                <div class="card settings-hero-card" style="
                    background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: var(--radius-lg);
                    padding: 1.35rem 1.5rem;
                    display: grid;
                    grid-template-columns: auto 1fr auto;
                    align-items: center;
                    gap: 1.5rem;
                ">
                    <div style="position: relative;">
                        <div id="settings-avatar-display" style="
                            width: 76px; height: 76px; border-radius: 22px;
                            background: rgba(255,255,255,0.05);
                            border: 2px solid rgba(255,255,255,0.15);
                            display: flex; align-items: center; justify-content: center;
                            font-size: 2.8rem;
                            box-shadow: 0 8px 24px rgba(0,0,0,0.35);
                            cursor: pointer;
                            transition: transform 0.2s ease;
                        " title="Klik untuk ganti avatar">${currentAvatar}</div>
                        <button id="btn-quick-avatar" style="
                            position: absolute; bottom: -4px; right: -4px;
                            background: var(--accent-primary); border: 2px solid #0f172a;
                            width: 26px; height: 26px; border-radius: 50%;
                            display: flex; align-items: center; justify-content: center;
                            font-size: 0.75rem; cursor: pointer; color: #fff;
                        " title="Ganti Avatar">✏️</button>
                    </div>

                    <div style="min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.35rem;">
                            <span style="font-size: 1.28rem; font-weight: 900; color: #fff;">${gameState.currentUser || 'Tamu'}</span>
                            <span style="font-size: 0.7rem; font-weight: 800; color: #10b981; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); padding: 2px 8px; border-radius: 12px;">
                                AKUN TERVERIFIKASI
                            </span>
                            <span style="font-size: 0.7rem; font-weight: 800; color: #6366f1; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); padding: 2px 8px; border-radius: 12px;">
                                CLOUD DATABASE READY
                            </span>
                        </div>
                        <div style="font-size: 0.82rem; color: var(--accent-primary); font-weight: 700; margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.4rem;">
                            <span>${role?.icon || '💼'}</span> Profil Risiko: <strong>${role?.label || 'Investor Pasif'}</strong>
                        </div>
                        <div style="font-size: 0.72rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;">
                            <span>🌐 Sinkronisasi: <strong>Supabase Authoritative DB</strong></span>
                            <span>📦 Penyimpanan: <strong>Local & Cloud Sync</strong></span>
                        </div>
                    </div>

                    <div class="settings-account-actions" style="display: flex; flex-direction: column; gap: 0.45rem;">
                        <button class="btn btn-secondary btn-sm" id="btn-change-avatar" style="font-size: 0.75rem; font-weight: 700; padding: 6px 12px; justify-content: flex-start;">
                            🖼️ Ganti Avatar
                        </button>
                        <button class="btn btn-secondary btn-sm" id="btn-change-username" style="font-size: 0.75rem; font-weight: 700; padding: 6px 12px; justify-content: flex-start;">
                            ✏️ Ganti Nama Akun
                        </button>
                        <button class="btn btn-secondary btn-sm" id="btn-change-password" style="font-size: 0.75rem; font-weight: 700; padding: 6px 12px; justify-content: flex-start;">
                            🔑 Ganti Sandi Akun
                        </button>
                    </div>
                </div>

                <!-- Section 2: Profil Risiko Investor (4 Profil Standar) -->
                <div class="card" style="
                    background: var(--bg-surface);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 1.35rem 1.5rem;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                        <div>
                            <h2 style="font-size: 1rem; font-weight: 800; color: #fff; margin: 0; display: flex; align-items: center; gap: 0.4rem;">
                                <span>🧭</span> Profil Risiko & Karakteristik Investor
                            </h2>
                            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0 0;">
                                Profil saat ini: <strong style="color: ${role.color};">${role.icon} ${role.label}</strong>. Klik kartu untuk berganti profil risiko secara instan.
                            </p>
                        </div>
                        <button id="btn-retake-assessment" class="btn btn-secondary btn-sm" style="
                            font-size: 0.75rem;
                            font-weight: 800;
                            padding: 6px 12px;
                            border: 1px solid var(--accent-primary);
                            color: var(--accent-primary);
                        ">
                            ↺ Ulangi Kuesioner Asesmen
                        </button>
                    </div>

                    <div class="settings-role-grid" style="
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                        gap: 0.85rem;
                    ">
                        ${roleCardsHTML}
                    </div>
                </div>

                <!-- Section 3: Preferensi Tampilan, Privasi & Grafik -->
                <div class="card" style="
                    background: var(--bg-surface);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 1.35rem 1.5rem;
                ">
                    <h2 style="font-size: 1rem; font-weight: 800; color: #fff; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.4rem;">
                        <span>📊</span> Preferensi Tampilan, Privasi & Grafik
                    </h2>

                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        
                        <!-- Toggle 1: Sembunyikan Saldo (Privacy Mode) -->
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 0.85rem 1.1rem;
                            background: rgba(255,255,255,0.02);
                            border: 1px solid rgba(255,255,255,0.05);
                            border-radius: var(--radius-md);
                        ">
                            <div>
                                <strong style="font-size: 0.88rem; color: #fff; display: block; margin-bottom: 2px;">
                                    Sembunyikan Nilai Saldo Kas (Privacy Mode)
                                </strong>
                                <span style="font-size: 0.72rem; color: var(--text-dim);">
                                    Sensor angka saldo pada kartu kas utama (* * * * * * *) untuk keamanan privasi saat layar dilihat orang lain.
                                </span>
                            </div>
                            <label class="switch" style="position:relative; display:inline-block; width:46px; height:24px; flex-shrink:0;">
                                <input type="checkbox" id="settings-toggle-hide-balance" ${hideBalance ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                                <span class="slider" style="
                                    position:absolute; cursor:pointer; inset:0;
                                    background-color:${hideBalance ? '#10b981' : '#374151'};
                                    border-radius:20px; transition:0.3s;
                                    display:flex; align-items:center;
                                ">
                                    <span class="knob" style="
                                        height:18px; width:18px; background-color:white;
                                        border-radius:50%; transition:0.3s;
                                        transform:translateX(${hideBalance ? '24px' : '4px'});
                                        display:block;
                                    "></span>
                                </span>
                            </label>
                        </div>

                        <!-- Setting 2: Default Timeframe Grafik Saldo -->
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 0.85rem 1.1rem;
                            background: rgba(255,255,255,0.02);
                            border: 1px solid rgba(255,255,255,0.05);
                            border-radius: var(--radius-md);
                            flex-wrap: wrap;
                            gap: 0.75rem;
                        ">
                            <div>
                                <strong style="font-size: 0.88rem; color: #fff; display: block; margin-bottom: 2px;">
                                    Rentang Waktu Default Grafik Beranda (Timeframe)
                                </strong>
                                <span style="font-size: 0.72rem; color: var(--text-dim);">
                                    Pilih rentang waktu yang langsung aktif saat membuka grafik kekayaan bersih di Beranda.
                                </span>
                            </div>
                            <div style="display: flex; gap: 0.4rem;">
                                ${['1d', '1w', '1m', 'ytd', '1y', 'all'].map(tf => {
                                    const isSel = (defaultTimeframe.toLowerCase() === tf);
                                    return `
                                        <button class="btn-timeframe-opt ${isSel ? 'active' : ''}" data-tf="${tf}" style="
                                            padding: 5px 10px;
                                            font-size: 0.75rem;
                                            font-weight: 800;
                                            border-radius: 6px;
                                            cursor: pointer;
                                            background: ${isSel ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)'};
                                            color: ${isSel ? '#fff' : 'var(--text-muted)'};
                                            border: 1px solid ${isSel ? 'transparent' : 'rgba(255,255,255,0.1)'};
                                            transition: all 0.2s;
                                        ">
                                            ${tf.toUpperCase()}
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- Toggle 3: Animasi Grafik Halus -->
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 0.85rem 1.1rem;
                            background: rgba(255,255,255,0.02);
                            border: 1px solid rgba(255,255,255,0.05);
                            border-radius: var(--radius-md);
                        ">
                            <div>
                                <strong style="font-size: 0.88rem; color: #fff; display: block; margin-bottom: 2px;">
                                    Animasi Pergerakan Grafik & Tick Halus
                                </strong>
                                <span style="font-size: 0.72rem; color: var(--text-dim);">
                                    Aktifkan transisi kurva halus saat harga bergerak dan interval waktu berganti.
                                </span>
                            </div>
                            <label class="switch" style="position:relative; display:inline-block; width:46px; height:24px; flex-shrink:0;">
                                <input type="checkbox" id="settings-toggle-smooth-chart" ${smoothChart ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                                <span class="slider" style="
                                    position:absolute; cursor:pointer; inset:0;
                                    background-color:${smoothChart ? '#10b981' : '#374151'};
                                    border-radius:20px; transition:0.3s;
                                    display:flex; align-items:center;
                                ">
                                    <span class="knob" style="
                                        height:18px; width:18px; background-color:white;
                                        border-radius:50%; transition:0.3s;
                                        transform:translateX(${smoothChart ? '24px' : '4px'});
                                        display:block;
                                    "></span>
                                </span>
                            </label>
                        </div>

                    </div>
                </div>

                <!-- Section 4: Preferensi Audio & Notifikasi -->
                <div class="card" style="
                    background: var(--bg-surface);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 1.35rem 1.5rem;
                ">
                    <h2 style="font-size: 1rem; font-weight: 800; color: #fff; margin: 0 0 1rem 0; display: flex; align-items: center; gap: 0.4rem;">
                        <span>🔔</span> Preferensi Audio & Notifikasi
                    </h2>

                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        
                        <!-- Toggle 1: Efek Suara SFX -->
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 0.85rem 1.1rem;
                            background: rgba(255,255,255,0.02);
                            border: 1px solid rgba(255,255,255,0.05);
                            border-radius: var(--radius-md);
                        ">
                            <div>
                                <strong style="font-size: 0.88rem; color: #fff; display: block; margin-bottom: 2px;">
                                    Efek Suara Antarmuka & Trading (Audio SFX)
                                </strong>
                                <span style="font-size: 0.72rem; color: var(--text-dim);">
                                    Bunyikan efek audio synthesizer sintetis saat navigasi, transaksi order, dan notifikasi.
                                </span>
                            </div>
                            <label class="switch" style="position:relative; display:inline-block; width:46px; height:24px; flex-shrink:0;">
                                <input type="checkbox" id="settings-toggle-sound" ${soundEnabled ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                                <span class="slider" style="
                                    position:absolute; cursor:pointer; inset:0;
                                    background-color:${soundEnabled ? '#10b981' : '#374151'};
                                    border-radius:20px; transition:0.3s;
                                    display:flex; align-items:center;
                                ">
                                    <span class="knob" style="
                                        height:18px; width:18px; background-color:white;
                                        border-radius:50%; transition:0.3s;
                                        transform:translateX(${soundEnabled ? '24px' : '4px'});
                                        display:block;
                                    "></span>
                                </span>
                            </label>
                        </div>

                        <!-- Toggle 2: Notifikasi Toast In-Game -->
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 0.85rem 1.1rem;
                            background: rgba(255,255,255,0.02);
                            border: 1px solid rgba(255,255,255,0.05);
                            border-radius: var(--radius-md);
                        ">
                            <div>
                                <strong style="font-size: 0.88rem; color: #fff; display: block; margin-bottom: 2px;">
                                    Pop-up Notifikasi & Peringatan Transaksi (Toast Banners)
                                </strong>
                                <span style="font-size: 0.72rem; color: var(--text-dim);">
                                    Tampilkan banner ringkas di sudut layar saat menerima transfer, dividen, atau berita bursa.
                                </span>
                            </div>
                            <label class="switch" style="position:relative; display:inline-block; width:46px; height:24px; flex-shrink:0;">
                                <input type="checkbox" id="settings-toggle-toasts" ${toastNotifications ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                                <span class="slider" style="
                                    position:absolute; cursor:pointer; inset:0;
                                    background-color:${toastNotifications ? '#10b981' : '#374151'};
                                    border-radius:20px; transition:0.3s;
                                    display:flex; align-items:center;
                                ">
                                    <span class="knob" style="
                                        height:18px; width:18px; background-color:white;
                                        border-radius:50%; transition:0.3s;
                                        transform:translateX(${toastNotifications ? '24px' : '4px'});
                                        display:block;
                                    "></span>
                                </span>
                            </label>
                        </div>

                    </div>
                </div>

                <!-- Section 5: Cadangan & Pemulihan Data Akun (Backup & Restore) -->
                <div class="card" style="
                    background: var(--bg-surface);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 1.35rem 1.5rem;
                ">
                    <h2 style="font-size: 1rem; font-weight: 800; color: #fff; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.4rem;">
                        <span>📦</span> Cadangan & Pemulihan Data Akun
                    </h2>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1.1rem;">
                        Anda dapat mengunduh seluruh progres permainan Anda ke file cadangan JSON untuk disimpan di komputer atau dipindahkan ke peramban lain.
                    </p>

                    <div style="display: flex; gap: 0.85rem; flex-wrap: wrap;">
                        <button class="btn btn-secondary" id="btn-export-save" style="
                            flex: 1;
                            min-width: 220px;
                            font-weight: 800;
                            font-size: 0.82rem;
                            padding: 10px 16px;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            gap: 6px;
                        ">
                            📥 Ekspor Cadangan (.JSON)
                        </button>

                        <button class="btn btn-secondary" id="btn-import-save-trigger" style="
                            flex: 1;
                            min-width: 220px;
                            font-weight: 800;
                            font-size: 0.82rem;
                            padding: 10px 16px;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            gap: 6px;
                        ">
                            📤 Impor Data Cadangan (.JSON)
                        </button>
                        <input type="file" id="input-import-save" accept=".json" style="display: none;" />
                    </div>
                </div>

                <!-- Section 6: Zona Keamanan & Sesi (Danger Zone) -->
                <div class="card" style="
                    background: rgba(239, 68, 68, 0.03);
                    border: 1px solid rgba(239, 68, 68, 0.25);
                    border-radius: var(--radius-lg);
                    padding: 1.35rem 1.5rem;
                ">
                    <h2 style="font-size: 1rem; font-weight: 800; color: #ef4444; margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.4rem;">
                        <span>⚠️</span> Zona Keamanan & Sesi Akun
                    </h2>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1rem;">
                        Aksi berikut akan mempengaruhi status akun dan sesi permainan Anda saat ini. Lakukan dengan penuh kehati-hatian.
                    </p>

                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                        <button class="btn btn-secondary" id="btn-settings-logout" style="
                            flex: 1;
                            min-width: 200px;
                            font-weight: 800;
                            font-size: 0.85rem;
                            padding: 10px 16px;
                            border-color: rgba(255,255,255,0.15);
                        ">
                            🚪 Keluar dari Akun (Logout)
                        </button>
                        <button class="btn btn-danger" id="btn-settings-reset" style="
                            flex: 1;
                            min-width: 200px;
                            font-weight: 800;
                            font-size: 0.85rem;
                            padding: 10px 16px;
                        ">
                            🗑️ Reset Progres Akun Ini
                        </button>
                    </div>
                </div>

            </div>
        `;

        this.bindEvents(containerEl);
    }

    bindEvents(containerEl) {
        if (!containerEl) return;

        const lowerUser = (gameState.currentUser || '').toLowerCase();

        // 1. Back button -> Return to home view
        document.getElementById('btn-settings-back')?.addEventListener('click', () => {
            import('./ViewManager.js').then(m => m.default.switchView('home'));
        });

        // 2. Save Progress Button
        document.getElementById('btn-settings-save')?.addEventListener('click', (e) => {
            const success = gameState.save();
            if (success) {
                ui.success(`Progres akun @${gameState.currentUser || 'Pemain'} berhasil disimpan!`, '💾 Sukses Menyimpan');
                try {
                    import('../Animations.js').then(anim => {
                        anim.createFloatingText(e.target, '💾 DISIMPAN!', '#10b981');
                    });
                } catch(err) {}
            } else {
                ui.error('Data baru saja disimpan atau memori browser sedang sibuk.', '💾 Info');
            }
        });

        // 3. Change Account Avatar
        const handleAvatarChange = () => {
            const avatars = ['👤', '💼', '🦁', '🦅', '🦊', '🐉', '🚀', '💡', '🛡️', '👑', '💎', '📈', '🏎️', '🤖'];
            const accounts = gameState.getAccounts();
            const currentAvatar = accounts[lowerUser]?.avatar || '👤';
            let nextIdx = (avatars.indexOf(currentAvatar) + 1) % avatars.length;
            const newAvatar = avatars[nextIdx];

            gameState.changeAccountAvatar(newAvatar);
            ui.success(`Avatar akun berhasil diubah ke ${newAvatar}!`, '🖼️ Sukses');
            this.render(containerEl);
        };
        document.getElementById('btn-change-avatar')?.addEventListener('click', handleAvatarChange);
        document.getElementById('btn-quick-avatar')?.addEventListener('click', handleAvatarChange);
        document.getElementById('settings-avatar-display')?.addEventListener('click', handleAvatarChange);

        // 4. Change Account Username
        document.getElementById('btn-change-username')?.addEventListener('click', () => {
            if (!gameState.currentUser) return;
            const newName = prompt('Masukkan nama akun baru Anda:', gameState.currentUser);
            if (newName === null) return;
            if (!newName.trim()) {
                ui.error('Nama akun tidak boleh kosong!');
                return;
            }
            try {
                gameState.changeAccountUsername(newName);
                ui.success('Nama akun berhasil diubah!', '🛡️ Sukses');
                setTimeout(() => location.reload(), 1000);
            } catch (err) {
                ui.error(err.message);
            }
        });

        // 5. Change Account Password
        document.getElementById('btn-change-password')?.addEventListener('click', () => {
            if (!gameState.currentUser) return;
            const newPass = prompt('Masukkan password baru Anda (minimal 4 karakter):');
            if (newPass === null) return;
            if (!newPass.trim() || newPass.length < 4) {
                ui.error('Password minimal 4 karakter!');
                return;
            }
            try {
                gameState.changeAccountPassword(newPass);
                ui.success('Password akun berhasil diperbarui!', '🛡️ Sukses');
            } catch (err) {
                ui.error(err.message);
            }
        });

        // 6. Role card selection
        containerEl.querySelectorAll('.settings-role-card[data-role]').forEach(card => {
            card.addEventListener('click', async () => {
                const newRole = card.dataset.role;
                if (newRole === roleManager.getRole()) return;
                const targetData = roleManager.getRoleData(newRole);
                const confirmed = await ui.confirm({
                    title: `Ubah ke ${targetData?.label}?`,
                    message: `Profil risiko akun Anda akan diubah ke ${targetData?.label}. Portofolio dan saldo yang sudah dimiliki tetap aman.`,
                    confirmText: 'Ya, Ubah Profil',
                    danger: false
                });
                if (confirmed) {
                    roleManager.setRole(newRole);
                    roleManager.applyVisibility();
                    ui.success(`Profil Risiko aktif: ${targetData?.label}`);
                    this.render(containerEl);
                }
            });
        });

        // 7. Retake Assessment Questionnaire
        document.getElementById('btn-retake-assessment')?.addEventListener('click', () => {
            if (window.game?.showRiskAssessment) {
                new Promise(resolve => {
                    window.game.showRiskAssessment(resolve, 0, []);
                }).then(() => {
                    this.render(containerEl);
                });
            } else {
                ui.info('Buka asesmen profil risiko dari menu beranda.');
            }
        });

        // 8. Toggle Hide Balance
        const hideBalanceChk = document.getElementById('settings-toggle-hide-balance');
        hideBalanceChk?.addEventListener('change', (e) => {
            const checked = e.target.checked;
            gameState.set('settings.hideBalance', checked);
            const slider = hideBalanceChk.nextElementSibling;
            const knob = slider.querySelector('.knob');
            slider.style.backgroundColor = checked ? '#10b981' : '#374151';
            knob.style.transform = `translateX(${checked ? '24px' : '4px'})`;
            ui.success(checked ? 'Saldo Disembunyikan' : 'Saldo Ditampilkan');
            import('../HomeScreen.js').then(m => m.default.updateBalanceCard());
        });

        // 9. Timeframe Switchers
        containerEl.querySelectorAll('.btn-timeframe-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                const tf = btn.dataset.tf;
                gameState.set('settings.defaultTimeframe', tf);
                containerEl.querySelectorAll('.btn-timeframe-opt').forEach(b => {
                    const isTarget = b.dataset.tf === tf;
                    b.style.background = isTarget ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)';
                    b.style.color = isTarget ? '#fff' : 'var(--text-muted)';
                    b.style.border = isTarget ? 'transparent' : '1px solid rgba(255,255,255,0.1)';
                });
                ui.success(`Rentang waktu default diatur ke ${tf.toUpperCase()}`);
            });
        });

        // 10. Toggle Smooth Chart
        const smoothChartChk = document.getElementById('settings-toggle-smooth-chart');
        smoothChartChk?.addEventListener('change', (e) => {
            const checked = e.target.checked;
            gameState.set('settings.smoothChart', checked);
            const slider = smoothChartChk.nextElementSibling;
            const knob = slider.querySelector('.knob');
            slider.style.backgroundColor = checked ? '#10b981' : '#374151';
            knob.style.transform = `translateX(${checked ? '24px' : '4px'})`;
            ui.success(checked ? 'Animasi grafik diaktifkan' : 'Animasi grafik dinonaktifkan');
        });

        // 11. Toggle Sound SFX
        const soundChk = document.getElementById('settings-toggle-sound');
        soundChk?.addEventListener('change', (e) => {
            const checked = e.target.checked;
            gameState.set('settings.soundEnabled', checked);
            const slider = soundChk.nextElementSibling;
            const knob = slider.querySelector('.knob');
            slider.style.backgroundColor = checked ? '#10b981' : '#374151';
            knob.style.transform = `translateX(${checked ? '24px' : '4px'})`;
            ui.success(checked ? 'Efek Suara Diaktifkan' : 'Efek Suara Disenyapkan');
        });

        // 12. Toggle In-game Toasts
        const toastChk = document.getElementById('settings-toggle-toasts');
        toastChk?.addEventListener('change', (e) => {
            const checked = e.target.checked;
            gameState.set('settings.toastNotifications', checked);
            const slider = toastChk.nextElementSibling;
            const knob = slider.querySelector('.knob');
            slider.style.backgroundColor = checked ? '#10b981' : '#374151';
            knob.style.transform = `translateX(${checked ? '24px' : '4px'})`;
            ui.success(checked ? 'Notifikasi Pop-up Diaktifkan' : 'Notifikasi Pop-up Disenyapkan');
        });

        // 13. Export Save Data JSON
        document.getElementById('btn-export-save')?.addEventListener('click', () => {
            try {
                const stateData = gameState.state;
                const blob = new Blob([JSON.stringify(stateData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const dateStr = new Date().toISOString().split('T')[0];
                a.href = url;
                a.download = `AuraAssets_Save_${gameState.currentUser || 'Pemain'}_${dateStr}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                ui.success('File cadangan data berhasil diunduh!', '📥 Ekspor Berhasil');
            } catch (err) {
                ui.error('Gagal mengekspor data: ' + err.message);
            }
        });

        // 14. Import Save Data JSON
        const importInput = document.getElementById('input-import-save');
        document.getElementById('btn-import-save-trigger')?.addEventListener('click', () => {
            importInput?.click();
        });
        importInput?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    if (!parsed || typeof parsed !== 'object' || !parsed.player) {
                        throw new Error('Format file cadangan tidak valid!');
                    }
                    const confirmed = await ui.confirm({
                        title: 'Pulihkan Data Cadangan?',
                        message: 'Data permainan saat ini akan digantikan dengan data dari file cadangan yang Anda unggah.',
                        confirmText: 'Ya, Pulihkan Data',
                        danger: true
                    });
                    if (confirmed) {
                        gameState.state = gameState.mergeState(gameState.getDefaultState(), parsed);
                        gameState.save();
                        ui.success('Data berhasil dipulihkan! Memuat ulang...', '📤 Impor Berhasil');
                        setTimeout(() => location.reload(), 1200);
                    }
                } catch (err) {
                    ui.error('Gagal memulihkan file: ' + err.message);
                }
            };
            reader.readAsText(file);
        });

        // 15. Logout Button
        document.getElementById('btn-settings-logout')?.addEventListener('click', () => {
            gameState.logout();
        });

        // 16. Reset Account Progress Button
        document.getElementById('btn-settings-reset')?.addEventListener('click', () => {
            const userName = gameState.currentUser || 'Pemain';
            if (confirm(`Yakin ingin mereset progress akun "${userName}"? Seluruh modal kas, saham, dan portofolio akun ini akan dikembalikan ke kondisi awal!`)) {
                gameState.reset();
                location.reload();
            }
        });
    }
}

export const settingsPage = new SettingsPage();
export default settingsPage;
