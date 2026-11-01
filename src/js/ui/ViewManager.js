/**
 * ViewManager.js - Streamlined Entrypoint & Facade
 * Delegates core navigation and sub-views to modular files in ./views/
 * 
 * Modular components:
 * - ./views/market/MarketCoordinator.js: Orchestrator for all market sub-views & tab switching
 * - ./views/market/StockCryptoSubView.js: Stock & Crypto multi-factor filters & table rendering
 * - ./views/market/MutualFundsSubView.js: Reksa Dana & ETF catalogs and modal trading
 * - ./views/market/MarketPortfolioSubView.js: Active positions & portfolio metrics
 * - ./views/market/MarketNewsSubView.js: Macro events, breaking news & actionable alerts
 * - ./views/MarketRows.js: Stock & Crypto row renderers and detail bindings
 * - ./views/MobileNav.js: Mobile bottom nav tier & services list modal
 * - ./views/PassiveIncomeView.js: Staking, Mining, Launchdrops, and Trading Bots
 * - ./views/ViewManager.js: Main lifecycle, view transitions, and route delegation
 */

export * from './views/ViewManager.js';
export { default } from './views/ViewManager.js';
