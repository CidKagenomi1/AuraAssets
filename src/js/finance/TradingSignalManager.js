/**
 * TradingSignalManager.js - Professional AI Trading Signals
 * Generates market insights based on volatility and trends.
 * Temperature System:
 * - Hot (80-100%): Short-term pump, high volatility, high risk/reward.
 * - Warm (40-70%): Medium growth, moderate risk.
 * - Cool (0-30%): Long-term stability, low return, low risk.
 */

import gameState from '../game/GameState.js';
import stockMarket from './StockMarket.js';
import cryptoMarket from './CryptoMarket.js';
import timeManager from '../game/TimeManager.js';

class TradingSignalManager {
    constructor() {
        this.signals = [];
        this.lastRefreshDay = -1;
        this.currentPeriod = { from: '', until: '' };
    }

    /**
     * Get or generate signals for the current week
     */
    getSignals() {
        const currentDay = gameState.get('gameTime.totalDays') || 0;
        
        // Try loading from gameState if memory is empty
        if (this.signals.length === 0) {
            const savedSignals = gameState.get('tradingSignals');
            if (savedSignals && savedSignals.length > 0) {
                this.signals = savedSignals;
                // If it's a valid saved period, keep it until next 7-day boundary
                this.lastRefreshDay = Math.floor(currentDay / 7) * 7;
                
                // Restore currentPeriod from gameState or reconstruct it
                this.currentPeriod = gameState.get('tradingSignalsPeriod') || {
                    from: timeManager.formatDay(this.lastRefreshDay),
                    until: timeManager.formatDay(this.lastRefreshDay + 7)
                };
            }
        }

        // Refresh every 7 days normally, or 10 days if luck is active (making pumps last longer!)
        const luckActive = (gameState.get('donations.luckTicksRemaining') || 0) > 0;
        const refreshInterval = luckActive ? 10 : 7;
        if (currentDay - this.lastRefreshDay >= refreshInterval || this.signals.length === 0) {
            this.generateSignals();
            this.lastRefreshDay = currentDay;
        }
        
        return this.signals;
    }

    generateSignals() {
        this.signals = [];
        const currentDay = gameState.get('gameTime.totalDays') || 0;
        
        // Set period
        this.currentPeriod = {
            from: timeManager.formatDay(currentDay),
            until: timeManager.formatDay(currentDay + 7)
        };
        gameState.set('tradingSignalsPeriod', this.currentPeriod);
        
        // Get all assets from markets
        const allStocks = Object.entries(stockMarket.stocks).map(([id, s]) => ({
            id,
            type: 'stock',
            name: s.name,
            baseRisk: Math.min(s.volatility * 150, 10) // Map volatility to 0-10
        }));

        const allCryptos = Object.entries(cryptoMarket.cryptos).map(([id, c]) => ({
            id,
            type: 'crypto',
            name: c.name,
            baseRisk: Math.min(c.volatility * 50, 10) // Crypto volatility is higher, adjust scale
        }));

        const assets = [...allStocks, ...allCryptos];

        const luckActive = (gameState.get('donations.luckTicksRemaining') || 0) > 0;
        this.signals = assets.map(asset => {
            let rand = Math.random();
            if (luckActive) {
                rand = Math.min(0.999, rand + 0.12); // Boost probability of bullish/moon signals
            }
            let temperature, label, timeframe, potential, risk;

            const isHighVolStock = asset.type === 'stock' && asset.baseRisk > 3;

            if ((rand > 0.96 && asset.type === 'crypto') || (rand > 0.98 && isHighVolStock)) {
                // MOON Signal (Exciting & Impactful!)
                temperature = 100;
                label = 'MOON 🚀';
                timeframe = 'Hyper-Growth';
                potential = (Math.random() * 2000 + 1000).toFixed(0) + '%';
                risk = 'EXTREME';
            } else if (rand > 0.85) {
                // HOT Signal
                temperature = 90;
                label = 'HOT 🔥';
                timeframe = 'Short-term Scalp';
                potential = (Math.random() * 20 + 15).toFixed(1) + '%';
                risk = 'Very High';
            } else if (rand > 0.65) {
                // HEAT Signal
                temperature = 75;
                label = 'HEAT ⚡';
                timeframe = 'High Gain';
                potential = (Math.random() * 12 + 8).toFixed(1) + '%';
                risk = 'High';
            } else if (rand > 0.45) {
                // WARM Signal
                temperature = 50;
                label = 'WARM ☀️';
                timeframe = 'Medium Growth';
                potential = (Math.random() * 7 + 4).toFixed(1) + '%';
                risk = 'Moderate';
            } else if (rand > 0.2) {
                // NEUTRAL Signal
                temperature = 30;
                label = 'NEUTRAL 😐';
                timeframe = 'Sideways';
                potential = (Math.random() * 2 + 0.5).toFixed(1) + '%';
                risk = 'Low';
            } else {
                // COOL Signal
                temperature = 10;
                label = 'COOL ❄️';
                timeframe = 'No Reaction';
                potential = (Math.random() * 1 + 0.1).toFixed(1) + '%';
                risk = 'Minimal';
            }

            return {
                ...asset,
                temperature,
                label,
                timeframe,
                potential,
                risk,
                message: this.getSignalMessage(asset.name, label)
            };
        });

        // Store signals in gameState for decoupled market-logic access
        gameState.set('tradingSignals', this.signals);
    }

    getSignalMessage(name, label) {
        if (label === 'MOON 🚀') return `⚠️ DETEKSI ANOMALI: ${name} berpotensi mengalami kenaikan eksponensial dalam waktu sangat singkat!`;
        if (label === 'HOT 🔥') return `Volume beli masif terdeteksi pada ${name}. Momentum sangat kuat untuk scalping.`;
        if (label === 'HEAT ⚡') return `${name} menunjukkan tekanan beli yang stabil. Potensi breakout cukup besar.`;
        if (label === 'WARM ☀️') return `${name} bergerak dalam tren naik yang sehat. Cocok untuk cicil bertahap.`;
        if (label === 'NEUTRAL 😐') return `${name} sedang dalam fase konsolidasi. Belum ada tanda pergerakan signifikan.`;
        return `${name} tidak menunjukkan reaksi harga. Pasar sedang sepi untuk aset ini.`;
    }

    getTemperatureColor(temp) {
        if (temp === 100) return '#a855f7'; // Purple (Moon)
        if (temp >= 80) return '#ef4444'; // Red (Hot)
        if (temp >= 60) return '#f97316'; // Orange (Heat)
        if (temp >= 40) return '#f59e0b'; // Amber (Warm)
        if (temp >= 20) return '#94a3b8'; // Slate (Neutral)
        return '#3b82f6'; // Blue (Cool)
    }
}

const tradingSignalManager = new TradingSignalManager();
export default tradingSignalManager;
