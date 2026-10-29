/**
 * TransferManager.js - Peer-to-Peer Transfer & Community Donation Box System
 * Handles P2P targeted transfers between players and Community Donation Grants
 * with real-time Supabase Cloud Realtime broadcast and local offline persistence.
 */

import gameState from '../core/GameState.js';
import financeManager from './FinanceManager.js';
import ui from '../ui/UIManager.js';
import { supabase } from '../core/SupabaseClient.js';
import { createFloatingText } from '../ui/Animations.js';

class TransferManager {
    constructor() {
        this.channel = null;
        this.isListening = false;
    }

    init() {
        this.initRealtime();
        this.checkPendingInbox();
    }

    /**
     * Initialize Supabase Realtime Broadcast Channel for transfers & community grants
     */
    initRealtime() {
        if (this.isListening || !supabase) return;

        try {
            this.channel = supabase.channel('aura_transfers_and_grants', {
                config: {
                    broadcast: { self: false } // don't receive our own broadcast
                }
            });

            this.channel
                .on('broadcast', { event: 'player_transfer' }, ({ payload }) => {
                    this.handleIncomingTransfer(payload);
                })
                .on('broadcast', { event: 'community_grant' }, ({ payload }) => {
                    this.handleIncomingCommunityGrant(payload);
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('🌐 [TransferManager] Connected to Community Transfers & Grants channel!');
                    }
                });

            this.isListening = true;
        } catch (e) {
            console.warn('[TransferManager] Realtime subscription bypassed:', e);
        }
    }

    getCurrentUsername() {
        return (gameState.currentUser || gameState.get('player.name') || 'Pemain').trim();
    }

    /**
     * Send targeted P2P Transfer to a specific player
     */
    async sendTransfer({ toUsername, amount, note = '' }) {
        const sender = this.getCurrentUsername();
        const target = (toUsername || '').trim();
        const numAmount = Math.round(Number(amount));

        if (!target) {
            throw new Error('Masukkan username pemain tujuan!');
        }

        if (target.toLowerCase() === sender.toLowerCase()) {
            throw new Error('Anda tidak dapat mentransfer dana ke akun Anda sendiri!');
        }

        if (isNaN(numAmount) || numAmount <= 0) {
            throw new Error('Nominal transfer harus lebih besar dari $ 0!');
        }

        const balance = gameState.getBalance();
        if (numAmount > balance) {
            throw new Error(`Saldo tidak mencukupi! Saldo kas Anda saat ini: $ ${financeManager.formatCurrency(balance)}`);
        }

        // Deduct sender's balance
        financeManager.addExpense(
            numAmount,
            'Transfer',
            `Transfer ke @${target}${note ? ' — ' + note : ''}`
        );

        const transferId = 'trf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const timestamp = Date.now();
        const gameTime = {
            day: gameState.get('gameTime.day') || new Date().getUTCDate(),
            month: gameState.get('gameTime.month') || (new Date().getUTCMonth() + 1),
            year: gameState.get('gameTime.year') || new Date().getUTCFullYear()
        };

        const transferPayload = {
            id: transferId,
            from: sender,
            to: target,
            amount: numAmount,
            note: note.trim(),
            timestamp,
            gameDate: `${gameTime.day}-${gameTime.month}-${gameTime.year}`
        };

        // 1. Broadcast via Supabase Realtime to online players
        if (this.channel && this.isListening) {
            try {
                this.channel.send({
                    type: 'broadcast',
                    event: 'player_transfer',
                    payload: transferPayload
                });
            } catch (err) {
                console.warn('[TransferManager] Broadcast error:', err);
            }
        }

        // 2. Persist in local storage for target player (supports local multi-character/sessions)
        this.savePendingTransferForUser(target, transferPayload);

        // 3. Add sent receipt to sender's notifications
        ui.addNotification({
            type: 'info',
            title: '📤 Transfer Terkirim',
            message: `Berhasil mentransfer **$ ${financeManager.formatCurrency(numAmount)}** ke **@${target}**.`,
            icon: '📤'
        });

        return transferPayload;
    }

    /**
     * Send donation to the Community Box (distributed to other players)
     */
    async sendCommunityDonation({ amount, note = '' }) {
        const donor = this.getCurrentUsername();
        const numAmount = Math.round(Number(amount));

        if (isNaN(numAmount) || numAmount < 100) {
            throw new Error('Minimal donasi ke Kotak Komunitas adalah $ 100!');
        }

        const balance = gameState.getBalance();
        if (numAmount > balance) {
            throw new Error(`Saldo tidak mencukupi! Saldo kas Anda: $ ${financeManager.formatCurrency(balance)}`);
        }

        // Deduct donor's balance
        financeManager.donate(numAmount, 'Kotak Donasi Komunitas', 'Donasi');

        const grantId = 'cg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const timestamp = Date.now();
        const gameTime = {
            day: gameState.get('gameTime.day') || new Date().getUTCDate(),
            month: gameState.get('gameTime.month') || (new Date().getUTCMonth() + 1),
            year: gameState.get('gameTime.year') || new Date().getUTCFullYear()
        };

        // Calculate grant reward per recipient (e.g. 10% - 25% of pool per claim, minimum $50)
        const perPlayerGrant = Math.max(50, Math.round(numAmount * 0.20));

        const grantPayload = {
            id: grantId,
            donor,
            totalAmount: numAmount,
            perPlayerGrant,
            note: note.trim() || 'Semoga bermanfaat untuk akselerasi portofolio Anda!',
            timestamp,
            gameDate: `${gameTime.day}-${gameTime.month}-${gameTime.year}`
        };

        // 1. Broadcast via Supabase Realtime
        if (this.channel && this.isListening) {
            try {
                this.channel.send({
                    type: 'broadcast',
                    event: 'community_grant',
                    payload: grantPayload
                });
            } catch (err) {
                console.warn('[TransferManager] Broadcast grant error:', err);
            }
        }

        // 2. Persist in global community box storage
        this.savePendingCommunityGrant(grantPayload);

        return grantPayload;
    }

    /**
     * Handle incoming targeted transfer
     */
    handleIncomingTransfer(payload) {
        if (!payload || !payload.to) return;
        const current = this.getCurrentUsername().toLowerCase();
        if (payload.to.toLowerCase() !== current) return;

        // Prevent duplicate processing
        const notifs = gameState.get('notifications') || [];
        if (notifs.some(n => n.id === payload.id)) return;

        const amountFormatted = financeManager.formatCurrency(payload.amount);
        const newNotif = {
            id: payload.id,
            type: 'bonus_check',
            subType: 'transfer',
            title: '💵 Cek Transfer Masuk',
            message: `Anda menerima cek transfer dana tunai sebesar **+$ ${amountFormatted}** dari **@${payload.from}**!${payload.note ? `<br><em>"${payload.note}"</em>` : ''}`,
            icon: '💵',
            date: payload.gameDate || `${gameState.get('gameTime.day')}-${gameState.get('gameTime.month')}-${gameState.get('gameTime.year')}`,
            unread: true,
            hasReward: true,
            rewardAmount: payload.amount,
            rewardClaimed: false,
            sender: payload.from,
            note: payload.note || ''
        };

        const updated = [newNotif, ...notifs].slice(0, 50);
        gameState.set('notifications', updated);
        const unreadCount = (gameState.get('unreadNotificationsCount') || 0) + 1;
        gameState.set('unreadNotificationsCount', unreadCount);
        ui.updateNotificationBadge();

        ui.info(
            `Anda menerima Cek Transfer sebesar +$ ${amountFormatted} dari @${payload.from}! Buka notifikasi untuk mencairkan.`,
            '💵 Cek Dana Masuk'
        );

        try {
            import('../ui/AuraSound.js').then(m => m.default?.playClaimMoney?.());
        } catch (e) {}
    }

    /**
     * Handle incoming community box grant
     */
    handleIncomingCommunityGrant(payload) {
        if (!payload) return;
        const current = this.getCurrentUsername().toLowerCase();
        if (payload.donor && payload.donor.toLowerCase() === current) return;

        // Prevent duplicate processing
        const notifs = gameState.get('notifications') || [];
        if (notifs.some(n => n.id === payload.id)) return;

        const grantFormatted = financeManager.formatCurrency(payload.perPlayerGrant);
        const newNotif = {
            id: payload.id,
            type: 'bonus_check',
            subType: 'community_grant',
            title: '🎁 Cek Bonus Kotak Donasi',
            message: `Dermawan **@${payload.donor}** menyumbangkan dana ke Kotak Donasi Komunitas! Anda memperoleh jatah cek modal **+$ ${grantFormatted}**.${payload.note ? `<br><em>"${payload.note}"</em>` : ''}`,
            icon: '🎁',
            date: payload.gameDate || `${gameState.get('gameTime.day')}-${gameState.get('gameTime.month')}-${gameState.get('gameTime.year')}`,
            unread: true,
            hasReward: true,
            rewardAmount: payload.perPlayerGrant,
            rewardClaimed: false,
            sender: payload.donor,
            note: payload.note || ''
        };

        const updated = [newNotif, ...notifs].slice(0, 50);
        gameState.set('notifications', updated);
        const unreadCount = (gameState.get('unreadNotificationsCount') || 0) + 1;
        gameState.set('unreadNotificationsCount', unreadCount);
        ui.updateNotificationBadge();

        ui.success(
            `Kabar gembira! @${payload.donor} mendonasikan dana komunitas. Anda mendapatkan Cek Bonus +$ ${grantFormatted}!`,
            '🎁 Cek Donasi Komunitas'
        );

        try {
            import('../ui/AuraSound.js').then(m => m.default?.playClaimMoney?.());
        } catch (e) {}
    }

    /**
     * Check pending local inbox on user login / startup
     */
    checkPendingInbox() {
        const username = this.getCurrentUsername();
        if (!username || username === 'Pemain') return;

        const lowerUser = username.toLowerCase();
        const storageKey = `aura_pending_transfers_${lowerUser}`;

        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list) && list.length > 0) {
                    list.forEach(payload => {
                        this.handleIncomingTransfer(payload);
                    });
                    localStorage.removeItem(storageKey);
                }
            }
        } catch (e) {}

        // Check community grants pool
        try {
            const poolRaw = localStorage.getItem('aura_community_grants_pool');
            if (poolRaw) {
                const pool = JSON.parse(poolRaw);
                if (Array.isArray(pool)) {
                    pool.forEach(grant => {
                        this.handleIncomingCommunityGrant(grant);
                    });
                }
            }
        } catch (e) {}
    }

    savePendingTransferForUser(username, payload) {
        try {
            const lowerUser = username.toLowerCase();
            const storageKey = `aura_pending_transfers_${lowerUser}`;
            const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
            existing.push(payload);
            localStorage.setItem(storageKey, JSON.stringify(existing.slice(-20)));
        } catch (e) {}
    }

    savePendingCommunityGrant(payload) {
        try {
            const storageKey = 'aura_community_grants_pool';
            const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
            existing.unshift(payload);
            localStorage.setItem(storageKey, JSON.stringify(existing.slice(0, 10)));
        } catch (e) {}
    }

    /**
     * Claim a specific bonus check
     */
    claimCheck(notificationId, btnEl = null) {
        const notifs = gameState.get('notifications') || [];
        const notif = notifs.find(n => n.id === notificationId);

        if (!notif) {
            ui.error('Cek tidak ditemukan!');
            return false;
        }

        if (!notif.hasReward || notif.rewardClaimed) {
            ui.info('Cek dana ini sudah pernah dicairkan.');
            return false;
        }

        const amount = Math.round(Number(notif.rewardAmount) || 0);
        if (amount <= 0) return false;

        // Credit to balance
        const category = notif.subType === 'transfer' ? 'Transfer Masuk' : 'Donasi Komunitas';
        const description = notif.subType === 'transfer'
            ? `Pencairan Cek Transfer dari @${notif.sender}`
            : `Pencairan Cek Kotak Donasi dari @${notif.sender}`;

        financeManager.addIncome(amount, 'Bonus', description);

        // Update notification status
        notif.rewardClaimed = true;
        notif.claimedAt = Date.now();
        gameState.set('notifications', [...notifs]);

        // Feedback sound and visual
        try {
            import('../ui/AuraSound.js').then(m => m.default?.playClaimMoney?.());
        } catch (e) {}

        if (btnEl) {
            createFloatingText(btnEl, `+$ ${financeManager.formatCurrency(amount)}`, 'var(--accent-primary)');
        }

        ui.success(
            `Cek sebesar +$ ${financeManager.formatCurrency(amount)} berhasil dicairkan langsung ke saldo kas Anda!`,
            '💵 Cek Berhasil Dicairkan'
        );

        // Re-render if notification modal is active
        import('../ui/HomeScreen.js').then(m => {
            m.default.renderMilestones();
            m.default.updateBalanceCard();
        });

        return true;
    }

    /**
     * Claim all unclaimed checks in one action
     */
    claimAllChecks() {
        const notifs = gameState.get('notifications') || [];
        const unclaimed = notifs.filter(n => n.hasReward && !n.rewardClaimed);

        if (unclaimed.length === 0) {
            ui.info('Tidak ada cek yang perlu dicairkan.');
            return 0;
        }

        let totalClaimed = 0;
        unclaimed.forEach(n => {
            const amt = Math.round(Number(n.rewardAmount) || 0);
            if (amt > 0) {
                totalClaimed += amt;
                n.rewardClaimed = true;
                n.claimedAt = Date.now();
            }
        });

        if (totalClaimed > 0) {
            financeManager.addIncome(
                totalClaimed,
                'Bonus',
                `Pencairan Sekaligus ${unclaimed.length} Cek Dana Masuk`
            );
            gameState.set('notifications', [...notifs]);

            try {
                import('../ui/AuraSound.js').then(m => m.default?.playClaimMoney?.());
            } catch (e) {}

            ui.success(
                `Berhasil mencairkan ${unclaimed.length} cek sekaligus dengan total +$ ${financeManager.formatCurrency(totalClaimed)} ke saldo Anda!`,
                '🎉 Seluruh Cek Dicairkan'
            );

            import('../ui/HomeScreen.js').then(m => {
                m.default.renderMilestones();
                m.default.updateBalanceCard();
            });
        }

        return totalClaimed;
    }

    /**
     * Show P2P Transfer Dialog Modal
     */
    showTransferModal(prefillUsername = '') {
        const balance = gameState.getBalance();
        const currentSender = this.getCurrentUsername();

        const content = `
            <div style="display:flex; flex-direction:column; gap:1.25rem;">
                <div style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2); border-radius:12px; padding:0.9rem 1.1rem; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.85rem; color:var(--text-muted);">💰 Saldo Kas Tersedia</span>
                    <strong style="font-size:1.05rem; color:#10b981;">$ ${financeManager.formatCurrency(balance, true)}</strong>
                </div>

                <div style="display:flex; flex-direction:column; gap:0.4rem;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary);">👤 Username Penerima (Target Player):</label>
                    <input type="text" id="transfer-target-username" value="${prefillUsername}" placeholder="Contoh: BudiTrader, SultanCrypto" style="
                        width:100%; padding:0.75rem 1rem; border-radius:10px; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:#fff; font-size:0.9rem; font-family:inherit; outline:none; transition:border-color 0.2s;
                    " onfocus="this.style.borderColor='var(--accent-primary)'" onblur="this.style.borderColor='var(--border-color)'">
                </div>

                <div style="display:flex; flex-direction:column; gap:0.4rem;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary);">💵 Nominal Transfer ($ USD):</label>
                    <div style="position:relative;">
                        <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); font-weight:800; color:var(--text-muted);">$</span>
                        <input type="number" id="transfer-amount" min="1" max="${balance}" placeholder="0" style="
                            width:100%; padding:0.75rem 1rem 0.75rem 2.2rem; border-radius:10px; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:#fff; font-size:1rem; font-weight:700; font-family:inherit; outline:none; transition:border-color 0.2s;
                        " onfocus="this.style.borderColor='var(--accent-primary)'" onblur="this.style.borderColor='var(--border-color)'">
                    </div>
                    <div style="display:flex; gap:0.5rem; margin-top:4px;">
                        <button type="button" class="btn-quick-amount" data-pct="0.10" style="flex:1; padding:4px 8px; font-size:0.72rem; border-radius:6px; background:rgba(255,255,255,0.04); border:1px solid var(--border-color); color:var(--text-muted); cursor:pointer;">10%</button>
                        <button type="button" class="btn-quick-amount" data-pct="0.25" style="flex:1; padding:4px 8px; font-size:0.72rem; border-radius:6px; background:rgba(255,255,255,0.04); border:1px solid var(--border-color); color:var(--text-muted); cursor:pointer;">25%</button>
                        <button type="button" class="btn-quick-amount" data-pct="0.50" style="flex:1; padding:4px 8px; font-size:0.72rem; border-radius:6px; background:rgba(255,255,255,0.04); border:1px solid var(--border-color); color:var(--text-muted); cursor:pointer;">50%</button>
                        <button type="button" class="btn-quick-amount" data-pct="1.00" style="flex:1; padding:4px 8px; font-size:0.72rem; border-radius:6px; background:rgba(255,255,255,0.04); border:1px solid var(--border-color); color:var(--accent-primary); font-weight:700; cursor:pointer;">MAX</button>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:0.4rem;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary);">📝 Pesan / Berita Transfer (Opsional):</label>
                    <input type="text" id="transfer-note" maxlength="80" placeholder="Misal: Modal patungan properti, bonus trading" style="
                        width:100%; padding:0.65rem 1rem; border-radius:10px; background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:#fff; font-size:0.85rem; font-family:inherit; outline:none; transition:border-color 0.2s;
                    " onfocus="this.style.borderColor='var(--accent-primary)'" onblur="this.style.borderColor='var(--border-color)'">
                </div>

                <div style="padding:0.75rem; background:rgba(255,255,255,0.02); border:1px dashed var(--border-color); border-radius:10px; font-size:0.75rem; color:var(--text-dim); line-height:1.5;">
                    💡 Dana akan dikirimkan sebagai <strong>Cek Transfer Resmi</strong> ke panel notifikasi @penerima secara instan dan dapat dicairkan kapan saja.
                </div>

                <div style="display:flex; gap:0.75rem; margin-top:0.5rem;">
                    <button type="button" id="btn-cancel-transfer" style="
                        flex:1; padding:0.75rem; border-radius:10px; background:rgba(255,255,255,0.06); border:1px solid var(--border-color); color:var(--text-secondary); font-weight:700; cursor:pointer; font-family:inherit;
                    ">Batal</button>
                    <button type="button" id="btn-submit-transfer" style="
                        flex:2; padding:0.75rem; border-radius:10px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); border:none; color:#fff; font-weight:800; cursor:pointer; font-family:inherit; box-shadow:0 4px 14px rgba(16,185,129,0.3); transition:all 0.2s;
                    " onmouseenter="this.style.filter='brightness(1.1)'" onmouseleave="this.style.filter=''">
                        🚀 Kirim Transfer Sekarang
                    </button>
                </div>
            </div>
        `;

        ui.showModal({
            title: '💸 Transfer Dana Antar Player',
            content,
            onShow: () => {
                const targetInput = document.getElementById('transfer-target-username');
                const amountInput = document.getElementById('transfer-amount');
                const noteInput = document.getElementById('transfer-note');
                const submitBtn = document.getElementById('btn-submit-transfer');
                const cancelBtn = document.getElementById('btn-cancel-transfer');

                document.querySelectorAll('.btn-quick-amount').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const pct = parseFloat(btn.dataset.pct);
                        amountInput.value = Math.floor(balance * pct);
                    });
                });

                cancelBtn?.addEventListener('click', () => ui.closeModal());

                submitBtn?.addEventListener('click', async () => {
                    const toUser = targetInput.value.trim();
                    const amount = parseFloat(amountInput.value);
                    const note = noteInput.value.trim();

                    if (!toUser) {
                        ui.error('Masukkan username penerima!');
                        targetInput.focus();
                        return;
                    }

                    if (!amount || amount <= 0) {
                        ui.error('Masukkan nominal transfer yang valid!');
                        amountInput.focus();
                        return;
                    }

                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Memproses...';

                    try {
                        await this.sendTransfer({ toUsername: toUser, amount, note });
                        ui.closeModal();
                        ui.success(
                            `Transfer sebesar $ ${financeManager.formatCurrency(amount)} berhasil dikirimkan ke @${toUser}!`,
                            '🚀 Transfer Berhasil'
                        );
                        import('../ui/HomeScreen.js').then(m => {
                            m.default.updateBalanceCard();
                            m.default.updateRecentTransactions();
                        });
                    } catch (e) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '🚀 Kirim Transfer Sekarang';
                        ui.error(e.message);
                    }
                });
            }
        });
    }
}

export const transferManager = new TransferManager();
export default transferManager;

