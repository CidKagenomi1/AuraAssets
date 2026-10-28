export class MarketService {
  constructor(db, matchingEngine, logger = console) {
    this.db = db;
    this.matchingEngine = matchingEngine;
    this.logger = logger;
    this.isRecovered = false;
  }

  /**
   * Rebuild in-memory OrderBooks and MarketState from PostgreSQL on startup/restart,
   * and verify consistency of locked funds and locked shares against active orders.
   */
  async recoverStateFromDatabase() {
    if (!this.db) {
      this.logger.warn('[MarketService] No database configured; skipping DB state recovery.');
      return { stocksLoaded: 0, activeOrdersLoaded: 0, inconsistencies: [] };
    }

    // 1. Load active stocks + market_state
    const { rows: stocks } = await this.db.query(
      `SELECT s.id, s.symbol, s.name, s.sector, s.tick_size, s.lot_size,
              s.base_price, s.shares_outstanding,
              COALESCE(m.last_price, s.base_price) AS last_price,
              COALESCE(m.previous_close, s.base_price) AS previous_close,
              COALESCE(m.high_24h, s.base_price) AS high_24h,
              COALESCE(m.low_24h, s.base_price) AS low_24h,
              COALESCE(m.volume_24h, 0) AS volume_24h,
              m.last_trade_at
       FROM stocks s
       LEFT JOIN market_state m ON m.stock_id = s.id
       WHERE s.is_active = TRUE
       ORDER BY s.symbol ASC`
    );

    for (const row of stocks) {
      this.matchingEngine.registerStock({
        id: row.id,
        symbol: row.symbol,
        name: row.name,
        sector: row.sector,
        tickSize: Number(row.tick_size),
        lotSize: Number(row.lot_size),
        basePrice: Number(row.base_price)
      });

      this.matchingEngine.marketState.set(row.symbol, {
        symbol: row.symbol,
        lastPrice: Number(row.last_price),
        previousClose: Number(row.previous_close),
        high24h: Number(row.high_24h),
        low24h: Number(row.low_24h),
        volume24h: Number(row.volume_24h),
        lastTradeAt: row.last_trade_at
      });
    }

    // 2. Load active orders in strict sequence order
    const { rows: activeOrders } = await this.db.query(
      `SELECT id, player_id, stock_id, symbol, side, type, price,
              quantity, filled_quantity, remaining_quantity,
              locked_funds, status, idempotency_key, seq_no, created_at, updated_at
       FROM orders
       WHERE status IN ('OPEN', 'PARTIALLY_FILLED')
       ORDER BY seq_no ASC`
    );

    // Group by symbol and rebuild each OrderBook
    const ordersBySymbol = new Map();
    for (const order of activeOrders) {
      if (!ordersBySymbol.has(order.symbol)) {
        ordersBySymbol.set(order.symbol, []);
      }
      ordersBySymbol.get(order.symbol).push(order);
    }

    for (const [symbol, book] of this.matchingEngine.books.entries()) {
      const symbolOrders = ordersBySymbol.get(symbol) || [];
      book.rebuildFromOrders(symbolOrders);
    }

    // 3. Verify consistency of locked cash & locked shares
    const inconsistencies = await this.verifyLockConsistency();
    this.isRecovered = true;

    this.logger.info(
      {
        stocksLoaded: stocks.length,
        activeOrdersLoaded: activeOrders.length,
        inconsistenciesCount: inconsistencies.length
      },
      '[MarketService] Order book state recovered from PostgreSQL'
    );

    return {
      stocksLoaded: stocks.length,
      activeOrdersLoaded: activeOrders.length,
      inconsistencies
    };
  }

  /**
   * Audit that accounts.locked_balance == SUM(active BUY orders locked_funds)
   * and positions.locked_quantity == SUM(active SELL orders remaining_quantity)
   */
  async verifyLockConsistency() {
    if (!this.db) return [];
    const issues = [];

    const { rows: cashMismatches } = await this.db.query(
      `SELECT a.player_id,
              a.locked_balance AS account_locked,
              COALESCE(SUM(o.locked_funds), 0) AS orders_locked
       FROM accounts a
       LEFT JOIN orders o
         ON o.player_id = a.player_id
        AND o.side = 'BUY'
        AND o.status IN ('OPEN', 'PARTIALLY_FILLED')
       GROUP BY a.player_id, a.locked_balance
       HAVING a.locked_balance <> COALESCE(SUM(o.locked_funds), 0)`
    );

    for (const row of cashMismatches) {
      issues.push({
        type: 'CASH_LOCK_MISMATCH',
        playerId: row.player_id,
        accountLocked: Number(row.account_locked),
        ordersLocked: Number(row.orders_locked)
      });
    }

    const { rows: shareMismatches } = await this.db.query(
      `SELECT p.player_id,
              p.symbol,
              p.locked_quantity AS position_locked,
              COALESCE(SUM(o.remaining_quantity), 0) AS orders_locked
       FROM positions p
       LEFT JOIN orders o
         ON o.player_id = p.player_id
        AND o.stock_id = p.stock_id
        AND o.side = 'SELL'
        AND o.status IN ('OPEN', 'PARTIALLY_FILLED')
       GROUP BY p.player_id, p.symbol, p.locked_quantity
       HAVING p.locked_quantity <> COALESCE(SUM(o.remaining_quantity), 0)`
    );

    for (const row of shareMismatches) {
      issues.push({
        type: 'SHARE_LOCK_MISMATCH',
        playerId: row.player_id,
        symbol: row.symbol,
        positionLocked: Number(row.position_locked),
        ordersLocked: Number(row.orders_locked)
      });
    }

    if (issues.length > 0) {
      this.logger.error({ issues }, '[MarketService] Detected lock consistency issues during recovery!');
    }

    return issues;
  }

  /**
   * GET /api/market/stocks
   */
  async getAllStocks() {
    if (this.db) {
      const { rows } = await this.db.query(
        `SELECT s.id, s.symbol, s.name, s.sector, s.tick_size, s.lot_size,
                s.base_price, s.shares_outstanding,
                COALESCE(m.last_price, s.base_price) AS last_price,
                COALESCE(m.previous_close, s.base_price) AS previous_close,
                COALESCE(m.high_24h, s.base_price) AS high_24h,
                COALESCE(m.low_24h, s.base_price) AS low_24h,
                COALESCE(m.volume_24h, 0) AS volume_24h,
                m.last_trade_at
         FROM stocks s
         LEFT JOIN market_state m ON m.stock_id = s.id
         WHERE s.is_active = TRUE
         ORDER BY s.symbol ASC`
      );

      return rows.map((r) => {
        const lastPrice = Number(r.last_price);
        const prevClose = Number(r.previous_close) || Number(r.base_price);
        const changePct = prevClose > 0 ? Number((((lastPrice - prevClose) / prevClose) * 100).toFixed(2)) : 0;
        const book = this.matchingEngine.getBook(r.symbol);

        return {
          id: r.id,
          symbol: r.symbol,
          name: r.name,
          sector: r.sector,
          tick_size: Number(r.tick_size),
          lot_size: Number(r.lot_size),
          last_price: lastPrice,
          previous_close: prevClose,
          change_pct: changePct,
          high_24h: Number(r.high_24h),
          low_24h: Number(r.low_24h),
          volume_24h: Number(r.volume_24h),
          best_bid: book.getBestBid()?.price ?? null,
          best_ask: book.getBestAsk()?.price ?? null,
          last_trade_at: r.last_trade_at
        };
      });
    }

    // Fallback to in-memory stocks (test mode)
    const list = [];
    for (const [symbol, stock] of this.matchingEngine.stocks.entries()) {
      const mState = this.matchingEngine.marketState.get(symbol);
      const book = this.matchingEngine.getBook(symbol);
      const lastPrice = mState?.lastPrice ?? stock.basePrice;
      const prevClose = mState?.previousClose ?? stock.basePrice;
      const changePct = prevClose > 0 ? Number((((lastPrice - prevClose) / prevClose) * 100).toFixed(2)) : 0;

      list.push({
        id: stock.id,
        symbol,
        name: stock.name,
        sector: stock.sector,
        tick_size: stock.tickSize,
        lot_size: stock.lotSize,
        last_price: lastPrice,
        previous_close: prevClose,
        change_pct: changePct,
        high_24h: mState?.high24h ?? lastPrice,
        low_24h: mState?.low24h ?? lastPrice,
        volume_24h: mState?.volume24h ?? 0,
        best_bid: book.getBestBid()?.price ?? null,
        best_ask: book.getBestAsk()?.price ?? null,
        last_trade_at: mState?.lastTradeAt ?? null
      });
    }
    return list;
  }

  /**
   * GET /api/market/:symbol
   */
  async getStockStats(symbol) {
    const cleanSymbol = symbol.toUpperCase();

    if (this.db) {
      const { rows } = await this.db.query(
        `SELECT s.id, s.symbol, s.name, s.sector, s.tick_size, s.lot_size,
                s.base_price, s.shares_outstanding,
                COALESCE(m.last_price, s.base_price) AS last_price,
                COALESCE(m.previous_close, s.base_price) AS previous_close,
                COALESCE(m.high_24h, s.base_price) AS high_24h,
                COALESCE(m.low_24h, s.base_price) AS low_24h,
                COALESCE(m.volume_24h, 0) AS volume_24h,
                m.last_trade_at
         FROM stocks s
         LEFT JOIN market_state m ON m.stock_id = s.id
         WHERE s.symbol = $1 AND s.is_active = TRUE`,
        [cleanSymbol]
      );

      if (rows.length === 0) {
        const err = new Error(`Stock ${cleanSymbol} not found`);
        err.statusCode = 404;
        err.code = 'STOCK_NOT_FOUND';
        throw err;
      }

      const r = rows[0];
      const lastPrice = Number(r.last_price);
      const prevClose = Number(r.previous_close) || Number(r.base_price);
      const changePct = prevClose > 0 ? Number((((lastPrice - prevClose) / prevClose) * 100).toFixed(2)) : 0;
      const book = this.matchingEngine.getBook(cleanSymbol);

      return {
        id: r.id,
        symbol: r.symbol,
        name: r.name,
        sector: r.sector,
        tick_size: Number(r.tick_size),
        lot_size: Number(r.lot_size),
        shares_outstanding: Number(r.shares_outstanding),
        last_price: lastPrice,
        previous_close: prevClose,
        change_pct: changePct,
        high_24h: Number(r.high_24h),
        low_24h: Number(r.low_24h),
        volume_24h: Number(r.volume_24h),
        best_bid: book.getBestBid()?.price ?? null,
        best_ask: book.getBestAsk()?.price ?? null,
        last_trade_at: r.last_trade_at
      };
    }

    const stock = this.matchingEngine.stocks.get(cleanSymbol);
    if (!stock) {
      const err = new Error(`Stock ${cleanSymbol} not found`);
      err.statusCode = 404;
      err.code = 'STOCK_NOT_FOUND';
      throw err;
    }

    const mState = this.matchingEngine.marketState.get(cleanSymbol);
    const book = this.matchingEngine.getBook(cleanSymbol);
    const lastPrice = mState?.lastPrice ?? stock.basePrice;
    const prevClose = mState?.previousClose ?? stock.basePrice;

    return {
      id: stock.id,
      symbol: cleanSymbol,
      name: stock.name,
      sector: stock.sector,
      tick_size: stock.tickSize,
      lot_size: stock.lotSize,
      last_price: lastPrice,
      previous_close: prevClose,
      change_pct: prevClose > 0 ? Number((((lastPrice - prevClose) / prevClose) * 100).toFixed(2)) : 0,
      high_24h: mState?.high24h ?? lastPrice,
      low_24h: mState?.low24h ?? lastPrice,
      volume_24h: mState?.volume24h ?? 0,
      best_bid: book.getBestBid()?.price ?? null,
      best_ask: book.getBestAsk()?.price ?? null,
      last_trade_at: mState?.lastTradeAt ?? null
    };
  }

  /**
   * GET /api/market/:symbol/orderbook
   */
  async getOrderBook(symbol, depth = 20) {
    const cleanSymbol = symbol.toUpperCase();
    // Verify stock exists
    await this.getStockStats(cleanSymbol);
    const book = this.matchingEngine.getBook(cleanSymbol);
    return book.getSnapshot(depth);
  }

  /**
   * GET /api/market/:symbol/trades
   */
  async getRecentTrades(symbol, limit = 50) {
    const cleanSymbol = symbol.toUpperCase();
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));

    if (this.db) {
      const { rows } = await this.db.query(
        `SELECT id, symbol, price, quantity, total_amount,
                maker_order_id, taker_order_id, executed_at
         FROM trades
         WHERE symbol = $1
         ORDER BY executed_at DESC
         LIMIT $2`,
        [cleanSymbol, safeLimit]
      );

      return rows.map((t) => ({
        id: t.id,
        symbol: t.symbol,
        price: Number(t.price),
        quantity: Number(t.quantity),
        total_amount: Number(t.total_amount),
        maker_order_id: t.maker_order_id,
        taker_order_id: t.taker_order_id,
        executed_at: t.executed_at
      }));
    }

    return this.matchingEngine.trades
      .filter((t) => t.symbol === cleanSymbol)
      .slice(-safeLimit)
      .reverse();
  }

  /**
   * Full market snapshot for Socket.IO `market:snapshot` event
   */
  async getSnapshot(symbol, depth = 20, tradesLimit = 25) {
    const cleanSymbol = symbol.toUpperCase();
    const [ticker, orderbook, trades] = await Promise.all([
      this.getStockStats(cleanSymbol),
      this.getOrderBook(cleanSymbol, depth),
      this.getRecentTrades(cleanSymbol, tradesLimit)
    ]);

    return {
      symbol: cleanSymbol,
      ticker,
      orderbook,
      trades,
      timestamp: new Date().toISOString()
    };
  }
}

export default MarketService;

