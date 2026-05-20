/**
 * FinanceSector.js - Core Financial Services & Banking Simulation Engine
 * Models retail bank deposits, loan portfolios, Net Interest Margin (NIM),
 * actuarial insurance premium/claims, and custom bond / project financing syndications.
 */

import gameState from '../../game/GameState.js';
import financeManager from '../../finance/FinanceManager.js';
import ui from '../../ui/UIManager.js';

export const FinanceSector = {
    getFinanceState(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return null;
        if (!biz.finance) {
            biz.finance = {
                rates: {
                    depositRate: 4.5, // 4.5% annual deposit interest rate (what bank pays to savers)
                    lendingRate: 12.0, // 12.0% annual lending rate (what borrowers pay)
                    premiumRate: 'medium', // 'low', 'medium', 'high'
                },
                bank: {
                    depositsPool: 300000, // Retail deposits in bank (savers' money)
                    activeLoans: 220000, // Invested loans generating interest
                    nplRate: 2.0, // Non-performing loans percentage (default risk)
                    reserveRatio: 10, // 10% cash reserve requirement
                },
                insurance: {
                    activePolicies: 1500,
                    premiumFactor: 12, // $12 per policy monthly
                    lastClaimPayout: 0
                },
                portfolio: {
                    blueChipShares: 0,
                    avgBuyPrice: 0,
                    valuation: 0
                },
                employees: [
                    { id: 'fin_init', name: 'Rian K. (Founder)', role: 'Credit Analyst', speed: 1.1, skill: 70, salary: 1200 }
                ],
                candidates: this.generateRandomCandidates(3),
                products: [], // Completed financed corporate deals
                project: null // Current financed corporate project
            };
            gameState.update('business', b => ({ ...b, finance: biz.finance }));
        }
        return biz.finance;
    },

    generateRandomCandidates(count) {
        const firstNames = ['Bambang', 'Joko', 'Andi', 'Siti', 'Dewi', 'Rian', 'Eko', 'Rudi', 'Lisa', 'Agus', 'Kevin', 'Sarah', 'Alex', 'David', 'Jane'];
        const lastNames = ['Pratama', 'Santoso', 'Hidayat', 'Kusuma', 'Saputra', 'Wijaya', 'Lestari', 'Siregar', 'Wibowo', 'Tan', 'Lubis', 'Halim', 'Smith', 'Lee'];
        const roles = ['Credit Analyst', 'Actuary/Underwriter', 'Portfolio Analyst'];
        
        const candidates = [];
        for (let i = 0; i < count; i++) {
            const name = firstNames[Math.floor(Math.random() * firstNames.length)] + ' ' + lastNames[Math.floor(Math.random() * lastNames.length)];
            const role = roles[Math.floor(Math.random() * roles.length)];
            const skill = Math.floor(Math.random() * 41) + 60; // 60 - 100 skill
            const speed = parseFloat((Math.random() * 1.5 + 0.8).toFixed(1)); // 0.8x - 2.3x speed
            const salary = Math.round((skill * 14 + speed * 500) * (role === 'Actuary/Underwriter' ? 1.15 : 1.0));
            candidates.push({
                id: 'cand_fin_' + Math.random().toString(36).substr(2, 9),
                name,
                role,
                skill,
                speed,
                salary
            });
        }
        return candidates;
    },

    adjustRates(depositRate, lendingRate, premiumRate, manager) {
        const finance = this.getFinanceState(manager);
        if (!finance) throw new Error('Bukan industri jasa keuangan');

        if (depositRate < 0.5 || depositRate > 15) throw new Error('Suku bunga deposito harus berada di kisaran 0.5% - 15.0%');
        if (lendingRate < 2.0 || lendingRate > 35) throw new Error('Suku bunga pinjaman harus berada di kisaran 2.0% - 35.0%');
        
        finance.rates.depositRate = parseFloat(depositRate.toFixed(2));
        finance.rates.lendingRate = parseFloat(lendingRate.toFixed(2));
        finance.rates.premiumRate = premiumRate;

        gameState.update('business', b => ({ ...b, finance }));
        ui.success('Suku bunga simpanan/pinjaman & tarif asuransi berhasil dikalibrasi ulang!', '⚖️ Kebijakan Moneter');
    },

    hireCandidate(candidateId, manager) {
        const finance = this.getFinanceState(manager);
        if (!finance) throw new Error('Bukan industri jasa keuangan');
        
        const index = finance.candidates.findIndex(c => c.id === candidateId);
        if (index === -1) throw new Error('Kandidat tidak ditemukan');
        
        const candidate = finance.candidates[index];
        finance.employees.push(candidate);
        finance.candidates.splice(index, 1);
        
        gameState.update('business', b => ({ ...b, finance }));
        ui.success(`Berhasil merekrut ${candidate.name} sebagai ${candidate.role}!`, '👔 Keuangan Rekrutmen');
    },

    fireEmployee(employeeId, manager) {
        const finance = this.getFinanceState(manager);
        if (!finance) throw new Error('Bukan industri jasa keuangan');
        
        const index = finance.employees.findIndex(e => e.id === employeeId);
        if (index === -1) throw new Error('Karyawan tidak ditemukan');
        
        const emp = finance.employees[index];
        if (emp.id === 'fin_init') {
            throw new Error('Anda tidak dapat memecat diri Anda sendiri (Founder)!');
        }
        
        finance.employees.splice(index, 1);
        gameState.update('business', b => ({ ...b, finance }));
        ui.success(`Berhasil memutus kontrak kerja ${emp.name}.`, '❌ Kontrak Diputus');
    },

    startCorporateDeal(name, type, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const finance = this.getFinanceState(manager);
        if (!finance) throw new Error('Bukan industri jasa keuangan');
        
        if (finance.project) {
            throw new Error('Anda memiliki kesepakatan pembiayaan proyek aktif yang sedang berjalan!');
        }
        
        let cost = 15000; // Startup Debt
        if (type === 'green_infra') cost = 45000; // Green Infrastructure
        else if (type === 'bluechip_syndicate') cost = 90000; // Blue-chip syndication
        
        if (biz.cash < cost) {
            throw new Error(`Kas korporasi tidak cukup. Butuh $ ${financeManager.formatCurrency(cost)} dari treasury.`);
        }
        
        finance.project = {
            name,
            type,
            progress: 0,
            cost,
            status: 'active'
        };
        
        biz.cash -= cost;
        gameState.update('business', b => ({ ...b, cash: biz.cash, finance }));
        ui.success(`Deal Sindikasi Pembiayaan "${name}" resmi didanai! Tim analis mulai mengevaluasi pelepasan modal progresif.`, '💼 Pembiayaan Dimulai');
    },

    startCustomCorporateDeal(name, totalValue, couponRate, tenor, playerShare, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const finance = this.getFinanceState(manager);
        if (!finance) throw new Error('Bukan industri jasa keuangan');

        if (finance.project) {
            throw new Error('Anda memiliki kesepakatan pembiayaan proyek aktif yang sedang berjalan!');
        }

        if (totalValue <= 0) throw new Error('Nilai pembiayaan harus lebih besar dari 0!');
        if (couponRate < 3 || couponRate > 18) throw new Error('Suku bunga kupon harus berkisar antara 3% hingga 18%!');
        if (tenor < 12 || tenor > 60) throw new Error('Tenor harus berkisar antara 12 hingga 60 bulan!');
        if (playerShare <= 0 || playerShare > totalValue) throw new Error('Komitmen investasi Anda tidak valid!');
        
        if (biz.cash < playerShare) {
            throw new Error(`Kas treasury tidak cukup untuk mendanai komitmen modal Anda sebesar $ ${financeManager.formatCurrency(playerShare)}!`);
        }

        finance.project = {
            name,
            type: 'custom_syndicate',
            totalValue,
            couponRate,
            tenor,
            playerShare,
            syndicateShare: totalValue - playerShare,
            subscribedAmount: 0,
            subscribers: [],
            progress: 0,
            status: totalValue === playerShare ? 'active' : 'funding',
            cost: playerShare
        };

        biz.cash -= playerShare;
        gameState.update('business', b => ({ ...b, cash: biz.cash, finance }));
        
        if (finance.project.status === 'active') {
            ui.success(`🎉 OBLIGASI DITERBITKAN: Pembiayaan proyek "${name}" didanai penuh oleh kas internal Anda! Analisis progresif dimulai.`, 'Obligasi Dirilis');
        } else {
            ui.success(`🤝 SINDICATE DITERBITKAN: Kuota sindikasi proyek "${name}" senilai $ ${financeManager.formatCurrency(totalValue - playerShare)} dipasarkan. Menunggu konsorsium AI!`, 'Sindikasi Dimulai');
        }
    },

    accelerateDeal(manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const finance = this.getFinanceState(manager);
        if (!finance) throw new Error('Bukan industri jasa keuangan');
        if (!finance.project) throw new Error('Tidak ada kesepakatan pembiayaan aktif!');
        if (finance.project.status === 'funding') throw new Error('Proyek harus fully-subscribed sebelum dapat dipercepat!');
        
        const cost = 8000;
        if (biz.cash < cost) {
            throw new Error(`Kas korporasi tidak cukup. Butuh $ ${financeManager.formatCurrency(cost)}.`);
        }
        
        biz.cash -= cost;
        finance.project.progress = Math.min(100, finance.project.progress + 25);
        const completed = finance.project.progress >= 100;
        
        gameState.update('business', b => ({ ...b, cash: biz.cash, finance }));
        ui.success(`⚡ AKSES AUDIT CEPAT: Sukses membayar audit hukum dan asuransi jaminan eksternal seharga $ 8,000. Progress deal "${finance.project.name}" melonjak +25%!`, '⚡ Audit Cepat');
        
        if (completed) {
            this.launchFinanceProduct(finance.project, manager);
            finance.project = null;
            gameState.update('business', b => ({ ...b, finance }));
        }
    },

    launchFinanceProduct(project, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) return;
        const finance = biz.finance;
        if (!finance) return;
        
        let analystSkillSum = 0;
        let analystCount = 0;
        finance.employees.forEach(emp => {
            if (emp.role === 'Credit Analyst') {
                analystSkillSum += emp.skill;
                analystCount++;
            }
        });
        
        const dealQuality = Math.min(100, 60 + (analystCount > 0 ? (analystSkillSum / analystCount) * 0.4 : 0));
        const finalQuality = Math.round(dealQuality);
        
        if (project.type === 'custom_syndicate') {
            const playerSharePct = project.playerShare / project.totalValue;
            const valuationBonus = Math.round(project.totalValue * playerSharePct * 1.5);
            const monthlyCouponYield = Math.round((project.playerShare * (project.couponRate / 100)) / 12);
            
            const newProduct = {
                id: 'deal_custom_' + Date.now(),
                name: project.name,
                type: 'custom_syndicate',
                quality: finalQuality,
                totalValue: project.totalValue,
                playerShare: project.playerShare,
                couponRate: project.couponRate,
                monthlyRevenue: monthlyCouponYield,
                monthsRemaining: project.tenor,
                totalTenor: project.tenor,
                valuationBonus
            };
            
            biz.valuation += valuationBonus;
            finance.products.push(newProduct);
            
            gameState.update('business', b => ({
                ...b,
                valuation: biz.valuation,
                finance
            }));
            
            manager.recalculateValuation();
            ui.success(`🚀 PROYEK SELESAI: Proyek Sindikasi Obligasi "${project.name}" resmi rampung! Valuasi Aset bertambah +$ ${financeManager.formatCurrency(valuationBonus)} dan Anda akan menerima pembayaran kupon obligasi sebesar +$ ${financeManager.formatCurrency(monthlyCouponYield)}/bulan selama ${project.tenor} bulan kedepan!`, 'Obligasi Rampung');
            return;
        }

        const newProduct = {
            id: 'deal_' + Date.now(),
            name: project.name,
            type: project.type,
            quality: finalQuality,
            monthlyRevenue: 0
        };
        
        let valuationBonus = 0;
        let recurringRevenue = 0;
        let detailMsg = "";
        
        if (project.type === 'startup_debt') {
            valuationBonus = 35000;
            recurringRevenue = 1800 + (finalQuality * 10);
            detailMsg = `Mendanai Startup Ventures. Menghasilkan bunga pinjaman bulanan tetap seharga +$ ${financeManager.formatCurrency(recurringRevenue)}/bulan.`;
        } else if (project.type === 'green_infra') {
            valuationBonus = 110000;
            recurringRevenue = 4200 + (finalQuality * 25);
            detailMsg = `Proyek Infrastruktur Hijau terdanai. Menghasilkan yield bulanan berkelanjutan seharga +$ ${financeManager.formatCurrency(recurringRevenue)}/bulan.`;
        } else if (project.type === 'bluechip_syndicate') {
            valuationBonus = 240000;
            recurringRevenue = 8500 + (finalQuality * 50);
            detailMsg = `Sindikasi Utang Perusahaan Bluechip selesai. Memberikan bunga yield obligasi seharga +$ ${financeManager.formatCurrency(recurringRevenue)}/bulan.`;
        }
        
        biz.valuation += valuationBonus;
        newProduct.monthlyRevenue = Math.round(recurringRevenue);
        finance.products.push(newProduct);
        
        gameState.update('business', b => ({
            ...b,
            valuation: biz.valuation,
            finance
        }));
        
        manager.recalculateValuation();
        ui.success(`🚀 DEAL RAMPUNG: Pembiayaan obligasi "${project.name}" (Kualitas Deal: ★${finalQuality}) resmi diluncurkan! ${detailMsg}`, '🚀 Deal Dirilis');
    },

    buyBlueChipEquity(sharesCount, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const finance = this.getFinanceState(manager);
        if (!finance) throw new Error('Bukan industri jasa keuangan');
        
        if (sharesCount <= 0) throw new Error('Jumlah lembar saham tidak valid');
        
        // Let's assume corporate price of bluechip indices is fixed at $250/share
        const sharePrice = 250;
        const totalCost = sharesCount * sharePrice;
        
        if (biz.cash < totalCost) {
            throw new Error(`Kas korporasi tidak cukup. Butuh $ ${financeManager.formatCurrency(totalCost)} dari kas treasury.`);
        }
        
        biz.cash -= totalCost;
        
        const currentShares = finance.portfolio.blueChipShares || 0;
        const newShares = currentShares + sharesCount;
        
        // Calculate new average buy price
        const currentVal = currentShares * (finance.portfolio.avgBuyPrice || sharePrice);
        const newAvg = Math.round((currentVal + totalCost) / newShares);
        
        finance.portfolio.blueChipShares = newShares;
        finance.portfolio.avgBuyPrice = newAvg;
        finance.portfolio.valuation = newShares * sharePrice;
        
        // Add to business valuation assets
        biz.valuation += Math.round(totalCost * 1.25); // Holding discount asset appreciation
        
        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            finance
        }));
        
        manager.recalculateValuation();
        ui.success(`📈 HOLDING INVESTASI: Holding korporasi berhasil membeli ${sharesCount} lembar saham Blue-Chip indeks seharga $ ${financeManager.formatCurrency(totalCost)}!`, '💎 Portofolio Ditambah');
    },

    sellBlueChipEquity(sharesCount, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const finance = this.getFinanceState(manager);
        if (!finance) throw new Error('Bukan industri jasa keuangan');
        
        const currentShares = finance.portfolio.blueChipShares || 0;
        if (sharesCount <= 0 || sharesCount > currentShares) throw new Error('Saldo kepemilikan saham holding tidak cukup');
        
        const sharePrice = 250; // Sell at book value
        const totalYield = sharesCount * sharePrice;
        
        biz.cash += totalYield;
        const newShares = currentShares - sharesCount;
        
        finance.portfolio.blueChipShares = newShares;
        finance.portfolio.valuation = newShares * sharePrice;
        if (newShares === 0) finance.portfolio.avgBuyPrice = 0;
        
        // Reduce business valuation assets
        biz.valuation = Math.max(0, biz.valuation - Math.round(totalYield * 1.25));
        
        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            valuation: biz.valuation,
            finance
        }));
        
        manager.recalculateValuation();
        ui.success(`📉 HOLDING DIVESTASI: Holding korporasi berhasil melikuidasi ${sharesCount} lembar saham Blue-Chip seharga $ ${financeManager.formatCurrency(totalYield)} langsung ke kas treasury!`, '💎 Portofolio Divestasi');
    },

    injectPersonalReserve(amount, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active) throw new Error('Perusahaan tidak aktif');
        const finance = this.getFinanceState(manager);
        if (!finance) throw new Error('Bukan industri jasa keuangan');
        
        if (amount <= 0) throw new Error('Jumlah dana tidak valid');
        const personalBalance = gameState.getBalance();
        
        if (personalBalance < amount) {
            throw new Error(`Saldo dompet pribadi tidak cukup. Saldo Anda: $ ${financeManager.formatCurrency(personalBalance)}`);
        }
        
        // Deduct from personal wallet
        gameState.update('player', p => ({
            ...p,
            balance: p.balance - amount
        }));
        
        // Add to corporate treasury cash
        biz.cash += amount;
        
        gameState.update('business', b => ({
            ...b,
            cash: biz.cash
        }));
        
        financeManager.recordTransaction({
            amount: -amount,
            category: 'Investasi',
            description: `Suntik Likuiditas Cadangan Bank — ${biz.name}`
        });
        
        ui.success(`🏦 SUNTIK LIKUIDITAS: Sukses menyuntikkan dana pribadi seharga $ ${financeManager.formatCurrency(amount)} untuk menaikkan cadangan bank!`, '🏦 Cadangan Meningkat');
    },

    processMonthlyTick(manager, biz, typeData, industry, ops, initiatives, managers) {
        const finance = this.getFinanceState(manager);
        if (!finance) return { wages: 0, cost: 0, revenue: 0 };

        // 1. Process active financed project deal
        if (finance.project) {
            const proj = finance.project;
            if (proj.status === 'funding') {
                // Syndicate Quota Filling based on Coupon Rate attractiveness
                const coupon = proj.couponRate || 6;
                const baseSubscribeSpeed = proj.totalValue * (0.05 + (coupon * 0.015));
                const actualSubscribedThisMonth = Math.round(baseSubscribeSpeed * (0.8 + Math.random() * 0.4));
                
                const targetSyndicateShare = proj.syndicateShare;
                if (proj.subscribedAmount < targetSyndicateShare) {
                    const newSubscribed = Math.min(targetSyndicateShare, proj.subscribedAmount + actualSubscribedThisMonth);
                    const gain = newSubscribed - proj.subscribedAmount;
                    proj.subscribedAmount = newSubscribed;
                    
                    if (gain > 0) {
                        const aiHoldings = ['Sinar Mas Group', 'Salim Corporate Partners', 'Astra Syndicate', 'Lippo M&A', 'Adaro Ventures', 'Barito Pacifique', 'Indika Funding', 'Bakrie Capital', 'Djarum Trust'];
                        const randomAI = aiHoldings[Math.floor(Math.random() * aiHoldings.length)];
                        proj.subscribers = proj.subscribers || [];
                        proj.subscribers.push({
                            name: randomAI,
                            amount: gain,
                            month: gameState.get('gameTime.month') || 1
                        });
                        
                        ui.info(`🤝 PROYEK SYNDICATE: ${randomAI} mengambil kuota pembiayaan obligasi "${proj.name}" sebesar $ ${financeManager.formatCurrency(gain)}!`, 'Kuota Sindikasi');
                    }
                }
                
                if (proj.subscribedAmount >= targetSyndicateShare) {
                    proj.status = 'active';
                    ui.success(`🎉 FULLY SUBSCRIBED: Proyek obligasi "${proj.name}" telah 100% didanai oleh konsorsium sindikasi! Konstruksi dan audit progresif resmi dimulai.`, 'Sindikasi Penuh');
                }
            } else if (proj.status === 'active') {
                let speedSum = 0;
                let count = 0;
                finance.employees.forEach(emp => {
                    if (emp.role === 'Credit Analyst') {
                        speedSum += emp.speed * (emp.skill / 100);
                        count++;
                    }
                });

                let progressGain = 8;
                progressGain += (speedSum * 15);
                if (managers.ops) progressGain *= 1.25;

                proj.progress = Math.min(100, proj.progress + Math.round(progressGain));

                if (proj.progress >= 100) {
                    this.launchFinanceProduct(proj, manager);
                    finance.project = null;
                }
            }
        }

        // 2. Retail Deposits Pool Growth based on Deposit Rate
        // Target benchmark rate: 4.0%
        const rateDiff = finance.rates.depositRate - 4.0;
        let depositGrowth = 0.01; // Base 1% growth
        
        if (rateDiff > 0) {
            depositGrowth += (rateDiff * 0.05); // High deposit rate attracts customer savings
        } else {
            depositGrowth += (rateDiff * 0.08); // Lower deposit rate triggers retail savings withdrawal
        }
        
        // Volatility modifier based on economy
        const economyFactor = (gameState.get('economy.index') || 1000) / 1000;
        depositGrowth *= economyFactor;

        finance.bank.depositsPool = Math.max(10000, Math.round(finance.bank.depositsPool * (1 + depositGrowth)));

        // 3. Active Loans Portfolio growth based on Lending Rate
        // Target benchmark lending: 12.0%
        const lendingDiff = 12.0 - finance.rates.lendingRate;
        let loanGrowth = 0.02; // Base 2% growth
        
        if (lendingDiff > 0) {
            loanGrowth += (lendingDiff * 0.04); // Low lending rate attracts massive borrowers
        } else {
            loanGrowth += (lendingDiff * 0.06); // High lending rates shrink borrow demand
        }
        
        // Cannot lend more than 90% of our deposit pool (liquidity bound!)
        const maxLendable = Math.round(finance.bank.depositsPool * 0.9);
        if (finance.bank.activeLoans < maxLendable) {
            finance.bank.activeLoans = Math.max(8000, Math.round(finance.bank.activeLoans * (1 + loanGrowth)));
            if (finance.bank.activeLoans > maxLendable) finance.bank.activeLoans = maxLendable;
        } else {
            // Out of liquidity! Automatically contract active loans
            finance.bank.activeLoans = Math.max(8000, Math.round(maxLendable * 0.98));
        }

        // 4. Calculate Net Interest Margin (NIM) Revenue & Costs
        let creditAnalystsSkill = 0;
        let creditAnalystsCount = 0;
        let actuariesSkill = 0;
        let actuariesCount = 0;
        let portfoliosSkill = 0;
        let portfoliosCount = 0;

        finance.employees.forEach(emp => {
            if (emp.role === 'Credit Analyst') {
                creditAnalystsSkill += emp.skill;
                creditAnalystsCount++;
            } else if (emp.role === 'Actuary/Underwriter') {
                actuariesSkill += emp.skill;
                actuariesCount++;
            } else if (emp.role === 'Portfolio Analyst') {
                portfoliosSkill += emp.skill;
                portfoliosCount++;
            }
        });

        // Credit analyst skill reduces default/NPL rate
        const skillReduction = creditAnalystsCount > 0 ? (creditAnalystsSkill / creditAnalystsCount) * 0.05 : 0;
        finance.bank.nplRate = Math.max(0.5, 3.5 - skillReduction);

        // Interest revenues from borrowers (Lending rate)
        const loanInterestRateMonthly = (finance.rates.lendingRate / 100) / 12;
        const grossLoanRevenue = finance.bank.activeLoans * loanInterestRateMonthly * (1 - (finance.bank.nplRate / 100));

        // Interest expenses paid to savers (Deposit rate)
        const depositInterestRateMonthly = (finance.rates.depositRate / 100) / 12;
        const grossDepositCost = finance.bank.depositsPool * depositInterestRateMonthly;

        const netInterestIncome = Math.round(grossLoanRevenue - grossDepositCost);

        // 5. Insurance Policy Premium & Claims Underwriting
        let premiumPerPolicy = 10;
        if (finance.rates.premiumRate === 'low') premiumPerPolicy = 6;
        else if (finance.rates.premiumRate === 'high') premiumPerPolicy = 20;

        // Policy growth base on premium pricing
        let policyGrowth = 0.02;
        if (finance.rates.premiumRate === 'low') policyGrowth = 0.12;
        else if (finance.rates.premiumRate === 'high') policyGrowth = -0.06;

        finance.insurance.activePolicies = Math.max(100, Math.round(finance.insurance.activePolicies * (1 + policyGrowth)));
        const totalPremiums = Math.round(finance.insurance.activePolicies * premiumPerPolicy);

        // Claims event
        let monthlyClaimsCost = 0;
        finance.insurance.lastClaimPayout = 0;
        if (Math.random() * 100 < 12) { // 12% monthly claim rate
            let claimBase = 12000 + Math.random() * 20000;
            
            // Actuary/Underwriter reduces payouts through risk selection
            const actuaryReduction = actuariesCount > 0 ? (actuariesSkill / actuariesCount) * 0.6 : 0;
            claimBase = Math.max(3000, claimBase * (1 - (actuaryReduction / 100)));
            monthlyClaimsCost = Math.round(claimBase);
            finance.insurance.lastClaimPayout = monthlyClaimsCost;
            
            ui.info(`🚨 KLAIM ASURANSI: Terjadi bencana default klaim nasabah! Korporasi membayar klaim tertanggung seharga $ ${financeManager.formatCurrency(monthlyClaimsCost)} dari kas treasury.`, 'Asuransi Klaim');
        }

        const netInsuranceRevenue = totalPremiums - monthlyClaimsCost;

        // 6. Bluechip Stock holding monthly dividend yield
        let portfolioDividendRevenue = 0;
        if (finance.portfolio.valuation > 0) {
            // Assume 6% annual dividend yield paid monthly (0.5% monthly)
            let divYield = 0.005;
            // Portfolio managers increase dividend harvesting efficiency
            if (portfoliosCount > 0) {
                divYield += (portfoliosSkill / portfoliosCount) * 0.00005;
            }
            portfolioDividendRevenue = Math.round(finance.portfolio.valuation * divYield);
        }

        // 7. Finance syndication completed projects recurring yield & maturity expiry
        let dealsRevenue = 0;
        const activeProducts = [];
        finance.products.forEach(p => {
            if (p.type === 'custom_syndicate') {
                if (p.monthsRemaining > 0) {
                    dealsRevenue += p.monthlyRevenue || 0;
                    p.monthsRemaining--;
                    activeProducts.push(p);
                } else {
                    ui.info(`📅 OBLIGASI EXPIRED: Pembayaran tenor obligasi "${p.name}" selama ${p.totalTenor} bulan telah berakhir. Aset obligasi resmi jatuh tempo!`, 'Obligasi Jatuh Tempo');
                    biz.valuation = Math.max(0, biz.valuation - (p.valuationBonus || 0));
                }
            } else {
                dealsRevenue += p.monthlyRevenue || 0;
                activeProducts.push(p);
            }
        });
        finance.products = activeProducts;

        // 8. Liquidity Reserve requirement check
        // Required reserves = depositsPool * 10%.
        const requiredReserves = Math.round(finance.bank.depositsPool * (finance.bank.reserveRatio / 100));
        const actualCash = biz.cash || 0;
        
        let liquidityPenalty = 1.0;
        if (actualCash < requiredReserves) {
            liquidityPenalty = 0.6; // Valuation cut by 40% if bank is illiquid!
            ui.error(`🚨 KRISIS LIKUIDITAS: Kas treasury perusahaan ($ ${financeManager.formatCurrency(actualCash)}) di bawah syarat cadangan wajib bank ($ ${financeManager.formatCurrency(requiredReserves)})! Segera suntik modal pribadi atau likuidasi portofolio saham!`, 'Reserve Warning');
        }

        // 9. Wages
        let wages = 0;
        finance.employees.forEach(emp => {
            wages += emp.salary;
        });

        const totalNetFinanceRevenue = netInterestIncome + netInsuranceRevenue + portfolioDividendRevenue + dealsRevenue;

        finance.candidates = this.generateRandomCandidates(3);
        gameState.update('business', b => ({ ...b, finance }));

        return {
            wages,
            cost: 0,
            revenue: totalNetFinanceRevenue,
            liquidityPenalty
        };
    }
};

export default FinanceSector;
