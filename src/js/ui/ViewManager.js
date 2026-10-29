/**
 * ViewManager.js - Streamlined Entrypoint & Facade
 * Delegates core navigation and sub-views to modular files in ./views/
 * 
 * Modular components:
 * - ./views/MarketRows.js: Stock & Crypto row renderers and detail bindings
 * - ./views/MobileNav.js: Mobile bottom nav tier & services list modal
 * - ./views/PassiveIncomeView.js: Staking, Mining, Launchdrops, and Trading Bots
 * - ./views/ViewManager.js: Main lifecycle, view transitions, and market smart table router
 */

export * from './views/ViewManager.js';
export { default } from './views/ViewManager.js';
