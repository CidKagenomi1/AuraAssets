/**
 * TimeManager.js - Game Time System
 * Handles day/month/year progression and periodic events
 */

import gameState from './GameState.js';

class TimeManager {
    constructor() {
        this.tickInterval = null;
        this.callbacks = {
            onDay: [],
            onWeek: [],
            onMonth: [],
            onYear: []
        };

        // Time settings
        this.baseMsPerDay = 3000; // 3 seconds = 1 game day
        this.msPerGameDay = this.baseMsPerDay; 
    }

    start() {
        if (this.tickInterval) return;

        // Initialize lastTick if it doesn't exist
        if (!gameState.get('gameTime.lastTick')) {
            gameState.set('gameTime.lastTick', Date.now());
        }

        this.tickInterval = setInterval(() => this.tick(), 1000);
        console.log(`⏰ Time started (1 day = ${this.baseMsPerDay / 1000} seconds real-time)`);
    }

    stop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
            console.log('⏸️ Time stopped');
        }
    }

    setSpeed(speed) {
        gameState.set('gameTime.speed', speed);
        if (speed === 0) {
            this.stop();
        } else {
            // Speed affects the calculation in tick()
            if (!this.tickInterval) this.start();
        }
    }

    tick() {
        const speed = gameState.get('gameTime.speed') || 1;
        if (speed === 0) return;

        const now = Date.now();
        const lastTick = gameState.get('gameTime.lastTick') || now;
        const elapsed = now - lastTick;

        // Record tick-by-tick balance for 1D chart
        gameState.recordTickBalance();

        // Calculate target duration based on speed
        const targetDuration = this.baseMsPerDay / speed;

        if (elapsed >= targetDuration) {
            this.advanceDay();
            gameState.set('gameTime.lastTick', now);
        }
    }

    advanceDay() {
        let day = gameState.get('gameTime.day');
        let month = gameState.get('gameTime.month');
        let year = gameState.get('gameTime.year');

        day++;

        // Check for new week (every 7 days)
        if (day % 7 === 0) {
            this.triggerCallbacks('onWeek');
        }

        // Check for new month (simplified: 30 days per month)
        if (day > 30) {
            day = 1;
            month++;
            this.triggerCallbacks('onMonth');
            gameState.emit('monthPass');

            // Record month start balance
            gameState.set('player.monthStartBalance', gameState.getBalance());
        }

        // Check for new year
        if (month > 12) {
            month = 1;
            year++;
            this.triggerCallbacks('onYear');
        }

        gameState.set('gameTime.day', day);
        gameState.set('gameTime.month', month);
        gameState.set('gameTime.year', year);

        // Track absolute total days for systems that need a monotonic counter
        // (e.g. TradingSignalManager refresh cycle)
        const totalDays = ((year - 2010) * 360) + ((month - 1) * 30) + day - 1;
        gameState.set('gameTime.totalDays', totalDays);

        this.triggerCallbacks('onDay');
        gameState.emit('dayPass', { day, month, year });
        gameState.emit('timeAdvance', { day, month, year });
    }

    // Event registration
    onDay(callback) {
        this.callbacks.onDay.push(callback);
        return () => this.removeCallback('onDay', callback);
    }

    onWeek(callback) {
        this.callbacks.onWeek.push(callback);
        return () => this.removeCallback('onWeek', callback);
    }

    onMonth(callback) {
        this.callbacks.onMonth.push(callback);
        return () => this.removeCallback('onMonth', callback);
    }

    onYear(callback) {
        this.callbacks.onYear.push(callback);
        return () => this.removeCallback('onYear', callback);
    }

    removeCallback(type, callback) {
        const index = this.callbacks[type].indexOf(callback);
        if (index > -1) this.callbacks[type].splice(index, 1);
    }

    triggerCallbacks(type) {
        this.callbacks[type].forEach(cb => {
            try {
                cb(this.getCurrentTime());
            } catch (e) {
                console.error(`TimeManager callback error (${type}):`, e);
            }
        });
    }

    getCurrentTime() {
        return {
            day: gameState.get('gameTime.day'),
            month: gameState.get('gameTime.month'),
            year: gameState.get('gameTime.year')
        };
    }

    getFormattedDate() {
        // BUG-06 FIX: Use day/month/year from gameState directly as primary source.
        // Fall back to totalDays calculation only if direct values are unavailable (old saves).
        const day = gameState.get('gameTime.day');
        const month = gameState.get('gameTime.month');
        const year = gameState.get('gameTime.year');

        if (day && month && year) {
            const monthNames = [
                'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
                'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
            ];
            return `${day} ${monthNames[month - 1]} ${year}`;
        }

        // Legacy fallback: compute from totalDays
        return this.formatDay(gameState.get('gameTime.totalDays') || 0);
    }

    formatDay(totalDays) {
        const day = (totalDays % 30) + 1;
        const month = (Math.floor(totalDays / 30) % 12) + 1;
        const year = 2010 + Math.floor(totalDays / 360);
        
        const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
            'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
        ];
        return `${day} ${monthNames[month - 1]} ${year}`;
    }

    getDaysUntilEndOfMonth() {
        return 30 - gameState.get('gameTime.day');
    }
}

export const timeManager = new TimeManager();
export default timeManager;
