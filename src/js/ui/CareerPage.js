/**
 * CareerPage.js - Hybrid Full-Screen Career Management
 * Similar to TradingPage, opens within the view container
 */

import gameState from '../game/GameState.js';
import financeManager from '../finance/FinanceManager.js';
import ui from './UIManager.js';
import { slideInFromRight } from './Animations.js';

class CareerPage {
    constructor() {
        this.isOpen = false;
        this.container = null;

        // Job categories with progression
        this.jobCategories = {
            starter: {
                name: '🌱 Pemula',
                jobs: [
                    { id: 'unemployed', name: 'Pengangguran', icon: '😴', salary: 0, requirement: 0, desc: 'Belum ada penghasilan' },
                    { id: 'freelancer', name: 'Freelancer', icon: '💻', salary: 5000, requirement: 0, desc: 'Kerja remote, waktu fleksibel' },
                    { id: 'parttime', name: 'Part-Time', icon: '⏰', salary: 3000, requirement: 0, desc: 'Kerja sampingan' }
                ]
            },
            tech: {
                name: '💻 Teknologi',
                jobs: [
                    { id: 'junior_dev', name: 'Junior Developer', icon: '👨‍💻', salary: 8000, requirement: 0, desc: 'Programmer pemula' },
                    { id: 'senior_dev', name: 'Senior Developer', icon: '🧑‍💻', salary: 25000, requirement: 250000, desc: 'Programmer berpengalaman' },
                    { id: 'tech_lead', name: 'Tech Lead', icon: '👨‍🔬', salary: 45000, requirement: 1000000, desc: 'Pemimpin tim teknis' },
                    { id: 'cto', name: 'CTO', icon: '🚀', salary: 100000, requirement: 5000000, desc: 'Chief Technology Officer' }
                ]
            },
            finance: {
                name: '🏦 Keuangan',
                jobs: [
                    { id: 'teller', name: 'Teller Bank', icon: '🏧', salary: 6000, requirement: 0, desc: 'Pelayanan nasabah bank' },
                    { id: 'financial_analyst', name: 'Financial Analyst', icon: '📊', salary: 20000, requirement: 500000, desc: 'Analis keuangan' },
                    { id: 'investment_banker', name: 'Investment Banker', icon: '💹', salary: 80000, requirement: 2500000, desc: 'Banker investasi' },
                    { id: 'hedge_fund_manager', name: 'Hedge Fund Manager', icon: '🦈', salary: 200000, requirement: 10000000, desc: 'Kelola dana miliaran' }
                ]
            },
            creative: {
                name: '🎨 Kreatif',
                jobs: [
                    { id: 'content_creator', name: 'Content Creator', icon: '📱', salary: 10000, requirement: 0, desc: 'YouTuber, TikToker' },
                    { id: 'designer', name: 'UI/UX Designer', icon: '🎨', salary: 18000, requirement: 300000, desc: 'Desainer digital' },
                    { id: 'creative_director', name: 'Creative Director', icon: '🎬', salary: 50000, requirement: 1500000, desc: 'Direktur kreatif' }
                ]
            },
            business: {
                name: '🏢 Bisnis',
                jobs: [
                    { id: 'sales', name: 'Sales', icon: '🤝', salary: 7000, requirement: 0, desc: 'Tenaga penjualan' },
                    { id: 'manager', name: 'Manager', icon: '👔', salary: 25000, requirement: 500000, desc: 'Manajer departemen' }
                ]
            },
            elite: {
                name: '💎 Elite',
                jobs: [
                    { id: 'investor_pro', name: 'Pro Investor', icon: '📈', salary: 0, requirement: 5000000, desc: 'Passive income dari investasi', passive: true },
                    { id: 'billionaire', name: 'Billionaire', icon: '💰', salary: 0, requirement: 50000000, desc: 'Uang bekerja untuk kamu', passive: true },
                    { id: 'tycoon', name: 'Managing Director', icon: '🏆', salary: 0, requirement: 500000000, desc: 'Legenda tata kelola aset!', passive: true }
                ]
            }
        };

        // Flatten jobs for easy access
        this.jobs = Object.values(this.jobCategories).flatMap(cat => cat.jobs);
    }

    open() {
        if (this.isOpen) return;
        this.isOpen = true;

        const viewContainer = document.querySelector('.view-container');
        if (!viewContainer) return;

        // Hide home sections
        this.toggleHomeVisibility(false);

        // Create container
        const container = document.createElement('div');
        container.id = 'career-page';
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
        slideInFromRight(container);
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        if (this.container) {
            this.container.remove();
            this.container = null;
        }

        this.toggleHomeVisibility(true);
    }

    toggleHomeVisibility(visible) {
        const homeSections = ['balance-card', 'market-pulse-widget', 'earn-panel', '.quick-actions', 'footer-dashboard-grid'];
        homeSections.forEach(sel => {
            const el = document.querySelector(sel) || document.getElementById(sel);
            if (el) el.style.display = visible ? '' : 'none';
        });
        
        const homeView = document.getElementById('view-home');
        if (homeView) homeView.style.display = visible ? '' : 'none';
    }

    render() {
        if (!this.container) return;

        const currentJob = gameState.get('career.currentJob');
        const balance = gameState.getBalance();
        const currentJobData = this.getJob(currentJob);

        this.container.innerHTML = `
            <div class="panel-header" style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 1rem;">
                <button class="btn-back" id="career-back" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">←</button>
                <h2 class="section-title" style="margin:0;"><span>💼</span> Jenjang Karir & Pekerjaan</h2>
            </div>

            <div style="padding: 1.5rem; max-width: 1000px; margin: 0 auto; width: 100%;">
                <!-- Current Job Card -->
                <div class="card" style="background: linear-gradient(135deg, rgba(255,255,255,0.05), transparent); margin-bottom: 2rem; border-left: 4px solid var(--accent-secondary);">
                    <div style="display: flex; align-items: center; gap: 1.25rem;">
                        <div style="font-size: 3rem;">${currentJobData.icon}</div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Posisi Saat Ini</div>
                            <div style="font-size: 1.5rem; font-weight: 800; color: white;">${currentJobData.name}</div>
                            <div style="font-size: 0.9rem; color: var(--accent-primary); font-weight: 700; margin-top: 0.25rem;">
                                ${currentJobData.salary > 0 ? `💰 $ ${financeManager.formatCurrency(currentJobData.salary)} / bulan` : '📈 Passive Income Mode'}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Categories -->
                <div style="display: flex; flex-direction: column; gap: 2rem;">
                    ${Object.entries(this.jobCategories).map(([catId, category]) => `
                        <div class="job-category">
                            <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 1.25rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">${category.name}</h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                                ${category.jobs.map(job => {
                                    const isUnlocked = balance >= job.requirement;
                                    const isCurrent = currentJob === job.id;
                                    return `
                                        <div class="job-item ${isCurrent ? 'active' : ''}" data-job="${job.id}" style="
                                            background: ${isCurrent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)'};
                                            border: 1px solid ${isCurrent ? 'var(--accent-primary)' : 'var(--border-color)'};
                                            border-radius: var(--radius-md);
                                            padding: 1.25rem;
                                            cursor: pointer;
                                            position: relative;
                                            transition: all 0.2s;
                                            opacity: ${isUnlocked ? 1 : 0.6};
                                        ">
                                            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem;">
                                                <span style="font-size: 2rem;">${job.icon}</span>
                                                <div>
                                                    <div style="font-weight: 700; font-size: 1rem;">${job.name}</div>
                                                    <div style="font-size: 0.75rem; color: var(--text-muted);">${job.desc}</div>
                                                </div>
                                            </div>
                                            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.75rem; margin-top: 0.75rem;">
                                                <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-primary);">
                                                    ${job.salary > 0 ? `$ ${financeManager.formatCurrency(job.salary)}/bln` : 'INVESTOR'}
                                                </span>
                                                ${!isUnlocked ? `
                                                    <span style="font-size: 0.7rem; color: #ef4444; font-weight: 700;">🔒 $ ${this.formatShort(job.requirement)}</span>
                                                ` : (isCurrent ? `
                                                    <span style="font-size: 0.7rem; color: var(--accent-primary); font-weight: 800;">✓ AKTIF</span>
                                                ` : `
                                                    <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">READY</span>
                                                `)}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        this.container.querySelector('#career-back').addEventListener('click', () => this.close());

        this.container.querySelectorAll('.job-item').forEach(el => {
            el.addEventListener('click', () => this.selectJob(el.dataset.job));
        });
    }

    async selectJob(jobId) {
        const job = this.getJob(jobId);
        const currentJob = gameState.get('career.currentJob');
        const balance = gameState.getBalance();

        if (jobId === currentJob) return;

        if (balance < job.requirement) {
            ui.warning(`Butuh saldo $ ${financeManager.formatCurrency(job.requirement)} untuk unlock karir ini.`);
            return;
        }

        const confirmed = await ui.confirm({
            title: 'Ganti Karir?',
            message: `Pindah kerja menjadi ${job.name}? Gaji Anda akan disesuaikan menjadi $ ${financeManager.formatCurrency(job.salary)}/bulan.`,
            icon: job.icon,
            confirmText: 'Lamar Pekerjaan',
            confirmClass: 'btn-primary'
        });

        if (confirmed) {
            gameState.set('career.currentJob', jobId);
            ui.success(`Selamat! Anda resmi bekerja sebagai ${job.name}.`);
            this.render();
        }
    }

    getJob(id) {
        return this.jobs.find(j => j.id === id) || this.jobs[0];
    }

    formatShort(num) {
        if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        return financeManager.formatCurrency(num);
    }
}

export const careerPage = new CareerPage();
export default careerPage;
