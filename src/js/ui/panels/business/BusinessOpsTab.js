/**
 * BusinessOpsTab.js - Operational & Strategy Tab Renderer (ERP, R&D, Marketing, Managers)
 *
 * Extracted from BusinessPage.js to keep the heavy Ops tab HTML and ERP live-update logic
 * separate. This keeps BusinessPage.js focused on orchestration only.
 *
 * Exports:
 *   renderOpsTab(biz, financeManager, businessManager, INDUSTRY_INITIATIVES) -> string
 *   bindOpsTabEvents(container, biz, businessManager, financeManager, ui, re-render fn)
 */

/**
 * Render the full HTML for the Operations & Strategy tab.
 *
 * @param {Object} biz
 * @param {Object} financeManager
 * @param {Object} businessManager
 * @param {Object} INDUSTRY_INITIATIVES
 * @returns {string} HTML string
 */
export function renderOpsTab(biz, financeManager, businessManager, INDUSTRY_INITIATIVES) {
    const rd       = biz.rdLevel || 1;
    const rdCost   = 12000 * rd;
    const managers = biz.managers    || { ops: false, marketing: false, rd: false };
    const ops      = biz.operations  || { supplier: 'local', production: 'manual' };

    const industryKey      = biz.industry;
    const initiativesList  = INDUSTRY_INITIATIVES[industryKey] || [];
    const activeInitiatives = biz.initiatives || {};

    let initiativeCardsHtml = '';
    initiativesList.forEach(init => {
        const isActive  = activeInitiatives[init.key] || false;
        const buttonHtml = isActive
            ? `<span style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); color: #10b981; padding: 8px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; width: 100%;">✓ AKTIF / LAUNCHED</span>`
            : `<button class="btn btn-primary btn-sm btn-execute-initiative" data-key="${init.key}" style="font-weight: 800; font-size: 0.75rem; padding: 8px 12px; width: 100%; box-shadow: 0 4px 10px rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.3);">Luncurkan ($ ${financeManager.formatCurrency(init.cost)})</button>`;

        initiativeCardsHtml += `
            <div class="card" style="padding: 1.25rem; background: rgba(255, 255, 255, 0.015); border: 1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s; position: relative; overflow: hidden; ${isActive ? 'box-shadow: 0 4px 15px rgba(16, 185, 129, 0.04);' : ''}">
                ${isActive ? `<div style="position: absolute; top: 0; right: 0; width: 50px; height: 50px; background: linear-gradient(135deg, transparent 50%, rgba(16, 185, 129, 0.15) 50%); display: flex; align-items: flex-end; justify-content: flex-end; padding: 4px;"></div>` : ''}
                <div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <span style="font-size: 1.85rem;">${init.icon}</span>
                        <div>
                            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 850; color: #fff;">${init.name}</h4>
                            <span style="font-size: 0.65rem; color: #fbbf24; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;">INISIATIF STRATEGIS</span>
                        </div>
                    </div>
                    <p class="text-muted" style="font-size: 0.75rem; line-height: 1.4; margin-bottom: 1rem; min-height: 48px;">
                        ${init.description}
                    </p>
                </div>
                <div>
                    <div style="background: rgba(0, 0, 0, 0.2); padding: 8px 10px; border-radius: 6px; font-size: 0.7rem; color: #fff; margin-bottom: 1rem; border-left: 2px solid ${isActive ? '#10b981' : '#fbbf24'};">
                        <div style="font-size: 0.55rem; color: var(--text-dim); text-transform: uppercase; font-weight: 800; margin-bottom: 2px;">Dampak Efek</div>
                        <span style="font-weight: 700;">${init.benefit}</span>
                    </div>
                    <div style="display: flex; justify-content: center; width: 100%;">
                        ${buttonHtml}
                    </div>
                </div>
            </div>
        `;
    });

    return `
        <div class="ops-tab-wrapper">
            <!-- ERP Production & Supply Chain Optimizer Card -->
            <div class="card" style="padding: 1.75rem; margin-bottom: 1.5rem; background: radial-gradient(circle at top left, rgba(16, 185, 129, 0.06) 0%, rgba(0,0,0,0) 80%); border: 1px solid var(--border-color);">
                <h3 style="margin-top:0; font-size: 1.25rem; font-weight: 900; margin-bottom: 0.5rem; color: var(--accent-primary); display:flex; align-items:center; gap:0.5rem;">
                    <span>⚙️</span> ERP Production &amp; Supply Chain Optimizer
                </h3>
                <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.5rem;">
                    Kelola integrasi operasional manufaktur dan logistik Anda. Keseimbangan parameter antara penyuplai bahan baku (Supply Chain) dan metode perakitan menentukan efisiensi siklus, tingkat cacat produk, dan margin pendapatan utama perusahaan Anda.
                </p>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 0.5rem;">
                    <!-- Left: Configuration Selectors -->
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <!-- Supplier Sourcing -->
                        <div>
                            <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; display: block;">🚚 Rantai Pasok (Bahan Baku)</label>
                            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                                <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); cursor: pointer; font-size: 0.8rem;">
                                    <span><input type="radio" name="ops-supplier" value="local" ${ops.supplier === 'local' ? 'checked' : ''} style="margin-right: 8px;"> 🏡 Pemasok Lokal (Murah)</span>
                                    <span style="color: var(--text-dim); font-size: 0.75rem;">$500/bln | Kualitas 50% | 14 Hari</span>
                                </label>
                                <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); cursor: pointer; font-size: 0.8rem;">
                                    <span><input type="radio" name="ops-supplier" value="national" ${ops.supplier === 'national' ? 'checked' : ''} style="margin-right: 8px;"> 🇮🇩 Pemasok Nasional (Premium)</span>
                                    <span style="color: var(--text-dim); font-size: 0.75rem;">$2.5k/bln | Kualitas 85% | 7 Hari</span>
                                </label>
                                <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); cursor: pointer; font-size: 0.8rem;">
                                    <span><input type="radio" name="ops-supplier" value="global" ${ops.supplier === 'global' ? 'checked' : ''} style="margin-right: 8px;"> 🌍 Pemasok Global (Impor)</span>
                                    <span style="color: var(--text-dim); font-size: 0.75rem;">$9k/bln | Kualitas 98% | 3 Hari</span>
                                </label>
                            </div>
                        </div>

                        <!-- Production Methodology -->
                        <div>
                            <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; display: block;">🛠️ Metode Perakitan / Produksi</label>
                            <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                                <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); cursor: pointer; font-size: 0.8rem;">
                                    <span><input type="radio" name="ops-production" value="manual" ${ops.production === 'manual' ? 'checked' : ''} style="margin-right: 8px;"> 🤝 Manual (Seni Kerajinan Tangan)</span>
                                    <span style="color: var(--text-dim); font-size: 0.75rem;">$1.5k/bln | Kec. 1x | Cacat 2%</span>
                                </label>
                                <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); cursor: pointer; font-size: 0.8rem;">
                                    <span><input type="radio" name="ops-production" value="batch" ${ops.production === 'batch' ? 'checked' : ''} style="margin-right: 8px;"> 🏭 Perakitan Batch (Lini Produksi)</span>
                                    <span style="color: var(--text-dim); font-size: 0.75rem;">$6k/bln | Kec. 2x | Cacat 6%</span>
                                </label>
                                <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: rgba(0,0,0,0.15); cursor: pointer; font-size: 0.8rem;">
                                    <span><input type="radio" name="ops-production" value="jit" ${ops.production === 'jit' ? 'checked' : ''} style="margin-right: 8px;"> ⚡ Otomasi Just-in-Time (JIT)</span>
                                    <span style="color: var(--text-dim); font-size: 0.75rem;">$20k/bln | Kec. 4.5x | Cacat 12%</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Live ERP Analytics Board -->
                    <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <h4 style="margin: 0 0 1rem 0; font-size: 0.9rem; font-weight: 800; color: #fff; display: flex; align-items: center; justify-content: space-between;">
                                <span>📊 Live Data Analytics</span>
                                <span id="oes-rating" style="font-size: 0.75rem; background: rgba(16, 185, 129, 0.15); color: var(--accent-primary); border: 1px solid rgba(16, 185, 129, 0.25); padding: 3px 8px; border-radius: 4px;">CALIBRATING</span>
                            </h4>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-bottom: 1rem;">
                                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 0.6rem; border-radius: var(--radius-sm); text-align: center;">
                                    <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.2rem;">OES Score</div>
                                    <div id="live-oes" style="font-size: 1.3rem; font-weight: 900; color: var(--accent-primary);">--%</div>
                                </div>
                                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 0.6rem; border-radius: var(--radius-sm); text-align: center;">
                                    <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.2rem;">Tingkat Cacat</div>
                                    <div id="live-defect" style="font-size: 1.3rem; font-weight: 900; color: #ef4444;">--%</div>
                                </div>
                                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 0.6rem; border-radius: var(--radius-sm); text-align: center;">
                                    <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.2rem;">Waktu Siklus</div>
                                    <div id="live-lead" style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-top: 0.15rem;">-- Hari</div>
                                </div>
                                <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 0.6rem; border-radius: var(--radius-sm); text-align: center;">
                                    <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.2rem;">Dampak Omzet</div>
                                    <div id="live-multiplier" style="font-size: 1.1rem; font-weight: 800; color: #fbbf24; margin-top: 0.15rem;">x 1.0</div>
                                </div>
                            </div>

                            <!-- Live Recommendation Box -->
                            <div id="live-advice" style="font-size: 0.75rem; line-height: 1.5; color: var(--text-muted); background: rgba(255,255,255,0.03); border-radius: 6px; padding: 8px 12px; border-left: 3px solid #6b7280; min-height: 52px; display: flex; align-items: center;">
                                Sedang menganalisis konfigurasi operasional...
                            </div>
                        </div>

                        <button class="btn btn-primary btn-sm" id="btn-apply-operations"
                                style="width: 100%; font-weight: 900; letter-spacing: 0.05em; margin-top: 1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">
                            ⚙️ OPTIMALKAN SISTEM OPERASIONAL
                        </button>
                    </div>
                </div>
            </div>

            <!-- Strategic Industry Initiatives Card -->
            <div class="card" style="padding: 1.75rem; margin-bottom: 1.5rem; background: radial-gradient(circle at top right, rgba(251, 191, 36, 0.03) 0%, rgba(0,0,0,0) 80%); border: 1px solid var(--border-color);">
                <h3 style="margin-top:0; font-size: 1.25rem; font-weight: 900; margin-bottom: 0.5rem; color: #fbbf24; display:flex; align-items:center; gap:0.5rem;">
                    <span>🎯</span> Sistem Menejerial Sektor (${businessManager.industries[biz.industry]?.name || biz.industry})
                </h3>
                <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.5rem;">
                    Kembangkan inisiatif strategis menejerial yang dikustomisasi khusus untuk industri bisnis Anda saat ini. Luncurkan program dengan menggunakan dana kas treasury perusahaan Anda demi mendongkrak omzet bulanan, meningkatkan efisiensi biaya, atau melipatgandakan valuasi korporasi secara permanen.
                </p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem;">
                    ${initiativeCardsHtml}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
                <!-- Technology & R&D -->
                <div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <h3 style="margin-top:0; font-size: 1.15rem; font-weight: 900; margin-bottom: 0.75rem; color: #3b82f6; display:flex; align-items:center; gap:0.5rem;">
                            <span>💻</span> Divisi R&amp;D &amp; Rekayasa Teknologi
                        </h3>
                        <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.2rem;">
                            Tingkatkan R&amp;D secara berkala. R&amp;D memperkuat mutu produk, meningkatkan traksi kepuasan pelanggan, serta memotong efisiensi pengeluaran operasional perusahaan s.d 25%.
                        </p>
                        <div style="background: rgba(59, 130, 246, 0.06); padding: 1rem; border-radius: 10px; border: 1px solid rgba(59, 130, 246, 0.15); margin-bottom: 1.2rem;">
                            <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:0.4rem;">
                                <span>Tingkat R&amp;D Saat Ini</span>
                                <span style="font-weight:800; color:#3b82f6;">Level ${rd}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
                                <span>Efisiensi Biaya Operasional</span>
                                <span style="font-weight:800; color:#10b981;">-${Math.min(rd * 2, 25)}%</span>
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-secondary btn-sm" id="btn-upgrade-rd" style="width:100%; border: 1px solid rgba(59, 130, 246, 0.3); font-weight:800;">
                        🚀 Tingkatkan Teknologi (Biaya: $ ${financeManager.formatCurrency(rdCost)})
                    </button>
                </div>

                <!-- Marketing Campaigns -->
                <div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <h3 style="margin-top:0; font-size: 1.15rem; font-weight: 900; margin-bottom: 0.75rem; color: #fbbf24; display:flex; align-items:center; gap:0.5rem;">
                            <span>📢</span> Kampanye Pemasaran &amp; Publikasi
                        </h3>
                        <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.2rem;">
                            Pilih model kampanye pemasaran aktif untuk memompa pertumbuhan traksi omzet pendapatan bulanan Anda secara agresif.
                        </p>
                        <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom: 1.2rem;">
                            <label style="display:flex; align-items:center; justify-content:space-between; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.1); cursor:pointer; font-size:0.85rem;">
                                <span><input type="radio" name="marketing-radio" value="none" ${biz.marketingCampaign === 'none' ? 'checked' : ''} style="margin-right:8px;"> Tanpa Pemasaran Aktif</span>
                                <span style="font-weight:800; color:var(--text-muted);">$ 0/bln</span>
                            </label>
                            <label style="display:flex; align-items:center; justify-content:space-between; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.1); cursor:pointer; font-size:0.85rem;">
                                <span><input type="radio" name="marketing-radio" value="local" ${biz.marketingCampaign === 'local' ? 'checked' : ''} style="margin-right:8px;"> 📰 Iklan Media Lokal (+25% Growth)</span>
                                <span style="font-weight:800; color:#fbbf24;">$ 1,000/bln</span>
                            </label>
                            <label style="display:flex; align-items:center; justify-content:space-between; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.1); cursor:pointer; font-size:0.85rem;">
                                <span><input type="radio" name="marketing-radio" value="social" ${biz.marketingCampaign === 'social' ? 'checked' : ''} style="margin-right:8px;"> 📱 Media Sosial &amp; Key Opinion Leader (+60% Growth)</span>
                                <span style="font-weight:800; color:#fbbf24;">$ 5,000/bln</span>
                            </label>
                            <label style="display:flex; align-items:center; justify-content:space-between; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.1); cursor:pointer; font-size:0.85rem;">
                                <span><input type="radio" name="marketing-radio" value="global" ${biz.marketingCampaign === 'global' ? 'checked' : ''} style="margin-right:8px;"> 🏆 TV Sponsor &amp; Papan Iklan Global (+150% Growth)</span>
                                <span style="font-weight:800; color:#fbbf24;">$ 25,000/bln</span>
                            </label>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm" id="btn-apply-marketing" style="width:100%; font-weight:800;">Simpan Kampanye Pemasaran</button>
                </div>

                <!-- Executive Managers -->
                <div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; grid-column: span 2;">
                    <div>
                        <h3 style="margin-top:0; font-size: 1.15rem; font-weight: 900; margin-bottom: 0.75rem; color: #10b981; display:flex; align-items:center; gap:0.5rem;">
                            <span>👔</span> Jajaran Direksi Eksekutif &amp; Manajemen Kunci (COO, CMO, CTO)
                        </h3>
                        <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5; margin-bottom: 1.2rem;">
                            Rekrut manajer eksekutif profesional untuk mengotomatisasi efisiensi operasional. Jajaran eksekutif memakan biaya sign-on fee rekrutmen awal sebesar <strong>$ 15,000</strong> dan gaji bulanan <strong>$ 3,000</strong> per orang.
                        </p>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                            <!-- COO -->
                            <div style="background: rgba(255,255,255,0.02); padding: 1.2rem; border-radius: 12px; border: 1px solid var(--border-color); text-align:center;">
                                <div style="font-size:2.2rem; margin-bottom:0.5rem;">👨‍💼</div>
                                <h4 style="margin:0; font-size:1rem; font-weight:800; color:#fff;">COO (Chief Operating Officer)</h4>
                                <p class="text-muted" style="font-size:0.75rem; margin: 8px 0 12px 0; min-height: 36px;">Meningkatkan efisiensi kerja karyawan s.d -15% biaya &amp; +1 mutu produk secara permanen.</p>
                                ${managers.ops ? `
                                    <span style="background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2); padding:6px 16px; border-radius:30px; font-size:0.75rem; font-weight:800;">AKTIF MENJABAT</span>
                                ` : `
                                    <button class="btn btn-secondary btn-sm btn-hire" data-role="ops" style="padding:6px 16px; font-size:0.75rem; font-weight:800; width:100%;">REKRUT EKSEKUTIF</button>
                                `}
                            </div>
                            <!-- CMO -->
                            <div style="background: rgba(255,255,255,0.02); padding: 1.2rem; border-radius: 12px; border: 1px solid var(--border-color); text-align:center;">
                                <div style="font-size:2.2rem; margin-bottom:0.5rem;">👩‍💼</div>
                                <h4 style="margin:0; font-size:1rem; font-weight:800; color:#fff;">CMO (Chief Marketing Officer)</h4>
                                <p class="text-muted" style="font-size:0.75rem; margin: 8px 0 12px 0; min-height: 36px;">Melipatgandakan seluruh performa kampanye marketing aktif agar menuai omzet berlipat.</p>
                                ${managers.marketing ? `
                                    <span style="background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2); padding:6px 16px; border-radius:30px; font-size:0.75rem; font-weight:800;">AKTIF MENJABAT</span>
                                ` : `
                                    <button class="btn btn-secondary btn-sm btn-hire" data-role="marketing" style="padding:6px 16px; font-size:0.75rem; font-weight:800; width:100%;">REKRUT EKSEKUTIF</button>
                                `}
                            </div>
                            <!-- CTO -->
                            <div style="background: rgba(255,255,255,0.02); padding: 1.2rem; border-radius: 12px; border: 1px solid var(--border-color); text-align:center;">
                                <div style="font-size:2.2rem; margin-bottom:0.5rem;">👨‍💻</div>
                                <h4 style="margin:0; font-size:1rem; font-weight:800; color:#fff;">CTO (Chief Technology Officer)</h4>
                                <p class="text-muted" style="font-size:0.75rem; margin: 8px 0 12px 0; min-height: 36px;">Meningkatkan performa divisi riset teknologi R&amp;D dan melipatgandakan produk mutu.</p>
                                ${managers.rd ? `
                                    <span style="background:rgba(16,185,129,0.1); color:#10b981; border:1px solid rgba(16,185,129,0.2); padding:6px 16px; border-radius:30px; font-size:0.75rem; font-weight:800;">AKTIF MENJABAT</span>
                                ` : `
                                    <button class="btn btn-secondary btn-sm btn-hire" data-role="rd" style="padding:6px 16px; font-size:0.75rem; font-weight:800; width:100%;">REKRUT EKSEKUTIF</button>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// LIVE ERP CALCULATOR
// ============================================================

/**
 * Compute ERP stats from selected supplier & production config.
 * Returns { defectRate, totalLeadTime, opMultiplier, OES, advice, alignmentText, alignmentColor, alignmentBg }
 */
function calcERPStats(supplier, production, bizType) {
    let supplierQuality = 0.50;
    let supplierLeadTime = 14;
    if (supplier === 'national') { supplierQuality = 0.85; supplierLeadTime = 7; }
    else if (supplier === 'global')   { supplierQuality = 0.98; supplierLeadTime = 3; }

    let prodSpeed  = 1.0;
    let defectBase = 0.02;
    if (production === 'batch') { prodSpeed = 2.0; defectBase = 0.06; }
    else if (production === 'jit')   { prodSpeed = 4.5; defectBase = 0.12; }

    const mismatchMult = (production === 'jit'   && supplier === 'local') ? 2.5
                       : (production === 'batch' && supplier === 'local') ? 1.5
                       : 1.0;
    const defectRate    = defectBase * (1.5 - supplierQuality) * mismatchMult;
    const totalLeadTime = supplierLeadTime + Math.round(15 / prodSpeed);

    let defectPenalty = 1.0;
    if (defectRate > 0.10) defectPenalty = 0.5;
    else if (defectRate > 0.05) defectPenalty = 0.8;

    let speedBonus = 1.0;
    let advice     = '';
    let alignmentText  = 'MISALIGNED';
    let alignmentColor = '#ef4444';
    let alignmentBg    = 'rgba(239, 68, 68, 0.15)';

    if (bizType === 'startup') {
        if (supplier === 'global' && production === 'jit') {
            speedBonus = 2.5; alignmentText = 'SEMPURNA (JIT GLOBAL)';
            alignmentColor = 'var(--accent-primary)'; alignmentBg = 'rgba(16, 185, 129, 0.15)';
            advice = '🏆 Kombinasi optimal! Rantai pasok Global berkualitas tinggi mendukung laju otomatisasi JIT secara sempurna. Omzet naik 2.5x tanpa kegagalan mesin.';
        } else if (supplier === 'local' && production === 'jit') {
            speedBonus = 0.7;
            advice = '⚠️ Kritis! Otomasi JIT digabung dengan bahan baku murah lokal menimbulkan defect tinggi (18%)! Laju mesin Anda tersumbat bahan cacat.';
        } else {
            speedBonus = 0.9;
            advice = '💡 Rekomendasi: Tech Startup butuh kecepatan tinggi (JIT) dan mutu suku cadang global. Coba naikkan level logistik Anda!';
        }
    } else {
        // UMKM
        if (supplier === 'national' && production === 'batch') {
            speedBonus = 1.8; alignmentText = 'SEMPURNA (EFISIEN REGIONAL)';
            alignmentColor = 'var(--accent-primary)'; alignmentBg = 'rgba(16, 185, 129, 0.15)';
            advice = '🏆 Kombinasi optimal! Lini Perakitan Batch dengan Pemasok Nasional memberikan efisiensi biaya regional terbaik untuk UMKM Anda. Omzet naik 1.8x!';
        } else if (supplier === 'local' && production === 'manual') {
            speedBonus = 1.2; alignmentText = 'CUKUP (TRADISIONAL)';
            alignmentColor = '#fbbf24'; alignmentBg = 'rgba(251, 191, 36, 0.15)';
            advice = '💡 Operasional tradisional berjalan dengan baik, defect kecil namun kapasitas produksi lambat. Cocok untuk fase awal.';
        } else if (production === 'jit') {
            speedBonus = 0.6;
            advice = '⚠️ Pemborosan! Penerapan otomatisasi JIT terlalu canggih untuk UMKM Anda, membebani kas operasional bulanan tanpa kenaikan margin yang berarti.';
        } else {
            speedBonus = 1.0;
            advice = '💡 Tips: UMKM mendapat margin optimal dengan menyeimbangkan biaya regional. Pemasok Nasional + Perakitan Batch sangat disarankan.';
        }
    }

    const opMultiplier = speedBonus * defectPenalty;
    const OES = Math.round(Math.min(100, (opMultiplier / 2.5) * 100));

    return { defectRate, totalLeadTime, opMultiplier, OES, advice, alignmentText, alignmentColor, alignmentBg };
}

/**
 * Sync live ERP board to DOM from current radio selections.
 */
function updateLiveERP(container, bizType) {
    const supplier   = container.querySelector('input[name="ops-supplier"]:checked')?.value   || 'local';
    const production = container.querySelector('input[name="ops-production"]:checked')?.value || 'manual';
    const stats = calcERPStats(supplier, production, bizType);

    const oesEl    = container.querySelector('#live-oes');
    const defectEl = container.querySelector('#live-defect');
    const leadEl   = container.querySelector('#live-lead');
    const multEl   = container.querySelector('#live-multiplier');
    const adviceEl = container.querySelector('#live-advice');
    const ratingEl = container.querySelector('#oes-rating');

    if (oesEl)    oesEl.textContent = `${stats.OES}%`;
    if (defectEl) {
        defectEl.textContent = `${(stats.defectRate * 100).toFixed(1)}%`;
        defectEl.style.color = stats.defectRate > 0.10 ? '#ef4444' : stats.defectRate > 0.05 ? '#fbbf24' : '#10b981';
    }
    if (leadEl) leadEl.textContent = `${stats.totalLeadTime} Hari`;
    if (multEl) {
        multEl.textContent  = `x ${stats.opMultiplier.toFixed(2)}`;
        multEl.style.color  = stats.opMultiplier >= 1.5 ? '#10b981' : stats.opMultiplier >= 1.0 ? '#fbbf24' : '#ef4444';
    }
    if (adviceEl) {
        adviceEl.textContent = stats.advice;
        adviceEl.style.borderLeftColor = stats.defectRate > 0.10 ? '#ef4444' : stats.opMultiplier >= 1.5 ? '#10b981' : '#fbbf24';
    }
    if (ratingEl) {
        ratingEl.textContent         = stats.alignmentText;
        ratingEl.style.color         = stats.alignmentColor;
        ratingEl.style.backgroundColor = stats.alignmentBg;
        ratingEl.style.borderColor   = stats.alignmentColor.replace('1)', '0.3)');
    }
}

// ============================================================
// EVENT BINDING
// ============================================================

/**
 * Bind all interactive events for the Ops tab.
 *
 * @param {HTMLElement} container      - Parent container (this.container)
 * @param {Object}      biz            - Current business state
 * @param {Object}      businessManager
 * @param {Object}      financeManager
 * @param {Object}      ui
 * @param {Function}    rerender       - Callback to trigger full re-render
 */
export function bindOpsTabEvents(container, biz, businessManager, financeManager, ui, rerender) {
    // R&D Upgrade
    const btnRD = document.getElementById('btn-upgrade-rd');
    if (btnRD) {
        btnRD.addEventListener('click', () => {
            try {
                businessManager.upgradeRD();
                rerender();
            } catch (e) {
                ui.error(e.message);
            }
        });
    }

    // Marketing Campaign
    const btnMarketing = document.getElementById('btn-apply-marketing');
    if (btnMarketing) {
        btnMarketing.addEventListener('click', () => {
            const selected = container.querySelector('input[name="marketing-radio"]:checked')?.value || 'none';
            try {
                businessManager.launchCampaign(selected);
                rerender();
            } catch (e) {
                ui.error(e.message);
            }
        });
    }

    // Live ERP radio changes
    container.querySelectorAll('input[name="ops-supplier"], input[name="ops-production"]').forEach(input => {
        input.addEventListener('change', () => updateLiveERP(container, biz.type));
    });

    // Initialize board
    if (container.querySelector('input[name="ops-supplier"]')) {
        updateLiveERP(container, biz.type);
    }

    // Apply ERP settings
    const btnApplyOps = document.getElementById('btn-apply-operations');
    if (btnApplyOps) {
        btnApplyOps.addEventListener('click', () => {
            const supplier   = container.querySelector('input[name="ops-supplier"]:checked')?.value   || 'local';
            const production = container.querySelector('input[name="ops-production"]:checked')?.value || 'manual';
            try {
                businessManager.updateOperations(supplier, production);
                import('../../Animations.js').then(anim => {
                    anim.createFloatingText(btnApplyOps, '⚙️ ERP OK', '#10b981');
                });
                rerender();
            } catch (e) {
                ui.error(e.message);
            }
        });
    }

    // Hire Managers
    container.querySelectorAll('.btn-hire').forEach(btn => {
        btn.addEventListener('click', () => {
            const role = btn.dataset.role;
            try {
                businessManager.hireExecutive(role);
                rerender();
            } catch (e) {
                ui.error(e.message);
            }
        });
    });

    // Strategic Initiatives
    container.querySelectorAll('.btn-execute-initiative').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            try {
                businessManager.executeIndustryInitiative(key);
                import('../../Animations.js').then(anim => {
                    anim.createFloatingText(btn, '🎯 LAUNCH OK', '#fbbf24');
                });
                rerender();
            } catch (e) {
                ui.error(e.message);
            }
        });
    });
}
