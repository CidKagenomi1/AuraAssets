/**
 * BoardPanel.js - High-Fidelity Investor Relations & Board of Directors Panel
 * Features real-time governance, director lobbying, and RUPS shareholder voting proposals.
 */

import gameState from '../../game/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import businessManager from '../../business/BusinessManager.js';
import ui from '../UIManager.js';

export const BoardPanel = {
    render(biz) {
        if (!biz.ipo || !biz.ipo.active) {
            return `
                <div style="text-align: center; padding: 4rem 2rem; color: var(--text-dim);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🤝</div>
                    <h3 style="color:#fff; font-weight:800;">Fitur Terkunci (Grup Privat)</h3>
                    <p style="font-size:0.85rem; max-width:500px; margin:0.5rem auto; line-height:1.4;">
                        Divisi Hubungan Investor & Dewan Direksi hanya aktif jika perusahaan Anda sudah resmi melantai di bursa saham (IPO). Go Public terlebih dahulu!
                    </p>
                </div>
            `;
        }

        const board = biz.ipo.board || [];
        const percent = biz.ipo.publicSharePercent || 25;
        const playerSharesPercent = 100 - percent - 15 - 12 - 10; // Nusantara: 15%, Artha: 12%, Global: 10%

        // Render Board Members Grid
        let boardHtml = '';
        board.forEach(m => {
            const avatar = m.id === 'board_nusantara' ? '👴' : m.id === 'board_artha' ? '👩' : '👨';
            const prefLabel = m.preference === 'dividend' ? '💸 Dividen Tinggi' : m.preference === 'growth' ? '🚀 Pertumbuhan Aset' : '🛡️ Kepatuhan & Audit';
            
            const relColor = m.relationship >= 60 ? '#10b981' : m.relationship <= 40 ? '#ef4444' : '#fbbf24';
            const relStatus = m.relationship >= 60 ? '🟢 Mendukung Anda' : m.relationship <= 40 ? '🔴 Tidak Percaya' : '🟡 Netral';

            boardHtml += `
                <div class="card" style="padding: 1.25rem; background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); border-radius: 12px; display:flex; flex-direction:column; justify-content:space-between; gap:1rem;">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:start;">
                            <div style="display:flex; align-items:center; gap:0.75rem;">
                                <div style="font-size:2.5rem; background:rgba(255,255,255,0.03); width:50px; height:50px; display:flex; align-items:center; justify-content:center; border-radius:50%; border:1px solid var(--border-color);">${avatar}</div>
                                <div>
                                    <h4 style="margin:0; font-size:1rem; font-weight:850; color:#fff;">${m.name}</h4>
                                    <span style="font-size:0.7rem; color:var(--text-muted); font-weight:700;">${m.title}</span>
                                </div>
                            </div>
                            <span style="background:rgba(59, 130, 246, 0.1); color:#60a5fa; font-size:0.65rem; font-weight:850; padding:4px 8px; border-radius:4px;">🔑 ${m.sharesPercent}% Saham</span>
                        </div>

                        <div style="margin-top:1rem; display:flex; flex-direction:column; gap:0.4rem; font-size:0.75rem;">
                            <div style="display:flex; justify-content:space-between;">
                                <span style="color:var(--text-muted);">Preferensi</span>
                                <span style="font-weight:700; color:#fbbf24;">${prefLabel}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between;">
                                <span style="color:var(--text-muted);">Status Hubungan</span>
                                <span style="font-weight:850; color:${relColor};">${relStatus} (${m.relationship}%)</span>
                            </div>
                        </div>

                        <!-- Relation bar -->
                        <div style="width:100%; height:6px; background:rgba(255,255,255,0.05); border-radius:10px; margin-top:8px; overflow:hidden; border: 1px solid var(--border-color);">
                            <div style="width:${m.relationship}%; height:100%; background:${relColor}; border-radius:10px; transition: width 0.4s ease;"></div>
                        </div>
                    </div>

                    <!-- Lobby Actions -->
                    <div style="display:grid; grid-template-columns: 1fr; gap:0.4rem; background:rgba(0,0,0,0.15); padding:8px; border-radius:8px;">
                        <button class="btn btn-secondary btn-sm btn-lobby" data-id="${m.id}" data-source="personal" style="padding:6px; font-size:0.68rem; font-weight:800; text-align:center;">
                            🤝 Makan Malam Eksklusif ($8,000 Pribadi)
                        </button>
                        <button class="btn btn-secondary btn-sm btn-lobby" data-id="${m.id}" data-source="treasury" style="padding:6px; font-size:0.68rem; font-weight:800; text-align:center;">
                            🛥️ Sewa Yacht Perusahaan ($15,000 Kas)
                        </button>
                    </div>
                </div>
            `;
        });

        return `
            <div class="board-workspace-tab" style="animation: fadeIn 0.3s ease-out;">
                <!-- Top Warning Header if relationship is very low -->
                <div style="display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="card" style="border-left: 4px solid var(--accent-primary); padding: 1.25rem; background: rgba(255,255,255,0.01); display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 800;">Hak Suara Direktur Utama (Founder)</div>
                            <div style="font-size: 1.85rem; font-weight: 900; color: #fff;">${playerSharesPercent.toFixed(1)}% Saham Pengendali</div>
                            <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Sisa saham: ${percent}% Publik, 37% Dewan Direksi Big Value</div>
                        </div>
                        <div style="text-align:right;">
                            <span style="font-size:0.75rem; background:rgba(16, 185, 129, 0.1); border:1px solid rgba(16,185,129,0.3); color:#10b981; font-weight:900; padding:6px 14px; border-radius:20px;">🛡️ CEO SECURE</span>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 2rem;">
                    <!-- LEFT COLUMN: BOARD MEMBERS RELATIONSHIP -->
                    <div>
                        <h3 style="margin:0 0 0.5rem 0; font-size:1.25rem; font-weight:900; display:flex; align-items:center; gap:0.5rem; color:#fff;">
                            <span>🤝</span> Board of Directors (Dewan Direksi)
                        </h3>
                        <p class="text-muted" style="font-size:0.8rem; line-height:1.45; margin-bottom:1.5rem;">
                            Jaga relasi dengan para investor institusional pemegang saham pengendali di bawah ini. Jika rata-rata hubungan berada di zona kritis (&lt; 25%), ada peluang dewan direksi mengajukan Mosi Tidak Percaya dalam Rapat Umum Pemegang Saham (RUPS) untuk MEMECAT Anda dari posisi CEO!
                        </p>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.25rem;">
                            ${boardHtml}
                        </div>
                    </div>

                    <!-- RIGHT COLUMN: RUPS VOTING CONTROL -->
                    <div style="display:flex; flex-direction:column; gap:1.5rem;">
                        <!-- Shareholder meeting -->
                        <div class="card" style="padding:1.5rem; border:1px solid var(--border-color); background:rgba(255,255,255,0.015);">
                            <h3 style="margin:0 0 0.5rem 0; font-size:1.1rem; font-weight:900; display:flex; align-items:center; gap:0.5rem; color:#fbbf24;">
                                <span>⚖️</span> Rapat Umum Pemegang Saham (RUPS)
                            </h3>
                            <p class="text-muted" style="font-size:0.78rem; line-height:1.4; margin-bottom:1.25rem;">
                                Ajukan proposal kebijakan perusahaan kepada dewan direksi. Anda butuh minimal <strong>50.1% Total Suara Setuju</strong> untuk meloloskan proposal.
                            </p>

                            <div style="display:flex; flex-direction:column; gap:0.75rem; margin-bottom:1.5rem;">
                                <!-- Proposal 1 -->
                                <div style="background:rgba(0,0,0,0.25); border:1px solid var(--border-color); padding:12px; border-radius:8px;">
                                    <strong style="font-size:0.85rem; color:#fff; display:block; margin-bottom:2px;">🎁 Proposal Bonus Retensi CEO</strong>
                                    <span style="font-size:0.7rem; color:var(--text-dim); display:block; margin-bottom:8px;">Tarik dana tunai senilai $30,000 dari treasury perusahaan langsung ke rekening pribadi Anda sebagai bonus khusus.</span>
                                    <button class="btn btn-primary btn-sm btn-call-rups" data-type="retention" style="width:100%; font-weight:800; font-size:0.72rem; padding:8px;">Ajukan Voting Proposal</button>
                                </div>
                                <!-- Proposal 2 -->
                                <div style="background:rgba(0,0,0,0.25); border:1px solid var(--border-color); padding:12px; border-radius:8px;">
                                    <strong style="font-size:0.85rem; color:#fff; display:block; margin-bottom:2px;">📈 Proposal Pendanaan R&D Ekspansi</strong>
                                    <span style="font-size:0.7rem; color:var(--text-dim); display:block; margin-bottom:8px;">Keluarkan dana korporasi senilai $50,000 untuk suntik modal ekspansi global, melambungkan Valuasi instan sebesar +$120,000!</span>
                                    <button class="btn btn-primary btn-sm btn-call-rups" data-type="expansion" style="width:100%; font-weight:800; font-size:0.72rem; padding:8px;">Ajukan Voting Proposal</button>
                                </div>
                            </div>
                        </div>

                        <!-- Corporate Strategy Alignment -->
                        <div class="card" style="padding:1.5rem; border:1px solid var(--border-color); background:rgba(255,255,255,0.015);">
                            <h3 style="margin:0 0 0.5rem 0; font-size:1.1rem; font-weight:900; display:flex; align-items:center; gap:0.5rem; color:#3b82f6;">
                                <span>🚀</span> Penyelarasan Strategi Korporasi
                            </h3>
                            <p class="text-muted" style="font-size:0.78rem; line-height:1.4; margin-bottom:1.25rem;">
                                Selaraskan arah bisnis Anda saat ini dengan keinginan pemegang saham untuk menjaga stabilitas sentimen direksi.
                            </p>

                            <div style="display:flex; flex-direction:column; gap:0.5rem;">
                                <button class="btn btn-secondary btn-sm btn-align-strategy" data-type="growth" style="width:100%; font-weight:800; text-align:left; padding:10px 12px; font-size:0.75rem; border-left: 3px solid #3b82f6;">
                                    🚀 FOKUS AGRESIF GROWTH (Clarissa Wijaya menyukai ini)
                                </button>
                                <button class="btn btn-secondary btn-sm btn-align-strategy" data-type="dividend" style="width:100%; font-weight:800; text-align:left; padding:10px 12px; font-size:0.75rem; border-left: 3px solid #10b981;">
                                    💸 FOKUS DIVIDEN TINGGI (Suryo Hadiningrat menyukai ini)
                                </button>
                                <button class="btn btn-secondary btn-sm btn-align-strategy" data-type="compliance" style="width:100%; font-weight:800; text-align:left; padding:10px 12px; font-size:0.75rem; border-left: 3px solid #fbbf24;">
                                    🛡️ FOKUS AUDIT & TRANSPARANSI (Hendry Morgan menyukai ini)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Lobby Member Listeners
        container.querySelectorAll('.btn-lobby').forEach(btn => {
            btn.addEventListener('click', () => {
                const boardId = btn.dataset.id;
                const source = btn.dataset.source;

                try {
                    businessManager.lobbyBoardMember(boardId, source);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });

        // Call RUPS Shareholders Meeting Listeners
        container.querySelectorAll('.btn-call-rups').forEach(btn => {
            btn.addEventListener('click', async () => {
                const propType = btn.dataset.type;

                const confirmed = await ui.confirm({
                    title: 'Gelang Voting RUPS Darurat?',
                    message: `Apakah Anda yakin ingin menyelenggarakan rapat pemungutan suara darurat dengan pemegang saham terkait proposal ini?`,
                    confirmText: 'Ya, Gelar Voting!',
                    confirmClass: 'btn-primary'
                });

                if (confirmed) {
                    try {
                        const result = businessManager.callRUPS(propType);
                        
                        // Construct a premium dialog window with RUPS details log
                        const detailsJoined = result.detailsLog.map(log => `<div style="padding: 6px 0; border-bottom:1px dashed rgba(255,255,255,0.03); text-align:left;">${log}</div>`).join('');
                        
                        const statusBadge = result.passed 
                            ? `<span style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); font-weight:900; padding:4px 12px; border-radius:12px;">PROPOSAL LOLOS</span>`
                            : `<span style="background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); font-weight:900; padding:4px 12px; border-radius:12px;">PROPOSAL GAGAL</span>`;

                        const infoModal = document.createElement('div');
                        infoModal.style.cssText = `
                            position: fixed;
                            inset: 0;
                            background: rgba(0,0,0,0.85);
                            z-index: 9999;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            animation: fadeIn 0.25s ease;
                        `;
                        infoModal.innerHTML = `
                            <div class="card" style="max-width: 600px; width:90%; padding: 2rem; border: 1px solid var(--border-color); text-align:center; background: var(--bg-root); box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
                                <div style="font-size:3rem; margin-bottom: 0.5rem;">⚖️</div>
                                <h3 style="font-size:1.35rem; font-weight:900; color:#fff; margin:0 0 0.5rem 0;">BERITA ACARA RUPS</h3>
                                <div style="margin-bottom:1.5rem;">${statusBadge}</div>
                                
                                <div style="background:rgba(0,0,0,0.2); padding:1rem; border-radius:10px; max-height:220px; overflow-y:auto; font-size:0.8rem; margin-bottom:1.5rem; line-height:1.4;">
                                    ${detailsJoined}
                                </div>

                                <p style="font-size: 0.85rem; font-weight:700; color:#fff; margin-bottom:1.5rem;">${result.resultMsg}</p>
                                
                                <button class="btn btn-primary btn-sm btn-close-rups-modal" style="padding: 10px 24px; font-weight:800; font-size:0.85rem;">Tutup Risalah RUPS</button>
                            </div>
                        `;

                        document.body.appendChild(infoModal);

                        infoModal.querySelector('.btn-close-rups-modal').addEventListener('click', () => {
                            infoModal.remove();
                            if (parentPage) parentPage.render();
                        });

                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Align Strategy Listeners
        container.querySelectorAll('.btn-align-strategy').forEach(btn => {
            btn.addEventListener('click', () => {
                const stratType = btn.dataset.type;
                try {
                    businessManager.alignStrategy(stratType);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });
    }
};

export default BoardPanel;
