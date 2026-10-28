/**
 * TechOpsPanel.js - Custom High-Fidelity Management Dashboard for Technology & AI Sector
 * Features Server Infrastructure scaling, downtime failover systems, 
 * randomized candidate talent recruitment, and iterative R&D project development.
 */

import gameState from '../../../core/GameState.js';
import financeManager from '../../../finance/FinanceManager.js';
import businessManager from '../../BusinessManager.js';
import ui from '../../../ui/UIManager.js';

export const TechOpsPanel = {
    render(biz) {
        const tech = businessManager.getTechState();
        if (!tech) return `<p class="text-muted" style="padding: 2rem; text-align: center;">Memuat data divisi teknologi...</p>`;

        const servers = tech.servers;
        const products = tech.products || [];
        const project = tech.project;

        // Formatter helper
        const formatCompact = (val) => {
            if (!isFinite(val) || val >= 1e30) return '∞';
            if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B';
            if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M';
            if (val >= 1e3) return (val / 1e3).toFixed(1) + 'K';
            return val.toString();
        };

        const devWages = (tech.staff.developer || 1) * 1500;
        const devopsWages = (tech.staff.devops || 0) * 1800;
        const qaWages = (tech.staff.qa || 0) * 1200;
        const researcherWages = (tech.staff.researcher || 0) * 3000;
        const totalWages = devWages + devopsWages + qaWages + researcherWages;

        // Server maintenance cost calculation
        const serverCost = (servers.dataCenter || 1) * 2500 + (servers.supercomputer || 0) * 30000;
        
        const totalMRR = products.reduce((sum, p) => sum + (p.monthlyRevenue || 0), 0);

        const statusBadge = servers.status === 'online'
            ? `<span style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; padding: 6px 14px; border-radius: 30px; font-size: 0.8rem; font-weight: 850; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 0.3rem;">🟢 ONLINE</span>`
            : `<span style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 6px 14px; border-radius: 30px; font-size: 0.8rem; font-weight: 850; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 0.3rem;">🚨 SYSTEM OFFLINE</span>`;

        // Total users for data center load
        const totalUsers = products.reduce((sum, p) => (p.type === 'system' || p.type === 'application') ? sum + (p.users || 0) : sum, 0);
        const dataCenterCapacity = (servers.dataCenter || 1) * 100000;
        const serverLoadPercent = Math.round((servers.load || 0) * 100);
        const loadColor = serverLoadPercent > 100 ? '#ef4444' : serverLoadPercent > 80 ? '#fbbf24' : '#10b981';

        const totalStaff = (tech.staff.developer || 1) + (tech.staff.devops || 0) + (tech.staff.qa || 0) + (tech.staff.researcher || 0);

        // Render active project
        let projectHtml = '';
        if (project) {
            projectHtml = `
                <div style="background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.75rem; align-items:center;">
                        <div>
                            <span style="font-size:0.65rem; background:#3b82f6; color:#fff; font-weight:800; padding:2px 8px; border-radius:4px; text-transform:uppercase;">SEDANG DIKERJAKAN</span>
                            <h4 style="margin: 4px 0 0 0; font-size:1.1rem; font-weight:850; color:#fff;">${project.name}</h4>
                        </div>
                        <span style="font-weight:900; font-size:1.2rem; color:#3b82f6;">${project.progress}%</span>
                    </div>
                    <div style="width:100%; height:8px; background:rgba(255,255,255,0.05); border-radius:10px; overflow:hidden; margin-bottom:1rem; border: 1px solid var(--border-color);">
                        <div style="width:${project.progress}%; height:100%; background:linear-gradient(90deg, #3b82f6, #60a5fa); border-radius:10px; transition: width 0.4s ease;"></div>
                    </div>
                    <div style="display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.75rem;">
                        <button class="btn btn-sm" id="btn-accelerate-project" style="font-weight: 850; font-size: 0.75rem; background: linear-gradient(135deg, #f59e0b, #d97706); border: none; padding: 6px 14px; color: #fff; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);">
                            ⚡ AKSELERASI CLOUD ($15,000)
                        </button>
                        <span class="text-muted" style="font-size: 0.7rem; font-weight:700;">+25% Progress Instan</span>
                    </div>
                    <p class="text-muted" style="font-size:0.75rem; margin:0; line-height:1.4;">
                        Proyek ini dikerjakan secara berkelanjutan oleh para Developer dan Peneliti R&D Anda. Progress bertambah secara otomatis setiap bulan berdasarkan jumlah tim kerja Anda. Anda juga dapat membayar sewa GPU premium untuk menaikkan progress instan.
                    </p>
                </div>
            `;
        } else {
            projectHtml = `
                <div style="background: rgba(255,255,255,0.015); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
                    <h4 style="margin:0 0 1rem 0; font-size:0.95rem; font-weight:800; color:#fff;">🛠️ Memulai Proyek R&D / Produk Baru</h4>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; margin-bottom:1rem;">
                        <div>
                            <label style="font-size: 0.7rem; color: var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Nama Produk/Proyek</label>
                            <input type="text" id="tech-project-name" placeholder="misal: SecureGuard v2, NetSaaS Pro, Gemini Ultra..." 
                                style="width:100%; padding:8px 12px; border:1px solid var(--border-color); background:rgba(0,0,0,0.2); color:#fff; border-radius:6px; font-size:0.85rem; font-weight:700; outline:none;">
                        </div>
                        <div>
                            <label style="font-size: 0.7rem; color: var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Jenis Teknologi</label>
                            <select id="tech-project-type" style="width:100%; padding:8px 12px; border:1px solid var(--border-color); background:rgba(0,0,0,0.2); color:#fff; border-radius:6px; font-size:0.85rem; font-weight:700; outline:none; cursor:pointer;">
                                <option value="system">💻 Sistem (Security/SaaS Awal) ($50,000)</option>
                                <option value="application">☁️ Aplikasi SaaS ($250,000)</option>
                                <option value="ai_model">🤖 Model R&D AI (Custom Budget)</option>
                            </select>
                        </div>
                        <div id="ai-budget-container" style="display:none; grid-column: span 2; margin-top: 0.5rem;">
                            <label style="font-size: 0.7rem; color: var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Anggaran Model AI ($)</label>
                            <input type="number" id="tech-project-budget" placeholder="Anggaran (Min: $500,000)" value="1500000" min="500000" step="100000"
                                style="width:100%; padding:8px 12px; border:1px solid var(--border-color); background:rgba(0,0,0,0.2); color:#fff; border-radius:6px; font-size:0.85rem; font-weight:700; outline:none;">
                            <span class="text-muted" style="font-size:0.65rem; display:block; margin-top:4px;">💡 AI Model adalah investasi low cost high revenue. Semakin besar budget, semakin masif pendapatan dan valuasi yang didapatkan!</span>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm" id="btn-start-project" style="width:100%; font-weight:800; font-size:0.8rem; box-shadow:0 4px 10px rgba(59, 130, 246, 0.2); border:none; padding:10px;">
                        🚀 MEMULAI PROYEK R&D
                    </button>
                </div>
            `;
        }

        // Developed products listing
        let productsListHtml = '';
        if (products.length === 0) {
            productsListHtml = `<div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.8rem;">Belum ada produk teknologi yang dirilis ke pasar. Mulai proyek pertama Anda di atas!</div>`;
        } else {
            // Count supercomputers currently allocated
            let remainingSC = servers.supercomputer || 0;
            
            productsListHtml = products.map(prod => {
                const typeIcon = prod.type === 'system' ? '💻' : prod.type === 'application' ? '☁️' : '🤖';
                const typeLabel = prod.type === 'system' ? 'Sistem' : prod.type === 'application' ? 'Aplikasi SaaS' : 'Model AI';
                
                let mrrText = '';
                let usersText = '';
                
                if (prod.type === 'ai_model') {
                    const budgetFormatted = financeManager.formatCurrency(prod.budget || 1500000);
                    if (remainingSC > 0) {
                        remainingSC--;
                        mrrText = `<span style="color:#10b981; font-weight:800;">+$ ${financeManager.formatCurrency(prod.monthlyRevenue)}/bln</span>`;
                        usersText = `<span style="color:#10b981; font-size:0.7rem; display:block; font-weight:700;">🟢 AKTIF (Budget: $ ${budgetFormatted})</span>`;
                    } else {
                        mrrText = `<span style="color:#ef4444; font-weight:800;">$0/bln</span>`;
                        usersText = `<span style="color:#ef4444; font-size:0.7rem; display:block; font-weight:700;">🔴 INAKTIF (Budget: $ ${budgetFormatted})</span>`;
                    }
                } else {
                    if (servers.status === 'offline') {
                        mrrText = `<span style="color:#ef4444; font-weight:800;">$0/bln</span>`;
                        usersText = `<span style="color:#ef4444; font-size:0.7rem; display:block; font-weight:700;">🔴 OFFLINE (Server Down)</span>`;
                    } else {
                        mrrText = `<span style="color:#10b981; font-weight:800;">+$ ${financeManager.formatCurrency(prod.monthlyRevenue || 0)}/bln</span>`;
                        usersText = `<span style="color:var(--text-muted); font-size:0.75rem; display:block;">${formatCompact(prod.users || 0)} Pengguna</span>`;
                    }
                }
                
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed rgba(255,255,255,0.04); padding:10px 0; font-size:0.8rem;">
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <span style="font-size:1.4rem;">${typeIcon}</span>
                            <div>
                                <strong style="color:#fff; display:block;">${prod.name}</strong>
                                <span style="color:var(--text-muted); font-size:0.7rem; text-transform:uppercase;">${typeLabel} • Mutu ★${prod.quality}</span>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            ${mrrText}
                            ${usersText}
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Hired employees list (Automated Staf)
        let staffHtml = `
            <div style="display:flex; flex-direction:column; gap:0.6rem; font-size:0.8rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:6px; font-weight:800; color:var(--text-muted); font-size:0.7rem;">
                    <span>PERAN & DIVISI</span>
                    <div style="display:flex; gap:2.5rem; justify-content:flex-end;">
                        <span style="width:50px; text-align:center;">STAF</span>
                        <span style="width:80px; text-align:right;">BIAYA / BLN</span>
                    </div>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0;">
                    <div>
                        <strong style="color:#fff;">💻 Developer</strong>
                        <span style="color:var(--text-muted); font-size:0.65rem; display:block;">Mengerjakan progress proyek R&D</span>
                    </div>
                    <div style="display:flex; gap:2.5rem; justify-content:flex-end; align-items:center;">
                        <span style="width:50px; text-align:center; font-weight:800; color:#fff;">${tech.staff.developer || 1} orang</span>
                        <span style="width:80px; text-align:right; font-weight:700; color:#ef4444;">$ ${financeManager.formatCurrency(devWages)}</span>
                    </div>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0;">
                    <div>
                        <strong style="color:#fff;">🛡️ DevOps / Sysadmin</strong>
                        <span style="color:var(--text-muted); font-size:0.65rem; display:block;">Menjaga beban server & auto-failover</span>
                    </div>
                    <div style="display:flex; gap:2.5rem; justify-content:flex-end; align-items:center;">
                        <span style="width:50px; text-align:center; font-weight:800; color:#fff;">${tech.staff.devops || 0} orang</span>
                        <span style="width:80px; text-align:right; font-weight:700; color:#ef4444;">$ ${financeManager.formatCurrency(devopsWages)}</span>
                    </div>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0;">
                    <div>
                        <strong style="color:#fff;">🔍 QA Engineer</strong>
                        <span style="color:var(--text-muted); font-size:0.65rem; display:block;">Meningkatkan kualitas (mutu) produk rilis</span>
                    </div>
                    <div style="display:flex; gap:2.5rem; justify-content:flex-end; align-items:center;">
                        <span style="width:50px; text-align:center; font-weight:800; color:#fff;">${tech.staff.qa || 0} orang</span>
                        <span style="width:80px; text-align:right; font-weight:700; color:#ef4444;">$ ${financeManager.formatCurrency(qaWages)}</span>
                    </div>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0;">
                    <div>
                        <strong style="color:#fff;">🔬 Peneliti R&D (AI)</strong>
                        <span style="color:var(--text-muted); font-size:0.65rem; display:block;">Mempercepat riset Model AI Breakthrough</span>
                    </div>
                    <div style="display:flex; gap:2.5rem; justify-content:flex-end; align-items:center;">
                        <span style="width:50px; text-align:center; font-weight:800; color:#fff;">${tech.staff.researcher || 0} orang</span>
                        <span style="width:80px; text-align:right; font-weight:700; color:#ef4444;">$ ${financeManager.formatCurrency(researcherWages)}</span>
                    </div>
                </div>
            </div>
        `;

        return `
            <div class="tech-tab-wrapper" style="animation: fadeIn 0.3s ease-out;">
                <!-- Top metrics row -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="card" style="border-top: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.3rem; font-weight: 800; letter-spacing: 0.05em;">Pendapatan Bulanan Tech</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #10b981;">+$ ${financeManager.formatCurrency(totalMRR)}</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-muted);">Sistem, SaaS App, & Model AI aktif</div>
                    </div>
                    
                    <div class="card" style="border-top: 4px solid #ef4444; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.3rem; font-weight: 800; letter-spacing: 0.05em;">Pengeluaran Tim & Server</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #ef4444;">-$ ${financeManager.formatCurrency(totalWages + serverCost)}</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-muted);">Gaji: $ ${financeManager.formatCurrency(totalWages)} • Server: $ ${financeManager.formatCurrency(serverCost)}</div>
                    </div>
                    
                    <div class="card" style="border-top: 4px solid #3b82f6; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.3rem; font-weight: 800; letter-spacing: 0.05em;">Karyawan Divisi IT</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #fff;">${totalStaff} Orang</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-muted);">Meningkat otomatis sesuai kapasitas</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                    <!-- LEFT COLUMN: Server & Products -->
                    <div style="display:flex; flex-direction:column; gap:1.5rem;">
                        <!-- Server Infrastructure Card -->
                        <div class="card" style="padding:1.5rem; border:1px solid var(--border-color); background:rgba(255,255,255,0.015);">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
                                <h3 style="margin:0; font-size: 1.1rem; font-weight: 900; display:flex; align-items:center; gap:0.5rem; color: var(--accent-primary);">
                                    <span>☁️</span> Server Infrastructure Node
                                </h3>
                                ${statusBadge}
                            </div>
                            <p class="text-muted" style="font-size:0.8rem; line-height:1.4; margin-bottom:1.25rem;">
                                Data Center menampung pengguna aplikasi & sistem SaaS. Jika overload (load > 100%), resiko server down tinggi. Superkomputer diperlukan untuk mengaktifkan Model AI. DevOps direkrut otomatis untuk menjaga stabilitas infrastruktur.
                            </p>

                            <!-- Server stats -->
                            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem; margin-bottom:1.5rem; text-align:center;">
                                <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:8px; padding:8px;">
                                    <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Data Center</div>
                                    <strong style="font-size:1.1rem; color:#fff;">${servers.dataCenter || 1} Unit</strong>
                                    <span style="font-size:0.6rem; color:var(--text-muted); display:block; margin-top:2px;">Kapasitas: ${formatCompact(dataCenterCapacity)} Pax</span>
                                </div>
                                <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:8px; padding:8px;">
                                    <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Superkomputer</div>
                                    <strong style="font-size:1.1rem; color:#fbbf24;">${servers.supercomputer || 0} Unit</strong>
                                    <span style="font-size:0.6rem; color:var(--text-muted); display:block; margin-top:2px;">Kapasitas AI: ${servers.supercomputer || 0} Model</span>
                                </div>
                                <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:8px; padding:8px;">
                                    <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Beban Data Center</div>
                                    <strong style="font-size:1.1rem; color:${loadColor};">${serverLoadPercent}%</strong>
                                    <span style="font-size:0.6rem; color:var(--text-muted); display:block; margin-top:2px;">Total: ${formatCompact(totalUsers)} Pax</span>
                                </div>
                            </div>

                            <!-- Buy/Sell Form -->
                            <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-color); border-radius:8px; padding:12px; margin-bottom:1rem;">
                                <div style="display:grid; grid-template-columns: 1.5fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
                                    <div>
                                        <label style="font-size: 0.65rem; color: var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Jenis Server</label>
                                        <select id="tech-server-type" style="width:100%; padding:6px 10px; border:1px solid var(--border-color); background:rgba(0,0,0,0.2); color:#fff; border-radius:6px; font-size:0.8rem; font-weight:700; outline:none; cursor:pointer;">
                                            <option value="data_center">Data Center ($100K/unit, cap: 100K users)</option>
                                            <option value="supercomputer">Superkomputer ($1.0M/unit, cap: 1 AI Model)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style="font-size: 0.65rem; color: var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Jumlah (Qty)</label>
                                        <input type="number" id="tech-server-qty" min="1" value="1" 
                                            style="width:100%; padding:6px 10px; border:1px solid var(--border-color); background:rgba(0,0,0,0.2); color:#fff; border-radius:6px; font-size:0.8rem; font-weight:700; outline:none;">
                                    </div>
                                </div>
                                <div style="display:flex; gap:0.75rem;">
                                    <button class="btn btn-primary btn-sm" id="btn-buy-server" style="flex:1; font-weight:800; font-size:0.75rem; padding:8px;">
                                        📥 Beli Server (CapEx)
                                    </button>
                                    <button class="btn btn-danger btn-sm" id="btn-sell-server" style="flex:1; font-weight:800; font-size:0.75rem; padding:8px; background: rgba(220, 38, 38, 0.12); border: 1px solid rgba(220, 38, 38, 0.3); color: #ef4444;">
                                        📤 Jual Server
                                    </button>
                                </div>
                            </div>
                            
                            ${servers.status === 'offline' ? `
                                <button class="btn btn-danger btn-sm" id="btn-reboot-server" style="width:100%; font-weight:900; padding:10px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);">
                                    🔧 REBOOT & PEMULIHAN SISTEM ($15,000)
                                </button>
                            ` : ''}
                        </div>

                        <!-- Product & R&D Development Card -->
                        <div class="card" style="padding:1.5rem; border:1px solid var(--border-color); background:rgba(255,255,255,0.015);">
                            <h3 style="margin:0 0 1.25rem 0; font-size: 1.1rem; font-weight: 900; display:flex; align-items:center; gap:0.5rem; color:#3b82f6;">
                                <span>🚀</span> Laboratorium Riset & Produk R&D
                            </h3>
                            
                            <!-- Project Progress or Setup -->
                            ${projectHtml}

                            <!-- Products released list -->
                            <h4 style="margin: 1.5rem 0 0.5rem 0; font-size:0.95rem; font-weight:800; color:#fff;">📦 Produk Dirilis & Portofolio</h4>
                            <div style="display:flex; flex-direction:column; max-height:220px; overflow-y:auto; padding-right:4px;">
                                ${productsListHtml}
                            </div>
                        </div>
                    </div>

                    <!-- RIGHT COLUMN: HR & Staf -->
                    <div style="display:flex; flex-direction:column; gap:1.5rem;">
                        <!-- IT Team list -->
                        <div class="card" style="padding:1.5rem; border:1px solid var(--border-color); background:rgba(255,255,255,0.015); display:flex; flex-direction:column;">
                            <h3 style="margin:0 0 0.5rem 0; font-size: 1.1rem; font-weight: 900; display:flex; align-items:center; gap:0.5rem; color:#10b981;">
                                <span>👥</span> Tim Pengembang Teknologi
                            </h3>
                            <span style="font-size:0.65rem; background:rgba(16, 185, 129, 0.12); color:#10b981; border:1px solid rgba(16, 185, 129, 0.2); padding:3px 8px; border-radius:4px; font-weight:800; margin-bottom:1rem; align-self:flex-start;">SISTEM KARYAWAN OTOMATIS</span>
                            <p class="text-muted" style="font-size:0.8rem; line-height:1.4; margin-bottom:1.25rem;">
                                Tim pengembang dan pendukung direkrut secara otomatis sejalan dengan peluncuran produk dan penambahan infrastruktur server baru. Pengeluaran gaji akan dibebankan setiap bulan.
                            </p>
                            <div style="display:flex; flex-direction:column; margin-bottom:0.5rem;">
                                ${staffHtml}
                            </div>
                            <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-color); padding:10px; border-radius:6px; font-size:0.7rem; color:var(--text-muted); line-height:1.3; margin-top:0.75rem;">
                                💡 <strong>Info:</strong> Perusahaan selalu menyertakan 1 Developer (Founder) sebagai basis. Pembelian server dan produk baru secara otomatis menambah staf pendukung (DevOps, QA, Peneliti).
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Buy Server
        const btnBuyServer = container.querySelector('#btn-buy-server');
        if (btnBuyServer) {
            btnBuyServer.addEventListener('click', () => {
                const typeSelect = container.querySelector('#tech-server-type');
                const qtyInput = container.querySelector('#tech-server-qty');
                
                if (!typeSelect || !qtyInput) return;
                
                const type = typeSelect.value;
                const qty = parseInt(qtyInput.value);
                
                try {
                    businessManager.purchaseServers(type, qty);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Sell Server
        const btnSellServer = container.querySelector('#btn-sell-server');
        if (btnSellServer) {
            btnSellServer.addEventListener('click', async () => {
                const typeSelect = container.querySelector('#tech-server-type');
                const qtyInput = container.querySelector('#tech-server-qty');
                
                if (!typeSelect || !qtyInput) return;
                
                const type = typeSelect.value;
                const qty = parseInt(qtyInput.value);
                
                const typeName = type === 'data_center' ? 'Data Center' : 'Superkomputer';
                
                const confirmed = await ui.confirm({
                    title: `Likuidasi ${typeName}?`,
                    message: `Apakah Anda yakin ingin menjual ${qty} unit ${typeName}? Valuasi korporasi akan disesuaikan.`,
                    confirmText: 'Ya, Jual!',
                    confirmClass: 'btn-danger'
                });
                
                if (confirmed) {
                    try {
                        businessManager.sellServers(type, qty);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }

        // Reboot Server
        const btnReboot = container.querySelector('#btn-reboot-server');
        if (btnReboot) {
            btnReboot.addEventListener('click', () => {
                try {
                    businessManager.rebootServers();
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Toggle AI Budget input visibility
        const typeInput = container.querySelector('#tech-project-type');
        const budgetContainer = container.querySelector('#ai-budget-container');
        if (typeInput && budgetContainer) {
            typeInput.addEventListener('change', () => {
                if (typeInput.value === 'ai_model') {
                    budgetContainer.style.display = 'block';
                } else {
                    budgetContainer.style.display = 'none';
                }
            });
        }

        // Start Project
        const btnStartProject = container.querySelector('#btn-start-project');
        if (btnStartProject) {
            btnStartProject.addEventListener('click', () => {
                const nameInput = container.querySelector('#tech-project-name');
                const typeSelect = container.querySelector('#tech-project-type');
                const budgetInput = container.querySelector('#tech-project-budget');
                
                if (!nameInput || !typeSelect) return;

                const name = nameInput.value.trim();
                const type = typeSelect.value;
                const budget = budgetInput ? parseInt(budgetInput.value) : 1500000;

                if (!name) {
                    ui.error('Harap beri nama produk/proyek R&D baru Anda!');
                    return;
                }

                try {
                    businessManager.startNewProject(name, type, budget);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Accelerate Project
        const btnAccelerateProject = container.querySelector('#btn-accelerate-project');
        if (btnAccelerateProject) {
            btnAccelerateProject.addEventListener('click', () => {
                try {
                    businessManager.accelerateProject();
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }
    }
};

export default TechOpsPanel;
