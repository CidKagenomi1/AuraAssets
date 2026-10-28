export class PortfolioService {
  constructor(db, accountsService) {
    this.db = db;
    this.accountsService = accountsService;
  }

  /**
   * Retrieve the authenticated player's cash balance, locked balance,
   * stock holdings, unrealized P&L, and total equity.
   */
  async getPlayerPortfolio(playerId) {
    const account = await this.accountsService.getAccount(playerId);

    const { rows: positions } = await this.db.query(
      `SELECT p.id, p.player_id, p.stock_id, p.symbol,
              p.available_quantity, p.locked_quantity,
              p.avg_buy_price, p.total_invested, p.updated_at,
              s.name AS stock_name, s.sector, s.tick_size,
              COALESCE(m.last_price, s.base_price) AS current_price,
              COALESCE(m.previous_close, s.base_price) AS previous_close
       FROM positions p
       JOIN stocks s ON s.id = p.stock_id
       LEFT JOIN market_state m ON m.stock_id = p.stock_id
       WHERE p.player_id = $1
         AND (p.available_quantity > 0 OR p.locked_quantity > 0)
       ORDER BY p.symbol ASC`,
      [playerId]
    );

    let totalPortfolioValue = 0;
    let totalInvested = 0;

    const holdings = positions.map((pos) => {
      const availableQty = Number(pos.available_quantity);
      const lockedQty = Number(pos.locked_quantity);
      const totalQty = availableQty + lockedQty;
      const avgBuyPrice = Number(pos.avg_buy_price);
      const currentPrice = Number(pos.current_price);
      const invested = Number(pos.total_invested);
      const marketValue = totalQty * currentPrice;
      const unrealizedPnl = marketValue - invested;
      const unrealizedPnlPct = invested > 0 ? Number(((unrealizedPnl / invested) * 100).toFixed(2)) : 0;

      totalPortfolioValue += marketValue;
      totalInvested += invested;

      return {
        symbol: pos.symbol,
        name: pos.stock_name,
        sector: pos.sector,
        available_quantity: availableQty,
        locked_quantity: lockedQty,
        total_quantity: totalQty,
        avg_buy_price: avgBuyPrice,
        current_price: currentPrice,
        total_invested: invested,
        market_value: marketValue,
        unrealized_pnl: unrealizedPnl,
        unrealized_pnl_pct: unrealizedPnlPct,
        updated_at: pos.updated_at
      };
    });

    const totalCash = Number(account.available_balance) + Number(account.locked_balance);
    const totalEquity = totalCash + totalPortfolioValue;

    return {
      player_id: playerId,
      account: {
        available_balance: Number(account.available_balance),
        locked_balance: Number(account.locked_balance),
        total_balance: totalCash
      },
      summary: {
        total_portfolio_value: totalPortfolioValue,
        total_invested: totalInvested,
        total_unrealized_pnl: totalPortfolioValue - totalInvested,
        total_equity: totalEquity,
        open_positions_count: holdings.length
      },
      positions: holdings
    };
  }
}

export default PortfolioService;

