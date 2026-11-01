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
import { escapeHtml } from '../core/SecurityUtils.js';

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
     * Calculate transfer admin fee: $1 per $100 transfer amount (minimum $1)
     */
    calculateAdminFee(amount) {
        const num = Math.round(Number(amount) || 0);
        if (num <= 0) return 0;
        return Math.max(1, Math.ceil(num / 100));
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

        const adminFee = this.calculateAdminFee(numAmount);
        const totalDeduction = numAmount + adminFee;

        const balance = gameState.getBalance();
        if (totalDeduction > balance) {
            throw new Error(`Saldo tidak mencukupi! Diperlukan $ ${financeManager.formatCurrency(totalDeduction)} (Transfer: $ ${financeManager.formatCurrency(numAmount)} + Biaya Admin: $ ${financeManager.formatCurrency(adminFee)}). Saldo kas Anda saat ini: $ ${financeManager.formatCurrency(balance)}`);
        }

        // Deduct sender's balance (Transfer Amount + Admin Fee)
        financeManager.addExpense(
            totalDeduction,
            'Transfer',
            `Transfer ke @${target} ($ ${financeManager.formatCurrency(numAmount)} + Biaya Admin $ ${financeManager.formatCurrency(adminFee)})${note ? ' — ' + note : ''}`
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
            adminFee: adminFee,
            totalDeduction: totalDeduction,
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

        // 3. Save receipt locally for sender
        this.saveTransferReceipt(transferPayload);

        // 4. Add sent receipt to sender's notifications
        if (typeof ui.addNotification === 'function') {
            ui.addNotification({
                type: 'info',
                title: '📤 Transfer Terkirim',
                message: `Berhasil mentransfer **$ ${financeManager.formatCurrency(numAmount)}** ke **@${target}** (Biaya Admin: $ ${financeManager.formatCurrency(adminFee)}).`,
                icon: '📤'
            });
        } else {
            ui.info(`Berhasil mentransfer $ ${financeManager.formatCurrency(numAmount)} ke @${target} (Biaya Admin: $ ${financeManager.formatCurrency(adminFee)}).`, '📤 Transfer Terkirim');
        }

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
            note: payload.note || '',
            receipt: payload
        };

        // Also save receipt for recipient
        this.saveTransferReceipt(payload);

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

                <!-- Breakdown Biaya & Total -->
                <div style="background:rgba(255,255,255,0.025); border:1px solid var(--border-color); border-radius:10px; padding:0.75rem 1rem; font-size:0.78rem; display:flex; flex-direction:column; gap:0.35rem;">
                    <div style="display:flex; justify-content:space-between; color:var(--text-muted);">
                        <span>Nominal Transfer:</span>
                        <span id="summary-transfer-amount" style="color:#fff; font-weight:700;">$ 0</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; color:var(--text-muted);">
                        <span>Biaya Admin ($1 per $100):</span>
                        <span id="summary-admin-fee" style="color:#f59e0b; font-weight:700;">$ 0</span>
                    </div>
                    <div style="height:1px; background:rgba(255,255,255,0.06); margin:2px 0;"></div>
                    <div style="display:flex; justify-content:space-between; font-weight:800;">
                        <span style="color:var(--text-secondary);">Total Terpotong:</span>
                        <span id="summary-total-deduction" style="color:#10b981;">$ 0</span>
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

                const updateSummary = () => {
                    const val = parseFloat(amountInput.value) || 0;
                    const num = Math.max(0, Math.round(val));
                    const fee = this.calculateAdminFee(num);
                    const total = num + fee;

                    const elAmount = document.getElementById('summary-transfer-amount');
                    const elFee = document.getElementById('summary-admin-fee');
                    const elTotal = document.getElementById('summary-total-deduction');

                    if (elAmount) elAmount.textContent = `$ ${financeManager.formatCurrency(num)}`;
                    if (elFee) elFee.textContent = `$ ${financeManager.formatCurrency(fee)}`;
                    if (elTotal) {
                        elTotal.textContent = `$ ${financeManager.formatCurrency(total)}`;
                        elTotal.style.color = (total > balance) ? '#ef4444' : '#10b981';
                    }
                };

                amountInput?.addEventListener('input', updateSummary);

                document.querySelectorAll('.btn-quick-amount').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const pct = parseFloat(btn.dataset.pct);
                        if (pct >= 1.00) {
                            // Calculate maximum transferable while accounting for $1/$100 admin fee
                            let maxTransfer = Math.floor(balance * 100 / 101);
                            while (maxTransfer > 0 && (maxTransfer + this.calculateAdminFee(maxTransfer)) > balance) {
                                maxTransfer--;
                            }
                            amountInput.value = Math.max(0, maxTransfer);
                        } else {
                            amountInput.value = Math.floor(balance * pct);
                        }
                        updateSummary();
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
                        const payload = await this.sendTransfer({ toUsername: toUser, amount, note });
                        ui.closeModal();
                        import('../ui/HomeScreen.js').then(m => {
                            m.default.updateBalanceCard();
                            m.default.updateRecentTransactions();
                        });
                        // Automatically pop up official transfer receipt modal
                        setTimeout(() => {
                            this.showTransferReceiptModal(payload);
                        }, 250);
                    } catch (e) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '🚀 Kirim Transfer Sekarang';
                        ui.error(e.message);
                    }
                });
            }
        });
    }

    /**
     * Save transfer receipt to local storage
     */
    saveTransferReceipt(receipt) {
        if (!receipt || !receipt.id) return;
        try {
            const key = 'aura_saved_transfer_receipts';
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const filtered = existing.filter(r => r.id !== receipt.id);
            filtered.unshift(receipt);
            localStorage.setItem(key, JSON.stringify(filtered.slice(0, 50)));
        } catch (e) {
            console.warn('[TransferManager] Failed to save receipt:', e);
        }
    }

    /**
     * Retrieve list of saved transfer receipts
     */
    getSavedReceipts() {
        try {
            const key = 'aura_saved_transfer_receipts';
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * Display digital transfer receipt modal with instant download PNG button
     */
    showTransferReceiptModal(receipt) {
        if (!receipt) {
            ui.error('Bukti transfer tidak tersedia.');
            return;
        }

        const adminFee = receipt.adminFee !== undefined ? receipt.adminFee : this.calculateAdminFee(receipt.amount);
        const totalDeduction = receipt.totalDeduction || (receipt.amount + adminFee);
        const formattedAmount = financeManager.formatCurrency(receipt.amount);
        const formattedAdminFee = financeManager.formatCurrency(adminFee);
        const formattedTotal = financeManager.formatCurrency(totalDeduction);

        const safeSender = escapeHtml(receipt.from || this.getCurrentUsername());
        const safeTarget = escapeHtml(receipt.to || 'Pemain');
        const safeNote = receipt.note ? escapeHtml(receipt.note) : '';
        const safeId = escapeHtml(receipt.id || 'TRF-' + Date.now());
        const safeGameDate = escapeHtml(String(receipt.gameDate || 'Terkini'));
        const dateStr = new Date(receipt.timestamp || Date.now()).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const content = `
            <div style="display:flex; flex-direction:column; gap:1.1rem; align-items:stretch;">
                <!-- Real Digital Bank Receipt Slip (Clean Paper Style) -->
                <div style="background:#ffffff; color:#0f172a; border-radius:14px; padding:1.5rem 1.4rem; box-shadow:0 10px 30px rgba(0,0,0,0.35); border:1px solid #e2e8f0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <!-- Brand Header -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:0.9rem; border-bottom:1px solid #e2e8f0;">
                        <div>
                            <div style="font-size:1.15rem; font-weight:900; letter-spacing:0.5px; color:#0f172a; line-height:1.2;">AURA ASSETS</div>
                            <div style="font-size:0.68rem; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; margin-top:3px;">Bukti Transfer Dana (P2P)</div>
                        </div>
                        <div style="background:#f1f5f9; border:1px solid #e2e8f0; padding:4px 8px; border-radius:6px; font-size:0.68rem; font-weight:700; color:#475569; font-family:monospace;">
                            BUKTI TRANSAKSI
                        </div>
                    </div>

                    <!-- Status & Amount -->
                    <div style="text-align:center; padding:1.25rem 0 0.85rem 0;">
                        <div style="width:48px; height:48px; border-radius:50%; background:#16a34a; color:#ffffff; display:flex; align-items:center; justify-content:center; margin:0 auto 0.65rem auto; font-size:1.35rem; font-weight:900; box-shadow:0 4px 12px rgba(22,163,74,0.25);">
                            ✓
                        </div>
                        <div style="font-size:0.8rem; font-weight:800; color:#16a34a; text-transform:uppercase; letter-spacing:0.6px;">
                            Transfer Berhasil
                        </div>
                        <div style="font-size:2.2rem; font-weight:900; color:#0f172a; margin:0.35rem 0 0.15rem 0; letter-spacing:-0.5px;">
                            $ ${formattedAmount}
                        </div>
                        <div style="font-size:0.72rem; color:#64748b; font-weight:500;">
                            ${dateStr}
                        </div>
                    </div>

                    <!-- Dashed Line -->
                    <div style="border-top:1px dashed #cbd5e1; margin:0.65rem 0 0.85rem 0;"></div>

                    <!-- Rows Details -->
                    <div style="display:flex; flex-direction:column; gap:0.65rem; font-size:0.82rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#64748b;">No. Referensi</span>
                            <span style="color:#0f172a; font-family:monospace; font-weight:700; font-size:0.75rem;">${safeId}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#64748b;">Tanggal Game</span>
                            <span style="color:#0f172a; font-weight:600;">Hari ${safeGameDate}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#64748b;">Pengirim</span>
                            <span style="color:#0f172a; font-weight:700;">@${safeSender}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#64748b;">Penerima</span>
                            <span style="color:#0f172a; font-weight:700;">@${safeTarget}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#64748b;">Nominal Transfer</span>
                            <span style="color:#0f172a; font-weight:700;">$ ${formattedAmount}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#64748b;">Biaya Admin ($1 / $100)</span>
                            <span style="color:#b45309; font-weight:700;">$ ${formattedAdminFee}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:5px; border-top:1px solid #f1f5f9;">
                            <span style="color:#0f172a; font-weight:800;">Total Terdebit</span>
                            <span style="color:#0f172a; font-weight:900; font-size:0.95rem;">$ ${formattedTotal}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#64748b;">Status Transaksi</span>
                            <span style="color:#16a34a; font-weight:800;">✓ BERHASIL</span>
                        </div>
                        ${safeNote ? `
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem; margin-top:2px;">
                                <span style="color:#64748b; white-space:nowrap;">Catatan</span>
                                <span style="color:#334155; text-align:right; font-style:italic;">"${safeNote}"</span>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Dashed Line -->
                    <div style="border-top:1px dashed #cbd5e1; margin:0.9rem 0 0.75rem 0;"></div>

                    <!-- Receipt Footer Note -->
                    <div style="text-align:center; font-size:0.7rem; color:#64748b; line-height:1.45;">
                        Simpan bukti transfer ini sebagai referensi transaksi yang sah.<br>
                        <span style="color:#94a3b8; font-size:0.65rem;">Aura Assets Financial Services • Jaringan Transfer Realtime</span>
                    </div>
                </div>

                <!-- Actions -->
                <div style="display:flex; gap:0.75rem; margin-top:0.25rem;">
                    <button type="button" id="btn-close-receipt-modal" style="
                        flex:1; padding:0.8rem; border-radius:10px; background:rgba(255,255,255,0.06); border:1px solid var(--border-color); color:var(--text-secondary); font-weight:700; cursor:pointer; font-family:inherit;
                    ">Tutup</button>
                    <button type="button" id="btn-download-receipt-png" style="
                        flex:2; padding:0.8rem; border-radius:10px; background:linear-gradient(135deg, #16a34a 0%, #15803d 100%); border:none; color:#ffffff; font-weight:800; cursor:pointer; font-family:inherit; box-shadow:0 4px 14px rgba(22,163,74,0.35); transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:6px;
                    " onmouseenter="this.style.filter='brightness(1.1)'" onmouseleave="this.style.filter=''">
                        📥 Unduh Bukti Transfer (PNG)
                    </button>
                </div>
            </div>
        `;

        ui.showModal({
            title: '🧾 Bukti Transfer Resmi',
            content,
            onShow: () => {
                document.getElementById('btn-close-receipt-modal')?.addEventListener('click', () => {
                    ui.closeModal();
                });

                document.getElementById('btn-download-receipt-png')?.addEventListener('click', () => {
                    this.downloadTransferReceipt(receipt);
                });
            }
        });
    }

    /**
     * Export Transfer Receipt as clean, minimalist white-paper PNG (2x Retina Canvas)
     */
    downloadTransferReceipt(receipt) {
        if (!receipt) {
            ui.error('Data bukti transfer tidak ditemukan!');
            return;
        }

        try {
            const adminFee = receipt.adminFee !== undefined ? receipt.adminFee : this.calculateAdminFee(receipt.amount);
            const totalDeduction = receipt.totalDeduction || (receipt.amount + adminFee);
            const formattedAmount = financeManager.formatCurrency(receipt.amount);
            const formattedAdminFee = financeManager.formatCurrency(adminFee);
            const formattedTotal = financeManager.formatCurrency(totalDeduction);

            const dateStr = new Date(receipt.timestamp || Date.now()).toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            const W = 540;
            const H = 740;
            const canvas = document.createElement('canvas');
            canvas.width = W * 2;
            canvas.height = H * 2;
            canvas.style.width = W + 'px';
            canvas.style.height = H + 'px';
            const ctx = canvas.getContext('2d');
            ctx.scale(2, 2);

            // 1. Clean Minimalist White Paper Background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, W, H);

            // Outer subtle border
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.strokeRect(16, 16, W - 32, H - 32);

            // 2. Top Header
            ctx.textAlign = 'left';
            ctx.fillStyle = '#0f172a';
            ctx.font = '900 18px system-ui, -apple-system, sans-serif';
            ctx.fillText('AURA ASSETS', 40, 54);

            ctx.fillStyle = '#64748b';
            ctx.font = '700 9.5px system-ui, -apple-system, sans-serif';
            ctx.fillText('BUKTI TRANSFER DANA (P2P)', 40, 71);

            // Top Right Badge
            ctx.fillStyle = '#f1f5f9';
            this._roundRect(ctx, W - 150, 40, 110, 24, 6, true, false);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#475569';
            ctx.font = '700 9px monospace';
            ctx.fillText('BUKTI TRANSAKSI', W - 95, 55);

            // Solid Divider Line
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(40, 88);
            ctx.lineTo(W - 40, 88);
            ctx.stroke();

            // 3. Success Circle & Status
            const circleY = 138;
            ctx.beginPath();
            ctx.arc(W / 2, circleY, 24, 0, Math.PI * 2);
            ctx.fillStyle = '#16a34a';
            ctx.fill();

            // White Checkmark
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(W / 2 - 9, circleY);
            ctx.lineTo(W / 2 - 2, circleY + 7);
            ctx.lineTo(W / 2 + 10, circleY - 6);
            ctx.stroke();

            // Status Text
            ctx.textAlign = 'center';
            ctx.font = '800 12.5px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#16a34a';
            ctx.fillText('TRANSFER BERHASIL', W / 2, 186);

            // Big Bold Amount
            ctx.font = '900 32px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.fillText(`$ ${formattedAmount}`, W / 2, 226);

            // Timestamp
            ctx.font = '500 11px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText(dateStr, W / 2, 246);

            // 4. Dashed Separator
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(40, 272);
            ctx.lineTo(W - 40, 272);
            ctx.stroke();
            ctx.setLineDash([]);

            // 5. Clean Rows Data
            const rows = [
                { label: 'No. Referensi', val: receipt.id || 'N/A', isMono: true },
                { label: 'Tanggal Game', val: `Hari ${receipt.gameDate || 'Terkini'}` },
                { label: 'Pengirim', val: `@${receipt.from || this.getCurrentUsername()}`, isBold: true },
                { label: 'Penerima', val: `@${receipt.to || 'Tujuan'}`, isBold: true },
                { label: 'Nominal Transfer', val: `$ ${formattedAmount}`, isBold: true },
                { label: 'Biaya Admin ($1 / $100)', val: `$ ${formattedAdminFee}`, color: '#b45309' },
                { label: 'Total Terdebit', val: `$ ${formattedTotal}`, isBold: true, isHighlight: true },
                { label: 'Status Transaksi', val: 'BERHASIL', color: '#16a34a', isBold: true },
                { label: 'Catatan / Berita', val: receipt.note ? `"${receipt.note}"` : '—', isItalic: true }
            ];

            let curY = 308;
            rows.forEach((r, idx) => {
                // Label on Left
                ctx.textAlign = 'left';
                ctx.font = r.isHighlight ? '800 12px system-ui, -apple-system, sans-serif' : '600 11.5px system-ui, -apple-system, sans-serif';
                ctx.fillStyle = r.isHighlight ? '#0f172a' : '#64748b';
                ctx.fillText(r.label, 42, curY);

                // Value on Right
                ctx.textAlign = 'right';
                if (r.isMono) {
                    ctx.font = '700 11px monospace';
                    ctx.fillStyle = '#0f172a';
                } else if (r.isHighlight) {
                    ctx.font = '900 13px system-ui, -apple-system, sans-serif';
                    ctx.fillStyle = '#0f172a';
                } else if (r.isBold) {
                    ctx.font = '700 12px system-ui, -apple-system, sans-serif';
                    ctx.fillStyle = r.color || '#0f172a';
                } else if (r.isItalic) {
                    ctx.font = '500 11.5px system-ui, -apple-system, sans-serif';
                    ctx.fillStyle = '#334155';
                } else {
                    ctx.font = '600 11.5px system-ui, -apple-system, sans-serif';
                    ctx.fillStyle = r.color || '#334155';
                }

                // Truncate note if too long
                let displayVal = r.val;
                if (r.isItalic && displayVal.length > 30) {
                    displayVal = displayVal.substring(0, 28) + '..."';
                }
                ctx.fillText(displayVal, W - 42, curY);

                if (idx < rows.length - 1) {
                    ctx.strokeStyle = '#f1f5f9';
                    ctx.beginPath();
                    ctx.moveTo(40, curY + 10);
                    ctx.lineTo(W - 40, curY + 10);
                    ctx.stroke();
                }

                curY += 37;
            });

            // 6. Dashed Separator
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.moveTo(40, 650);
            ctx.lineTo(W - 40, 650);
            ctx.stroke();
            ctx.setLineDash([]);

            // 7. Footer
            ctx.textAlign = 'center';
            const authCode = 'KODE OTORISASI: AA-' + (receipt.id || '').substring(4, 14).toUpperCase();
            ctx.font = '700 9px monospace';
            ctx.fillStyle = '#64748b';
            ctx.fillText(authCode, W / 2, 674);

            ctx.font = '500 10px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText('Simpan bukti transfer ini sebagai referensi transaksi yang sah.', W / 2, 694);

            ctx.font = '500 9px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`Aura Assets Financial Services • Jaringan Realtime • ${new Date().getFullYear()}`, W / 2, 710);

            // 8. Auto Download PNG
            const link = document.createElement('a');
            const filenameSafeTarget = (receipt.to || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
            const filenameSafeId = (receipt.id || 'id').substring(0, 14);
            link.download = `Bukti_Transfer_${filenameSafeTarget}_${filenameSafeId}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            ui.success('Bukti transfer berhasil diunduh (PNG)!', '📥 Bukti Transfer Disimpan');
        } catch (err) {
            console.error('[TransferManager] Download receipt failed:', err);
            ui.error('Gagal membuat gambar bukti transfer.');
        }
    }

    _roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }
}

// Expose globally for convenience
if (typeof window !== 'undefined') {
    window.downloadTransferReceipt = (receipt) => transferManager.downloadTransferReceipt(receipt);
    window.showTransferReceiptModal = (receipt) => transferManager.showTransferReceiptModal(receipt);
}

export const transferManager = new TransferManager();
export default transferManager;

