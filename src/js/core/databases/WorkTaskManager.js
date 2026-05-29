/**
 * WorkTaskManager.js - Employee Task & Career Progression System
 * Handles daily work tasks, XP, performance, assistant system, and automatic role evolution.
 */

import gameState from '../GameState.js';
import financeManager from '../../finance/FinanceManager.js';

// ── Task Library ────────────────────────────────────────────────────
export const TASK_LIBRARY = {
    compile_report: {
        id: 'compile_report', label: 'Compile Report', icon: '📊',
        desc: 'Review raw logs and compile the official performance report.',
        xp: 15, rewardBase: 8000,
        priority: 'primary',    // 'primary' | 'secondary' | 'tertiary'
        complexity: 1,          // 1-5 (used by assistant weighting)
        urgency: 'routine'      // 'urgent' | 'important' | 'routine'
    },
    document_approval: {
        id: 'document_approval', label: 'Document Approval', icon: '✍️',
        desc: 'Read through pending contracts and decide to approve or reject.',
        xp: 20, rewardBase: 12000,
        priority: 'primary',
        complexity: 2,
        urgency: 'important'
    },
    verify_invoice: {
        id: 'verify_invoice', label: 'Verify Invoice', icon: '🧾',
        desc: 'Check invoice numbers and calculations against raw ledger data.',
        xp: 25, rewardBase: 18000,
        priority: 'secondary',
        complexity: 2,
        urgency: 'important'
    },
    drag_drop_data: {
        id: 'drag_drop_data', label: 'Organize Data Rows', icon: '🗂️',
        desc: 'Sort unstructured database files into correct columns.',
        xp: 30, rewardBase: 25000,
        priority: 'secondary',
        complexity: 3,
        urgency: 'routine'
    },
    match_transaction: {
        id: 'match_transaction', label: 'Match Transaction', icon: '🔗',
        desc: 'Match statement records to ledger entries to find matching totals.',
        xp: 40, rewardBase: 35000,
        priority: 'secondary',
        complexity: 3,
        urgency: 'important'
    },
    balance_cashflow: {
        id: 'balance_cashflow', label: 'Balance Cashflow', icon: '⚖️',
        desc: 'Adjust assets and liabilities to balance the monthly balance sheet.',
        xp: 60, rewardBase: 50000,
        priority: 'tertiary',
        complexity: 5,
        urgency: 'urgent'
    }
};

// ── Assistant Config ────────────────────────────────────────────────
// Cost multiplier is relative to the player's daily salary equivalent (baseSalaryBonus / 30)
export const ASSISTANT_TIERS = {
    reminder: {
        id: 'reminder',
        label: 'Asisten Magang',
        icon: '🔔',
        emoji: '👦',
        costMultiplier: 0.10,   // 10% of daily salary
        capability: 'reminder',
        desc: 'Hanya bisa mengingatkan Anda bahwa ada tugas yang belum selesai setiap harinya.',
        color: '#94a3b8',
        badge: 'BASIC'
    },
    selective: {
        id: 'selective',
        label: 'Asisten Junior',
        icon: '🤝',
        emoji: '👩‍💼',
        costMultiplier: 0.50,   // 50% of daily salary
        capability: 'selective',
        desc: 'Secara proaktif memilih dan menyelesaikan 1-2 tugas per hari, tidak semuanya.',
        color: '#6366f1',
        badge: 'STANDARD'
    },
    full_auto: {
        id: 'full_auto',
        label: 'Asisten Senior',
        icon: '🤖',
        emoji: '🧑‍💻',
        costMultiplier: 1.50,   // 150% of daily salary
        capability: 'full_auto',
        desc: 'Menyelesaikan SEMUA tugas yang tersedia setiap hari secara otomatis dan penuh.',
        color: '#10b981',
        badge: 'PREMIUM'
    }
};

// ── Career Paths ───────────────────────────────────────────────────
export const CAREER_PATHS = {
    corporate: [
        {
            level: 1, title: 'Corporate Intern', icon: '🌱', color: '#94a3b8',
            xpRequired: 0, xpToNext: 100, promoCost: 20000,
            availableTasks: ['compile_report', 'document_approval'],
            dailyTaskSlots: 3, baseSalaryBonus: 5000,
            assistantUnlocked: false,
            assistantNote: 'Unlock asisten saat mencapai Level 4 (Team Lead)'
        },
        {
            level: 2, title: 'Junior Associate', icon: '👨‍💼', color: '#6366f1',
            xpRequired: 100, xpToNext: 300, promoCost: 60000,
            availableTasks: ['compile_report', 'document_approval', 'verify_invoice'],
            dailyTaskSlots: 4, baseSalaryBonus: 12000,
            assistantUnlocked: false,
            assistantNote: 'Unlock asisten saat mencapai Level 4 (Team Lead)'
        },
        {
            level: 3, title: 'Senior Analyst', icon: '📊', color: '#0ea5e9',
            xpRequired: 300, xpToNext: 700, promoCost: 150000,
            availableTasks: ['document_approval', 'verify_invoice', 'drag_drop_data'],
            dailyTaskSlots: 4, baseSalaryBonus: 28000,
            assistantUnlocked: false,
            assistantNote: 'Hampir! Unlock asisten saat mencapai Level 4 (Team Lead)'
        },
        {
            level: 4, title: 'Team Lead', icon: '⭐', color: '#10b981',
            xpRequired: 700, xpToNext: 1500, promoCost: 400000,
            availableTasks: ['verify_invoice', 'drag_drop_data', 'match_transaction'],
            dailyTaskSlots: 5, baseSalaryBonus: 65000,
            assistantUnlocked: true,
            assistantTiers: ['reminder', 'selective']
        },
        {
            level: 5, title: 'Assistant Manager', icon: '🌟', color: '#f59e0b',
            xpRequired: 1500, xpToNext: 3000, promoCost: 1000000,
            availableTasks: ['drag_drop_data', 'match_transaction', 'balance_cashflow'],
            dailyTaskSlots: 5, baseSalaryBonus: 150000,
            assistantUnlocked: true,
            assistantTiers: ['reminder', 'selective', 'full_auto']
        },
        {
            level: 6, title: 'Division Manager', icon: '👔', color: '#ec4899',
            xpRequired: 3000, xpToNext: 6000, promoCost: 2500000,
            availableTasks: ['match_transaction', 'balance_cashflow', 'compile_report', 'document_approval'],
            dailyTaskSlots: 6, baseSalaryBonus: 350000,
            assistantUnlocked: true,
            assistantTiers: ['reminder', 'selective', 'full_auto']
        },
        {
            level: 7, title: 'Chief Executive Officer', icon: '🏆', color: '#ef4444',
            xpRequired: 6000, xpToNext: 12000, promoCost: 6000000,
            availableTasks: ['balance_cashflow', 'match_transaction', 'document_approval', 'verify_invoice'],
            dailyTaskSlots: 6, baseSalaryBonus: 800000,
            assistantUnlocked: true,
            assistantTiers: ['reminder', 'selective', 'full_auto']
        },
        {
            level: 8, title: 'Conglomerate Owner', icon: '🚀', color: '#f97316',
            xpRequired: 12000, xpToNext: null, promoCost: null,
            availableTasks: ['balance_cashflow', 'match_transaction', 'document_approval', 'verify_invoice', 'drag_drop_data', 'compile_report'],
            dailyTaskSlots: 6, baseSalaryBonus: 2000000,
            assistantUnlocked: true,
            assistantTiers: ['reminder', 'selective', 'full_auto'],
            triggerRoleChange: 'pebisnis'
        }
    ],
    government: [
        {
            level: 1, title: 'Public Service Intern', icon: '🌱', color: '#94a3b8',
            xpRequired: 0, xpToNext: 100, promoCost: 18000,
            availableTasks: ['compile_report', 'document_approval'],
            dailyTaskSlots: 3, baseSalaryBonus: 4500,
            assistantUnlocked: false,
            assistantNote: 'Unlock asisten saat mencapai Level 4 (Assistant Director)'
        },
        {
            level: 2, title: 'Administrative Officer', icon: '👨‍💼', color: '#6366f1',
            xpRequired: 100, xpToNext: 300, promoCost: 55000,
            availableTasks: ['compile_report', 'document_approval', 'verify_invoice'],
            dailyTaskSlots: 4, baseSalaryBonus: 11000,
            assistantUnlocked: false,
            assistantNote: 'Unlock asisten saat mencapai Level 4 (Assistant Director)'
        },
        {
            level: 3, title: 'Senior Officer', icon: '📋', color: '#0ea5e9',
            xpRequired: 300, xpToNext: 700, promoCost: 140000,
            availableTasks: ['document_approval', 'verify_invoice', 'drag_drop_data'],
            dailyTaskSlots: 4, baseSalaryBonus: 26000,
            assistantUnlocked: false,
            assistantNote: 'Hampir! Unlock asisten saat mencapai Level 4 (Assistant Director)'
        },
        {
            level: 4, title: 'Assistant Director', icon: '⭐', color: '#10b981',
            xpRequired: 700, xpToNext: 1500, promoCost: 380000,
            availableTasks: ['verify_invoice', 'drag_drop_data', 'match_transaction'],
            dailyTaskSlots: 5, baseSalaryBonus: 60000,
            assistantUnlocked: true,
            assistantTiers: ['reminder', 'selective']
        },
        {
            level: 5, title: 'Deputy Director', icon: '🌟', color: '#f59e0b',
            xpRequired: 1500, xpToNext: 3000, promoCost: 950000,
            availableTasks: ['drag_drop_data', 'match_transaction', 'balance_cashflow'],
            dailyTaskSlots: 5, baseSalaryBonus: 140000,
            assistantUnlocked: true,
            assistantTiers: ['reminder', 'selective', 'full_auto']
        },
        {
            level: 6, title: 'Director General', icon: '👔', color: '#ec4899',
            xpRequired: 3000, xpToNext: 6000, promoCost: 2400000,
            availableTasks: ['match_transaction', 'balance_cashflow', 'compile_report', 'document_approval'],
            dailyTaskSlots: 6, baseSalaryBonus: 320000,
            assistantUnlocked: true,
            assistantTiers: ['reminder', 'selective', 'full_auto']
        },
        {
            level: 7, title: 'Deputy Minister', icon: '🏆', color: '#ef4444',
            xpRequired: 6000, xpToNext: 12000, promoCost: 5500000,
            availableTasks: ['balance_cashflow', 'match_transaction', 'document_approval', 'verify_invoice'],
            dailyTaskSlots: 6, baseSalaryBonus: 750000,
            assistantUnlocked: true,
            assistantTiers: ['reminder', 'selective', 'full_auto']
        },
        {
            level: 8, title: 'Cabinet Minister', icon: '🚀', color: '#f97316',
            xpRequired: 12000, xpToNext: null, promoCost: null,
            availableTasks: ['balance_cashflow', 'match_transaction', 'document_approval', 'verify_invoice', 'drag_drop_data', 'compile_report'],
            dailyTaskSlots: 6, baseSalaryBonus: 1800000,
            assistantUnlocked: true,
            assistantTiers: ['reminder', 'selective', 'full_auto'],
            triggerRoleChange: 'pebisnis'
        }
    ]
};

class WorkTaskManager {
    constructor() {
        this._activeTask = null;
    }

    // ── State helpers ────────────────────────────────────────────────
    getWorkState() {
        return gameState.get('work') || this._defaultWorkState();
    }

    _defaultWorkState() {
        return {
            careerPath: null,      // 'corporate' | 'government'
            careerLevel: 1,
            xp: 0,
            tasksCompletedToday: 0,
            lastTaskDate: null,   // game date string "day-month-year"
            totalTasksDone: 0,
            performance: 100,     // 0-200%
            activeTask: null,
            history: [],           // [{ id, type, description, extra, date }]
            assistant: null        // { tier, hiredAt, dailyCost }
        };
    }

    ensureInit() {
        if (!gameState.get('work')) {
            gameState.set('work', this._defaultWorkState());
        }
        // Migrate old saves without assistant field
        const work = gameState.get('work');
        if (work && work.assistant === undefined) {
            gameState.set('work.assistant', null);
        }
    }

    addHistory(type, description, extra = null) {
        const state = this.getWorkState();
        if (!state.history) state.history = [];
        
        const day = gameState.get('gameTime.day') || 1;
        const month = gameState.get('gameTime.month') || 1;
        const year = gameState.get('gameTime.year') || 2010;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const dateText = `${day} ${months[month - 1]} ${year}`;

        const entry = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            type,
            description,
            extra,
            date: dateText
        };

        state.history.push(entry);
        gameState.set('work', state);
    }

    // ── Getters ──────────────────────────────────────────────────────
    getCareerLevelData(level = null) {
        const state = this.getWorkState();
        const path = state.careerPath || 'corporate';
        const lvl = level ?? state.careerLevel;
        const list = CAREER_PATHS[path] || CAREER_PATHS.corporate;
        return list.find(l => l.level === lvl) || list[0];
    }

    getNextLevelData() {
        const state = this.getWorkState();
        const path = state.careerPath || 'corporate';
        const current = state.careerLevel;
        const list = CAREER_PATHS[path] || CAREER_PATHS.corporate;
        return list.find(l => l.level === current + 1) || null;
    }

    getXP() { return this.getWorkState().xp || 0; }

    getAvailableTasks() {
        const lvlData = this.getCareerLevelData();
        return lvlData.availableTasks.map(id => TASK_LIBRARY[id]).filter(Boolean);
    }

    getTaskById(id) { return TASK_LIBRARY[id] || null; }

    canDoMoreTasksToday() {
        const state = this.getWorkState();
        const lvlData = this.getCareerLevelData();
        const today = this._todayKey();
        if (state.lastTaskDate !== today) return true; // new day
        return state.tasksCompletedToday < lvlData.dailyTaskSlots;
    }

    getRemainingTasksToday() {
        const state = this.getWorkState();
        const lvlData = this.getCareerLevelData();
        const today = this._todayKey();
        if (state.lastTaskDate !== today) return lvlData.dailyTaskSlots;
        return Math.max(0, lvlData.dailyTaskSlots - state.tasksCompletedToday);
    }

    _todayKey() {
        const d = gameState.get('gameTime.day');
        const m = gameState.get('gameTime.month');
        const y = gameState.get('gameTime.year');
        return `${d}-${m}-${y}`;
    }

    isTaskActive() { return false; }
    getActiveTask() { return null; }

    // ── Career Path Selection ────────────────────────────────────────
    selectPath(path) {
        if (path !== 'corporate' && path !== 'government') throw new Error('Invalid career path');
        gameState.update('work', w => ({
            ...w,
            careerPath: path,
            careerLevel: 1,
            xp: 0
        }));
        this.addHistory('select_path', `Memilih Jalur Karir: ${path === 'corporate' ? 'Corporate' : 'Government'}`, path);
        gameState.emit('careerPathSelected', { path });
    }

    resign() {
        const state = this.getWorkState();
        const oldPath = state.careerPath;
        // Also fire assistant if active
        if (state.assistant) {
            gameState.update('work', w => ({ ...w, assistant: null }));
        }
        gameState.update('work', w => ({
            ...w,
            careerPath: null,
            careerLevel: 1,
            xp: 0,
            tasksCompletedToday: 0,
            assistant: null
        }));
        if (oldPath) {
            this.addHistory('resign', `Mengundurkan diri (Resign) dari jalur ${oldPath === 'corporate' ? 'Corporate' : 'Government'}`, oldPath);
        }
        gameState.emit('careerResign');
    }

    // ── Instant Promotion ─────────────────────────────────────────────
    buyInstantPromotion() {
        const state = this.getWorkState();
        const path = state.careerPath || 'corporate';
        const currentLevelData = this.getCareerLevelData();
        const promoCost = currentLevelData.promoCost;

        if (!promoCost) {
            throw new Error('You have already reached the highest rank!');
        }

        const balance = gameState.getBalance();
        if (balance < promoCost) {
            throw new Error(`Insufficient funds! Need $ ${financeManager.formatCurrency(promoCost)}`);
        }

        // Deduct money
        financeManager.addExpense(promoCost, 'Upgrade', `Instant Promotion to Level ${state.careerLevel + 1}`);

        // Set XP to start of next level
        const nextLevel = state.careerLevel + 1;
        const list = CAREER_PATHS[path];
        const nextLevelData = list.find(l => l.level === nextLevel);
        const newXP = currentLevelData.xpRequired + currentLevelData.xpToNext;

        gameState.update('work', w => ({
            ...w,
            careerLevel: nextLevel,
            xp: newXP
        }));

        this.addHistory('promotion', `Naik jabatan instan ke: ${nextLevelData.title}`, nextLevel);

        gameState.emit('careerLevelUp', { level: nextLevel, levelData: nextLevelData });

        // Trigger role evolution if next level triggers it
        if (nextLevelData.triggerRoleChange) {
            this._triggerRoleEvolution(nextLevelData.triggerRoleChange, nextLevelData);
        }

        return { newLevel: nextLevel, levelData: nextLevelData };
    }

    // ── Assistant System ──────────────────────────────────────────────
    /**
     * Get assistant config for current career level
     */
    getAssistantConfig() {
        const lvlData = this.getCareerLevelData();
        if (!lvlData.assistantUnlocked) {
            return { unlocked: false, note: lvlData.assistantNote || 'Belum tersedia' };
        }
        const tiers = (lvlData.assistantTiers || []).map(tierId => {
            const tier = ASSISTANT_TIERS[tierId];
            const dailySalary = lvlData.baseSalaryBonus / 30;
            const dailyCost = Math.floor(dailySalary * tier.costMultiplier);
            return { ...tier, dailyCost };
        });
        return { unlocked: true, tiers };
    }

    /**
     * Get current assistant state
     */
    getAssistant() {
        return this.getWorkState().assistant || null;
    }

    /**
     * Hire an assistant of a given tier
     */
    hireAssistant(tierId) {
        const config = this.getAssistantConfig();
        if (!config.unlocked) throw new Error('Asisten belum tersedia di jabatan ini.');

        const tierConfig = config.tiers.find(t => t.id === tierId);
        if (!tierConfig) throw new Error('Tier asisten tidak valid untuk jabatan ini.');

        const balance = gameState.getBalance();
        if (balance < tierConfig.dailyCost) {
            throw new Error(`Dana tidak cukup! Biaya hari ini: $${financeManager.formatCurrency(tierConfig.dailyCost)}`);
        }

        // Deduct first day cost
        financeManager.addExpense(tierConfig.dailyCost, 'Asisten', `Biaya asisten: ${tierConfig.label}`);

        gameState.update('work', w => ({
            ...w,
            assistant: {
                tier: tierId,
                hiredAt: this._todayKey(),
                dailyCost: tierConfig.dailyCost,
                lastWorkDate: null
            }
        }));

        this.addHistory('hire_assistant', `Merekrut ${tierConfig.label} (${tierConfig.badge})`, tierId);
        gameState.emit('assistantHired', { tier: tierId });
    }

    /**
     * Fire the current assistant
     */
    fireAssistant() {
        const state = this.getWorkState();
        if (!state.assistant) throw new Error('Tidak ada asisten yang aktif.');

        const tier = ASSISTANT_TIERS[state.assistant.tier];
        gameState.update('work', w => ({ ...w, assistant: null }));
        this.addHistory('fire_assistant', `Memberhentikan ${tier?.label || 'Asisten'}`, state.assistant.tier);
        gameState.emit('assistantFired');
    }

    /**
     * Called every in-game day. Processes assistant actions.
     * Returns { acted: bool, description: string }
     */
    tickAssistant() {
        const state = this.getWorkState();
        if (!state.assistant || !state.careerPath) return null;

        const today = this._todayKey();
        if (state.assistant.lastWorkDate === today) return null; // Already worked today

        const tier = ASSISTANT_TIERS[state.assistant.tier];
        const lvlData = this.getCareerLevelData();
        const dailyCost = state.assistant.dailyCost;

        // Deduct daily cost
        const balance = gameState.getBalance();
        if (balance < dailyCost) {
            // Can't afford today — fire the assistant
            this.fireAssistant();
            return { acted: false, description: '⚠️ Asisten dihentikan karena dana tidak mencukupi untuk hari ini.' };
        }

        financeManager.addExpense(dailyCost, 'Asisten', `Biaya harian asisten: ${tier.label}`);

        // Update lastWorkDate
        gameState.update('work', w => ({
            ...w,
            assistant: { ...w.assistant, lastWorkDate: today }
        }));

        const tasks = this.getAvailableTasks();

        if (tier.capability === 'reminder') {
            // Just a notification reminder
            gameState.emit('assistantReminder', { taskCount: this.getRemainingTasksToday() });
            return {
                acted: true,
                description: `🔔 ${tier.label} mengingatkan: Anda punya ${this.getRemainingTasksToday()} tugas yang belum dikerjakan hari ini!`
            };
        }

        if (tier.capability === 'selective') {
            // Pick 1-2 tasks (lowest complexity first), complete them automatically
            if (!this.canDoMoreTasksToday()) {
                return { acted: false, description: `${tier.label}: Semua tugas sudah selesai hari ini.` };
            }
            const sorted = [...tasks].sort((a, b) => a.complexity - b.complexity);
            const toComplete = sorted.slice(0, Math.min(2, this.getRemainingTasksToday()));
            let totalReward = 0;
            let totalXP = 0;
            toComplete.forEach(task => {
                if (this.canDoMoreTasksToday()) {
                    const result = this.completeTaskDirectly(task.id);
                    totalReward += result.reward;
                    totalXP += result.xpGained;
                }
            });
            return {
                acted: true,
                description: `🤝 ${tier.label} menyelesaikan ${toComplete.length} tugas. +$${financeManager.formatCurrency(totalReward)} | +${totalXP} XP`
            };
        }

        if (tier.capability === 'full_auto') {
            // Complete ALL available tasks
            let totalReward = 0;
            let totalXP = 0;
            let count = 0;
            while (this.canDoMoreTasksToday() && count < tasks.length) {
                const task = tasks[count % tasks.length];
                const result = this.completeTaskDirectly(task.id);
                totalReward += result.reward;
                totalXP += result.xpGained;
                count++;
            }
            return {
                acted: true,
                description: `🤖 ${tier.label} menyelesaikan semua ${count} tugas hari ini. +$${financeManager.formatCurrency(totalReward)} | +${totalXP} XP`
            };
        }

        return null;
    }

    // ── Direct Task Completion (triggered from UI Simulation) ────────
    completeTaskDirectly(taskId) {
        const task = TASK_LIBRARY[taskId];
        if (!task) throw new Error('Task not found');

        const state = this.getWorkState();
        const lvlData = this.getCareerLevelData(state.careerLevel);
        const perf = state.performance / 100;
        const reward = Math.floor(task.rewardBase * perf);
        const xpGained = Math.floor(task.xp * perf);
        const today = this._todayKey();

        // Reset daily counter on new day
        const isNewDay = state.lastTaskDate !== today;
        const newTasksToday = isNewDay ? 1 : (state.tasksCompletedToday + 1);

        // Add reward to balance
        financeManager.addIncome(reward, 'Gaji', `Task: ${task.label}`);

        // Gain XP
        const newXP = (state.xp || 0) + xpGained;
        const newTotalDone = (state.totalTasksDone || 0) + 1;

        // Performance fluctuates slightly
        const newPerf = Math.min(200, Math.max(50,
            state.performance + (Math.random() * 10 - 4)
        ));

        gameState.update('work', w => ({
            ...w,
            xp: newXP,
            tasksCompletedToday: newTasksToday,
            lastTaskDate: today,
            totalTasksDone: newTotalDone,
            performance: Math.round(newPerf)
        }));

        // Check level up
        const levelUpResult = this._checkLevelUp(newXP, state.careerLevel);

        gameState.emit('taskComplete', { task, reward, xpGained, levelUpResult });

        return { reward, xpGained, levelUpResult };
    }

    _checkLevelUp(currentXP, currentLevel) {
        const state = this.getWorkState();
        const path = state.careerPath || 'corporate';
        const list = CAREER_PATHS[path];
        const levelData = list.find(l => l.level === currentLevel);

        if (!levelData.xpToNext || currentXP < levelData.xpRequired + levelData.xpToNext) {
            return null;
        }

        const nextLevel = currentLevel + 1;
        const nextLevelData = list.find(l => l.level === nextLevel);
        if (!nextLevelData) return null;

        gameState.set('work.careerLevel', nextLevel);
        this.addHistory('promotion', `Naik jabatan ke: ${nextLevelData.title}`, nextLevel);
        gameState.emit('careerLevelUp', { level: nextLevel, levelData: nextLevelData });

        // Trigger role change if this level requires it
        if (nextLevelData.triggerRoleChange) {
            this._triggerRoleEvolution(nextLevelData.triggerRoleChange, nextLevelData);
        }

        return { newLevel: nextLevel, levelData: nextLevelData };
    }

    _triggerRoleEvolution(newRole, levelData) {
        Promise.all([
            import('./RoleManager.js'),
            import('../ui/UIManager.js')
        ]).then(([{ default: roleManager }, { default: ui }]) => {
            const currentRole = roleManager.getRole();
            if (currentRole === newRole) return;

            ui.confirm({
                title: '🎓 Kelulusan Karir!',
                message: `Selamat! Anda telah mencapai posisi puncak sebagai <strong>${levelData.title}</strong>.<br><br>Apakah Anda ingin mengundurkan diri dan beralih peran menjadi <strong>Pebisnis</strong>? Sebagai pencapaian (achievement), Anda akan menerima modal awal bisnis sebesar $5.000.000!`,
                icon: '🏆',
                confirmText: 'Ya, Jadi Pebisnis',
                cancelText: 'Tetap Jadi Karyawan',
                confirmClass: 'btn-success'
            }).then(confirmed => {
                if (confirmed) {
                    roleManager.setRole(newRole);
                    this.addHistory('graduation', `Lulus Karir & Pindah Haluan menjadi Pebisnis`, levelData.title);
                    gameState.emit('roleEvolution', {
                        fromRole: currentRole,
                        toRole: newRole,
                        levelData
                    });

                    // Give starting capital for business
                    const bonus = 5000000;
                    financeManager.addIncome(bonus, 'Bonus', 'Modal awal bisnis — promosi ke Business Owner!');
                    
                    ui.success('Anda sekarang resmi menjadi seorang Pebisnis! Silakan kelola bisnis Anda pada menu "Bisnis Saya".', 'Role Diperbarui!');
                } else {
                    this.addHistory('graduation_decline', `Mencapai puncak karir ${levelData.title} & memilih tetap jadi Karyawan`, levelData.title);
                    ui.info('Anda memilih untuk tetap melanjutkan karir sebagai Karyawan. Anda dapat berganti peran di Pusat Jenjang Karir kapan saja.', 'Pilihan Disimpan');
                }
            });
        });
    }

    // ── XP Progress ──────────────────────────────────────────────────
    getXPProgress() {
        const state = this.getWorkState();
        const lvlData = this.getCareerLevelData(state.careerLevel);
        const xpInLevel = state.xp - lvlData.xpRequired;
        const xpNeeded = lvlData.xpToNext;
        return {
            current: state.xp,
            xpInLevel,
            xpToNext: xpNeeded,
            next: lvlData.xpToNext ? (lvlData.xpRequired + lvlData.xpToNext) : 'MAX',
            percent: xpNeeded ? Math.min(100, Math.floor((xpInLevel / xpNeeded) * 100)) : 100
        };
    }

    getMonthlyBonus() {
        const state = this.getWorkState();
        if (!state.careerPath) return 0;
        return this.getCareerLevelData(state.careerLevel).baseSalaryBonus || 0;
    }
}

export const workTaskManager = new WorkTaskManager();
export default workTaskManager;
