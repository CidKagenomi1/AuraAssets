/**
 * CareerPanel.js - Dedicated Career Path & Rank Center
 * Allows selecting paths, viewing status, buying instant promotions, and resigning.
 */

import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import workTaskManager from '../../core/databases/WorkTaskManager.js';
import ui from '../../ui/UIManager.js';
import politicsManager from '../../core/PoliticsManager.js';

class CareerPanel {
    show() {
        this.render();
    }

    render() {
        const state = workTaskManager.getWorkState();
        
        let content = `
            <div class="hybrid-page-container" id="career-panel-container" style="padding: 1.5rem; max-width: 900px; margin: 0 auto; width: 100%;">
        `;

        if (!state.careerPath) {
            content += this._renderPathSelection();
        } else {
            content += this._renderDashboard(state);
        }

        content += `</div>`;

        import('../../ui/ViewManager.js').then(m => {
            const viewManager = m.default;
            viewManager.showDynamicView('🏛️ Jenjang Karir', 'Kelola masa depan profesional dan jabatanmu', content);
            this.bindEvents();
        });
    }

    _renderPathSelection() {
        return `
            <div style="text-align: center; padding: 2rem 0;">
                <span style="font-size: 4rem;">🎯</span>
                <h3 style="font-size: 1.75rem; font-weight: 800; margin: 1rem 0; color: white;">Choose Your Career Path</h3>
                <p style="color: var(--text-muted); max-width: 500px; margin: 0 auto 2.5rem auto; line-height: 1.5;">
                    Select the professional line you wish to pursue. Each track contains unique titles, distinct salary brackets, and progression tracks.
                </p>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 2rem; max-width: 700px; margin: 0 auto;">
                    <!-- Corporate Path -->
                    <div class="card hover-scale select-path-btn" data-path="corporate" style="background: rgba(59, 130, 246, 0.05); border: 2px solid var(--border-color); cursor: pointer; transition: all 0.3s; padding: 2rem; border-radius: var(--radius-lg); text-align: center;">
                        <span style="font-size: 3.5rem;">🏢</span>
                        <h4 style="font-size: 1.25rem; font-weight: 800; margin: 1rem 0 0.5rem 0; color: #60a5fa;">Corporate Path</h4>
                        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">
                            Climb the corporate ladder from Intern up to CEO and Conglomerate Owner. Higher top-tier salaries.
                        </p>
                    </div>

                    <!-- Government Path -->
                    <div class="card hover-scale select-path-btn" data-path="government" style="background: rgba(16, 185, 129, 0.05); border: 2px solid var(--border-color); cursor: pointer; transition: all 0.3s; padding: 2rem; border-radius: var(--radius-lg); text-align: center;">
                        <span style="font-size: 3.5rem;">🏛️</span>
                        <h4 style="font-size: 1.25rem; font-weight: 800; margin: 1rem 0 0.5rem 0; color: #34d399;">Government Path</h4>
                        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">
                            Serve the public sector, advancing to Director General and Cabinet Minister. Slightly lower costs for promotions.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    _renderDashboard(state) {
        const lvlData = workTaskManager.getCareerLevelData();
        const nextLvlData = workTaskManager.getNextLevelData();
        const xpProg = workTaskManager.getXPProgress();
        const pathText = state.careerPath === 'corporate' ? '🏢 Corporate Line' : '🏛️ Government Line';

        return `
            <!-- Career Status Card -->
            <div class="card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), transparent); margin-bottom: 1.5rem; border-left: 4px solid #3b82f6; padding: 1.5rem; border-radius: var(--radius-lg);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--accent-primary); text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">${pathText}</div>
                        <h2 style="font-size: 1.75rem; font-weight: 900; color: white; margin: 5px 0 0 0;">
                            ${lvlData.icon} ${lvlData.title}
                        </h2>
                    </div>
                    <div style="text-align: right;">
                        <span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; font-weight: 800; font-size: 0.9rem; padding: 6px 12px; border-radius: 8px;">
                            Level ${lvlData.level}
                        </span>
                    </div>
                </div>
                
                <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; font-size: 0.85rem;">
                    <span style="color: var(--text-muted);">Career XP Progress</span>
                    <span style="color: white; font-weight: 700;">${xpProg.xpInLevel} / ${xpProg.xpToNext === null ? 'MAX' : xpProg.xpToNext} XP</span>
                </div>
                <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; overflow: hidden; margin-bottom: 1.5rem;">
                    <div style="height: 100%; width: ${xpProg.percent}%; background: #3b82f6; transition: width 0.5s;"></div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: var(--radius-md);">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Gaji Bulanan</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #bef264; margin-top: 5px;">
                            $ ${financeManager.formatCurrency(lvlData.baseSalaryBonus)}
                        </div>
                    </div>
                    <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: var(--radius-md);">
                        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Max Tugas Harian</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #a78bfa; margin-top: 5px;">
                            ${lvlData.dailyTaskSlots} Tugas / hari
                        </div>
                    </div>
                </div>
            </div>

            <!-- Instant Promotion Upgrade Box -->
            ${nextLvlData ? `
                <div class="card" style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); padding: 1.5rem; border-radius: var(--radius-lg); display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <div>
                        <h4 style="margin:0 0 0.25rem 0; color: #f59e0b; font-size: 1.05rem; font-weight: 800;">⚡ Instant Promotion</h4>
                        <p style="margin:0; font-size: 0.8rem; color: var(--text-muted);">
                            Lompat jabatan langsung ke <strong>${nextLvlData.icon} ${nextLvlData.title}</strong>
                        </p>
                    </div>
                    <button class="btn btn-warning" id="btn-promo-buy" style="font-weight: 800; font-size: 0.9rem; padding: 12px 24px; border-radius: 8px;">
                        Bayar $ ${financeManager.formatCurrency(lvlData.promoCost)}
                    </button>
                </div>
            ` : `
                <div class="card" style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); padding: 1.5rem; border-radius: var(--radius-lg); text-align: center; margin-bottom: 2rem;">
                    <span style="font-size: 2rem;">🏆</span>
                    <h4 style="margin: 0.5rem 0 0 0; color: var(--accent-primary); font-weight: 800;">Jabatan Maksimal Tercapai!</h4>
                    <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--text-muted);">Anda memegang kekuasaan/pangkat tertinggi dalam jalur karir ini.</p>
                </div>
            `}

            <!-- Danger / Reset Area -->
            <div class="card" style="background: rgba(239, 68, 68, 0.02); border: 1px solid rgba(239, 68, 68, 0.1); padding: 1.25rem; border-radius: var(--radius-lg); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h5 style="margin:0 0 0.2rem 0; color: #ef4444; font-size: 0.85rem; font-weight: 700;">Resign dari Karir</h5>
                    <p style="margin:0; font-size: 0.75rem; color: var(--text-muted);">Mengundurkan diri akan me-reset jabatan Anda kembali menjadi Pengangguran.</p>
                </div>
                <button class="btn btn-danger" id="btn-resign-career" style="font-size: 0.8rem; padding: 8px 16px;">
                    🚪 Resign
                </button>
            </div>

            ${this._renderPresidentialSection(state)}
        `;
    }

    bindEvents() {
        const container = document.getElementById('career-panel-container');
        if (!container) return;

        // Path selection
        container.querySelectorAll('.select-path-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const path = btn.dataset.path;
                try {
                    workTaskManager.selectPath(path);
                    ui.success(`Jalur karir ${path === 'corporate' ? 'Corporate' : 'Government'} berhasil dipilih!`, '🎯 Karir Dimulai');
                    this.render(); // Redraw
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });

        // Instant promotion buy button
        const promoBtn = document.getElementById('btn-promo-buy');
        if (promoBtn) {
            promoBtn.addEventListener('click', async () => {
                const current = workTaskManager.getCareerLevelData();
                const cost = current.promoCost;
                const confirmed = await ui.confirm({
                    title: 'Beli Jabatan Instan?',
                    message: `Apakah Anda yakin ingin membayar sebesar $ ${financeManager.formatCurrency(cost)} untuk naik jabatan secara instan?`,
                    icon: '⚡',
                    confirmText: 'Ya, Naik Jabatan!',
                    confirmClass: 'btn-warning'
                });

                if (confirmed) {
                    try {
                        workTaskManager.buyInstantPromotion();
                        this.render(); // Redraw status
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }

        // Resign button
        const resignBtn = document.getElementById('btn-resign-career');
        if (resignBtn) {
            resignBtn.addEventListener('click', async () => {
                const confirmed = await ui.confirm({
                    title: 'Resign dari Karir?',
                    message: 'Apakah Anda yakin ingin mengundurkan diri? Anda akan kehilangan semua level karir saat ini.',
                    icon: '🚪',
                    confirmText: 'Ya, Resign',
                    confirmClass: 'btn-danger'
                });

                if (confirmed) {
                    workTaskManager.resign();
                    ui.info('Anda sekarang menjadi Pengangguran.', '👋 Resign');
                    this.render(); // Redraw
                }
            });
        }

        // Presidential buttons
        const btnOpenPolitics = document.getElementById('btn-open-politics');
        if (btnOpenPolitics) {
            btnOpenPolitics.addEventListener('click', () => {
                import('./PoliticsPanel.js').then(m => m.default.show());
            });
        }
    }

    _renderPresidentialSection(state) {
        const isGovMax = state.careerPath === 'government' && state.careerLevel >= 8;
        const polState = politicsManager.getState();
        const isPresident = polState.isPresident;

        // Only show for government max-level or current presidents
        if (!isGovMax && !isPresident) return '';

        if (isPresident) {
            return `
                <div class="card" style="
                    background: linear-gradient(135deg, rgba(220,38,38,0.12), rgba(251,191,36,0.06));
                    border: 1px solid rgba(220,38,38,0.3);
                    border-radius: var(--radius-lg);
                    padding: 1.25rem;
                    margin-top: 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                ">
                    <div style="display:flex; align-items:center; gap:0.875rem;">
                        <span style="font-size:2rem;">🇮🇩</span>
                        <div>
                            <div style="font-size:0.65rem; color:rgba(220,38,38,0.8); font-weight:900; text-transform:uppercase; letter-spacing:0.1em;">JABATAN AKTIF</div>
                            <div style="font-size:1rem; font-weight:900; color:white;">Presiden Republik</div>
                            <div style="font-size:0.72rem; color:#fbbf24; font-weight:700;">
                                ${polState.candidateName} · Approval ${polState.approvalRating.toFixed(0)}%
                            </div>
                        </div>
                    </div>
                    <button id="btn-open-politics" style="
                        background: linear-gradient(135deg,#dc2626,#b91c1c);
                        border:none; border-radius:10px; padding:0.75rem 1.25rem;
                        color:white; font-size:0.85rem; font-weight:900;
                        cursor:pointer; white-space:nowrap;
                        box-shadow:0 4px 12px rgba(220,38,38,0.3);
                    ">🏛️ Istana Presiden</button>
                </div>
            `;
        }

        return `
            <div class="card" style="
                background: linear-gradient(135deg, rgba(220,38,38,0.08), transparent);
                border: 1px dashed rgba(220,38,38,0.35);
                border-radius: var(--radius-lg);
                padding: 1.5rem;
                margin-top: 1.5rem;
                text-align: center;
            ">
                <div style="font-size:2.5rem; margin-bottom:0.5rem;">🗳️</div>
                <h4 style="font-size:1.1rem; font-weight:900; color:white; margin:0 0 0.5rem 0;">
                    Jalur Politik Terbuka!
                </h4>
                <p style="font-size:0.8rem; color:rgba(255,255,255,0.5); margin:0 0 1.25rem 0; line-height:1.5; max-width:440px; margin-left:auto; margin-right:auto;">
                    Sebagai <strong style="color:#fbbf24;">Cabinet Minister</strong>, Anda memenuhi syarat untuk mencalonkan diri sebagai
                    Presiden Republik. Kampanye, raih suara, dan pimpin bangsa!
                </p>
                <button id="btn-open-politics" style="
                    background: linear-gradient(135deg,#dc2626,#b91c1c);
                    border:none; border-radius:10px; padding:0.875rem 2rem;
                    color:white; font-size:0.95rem; font-weight:900;
                    cursor:pointer; letter-spacing:0.05em;
                    box-shadow:0 4px 14px rgba(220,38,38,0.35);
                    transition:all 0.2s;
                ">🏛️ Daftar Calon Presiden</button>
            </div>
        `;
    }
}

export default new CareerPanel();
