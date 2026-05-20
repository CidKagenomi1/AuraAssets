/**
 * RoleManager.js - Role-Based Gameplay System (v2)
 * Defines available roles and controls feature visibility per role.
 */

import gameState from './GameState.js';

// ==========================================
// ROLE DEFINITIONS
// ==========================================
export const ROLES = {
    karyawan: {
        id: 'karyawan',
        label: 'Karyawan',
        icon: '👔',
        desc: 'Fokus pada jenjang karir, gaji bulanan, simpanan, dan pinjaman.',
        detail: 'Cocok untuk kamu yang ingin membangun kekayaan secara stabil lewat pekerjaan tetap.',
        allowedFeatures: ['work', 'career', 'savings', 'loan', 'transfer', 'tax', 'finance', 'guide', 'quick-actions'],
        hiddenNav: ['market', 'portfolio', 'business', 'property', 'loan', 'savings', 'tax', 'transfer', 'finance', 'guide', 'history'],
        startingBalance: 500000,
        monthlyEvent: 'Gaji bulanan diterima setiap awal bulan.',
        color: '#6366f1' // Indigo
    },
    investor: {
        id: 'investor',
        label: 'Investor',
        icon: '📈',
        desc: 'Fokus pada saham, crypto, dan properti untuk pertumbuhan kekayaan.',
        detail: 'Cocok untuk kamu yang ingin mengembangkan modal lewat pasar finansial.',
        allowedFeatures: ['market', 'portfolio', 'invest', 'crypto', 'property', 'savings', 'loan', 'finance', 'guide', 'trading-signal', 'quick-actions'],
        hiddenNav: ['business', 'property', 'loan', 'savings', 'tax', 'finance', 'guide', 'history'],
        startingBalance: 10000000,
        monthlyEvent: 'Dividen dan bunga portofolio dihitung setiap bulan.',
        color: '#10b981' // Emerald
    },
    pebisnis: {
        id: 'pebisnis',
        label: 'Pebisnis',
        icon: '🏢',
        desc: 'Fokus pada mendirikan bisnis, mengelola operasional, dan revenue.',
        detail: 'Cocok untuk kamu yang ingin membangun imperium bisnis dari nol.',
        allowedFeatures: ['business', 'loan', 'tax', 'savings', 'transfer', 'finance', 'guide', 'property'],
        hiddenNav: ['market', 'portfolio'],
        startingBalance: 5000000,
        monthlyEvent: 'Revenue bisnis masuk setiap akhir bulan.',
        color: '#f59e0b' // Amber
    },
    survivor: {
        id: 'survivor',
        label: 'Survivor',
        icon: '💀',
        desc: 'Hybrid total: Menjalankan Karir, Investasi, dan Bisnis sekaligus.',
        detail: 'Role tersulit dan tersibuk. Kamu punya akses ke SEMUA fitur, tapi harus membagi fokus di banyak lini.',
        allowedFeatures: ['work', 'career', 'market', 'portfolio', 'invest', 'crypto', 'property', 'business', 'savings', 'loan', 'transfer', 'tax', 'finance', 'guide', 'trading-signal', 'quick-actions'],
        hiddenNav: [],
        startingBalance: 1000000,
        monthlyEvent: 'Semua event bulanan (gaji, dividen, revenue) aktif sekaligus!',
        color: '#ec4899' // Pink/Magenta
    }
};

class RoleManager {
    /**
     * Get the active role ID from state
     */
    getRole() {
        return gameState.get('player.role') || null;
    }

    /**
     * Get full role definition object
     */
    getRoleData(roleId = null) {
        const id = roleId || this.getRole();
        return ROLES[id] || null;
    }

    /**
     * Set a new role, emit 'roleChange' event
     */
    setRole(roleId) {
        if (!ROLES[roleId]) {
            console.warn(`RoleManager: Unknown role "${roleId}"`);
            return false;
        }
        gameState.set('player.role', roleId);
        gameState.set('player.roleSelectedAt', Date.now());
        gameState.emit('roleChange', roleId);
        return true;
    }

    /**
     * Check if a feature is allowed for the active role
     * @param {string} featureId - e.g. 'market', 'career', 'business'
     */
    isFeatureAllowed(featureId) {
        const role = this.getRoleData();
        if (!role) return false; // No role set → hide features until selected
        return role.allowedFeatures.includes(featureId);
    }

    /**
     * Get list of nav items to hide for the active role
     */
    getHiddenNavItems() {
        const role = this.getRoleData();
        return role?.hiddenNav || [];
    }

    /**
     * Apply role-based visibility to the DOM.
     * Elements with [data-feature] are shown/hidden based on active role.
     */
    applyVisibility() {
        const role = this.getRoleData();
        // If no role, we still want to process and hide everything

        // Handle feature cards / menu items
        document.querySelectorAll('[data-feature]').forEach(el => {
            const feature = el.dataset.feature;
            const allowed = role ? role.allowedFeatures.includes(feature) : false;
            el.classList.toggle('hidden', !allowed);
        });

        // Handle nav items (sidebar + bottom nav)
        document.querySelectorAll('.nav-btn[data-view]').forEach(el => {
            const view = el.dataset.view;
            const hidden = role ? role.hiddenNav.includes(view) : true;
            el.classList.toggle('hidden', hidden);
        });
        document.querySelectorAll('.sidebar-link[data-view]').forEach(el => {
            const view = el.dataset.view;
            const hidden = role ? role.hiddenNav.includes(view) : true;
            el.classList.toggle('hidden', hidden);
        });

        // Show/hide earn panel — for Karyawan & Survivor
        const earnPanel = document.getElementById('earn-panel');
        if (earnPanel) {
            const isEarnRole = role && (role.id === 'karyawan' || role.id === 'survivor');
            earnPanel.classList.toggle('hidden', !isEarnRole);
        }

        // Update role badge in sidebar
        const roleBadge = document.getElementById('player-role-badge');
        if (roleBadge) {
            if (role) {
                roleBadge.textContent = role.label.toUpperCase();
                roleBadge.style.color = role.color;
                roleBadge.classList.remove('hidden');
            } else {
                roleBadge.classList.add('hidden');
            }
        }

        // Handle sidebar dividers
        document.querySelectorAll('.sidebar-divider').forEach(el => {
            const isPebisnis = role && (role.id === 'pebisnis' || role.id === 'survivor');
            el.classList.toggle('hidden', !isPebisnis);
        });
    }

    /**
     * Get all roles as array (for role picker UI)
     */
    getAllRoles() {
        return Object.values(ROLES);
    }

    /**
     * Check if role has been selected
     */
    hasRole() {
        return !!this.getRole();
    }
}

export const roleManager = new RoleManager();
export default roleManager;
