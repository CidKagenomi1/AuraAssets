/**
 * CorporateGovernance.js - Modular Corporate Governance & Shareholder Meeting Engine
 * Features director lobbying, board strategy alignment, and General Shareholder Meeting (RUPS) proposals.
 */

import gameState from '../core/GameState.js';
import financeManager from '../finance/FinanceManager.js';
import ui from '../ui/UIManager.js';

export const CorporateGovernance = {
    /**
     * Corporate Governance: Lobby a Board Member
     */
    lobbyBoardMember(boardId, source, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active || !biz.ipo || !biz.ipo.active) {
            throw new Error('Hanya dapat melobi dewan direksi setelah IPO!');
        }

        const board = [...(biz.ipo.board || [])];
        const index = board.findIndex(m => m.id === boardId);
        if (index === -1) throw new Error('Anggota dewan direksi tidak ditemukan!');

        const cost = source === 'treasury' ? 15000 : 8000;
        
        if (source === 'treasury') {
            if (biz.cash < cost) {
                throw new Error(`Kas Treasury tidak mencukupi ($ ${financeManager.formatCurrency(biz.cash)} / Butuh $ ${financeManager.formatCurrency(cost)})`);
            }
            biz.cash -= cost;
        } else {
            const playerBal = gameState.getBalance();
            if (playerBal < cost) {
                throw new Error(`Rekening Pribadi tidak mencukupi ($ ${financeManager.formatCurrency(playerBal)} / Butuh $ ${financeManager.formatCurrency(cost)})`);
            }
            gameState.addBalance(-cost, 'expense', `Lobi Direksi: ${board[index].name}`);
        }

        board[index].relationship = Math.min(100, board[index].relationship + 20);

        gameState.update('business', b => ({
            ...b,
            cash: biz.cash,
            ipo: {
                ...b.ipo,
                board: board
            }
        }));

        ui.success(`🤝 LOBI BERHASIL: Menyelenggarakan makan malam eksklusif dengan ${board[index].name}. Hubungan meningkat menjadi ${board[index].relationship}%!`, ' Hubungan Investor');
        return true;
    },

    /**
     * Corporate Governance: Align strategy with the Board
     */
    alignStrategy(strategyType, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active || !biz.ipo || !biz.ipo.active) {
            throw new Error('Hanya dapat menyelaraskan strategi setelah IPO!');
        }

        const board = [...(biz.ipo.board || [])];
        
        if (strategyType === 'growth') {
            board.forEach(m => {
                if (m.preference === 'growth') m.relationship = Math.min(100, m.relationship + 15);
                if (m.preference === 'dividend') m.relationship = Math.max(0, m.relationship - 8);
            });
            ui.success('🚀 STRATEGI PERTUMBUHAN: Dewan menyetujui akselerasi R&D dan ekspansi market. Clarissa Wijaya (Artha Capital) sangat senang!', '🚀 Rapat Dewan');
        } else if (strategyType === 'dividend') {
            board.forEach(m => {
                if (m.preference === 'dividend') m.relationship = Math.min(100, m.relationship + 15);
                if (m.preference === 'growth') m.relationship = Math.max(0, m.relationship - 8);
            });
            ui.success('💸 STRATEGI STABILITAS: Fokus menjaga profitabilitas dan alokasi dividen tinggi. Suryo Hadiningrat (Nusantara Fund) menyambut baik!', '💸 Rapat Dewan');
        } else if (strategyType === 'compliance') {
            board.forEach(m => {
                if (m.preference === 'compliance') m.relationship = Math.min(100, m.relationship + 15);
                m.relationship = Math.min(100, m.relationship + 2);
            });
            ui.success('🛡️ STRATEGI KEPATUHAN: Audit menyeluruh dilakukan untuk menjamin transparansi publik. Hendry Morgan sangat puas!', '🛡️ Rapat Dewan');
        } else {
            throw new Error('Tipe strategi dewan tidak valid!');
        }

        gameState.update('business', b => ({
            ...b,
            ipo: {
                ...b.ipo,
                board: board
            }
        }));
        return true;
    },

    /**
     * Corporate Governance: Hold a General Shareholder Meeting (RUPS)
     */
    callRUPS(proposalType, manager) {
        const biz = gameState.get('business');
        if (!biz || !biz.active || !biz.ipo || !biz.ipo.active) {
            throw new Error('Hanya dapat menggelar RUPS setelah IPO!');
        }

        const board = biz.ipo.board || [];
        const percent = biz.ipo.publicSharePercent;
        const boardSharesPercent = board.reduce((sum, m) => sum + (m.sharesPercent || 0), 0);
        const playerSharesPercent = 100 - percent - boardSharesPercent;

        let votesYes = playerSharesPercent; // Player automatically votes YES
        let votesNo = 0;
        let abstains = 0;

        let detailsLog = [];
        detailsLog.push(` Saham Founder (Anda): ${playerSharesPercent.toFixed(1)}% (SETUJU)`);

        board.forEach(m => {
            if (m.relationship >= 60) {
                votesYes += m.sharesPercent;
                detailsLog.push(`🟢 ${m.name} (${m.sharesPercent}% Saham) SETUJU karena hubungan baik (${m.relationship}%).`);
            } else if (m.relationship <= 40) {
                votesNo += m.sharesPercent;
                detailsLog.push(`🔴 ${m.name} (${m.sharesPercent}% Saham) MENOLAK karena hubungan buruk (${m.relationship}%).`);
            } else {
                abstains += m.sharesPercent;
                detailsLog.push(`🟡 ${m.name} (${m.sharesPercent}% Saham) ABSTAIN/Netral (${m.relationship}%).`);
            }
        });

        // Public shareholders vote based on average board relationship
        const avgRelation = board.reduce((sum, m) => sum + m.relationship, 0) / board.length;
        if (avgRelation > 50) {
            votesYes += percent;
            detailsLog.push(`🟢 Investor Publik (${percent}% Saham) SETUJU didasari sentimen positif.`);
        } else {
            votesNo += percent;
            detailsLog.push(`🔴 Investor Publik (${percent}% Saham) MENOLAK didasari sentimen buruk.`);
        }

        const totalActiveVotes = votesYes + votesNo;
        const yesRatio = votesYes / totalActiveVotes;
        const passed = yesRatio > 0.50;

        let resultMsg = `RUPS Selesai! Hasil Voting: SETUJU ${votesYes.toFixed(1)}% vs MENOLAK ${votesNo.toFixed(1)}% (Abstain: ${abstains}%). Proposal ${passed ? 'DITERIMA' : 'DITOLAK'}!`;

        if (passed) {
            if (proposalType === 'retention') {
                const payout = 30000;
                if (biz.cash < payout + 10000) {
                    throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk pembayaran Bonus ($ ${financeManager.formatCurrency(payout)})`);
                }
                biz.cash -= payout;
                gameState.update('player', p => ({ ...p, balance: p.balance + payout }));
                financeManager.addIncome(payout, 'Executive Bonus', `CEO Retention Bonus dari RUPS ${biz.name}`);
                
                gameState.update('business', b => ({ ...b, cash: biz.cash }));
                ui.success(`🏆 RUPS GOAL! Proposal Bonus Retensi CEO disetujui! Anda memperoleh dana tunai $ 30,000 dari treasury perusahaan.`, '🏆 RUPS Berhasil');
            } else if (proposalType === 'expansion') {
                const cost = 50000;
                if (biz.cash < cost) {
                    throw new Error(`Kas Treasury Perusahaan tidak mencukupi untuk biaya ekspansi ($ ${financeManager.formatCurrency(cost)})`);
                }
                biz.cash -= cost;
                biz.valuation += 120000; // Unlocks a massive valuation bump!
                
                gameState.update('business', b => ({ ...b, cash: biz.cash, valuation: biz.valuation }));
                manager.recalculateValuation();
                ui.success(`📈 RUPS GOAL! Proposal Suntik Dana Ekspansi disetujui! Kas -$ 50,000, Valuasi holding melonjak instan +$ 120,000!`, '🏆 RUPS Berhasil');
            }
        } else {
            ui.error(`❌ PROPOSAL GAGAL! Usulan Anda ditolak oleh mayoritas pemegang saham. Hubungan dengan direksi saat ini terlalu rendah!`, '❌ Usulan Ditolak');
        }

        return {
            passed,
            resultMsg,
            detailsLog
        };
    }
};

export default CorporateGovernance;
