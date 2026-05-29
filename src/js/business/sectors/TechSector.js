/**
 * TechSector.js - Core Technology & AI Industry Simulation Engine
 * Encapsulates monthly ticks, server load formulas, crash odds, 
 * candidate generation, and core operational methods.
 */

import gameState from '../../core/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';
import globalEconomy from '../../core/GlobalEconomy.js';

export const TechSector = {
    getTechState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.tech) {
            biz.tech = {
                servers: {
                    dataCenter: 1,
                    supercomputer: 0,
                    status: 'online', // 'online', 'offline'
                    load: 0
                },
                staff: {
                    developer: 1,
                    devops: 0,
                    qa: 0,
                    researcher: 0
                },
                products: [],
                project: null
            };
            gameState.update('business', b => ({ ...b, tech: biz.tech }));
        }

        // Backward compatibility migration
        if (biz.tech && (biz.tech.servers.active !== undefined || !biz.tech.servers.hasOwnProperty('dataCenter'))) {
            const oldTech = biz.tech;
            biz.tech = {
                servers: {
                    dataCenter: Math.max(1, oldTech.servers.active || 1),
                    supercomputer: oldTech.servers.supercomputer || 0,
                    status: oldTech.servers.status || 'online',
                    load: 0
                },
                staff: {
                    developer: 1,
                    devops: 0,
                    qa: 0,
                    researcher: 0
                },
                products: (oldTech.products || []).map(p => {
                    let newType = 'system';
                    if (p.type === 'app') newType = 'application';
                    else if (p.type === 'ai') newType = 'ai_model';
                    
                    return {
                        id: p.id,
                        name: p.name,
                        type: newType,
                        quality: p.quality || 80,
                        launchedAt: p.launchedAt || 2010,
                        users: p.users || 0,
                        monthlyRevenue: p.monthlyRevenue || 0
                    };
                }),
                project: oldTech.project ? {
                    name: oldTech.project.name,
                    type: oldTech.project.type === 'app' ? 'application' : (oldTech.project.type === 'ai' ? 'ai_model' : 'system'),
                    progress: oldTech.project.progress,
                    cost: oldTech.project.cost
                } : null
            };
            this.recalculateStaffCount(biz.tech);
            gameState.update('business', b => ({ ...b, tech: biz.tech }));
        }

        return biz.tech;
    },

    recalculateStaffCount(tech) {
        let systemCount = 0;
        let appCount = 0;
        let aiModelCount = 0;
        
        if (tech.products && Array.isArray(tech.products)) {
            tech.products.forEach(p => {
                if (p.type === 'system') systemCount++;
                else if (p.type === 'application') appCount++;
                else if (p.type === 'ai_model') aiModelCount++;
            });
        }
        
        const dcCount = tech.servers.dataCenter || 0;
        const scCount = tech.servers.supercomputer || 0;
        
        tech.staff = {
            developer: 1 + (2 * systemCount) + (5 * appCount) + (10 * aiModelCount),
            devops: (1 * systemCount) + (2 * appCount) + (4 * dcCount) + (8 * scCount),
            qa: (1 * systemCount) + (3 * appCount) + (5 * aiModelCount),
            researcher: (5 * aiModelCount)
        };
    },

    purchaseServers(type, quantity, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const tech = this.getTechState(manager);
        if (!tech) throw new Error('Bukan industri teknologi');
        
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) throw new Error('Jumlah pembelian server harus valid!');
        
        let unitCost = 100000;
        if (type === 'supercomputer') unitCost = 1000000;
        
        const totalCost = unitCost * qty;
        if (biz.cash < totalCost) {
            throw new Error(`Kas Treasury Perusahaan tidak mencukupi. Butuh $ ${financeManager.formatCurrency(totalCost)} (Kas saat ini: $ ${financeManager.formatCurrency(biz.cash)}).`);
        }
        
        if (type === 'data_center') {
            tech.servers.dataCenter = (tech.servers.dataCenter || 0) + qty;
        } else if (type === 'supercomputer') {
            tech.servers.supercomputer = (tech.servers.supercomputer || 0) + qty;
        }
        
        biz.cash -= totalCost;
        biz.valuation += totalCost * 1.2;
        
        this.recalculateStaffCount(tech);
        
        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            tech: tech
        }));
        
        if (manager && typeof manager.recalculateValuation === 'function') {
            manager.recalculateValuation();
        }
        
        const typeName = type === 'data_center' ? 'Data Center' : 'Superkomputer';
        ui.success(`Berhasil membeli ${qty} unit ${typeName}!`, '☁️ Infrastruktur Ditambah');
        return true;
    },

    sellServers(type, quantity, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const tech = this.getTechState(manager);
        if (!tech) throw new Error('Bukan industri teknologi');
        
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) throw new Error('Jumlah penjualan server harus valid!');
        
        if (type === 'data_center') {
            if ((tech.servers.dataCenter || 0) < qty) {
                throw new Error(`Anda tidak memiliki cukup Data Center untuk dijual!`);
            }
            tech.servers.dataCenter -= qty;
        } else if (type === 'supercomputer') {
            if ((tech.servers.supercomputer || 0) < qty) {
                throw new Error(`Anda tidak memiliki cukup Superkomputer untuk dijual!`);
            }
            tech.servers.supercomputer -= qty;
        }
        
        let unitRefund = 60000;
        if (type === 'supercomputer') unitRefund = 600000;
        
        const refund = unitRefund * qty;
        biz.cash += refund;
        
        const valuationLoss = (type === 'data_center' ? 120000 : 120000) * qty;
        biz.valuation = Math.max(0, biz.valuation - valuationLoss);
        
        this.recalculateStaffCount(tech);
        
        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            tech: tech
        }));
        
        if (manager && typeof manager.recalculateValuation === 'function') {
            manager.recalculateValuation();
        }
        
        const typeName = type === 'data_center' ? 'Data Center' : 'Superkomputer';
        ui.success(`Berhasil melikuidasi ${qty} unit ${typeName} seharga $ ${financeManager.formatCurrency(refund)}!`, '☁️ Infrastruktur Dijual');
        return true;
    },

    startNewProject(name, type, budget, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const tech = this.getTechState(manager);
        if (!tech) throw new Error('Bukan industri teknologi');
        
        if (tech.project) {
            throw new Error('Anda masih memiliki proyek R&D aktif yang sedang dikerjakan!');
        }
        
        let cost = 50000;
        if (type === 'application') cost = 250000;
        else if (type === 'ai_model') {
            const parsedBudget = parseInt(budget);
            if (isNaN(parsedBudget) || parsedBudget < 500000) {
                throw new Error('Anggaran (Budget) AI Model minimal adalah $ 500,000!');
            }
            cost = parsedBudget;
        }
        
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
        const typeNames = { system: 'Sistem (Security/SaaS Awal)', application: 'Aplikasi SaaS', ai_model: 'Model R&D AI' };
        ui.success(`Proyek R&D baru "${name}" (${typeNames[type]}) dengan anggaran $ ${financeManager.formatCurrency(cost)} berhasil dimulai! Tim mulai mengerjakan proyek.`, '🚀 Proyek Dimulai');
    },

    accelerateProject(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const tech = this.getTechState(manager);
        if (!tech) throw new Error('Bukan industri teknologi');
        if (!tech.project) throw new Error('Tidak ada proyek R&D aktif yang sedang dikerjakan!');
        
        const cost = 15000;
        if (biz.cash < cost) {
            throw new Error(`Kas perusahaan tidak cukup. Butuh $ ${financeManager.formatCurrency(cost)} dari kas treasury.`);
        }
        
        biz.cash -= cost;
        tech.project.progress = Math.min(100, tech.project.progress + 25);
        const completed = tech.project.progress >= 100;
        
        gameState.update('business', b => ({ ...b, cash: biz.cash, tech: tech }));
        ui.success(`⚡ AKSELERASI CLOUD: Sukses menyewa kluster HPC Cloud GPU premium seharga $ ${financeManager.formatCurrency(cost)}. Progress R&D "${tech.project.name}" melonjak instan +25%!`, '⚡ Akselerasi R&D');
        
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
        
        const cost = 15000;
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
        
        const qaCount = tech.staff.qa || 0;
        const finalQuality = Math.min(100, Math.round(60 + (qaCount * 2)));
        
        const newProduct = {
            id: 'prod_' + Date.now(),
            name: project.name,
            type: project.type,
            quality: finalQuality,
            launchedAt: gameState.get('gameTime.year') || 2010,
            users: project.type === 'ai_model' ? 0 : (project.type === 'system' ? 5000 : 20000),
            budget: project.type === 'ai_model' ? project.cost : 0,
            monthlyRevenue: 0
        };
        
        tech.products.push(newProduct);
        
        let valuationBonus = 0;
        let detailMsg = "";
        
        if (project.type === 'system') {
            valuationBonus = 100000;
            detailMsg = `Meluncurkan produk Sistem (Security/SaaS Awal) dengan 5.000 pengguna awal. Valuasi korporasi bertambah +$ ${financeManager.formatCurrency(valuationBonus)}.`;
        } else if (project.type === 'application') {
            valuationBonus = 750000;
            detailMsg = `Meluncurkan Layanan Aplikasi SaaS dengan 20.000 pengguna awal. Valuasi korporasi meningkat +$ ${financeManager.formatCurrency(valuationBonus)} secara permanen.`;
        } else if (project.type === 'ai_model') {
            valuationBonus = project.cost * 3.0;
            detailMsg = `Terobosan Model AI Berhasil Diciptakan dengan anggaran $ ${financeManager.formatCurrency(project.cost)}! Valuasi korporasi melonjak drastis sebesar +$ ${financeManager.formatCurrency(valuationBonus)} secara permanen! Model ini membutuhkan Superkomputer untuk diaktifkan.`;
            biz.rdLevel = (biz.rdLevel || 1) + 2;
        }
        
        biz.valuation += valuationBonus;
        
        this.recalculateStaffCount(tech);
        
        gameState.update('business', b => ({
            ...b,
            valuation: biz.valuation,
            rdLevel: biz.rdLevel,
            tech: tech
        }));
        
        if (manager && typeof manager.recalculateValuation === 'function') {
            manager.recalculateValuation();
        }
        
        ui.success(`🚀 PRODUK DILUNCURKAN: "${project.name}" (Mutu: ★${finalQuality}) sukses dilepas ke pasar! ${detailMsg}`, '🚀 Proyek Dirilis');
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const tech = this.getTechState(manager);
        if (!tech) return { wages: 0, cost: 0, revenue: 0 };

        this.recalculateStaffCount(tech);

        if (tech.project) {
            const devCount = tech.staff.developer || 1;
            const resCount = tech.staff.researcher || 0;
            
            let progressGain = 5;
            if (tech.project.type === 'system' || tech.project.type === 'application') {
                progressGain += (devCount * 1.5);
            } else if (tech.project.type === 'ai_model') {
                progressGain += (devCount * 0.8) + (resCount * 2.0);
            }

            if (managers.ops) progressGain *= 1.25;

            tech.project.progress = Math.min(100, tech.project.progress + Math.round(progressGain));

            if (tech.project.progress >= 100) {
                this.launchTechProduct(tech.project, manager);
                tech.project = null;
            }
        }

        let totalUsers = 0;
        let techRevenue = 0;
        let activeProductsCount = 0;
        
        const econMult = globalEconomy.getDemandMultiplier('tech');

        (tech.products || []).forEach(prod => {
            if (prod.type === 'system' || prod.type === 'application') {
                activeProductsCount++;
                
                let growthRate = prod.type === 'system' ? 0.03 : 0.05;
                
                if (biz.marketingCampaign === 'local') growthRate += 0.02;
                else if (biz.marketingCampaign === 'social') growthRate += 0.05;
                else if (biz.marketingCampaign === 'global') growthRate += 0.12;

                if (initiatives.tech_global_server) {
                    growthRate += 0.04;
                }

                growthRate += (prod.quality / 100) * 0.03;
                growthRate *= econMult;

                if (tech.servers.status === 'offline') {
                    prod.users = Math.max(100, Math.round(prod.users * 0.80));
                    prod.monthlyRevenue = 0;
                } else {
                    prod.users = Math.round(prod.users * (1 + growthRate));
                    const pricePerUser = prod.type === 'system' ? 1.50 : 2.50;
                    prod.monthlyRevenue = Math.round(prod.users * pricePerUser);
                    techRevenue += prod.monthlyRevenue;
                }

                totalUsers += prod.users;
            }
        });

        const dataCenters = tech.servers.dataCenter || 1;
        const serverCapacity = dataCenters * 100000;
        let serverLoad = 0;
        if (serverCapacity > 0) {
            serverLoad = parseFloat((totalUsers / serverCapacity).toFixed(2));
        }
        tech.servers.load = serverLoad;

        if (activeProductsCount > 0 && tech.servers.status === 'online') {
            let crashChance = 3;
            if (serverLoad > 1.0) {
                crashChance += (serverLoad - 1.0) * 40;
            }

            const devOpsCount = tech.staff.devops || 0;
            const devOpsReduction = devOpsCount * 2.5;
            
            let initiativeReduction = 0;
            if (initiatives.tech_opt_app) {
                initiativeReduction = 5;
            }

            crashChance = Math.max(1, crashChance - devOpsReduction - initiativeReduction);

            if (Math.random() * 100 < crashChance) {
                tech.servers.status = 'offline';
                ui.error(`🚨 SERVER DOWN! Server Data Center Anda mati akibat kelebihan beban (Load: ${Math.round(serverLoad * 100)}%). Layanan SaaS offline, pendapatan sistem/aplikasi $0!`, '🚨 System Crash');
            }
        } else if (tech.servers.status === 'offline') {
            const devOpsCount = tech.staff.devops || 0;
            let sysadminRestoreChance = 10 + (devOpsCount * 4);
            if (Math.random() * 100 < sysadminRestoreChance) {
                tech.servers.status = 'online';
                ui.success(`🟢 SERVER PULIH: Tim DevOps Anda berhasil memulihkan Data Center agar kembali online!`, '🟢 System Restored');
            }
        }

        let supercomputers = tech.servers.supercomputer || 0;
        let offlineAIModels = 0;

        (tech.products || []).forEach(prod => {
            if (prod.type === 'ai_model') {
                if (supercomputers > 0) {
                    supercomputers--;
                    // Low operational cost, high revenue: 12% yield on budget per month
                    const baseAIRev = (prod.budget || 1500000) * 0.12;
                    const qualityMult = prod.quality / 100;
                    
                    prod.monthlyRevenue = Math.round(baseAIRev * qualityMult);
                    techRevenue += prod.monthlyRevenue;
                } else {
                    offlineAIModels++;
                    prod.monthlyRevenue = 0;
                }
            }
        });

        if (offlineAIModels > 0) {
            ui.info(`🤖 Peringatan: Terdapat ${offlineAIModels} Model AI tidak aktif karena kekurangan Superkomputer. Beli Superkomputer tambahan untuk mengaktifkannya!`, '🤖 AI Model Offline');
        }

        let revMultiplier = 1.0;
        if (initiatives.tech_ai_features) revMultiplier += 0.15;
        if (initiatives.tech_global_server) revMultiplier += 0.20;
        
        techRevenue = Math.round(techRevenue * revMultiplier);

        const devWages = tech.staff.developer * 1500;
        const devopsWages = tech.staff.devops * 1800;
        const qaWages = tech.staff.qa * 1200;
        const researcherWages = tech.staff.researcher * 3000;
        const totalWages = devWages + devopsWages + qaWages + researcherWages;

        let serverCost = (tech.servers.dataCenter || 1) * 2500 + (tech.servers.supercomputer || 0) * 30000;
        
        if (initiatives.tech_opt_app) {
            serverCost *= 0.90;
        }

        gameState.update('business', b => ({ ...b, tech: tech }));

        return {
            wages: totalWages,
            cost: Math.round(serverCost),
            revenue: techRevenue
        };
    }
};

export default TechSector;
