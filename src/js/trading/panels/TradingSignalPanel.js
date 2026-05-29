/**
 * TradingSignalPanel.js - Investor AI Signal View with Sorting
 */

import tradingSignalManager from '../TradingSignalManager.js';
import viewManager from '../../ui/ViewManager.js';
import stockPanel from './StockPanel.js';
import cryptoPanel from './CryptoPanel.js';
import globalEconomy from '../../core/GlobalEconomy.js';

class TradingSignalPanel {
    constructor() {
        this.signals = [];
        this.sortConfig = { key: 'temperature', direction: 'desc' };
    }

    show() {
        this.signals = tradingSignalManager.getSignals();
        this.render();
    }

    sort(key) {
        if (this.sortConfig.key === key) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.key = key;
            this.sortConfig.direction = 'desc';
        }
        this.render();
    }

    getSortedSignals() {
        const signals = this.signals || [];
        return [...signals].sort((a, b) => {
            let valA = a[this.sortConfig.key];
            let valB = b[this.sortConfig.key];

            // Potential return needs parsing
            if (this.sortConfig.key === 'potential') {
                valA = parseFloat(a.potential);
                valB = parseFloat(b.potential);
            }

            if (valA < valB) return this.sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return this.sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    render() {
        const sortedSignals = this.getSortedSignals();
        const sortIcon = (key) => {
            if (this.sortConfig.key !== key) return '↕️';
            return this.sortConfig.direction === 'asc' ? '🔼' : '🔽';
        };

        const econStatus = globalEconomy.getMarketStatus();
        const fearGreed = globalEconomy.getFearGreedIndex();
        let bulletin = '';

        if (econStatus.trend === 'BULL') {
            bulletin = `<strong>Kondisi Pasar: ${econStatus.phaseName} (Indeks: ${Math.round(econStatus.index)})</strong>. Sentimen pasar sangat optimis dengan indeks Fear & Greed mencapai <strong>${fearGreed} (Greed)</strong>. Konsumen bergairah tinggi dan likuiditas melimpah, mendorong reli kuat di sektor Ritel, Otomotif, dan Transportasi Udara. Momentum ini sangat menguntungkan bagi investor agresif untuk memaksimalkan keuntungan jangka pendek.`;
        } else if (econStatus.trend === 'PEAK') {
            bulletin = `<strong>Kondisi Pasar: ${econStatus.phaseName} (Indeks: ${Math.round(econStatus.index)})</strong>. Pasar berada di fase jenuh beli dengan indeks Fear & Greed di level ekstrem <strong>${fearGreed} (Extreme Greed)</strong>. Valuasi aset saham bluechip dan properti berada di titik tertinggi. Transaksi sangat aktif, namun waspadai risiko gelembung aset (bubble) dan aksi profit-taking dari investor institusional dalam waktu dekat.`;
        } else if (econStatus.trend === 'BEAR') {
            bulletin = `<strong>Kondisi Pasar: ${econStatus.phaseName} (Indeks: ${Math.round(econStatus.index)})</strong>. Ketakutan menyelimuti pasar dengan indeks Fear & Greed anjlok ke <strong>${fearGreed} (Fear)</strong>. Resesi global membayangi, daya beli konsumen merosot tajam, dan tekanan jual membabibuta terjadi di bursa saham dan pasar kripto. Disarankan menahan uang tunai (cash) dan bersikap defensif.`;
        } else if (econStatus.trend === 'TROUGH') {
            bulletin = `<strong>Kondisi Pasar: ${econStatus.phaseName} (Indeks: ${Math.round(econStatus.index)})</strong>. Pasar menyentuh dasar resesi terdalam dengan sentimen terpuruk di level <strong>${fearGreed} (Extreme Fear)</strong>. Aktivitas industri melambat drastis. Namun bagi investor cerdas, ini merupakan periode akumulasi terbaik di mana aset-aset berharga sedang diobral murah.`;
        } else { // RECOVERY
            bulletin = `<strong>Kondisi Pasar: ${econStatus.phaseName} (Indeks: ${Math.round(econStatus.index)})</strong>. Tanda-tanda pemulihan ekonomi mulai terlihat jelas dengan indeks Fear & Greed merayap ke <strong>${fearGreed} (Neutral)</strong>. Rantai pasok manufaktur mulai pulih dan daya beli masyarakat perlahan bangkit kembali, membuka peluang bagi investor untuk mulai mencicil investasi jangka panjang.`;
        }

        const content = `
            <div class="hybrid-page-container">
                <div style="margin-bottom: 2rem; background: linear-gradient(135deg, rgba(31, 41, 55, 0.5), rgba(17, 24, 39, 0.8)); padding: 2rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); position: relative; overflow: hidden;">
                    <div style="position: absolute; right: -20px; top: -20px; font-size: 10rem; opacity: 0.05; transform: rotate(-15deg);">📈</div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h3 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.75rem; color: white;">AI Trading Signals 📡</h3>
                            <p style="color: var(--text-muted); max-width: 650px; font-size: 0.85rem; line-height: 1.6; margin: 0;">
                                ${bulletin}
                            </p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.25rem;">Periode Sinyal</div>
                            <div style="padding: 0.5rem 1rem; background: var(--accent-primary-soft); color: var(--accent-primary); border-radius: var(--radius-md); font-weight: 700; font-size: 0.85rem; border: 1px solid var(--accent-primary-soft);">
                                🗓️ ${tradingSignalManager.currentPeriod.from} — ${tradingSignalManager.currentPeriod.until}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card" style="background: var(--bg-surface); padding: 0; border: 1px solid var(--border-color); overflow: hidden;">
                    <div style="max-height: 65vh; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead style="position: sticky; top: 0; z-index: 10; background: var(--bg-surface);">
                                <tr style="background: rgba(255,255,255,0.05); border-bottom: 1px solid var(--border-color);">
                                    <th class="sort-trigger" data-sort="id" style="padding: 1.25rem; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; cursor: pointer; user-select: none;">
                                        Aset ${sortIcon('id')}
                                    </th>
                                    <th class="sort-trigger" data-sort="temperature" style="padding: 1.25rem; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; cursor: pointer; user-select: none;">
                                        Temperatur ${sortIcon('temperature')}
                                    </th>
                                    <th style="padding: 1.25rem; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Timeframe</th>
                                    <th class="sort-trigger" data-sort="potential" style="padding: 1.25rem; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; cursor: pointer; user-select: none;">
                                        Est. Return ${sortIcon('potential')}
                                    </th>
                                    <th style="padding: 1.25rem; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Risiko</th>
                                    <th style="padding: 1.25rem; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; text-align: right;">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                            ${sortedSignals.map(s => {
                                const tempColor = tradingSignalManager.getTemperatureColor(s.temperature);
                                return `
                                    <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.01)'" onmouseout="this.style.background='transparent'">
                                        <td style="padding: 1.25rem;">
                                            <div style="font-weight: 700; color: white;">${s.id}</div>
                                            <div style="font-size: 0.75rem; color: var(--text-muted);">${s.name}</div>
                                        </td>
                                        <td style="padding: 1.25rem;">
                                            <span style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: var(--radius-full); background: ${tempColor}22; color: ${tempColor}; font-weight: 800; font-size: 0.75rem; border: 1px solid ${tempColor}44;">
                                                ${s.label}
                                            </span>
                                        </td>
                                        <td style="padding: 1.25rem; font-size: 0.85rem; color: var(--text-main);">${s.timeframe}</td>
                                        <td style="padding: 1.25rem; font-size: 0.85rem; font-weight: 700; color: var(--accent-primary);">+${s.potential}</td>
                                        <td style="padding: 1.25rem; font-size: 0.85rem; color: var(--text-muted);">${s.risk}</td>
                                         <td style="padding: 1.25rem; text-align: right;">
                                             <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                                                 <button class="btn btn-sm btn-secondary nav-to-market" data-market="${s.type === 'crypto' ? 'crypto' : 'stocks'}" data-symbol="${s.id}">
                                                     Analisis →
                                                 </button>
                                             </div>
                                         </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

                <div class="card" style="margin-top: 2rem; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); padding: 1.5rem;">
                    <h4 style="color: #3b82f6; margin-bottom: 0.75rem;">💡 Tips Strategi Investor</h4>
                    <ul style="font-size: 0.85rem; color: var(--text-muted); padding-left: 1.25rem; line-height: 1.6; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 2rem;">
                        <li><strong>MOON (Rare):</strong> High risk, high reward (1000%+). Cek koin micin!</li>
                        <li><strong>HOT (Scalp):</strong> Momentum kuat, beli cepat jual cepat.</li>
                        <li><strong>HEAT (High Gain):</strong> Breakout terdeteksi, hold jangka pendek.</li>
                        <li><strong>WARM (Growth):</strong> Pertumbuhan sehat, cocok untuk DCA.</li>
                        <li><strong>NEUTRAL (Sideways):</strong> Pasar datar, wait and see.</li>
                        <li><strong>COOL (Stable):</strong> Tidak ada reaksi, hindari trading aktif.</li>
                    </ul>
                </div>
            </div>
        `;

        viewManager.showDynamicView('Trading Signals', 'Wawasan AI untuk strategi investasi', content);
        this.bindEvents();
    }

    bindEvents() {
        const container = document.getElementById('dynamic-view-content');
        if (!container) return;

        const headers = container.querySelectorAll('.sort-trigger');
        headers.forEach(h => {
            h.onclick = () => this.sort(h.dataset.sort);
        });

        const navBtns = container.querySelectorAll('.nav-to-market');
        navBtns.forEach(btn => {
            btn.onclick = () => {
                const marketType = btn.dataset.market;
                const symbol = btn.dataset.symbol;

                // Close current modal/panel view if any
                import('../../ui/UIManager.js').then(m => m.default.closeModal());

                // Direct open specific trading terminal
                import('../TradingPage.js').then(m => {
                    m.default.open(symbol, marketType);
                });
            };
        });
    }
}

const tradingSignalPanel = new TradingSignalPanel();
export default tradingSignalPanel;
