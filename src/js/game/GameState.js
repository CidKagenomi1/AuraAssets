/**
 * GameState.js - Central State Management
 * Manages all game data with save/load to localStorage
 */

class GameState {
    constructor() {
        this.listeners = new Map();
        this.currentUser = localStorage.getItem('businessTycoon_currentUser') || null;

        // Auto-logout check on load
        if (this.currentUser) {
            let loginTime = localStorage.getItem('businessTycoon_loginTime');
            if (!loginTime) {
                loginTime = Date.now().toString();
                localStorage.setItem('businessTycoon_loginTime', loginTime);
            }
            if (Date.now() - parseInt(loginTime) > 24 * 60 * 60 * 1000) {
                console.log('⏰ Session expired (24 hours). Automatically logging out...');
                this.currentUser = null;
                localStorage.removeItem('businessTycoon_currentUser');
                localStorage.removeItem('businessTycoon_loginTime');
            }
        }

        this.activeCharacter = this.currentUser ? localStorage.getItem(`businessTycoon_activeChar_${this.currentUser.toLowerCase()}`) || null : null;
        this.state = this.getDefaultState();
        this.load();
    }

    getDefaultState() {
        return {
            // Player Info
            player: {
                name: 'Pemain',
                balance: 0,
                totalTopUp: 0,
                totalWithdraw: 0,
                monthStartBalance: 0,
                creditScore: 700,
                createdAt: null,
                role: null,          // 'karyawan' | 'investor' | 'pebisnis'
                roleSelectedAt: null
            },

            // Financial Records
            transactions: [],
            income: [],
            expenses: [],

            // Loans
            loans: [],

            // Investments
            stocks: {},      // { symbol: { shares: 0, avgBuyPrice: 0 } }
            crypto: {},      // { symbol: { amount: 0, avgBuyPrice: 0 } }

            // Career
            career: {
                currentJob: null,
                skills: {},
                experience: 0
            },

            // Game Time
            gameTime: {
                day: 1,
                month: 1,
                year: 2026,
                speed: 1,  // 1 = normal, 2 = fast, 0 = paused
                lastTick: Date.now()
            },

            // Global Economy
            economy: {
                index: 1000,
                history: [],
                phase: 'RECOVERY',
                cycleDays: 90,
                momentum: 0,           // smoothed daily movement [v3.0]
                bearStreakDays: 0,     // consecutive bear/trough days for recovery bonus [v3.0]
                moneySupply: 1000000000,
                playerImpact: 0
            },


            // Business (New)
            business: {
                active: false,
                name: "",
                type: "",       // 'umkm' | 'startup'
                industry: "",   // 'tech', 'fnb', 'retail', 'service'
                level: 1,
                valuation: 0,
                revenue: 0,
                cash: 0,
                employees: 0,
                marketing: 0,
                productQuality: 1,
                foundedAt: 0,
                history: []
            },

            // Settings
            settings: {
                soundEnabled: true,
                notificationsEnabled: true,
                theme: 'dark',
                hideBalance: false
            },

            // Notifications
            notifications: [],
            unreadNotificationsCount: 0,

            // Savings/Deposito
            savings: {
                balance: 0,
                lastInterest: 0,
                lastDeposit: null,
                autoDepositEnabled: false,
                autoDepositAmount: 0
            },

            // Idle Earn System
            earn: {
                level: 1,
                pendingEarn: 0,
                totalEarned: 0,
                lastEarnTick: Date.now()
            },

            // Properties/Real Estate
            properties: [],

            // Work / Task progression
            work: {
                careerLevel: 1,
                xp: 0,
                tasksCompletedToday: 0,
                lastTaskDate: null,
                totalTasksDone: 0,
                performance: 100,
                activeTask: null
            },
            donations: {
                totalDonated: 0,
                luckMultiplier: 1.0,
                luckTicksRemaining: 0
            }
        };
    }

    // State access
    get(path) {
        const keys = path.split('.');
        let value = this.state;
        for (const key of keys) {
            if (value === undefined) return undefined;
            value = value[key];
        }
        return value;
    }

    // State mutation
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.state;

        for (const key of keys) {
            if (!(key in target)) target[key] = {};
            target = target[key];
        }

        const oldValue = target[lastKey];
        target[lastKey] = value;

        // If setting player name, keep activeCharacter updated
        if (path === 'player.name') {
            this.activeCharacter = value;
            if (this.currentUser) {
                const lowerUser = this.currentUser.toLowerCase();
                localStorage.setItem(`businessTycoon_activeChar_${lowerUser}`, value);
                const chars = this.getCharacters();
                if (!chars.includes(value)) {
                    chars.push(value);
                    this.saveCharacters(chars);
                }
            }
        }

        // Notify listeners
        this.emit(path, value, oldValue);
        this.emit('change', { path, value, oldValue });

        // Auto-save
        this.scheduleSave();

        return value;
    }

    // Update nested state
    update(path, updater) {
        const current = this.get(path);
        const newValue = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
        return this.set(path, newValue);
    }

    // Event system
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) callbacks.splice(index, 1);
        }
    }

    emit(event, ...args) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(cb => cb(...args));
        }
    }

    // Persistence
    save() {
        try {
            if (!this.currentUser) return;
            const charKey = this.activeCharacter ? this.activeCharacter.toLowerCase() : 'pemain';
            localStorage.setItem(`businessTycoon_save_${this.currentUser.toLowerCase()}_char_${charKey}`, JSON.stringify(this.state));
            
            // Also ensure activeCharacter is saved in charList and activeChar key
            if (this.activeCharacter) {
                const chars = this.getCharacters();
                if (!chars.includes(this.activeCharacter)) {
                    chars.push(this.activeCharacter);
                    this.saveCharacters(chars);
                }
                localStorage.setItem(`businessTycoon_activeChar_${this.currentUser.toLowerCase()}`, this.activeCharacter);
            }
            console.log(`💾 Game saved for user: ${this.currentUser}, Character: ${this.activeCharacter}`);
        } catch (e) {
            console.error('Failed to save game:', e);
        }
    }

    load() {
        try {
            if (!this.currentUser) {
                this.state = this.getDefaultState();
                this.state.player.name = 'Tamu';
                this.activeCharacter = null;
                return;
            }

            const lowerUser = this.currentUser.toLowerCase();
            this.activeCharacter = localStorage.getItem(`businessTycoon_activeChar_${lowerUser}`) || null;

            // Legacy save migration: check if there's a save under the old name format
            const legacySaved = localStorage.getItem(`businessTycoon_save_${lowerUser}`);
            if (legacySaved && !this.activeCharacter) {
                const parsed = JSON.parse(legacySaved);
                const charName = parsed?.player?.name || this.currentUser;
                this.activeCharacter = charName;
                localStorage.setItem(`businessTycoon_activeChar_${lowerUser}`, charName);
                
                // Add to character list
                const chars = this.getCharacters();
                if (!chars.includes(charName)) {
                    chars.push(charName);
                    this.saveCharacters(chars);
                }

                // Write to new character slot
                localStorage.setItem(`businessTycoon_save_${lowerUser}_char_${charName.toLowerCase()}`, legacySaved);
                // Remove legacy save key
                localStorage.removeItem(`businessTycoon_save_${lowerUser}`);
            }

            if (!this.activeCharacter) {
                // First-time logged-in user with no active character yet
                this.state = this.getDefaultState();
                return;
            }

            const charKey = this.activeCharacter.toLowerCase();
            const saved = localStorage.getItem(`businessTycoon_save_${lowerUser}_char_${charKey}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = this.mergeState(this.getDefaultState(), parsed);
                console.log(`📂 Game loaded for user: ${this.currentUser}, Character: ${this.activeCharacter}`);
            } else {
                this.state = this.getDefaultState();
                this.state.player.name = this.activeCharacter;
            }
        } catch (e) {
            console.error('Failed to load game:', e);
        }
    }

    getCharacters() {
        if (!this.currentUser) return [];
        try {
            const data = localStorage.getItem(`businessTycoon_charList_${this.currentUser.toLowerCase()}`);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    saveCharacters(chars) {
        if (!this.currentUser) return;
        try {
            localStorage.setItem(`businessTycoon_charList_${this.currentUser.toLowerCase()}`, JSON.stringify(chars));
        } catch (e) {}
    }

    changeAccountUsername(newUsername) {
        const cleanName = newUsername.trim();
        const lowerNew = cleanName.toLowerCase();
        if (!cleanName) throw new Error('Nama akun baru tidak boleh kosong!');
        if (cleanName.length < 3) throw new Error('Nama akun minimal 3 karakter!');
        if (!this.currentUser) throw new Error('Anda belum login!');

        const oldUser = this.currentUser;
        const lowerOld = oldUser.toLowerCase();
        if (lowerOld === lowerNew) return true; // No change

        const accounts = this.getAccounts();
        if (accounts[lowerNew]) throw new Error('Nama akun baru sudah terdaftar!');

        // 1. Copy account record
        const accInfo = { ...accounts[lowerOld], username: cleanName };
        accounts[lowerNew] = accInfo;
        delete accounts[lowerOld];
        this.saveAccounts(accounts);

        // 2. Migrate active character name key
        const activeChar = localStorage.getItem(`businessTycoon_activeChar_${lowerOld}`);
        if (activeChar) {
            localStorage.setItem(`businessTycoon_activeChar_${lowerNew}`, activeChar);
            localStorage.removeItem(`businessTycoon_activeChar_${lowerOld}`);
        }

        // 3. Migrate character list key
        const charList = localStorage.getItem(`businessTycoon_charList_${lowerOld}`);
        if (charList) {
            localStorage.setItem(`businessTycoon_charList_${lowerNew}`, charList);
            localStorage.removeItem(`businessTycoon_charList_${lowerOld}`);
        }

        // 4. Migrate saves for all characters in list
        const chars = charList ? JSON.parse(charList) : [];
        chars.forEach(char => {
            const charKey = char.toLowerCase();
            const saveData = localStorage.getItem(`businessTycoon_save_${lowerOld}_char_${charKey}`);
            if (saveData) {
                localStorage.setItem(`businessTycoon_save_${lowerNew}_char_${charKey}`, saveData);
                localStorage.removeItem(`businessTycoon_save_${lowerOld}_char_${charKey}`);
            }
        });

        // 5. Update state
        this.currentUser = cleanName;
        localStorage.setItem('businessTycoon_currentUser', cleanName);
        return true;
    }

    changeAccountPassword(newPassword) {
        if (!newPassword || newPassword.length < 4) throw new Error('Password minimal 4 karakter!');
        if (!this.currentUser) throw new Error('Anda belum login!');

        const accounts = this.getAccounts();
        const lowerUser = this.currentUser.toLowerCase();
        if (!accounts[lowerUser]) throw new Error('Akun tidak ditemukan!');

        accounts[lowerUser].password = newPassword;
        this.saveAccounts(accounts);
        return true;
    }

    changeAccountAvatar(newAvatar) {
        if (!this.currentUser) throw new Error('Anda belum login!');
        const accounts = this.getAccounts();
        const lowerUser = this.currentUser.toLowerCase();
        if (!accounts[lowerUser]) throw new Error('Akun tidak ditemukan!');

        accounts[lowerUser].avatar = newAvatar;
        this.saveAccounts(accounts);
        return true;
    }

    mergeState(defaults, saved) {
        const merged = { ...defaults };
        for (const key in saved) {
            if (typeof saved[key] === 'object' && saved[key] !== null && !Array.isArray(saved[key])) {
                merged[key] = this.mergeState(defaults[key] || {}, saved[key]);
            } else {
                merged[key] = saved[key];
            }
        }
        return merged;
    }

    scheduleSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.save(), 1000);
    }

    reset() {
        this.state = this.getDefaultState();
        if (this.currentUser) {
            localStorage.removeItem(`businessTycoon_save_${this.currentUser.toLowerCase()}`);
        }
        this.emit('reset');
        console.log('🔄 Game reset');
    }

    // Account Management Helpers
    getAccounts() {
        try {
            const data = localStorage.getItem('businessTycoon_accounts');
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    saveAccounts(accounts) {
        try {
            localStorage.setItem('businessTycoon_accounts', JSON.stringify(accounts));
        } catch (e) {}
    }

    register(username, password) {
        const cleanName = username.trim();
        const lowerName = cleanName.toLowerCase();
        if (!cleanName || !password) throw new Error('Nama dan password tidak boleh kosong!');
        if (cleanName.length < 3) throw new Error('Nama pengguna minimal 3 karakter!');
        if (password.length < 4) throw new Error('Password minimal 4 karakter!');

        const accounts = this.getAccounts();
        if (accounts[lowerName]) {
            throw new Error('Nama pengguna sudah terdaftar!');
        }

        // Save account details
        accounts[lowerName] = {
            username: cleanName,
            password: password,
            createdAt: Date.now()
        };
        this.saveAccounts(accounts);

        // Auto-login
        return this.login(cleanName, password);
    }

    login(username, password) {
        const cleanName = username.trim();
        const lowerName = cleanName.toLowerCase();
        if (!cleanName || !password) throw new Error('Nama dan password tidak boleh kosong!');

        const accounts = this.getAccounts();
        const account = accounts[lowerName];

        if (!account) {
            throw new Error('Nama pengguna tidak terdaftar!');
        }

        if (account.password !== password) {
            throw new Error('Password salah!');
        }

        this.currentUser = account.username;
        localStorage.setItem('businessTycoon_currentUser', account.username);
        localStorage.setItem('businessTycoon_loginTime', Date.now().toString());

        this.load();
        this.emit('login', account.username);
        this.emit('change', { path: 'player.name', value: account.username });
        return true;
    }

    logout() {
        this.save();
        this.currentUser = null;
        localStorage.removeItem('businessTycoon_currentUser');
        localStorage.removeItem('businessTycoon_loginTime');
        this.state = this.getDefaultState();
        this.emit('logout');
        location.reload();
    }

    checkSession() {
        if (!this.currentUser) return;
        const loginTime = localStorage.getItem('businessTycoon_loginTime');
        if (loginTime && Date.now() - parseInt(loginTime) > 24 * 60 * 60 * 1000) {
            alert('Sesi Anda telah berakhir (24 jam). Silakan login kembali.');
            this.logout();
        }
    }

    // Helper methods
    getBalance() {
        return this.state.player.balance;
    }

    addBalance(amount, type = 'income', description = '') {
        const newBalance = this.state.player.balance + amount;
        this.set('player.balance', newBalance);

        // Record transaction
        const transaction = {
            id: Date.now(),
            amount,
            type,
            description,
            balance: newBalance,
            timestamp: Date.now()
        };

        this.state.transactions.unshift(transaction);
        if (this.state.transactions.length > 100) {
            this.state.transactions = this.state.transactions.slice(0, 100);
        }

        this.emit('transaction', transaction);
        return transaction;
    }

    getNetWorth() {
        let netWorth = this.state.player.balance;

        // Add stock values
        // Add crypto values
        // Subtract loans
        for (const loan of this.state.loans) {
            if (!loan.paid) {
                netWorth -= loan.remaining;
            }
        }

        return netWorth;
    }
}

// Singleton instance
export const gameState = new GameState();
export default gameState;
