/**
 * TechOpsPanel.js - Custom High-Fidelity Management Dashboard for Technology & AI Sector
 * Features Server Infrastructure scaling, downtime failover systems, 
 * randomized candidate talent recruitment, and iterative R&D project development.
 */

import gameState from '../../game/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import businessManager from '../../business/BusinessManager.js';
import ui from '../UIManager.js';

export const TechOpsPanel = {
    render(biz) {
        const tech = businessManager.getTechState();
        if (!tech) return `<p class="text-muted" style="padding: 2rem; text-align: center;">Memuat data divisi teknologi...</p>`;

        const servers = tech.servers;
        const employees = tech.employees;
        const candidates = tech.candidates;
        const products = tech.products;
        const project = tech.project;

        // Formatter helper
        const formatCompact = (val) => {
            if (!isFinite(val) || val >= 1e30) return '∞';
            if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B';
            if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M';
            if (val >= 1e3) return (val / 1e3).toFixed(1) + 'K';
            return val.toString();
        };

        const totalWages = employees.reduce((sum, e) => sum + e.salary, 0);
        const serverCost = servers.active * 400 + servers.backup * 200;
        const totalMRR = products.reduce((sum, p) => sum + (p.monthlyRevenue || 0), 0);

        const statusBadge = servers.status === 'online'
            ? `<span style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; padding: 6px 14px; border-radius: 30px; font-size: 0.8rem; font-weight: 850; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 0.3rem;">🟢 ONLINE</span>`
            : `<span style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 6px 14px; border-radius: 30px; font-size: 0.8rem; font-weight: 850; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 0.3rem;">🚨 SYSTEM OFFLINE</span>`;

        const totalUsers = products.reduce((sum, p) => sum + (p.users || 0), 0);
        const serverCapacity = servers.active * servers.capacity;
        const serverLoadPercent = Math.round((servers.load || 0) * 100);
        const loadColor = serverLoadPercent > 100 ? '#ef4444' : serverLoadPercent > 80 ? '#fbbf24' : '#10b981';

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
                            ⚡ AKSELERASI CLOUD ($10,000)
                        </button>
                        <span class="text-muted" style="font-size: 0.7rem; font-weight:700;">+25% Progress Instan</span>
                    </div>
                    <p class="text-muted" style="font-size:0.75rem; margin:0;">
                        Proyek ini dikerjakan secara berkelanjutan oleh para Developer dan Peneliti R&D Anda. Progress bertambah secara otomatis setiap pergantian bulan berdasarkan total skill dan speed tim kerja Anda. Anda juga dapat membayar sewa GPU premium untuk menaikkan progress instan.
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
                            <input type="text" id="tech-project-name" placeholder="misal: GPT-5, MyPhone X, SaaS App..." 
                                style="width:100%; padding:8px 12px; border:1px solid var(--border-color); background:rgba(0,0,0,0.2); color:#fff; border-radius:6px; font-size:0.85rem; font-weight:700; outline:none;">
                        </div>
                        <div>
                            <label style="font-size: 0.7rem; color: var(--text-muted); font-weight:700; display:block; margin-bottom:4px;">Jenis Teknologi</label>
                            <select id="tech-project-type" style="width:100%; padding:8px 12px; border:1px solid var(--border-color); background:rgba(0,0,0,0.2); color:#fff; border-radius:6px; font-size:0.85rem; font-weight:700; outline:none; cursor:pointer;">
                                <option value="computer">💻 Hardware Komputer ($5,000)</option>
                                <option value="phone">📱 Smartphone Flagship ($15,000)</option>
                                <option value="app">☁️ Aplikasi SaaS Cloud ($5,000)</option>
                                <option value="ai">🤖 Model R&D AI Breakthrough ($30,000)</option>
                            </select>
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
            productsListHtml = products.map(prod => {
                const typeIcon = prod.type === 'computer' ? '💻' : prod.type === 'phone' ? '📱' : prod.type === 'app' ? '☁️' : '🤖';
                const typeLabel = prod.type === 'computer' ? 'Komputer' : prod.type === 'phone' ? 'Smartphone' : prod.type === 'app' ? 'SaaS App' : 'AI breakthrough';
                const mrrText = prod.type === 'app' ? `<span style="color:#10b981; font-weight:800;">+$ ${financeManager.formatCurrency(prod.monthlyRevenue)}/bln</span>` : '<span style="color:var(--text-muted);">Terjual</span>';
                const usersText = prod.type === 'app' ? `<span style="color:var(--text-muted); font-size:0.75rem; display:block;">${formatCompact(prod.users)} Pengguna</span>` : '';
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

        // Hired employees list
        let employeesHtml = '';
        employees.forEach(emp => {
            const isFounder = emp.id === 'emp_init';
            const actionBtn = isFounder
                ? `<span style="font-size:0.7rem; color:var(--text-muted); font-weight:800;">FOUNDER</span>`
                : `<button class="btn btn-danger btn-sm btn-fire-emp" data-id="${emp.id}" style="padding:4px 8px; font-size:0.65rem; font-weight:800;">PECAT</button>`;

            employeesHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.03); padding:8px 0; font-size:0.8rem;">
                    <div>
                        <strong style="color:#fff; display:block;">${emp.name}</strong>
                        <span style="color:var(--accent-primary); font-weight:700; font-size:0.7rem;">${emp.role}</span>
                        <span style="color:var(--text-muted); font-size:0.7rem; margin-left:6px;">Skill: ${emp.skill} • Speed: ${emp.speed}x</span>
                    </div>
                    <div style="text-align:right; display:flex; align-items:center; gap:0.75rem;">
                        <span style="font-weight:700; color:#ef4444; margin-right:6px;">$ ${financeManager.formatCurrency(emp.salary)}/bln</span>
                        ${actionBtn}
                    </div>
                </div>
            `;
        });

        // Candidates list
        let candidatesHtml = '';
        if (!candidates || candidates.length === 0) {
            candidatesHtml = `<p class="text-muted" style="text-align:center; font-size:0.8rem;">Mencari kandidat baru untuk bulan depan...</p>`;
        } else {
            candidates.forEach(cand => {
                candidatesHtml += `
                    <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-color); border-radius:8px; padding:10px; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem; transition:all 0.2s;">
                        <div>
                            <strong style="color:#fff; display:block;">${cand.name}</strong>
                            <span style="color:var(--accent-primary); font-weight:700; font-size:0.7rem; text-transform:uppercase;">${cand.role}</span>
                            <div style="color:var(--text-muted); font-size:0.7rem; margin-top:2px;">Skill: <span style="color:#fff; font-weight:700;">${cand.skill}</span> • Speed: <span style="color:#fff; font-weight:700;">${cand.speed}x</span></div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:800; color:#ef4444; margin-bottom:4px;">$ ${financeManager.formatCurrency(cand.salary)}/bln</div>
                            <button class="btn btn-primary btn-sm btn-hire-cand" data-id="${cand.id}" style="padding:4px 10px; font-size:0.7rem; font-weight:800;">REKRUT</button>
                        </div>
                    </div>
                `;
            });
        }

        return `
            <div class="tech-tab-wrapper" style="animation: fadeIn 0.3s ease-out;">
                <!-- Top metrics row -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="card" style="border-top: 4px solid #10b981; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.3rem; font-weight: 800; letter-spacing: 0.05em;">Pendapatan Bulanan SaaS</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #10b981;">+$ ${financeManager.formatCurrency(totalMRR)}</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-muted);">MRR Aktif saat server online</div>
                    </div>
                    
                    <div class="card" style="border-top: 4px solid #ef4444; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.3rem; font-weight: 800; letter-spacing: 0.05em;">Pengeluaran Tim & Server</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #ef4444;">-$ ${financeManager.formatCurrency(totalWages + serverCost)}</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-muted);">Gaji: $ ${financeManager.formatCurrency(totalWages)} • Server: $ ${financeManager.formatCurrency(serverCost)}</div>
                    </div>
                    
                    <div class="card" style="border-top: 4px solid #3b82f6; padding: 1.25rem; background: rgba(255,255,255,0.015);">
                        <div class="text-muted" style="font-size: 0.7rem; text-transform: uppercase; margin-bottom: 0.3rem; font-weight: 800; letter-spacing: 0.05em;">Karyawan Divisi IT</div>
                        <div style="font-size: 1.65rem; font-weight: 900; color: #fff;">${employees.length} Orang</div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem; color: var(--text-muted);">Total kontrak aktif</div>
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
                                Layanan Aplikasi SaaS membutuhkan kapasitas server yang cukup untuk menampung pengguna aktif. Jika server mengalami kelebihan beban (Load > 100%), resiko server mati sangat besar. Staf DevOps/Sysadmin memulihkan atau mencegah server mati.
                            </p>

                            <!-- Server stats -->
                            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem; margin-bottom:1.5rem; text-align:center;">
                                <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:8px; padding:8px;">
                                    <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Server Utama</div>
                                    <strong style="font-size:1.1rem; color:#fff;">${servers.active} Node</strong>
                                    <span style="font-size:0.6rem; color:var(--text-muted); display:block; margin-top:2px;">Kapasitas: ${formatCompact(serverCapacity)}</span>
                                </div>
                                <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:8px; padding:8px;">
                                    <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Server Backup</div>
                                    <strong style="font-size:1.1rem; color:#fbbf24;">${servers.backup} Node</strong>
                                    <span style="font-size:0.6rem; color:var(--text-muted); display:block; margin-top:2px;">🛡️ Autopilot Failover</span>
                                </div>
                                <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:8px; padding:8px;">
                                    <div style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Beban Server</div>
                                    <strong style="font-size:1.1rem; color:${loadColor};">${serverLoadPercent}%</strong>
                                    <span style="font-size:0.6rem; color:var(--text-muted); display:block; margin-top:2px;">Total: ${formatCompact(totalUsers)} Users</span>
                                </div>
                            </div>

                            <!-- Server Action buttons -->
                            <div style="display:flex; gap:0.75rem;">
                                <button class="btn btn-secondary btn-sm" id="btn-rent-server" style="flex:1; font-weight:800; font-size:0.75rem; padding:8px;">
                                    Sewa Server Utama ($2,000)
                                </button>
                                <button class="btn btn-secondary btn-sm" id="btn-rent-backup" style="flex:1; font-weight:800; font-size:0.75rem; padding:8px;">
                                    Sewa Backup Node ($3,000)
                                </button>
                            </div>
                            
                            ${servers.status === 'offline' ? `
                                <button class="btn btn-danger btn-sm" id="btn-reboot-server" style="width:100%; font-weight:900; margin-top:0.75rem; padding:10px;">
                                    🔧 REBOOT & PEMULIHAN SISTEM ($1,500)
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

                    <!-- RIGHT COLUMN: HR & Recruitment -->
                    <div style="display:flex; flex-direction:column; gap:1.5rem;">
                        <!-- IT Team list -->
                        <div class="card" style="padding:1.5rem; border:1px solid var(--border-color); background:rgba(255,255,255,0.015); display:flex; flex-direction:column;">
                            <h3 style="margin:0 0 1.25rem 0; font-size: 1.1rem; font-weight: 900; display:flex; align-items:center; gap:0.5rem; color:#10b981;">
                                <span>👥</span> Tim Pengembang Teknologi
                            </h3>
                            <p class="text-muted" style="font-size:0.8rem; line-height:1.4; margin-bottom:1rem;">
                                Developer (mempercepat produk), Sysadmin/DevOps (stabilitas server), QA (menaikkan mutu produk), dan R&D Researcher (terobosan AI).
                            </p>
                            <div style="display:flex; flex-direction:column; max-height:240px; overflow-y:auto; padding-right:4px; gap:0.5rem; margin-bottom:0.5rem;">
                                ${employeesHtml}
                            </div>
                        </div>

                        <!-- Candidates Recruitment -->
                        <div class="card" style="padding:1.5rem; border:1px solid var(--border-color); background:rgba(255,255,255,0.015);">
                            <h3 style="margin:0 0 0.75rem 0; font-size: 1.1rem; font-weight: 900; display:flex; align-items:center; gap:0.5rem; color:#fbbf24;">
                                <span>🤝</span> Bursa Recruitment Karyawan
                            </h3>
                            <p class="text-muted" style="font-size:0.8rem; line-height:1.4; margin-bottom:1.25rem;">
                                Bursa talent disegarkan setiap bulan dengan status & skill acak.
                            </p>
                            <div style="display:flex; flex-direction:column; gap:0.8rem;">
                                ${candidatesHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents(biz, container, parentPage) {
        // Rent Server
        const btnRent = container.querySelector('#btn-rent-server');
        if (btnRent) {
            btnRent.addEventListener('click', () => {
                try {
                    businessManager.rentServer();
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        }

        // Rent Backup
        const btnBackup = container.querySelector('#btn-rent-backup');
        if (btnBackup) {
            btnBackup.addEventListener('click', () => {
                try {
                    businessManager.rentBackupServer();
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
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

        // Start Project
        const btnStartProject = container.querySelector('#btn-start-project');
        if (btnStartProject) {
            btnStartProject.addEventListener('click', () => {
                const nameInput = container.querySelector('#tech-project-name');
                const typeInput = container.querySelector('#tech-project-type');
                
                if (!nameInput || !typeInput) return;

                const name = nameInput.value.trim();
                const type = typeInput.value;

                if (!name) {
                    ui.error('Harap beri nama produk/proyek R&D baru Anda!');
                    return;
                }

                try {
                    businessManager.startNewProject(name, type);
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

        // Hire candidates
        container.querySelectorAll('.btn-hire-cand').forEach(btn => {
            btn.addEventListener('click', () => {
                const candId = btn.dataset.id;
                try {
                    businessManager.hireCandidate(candId);
                    if (parentPage) parentPage.render();
                } catch (e) {
                    ui.error(e.message);
                }
            });
        });

        // Fire employees
        container.querySelectorAll('.btn-fire-emp').forEach(btn => {
            btn.addEventListener('click', async () => {
                const empId = btn.dataset.id;
                const confirmed = await ui.confirm({
                    title: 'Putus Kontrak Kerja?',
                    message: 'Apakah Anda yakin ingin memutus hubungan kontrak kerja dengan staf ini?',
                    confirmText: 'Ya, Pecat!',
                    confirmClass: 'btn-danger'
                });
                if (confirmed) {
                    try {
                        businessManager.fireEmployee(empId);
                        if (parentPage) parentPage.render();
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });
    }
};

export default TechOpsPanel;
