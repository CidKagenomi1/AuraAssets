/**
 * PoliticsPanel.js - Presidential Politics UI
 * Tabs: Dashboard | Kebijakan Ekonomi | Dekret | Korupsi
 * Accessible from CareerPanel when Government Path Level 8 is reached.
 */

import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import politicsManager, {
    POLITICAL_SECTORS,
    POLITICAL_PARTIES,
    CAMPAIGN_PACKAGES,
    DECREE_TYPES,
} from '../../core/PoliticsManager.js';

class PoliticsPanel {
    constructor() {
        this.activeTab = 'dashboard';
    }

    show() {
        this.render();
    }

    render() {
        const state = politicsManager.getState();
        const isPresident = state.isPresident;

        let content;
        if (!isPresident && !state.candidateName) {
            content = this._renderRegistration(state);
        } else if (!isPresident && state.candidateName) {
            content = this._renderCampaignLobby(state);
        } else {
            content = this._renderPalace(state);
        }

        import('../../ui/ViewManager.js').then(m => {
            m.default.showDynamicView('🏛️ Istana Kepresidenan', 'Pusat Kekuasaan & Kebijakan Negara', content);
            this._bindEvents();
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Registrasi Kandidat
    // ═══════════════════════════════════════════════════════════════════════
    _renderRegistration(state) {
        const partiesHTML = POLITICAL_PARTIES.map(p => `
            <label class="party-option" data-party="${p.id}" style="
                display:flex; align-items:center; gap:0.75rem;
                background:rgba(255,255,255,0.02); border:2px solid rgba(255,255,255,0.08);
                border-radius:12px; padding:0.875rem 1rem; cursor:pointer; transition:all 0.2s;
            ">
                <input type="radio" name="party-select" value="${p.id}" style="display:none;">
                <span style="font-size:1.75rem;">${p.icon}</span>
                <div style="flex:1;">
                    <div style="font-weight:800; font-size:0.9rem; color:white;">${p.name}</div>
                    <div style="font-size:0.72rem; color:${p.color}; font-weight:600; margin-top:2px;">"${p.slogan}"</div>
                </div>
                <div class="party-check" style="width:18px; height:18px; border-radius:50%; border:2px solid ${p.color}; flex-shrink:0;"></div>
            </label>
        `).join('');

        return `
        <div id="politics-root" style="max-width:720px; margin:0 auto; padding:1.5rem;">

            <!-- Hero Banner -->
            <div style="
                background:linear-gradient(135deg, rgba(220,38,38,0.15) 0%, rgba(251,191,36,0.1) 50%, rgba(220,38,38,0.05) 100%);
                border:1px solid rgba(220,38,38,0.3);
                border-radius:20px; padding:2rem; text-align:center; margin-bottom:1.5rem;
                position:relative; overflow:hidden;
            ">
                <div style="font-size:3.5rem; margin-bottom:0.5rem;">🇮🇩</div>
                <h2 style="font-size:1.75rem; font-weight:900; color:white; margin:0 0 0.5rem 0; letter-spacing:-0.02em;">
                    Daftar Calon Presiden
                </h2>
                <p style="color:rgba(255,255,255,0.55); font-size:0.875rem; max-width:480px; margin:0 auto; line-height:1.5;">
                    Anda telah mencapai puncak karir pemerintahan sebagai <strong style="color:#fbbf24;">Cabinet Minister</strong>.
                    Saatnya melangkah lebih jauh — menjadi pemimpin bangsa!
                </p>
            </div>

            <!-- Form Pendaftaran -->
            <div style="
                background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08);
                border-radius:16px; padding:1.5rem; margin-bottom:1rem;
            ">
                <div style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:900; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:1rem;">
                    ① IDENTITAS KANDIDAT
                </div>
                <div style="margin-bottom:1.25rem;">
                    <label style="display:block; font-size:0.78rem; font-weight:700; color:rgba(255,255,255,0.7); margin-bottom:0.5rem;">
                        Nama Calon Presiden
                    </label>
                    <input type="text" id="pol-candidate-name"
                        placeholder="Masukkan nama lengkap Anda..."
                        value="${gameState.get('player.name') || ''}"
                        style="
                            width:100%; background:rgba(0,0,0,0.3); border:1.5px solid rgba(220,38,38,0.35);
                            border-radius:10px; padding:0.75rem 1rem; color:white; font-size:0.95rem;
                            font-weight:700; outline:none; transition:border-color 0.2s; box-sizing:border-box;
                        "
                    >
                </div>
            </div>

            <div style="
                background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08);
                border-radius:16px; padding:1.5rem; margin-bottom:1.5rem;
            ">
                <div style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:900; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:1rem;">
                    ② PILIH PARTAI POLITIK
                </div>
                <div id="party-list" style="display:flex; flex-direction:column; gap:0.5rem;">
                    ${partiesHTML}
                </div>
            </div>

            <!-- Submit -->
            <button id="btn-register-candidate" style="
                width:100%; background:linear-gradient(135deg,#dc2626,#b91c1c);
                border:none; border-radius:12px; padding:1rem; color:white;
                font-size:1.05rem; font-weight:900; cursor:pointer; letter-spacing:0.05em;
                box-shadow:0 4px 16px rgba(220,38,38,0.35); transition:all 0.2s;
            ">
                🗳️ DAFTAR SEBAGAI KANDIDAT PRESIDEN
            </button>
        </div>

        <style>
            .party-option.selected {
                border-color: var(--party-color, #ef4444) !important;
                background: rgba(255,255,255,0.05) !important;
            }
            .party-option.selected .party-check {
                background: var(--party-color, #ef4444) !important;
            }
            #pol-candidate-name:focus { border-color: #dc2626 !important; }
            #btn-register-candidate:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(220,38,38,0.5) !important; }
        </style>
        `;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: Lobby Kampanye (Pre-Election)
    // ═══════════════════════════════════════════════════════════════════════
    _renderCampaignLobby(state) {
        const party = POLITICAL_PARTIES.find(p => p.id === state.partyId) || POLITICAL_PARTIES[0];
        const support = state.supportPercent || 30;
        const supportColor = support >= 60 ? '#10b981' : support >= 45 ? '#f59e0b' : '#ef4444';
        const supportLabel = support >= 65 ? 'Sangat Kuat' : support >= 50 ? 'Kompetitif' : support >= 35 ? 'Lemah' : 'Sangat Lemah';

        const pkgHTML = CAMPAIGN_PACKAGES.map(pkg => `
            <div style="
                background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.08);
                border-radius:12px; padding:1rem; display:flex; justify-content:space-between; align-items:center;
            ">
                <div style="display:flex; align-items:center; gap:0.75rem;">
                    <span style="font-size:1.5rem;">${pkg.icon}</span>
                    <div>
                        <div style="font-weight:800; font-size:0.88rem; color:white;">${pkg.label}</div>
                        <div style="font-size:0.72rem; color:rgba(255,255,255,0.5);">
                            +${pkg.supportBoost}% suara <span style="color:rgba(255,255,255,0.3);">(estimasi)</span>
                        </div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:0.7rem; color:rgba(255,255,255,0.4); margin-bottom:4px;">Biaya</div>
                    <div style="font-size:0.88rem; font-weight:900; color:#fbbf24; margin-bottom:6px;">$${this._fmt(pkg.cost)}</div>
                    <button class="btn-buy-campaign" data-pkg="${pkg.id}" style="
                        background:rgba(251,191,36,0.15); border:1px solid rgba(251,191,36,0.35);
                        color:#fbbf24; font-size:0.7rem; font-weight:800; padding:4px 12px;
                        border-radius:6px; cursor:pointer; transition:all 0.15s;
                    ">Beli</button>
                </div>
            </div>
        `).join('');

        return `
        <div id="politics-root" style="max-width:720px; margin:0 auto; padding:1.5rem;">

            <!-- Kandidat Header -->
            <div style="
                background:linear-gradient(135deg, ${party.color}22, rgba(0,0,0,0.4));
                border:1px solid ${party.color}44; border-radius:16px; padding:1.25rem;
                display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem;
            ">
                <span style="font-size:2.5rem;">${party.icon}</span>
                <div style="flex:1;">
                    <div style="font-size:0.65rem; color:${party.color}; font-weight:900; text-transform:uppercase; letter-spacing:0.1em;">${party.name}</div>
                    <div style="font-size:1.2rem; font-weight:900; color:white; margin:2px 0;">${state.candidateName}</div>
                    <div style="font-size:0.72rem; color:rgba(255,255,255,0.5); font-style:italic;">"${party.slogan}"</div>
                </div>
            </div>

            <!-- Dukungan Suara -->
            <div style="
                background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08);
                border-radius:16px; padding:1.25rem; margin-bottom:1.25rem;
            ">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                    <div style="font-size:0.7rem; color:rgba(255,255,255,0.5); font-weight:800; text-transform:uppercase; letter-spacing:0.08em;">📊 DUKUNGAN PUBLIK SAAT INI</div>
                    <div style="font-size:0.72rem; font-weight:800; color:${supportColor}; background:${supportColor}22; padding:3px 10px; border-radius:20px;">${supportLabel}</div>
                </div>
                <!-- Support Bar -->
                <div style="height:18px; background:rgba(255,255,255,0.05); border-radius:9px; overflow:hidden; margin-bottom:0.5rem; position:relative;">
                    <div id="support-bar" style="height:100%; width:${support}%; background:linear-gradient(90deg,${supportColor},${supportColor}cc); border-radius:9px; transition:width 0.6s;"></div>
                    <div style="position:absolute; right:8px; top:50%; transform:translateY(-50%); font-size:0.65rem; font-weight:900; color:white;">${support.toFixed(1)}%</div>
                </div>
                <div style="font-size:0.72rem; color:rgba(255,255,255,0.4); text-align:center;">
                    ${support >= 50 ? '✅ Kemungkinan menang jika pemilu diadakan sekarang' : '⚠️ Perlu lebih banyak kampanye untuk meningkatkan suara'}
                </div>
            </div>

            <!-- Paket Kampanye -->
            <div style="
                background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08);
                border-radius:16px; padding:1.25rem; margin-bottom:1.25rem;
            ">
                <div style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:900; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:1rem;">
                    📣 PAKET KAMPANYE
                </div>
                <div style="display:flex; flex-direction:column; gap:0.6rem;">
                    ${pkgHTML}
                </div>
            </div>

            <!-- Tombol Pemilihan -->
            <button id="btn-run-election" style="
                width:100%; background:linear-gradient(135deg, #1d4ed8, #1e40af);
                border:none; border-radius:12px; padding:1rem; color:white;
                font-size:1.05rem; font-weight:900; cursor:pointer; letter-spacing:0.05em;
                box-shadow:0 4px 16px rgba(29,78,216,0.35); transition:all 0.2s;
                margin-bottom:0.75rem;
            ">
                🗳️ MULAI PEMILIHAN UMUM SEKARANG
            </button>
            <button id="btn-cancel-candidacy" style="
                width:100%; background:transparent; border:1px solid rgba(255,255,255,0.1);
                border-radius:12px; padding:0.75rem; color:rgba(255,255,255,0.5);
                font-size:0.85rem; font-weight:700; cursor:pointer; transition:all 0.2s;
            ">Batalkan Pencalonan</button>
        </div>

        <style>
            .btn-buy-campaign:hover { background:rgba(251,191,36,0.3) !important; }
            #btn-run-election:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(29,78,216,0.5) !important; }
        </style>
        `;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: Istana Presiden (4 tabs)
    // ═══════════════════════════════════════════════════════════════════════
    _renderPalace(state) {
        const tabs = [
            { id: 'dashboard', label: 'Dashboard', icon: '🏛️' },
            { id: 'policy',    label: 'Kebijakan',  icon: '📊' },
            { id: 'decrees',   label: 'Dekret',     icon: '📜' },
            { id: 'corrupt',   label: 'Ruang Gelap', icon: '🕵️' },
        ];

        const tabsHTML = tabs.map(t => `
            <button class="palace-tab ${this.activeTab === t.id ? 'active' : ''}" data-tab="${t.id}" style="
                flex:1; min-width:80px; padding:0.6rem 0.5rem; border:none; border-radius:8px;
                font-size:0.75rem; font-weight:800; cursor:pointer; transition:all 0.2s;
                background:${this.activeTab === t.id ? 'rgba(220,38,38,0.2)' : 'transparent'};
                color:${this.activeTab === t.id ? '#fca5a5' : 'rgba(255,255,255,0.5)'};
                border:1px solid ${this.activeTab === t.id ? 'rgba(220,38,38,0.35)' : 'transparent'};
            ">${t.icon} ${t.label}</button>
        `).join('');

        let tabContent = '';
        if (this.activeTab === 'dashboard') tabContent = this._renderDashboardTab(state);
        else if (this.activeTab === 'policy')    tabContent = this._renderPolicyTab(state);
        else if (this.activeTab === 'decrees')   tabContent = this._renderDecreesTab(state);
        else if (this.activeTab === 'corrupt')   tabContent = this._renderCorruptTab(state);

        return `
        <div id="politics-root" style="max-width:1000px; margin:0 auto; padding:1rem 1.5rem;">

            <!-- Palace Header -->
            <div style="
                background:linear-gradient(135deg, rgba(220,38,38,0.2) 0%, rgba(0,0,0,0.6) 100%);
                border:1px solid rgba(220,38,38,0.3); border-radius:16px;
                padding:1rem 1.5rem; margin-bottom:1rem;
                display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;
            ">
                <div style="display:flex; align-items:center; gap:1rem;">
                    <span style="font-size:2.25rem;">🇮🇩</span>
                    <div>
                        <div style="font-size:0.65rem; color:rgba(220,38,38,0.8); font-weight:900; text-transform:uppercase; letter-spacing:0.1em;">
                            PRESIDEN REPUBLIK
                        </div>
                        <div style="font-size:1.3rem; font-weight:900; color:white; line-height:1.1;">${state.candidateName}</div>
                        <div style="font-size:0.7rem; color:rgba(255,255,255,0.4);">
                            ${POLITICAL_PARTIES.find(p=>p.id===state.partyId)?.name || 'Independen'}
                        </div>
                    </div>
                </div>
                <div style="display:flex; gap:1rem; flex-wrap:wrap;">
                    ${this._statPill('Approval', state.approvalRating.toFixed(0) + '%',
                        state.approvalRating >= 60 ? '#10b981' : state.approvalRating >= 40 ? '#f59e0b' : '#ef4444')}
                    ${this._statPill('Korupsi', state.corruptionLevel.toFixed(0) + '%',
                        state.corruptionLevel >= 60 ? '#ef4444' : state.corruptionLevel >= 30 ? '#f59e0b' : '#10b981')}
                    ${this._statPill('Masa Jabatan', state.termStart || '-', '#fbbf24')}
                </div>
            </div>

            <!-- Tabs -->
            <div style="display:flex; gap:0.35rem; margin-bottom:1rem; background:rgba(0,0,0,0.3); padding:4px; border-radius:12px; flex-wrap:wrap;">
                ${tabsHTML}
            </div>

            <!-- Tab Content -->
            <div id="palace-tab-content">
                ${tabContent}
            </div>
        </div>

        ${this._getPalaceStyles()}
        `;
    }

    _statPill(label, value, color) {
        return `
            <div style="text-align:center; background:${color}15; border:1px solid ${color}35; border-radius:10px; padding:0.5rem 0.875rem; min-width:80px;">
                <div style="font-size:0.55rem; color:${color}; font-weight:900; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:2px;">${label}</div>
                <div style="font-size:1rem; font-weight:900; color:${color};">${value}</div>
            </div>
        `;
    }

    // ─────────────── TAB 1: DASHBOARD ─────────────────────────────────────
    _renderDashboardTab(state) {
        const approval = state.approvalRating;
        const corruption = state.corruptionLevel;
        const party = POLITICAL_PARTIES.find(p => p.id === state.partyId) || POLITICAL_PARTIES[0];

        // Economy index from gameState
        const econIdx = gameState.get('economy.index') || 1000;
        const econPhase = gameState.get('economy.phase') || 'RECOVERY';
        const phaseColors = { BULL:'#10b981', RECOVERY:'#3b82f6', PEAK:'#fbbf24', CORRECTION:'#f59e0b', BEAR:'#ef4444', TROUGH:'#94a3b8' };

        // Recent decrees for news
        const recentDecrees = (state.decrees || []).slice(0, 4);
        const recentCorrupt = (state.corruptionLog || []).slice(0, 3);

        // Approval gauge SVG
        const r = 45, cx = 60, cy = 60;
        const circ = 2 * Math.PI * r;
        const filled = (approval / 100) * circ;
        const approvalColor = approval >= 60 ? '#10b981' : approval >= 40 ? '#f59e0b' : '#ef4444';

        return `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">

            <!-- Approval Gauge -->
            <div class="palace-card" style="text-align:center; padding:1.5rem;">
                <div style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:900; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:1rem;">Approval Rating Publik</div>
                <svg viewBox="0 0 120 120" style="width:120px; height:120px; transform:rotate(-90deg);">
                    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10"/>
                    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${approvalColor}" stroke-width="10"
                        stroke-dasharray="${filled} ${circ}" stroke-linecap="round"/>
                </svg>
                <div style="margin-top:-10px; font-size:2rem; font-weight:900; color:${approvalColor};">${approval.toFixed(0)}%</div>
                <div style="font-size:0.72rem; color:rgba(255,255,255,0.4);">
                    ${approval >= 70 ? 'Sangat Populer 🌟' : approval >= 50 ? 'Stabil ✅' : approval >= 30 ? 'Menurun ⚠️' : 'Krisis! 🚨'}
                </div>
            </div>

            <!-- Statistik Negara -->
            <div style="display:flex; flex-direction:column; gap:0.75rem;">
                <div class="palace-card" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.6rem; color:rgba(255,255,255,0.4); text-transform:uppercase; font-weight:800;">Indeks Ekonomi</div>
                        <div style="font-size:1.2rem; font-weight:900; color:${phaseColors[econPhase] || '#fff'};">${econIdx.toFixed(0)}</div>
                    </div>
                    <div style="font-size:0.65rem; font-weight:800; background:${phaseColors[econPhase]}22; color:${phaseColors[econPhase]}; padding:4px 10px; border-radius:20px;">${econPhase}</div>
                </div>

                <div class="palace-card" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.6rem; color:rgba(255,255,255,0.4); text-transform:uppercase; font-weight:800;">Level Korupsi</div>
                        <div style="font-size:1.2rem; font-weight:900; color:${corruption >= 50 ? '#ef4444' : '#10b981'};">${corruption.toFixed(0)}%</div>
                    </div>
                    <div style="width:60px; height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden;">
                        <div style="height:100%; width:${corruption}%; background:${corruption >= 50 ? '#ef4444' : '#f59e0b'}; border-radius:4px;"></div>
                    </div>
                </div>

                <div class="palace-card" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.6rem; color:rgba(255,255,255,0.4); text-transform:uppercase; font-weight:800;">Partai Penguasa</div>
                        <div style="font-size:0.85rem; font-weight:800; color:${party.color};">${party.icon} ${party.name}</div>
                    </div>
                </div>

                <div class="palace-card" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:0.6rem; color:rgba(255,255,255,0.4); text-transform:uppercase; font-weight:800;">Total Kampanye</div>
                        <div style="font-size:0.85rem; font-weight:900; color:#fbbf24;">$${this._fmt(state.totalCampaignSpent || 0)}</div>
                    </div>
                    <div style="font-size:0.7rem; color:rgba(255,255,255,0.3);">${state.campaignsFought}× pemilu</div>
                </div>
            </div>

            <!-- Berita Terkini (Log Dekret) -->
            <div class="palace-card" style="grid-column:1/-1;">
                <div style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:900; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.875rem;">
                    📰 BULETIN ISTANA TERKINI
                </div>
                ${recentDecrees.length > 0 ? recentDecrees.map(d => `
                    <div style="display:flex; align-items:center; gap:0.75rem; padding:0.6rem 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                        <span style="font-size:1.25rem; flex-shrink:0;">${d.typeIcon}</span>
                        <div style="flex:1; min-width:0;">
                            <div style="font-size:0.8rem; font-weight:800; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${d.title}</div>
                            <div style="font-size:0.65rem; color:rgba(255,255,255,0.4);">${d.typeLabel} · ${d.date}</div>
                        </div>
                        <div style="font-size:0.65rem; font-weight:800; color:#818cf8; flex-shrink:0;">Intensitas: ${d.intensity}%</div>
                    </div>
                `).join('') : `<div style="text-align:center; color:rgba(255,255,255,0.3); font-size:0.8rem; padding:1rem;">Belum ada dekret yang diterbitkan.</div>`}
            </div>
        </div>
        `;
    }

    // ─────────────── TAB 2: KEBIJAKAN EKONOMI (VERTICAL SLIDERS) ──────────
    _renderPolicyTab(state) {
        const sectorCards = POLITICAL_SECTORS.map(sector => {
            const p = state.policies[sector.id] || { importTax: 0, exportSubsidy: 0, sectorBudget: 0 };

            return `
            <div class="palace-card sector-policy-card" style="display:flex; flex-direction:column; align-items:center; gap:0.5rem;">

                <!-- Sector Header -->
                <div style="text-align:center; margin-bottom:0.25rem;">
                    <div style="font-size:1.5rem;">${sector.icon}</div>
                    <div style="font-size:0.65rem; font-weight:900; color:${sector.color}; text-transform:uppercase; letter-spacing:0.06em; margin-top:2px; line-height:1.2;">${sector.label}</div>
                </div>

                <!-- Vertical Sliders Row -->
                <div style="display:flex; gap:1rem; align-items:flex-end; justify-content:center; height:140px;">

                    <!-- Pajak Impor -->
                    <div style="display:flex; flex-direction:column; align-items:center; gap:0.3rem;">
                        <div style="font-size:0.55rem; color:rgba(255,255,255,0.4); text-align:center; writing-mode:initial;">
                            <span style="font-size:0.85rem;">📋</span>
                        </div>
                        <div class="v-slider-wrap">
                            <input type="range" class="policy-slider v-slider" min="0" max="50" step="1"
                                value="${p.importTax}" orient="vertical"
                                data-sector="${sector.id}" data-policy="importTax"
                                style="--slider-color: #ef4444;">
                        </div>
                        <div class="slider-val" data-sector="${sector.id}" data-policy="importTax" style="color:#ef4444;">${p.importTax}%</div>
                        <div style="font-size:0.5rem; color:rgba(255,255,255,0.3); text-align:center; max-width:42px; line-height:1.2;">Pajak Impor</div>
                    </div>

                    <!-- Subsidi Ekspor -->
                    <div style="display:flex; flex-direction:column; align-items:center; gap:0.3rem;">
                        <div style="font-size:0.55rem; color:rgba(255,255,255,0.4);">
                            <span style="font-size:0.85rem;">💸</span>
                        </div>
                        <div class="v-slider-wrap">
                            <input type="range" class="policy-slider v-slider" min="0" max="40" step="1"
                                value="${p.exportSubsidy}" orient="vertical"
                                data-sector="${sector.id}" data-policy="exportSubsidy"
                                style="--slider-color: #10b981;">
                        </div>
                        <div class="slider-val" data-sector="${sector.id}" data-policy="exportSubsidy" style="color:#10b981;">${p.exportSubsidy}%</div>
                        <div style="font-size:0.5rem; color:rgba(255,255,255,0.3); text-align:center; max-width:42px; line-height:1.2;">Subsidi Ekspor</div>
                    </div>

                    <!-- Anggaran Sektor -->
                    <div style="display:flex; flex-direction:column; align-items:center; gap:0.3rem;">
                        <div style="font-size:0.55rem; color:rgba(255,255,255,0.4);">
                            <span style="font-size:0.85rem;">🏦</span>
                        </div>
                        <div class="v-slider-wrap">
                            <input type="range" class="policy-slider v-slider" min="0" max="100" step="5"
                                value="${p.sectorBudget}" orient="vertical"
                                data-sector="${sector.id}" data-policy="sectorBudget"
                                style="--slider-color: #fbbf24;">
                        </div>
                        <div class="slider-val" data-sector="${sector.id}" data-policy="sectorBudget" style="color:#fbbf24;">${p.sectorBudget}</div>
                        <div style="font-size:0.5rem; color:rgba(255,255,255,0.3); text-align:center; max-width:42px; line-height:1.2;">Anggaran</div>
                    </div>
                </div>

                <!-- Efek Bersih -->
                <div style="
                    font-size:0.6rem; font-weight:800; text-align:center;
                    padding:2px 8px; border-radius:20px; margin-top:2px;
                " id="net-effect-${sector.id}">
                    ${this._renderNetEffect(p)}
                </div>
            </div>
            `;
        });

        return `
        <div>
            <div style="
                background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.2);
                border-radius:10px; padding:0.875rem 1rem; margin-bottom:1rem;
                display:flex; align-items:center; gap:0.75rem;
            ">
                <span style="font-size:1.25rem;">ℹ️</span>
                <div style="font-size:0.75rem; color:rgba(255,255,255,0.65); line-height:1.4;">
                    Kebijakan sektor mempengaruhi multiplier pendapatan bisnis Anda di setiap sektor.
                    Pajak impor tinggi = produksi domestik naik. Subsidi ekspor = pendapatan bisnis meningkat.
                    Anggaran besar = produktivitas sektor meningkat.
                </div>
            </div>

            <div style="
                display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr));
                gap:0.75rem;
            ">
                ${sectorCards.join('')}
            </div>
        </div>
        `;
    }

    _renderNetEffect(p) {
        const importTax     = (p.importTax || 0) / 100;
        const exportSubsidy = (p.exportSubsidy || 0) / 100;
        const budget        = (p.sectorBudget || 0) / 100;
        const net = (importTax * 0.4) + (exportSubsidy * 0.3) + (budget * 0.5) - (importTax * 0.1);
        const pct = (net * 100).toFixed(1);
        const color = net >= 0 ? '#10b981' : '#ef4444';
        return `<span style="background:${color}22; color:${color}; padding:2px 8px; border-radius:20px;">
            ${net >= 0 ? '+' : ''}${pct}% Efek
        </span>`;
    }

    // ─────────────── TAB 3: DEKRET EKSEKUTIF ──────────────────────────────
    _renderDecreesTab(state) {
        const typeOptions = DECREE_TYPES.map(d =>
            `<option value="${d.id}">${d.icon} ${d.label}</option>`
        ).join('');

        const logHTML = (state.decrees || []).slice(0, 15).map(d => `
            <div style="
                display:flex; gap:0.75rem; align-items:flex-start;
                padding:0.75rem; background:rgba(255,255,255,0.02);
                border:1px solid rgba(255,255,255,0.05); border-radius:10px;
            ">
                <span style="font-size:1.35rem; flex-shrink:0; margin-top:2px;">${d.typeIcon}</span>
                <div style="flex:1; min-width:0;">
                    <div style="font-size:0.82rem; font-weight:800; color:white; margin-bottom:2px;">${d.title}</div>
                    ${d.description ? `<div style="font-size:0.7rem; color:rgba(255,255,255,0.5); line-height:1.4; margin-bottom:4px;">${d.description}</div>` : ''}
                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                        <span style="font-size:0.6rem; font-weight:700; color:#818cf8;">${d.typeLabel}</span>
                        <span style="font-size:0.6rem; color:rgba(255,255,255,0.3);">Intensitas: ${d.intensity}%</span>
                        <span style="font-size:0.6rem; color:rgba(255,255,255,0.3);">${d.date}</span>
                    </div>
                </div>
            </div>
        `).join('');

        return `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; align-items:start;">

            <!-- Form Dekret -->
            <div class="palace-card">
                <div style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:900; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:1rem;">
                    📜 TERBITKAN DEKRET BARU
                </div>

                <div style="display:flex; flex-direction:column; gap:0.875rem;">

                    <!-- Judul -->
                    <div>
                        <label class="pol-label">Judul Dekret / Peraturan Presiden</label>
                        <input type="text" id="decree-title" class="pol-input" placeholder="cth: Perpres No. 1 Tahun 2025 tentang...">
                    </div>

                    <!-- Jenis -->
                    <div>
                        <label class="pol-label">Jenis Dekret</label>
                        <select id="decree-type" class="pol-input">
                            ${typeOptions}
                        </select>
                    </div>

                    <!-- Intensitas -->
                    <div>
                        <label class="pol-label" style="display:flex; justify-content:space-between;">
                            <span>Intensitas Pengaruh</span>
                            <span id="decree-intensity-val" style="color:#818cf8; font-weight:900;">50%</span>
                        </label>
                        <input type="range" id="decree-intensity" min="1" max="100" value="50" style="
                            width:100%; height:6px; cursor:pointer; accent-color:#818cf8; margin-top:4px;
                        ">
                        <div style="display:flex; justify-content:space-between; font-size:0.6rem; color:rgba(255,255,255,0.3); margin-top:2px;">
                            <span>Lemah</span><span>Sedang</span><span>Kuat</span>
                        </div>
                    </div>

                    <!-- Deskripsi -->
                    <div>
                        <label class="pol-label">Deskripsi / Pertimbangan Hukum</label>
                        <textarea id="decree-desc" class="pol-input" rows="3" placeholder="Menimbang bahwa...&#10;Mengingat Undang-Undang..."></textarea>
                    </div>

                    <button id="btn-issue-decree" style="
                        width:100%; background:linear-gradient(135deg,#6366f1,#4f46e5);
                        border:none; border-radius:10px; padding:0.875rem; color:white;
                        font-size:0.9rem; font-weight:900; cursor:pointer; transition:all 0.2s;
                    ">📜 TERBITKAN DEKRET</button>
                </div>
            </div>

            <!-- Log Dekret -->
            <div>
                <div style="font-size:0.65rem; color:rgba(255,255,255,0.4); font-weight:900; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.875rem;">
                    📋 RIWAYAT DEKRET
                </div>
                <div style="display:flex; flex-direction:column; gap:0.5rem; max-height:480px; overflow-y:auto;">
                    ${logHTML || `<div style="text-align:center; color:rgba(255,255,255,0.3); padding:2rem;">Belum ada dekret.</div>`}
                </div>
            </div>
        </div>
        `;
    }

    // ─────────────── TAB 4: RUANG GELAP (KORUPSI) ─────────────────────────
    _renderCorruptTab(state) {
        const corruption = state.corruptionLevel;
        const corruptColor = corruption >= 70 ? '#ef4444' : corruption >= 40 ? '#f97316' : '#f59e0b';

        const logHTML = (state.corruptionLog || []).map(entry => `
            <div style="
                font-family:'Courier New', monospace; font-size:0.72rem;
                padding:0.4rem 0.6rem; color:#22c55e; background:rgba(0,0,0,0.4);
                border-left:2px solid #166534; border-radius:4px;
            ">${entry.label} — <span style="color:rgba(255,255,255,0.4);">${entry.date}</span></div>
        `).join('');

        return `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; align-items:start;">

            <!-- Corruption Panel -->
            <div style="
                background:rgba(0,0,0,0.5); border:1px solid rgba(239,68,68,0.25);
                border-radius:16px; padding:1.5rem;
            ">
                <div style="text-align:center; margin-bottom:1.25rem;">
                    <div style="font-size:2rem; margin-bottom:0.25rem;">🕵️</div>
                    <div style="font-size:0.65rem; color:rgba(239,68,68,0.7); font-weight:900; text-transform:uppercase; letter-spacing:0.1em;">
                        RUANG GELAP — OPERASI RAHASIA
                    </div>
                </div>

                <!-- Level Korupsi Indicator -->
                <div style="margin-bottom:1.25rem;">
                    <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:rgba(255,255,255,0.5); margin-bottom:0.4rem;">
                        <span>Level Korupsi</span>
                        <span style="color:${corruptColor}; font-weight:900;">${corruption.toFixed(0)}%</span>
                    </div>
                    <div style="height:10px; background:rgba(255,255,255,0.05); border-radius:5px; overflow:hidden;">
                        <div style="height:100%; width:${corruption}%; background:linear-gradient(90deg, #f59e0b, ${corruptColor}); border-radius:5px; transition:width 0.4s;"></div>
                    </div>
                    <div style="font-size:0.65rem; color:rgba(255,255,255,0.3); margin-top:4px; text-align:right;">
                        ${corruption >= 70 ? '⚠️ RISIKO TINGGI — Kemungkinan Skandal!' : corruption >= 40 ? '⚡ Waspadai investigasi' : '✅ Aman sementara'}
                    </div>
                </div>

                <!-- Jumlah Korupsi Slider -->
                <div style="margin-bottom:1.25rem;">
                    <label class="pol-label" style="display:flex; justify-content:space-between;">
                        <span>Jumlah Dana yang Diambil</span>
                        <span id="corrupt-amount-display" style="color:#ef4444; font-weight:900;">$1,000</span>
                    </label>

                    <!-- Horizontal slider for amount (log scale) -->
                    <input type="range" id="corrupt-amount-slider" min="0" max="12" step="0.1" value="3" style="
                        width:100%; height:8px; cursor:pointer; accent-color:#ef4444; margin: 0.5rem 0;
                    ">
                    <div style="display:flex; justify-content:space-between; font-size:0.6rem; color:rgba(255,255,255,0.3);">
                        <span>$1K</span><span>$1M</span><span>$1T</span>
                    </div>
                </div>

                <!-- Preview Penalty -->
                <div id="corrupt-preview" style="
                    background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.2);
                    border-radius:10px; padding:0.75rem; margin-bottom:1rem; text-align:center;
                ">
                    <div style="font-size:0.7rem; color:rgba(255,255,255,0.5); margin-bottom:0.25rem;">Preview Dampak</div>
                    <div id="corrupt-preview-text" style="font-size:0.8rem; color:#fca5a5; font-weight:800;">
                        Approval -~3.2% | Korupsi +~4.0%
                    </div>
                </div>

                <button id="btn-commit-corruption" style="
                    width:100%; background:linear-gradient(135deg, #7f1d1d, #991b1b);
                    border:1px solid rgba(239,68,68,0.4); border-radius:10px;
                    padding:0.875rem; color:white; font-size:0.9rem; font-weight:900;
                    cursor:pointer; transition:all 0.2s; letter-spacing:0.05em;
                ">
                    💰 AMBIL DANA RAHASIA
                </button>
                <div style="font-size:0.6rem; color:rgba(255,255,255,0.2); text-align:center; margin-top:0.5rem;">
                    Semua transaksi dienkripsi. Tidak ada jejak.
                </div>
            </div>

            <!-- Log Terminal -->
            <div>
                <div style="
                    background:#020c00; border:1px solid #166834; border-radius:12px;
                    padding:1rem; font-family:'Courier New',monospace;
                ">
                    <div style="font-size:0.65rem; color:#22c55e; font-weight:800; margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem;">
                        <span style="width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;animation:pulse 2s infinite;"></span>
                        SECURE TERMINAL v2.7 — ENCRYPTED
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.35rem; max-height:380px; overflow-y:auto;">
                        ${logHTML || `<div style="color:#166834; font-size:0.72rem;">// No transactions recorded.</div>`}
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    // ─────────────── STYLES ────────────────────────────────────────────────
    _getPalaceStyles() {
        return `
        <style>
            .palace-card {
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 14px;
                padding: 1rem;
            }
            .sector-policy-card {
                border-radius: 12px;
                padding: 0.875rem 0.75rem;
            }
            .palace-tab.active { font-weight: 900; }

            /* Vertical Slider */
            .v-slider-wrap {
                height: 100px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .v-slider {
                -webkit-appearance: slider-vertical;
                appearance: slider-vertical;
                writing-mode: vertical-lr;
                direction: rtl;
                width: 22px;
                height: 100px;
                cursor: pointer;
                accent-color: var(--slider-color, #818cf8);
                outline: none;
            }
            /* Firefox vertical */
            @-moz-document url-prefix() {
                .v-slider {
                    writing-mode: vertical-lr;
                }
            }
            .slider-val {
                font-size: 0.65rem;
                font-weight: 900;
                min-width: 28px;
                text-align: center;
            }

            /* Inputs */
            .pol-label {
                display: block;
                font-size: 0.72rem;
                font-weight: 700;
                color: rgba(255,255,255,0.6);
                margin-bottom: 0.35rem;
            }
            .pol-input {
                width: 100%;
                background: rgba(0,0,0,0.3);
                border: 1.5px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 0.6rem 0.75rem;
                color: white;
                font-size: 0.85rem;
                font-weight: 600;
                outline: none;
                transition: border-color 0.2s;
                font-family: inherit;
                box-sizing: border-box;
            }
            .pol-input:focus { border-color: rgba(99,102,241,0.6); }
            textarea.pol-input { resize: vertical; min-height: 70px; line-height: 1.5; }
            select.pol-input option { background: #1e1e2e; }

            #btn-issue-decree:hover { opacity: 0.9; transform: translateY(-1px); }
            #btn-commit-corruption:hover { opacity: 0.9; }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }
        </style>
        `;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // EVENT BINDING
    // ═══════════════════════════════════════════════════════════════════════
    _bindEvents() {
        const root = document.getElementById('politics-root');
        if (!root) return;

        const state = politicsManager.getState();

        // --- Registration ---
        if (!state.isPresident && !state.candidateName) {
            this._bindRegistration(root);
        }
        // --- Campaign Lobby ---
        else if (!state.isPresident && state.candidateName) {
            this._bindCampaign(root, state);
        }
        // --- Palace ---
        else {
            this._bindPalace(root);
        }
    }

    _bindRegistration(root) {
        // Party selection
        root.querySelectorAll('.party-option').forEach(opt => {
            opt.addEventListener('click', () => {
                root.querySelectorAll('.party-option').forEach(o => {
                    o.classList.remove('selected');
                    o.style.removeProperty('--party-color');
                });
                opt.classList.add('selected');
                const party = POLITICAL_PARTIES.find(p => p.id === opt.dataset.party);
                if (party) opt.style.setProperty('--party-color', party.color);
                opt.querySelector('input[type=radio]').checked = true;
            });
        });

        // Submit registration
        root.querySelector('#btn-register-candidate')?.addEventListener('click', () => {
            const name = root.querySelector('#pol-candidate-name')?.value?.trim();
            const partyEl = root.querySelector('input[name=party-select]:checked');
            if (!name) { ui.error('Masukkan nama kandidat!'); return; }
            if (!partyEl) { ui.error('Pilih partai politik terlebih dahulu!'); return; }
            try {
                politicsManager.registerCandidate(name, partyEl.value);
                ui.success(`${name} resmi terdaftar sebagai kandidat presiden!`, '🗳️ Kandidat Terdaftar');
                this.render();
            } catch (e) {
                ui.error(e.message);
            }
        });
    }

    _bindCampaign(root, state) {
        // Buy campaign packages
        root.querySelectorAll('.btn-buy-campaign').forEach(btn => {
            btn.addEventListener('click', async () => {
                const pkgId = btn.dataset.pkg;
                const pkg = CAMPAIGN_PACKAGES.find(p => p.id === pkgId);
                const confirmed = await ui.confirm({
                    title: `Beli ${pkg.label}?`,
                    message: `Biaya kampanye: <strong>$${this._fmt(pkg.cost)}</strong><br>Estimasi kenaikan suara: <strong>+${pkg.supportBoost}%</strong>`,
                    icon: pkg.icon,
                    confirmText: 'Beli Sekarang',
                    confirmClass: 'btn-primary'
                });
                if (confirmed) {
                    try {
                        const result = politicsManager.buyCampaign(pkgId);
                        ui.success(`Suara naik ke ${result.newSupport}%!`, `${pkg.icon} Kampanye Berhasil`);
                        this.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Run election
        root.querySelector('#btn-run-election')?.addEventListener('click', async () => {
            const support = politicsManager.getState().supportPercent;
            const confirmed = await ui.confirm({
                title: 'Mulai Pemilihan Umum?',
                message: `Dukungan suara Anda saat ini: <strong>${support.toFixed(1)}%</strong><br><br>Hasil pemilu bersifat final. Pastikan kampanye sudah maksimal!`,
                icon: '🗳️',
                confirmText: 'Ya, Mulai Pemilu!',
                confirmClass: 'btn-primary'
            });
            if (confirmed) {
                const result = politicsManager.runElection();
                if (result.won) {
                    await ui.confirm({
                        title: '🎉 MENANG! Anda Terpilih Sebagai Presiden!',
                        message: `
                            <div style="text-align:center; padding:1rem 0;">
                                <div style="font-size:3rem; margin-bottom:0.5rem;">🇮🇩</div>
                                <div style="font-size:1.1rem; font-weight:800; color:#10b981; margin-bottom:0.75rem;">PEMILU SELESAI — ANDA MENANG!</div>
                                <div style="display:flex; justify-content:center; gap:2rem; font-size:1rem; font-weight:900;">
                                    <div><div style="color:#10b981; font-size:1.5rem;">${result.playerVotes}%</div><div style="font-size:0.7rem; color:rgba(255,255,255,0.5);">Suara Anda</div></div>
                                    <div><div style="color:#ef4444; font-size:1.5rem;">${result.opponentVotes}%</div><div style="font-size:0.7rem; color:rgba(255,255,255,0.5);">Suara Lawan</div></div>
                                </div>
                            </div>
                        `,
                        icon: '🏆',
                        confirmText: 'Masuk Istana Presiden',
                        confirmClass: 'btn-success'
                    });
                    import('../../ui/AuraSound.js').then(m => m.default.playCasinoWin());
                    this.activeTab = 'dashboard';
                    this.render();
                } else {
                    await ui.confirm({
                        title: '❌ Pemilu Kalah',
                        message: `
                            <div style="text-align:center; padding:1rem 0;">
                                <div style="font-size:3rem; margin-bottom:0.5rem;">😞</div>
                                <div style="font-size:1rem; font-weight:800; color:#ef4444; margin-bottom:0.75rem;">Anda Kalah Dalam Pemilihan Umum</div>
                                <div style="display:flex; justify-content:center; gap:2rem; font-size:1rem; font-weight:900;">
                                    <div><div style="color:#10b981; font-size:1.5rem;">${result.playerVotes}%</div><div style="font-size:0.7rem; color:rgba(255,255,255,0.5);">Suara Anda</div></div>
                                    <div><div style="color:#ef4444; font-size:1.5rem;">${result.opponentVotes}%</div><div style="font-size:0.7rem; color:rgba(255,255,255,0.5);">Suara Lawan</div></div>
                                </div>
                                <div style="margin-top:1rem; font-size:0.8rem; color:rgba(255,255,255,0.5);">Tingkatkan kampanye dan coba lagi!</div>
                            </div>
                        `,
                        icon: '🗳️',
                        confirmText: 'Coba Lagi',
                        confirmClass: 'btn-warning'
                    });
                    import('../../ui/AuraSound.js').then(m => m.default.playCasinoLose());
                    this.render();
                }
            }
        });

        // Cancel candidacy
        root.querySelector('#btn-cancel-candidacy')?.addEventListener('click', async () => {
            const confirmed = await ui.confirm({
                title: 'Batalkan Pencalonan?',
                message: 'Dukungan suara yang sudah dikumpulkan akan hilang.',
                icon: '❌',
                confirmText: 'Ya, Batalkan',
                confirmClass: 'btn-danger'
            });
            if (confirmed) {
                const s = politicsManager.getState();
                s.candidateName = '';
                s.partyId = null;
                s.supportPercent = 0;
                gameState.set('politics', s);
                this.render();
            }
        });
    }

    _bindPalace(root) {
        // Tab switching
        root.querySelectorAll('.palace-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeTab = btn.dataset.tab;
                import('../../ui/AuraSound.js').then(m => m.default.playClick());
                // Re-render tab content only
                const content = document.getElementById('palace-tab-content');
                if (!content) { this.render(); return; }
                const state = politicsManager.getState();
                if (this.activeTab === 'dashboard') content.innerHTML = this._renderDashboardTab(state);
                else if (this.activeTab === 'policy')    content.innerHTML = this._renderPolicyTab(state);
                else if (this.activeTab === 'decrees')   content.innerHTML = this._renderDecreesTab(state);
                else if (this.activeTab === 'corrupt')   content.innerHTML = this._renderCorruptTab(state);

                // Update active tab styles
                root.querySelectorAll('.palace-tab').forEach(b => {
                    const isActive = b.dataset.tab === this.activeTab;
                    b.style.background = isActive ? 'rgba(220,38,38,0.2)' : 'transparent';
                    b.style.color      = isActive ? '#fca5a5' : 'rgba(255,255,255,0.5)';
                    b.style.border     = isActive ? '1px solid rgba(220,38,38,0.35)' : '1px solid transparent';
                });

                this._bindPalaceTabEvents();
            });
        });

        this._bindPalaceTabEvents();
    }

    _bindPalaceTabEvents() {
        const root = document.getElementById('politics-root');
        if (!root) return;
        const content = document.getElementById('palace-tab-content');
        if (!content) return;

        // --- POLICY SLIDERS ---
        content.querySelectorAll('.policy-slider').forEach(slider => {
            slider.addEventListener('input', () => {
                const sector = slider.dataset.sector;
                const policy = slider.dataset.policy;
                const value  = parseFloat(slider.value);

                // Update displayed value
                const valEl = content.querySelector(`.slider-val[data-sector="${sector}"][data-policy="${policy}"]`);
                if (valEl) valEl.textContent = policy === 'sectorBudget' ? value : `${value}%`;

                // Save to manager
                politicsManager.setPolicy(sector, policy, value);

                // Update net effect badge
                const netEl = content.querySelector(`#net-effect-${sector}`);
                if (netEl) {
                    const state = politicsManager.getState();
                    netEl.innerHTML = this._renderNetEffect(state.policies[sector] || {});
                }
            });
        });

        // --- DECREE ---
        const decreeIntensitySlider = content.querySelector('#decree-intensity');
        const decreeIntensityVal    = content.querySelector('#decree-intensity-val');
        if (decreeIntensitySlider && decreeIntensityVal) {
            decreeIntensitySlider.addEventListener('input', () => {
                decreeIntensityVal.textContent = `${decreeIntensitySlider.value}%`;
            });
        }

        content.querySelector('#btn-issue-decree')?.addEventListener('click', async () => {
            const title    = content.querySelector('#decree-title')?.value;
            const type     = content.querySelector('#decree-type')?.value;
            const intensity = parseInt(content.querySelector('#decree-intensity')?.value || '50', 10);
            const desc     = content.querySelector('#decree-desc')?.value;

            try {
                const result = politicsManager.issueDecree({ title, type, intensity, description: desc });
                const impact = result.approvalImpact;
                ui.success(
                    `Dekret "${title}" berhasil diterbitkan. Approval ${impact >= 0 ? '+' : ''}${impact.toFixed(1)}%`,
                    '📜 Dekret Diterbitkan'
                );
                import('../../ui/AuraSound.js').then(m => m.default.playClaimMoney());
                // Refresh tab
                const state = politicsManager.getState();
                content.innerHTML = this._renderDecreesTab(state);
                this._bindPalaceTabEvents();
            } catch (e) {
                ui.error(e.message);
            }
        });

        // --- CORRUPTION SLIDER ---
        const corruptSlider = content.querySelector('#corrupt-amount-slider');
        const corruptDisplay = content.querySelector('#corrupt-amount-display');
        const corruptPreview = content.querySelector('#corrupt-preview-text');

        const getCorruptAmt = () => {
            if (!corruptSlider) return 1000;
            return Math.round(Math.pow(10, parseFloat(corruptSlider.value)));
        };

        const updateCorruptPreview = () => {
            const amt = getCorruptAmt();
            if (corruptDisplay) corruptDisplay.textContent = `$${this._fmt(amt)}`;
            if (corruptPreview) {
                const ci = Math.min(50, Math.log10(amt + 1) * 4);
                const ap = ci * 0.8;
                corruptPreview.textContent = `Approval -${ap.toFixed(1)}% | Korupsi +${ci.toFixed(1)}%`;
            }
        };

        corruptSlider?.addEventListener('input', updateCorruptPreview);
        updateCorruptPreview();

        content.querySelector('#btn-commit-corruption')?.addEventListener('click', async () => {
            const amt = getCorruptAmt();
            const confirmed = await ui.confirm({
                title: '⚠️ Konfirmasi Tindakan Korupsi',
                message: `Ambil <strong>$${this._fmt(amt)}</strong> dari kas negara?<br><br>Tindakan ini akan mengurangi approval rating dan meningkatkan level korupsi Anda.`,
                icon: '🕵️',
                confirmText: 'Ambil Dana',
                confirmClass: 'btn-danger'
            });
            if (confirmed) {
                try {
                    const result = politicsManager.commitCorruption(amt);
                    ui.warning(`Dana $${this._fmt(amt)} berhasil diambil. Approval -${result.approvalPenalty}%`, '💰 Transaksi Selesai');
                    const state = politicsManager.getState();
                    content.innerHTML = this._renderCorruptTab(state);
                    this._bindPalaceTabEvents();
                } catch (e) {
                    ui.error(e.message);
                }
            }
        });
    }

    // ── Helper ──────────────────────────────────────────────────────────────
    _fmt(num) {
        return financeManager.formatCurrency(num);
    }
}

export default new PoliticsPanel();
