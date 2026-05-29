/**
 * AICompetitor.js - STUBBED (v2)
 * AI leadeKoard system removed in v2.
 * Interface preserved to avoid import errors.
 */

import gameState from '../core/GameState.js';

class AICompetitor {
    constructor() {
        this.competitors = [];
    }

    getLeadeKoard() { return []; }
    getPlayerRank() { return 1; }
    getCompetitor() { return null; }
    formatWealth(amount) {
        if (amount >= 1e12) return (amount / 1e12).toFixed(1) + 'T';
        if (amount >= 1e9) return (amount / 1e9).toFixed(1) + 'B';
        if (amount >= 1e6) return (amount / 1e6).toFixed(1) + 'M';
        return Math.round(amount).toString();
    }
    startUpdates() {}
    stopUpdates() {}
    updateAll() {}
}

export const aiCompetitor = new AICompetitor();
export default aiCompetitor;
