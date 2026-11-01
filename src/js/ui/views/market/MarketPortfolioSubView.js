/**
 * MarketPortfolioSubView.js - In-Market Active Asset Portfolio & Position Summary
 * Renders live market asset valuation, total invested capital, floating P/L, and holding rows.
 */

import stockMarket from '../../../trading/StockMarket.js';
import cryptoMarket from '../../../trading/CryptoMarket.js';
import { buildPortfolioRow } from '../MarketRows.js';

export class MarketPortfolioSubView {
  render(portfolioList) {
    if (!portfolioList) return;

    const stockPortfolio = stockMarket.getPortfolio() || [];
    const cryptoWallet = cryptoMarket.getWallet() || [];
    
    const totalStockVal = stockMarket.getPortfolioValue() || 0;
    const totalCryptoVal = cryptoMarket.getWalletValue() || 0;
    const totalMarketVal = totalStockVal + totalCryptoVal;

    const totalStockProfit = stockPortfolio.reduce((sum, h) => sum + (h.profit || 0), 0);
    const totalCryptoProfit = cryptoWallet.reduce((sum, h) => sum + (h.profit || 0), 0);
    const totalProfit = totalStockProfit + totalCryptoProfit;

    const totalStockInvested = stockPortfolio.reduce((sum, h) => sum + (h.totalInvested || 0), 0);
    const totalCryptoInvested = cryptoWallet.reduce((sum, h) => sum + (h.totalInvested || 0), 0);
    const totalInvested = totalStockInvested + totalCryptoInvested;
    const totalProfitPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
    const isProfit = totalProfit >= 0;

    if (stockPortfolio.length === 0 && cryptoWallet.length === 0) {
      portfolioList.innerHTML = `
        <div class="empty-state" style="padding: 2.5rem 1rem; text-align: center; color: rgba(255,255,255,0.4);">
          <div class="empty-state-icon" style="font-size: 2.5rem; margin-bottom: 0.5rem;">💼</div>
          <div class="empty-state-text" style="font-weight: 700; color: #fff;">Portofolio Masih Kosong</div>
          <div style="font-size: 0.8rem; margin-top: 0.25rem;">Beli saham atau kripto di tab pasar untuk mulai membangun portofolio investasi Anda.</div>
          <button type="button" id="btn-empty-portfolio-buy" class="btn btn-primary btn-sm" style="margin-top: 1.25rem; display: inline-flex; align-items: center; gap: 0.4rem;">
            <span>Jelajahi Pasar Saham</span>
            <span>→</span>
          </button>
        </div>
      `;
      const emptyBtn = portfolioList.querySelector('#btn-empty-portfolio-buy');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => {
          if (this.coordinator && typeof this.coordinator.switchMarketTab === 'function') {
            this.coordinator.switchMarketTab('stocks');
          }
        });
      }
      return;
    }

    const headerSummary = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; padding: 1rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-md);">
        <div>
          <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Nilai Pasar Aset</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #ffffff; margin-top: 2px;">$ ${Number(totalMarketVal).toLocaleString('id-ID')}</div>
        </div>
        <div>
          <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Total Modal Berjalan</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: #ffffff; margin-top: 2px;">$ ${Number(totalInvested).toLocaleString('id-ID')}</div>
        </div>
        <div>
          <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Floating P/L</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: ${isProfit ? '#10b981' : '#ef4444'}; margin-top: 2px;">
            ${isProfit ? '+' : ''}$ ${Number(totalProfit).toLocaleString('id-ID')} (${isProfit ? '+' : ''}${totalProfitPct.toFixed(2)}%)
          </div>
        </div>
      </div>
    `;

    let rowsHtml = '';
    stockPortfolio.forEach(h => {
      rowsHtml += buildPortfolioRow(h, 'stock');
    });
    cryptoWallet.forEach(h => {
      rowsHtml += buildPortfolioRow(h, 'crypto');
    });

    portfolioList.innerHTML = headerSummary + `<div style="display: flex; flex-direction: column; gap: 0.65rem;">${rowsHtml}</div>`;
  }
}

export const marketPortfolioSubView = new MarketPortfolioSubView();
export default marketPortfolioSubView;

