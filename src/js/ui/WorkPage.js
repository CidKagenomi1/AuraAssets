/**
 * WorkPage.js - Hybrid Full-Screen Employee Work Dashboard
 * Opens within the view container for a seamless experience
 */

import gameState from '../game/GameState.js';
import financeManager from '../finance/FinanceManager.js';
import workTaskManager from '../game/WorkTaskManager.js';
import { slideInFromRight } from './Animations.js';
import ui from './UIManager.js';

class WorkPage {
    constructor() {
        this.isOpen = false;
        this.container = null;
        this._unsubscribes = [];
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        workTaskManager.ensureInit();

        const viewContainer = document.querySelector('.view-container');
        if (!viewContainer) return;

        this.toggleHomeVisibility(false);

        // Create container
        const container = document.createElement('div');
        container.id = 'work-page';
        container.className = 'view-panel active';
        container.style.cssText = `
            position: absolute;
            inset: 0;
            background: var(--bg-root);
            z-index: 100;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            padding-bottom: 80px;
        `;
        
        viewContainer.appendChild(container);
        this.container = container;

        this.render();
        this.bindEvents();
        this._listenToGameState();
        slideInFromRight(container);
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        this._unsubscribes.forEach(fn => fn());
        this._unsubscribes = [];

        if (this.container) {
            this.container.remove();
            this.container = null;
        }

        this.toggleHomeVisibility(true);
    }

    toggleHomeVisibility(visible) {
        const homeSections = ['view-home', 'balance-card', 'market-pulse-widget', 'earn-panel', '.quick-actions', 'footer-dashboard-grid'];
        homeSections.forEach(sel => {
            const el = document.querySelector(sel) || document.getElementById(sel);
            if (el) el.style.display = visible ? '' : 'none';
        });
        
        const homeView = document.getElementById('view-home');
        if (homeView) homeView.style.display = visible ? '' : 'none';
    }

    _listenToGameState() {
        const unsub1 = gameState.on('taskComplete', () => {
            this.render();
        });
        const unsub2 = gameState.on('careerLevelUp', (data) => {
            this.render();
        });
        const unsub3 = gameState.on('careerResign', () => {
            this.render();
        });
        this._unsubscribes.push(unsub1, unsub2, unsub3);
    }

    render() {
        if (!this.container) return;
        
        const state = workTaskManager.getWorkState();
        
        // Header
        let html = `
            <div class="panel-header" style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 1rem;">
                <button class="btn-back" id="work-back" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">←</button>
                <h2 class="section-title" style="margin:0;"><span>💼</span> Office</h2>
            </div>
            <div style="padding: 1.5rem; max-width: 1200px; margin: 0 auto; width: 100%;">
        `;

        if (!state.careerPath) {
            // Render Unemployed message
            html += this._renderUnemployed();
        } else {
            // Render normal daily work task list
            html += this._renderTaskList(state);
        }

        html += `</div>`;
        this.container.innerHTML = html;
        this._bindDynamicEvents();
    }

    _renderUnemployed() {
        return `
            <div class="card" style="background: rgba(239, 68, 68, 0.05); border: 2px dashed rgba(239, 68, 68, 0.2); border-radius: var(--radius-lg); padding: 3rem; text-align: center; margin: 2rem 0;">
                <span style="font-size: 4.5rem; display: block; margin-bottom: 1.5rem;">😴</span>
                <h3 style="font-size: 1.75rem; font-weight: 800; color: #f87171; margin-bottom: 0.5rem;">Status: Unemployed (Pengangguran)</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 500px; margin: 0 auto 2rem auto; line-height: 1.5;">
                    Anda tidak memiliki pekerjaan aktif saat ini. Menu Office dinonaktifkan. Silakan pilih jalur karir Anda terlebih dahulu di Pusat Jenjang Karir.
                </p>
                <button class="btn btn-primary" id="btn-goto-career" style="font-weight: 800; padding: 12px 24px;">
                    🏛️ Buka Jenjang Karir
                </button>
            </div>
        `;
    }

    _renderTaskList(state) {
        const lvlData = workTaskManager.getCareerLevelData();
        const xpProg = workTaskManager.getXPProgress();
        const availTasks = workTaskManager.getAvailableTasks();
        const remainingTasks = workTaskManager.getRemainingTasksToday();

        const pathText = state.careerPath === 'corporate' ? '🏢 Corporate Line' : '🏛️ Government Line';

        return `
            <!-- Mini Career Status for context -->
            <div class="card" style="background: linear-gradient(135deg, rgba(255,255,255,0.02), transparent); margin-bottom: 1.5rem; border: 1px solid var(--border-color); padding: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Active Ranks</div>
                        <div style="font-size: 1.2rem; font-weight: 800; color: white;">
                            ${lvlData.icon} ${lvlData.title} <span style="font-size: 0.8rem; color: var(--text-muted);">(${pathText})</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--accent-primary); font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 6px;">
                            ${remainingTasks} Tasks Remaining
                        </span>
                    </div>
                </div>
            </div>

            <!-- Daily Work Tasks Grid -->
            <div>
                <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1.25rem; color: var(--text-muted); text-transform: uppercase;">Office Tasks</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
                    ${availTasks.map(task => `
                        <div class="action-btn-sim hover-scale" data-task-id="${task.id}" style="
                            background: var(--bg-surface);
                            border: 1px solid var(--border-color);
                            padding: 1.25rem;
                            border-radius: var(--radius-lg);
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                            gap: 1.25rem;
                            cursor: pointer;
                            transition: all 0.2s;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        ">
                            <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.75rem;">
                                <div style="font-size: 2rem; background: rgba(255,255,255,0.03); width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05);">
                                    ${task.icon}
                                </div>
                                <div>
                                    <div style="font-weight: 800; font-size: 1rem; color: white; margin-bottom: 0.25rem;">${task.label}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; min-height: 40px; display: flex; align-items: center; justify-content: center;">
                                        ${task.desc}
                                    </div>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.875rem; border-top: 1px solid rgba(255,255,255,0.05);">
                                <div style="font-size: 0.65rem; color: #818cf8; font-weight: 800; background: rgba(129, 140, 248, 0.1); padding: 4px 8px; border-radius: 6px;">
                                    +${task.xp} XP
                                </div>
                                <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-primary);">
                                    +$ ${financeManager.formatCurrency(task.rewardBase)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Shared static events if any
    }

    _bindDynamicEvents() {
        // Back button listener
        const backBtn = this.container?.querySelector('#work-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.close());
        }

        // Unemployed navigation button
        const gotoCareerBtn = document.getElementById('btn-goto-career');
        if (gotoCareerBtn) {
            gotoCareerBtn.addEventListener('click', () => {
                this.close(); // Close work page
                import('./panels/CareerPanel.js').then(m => m.default.show()); // Open career panel
            });
        }

        // Task Action listeners
        this.container?.querySelectorAll('.action-btn-sim').forEach(el => {
            el.addEventListener('click', () => {
                const taskId = el.dataset.taskId;
                this._startSimulation(taskId);
            });
        });
    }

    _startSimulation(taskId) {
        if (!workTaskManager.canDoMoreTasksToday()) {
            const lvlData = workTaskManager.getCareerLevelData();
            ui.error(`Daily task limit reached! (${lvlData.dailyTaskSlots} tasks/day)`);
            return;
        }

        const task = workTaskManager.getTaskById(taskId);
        if (!task) return;

        // Import WorkSimulation dynamically and run
        import('./WorkSimulation.js').then(m => {
            m.default.start(task, (success) => {
                if (success) {
                    workTaskManager.completeTaskDirectly(taskId);
                } else {
                    ui.error("Task was not completed successfully.");
                }
            });
        });
    }
}

export const workPage = new WorkPage();
export default workPage;
