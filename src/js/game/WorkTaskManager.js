/**
 * WorkTaskManager.js - Employee Task & Career Progression System
 * Handles daily work tasks, XP, performance, and automatic role evolution.
 */

import gameState from './GameState.js';
import financeManager from '../finance/FinanceManager.js';

// ── Task Library ────────────────────────────────────────────────────
const TASK_LIBRARY = {
    compile_report: {
        id: 'compile_report', label: 'Compile Report', icon: '📊',
        desc: 'Review raw logs and compile the official performance report.',
        xp: 15, rewardBase: 8000
    },
    document_approval: {
        id: 'document_approval', label: 'Document Approval', icon: '✍️',
        desc: 'Read through pending contracts and decide to approve or reject.',
        xp: 20, rewardBase: 12000
    },
    verify_invoice: {
        id: 'verify_invoice', label: 'Verify Invoice', icon: '🧾',
        desc: 'Check invoice numbers and calculations against raw ledger data.',
        xp: 25, rewardBase: 18000
    },
    drag_drop_data: {
        id: 'drag_drop_data', label: 'Organize Data Rows', icon: '🗂️',
        desc: 'Sort unstructured database files into correct columns.',
        xp: 30, rewardBase: 25000
    },
    match_transaction: {
        id: 'match_transaction', label: 'Match Transaction', icon: '🔗',
        desc: 'Match statement records to ledger entries to find matching totals.',
        xp: 40, rewardBase: 35000
    },
    balance_cashflow: {
        id: 'balance_cashflow', label: 'Balance Cashflow', icon: '⚖️',
        desc: 'Adjust assets and liabilities to balance the monthly balance sheet.',
        xp: 60, rewardBase: 50000
    }
};

// ── Career Paths ───────────────────────────────────────────────────
export const CAREER_PATHS = {
    corporate: [
        {
            level: 1, title: 'Corporate Intern', icon: '🌱', color: '#94a3b8',
            xpRequired: 0, xpToNext: 100, promoCost: 20000,
            availableTasks: ['compile_report', 'document_approval'],
            dailyTaskSlots: 3, baseSalaryBonus: 5000
        },
        {
            level: 2, title: 'Junior Associate', icon: '👨‍💼', color: '#6366f1',
            xpRequired: 100, xpToNext: 300, promoCost: 60000,
            availableTasks: ['compile_report', 'document_approval', 'verify_invoice'],
            dailyTaskSlots: 4, baseSalaryBonus: 12000
        },
        {
            level: 3, title: 'Senior Analyst', icon: '📊', color: '#0ea5e9',
            xpRequired: 300, xpToNext: 700, promoCost: 150000,
            availableTasks: ['document_approval', 'verify_invoice', 'drag_drop_data'],
            dailyTaskSlots: 4, baseSalaryBonus: 28000
        },
        {
            level: 4, title: 'Team Lead', icon: '⭐', color: '#10b981',
            xpRequired: 700, xpToNext: 1500, promoCost: 400000,
            availableTasks: ['verify_invoice', 'drag_drop_data', 'match_transaction'],
            dailyTaskSlots: 5, baseSalaryBonus: 65000
        },
        {
            level: 5, title: 'Assistant Manager', icon: '🌟', color: '#f59e0b',
            xpRequired: 1500, xpToNext: 3000, promoCost: 1000000,
            availableTasks: ['drag_drop_data', 'match_transaction', 'balance_cashflow'],
            dailyTaskSlots: 5, baseSalaryBonus: 150000
        },
        {
            level: 6, title: 'Division Manager', icon: '👔', color: '#ec4899',
            xpRequired: 3000, xpToNext: 6000, promoCost: 2500000,
            availableTasks: ['match_transaction', 'balance_cashflow', 'compile_report', 'document_approval'],
            dailyTaskSlots: 6, baseSalaryBonus: 350000
        },
        {
            level: 7, title: 'Chief Executive Officer', icon: '🏆', color: '#ef4444',
            xpRequired: 6000, xpToNext: 12000, promoCost: 6000000,
            availableTasks: ['balance_cashflow', 'match_transaction', 'document_approval', 'verify_invoice'],
            dailyTaskSlots: 6, baseSalaryBonus: 800000
        },
        {
            level: 8, title: 'Conglomerate Owner', icon: '🚀', color: '#f97316',
            xpRequired: 12000, xpToNext: null, promoCost: null,
            availableTasks: ['balance_cashflow', 'match_transaction', 'document_approval', 'verify_invoice', 'drag_drop_data', 'compile_report'],
            dailyTaskSlots: 6, baseSalaryBonus: 2000000,
            triggerRoleChange: 'pebisnis'
        }
    ],
    government: [
        {
            level: 1, title: 'Public Service Intern', icon: '🌱', color: '#94a3b8',
            xpRequired: 0, xpToNext: 100, promoCost: 18000,
            availableTasks: ['compile_report', 'document_approval'],
            dailyTaskSlots: 3, baseSalaryBonus: 4500
        },
        {
            level: 2, title: 'Administrative Officer', icon: '👨‍💼', color: '#6366f1',
            xpRequired: 100, xpToNext: 300, promoCost: 55000,
            availableTasks: ['compile_report', 'document_approval', 'verify_invoice'],
            dailyTaskSlots: 4, baseSalaryBonus: 11000
        },
        {
            level: 3, title: 'Senior Officer', icon: '📋', color: '#0ea5e9',
            xpRequired: 300, xpToNext: 700, promoCost: 140000,
            availableTasks: ['document_approval', 'verify_invoice', 'drag_drop_data'],
            dailyTaskSlots: 4, baseSalaryBonus: 26000
        },
        {
            level: 4, title: 'Assistant Director', icon: '⭐', color: '#10b981',
            xpRequired: 700, xpToNext: 1500, promoCost: 380000,
            availableTasks: ['verify_invoice', 'drag_drop_data', 'match_transaction'],
            dailyTaskSlots: 5, baseSalaryBonus: 60000
        },
        {
            level: 5, title: 'Deputy Director', icon: '🌟', color: '#f59e0b',
            xpRequired: 1500, xpToNext: 3000, promoCost: 950000,
            availableTasks: ['drag_drop_data', 'match_transaction', 'balance_cashflow'],
            dailyTaskSlots: 5, baseSalaryBonus: 140000
        },
        {
            level: 6, title: 'Director General', icon: '👔', color: '#ec4899',
            xpRequired: 3000, xpToNext: 6000, promoCost: 2400000,
            availableTasks: ['match_transaction', 'balance_cashflow', 'compile_report', 'document_approval'],
            dailyTaskSlots: 6, baseSalaryBonus: 320000
        },
        {
            level: 7, title: 'Deputy Minister', icon: '🏆', color: '#ef4444',
            xpRequired: 6000, xpToNext: 12000, promoCost: 5500000,
            availableTasks: ['balance_cashflow', 'match_transaction', 'document_approval', 'verify_invoice'],
            dailyTaskSlots: 6, baseSalaryBonus: 750000
        },
        {
            level: 8, title: 'Cabinet Minister', icon: '🚀', color: '#f97316',
            xpRequired: 12000, xpToNext: null, promoCost: null,
            availableTasks: ['balance_cashflow', 'match_transaction', 'document_approval', 'verify_invoice', 'drag_drop_data', 'compile_report'],
            dailyTaskSlots: 6, baseSalaryBonus: 1800000,
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
            history: []           // [{ id, type, description, extra, date }]
        };
    }

    ensureInit() {
        if (!gameState.get('work')) {
            gameState.set('work', this._defaultWorkState());
        }
    }

    addHistory(type, description, extra = null) {
        const state = this.getWorkState();
        if (!state.history) state.history = [];
        
        const day = gameState.get('gameTime.day') || 1;
        const month = gameState.get('gameTime.month') || 1;
        const year = gameState.get('gameTime.year') || 2026;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const dateText = `${day} ${months[month - 1]} ${year}`;

        const entry = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            type, // 'select_path' | 'promotion' | 'resign' | 'graduation'
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
        gameState.update('work', w => ({
            ...w,
            careerPath: null,
            careerLevel: 1,
            xp: 0,
            tasksCompletedToday: 0
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
