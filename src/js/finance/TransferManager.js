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

        // 3. Save receipt locally for sender
        this.saveTransferReceipt(transferPayload);

        // 4. Add sent receipt to sender's notifications
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

        const formattedAmount = financeManager.formatCurrency(receipt.amount);
        const safeSender = escapeHtml(receipt.from || this.getCurrentUsername());
        const safeTarget = escapeHtml(receipt.to || 'Pemain');
        const safeNote = receipt.note ? escapeHtml(receipt.note) : '';
        const safeId = escapeHtml(receipt.id || 'TRF-' + Date.now());
        const dateStr = new Date(receipt.timestamp || Date.now()).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const content = `
            <div style="display:flex; flex-direction:column; gap:1.2rem; align-items:stretch;">
                <!-- Header Status & Amount -->
                <div style="text-align:center; padding:1.25rem 1rem; background:radial-gradient(circle at center top, rgba(16,185,129,0.18), rgba(16,185,129,0.02) 75%); border:1px solid rgba(16,185,129,0.25); border-radius:14px; position:relative;">
                    <div style="width:52px; height:52px; border-radius:50%; background:rgba(16,185,129,0.18); border:2px solid #10b981; display:flex; align-items:center; justify-content:center; margin:0 auto 0.75rem auto; font-size:1.6rem; color:#10b981;">
                        ✓
                    </div>
                    <div style="font-size:0.75rem; font-weight:800; letter-spacing:1px; color:#10b981; text-transform:uppercase;">
                        Transfer Berhasil
                    </div>
                    <div style="font-size:2rem; font-weight:900; color:#fff; margin:0.35rem 0 0.15rem 0; letter-spacing:-0.5px;">
                        $ ${formattedAmount}
                    </div>
                    <div style="font-size:0.72rem; color:var(--text-muted); font-weight:600;">
                        Bebas Biaya Admin • Instan Settled
                    </div>
                </div>

                <!-- Receipt Detail Card -->
                <div style="background:rgba(255,255,255,0.025); border:1px solid var(--border-color); border-radius:12px; padding:1rem; font-size:0.82rem; display:flex; flex-direction:column; gap:0.65rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:var(--text-muted); font-size:0.75rem;">ID Referensi:</span>
                        <code style="color:var(--accent-primary); font-size:0.72rem; font-family:monospace; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">${safeId}</code>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:var(--text-muted); font-size:0.75rem;">Waktu Transaksi:</span>
                        <span style="color:#fff; font-weight:600;">${dateStr}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:var(--text-muted); font-size:0.75rem;">Tanggal Game:</span>
                        <span style="color:#fff; font-weight:600;">Hari ${escapeHtml(String(receipt.gameDate || 'Terkini'))}</span>
                    </div>
                    <div style="height:1px; background:rgba(255,255,255,0.06); margin:2px 0;"></div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:var(--text-muted); font-size:0.75rem;">Pengirim:</span>
                        <span style="color:#fff; font-weight:700;">@${safeSender}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:var(--text-muted); font-size:0.75rem;">Penerima (Tujuan):</span>
                        <span style="color:#38bdf8; font-weight:800;">@${safeTarget}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:var(--text-muted); font-size:0.75rem;">Biaya Admin:</span>
                        <span style="color:#10b981; font-weight:700;">$ 0.00 (Gratis)</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="color:var(--text-muted); font-size:0.75rem;">Status Jaringan:</span>
                        <span style="color:#10b981; font-weight:800; display:flex; align-items:center; gap:4px;">
                            <span style="width:6px; height:6px; border-radius:50%; background:#10b981; display:inline-block;"></span>
                            TERVERIFIKASI
                        </span>
                    </div>
                    ${safeNote ? `
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-top:2px;">
                            <span style="color:var(--text-muted); font-size:0.75rem; white-space:nowrap;">Pesan / Berita:</span>
                            <span style="color:#e2e8f0; font-style:italic; text-align:right; font-size:0.78rem;">"${safeNote}"</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Digital Security Stamp -->
                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(16,185,129,0.04); border:1px dashed rgba(16,185,129,0.22); border-radius:10px; padding:0.6rem 0.85rem; font-size:0.7rem; color:var(--text-dim);">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.1rem;">🔒</span>
                        <div>
                            <div style="font-weight:700; color:#10b981;">Aura Assets Digital Security Seal</div>
                            <div>Tervalidasi & terenkripsi di Cloud Ledger</div>
                        </div>
                    </div>
                    <span style="font-family:monospace; font-size:0.65rem; color:#64748b;">SHA256-OK</span>
                </div>

                <!-- Actions -->
                <div style="display:flex; gap:0.75rem; margin-top:0.25rem;">
                    <button type="button" id="btn-close-receipt-modal" style="
                        flex:1; padding:0.8rem; border-radius:10px; background:rgba(255,255,255,0.06); border:1px solid var(--border-color); color:var(--text-secondary); font-weight:700; cursor:pointer; font-family:inherit;
                    ">Tutup</button>
                    <button type="button" id="btn-download-receipt-png" style="
                        flex:2; padding:0.8rem; border-radius:10px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); border:none; color:#fff; font-weight:800; cursor:pointer; font-family:inherit; box-shadow:0 4px 14px rgba(16,185,129,0.3); transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:6px;
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
     * Export Transfer Receipt as high-resolution PNG image (2x Retina Canvas)
     */
    downloadTransferReceipt(receipt) {
        if (!receipt) {
            ui.error('Data bukti transfer tidak ditemukan!');
            return;
        }

        try {
            const W = 620;
            const H = 840;
            const canvas = document.createElement('canvas');
            canvas.width = W * 2;
            canvas.height = H * 2;
            canvas.style.width = W + 'px';
            canvas.style.height = H + 'px';
            const ctx = canvas.getContext('2d');
            ctx.scale(2, 2);

            // 1. Background Gradient (Fintech Dark Slate)
            const bgGrad = ctx.createLinearGradient(0, 0, W, H);
            bgGrad.addColorStop(0, '#090d16');
            bgGrad.addColorStop(0.5, '#0d1527');
            bgGrad.addColorStop(1, '#080c14');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, W, H);

            // Background subtle grid pattern
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
            ctx.lineWidth = 1;
            const gridSize = 24;
            for (let x = 0; x < W; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, H);
                ctx.stroke();
            }
            for (let y = 0; y < H; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(W, y);
                ctx.stroke();
            }

            // Top decorative glow
            const topGlow = ctx.createRadialGradient(W / 2, 0, 10, W / 2, 0, 260);
            topGlow.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
            topGlow.addColorStop(1, 'rgba(16, 185, 129, 0)');
            ctx.fillStyle = topGlow;
            ctx.fillRect(0, 0, W, 260);

            // Card Border Outer
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(16, 16, W - 32, H - 32);

            // Inner frame corner accents
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            const cornerLen = 22;
            // Top-left
            ctx.beginPath(); ctx.moveTo(16, 16 + cornerLen); ctx.lineTo(16, 16); ctx.lineTo(16 + cornerLen, 16); ctx.stroke();
            // Top-right
            ctx.beginPath(); ctx.moveTo(W - 16 - cornerLen, 16); ctx.lineTo(W - 16, 16); ctx.lineTo(W - 16, 16 + cornerLen); ctx.stroke();
            // Bottom-left
            ctx.beginPath(); ctx.moveTo(16, H - 16 - cornerLen); ctx.lineTo(16, H - 16); ctx.lineTo(16 + cornerLen, H - 16); ctx.stroke();
            // Bottom-right
            ctx.beginPath(); ctx.moveTo(W - 16 - cornerLen, H - 16); ctx.lineTo(W - 16, H - 16); ctx.lineTo(W - 16, H - 16 - cornerLen); ctx.stroke();

            // 2. Header Brand
            ctx.textAlign = 'center';
            ctx.font = '900 13px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#10b981';
            ctx.fillText('AURA ASSETS FINANCIAL NETWORK', W / 2, 52);

            ctx.font = '600 10px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('BUKTI TRANSAKSI ELEKTRONIK RESMI • P2P INSTANT TRANSFER', W / 2, 69);

            // Line separator
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(40, 84);
            ctx.lineTo(W - 40, 84);
            ctx.stroke();

            // 3. Success Check Circle
            const circleY = 126;
            ctx.beginPath();
            ctx.arc(W / 2, circleY, 28, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.fill();
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Checkmark
            ctx.beginPath();
            ctx.moveTo(W / 2 - 12, circleY);
            ctx.lineTo(W / 2 - 3, circleY + 9);
            ctx.lineTo(W / 2 + 13, circleY - 9);
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            // Status Text
            ctx.font = '800 14px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#10b981';
            ctx.fillText('TRANSFER BERHASIL', W / 2, 178);

            // Nominal Amount
            ctx.font = '900 36px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#ffffff';
            const formattedAmount = financeManager.formatCurrency(receipt.amount);
            ctx.fillText(`$ ${formattedAmount}`, W / 2, 224);

            ctx.font = '600 11px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#10b981';
            ctx.fillText('BEBAS BIAYA ADMIN • INSTANT SETTLED', W / 2, 244);

            // 4. Details Box
            const boxX = 40;
            const boxY = 265;
            const boxW = W - 80;
            const boxH = 390;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            this._roundRect(ctx, boxX, boxY, boxW, boxH, 14, true, true);

            // Rows data
            const rows = [
                { label: 'Nomor Referensi', val: receipt.id || 'N/A', highlight: false },
                { label: 'Waktu Transaksi', val: `${new Date(receipt.timestamp || Date.now()).toLocaleString('id-ID')}`, highlight: false },
                { label: 'Tanggal Game', val: `Hari ${receipt.gameDate || 'Terkini'}`, highlight: false },
                { label: 'Pengirim', val: `@${receipt.from || this.getCurrentUsername()}`, highlight: false },
                { label: 'Penerima (Tujuan)', val: `@${receipt.to || 'Tujuan'}`, highlight: true, color: '#38bdf8' },
                { label: 'Nominal Transfer', val: `$ ${formattedAmount}`, highlight: true, color: '#10b981' },
                { label: 'Biaya Admin', val: '$ 0.00 (Gratis)', highlight: false },
                { label: 'Status Transaksi', val: 'SUKSES / DIVERIFIKASI', highlight: true, color: '#10b981' },
                { label: 'Berita / Catatan', val: receipt.note ? `"${receipt.note}"` : '—', highlight: false, isNote: true }
            ];

            let curY = boxY + 28;
            rows.forEach((r, idx) => {
                ctx.textAlign = 'left';
                ctx.font = '600 11px system-ui, -apple-system, sans-serif';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(r.label, boxX + 18, curY);

                ctx.textAlign = 'right';
                ctx.font = r.highlight ? '800 12px system-ui, -apple-system, sans-serif' : '600 11.5px system-ui, -apple-system, sans-serif';
                ctx.fillStyle = r.color || '#f1f5f9';

                if (r.isNote) {
                    const noteVal = r.val.length > 32 ? r.val.substring(0, 30) + '...' : r.val;
                    ctx.fillText(noteVal, boxX + boxW - 18, curY);
                } else {
                    ctx.fillText(r.val, boxX + boxW - 18, curY);
                }

                if (idx < rows.length - 1) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
                    ctx.beginPath();
                    ctx.moveTo(boxX + 16, curY + 11);
                    ctx.lineTo(boxX + boxW - 16, curY + 11);
                    ctx.stroke();
                }

                curY += 41;
            });

            // 5. Verification Seal / Watermark Box
            const sealY = 672;
            ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
            ctx.lineWidth = 1;
            this._roundRect(ctx, boxX, sealY, boxW, 64, 10, true, true);

            // Security Hash & Seal Text
            ctx.textAlign = 'left';
            ctx.font = '800 9px monospace';
            ctx.fillStyle = '#10b981';
            ctx.fillText('🔒 DIGITAL SECURITY VERIFIED & SETTLED', boxX + 16, sealY + 22);

            const hashBase = `${receipt.id || ''}_${receipt.timestamp || Date.now()}`;
            const simulatedHash = 'HASH: 0x' + Math.abs(hashBase.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0) | 0, 0)).toString(16).toUpperCase().padStart(16, '0') + '...VALID';
            ctx.font = '500 8.5px monospace';
            ctx.fillStyle = '#64748b';
            ctx.fillText(simulatedHash, boxX + 16, sealY + 40);
            ctx.fillText('Jaringan Aura Assets Realtime Cloud Ledger • Saldo Langsung Diperbarui', boxX + 16, sealY + 52);

            // Mini decorative QR-like block
            const qrSize = 36;
            const qrX = boxX + boxW - qrSize - 14;
            const qrY = sealY + 14;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.fillRect(qrX, qrY, qrSize, qrSize);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1;
            ctx.strokeRect(qrX, qrY, qrSize, qrSize);
            ctx.fillStyle = '#10b981';
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    if ((i + j) % 2 === 0 || (i * j) % 3 === 0) {
                        ctx.fillRect(qrX + 4 + i * 7, qrY + 4 + j * 7, 5, 5);
                    }
                }
            }

            // 6. Footer Disclaimer
            ctx.textAlign = 'center';
            ctx.font = '500 9.5px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText('Dokumen elektronik ini merupakan bukti transfer sah dalam ekosistem Aura Assets.', W / 2, 765);
            ctx.font = '600 9px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = '#475569';
            ctx.fillText(`Simulasi Keuangan • aura-assets.com • ${new Date().getFullYear()}`, W / 2, 782);

            // 7. Auto Download PNG
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

