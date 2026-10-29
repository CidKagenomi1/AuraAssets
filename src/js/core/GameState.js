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
            unlockedMilestones: [],
            claimedMilestones: [],

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

            // Game Time (Real-World UTC)
            gameTime: {
                day: new Date().getUTCDate(),
                month: new Date().getUTCMonth() + 1,
                year: new Date().getUTCFullYear(),
                speed: 1,
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


            // Properties/Real Estate
            properties: [],

            // Career / Investor Rank progression
            work: {
                careerLevel: 1,
                xp: 0,
                history: []
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

        // If setting player name, keep it synchronized
        if (path === 'player.name' && value) {
            if (this.currentUser && this.currentUser !== value) {
                this.currentUser = value;
                localStorage.setItem('businessTycoon_currentUser', value);
            }
        }

        // Keep chart history synchronized when player balance changes
        if (path === 'player.balance' && typeof value === 'number') {
            const currentNW = Math.round(this.getNetWorth());
            const dHist = this.state.dailyBalanceHistory || [];
            if (dHist.length === 0 || (dHist[0]?.balance <= 100 && currentNW > 1000)) {
                this.prepopulateDailyHistory();
                this.prepopulateTickHistory();
            } else if (dHist.length > 0) {
                dHist[dHist.length - 1].balance = currentNW;
            }
            const tHist = this.state.tickBalanceHistory || [];
            if (tHist.length > 0) {
                tHist[tHist.length - 1].balance = currentNW;
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
        const now = Date.now();
        // Allow saves at most once every 5 seconds on manual call
        if (this._lastSaveTime && (now - this._lastSaveTime) < 5000) {
            return false;
        }
        try {
            if (!this.currentUser) {
                console.warn('⚠️ Cannot save: No user is logged in.');
                return false;
            }
            const lowerUser = this.currentUser.toLowerCase();
            localStorage.setItem(`businessTycoon_save_${lowerUser}`, JSON.stringify(this.state));
            this._lastSaveTime = now;
            console.debug(`💾 Game saved directly for user account: ${this.currentUser}`);
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
                return;
            }

            const lowerUser = this.currentUser.toLowerCase();

            // 1. Direct-to-account save
            let saved = localStorage.getItem(`businessTycoon_save_${lowerUser}`);

            // 2. Backward compatibility migration: If not found, check if there's legacy character slot
            if (!saved) {
                const activeChar = localStorage.getItem(`businessTycoon_activeChar_${lowerUser}`);
                if (activeChar) {
                    const charSave = localStorage.getItem(`businessTycoon_save_${lowerUser}_char_${activeChar.toLowerCase()}`);
                    if (charSave) {
                        saved = charSave;
                        localStorage.setItem(`businessTycoon_save_${lowerUser}`, saved);
                    }
                } else {
                    const charListStr = localStorage.getItem(`businessTycoon_charList_${lowerUser}`);
                    if (charListStr) {
                        try {
                            const charList = JSON.parse(charListStr);
                            if (charList && charList.length > 0) {
                                const firstCharSave = localStorage.getItem(`businessTycoon_save_${lowerUser}_char_${charList[0].toLowerCase()}`);
                                if (firstCharSave) {
                                    saved = firstCharSave;
                                    localStorage.setItem(`businessTycoon_save_${lowerUser}`, saved);
                                }
                            }
                        } catch (e) {}
                    }
                }
            }

            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = this.mergeState(this.getDefaultState(), parsed);
                // Always keep gameTime synced with real-world UTC date
                const nowUTC = new Date();
                this.state.gameTime.day = nowUTC.getUTCDate();
                this.state.gameTime.month = nowUTC.getUTCMonth() + 1;
                this.state.gameTime.year = nowUTC.getUTCFullYear();
                this.state.gameTime.speed = 1;
                this.state.player.name = this.currentUser;
                console.log(`📂 Game loaded for user account: ${this.currentUser}`);
            } else {
                this.state = this.getDefaultState();
                this.state.player.name = this.currentUser;
            }

            // Ensure dailyBalanceHistory is initialized, uses real UTC year, & matches non-zero net worth
            const currentNW = this.getNetWorth();
            const dHist = this.state.dailyBalanceHistory || [];
            const lastEntry = dHist[dHist.length - 1];
            const currentUTCYear = new Date().getUTCFullYear();
            const isStaleHistory = !lastEntry || lastEntry.year !== currentUTCYear || (dHist[0]?.balance <= 100 && currentNW > 1000);
            if (dHist.length === 0 || isStaleHistory) {
                this.prepopulateDailyHistory();
            }
            // Ensure tickBalanceHistory is initialized & prepopulated with synchronized UTC timestamps
            const tHist = this.state.tickBalanceHistory || [];
            const lastTick = tHist[tHist.length - 1];
            const nowTime = Date.now();
            const isStaleTick = !lastTick || !lastTick.timestamp || (nowTime - lastTick.timestamp > 3600 * 1000 * 2);
            if (tHist.length === 0 || isStaleHistory || isStaleTick || (tHist[0]?.balance <= 100 && currentNW > 1000)) {
                this.prepopulateTickHistory();
            }
        } catch (e) {
            console.error('Failed to load game:', e);
        }
    }

    getCharacters() {
        return [];
    }

    saveCharacters() {}

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

        // 2. Migrate direct-to-account save
        const saveData = localStorage.getItem(`businessTycoon_save_${lowerOld}`);
        if (saveData) {
            localStorage.setItem(`businessTycoon_save_${lowerNew}`, saveData);
            localStorage.removeItem(`businessTycoon_save_${lowerOld}`);
        }

        // 3. Update state
        this.currentUser = cleanName;
        this.state.player.name = cleanName;
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
        if (this.saveTimeout) return;
        const now = Date.now();
        const timeSinceLastSave = this._lastSaveTime ? (now - this._lastSaveTime) : Infinity;
        const delay = timeSinceLastSave < 10000 ? (10000 - timeSinceLastSave) : 1000;
        this.saveTimeout = setTimeout(() => this.save(), delay);
    }

    reset() {
        this.state = this.getDefaultState();
        if (this.currentUser) {
            const lowerUser = this.currentUser.toLowerCase();
            localStorage.removeItem(`businessTycoon_save_${lowerUser}`);
            this.state.player.name = this.currentUser;
        }
        this.emit('reset');
        console.log('🔄 Game reset for account:', this.currentUser);
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
        const currentNetWorth = Math.max(100, Math.round(this.getNetWorth()));
        const now = new Date();

        let netWorth = currentNetWorth;
        const temp = [];
        for (let i = 0; i <= 364; i++) {
            const dt = new Date(now.getTime() - i * 86400000);
            const d = dt.getUTCDate();
            const m = dt.getUTCMonth() + 1;
            const y = dt.getUTCFullYear();

            temp.unshift({
                day: d,
                month: m,
                year: y,
                balance: Math.round(i === 0 ? currentNetWorth : netWorth),
                label: `${d}/${m}`
            });

            // Realistic macro drift walk backwards in time toward past history
            const drift = (Math.random() - 0.48) * 0.0035;
            netWorth = Math.max(50, netWorth * (1 - drift));
        }
        this.state.dailyBalanceHistory = temp;
    }

    prepopulateTickHistory() {
        this.state.tickBalanceHistory = [];
        const currentNetWorth = Math.max(100, Math.round(this.getNetWorth()));
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const temp = [];
        const totalPoints = 24;
        const phaseShift = Math.random() * Math.PI * 2;
        let walk = 0;

        for (let i = totalPoints - 1; i >= 0; i--) {
            const t = new Date(now.getTime() - i * 3600 * 1000);
            // Synchronized hourly marks for past points, exact live UTC minute for current point
            const timeStr = i === 0 
                ? `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())} UTC`
                : `${pad(t.getUTCHours())}:00 UTC`;
            
            if (i === 0) {
                temp.push({
                    time: timeStr,
                    timestamp: now.getTime(),
                    balance: currentNetWorth
                });
            } else {
                // Realistic intraday curve: subtle harmonic wave + mean-reverting drift
                const wave = Math.sin((i / totalPoints) * Math.PI * 2 + phaseShift) * 0.005;
                walk = walk * 0.7 + (Math.random() - 0.49) * 0.003;
                const pctOffset = wave + walk;
                const pointBalance = Math.max(50, Math.round(currentNetWorth * (1 - pctOffset)));
                temp.push({
                    time: timeStr,
                    timestamp: t.getTime(),
                    balance: pointBalance
                });
            }
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
            balance: Math.round(this.getNetWorth()),
            label: `${day}/${month}`
        });
        
        if (this.state.dailyBalanceHistory.length > 365) {
            this.state.dailyBalanceHistory.shift();
        }
        
        this.emit('dailyBalanceUpdate', this.state.dailyBalanceHistory);
    }

    recordTickBalance() {
        if (!this.state.tickBalanceHistory || this.state.tickBalanceHistory.length === 0) {
            this.prepopulateTickHistory();
            return;
        }
        
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const timeStr = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())} UTC`;
        const currentNetWorth = Math.round(this.getNetWorth());
        const history = this.state.tickBalanceHistory;
        const lastEntry = history[history.length - 1];

        // Check if an hourly boundary has passed to append a new synchronized slot
        const lastHour = lastEntry?.timestamp ? new Date(lastEntry.timestamp).getUTCHours() : -1;
        const currentHour = now.getUTCHours();
        const isNewHour = (lastHour !== -1 && lastHour !== currentHour);

        if (isNewHour) {
            // Round previous point to its hour mark :00 UTC
            if (lastEntry && lastEntry.timestamp) {
                const prevDate = new Date(lastEntry.timestamp);
                lastEntry.time = `${pad(prevDate.getUTCHours())}:00 UTC`;
            }
            history.push({
                time: timeStr,
                timestamp: now.getTime(),
                balance: currentNetWorth
            });
            if (history.length > 24) {
                history.shift();
            }
        } else if (lastEntry) {
            const hasChanged = lastEntry.balance !== currentNetWorth || lastEntry.time !== timeStr;
            lastEntry.balance = currentNetWorth;
            lastEntry.time = timeStr;
            lastEntry.timestamp = now.getTime();
            if (!hasChanged) return;
        }
        
        this.emit('tickBalanceUpdate', this.state.tickBalanceHistory);
    }
}

// Singleton instance
export const gameState = new GameState();
export default gameState;
