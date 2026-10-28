import { createOrderSchema } from './trading-schema.js';

export class TradingService {
  constructor({ db = null, matchingEngine, outboxWorker = null, logger = console }) {
    this.db = db;
    this.matchingEngine = matchingEngine;
    this.outboxWorker = outboxWorker;
    this.logger = logger;

    // Per-symbol async mutex queues to serialize concurrent operations cleanly
    this.symbolQueues = new Map();
  }

  /**
   * Serialize execution per stock symbol within the server instance
   */
  async withSymbolLock(symbol, task) {
    const key = String(symbol || 'GLOBAL').toUpperCase();
    const prev = this.symbolQueues.get(key) || Promise.resolve();

    let release;
    const next = new Promise((resolve) => {
      release = resolve;
    });
    this.symbolQueues.set(key, prev.then(() => next));

    await prev;
    try {
      return await task();
    } finally {
      release();
    }
  }

  /**
   * Place a new LIMIT or MARKET order atomically.
   * Player identity is strictly taken from authenticated session (never from payload).
   */
  async placeOrder(playerId, rawPayload) {
    const parsed = createOrderSchema.safeParse(rawPayload);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const err = new Error(firstIssue?.message || 'Invalid order payload');
      err.code = 'VALIDATION_ERROR';
      err.statusCode = 400;
      err.details = parsed.error.flatten().fieldErrors;
      throw err;
    }

    const { symbol, side, type, price, quantity, idempotencyKey } = parsed.data;

    return this.withSymbolLock(symbol, async () => {
      if (this.db) {
        try {
          const { rows } = await this.db.query(
            `SELECT fn_execute_order_atomic(
              $1::uuid,
              $2::text,
              $3::text,
              $4::text,
              $5::bigint,
              $6::bigint,
              $7::text
            ) AS result`,
            [
              playerId,
              symbol,
              side,
              type,
              type === 'LIMIT' ? price : null,
              quantity,
              idempotencyKey
            ]
          );

          const dbResult = rows[0]?.result;
          if (!dbResult) {
            throw new Error('Empty response from atomic order execution');
          }

          if (!dbResult.idempotent_replay) {
            this.matchingEngine.synchronizeFromDatabaseResult(symbol, dbResult);
            if (this.outboxWorker) {
              this.outboxWorker.nudge();
            }
          }

          return {
            idempotentReplay: Boolean(dbResult.idempotent_replay),
            order: this.normalizeOrderRecord(dbResult.order),
            trades: (dbResult.trades || []).map((t) => this.normalizeTradeRecord(t))
          };
        } catch (dbErr) {
          throw this.mapDatabaseError(dbErr);
        }
      }

      // In-memory execution fallback (when running unit/concurrency tests without PG)
      const result = this.matchingEngine.placeOrder({
        playerId,
        symbol,
        side,
        type,
        price: type === 'LIMIT' ? price : null,
        quantity,
        idempotencyKey
      });

      if (!result.idempotentReplay && this.outboxWorker) {
        for (const trade of result.trades) {
          this.outboxWorker.enqueueInMemory({
            aggregate_type: 'TRADE',
            aggregate_id: trade.id,
            event_type: 'market:trade',
            payload: trade
          });
        }
        for (const maker of result.updatedMakerOrders) {
          this.outboxWorker.enqueueInMemory({
            aggregate_type: 'ORDER',
            aggregate_id: maker.id,
            event_type: 'order:updated',
            payload: maker
          });
        }
        this.outboxWorker.enqueueInMemory({
          aggregate_type: 'ORDER',
          aggregate_id: result.order.id,
          event_type: 'order:updated',
          payload: result.order
        });
        this.outboxWorker.enqueueInMemory({
          aggregate_type: 'MARKET',
          aggregate_id: symbol,
          event_type: 'market:book_update',
          payload: { symbol, trigger_order_id: result.order.id, timestamp: new Date().toISOString() }
        });
        if (result.trades.length > 0 && result.marketState) {
          this.outboxWorker.enqueueInMemory({
            aggregate_type: 'MARKET',
            aggregate_id: symbol,
            event_type: 'market:ticker',
            payload: result.marketState
          });
        }
        this.outboxWorker.nudge();
      }

      return {
        idempotentReplay: result.idempotentReplay,
        order: this.normalizeOrderRecord(result.order),
        trades: result.trades.map((t) => this.normalizeTradeRecord(t))
      };
    });
  }

  /**
   * Cancel an active order atomically and release locked funds or shares.
   */
  async cancelOrder(playerId, orderId) {
    let symbolLockKey = 'GLOBAL';

    if (this.db) {
      const { rows: lookup } = await this.db.query(
        'SELECT symbol FROM orders WHERE id = $1',
        [orderId]
      );
      if (lookup[0]?.symbol) {
        symbolLockKey = lookup[0].symbol;
      }
    } else {
      const existing = this.matchingEngine.ordersById.get(String(orderId));
      if (existing?.symbol) {
        symbolLockKey = existing.symbol;
      }
    }

    return this.withSymbolLock(symbolLockKey, async () => {
      if (this.db) {
        try {
          const { rows } = await this.db.query(
            'SELECT fn_cancel_order_atomic($1::uuid, $2::uuid) AS result',
            [orderId, playerId]
          );

          const dbResult = rows[0]?.result;
          const cancelledOrder = dbResult.order;
          const book = this.matchingEngine.getBook(cancelledOrder.symbol);
          book.removeOrder(cancelledOrder.id);

          if (this.outboxWorker) {
            this.outboxWorker.nudge();
          }

          return {
            order: this.normalizeOrderRecord(cancelledOrder),
            unlockedFunds: Number(dbResult.unlocked_funds || 0),
            unlockedShares: Number(dbResult.unlocked_shares || 0)
          };
        } catch (dbErr) {
          throw this.mapDatabaseError(dbErr);
        }
      }

      const result = this.matchingEngine.cancelOrder(orderId, playerId);
      if (this.outboxWorker) {
        this.outboxWorker.enqueueInMemory({
          aggregate_type: 'ORDER',
          aggregate_id: result.order.id,
          event_type: 'order:updated',
          payload: result.order
        });
        this.outboxWorker.enqueueInMemory({
          aggregate_type: 'MARKET',
          aggregate_id: result.order.symbol,
          event_type: 'market:book_update',
          payload: { symbol: result.order.symbol, trigger_order_id: result.order.id, timestamp: new Date().toISOString() }
        });
        this.outboxWorker.nudge();
      }

      return {
        order: this.normalizeOrderRecord(result.order),
        unlockedFunds: result.unlockedFunds,
        unlockedShares: result.unlockedShares
      };
    });
  }

  /**
   * GET /api/orders/me
   */
  async getPlayerOrders(playerId, { symbol, status, limit = 50 } = {}) {
    if (this.db) {
      const params = [playerId];
      const conditions = ['player_id = $1'];

      if (symbol) {
        params.push(symbol.toUpperCase());
        conditions.push(`symbol = $${params.length}`);
      }

      if (status) {
        if (status === 'ACTIVE') {
          conditions.push(`status IN ('OPEN', 'PARTIALLY_FILLED')`);
        } else {
          params.push(status);
          conditions.push(`status = $${params.length}`);
        }
      }

      params.push(Math.min(200, Math.max(1, Number(limit) || 50)));

      const { rows } = await this.db.query(
        `SELECT id, player_id, stock_id, symbol, side, type, price,
                quantity, filled_quantity, remaining_quantity,
                locked_funds, status, idempotency_key, created_at, updated_at
         FROM orders
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT $${params.length}`,
        params
      );

      return rows.map((r) => this.normalizeOrderRecord(r));
    }

    const allOrders = Array.from(this.matchingEngine.ordersById.values())
      .filter((o) => o.playerId === playerId)
      .filter((o) => (!symbol ? true : o.symbol === symbol.toUpperCase()))
      .filter((o) => {
        if (!status) return true;
        if (status === 'ACTIVE') return ['OPEN', 'PARTIALLY_FILLED'].includes(o.status);
        return o.status === status;
      })
      .reverse()
      .slice(0, limit);

    return allOrders.map((o) => this.normalizeOrderRecord(o));
  }

  normalizeOrderRecord(o) {
    if (!o) return null;
    return {
      id: o.id,
      player_id: o.player_id ?? o.playerId,
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      price: o.price !== null && o.price !== undefined ? Number(o.price) : null,
      quantity: Number(o.quantity),
      filled_quantity: Number(o.filled_quantity ?? o.filledQuantity ?? 0),
      remaining_quantity: Number(o.remaining_quantity ?? o.remainingQuantity ?? 0),
      locked_funds: Number(o.locked_funds ?? o.lockedFunds ?? 0),
      status: o.status,
      idempotency_key: o.idempotency_key ?? o.idempotencyKey,
      created_at: o.created_at ?? o.createdAt,
      updated_at: o.updated_at ?? o.updatedAt
    };
  }

  normalizeTradeRecord(t) {
    if (!t) return null;
    const price = Number(t.price);
    const quantity = Number(t.quantity);
    return {
      id: t.id,
      symbol: t.symbol,
      maker_order_id: t.maker_order_id ?? t.makerOrderId,
      taker_order_id: t.taker_order_id ?? t.takerOrderId,
      buyer_id: t.buyer_id ?? t.buyerId,
      seller_id: t.seller_id ?? t.sellerId,
      price,
      quantity,
      total_amount: Number(t.total_amount ?? t.totalAmount ?? price * quantity),
      executed_at: t.executed_at ?? t.executedAt
    };
  }

  mapDatabaseError(dbErr) {
    const msg = dbErr?.message || 'Database transaction error';
    const match = msg.match(/^([A-Z_]+):\s*(.+)$/);
    const code = match ? match[1] : dbErr.code || 'TRANSACTION_ERROR';
    const cleanMessage = match ? match[2] : msg;

    const statusMap = {
      INVALID_QUANTITY: 400,
      INVALID_SIDE: 400,
      INVALID_TYPE: 400,
      INVALID_PRICE: 400,
      INVALID_TICK_SIZE: 400,
      INVALID_LOT_SIZE: 400,
      INVALID_IDEMPOTENCY_KEY: 400,
      STOCK_NOT_FOUND: 404,
      ACCOUNT_NOT_FOUND: 404,
      ORDER_NOT_FOUND: 404,
      FORBIDDEN: 403,
      ORDER_NOT_ACTIVE: 409,
      INSUFFICIENT_FUNDS: 422,
      INSUFFICIENT_SHARES: 422,
      INSUFFICIENT_LIQUIDITY: 422
    };

    const err = new Error(cleanMessage);
    err.code = code;
    err.statusCode = statusMap[code] || 500;
    return err;
  }
}

export default TradingService;

