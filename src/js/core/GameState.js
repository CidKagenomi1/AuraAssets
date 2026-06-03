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

        // Listen for dayPass to record daily balance snapshot
        this.on('dayPass', (timeData) => {
            this.recordDailyBalance(timeData);
        });
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
            dailyBalanceHistory: [],
            tickBalanceHistory: [],
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
                year: 2010,
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
            },
            marketplace: {
                inventory: [],
                purchasedUpgrades: [],
                rolexMarketPrice: 15000
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
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        // BUG-04 FIX: Throttle saves — skip if saved within last 30 seconds
        const now = Date.now();
        if (this._lastSaveTime && (now - this._lastSaveTime) < 30000) {
            return false;
        }
        try {
            if (!this.currentUser) {
                console.warn('⚠️ Cannot save: No user is logged in.');
                return false;
            }
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
            this._lastSaveTime = now;
            console.debug(`💾 Game saved for user: ${this.currentUser}, Character: ${this.activeCharacter}`);
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
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

            // Ensure dailyBalanceHistory is initialized & prepopulated
            if (!this.state.dailyBalanceHistory || this.state.dailyBalanceHistory.length === 0) {
                this.prepopulateDailyHistory();
            }
            // Ensure tickBalanceHistory is initialized & prepopulated
            if (!this.state.tickBalanceHistory || this.state.tickBalanceHistory.length === 0) {
                this.prepopulateTickHistory();
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
        // BUG-04 FIX: Only schedule if no pending save AND enough time has passed
        if (this.saveTimeout) return;
        const now = Date.now();
        const timeSinceLastSave = this._lastSaveTime ? (now - this._lastSaveTime) : Infinity;
        // Delay: 30s minimum between saves, but always write if >60s has passed
        const delay = timeSinceLastSave < 30000 ? (30000 - timeSinceLastSave) : 1000;
        this.saveTimeout = setTimeout(() => this.save(), delay);
    }

    reset() {
        // BUG-07 FIX: Also remove character from charList and clear activeChar key
        const charName = this.activeCharacter;
        this.state = this.getDefaultState();
        if (this.currentUser) {
            const lowerUser = this.currentUser.toLowerCase();
            if (charName) {
                const charKey = charName.toLowerCase();
                // Remove save data
                localStorage.removeItem(`businessTycoon_save_${lowerUser}_char_${charKey}`);
                // Remove from character list
                const chars = this.getCharacters().filter(c => c.toLowerCase() !== charKey);
                this.saveCharacters(chars);
                // Clear active character key
                localStorage.removeItem(`businessTycoon_activeChar_${lowerUser}`);
                this.activeCharacter = null;
            }
            // Also remove legacy save key if it exists
            localStorage.removeItem(`businessTycoon_save_${lowerUser}`);
        }
        this.emit('reset');
        console.log('🔄 Game reset for character:', charName);
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
        // BUG-05 FIX: Use non-blocking custom event instead of alert()
        if (!this.currentUser) return;
        const loginTime = localStorage.getItem('businessTycoon_loginTime');
        if (loginTime && Date.now() - parseInt(loginTime) > 24 * 60 * 60 * 1000) {
            // Dispatch event for UI to handle gracefully instead of blocking alert
            document.dispatchEvent(new CustomEvent('sessionExpired', {
                detail: { message: 'Sesi Anda telah berakhir (24 jam). Silakan login kembali.' }
            }));
            // Give UI a moment to show the notification before logging out
            setTimeout(() => this.logout(), 3000);
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
        // BUG-01 FIX: Include stock portfolio, crypto wallet, savings, and property values
        let netWorth = this.state.player.balance;

        // Add savings/deposito value
        netWorth += (this.state.savings?.balance || 0);

        // Add Reksa Dana value
        const rdPortfolio = this.state.savings?.reksaDana || {};
        const rdFunds = [
            { id: 'pasar_uang', nav: 1.042 },
            { id: 'pendapatan_tetap', nav: 1.238 },
            { id: 'campuran', nav: 2.115 },
            { id: 'saham', nav: 3.871 },
        ];
        rdFunds.forEach(f => {
            const holding = rdPortfolio[f.id];
            if (holding && holding.units > 0) {
                netWorth += holding.units * f.nav * 1000;
            }
        });

        // Add stock portfolio value (uses avgBuyPrice as fallback if market not loaded)
        const stocks = this.state.stocks || {};
        for (const symbol in stocks) {
            const holding = stocks[symbol];
            if (holding && holding.shares > 0) {
                // Try to get live price from window.game.stocks if available
                let currentPrice = holding.avgBuyPrice;
                try {
                    const liveStock = window.game?.stocks?.getStock(symbol);
                    if (liveStock?.price) currentPrice = liveStock.price;
                } catch(e) {}
                netWorth += currentPrice * holding.shares;
            }
        }

        // Add crypto wallet value
        const crypto = this.state.crypto || {};
        for (const symbol in crypto) {
            const holding = crypto[symbol];
            if (holding && holding.amount > 0) {
                let currentPrice = holding.avgBuyPrice;
                try {
                    const liveCrypto = window.game?.crypto?.getCrypto(symbol);
                    if (liveCrypto?.price) currentPrice = liveCrypto.price;
                } catch(e) {}
                netWorth += currentPrice * holding.amount;
            }
        }

        // Add property portfolio value
        const properties = this.state.properties || [];
        for (const prop of properties) {
            netWorth += (prop.price || 0);
        }

        // Subtract active loan balances
        for (const loan of (this.state.loans || [])) {
            if (!loan.paid) {
                netWorth -= (loan.remaining || 0);
            }
        }

        return netWorth;
    }

    prepopulateDailyHistory() {
        this.state.dailyBalanceHistory = [];
        const currentBalance = this.getBalance();
        const currentDay = this.get('gameTime.day') || 1;
        const currentMonth = this.get('gameTime.month') || 1;
        const currentYear = this.get('gameTime.year') || 2010;
        
        let balance = currentBalance;
        const temp = [];
        for (let i = 364; i >= 0; i--) {
            let d = currentDay - i;
            let m = currentMonth;
            let y = currentYear;
            while (d <= 0) {
                d += 30;
                m -= 1;
                if (m <= 0) {
                    m += 12;
                    y -= 1;
                }
            }
            // Upward drift random walk backwards
            const drift = (Math.random() - 0.45) * 0.003;
            balance = Math.max(100, balance * (1 - drift));
            temp.push({
                day: d,
                month: m,
                year: y,
                balance: Math.round(balance),
                label: `${d}/${m}`
            });
        }
        this.state.dailyBalanceHistory = temp;
    }

    prepopulateTickHistory() {
        this.state.tickBalanceHistory = [];
        const currentBalance = this.getBalance();
        let balance = currentBalance;
        const now = new Date();
        const temp = [];
        for (let i = 23; i >= 0; i--) {
            const t = new Date(now.getTime() - i * 1000);
            const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const drift = (Math.random() - 0.45) * 0.001;
            balance = Math.max(100, balance * (1 - drift));
            temp.push({
                time: timeStr,
                balance: Math.round(balance)
            });
        }
        this.state.tickBalanceHistory = temp;
    }

    recordDailyBalance(timeData) {
        if (!this.state.dailyBalanceHistory) {
            this.state.dailyBalanceHistory = [];
        }
        
        const day = timeData?.day || this.get('gameTime.day') || 1;
        const month = timeData?.month || this.get('gameTime.month') || 1;
        const year = timeData?.year || this.get('gameTime.year') || 2010;
        
        this.state.dailyBalanceHistory.push({
            day,
            month,
            year,
            balance: this.getBalance(),
            label: `${day}/${month}`
        });
        
        if (this.state.dailyBalanceHistory.length > 365) {
            this.state.dailyBalanceHistory.shift();
        }
        
        this.emit('dailyBalanceUpdate', this.state.dailyBalanceHistory);
    }

    recordTickBalance() {
        if (!this.state.tickBalanceHistory) {
            this.state.tickBalanceHistory = [];
        }
        
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.state.tickBalanceHistory.push({
            time: timeStr,
            balance: this.getBalance()
        });
        
        if (this.state.tickBalanceHistory.length > 24) {
            this.state.tickBalanceHistory.shift();
        }
        
        this.emit('tickBalanceUpdate', this.state.tickBalanceHistory);
    }
}

// Singleton instance
export const gameState = new GameState();
export default gameState;
