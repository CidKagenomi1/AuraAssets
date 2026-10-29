/**
 * TimeManager.js - Real-Time UTC Clock System
 * Synchronizes game time with real-world UTC date and time
 */

import gameState from './GameState.js';

const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

class TimeManager {
    constructor() {
        this.tickInterval = null;
        this.callbacks = {
            onDay: [],
            onWeek: [],
            onMonth: [],
            onYear: []
        };
    }

    start() {
        if (this.tickInterval) return;

        // Immediately sync to current UTC time on start
        this.syncWithUTC(true);

        this.tickInterval = setInterval(() => this.tick(), 1000);
        console.log(`⏰ Real-time UTC clock started (${this.getFormattedDate()} ${this.getFormattedTime()})`);
    }

    stop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }

    setSpeed(speed) {
        // Speed is fixed to 1x real-time UTC
        gameState.set('gameTime.speed', 1);
        if (!this.tickInterval) this.start();
    }

    syncWithUTC(isInitial = false) {
        const now = new Date();
        const utcDay = now.getUTCDate();
        const utcMonth = now.getUTCMonth() + 1;
        const utcYear = now.getUTCFullYear();
        const utcHours = String(now.getUTCHours()).padStart(2, '0');
        const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
        const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0');
        const utcTimeString = `${utcHours}:${utcMinutes}:${utcSeconds} UTC`;

        const prevDay = gameState.get('gameTime.day');
        const prevMonth = gameState.get('gameTime.month');
        const prevYear = gameState.get('gameTime.year');

        const dayChanged = !isInitial && prevDay !== undefined && (prevDay !== utcDay || prevMonth !== utcMonth || prevYear !== utcYear);
        const monthChanged = !isInitial && prevMonth !== undefined && (prevMonth !== utcMonth || prevYear !== utcYear);
        const yearChanged = !isInitial && prevYear !== undefined && (prevYear !== utcYear);

        if (prevDay !== utcDay) gameState.set('gameTime.day', utcDay);
        if (prevMonth !== utcMonth) gameState.set('gameTime.month', utcMonth);
        if (prevYear !== utcYear) gameState.set('gameTime.year', utcYear);
        gameState.state.gameTime.utcTime = utcTimeString;
        gameState.state.gameTime.lastTick = now.getTime();

        // Monotonic day counter since Unix epoch for systems that need totalDays
        const totalDays = Math.floor(now.getTime() / 86400000);
        if (gameState.get('gameTime.totalDays') !== totalDays) {
            gameState.set('gameTime.totalDays', totalDays);
        }

        if (dayChanged) {
            if (now.getUTCDay() === 1) {
                this.triggerCallbacks('onWeek');
            }
            if (monthChanged) {
                this.triggerCallbacks('onMonth');
                gameState.emit('monthPass');
                gameState.set('player.monthStartBalance', gameState.getBalance());
            }
            if (yearChanged) {
                this.triggerCallbacks('onYear');
            }
            this.triggerCallbacks('onDay');
            gameState.emit('dayPass', { day: utcDay, month: utcMonth, year: utcYear });
            gameState.emit('timeAdvance', { day: utcDay, month: utcMonth, year: utcYear });
        }

        gameState.emit('utcTick', {
            day: utcDay,
            month: utcMonth,
            year: utcYear,
            time: utcTimeString,
            dateFormatted: `${utcDay} ${MONTH_NAMES[utcMonth - 1]} ${utcYear}`
        });
    }

    tick() {
        this.syncWithUTC(false);
        // Record tick-by-tick balance for 1D chart
        gameState.recordTickBalance();
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
        const now = new Date();
        return {
            day: now.getUTCDate(),
            month: now.getUTCMonth() + 1,
            year: now.getUTCFullYear(),
            hours: now.getUTCHours(),
            minutes: now.getUTCMinutes(),
            seconds: now.getUTCSeconds()
        };
    }

    getFormattedTime() {
        const now = new Date();
        const h = String(now.getUTCHours()).padStart(2, '0');
        const m = String(now.getUTCMinutes()).padStart(2, '0');
        const s = String(now.getUTCSeconds()).padStart(2, '0');
        return `${h}:${m}:${s} UTC`;
    }

    getFormattedDate() {
        const now = new Date();
        const day = now.getUTCDate();
        const month = now.getUTCMonth();
        const year = now.getUTCFullYear();
        return `${day} ${MONTH_NAMES[month]} ${year}`;
    }

    formatDay(totalDays) {
        // Convert days since Unix epoch (or fallback offset) to UTC date string
        const ms = totalDays > 10000 ? totalDays * 86400000 : Date.now();
        const d = new Date(ms);
        return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    }

    getDaysUntilEndOfMonth() {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth() + 1;
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        return Math.max(0, lastDay - now.getUTCDate());
    }
}

export const timeManager = new TimeManager();
export default timeManager;
