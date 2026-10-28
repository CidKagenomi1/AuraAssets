/**
 * WorkPage.js - Hybrid Full-Screen Employee Work Dashboard
 * Premium "Office Software" layout with task hierarchy, sidebar, and assistant system.
 */

import gameState from '../core/GameState.js';
import financeManager from '../finance/FinanceManager.js';
import workTaskManager from '../core/databases/WorkTaskManager.js';
import { ASSISTANT_TIERS } from '../core/databases/WorkTaskManager.js';
import { slideInFromRight } from '../ui/Animations.js';
import ui from '../ui/UIManager.js';

// Priority order & visual config for tasks
const PRIORITY_CONFIG = {
    primary: {
        label: 'URGENT',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.08)',
        border: 'rgba(239, 68, 68, 0.3)',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        badgeColor: '#ef4444',
        order: 0
    },
    secondary: {
        label: 'PRIORITY',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.05)',
        border: 'rgba(245, 158, 11, 0.2)',
        badgeBg: 'rgba(245, 158, 11, 0.15)',
        badgeColor: '#f59e0b',
        order: 1
    },
    tertiary: {
        label: 'ROUTINE',
        color: '#6366f1',
        bg: 'rgba(99, 102, 241, 0.04)',
        border: 'rgba(99, 102, 241, 0.15)',
        badgeBg: 'rgba(99, 102, 241, 0.12)',
        badgeColor: '#818cf8',
        order: 2
    }
};

class WorkPage {
    constructor() {
        this.isOpen = false;
        this.container = null;
        this._unsubscribes = [];
        this._workSim = null;
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        workTaskManager.ensureInit();

        const viewContainer = document.querySelector('.view-container');
        if (!viewContainer) return;

        this.toggleHomeVisibility(false);

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

        import('./WorkSimulation.js').then(m => {
            this._workSim = m.default;
            this.render();
            this.bindEvents();
            this._listenToGameState();
        });

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
        const unsub1 = gameState.on('taskComplete', () => { this.render(); });
        const unsub2 = gameState.on('careerLevelUp', () => { this.render(); });
        const unsub3 = gameState.on('careerResign', () => { this.render(); });
        const unsub4 = gameState.on('assistantHired', () => { this.render(); });
        const unsub5 = gameState.on('assistantFired', () => { this.render(); });
        this._unsubscribes.push(unsub1, unsub2, unsub3, unsub4, unsub5);
    }

    render() {
        if (!this.container) return;

        const state = workTaskManager.getWorkState();

        // Top header bar (always visible)
        let html = `
            <div style="
                padding: 1rem 1.5rem;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                align-items: center;
                gap: 1rem;
                background: rgba(255,255,255,0.015);
                backdrop-filter: blur(8px);
                position: sticky;
                top: 0;
                z-index: 10;
            ">
                <button id="work-back" style="background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:white; font-size:1rem; cursor:pointer; border-radius:8px; width:36px; height:36px; display:flex; align-items:center; justify-content:center; transition: all 0.2s;">←</button>
                <div style="display:flex; align-items:center; gap:0.6rem; flex:1;">
                    <span style="font-size:1.5rem;">💼</span>
                    <div>
                        <div style="font-weight:900; font-size:1.1rem; color:white; line-height:1;">Office</div>
                        <div style="font-size:0.65rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.06em;">AuraAssets Workspace</div>
                    </div>
                </div>
                ${state.careerPath ? this._renderHeaderBadges(state) : ''}
            </div>
        `;

        if (!state.careerPath) {
            html += `<div style="padding:1.5rem;">${this._renderUnemployed()}</div>`;
        } else {
            html += this._renderOfficeLayout(state);
        }

        this.container.innerHTML = html;
        this._bindDynamicEvents();
    }

    _renderHeaderBadges(state) {
        const lvlData = workTaskManager.getCareerLevelData();
        const remaining = workTaskManager.getRemainingTasksToday();
        const assistant = workTaskManager.getAssistant();
        const assistantTier = assistant ? ASSISTANT_TIERS[assistant.tier] : null;

        return `
            <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
                <span style="font-size:0.7rem; font-weight:800; padding:3px 10px; border-radius:20px; background:${lvlData.color}22; color:${lvlData.color}; border:1px solid ${lvlData.color}44;">
                    ${lvlData.icon} ${lvlData.title}
                </span>
                <span style="font-size:0.7rem; font-weight:800; padding:3px 10px; border-radius:20px; background: ${remaining > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(100,100,100,0.1)'}; color: ${remaining > 0 ? '#10b981' : '#64748b'}; border: 1px solid ${remaining > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(100,100,100,0.2)'};">
                    📋 ${remaining} Tugas Tersisa
                </span>
                ${assistantTier ? `<span style="font-size:0.7rem; font-weight:800; padding:3px 10px; border-radius:20px; background:rgba(99,102,241,0.1); color:#818cf8; border:1px solid rgba(99,102,241,0.25);">${assistantTier.emoji} ${assistantTier.label}</span>` : ''}
            </div>
        `;
    }

    _renderUnemployed() {
        return `
            <div style="background: rgba(239, 68, 68, 0.05); border: 2px dashed rgba(239, 68, 68, 0.2); border-radius: var(--radius-lg); padding: 3rem; text-align: center; margin: 2rem 0;">
                <span style="font-size: 4.5rem; display: block; margin-bottom: 1.5rem;">😴</span>
                <h3 style="font-size: 1.75rem; font-weight: 800; color: #f87171; margin-bottom: 0.5rem;">Status: Unemployed (Pengangguran)</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 500px; margin: 0 auto 2rem auto; line-height: 1.5;">
                    Anda tidak memiliki pekerjaan aktif saat ini. Silakan pilih jalur karir Anda di Pusat Jenjang Karir.
                </p>
                <button class="btn btn-primary" id="btn-goto-career" style="font-weight: 800; padding: 12px 24px;">
                    🏛️ Buka Jenjang Karir
                </button>
            </div>
        `;
    }

    _renderOfficeLayout(state) {
        const lvlData = workTaskManager.getCareerLevelData();
        const xpProg = workTaskManager.getXPProgress();
        const availTasks = workTaskManager.getAvailableTasks();
        const remaining = workTaskManager.getRemainingTasksToday();
        const isLimitReached = remaining <= 0;

        // Sort tasks by priority order
        const sorted = [...availTasks].sort((a, b) => {
            const pA = PRIORITY_CONFIG[a.priority]?.order ?? 99;
            const pB = PRIORITY_CONFIG[b.priority]?.order ?? 99;
            return pA - pB;
        });

        const primaryTasks = sorted.filter(t => t.priority === 'primary');
        const secondaryTasks = sorted.filter(t => t.priority === 'secondary');
        const tertiaryTasks = sorted.filter(t => t.priority === 'tertiary');

        return `
            <div class="work-office-layout">
                
                <!-- ══ LEFT: Task Workspace ══ -->
                <div class="work-task-area">
                    
                    <!-- Day Limit Banner if reached -->
                    ${isLimitReached ? `
                        <div style="background: rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:0.875rem 1.25rem; margin-bottom:1.5rem; display:flex; align-items:center; gap:0.75rem;">
                            <span style="font-size:1.25rem;">🚫</span>
                            <div>
                                <div style="font-weight:800; font-size:0.85rem; color:#f87171;">Batas Tugas Harian Tercapai</div>
                                <div style="font-size:0.75rem; color:var(--text-muted);">Anda sudah menyelesaikan ${lvlData.dailyTaskSlots} tugas hari ini. Kembali besok atau hire asisten.</div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- PRIMARY TASKS (Full width, prominent) -->
                    ${primaryTasks.length > 0 ? `
                        <div style="margin-bottom:1.75rem;">
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1rem;">
                                <div style="width:3px; height:14px; background:#ef4444; border-radius:2px;"></div>
                                <span style="font-size:0.65rem; font-weight:900; color:#ef4444; text-transform:uppercase; letter-spacing:0.12em;">Urgent Tasks</span>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:1rem;">
                                ${primaryTasks.map(task => this._renderPrimaryCard(task, isLimitReached)).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- SECONDARY TASKS (2-column grid) -->
                    ${secondaryTasks.length > 0 ? `
                        <div style="margin-bottom:1.75rem;">
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1rem;">
                                <div style="width:3px; height:14px; background:#f59e0b; border-radius:2px;"></div>
                                <span style="font-size:0.65rem; font-weight:900; color:#f59e0b; text-transform:uppercase; letter-spacing:0.12em;">Priority Tasks</span>
                            </div>
                            <div class="work-secondary-grid">
                                ${secondaryTasks.map(task => this._renderSecondaryCard(task, isLimitReached)).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- TERTIARY TASKS (Compact 3-col) -->
                    ${tertiaryTasks.length > 0 ? `
                        <div>
                            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1rem;">
                                <div style="width:3px; height:14px; background:#6366f1; border-radius:2px;"></div>
                                <span style="font-size:0.65rem; font-weight:900; color:#818cf8; text-transform:uppercase; letter-spacing:0.12em;">Routine Tasks</span>
                            </div>
                            <div class="work-tertiary-grid">
                                ${tertiaryTasks.map(task => this._renderTertiaryCard(task, isLimitReached)).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- ══ RIGHT: Sidebar ══ -->
                <div class="work-sidebar-panel">
                    ${this._renderSidebarCareerStatus(state, lvlData, xpProg)}
                    ${this._renderSidebarAssistant(lvlData)}
                </div>
            </div>
        `;
    }

    // ── PRIMARY CARD — Full width, large, inline simulation ────────
    _renderPrimaryCard(task, isLimitReached) {
        const p = PRIORITY_CONFIG.primary;
        return `
            <div style="
                background: ${p.bg};
                border: 1px solid ${p.border};
                border-left: 3px solid ${p.color};
                border-radius: 12px;
                overflow:hidden;
            ">
                <!-- Card Header -->
                <div style="padding:1rem 1.25rem; display:flex; justify-content:space-between; align-items:center; background: rgba(239,68,68,0.04);">
                    <div style="display:flex; align-items:center; gap:0.625rem;">
                        <span style="font-size:1.35rem;">${task.icon}</span>
                        <div>
                            <div style="font-weight:900; font-size:0.95rem; color:white; line-height:1.1;">${task.label}</div>
                            <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${task.desc}</div>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.25rem;">
                        <span style="font-size:0.6rem; font-weight:900; padding:2px 8px; border-radius:4px; background:${p.badgeBg}; color:${p.badgeColor}; letter-spacing:0.08em;">${p.label}</span>
                        <span style="font-size:0.9rem; font-weight:900; color:var(--accent-primary);">+$${financeManager.formatCurrency(task.rewardBase)}</span>
                        <span style="font-size:0.65rem; color:#818cf8; font-weight:700;">+${task.xp} XP</span>
                    </div>
                </div>
                <!-- Simulation workspace -->
                ${isLimitReached
                    ? `<div style="padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.8rem;">✅ Selesai untuk hari ini</div>`
                    : `<div id="sim-container-${task.id}" style="padding:0.25rem 0.5rem 0.75rem 0.5rem;"><div style="text-align:center; color:var(--text-muted); font-size:0.75rem; padding:1rem;">Memuat workspace...</div></div>`
                }
            </div>
        `;
    }

    // ── SECONDARY CARD — Medium card, 2-col grid ───────────────────
    _renderSecondaryCard(task, isLimitReached) {
        const p = PRIORITY_CONFIG.secondary;
        return `
            <div style="
                background: ${p.bg};
                border: 1px solid ${p.border};
                border-left: 3px solid ${p.color};
                border-radius: 12px;
                overflow:hidden;
            ">
                <div style="padding:0.875rem 1rem; display:flex; justify-content:space-between; align-items:start; border-bottom:1px solid rgba(255,255,255,0.03);">
                    <div style="display:flex; align-items:center; gap:0.5rem; flex:1; min-width:0;">
                        <span style="font-size:1.1rem; flex-shrink:0;">${task.icon}</span>
                        <div style="min-width:0;">
                            <div style="font-weight:800; font-size:0.85rem; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${task.label}</div>
                            <div style="font-size:0.65rem; color:var(--text-muted); margin-top:1px; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${task.desc}</div>
                        </div>
                    </div>
                    <div style="text-align:right; flex-shrink:0; margin-left:0.5rem;">
                        <span style="font-size:0.55rem; font-weight:900; padding:2px 6px; border-radius:3px; display:block; background:${p.badgeBg}; color:${p.badgeColor}; margin-bottom:3px;">${p.label}</span>
                        <span style="font-size:0.8rem; font-weight:800; color:var(--accent-primary);">+$${financeManager.formatCurrency(task.rewardBase)}</span>
                    </div>
                </div>
                ${isLimitReached
                    ? `<div style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.75rem;">✅ Selesai</div>`
                    : `<div id="sim-container-${task.id}" style="padding:0.25rem 0.375rem 0.625rem;"><div style="text-align:center; color:var(--text-muted); font-size:0.7rem; padding:0.75rem;">Memuat...</div></div>`
                }
            </div>
        `;
    }

    // ── TERTIARY CARD — Small/compact ──────────────────────────────
    _renderTertiaryCard(task, isLimitReached) {
        const p = PRIORITY_CONFIG.tertiary;
        return `
            <div style="
                background: ${p.bg};
                border: 1px solid ${p.border};
                border-left: 3px solid ${p.color};
                border-radius: 10px;
                overflow:hidden;
            ">
                <div style="padding:0.75rem 0.875rem; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.03);">
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                        <span style="font-size:1rem;">${task.icon}</span>
                        <div>
                            <div style="font-weight:800; font-size:0.8rem; color:white;">${task.label}</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <span style="font-size:0.55rem; font-weight:900; padding:1px 5px; border-radius:3px; display:block; background:${p.badgeBg}; color:${p.badgeColor}; margin-bottom:2px;">${p.label}</span>
                        <span style="font-size:0.75rem; font-weight:800; color:var(--accent-primary);">+$${financeManager.formatCurrency(task.rewardBase)}</span>
                    </div>
                </div>
                ${isLimitReached
                    ? `<div style="padding:0.75rem; text-align:center; color:var(--text-muted); font-size:0.7rem;">✅ Selesai</div>`
                    : `<div id="sim-container-${task.id}" style="padding:0.125rem 0.25rem 0.5rem;"><div style="text-align:center; color:var(--text-muted); font-size:0.7rem; padding:0.5rem;">Memuat...</div></div>`
                }
            </div>
        `;
    }

    // ── SIDEBAR: Career Status ─────────────────────────────────────
    _renderSidebarCareerStatus(state, lvlData, xpProg) {
        const pathText = state.careerPath === 'corporate' ? '🏢 Corporate' : '🏛️ Government';
        const perf = state.performance || 100;
        const perfColor = perf >= 120 ? '#10b981' : perf >= 80 ? '#f59e0b' : '#ef4444';

        return `
            <div style="background: linear-gradient(135deg, ${lvlData.color}12, transparent); border:1px solid ${lvlData.color}33; border-radius:12px; overflow:hidden;">
                <!-- Header -->
                <div style="padding:1rem; background:${lvlData.color}10; border-bottom:1px solid ${lvlData.color}22;">
                    <div style="font-size:0.6rem; color:${lvlData.color}; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:4px;">${pathText}</div>
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <span style="font-size:1.75rem;">${lvlData.icon}</span>
                        <div>
                            <div style="font-weight:900; font-size:0.9rem; color:white; line-height:1.2;">${lvlData.title}</div>
                            <div style="font-size:0.65rem; color:var(--text-muted);">Level ${lvlData.level}</div>
                        </div>
                    </div>
                </div>
                <!-- Stats -->
                <div style="padding:0.875rem; display:flex; flex-direction:column; gap:0.625rem;">
                    <!-- XP Bar -->
                    <div>
                        <div style="display:flex; justify-content:space-between; font-size:0.65rem; color:var(--text-muted); margin-bottom:4px;">
                            <span>Career XP</span>
                            <span style="color:white; font-weight:700;">${xpProg.xpInLevel} / ${xpProg.xpToNext ?? 'MAX'}</span>
                        </div>
                        <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden;">
                            <div style="height:100%; width:${xpProg.percent}%; background:linear-gradient(90deg, ${lvlData.color}, ${lvlData.color}aa); border-radius:4px; transition:width 0.6s;"></div>
                        </div>
                    </div>
                    <!-- Salary & perf -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                        <div style="background:rgba(0,0,0,0.2); padding:0.6rem; border-radius:8px; text-align:center;">
                            <div style="font-size:0.55rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Gaji/bln</div>
                            <div style="font-size:0.8rem; font-weight:900; color:#bef264; margin-top:2px;">$${financeManager.formatCurrency(lvlData.baseSalaryBonus, true)}</div>
                        </div>
                        <div style="background:rgba(0,0,0,0.2); padding:0.6rem; border-radius:8px; text-align:center;">
                            <div style="font-size:0.55rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Performa</div>
                            <div style="font-size:0.8rem; font-weight:900; color:${perfColor}; margin-top:2px;">${perf}%</div>
                        </div>
                    </div>
                    <!-- Daily slots -->
                    <div style="background:rgba(0,0,0,0.15); padding:0.6rem 0.75rem; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.65rem; color:var(--text-muted);">Slot Tugas/hari</span>
                        <span style="font-size:0.75rem; font-weight:900; color:#a78bfa;">${lvlData.dailyTaskSlots} tugas</span>
                    </div>
                </div>
            </div>
        `;
    }

    // ── SIDEBAR: Assistant Panel ───────────────────────────────────
    _renderSidebarAssistant(lvlData) {
        const assistantConfig = workTaskManager.getAssistantConfig();
        const currentAssistant = workTaskManager.getAssistant();

        if (!assistantConfig.unlocked) {
            return `
                <div style="border:1px solid var(--border-color); border-radius:12px; padding:1rem; background:rgba(255,255,255,0.01);">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.625rem;">
                        <span style="font-size:1rem;">🔒</span>
                        <span style="font-weight:800; font-size:0.85rem; color:var(--text-muted);">Asisten Kantor</span>
                    </div>
                    <p style="font-size:0.72rem; color:var(--text-muted); line-height:1.4; margin:0;">${assistantConfig.note}</p>
                </div>
            `;
        }

        if (currentAssistant) {
            const tier = ASSISTANT_TIERS[currentAssistant.tier];
            return `
                <div style="border:1px solid rgba(99,102,241,0.3); border-radius:12px; overflow:hidden; background:rgba(99,102,241,0.04);">
                    <div style="padding:0.875rem 1rem; background:rgba(99,102,241,0.08); border-bottom:1px solid rgba(99,102,241,0.15); display:flex; align-items:center; gap:0.5rem;">
                        <span style="font-size:1.25rem;">${tier.emoji}</span>
                        <div>
                            <div style="font-weight:900; font-size:0.85rem; color:white;">${tier.label}</div>
                            <div style="font-size:0.6rem; color:#818cf8; font-weight:700;">${tier.badge} ASSISTANT</div>
                        </div>
                        <div style="margin-left:auto; text-align:right;">
                            <div style="font-size:0.6rem; color:var(--text-muted);">Biaya/hari</div>
                            <div style="font-size:0.8rem; font-weight:800; color:#ef4444;">-$${financeManager.formatCurrency(currentAssistant.dailyCost)}</div>
                        </div>
                    </div>
                    <div style="padding:0.75rem 1rem;">
                        <p style="font-size:0.7rem; color:var(--text-muted); line-height:1.4; margin:0 0 0.75rem 0;">${tier.desc}</p>
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.875rem; padding:0.5rem 0.75rem; background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.15); border-radius:6px;">
                            <div style="width:6px; height:6px; border-radius:50%; background:#10b981; animation: pulse 2s infinite;"></div>
                            <span style="font-size:0.65rem; color:#10b981; font-weight:700;">AKTIF — Bekerja setiap pergantian hari</span>
                        </div>
                        <button id="btn-fire-assistant" class="btn btn-danger" style="width:100%; font-size:0.75rem; padding:7px; font-weight:800;">
                            🚪 Berhentikan Asisten
                        </button>
                    </div>
                </div>
            `;
        }

        // No assistant hired — show tiers to choose from
        const tiers = assistantConfig.tiers;
        return `
            <div style="border:1px solid var(--border-color); border-radius:12px; overflow:hidden;">
                <div style="padding:0.75rem 1rem; background:rgba(255,255,255,0.02); border-bottom:1px solid var(--border-color); display:flex; align-items:center; gap:0.5rem;">
                    <span style="font-size:1rem;">🧑‍💼</span>
                    <div>
                        <div style="font-weight:900; font-size:0.85rem; color:white;">Asisten Kantor</div>
                        <div style="font-size:0.6rem; color:var(--text-muted);">Tersedia di jabatan Anda</div>
                    </div>
                </div>
                <div style="padding:0.75rem; display:flex; flex-direction:column; gap:0.5rem;">
                    ${tiers.map(tier => `
                        <div style="border:1px solid ${tier.color}33; border-radius:8px; overflow:hidden;">
                            <div style="padding:0.625rem 0.75rem; background:${tier.color}0d; display:flex; align-items:center; gap:0.5rem;">
                                <span style="font-size:1.1rem;">${tier.emoji}</span>
                                <div style="flex:1; min-width:0;">
                                    <div style="display:flex; justify-content:space-between; align-items:center;">
                                        <div style="font-weight:800; font-size:0.78rem; color:white;">${tier.label}</div>
                                        <span style="font-size:0.5rem; font-weight:900; padding:1px 6px; border-radius:3px; background:${tier.color}22; color:${tier.color};">${tier.badge}</span>
                                    </div>
                                    <div style="font-size:0.62rem; color:var(--text-muted); margin-top:1px; line-height:1.3;">${tier.desc}</div>
                                </div>
                            </div>
                            <div style="padding:0.5rem 0.75rem; display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.15);">
                                <span style="font-size:0.65rem; color:var(--text-muted);">Biaya: <strong style="color:#ef4444;">$${financeManager.formatCurrency(tier.dailyCost)}/hari</strong></span>
                                <button class="btn-hire-assistant" data-tier="${tier.id}" style="
                                    background:${tier.color}22; 
                                    border:1px solid ${tier.color}44; 
                                    color:${tier.color}; 
                                    font-size:0.65rem; 
                                    font-weight:800; 
                                    padding:4px 10px; 
                                    border-radius:5px; 
                                    cursor:pointer;
                                    transition: all 0.15s;
                                ">Rekrut</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    bindEvents() {}

    _bindDynamicEvents() {
        // Back button
        const backBtn = this.container?.querySelector('#work-back');
        if (backBtn) backBtn.addEventListener('click', () => this.close());

        // Unemployed → career
        const gotoCareerBtn = document.getElementById('btn-goto-career');
        if (gotoCareerBtn) {
            gotoCareerBtn.addEventListener('click', () => {
                this.close();
                import('./panels/CareerPanel.js').then(m => m.default.show());
            });
        }

        // Fire assistant
        const fireBtn = document.getElementById('btn-fire-assistant');
        if (fireBtn) {
            fireBtn.addEventListener('click', async () => {
                const confirmed = await ui.confirm({
                    title: 'Berhentikan Asisten?',
                    message: 'Asisten akan langsung berhenti. Tidak ada refund untuk hari ini.',
                    icon: '🚪',
                    confirmText: 'Ya, Berhentikan',
                    confirmClass: 'btn-danger'
                });
                if (confirmed) {
                    try {
                        workTaskManager.fireAssistant();
                        ui.info('Asisten telah diberhentikan.', '👋 Asisten Pergi');
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        }

        // Hire assistant buttons
        this.container?.querySelectorAll('.btn-hire-assistant').forEach(btn => {
            btn.addEventListener('click', async () => {
                const tierId = btn.dataset.tier;
                const tier = ASSISTANT_TIERS[tierId];
                const config = workTaskManager.getAssistantConfig();
                const tierConf = config.tiers?.find(t => t.id === tierId);

                const confirmed = await ui.confirm({
                    title: `Rekrut ${tier.label}?`,
                    message: `Biaya: <strong>$${financeManager.formatCurrency(tierConf?.dailyCost || 0)}/hari</strong><br><br>${tier.desc}`,
                    icon: tier.emoji,
                    confirmText: 'Rekrut Sekarang',
                    confirmClass: 'btn-primary'
                });
                if (confirmed) {
                    try {
                        workTaskManager.hireAssistant(tierId);
                        ui.success(`${tier.label} berhasil direkrut!`, `${tier.emoji} Asisten Aktif`);
                    } catch (e) {
                        ui.error(e.message);
                    }
                }
            });
        });

        // Initialize inline simulations
        const state = workTaskManager.getWorkState();
        if (state.careerPath && this._workSim && workTaskManager.getRemainingTasksToday() > 0) {
            const availTasks = workTaskManager.getAvailableTasks();
            availTasks.forEach(task => {
                const simContainer = this.container?.querySelector(`#sim-container-${task.id}`);
                if (simContainer) {
                    this._initInlineSimulation(task, simContainer);
                }
            });
        }
    }

    _initInlineSimulation(task, container) {
        if (!this._workSim) return;
        this._workSim.renderInline(task.id, container, (success) => {
            if (success) {
                if (!workTaskManager.canDoMoreTasksToday()) {
                    const lvlData = workTaskManager.getCareerLevelData();
                    ui.error(`Limit tugas harian tercapai! (${lvlData.dailyTaskSlots} tugas/hari)`);
                    this.render();
                    return;
                }

                const result = workTaskManager.completeTaskDirectly(task.id);

                // Flash success inline
                container.innerHTML = `
                    <div style="text-align:center; padding:1.25rem; display:flex; flex-direction:column; align-items:center; gap:0.4rem; animation: fadeIn 0.25s ease;">
                        <span style="font-size:2rem;">⚡</span>
                        <div style="font-size:0.85rem; font-weight:900; color:#bef264;">BERHASIL!</div>
                        <div style="font-size:0.7rem; color:#818cf8;">+$${financeManager.formatCurrency(result.reward)} | +${result.xpGained} XP</div>
                    </div>
                `;

                setTimeout(() => {
                    if (this.isOpen) this.render();
                }, 900);
            } else {
                this._initInlineSimulation(task, container);
            }
        });
    }
}

export const workPage = new WorkPage();
export default workPage;
