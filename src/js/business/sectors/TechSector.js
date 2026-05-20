/**
 * TechSector.js - Core Technology & AI Industry Simulation Engine
 * Encapsulates monthly ticks, server load formulas, crash odds, 
 * candidate generation, and core operational methods.
 */

import gameState from '../../game/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';

export const TechSector = {
    getTechState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.tech) {
            biz.tech = {
                servers: {
                    active: 1,
                    backup: 0,
                    status: 'online', // 'online', 'offline'
                    load: 0,
                    capacity: 10000,
                    maintenanceCost: 400
                },
                employees: [
                    { id: 'emp_init', name: 'Alif R. (Founder)', role: 'Developer', speed: 1.2, skill: 75, salary: 1000 }
                ],
                candidates: this.generateRandomCandidates(3),
                products: [],
                project: null
            };
            gameState.update('business', b => ({ ...b, tech: biz.tech }));
        }
        return biz.tech;
    },

    generateRandomCandidates(count) {
        const firstNames = ['Budi', 'Joko', 'Andi', 'Siti', 'Dewi', 'Rian', 'Eko', 'Rudi', 'Lisa', 'Agus', 'Kevin', 'Sarah', 'Alex', 'David', 'Jane'];
        const lastNames = ['Pratama', 'Santoso', 'Hidayat', 'Kusuma', 'Saputra', 'Wijaya', 'Lestari', 'Siregar', 'Wibowo', 'Tan', 'Miller', 'Smith', 'Lee'];
        const roles = ['Developer', 'DevOps/Sysadmin', 'QA', 'R&D Researcher'];
        
        const candidates = [];
        for (let i = 0; i < count; i++) {
            const name = firstNames[Math.floor(Math.random() * firstNames.length)] + ' ' + lastNames[Math.floor(Math.random() * lastNames.length)];
            const role = roles[Math.floor(Math.random() * roles.length)];
            const skill = Math.floor(Math.random() * 41) + 60; // 60 - 100 skill
            const speed = parseFloat((Math.random() * 1.5 + 0.8).toFixed(1)); // 0.8x - 2.3x speed
            const salary = Math.round((skill * 15 + speed * 600) * (role === 'R&D Researcher' ? 1.2 : 1.0));
            candidates.push({
                id: 'cand_' + Math.random().toString(36).substr(2, 9),
                name,
                role,
                skill,
                speed,
                salary
            });
        }
        return candidates;
    },

    hireCandidate(candidateId, manager) {
        const tech = this.getTechState(manager);
        if (!tech) throw new Error('Bukan industri teknologi');
        
        const index = tech.candidates.findIndex(c => c.id === candidateId);
        if (index === -1) throw new Error('Kandidat tidak ditemukan');
        
        const candidate = tech.candidates[index];
        
        tech.employees.push(candidate);
        tech.candidates.splice(index, 1);
        
        gameState.update('business', b => ({ ...b, tech: tech }));
        ui.success(`Berhasil merekrut ${candidate.name} sebagai ${candidate.role}!`, '👔 Rekrutmen Sukses');
    },

    fireEmployee(employeeId, manager) {
        const tech = this.getTechState(manager);
        if (!tech) throw new Error('Bukan industri teknologi');
        
        const index = tech.employees.findIndex(e => e.id === employeeId);
        if (index === -1) throw new Error('Karyawan tidak ditemukan');
        
        const emp = tech.employees[index];
        if (emp.id === 'emp_init') {
            throw new Error('Anda tidak dapat memecat diri Anda sendiri (Founder)!');
        }
        
        tech.employees.splice(index, 1);
        
        gameState.update('business', b => ({ ...b, tech: tech }));
        ui.success(`Berhasil memutus kontrak kerja ${emp.name}.`, '❌ Kontrak Diputus');
    },

    rentServer(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const tech = this.getTechState(manager);
        if (!tech) throw new Error('Bukan industri teknologi');
        
        const cost = 2000;
        if (biz.cash < cost) {
            throw new Error(`Kas perusahaan tidak cukup. Butuh $ ${financeManager.formatCurrency(cost)} dari kas treasury.`);
        }
        
        tech.servers.active += 1;
        biz.cash -= cost;
        
        gameState.update('business', b => ({ ...b, cash: biz.cash, tech: tech }));
        ui.success(`Server Node Baru Berhasil Disewa! Kapasitas bertambah +10,000 pengguna.`, '☁️ Server Ditambah');
    },

    rentBackupServer(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const tech = this.getTechState(manager);
        if (!tech) throw new Error('Bukan industri teknologi');
        
        const cost = 3000;
        if (biz.cash < cost) {
            throw new Error(`Kas perusahaan tidak cukup. Butuh $ ${financeManager.formatCurrency(cost)} dari kas treasury.`);
        }
        
        tech.servers.backup += 1;
        biz.cash -= cost;
        
        gameState.update('business', b => ({ ...b, cash: biz.cash, tech: tech }));
        ui.success(`Backup Server Berhasil Disewa! Node ini siap mengambil alih otomatis jika server utama mengalami downtime.`, '🛡️ Backup Disewa');
    },

    startNewProject(name, type, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const tech = this.getTechState(manager);
        if (!tech) throw new Error('Bukan industri teknologi');
        
        if (tech.project) {
            throw new Error('Anda masih memiliki proyek R&D aktif yang sedang dikerjakan!');
        }
        
        let cost = 5000;
        if (type === 'phone') cost = 15000;
        else if (type === 'ai') cost = 30000;
        
        if (biz.cash < cost) {
            throw new Error(`Kas perusahaan tidak cukup untuk memulai proyek. Butuh $ ${financeManager.formatCurrency(cost)} dari kas treasury.`);
        }
        
        tech.project = {
            name: name,
            type: type,
            progress: 0,
            cost: cost
        };
        
        biz.cash -= cost;
        
        gameState.update('business', b => ({ ...b, cash: biz.cash, tech: tech }));
        const typeNames = { computer: 'Hardware Komputer', phone: 'Smartphone Flagship', app: 'Aplikasi SaaS Cloud', ai: 'Model R&D AI' };
        ui.success(`Proyek R&D baru "${name}" (${typeNames[type]}) berhasil dimulai! Tim mulai mengerjakan proyek.`, '🚀 Proyek Dimulai');
    },

    accelerateProject(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const tech = this.getTechState(manager);
        if (!tech) throw new Error('Bukan industri teknologi');
        if (!tech.project) throw new Error('Tidak ada proyek R&D aktif yang sedang dikerjakan!');
        
        const cost = 10000;
        if (biz.cash < cost) {
            throw new Error(`Kas perusahaan tidak cukup. Butuh $ ${financeManager.formatCurrency(cost)} dari kas treasury.`);
        }
        
        biz.cash -= cost;
        tech.project.progress = Math.min(100, tech.project.progress + 25);
        const completed = tech.project.progress >= 100;
        
        gameState.update('business', b => ({ ...b, cash: biz.cash, tech: tech }));
        ui.success(`⚡ AKSELERASI CLOUD: Sukses menyewa kluster HPC Cloud GPU premium seharga $ 10,000. Progress R&D "${tech.project.name}" melonjak instan +25%!`, '⚡ Akselerasi R&D');
        
        if (completed) {
            this.launchTechProduct(tech.project, manager);
            tech.project = null;
            gameState.update('business', b => ({ ...b, tech: tech }));
        }
        
        return true;
    },

    rebootServers(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const tech = this.getTechState(manager);
        if (!tech) throw new Error('Bukan industri teknologi');
        
        if (tech.servers.status === 'online') {
            throw new Error('Server saat ini dalam keadaan online dan berfungsi dengan baik.');
        }
        
        const cost = 1500;
        if (biz.cash < cost) {
            throw new Error(`Kas tidak cukup untuk membayar jasa teknisi luar ($ ${financeManager.formatCurrency(cost)})`);
        }
        
        tech.servers.status = 'online';
        biz.cash -= cost;
        
        gameState.update('business', b => ({ ...b, cash: biz.cash, tech: tech }));
        ui.success(`Server utama berhasil di-reboot dan dipulihkan sepenuhnya oleh tim DevOps!`, '🟢 Server Online');
    },

    launchTechProduct(project, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;
        const tech = biz.tech;
        if (!tech) return;
        
        let qaSkillSum = 0;
        let qaCount = 0;
        tech.employees.forEach(emp => {
            if (emp.role === 'QA') {
                qaSkillSum += emp.skill;
                qaCount++;
            }
        });
        
        let finalQuality = Math.min(100, 50 + (qaCount > 0 ? (qaSkillSum / qaCount) * 0.5 : 0));
        finalQuality = Math.round(finalQuality);
        
        const newProduct = {
            id: 'prod_' + Date.now(),
            name: project.name,
            type: project.type,
            quality: finalQuality,
            launchedAt: gameState.get('gameTime.year'),
            users: project.type === 'app' ? 5000 : 0,
            monthlyRevenue: 0
        };
        
        tech.products.push(newProduct);
        
        let cashBonus = 0;
        let valuationBonus = 0;
        let detailMsg = "";
        
        if (project.type === 'computer') {
            cashBonus = 40000 + (finalQuality * 400);
            valuationBonus = 60000;
            detailMsg = `Meluncurkan produk Komputer Hardware. Penjualan perdana menghasilkan kas instant +$ ${financeManager.formatCurrency(cashBonus)}!`;
        } else if (project.type === 'phone') {
            cashBonus = 95000 + (finalQuality * 800);
            valuationBonus = 180000;
            detailMsg = `Meluncurkan produk Smartphone Flagship. Penjualan perdana menghasilkan kas instant +$ ${financeManager.formatCurrency(cashBonus)}!`;
        } else if (project.type === 'app') {
            valuationBonus = 120000;
            detailMsg = `Meluncurkan Layanan Aplikasi SaaS Cloud dengan 5,000 pengguna awal. SaaS akan menghasilkan pendapatan bulanan (MRR) berdasarkan pengguna.`;
        } else if (project.type === 'ai') {
            valuationBonus = 350000;
            detailMsg = `Terobosan AI R&D Model berhasil diciptakan! Valuasi korporasi melonjak drastis sebesar +$ ${financeManager.formatCurrency(valuationBonus)} karena daya tarik investor yang luar biasa!`;
            biz.rdLevel = (biz.rdLevel || 1) + 2;
        }
        
        biz.cash += cashBonus;
        biz.valuation += valuationBonus;
        
        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            rdLevel: biz.rdLevel,
            tech: tech
        }));
        
        manager.recalculateValuation();
        ui.success(`🚀 PRODUK DILUNCURKAN: "${project.name}" (Mutu: ★${finalQuality}) sukses dilepas ke pasar! ${detailMsg}`, '🚀 Proyek Dirilis');
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const tech = this.getTechState(manager);
        if (!tech) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Process active project progress
        if (tech.project) {
            let devSpeedSum = 0;
            let devCount = 0;
            let rdSpeedSum = 0;
            let rdCount = 0;

            tech.employees.forEach(emp => {
                if (emp.role === 'Developer') {
                    devSpeedSum += emp.speed * (emp.skill / 100);
                    devCount++;
                } else if (emp.role === 'R&D Researcher') {
                    rdSpeedSum += emp.speed * (emp.skill / 100);
                    rdCount++;
                }
            });

            let progressGain = 5;
            if (tech.project.type === 'computer' || tech.project.type === 'phone' || tech.project.type === 'app') {
                progressGain += (devSpeedSum * 15);
            } else if (tech.project.type === 'ai') {
                progressGain += (rdSpeedSum * 12 + devSpeedSum * 6);
            }

            if (managers.ops) progressGain *= 1.25;

            tech.project.progress = Math.min(100, tech.project.progress + Math.round(progressGain));

            if (tech.project.progress >= 100) {
                this.launchTechProduct(tech.project, manager);
                tech.project = null;
            }
        }

        // 2. SaaS User Growth & Revenue
        let totalSaaSUsers = 0;
        let activeSaaSProductsCount = 0;
        let techSaaSRevenue = 0;

        tech.products.forEach(prod => {
            if (prod.type === 'app') {
                activeSaaSProductsCount++;
                let growthRate = 0.04;
                if (biz.marketingCampaign === 'local') growthRate += 0.03;
                else if (biz.marketingCampaign === 'social') growthRate += 0.08;
                else if (biz.marketingCampaign === 'global') growthRate += 0.18;

                growthRate += (prod.quality / 100) * 0.04;

                if (tech.servers.status === 'offline') {
                    prod.users = Math.max(100, Math.round(prod.users * 0.85));
                    prod.monthlyRevenue = 0;
                } else {
                    prod.users = Math.round(prod.users * (1 + growthRate));
                    prod.monthlyRevenue = Math.round((prod.users / 1000) * 150);
                    techSaaSRevenue += prod.monthlyRevenue;
                }

                totalSaaSUsers += prod.users;
            }
        });

        // 3. Server Capacity & Load
        const serverCapacity = tech.servers.active * tech.servers.capacity;
        let serverLoad = 0;
        if (serverCapacity > 0) {
            serverLoad = parseFloat((totalSaaSUsers / serverCapacity).toFixed(2));
        }
        tech.servers.load = serverLoad;

        // 4. Server crash chance
        if (activeSaaSProductsCount > 0 && tech.servers.status === 'online') {
            let crashChance = 5;
            if (serverLoad > 1.0) {
                crashChance += (serverLoad - 1.0) * 50;
            }

            let sysadminSkillSum = 0;
            tech.employees.forEach(emp => {
                if (emp.role === 'DevOps/Sysadmin') {
                    sysadminSkillSum += emp.skill;
                }
            });
            const devOpsReduction = sysadminSkillSum / 4;
            crashChance = Math.max(1, crashChance - devOpsReduction);

            if (Math.random() * 100 < crashChance) {
                if (tech.servers.backup > 0) {
                    tech.servers.backup -= 1;
                    ui.success(`🛡️ FAILOVER AKTIF: Server utama sempat down, namun Backup Server otomatis mengambil alih! Downtime berhasil dihindari. Sisa backup: ${tech.servers.backup}`, '🛡️ Backup Failover');
                } else {
                    tech.servers.status = 'offline';
                    ui.error(`🚨 SERVER DOWN! Server utama perusahaan Anda mati akibat kelebihan beban (Load: ${Math.round(serverLoad * 100)}%). Aplikasi SaaS offline, pendapatan bulanan $0!`, '🚨 System Crash');
                }
            }
        } else if (tech.servers.status === 'offline') {
            let sysadminRestoreChance = 20;
            tech.employees.forEach(emp => {
                if (emp.role === 'DevOps/Sysadmin') {
                    sysadminRestoreChance += (emp.skill * emp.speed) / 2;
                }
            });

            if (Math.random() * 100 < sysadminRestoreChance) {
                tech.servers.status = 'online';
                ui.success(`🟢 SERVER PULIH: Tim IT/Sysadmin Anda berhasil memperbaiki dan memulihkan server utama agar kembali online!`, '🟢 System Restored');
            }
        }

        // 5. Calculate expenses
        let techWages = 0;
        tech.employees.forEach(emp => {
            techWages += emp.salary;
        });
        const techServerCost = tech.servers.active * 400 + tech.servers.backup * 200;

        tech.candidates = this.generateRandomCandidates(3);

        gameState.update('business', b => ({ ...b, tech: tech }));

        return {
            wages: techWages,
            cost: techServerCost,
            revenue: techSaaSRevenue
        };
    }
};

export default TechSector;
