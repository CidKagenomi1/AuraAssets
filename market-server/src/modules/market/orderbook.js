/**
 * OrderBook.js
 * Deterministic Continuous Limit Order Book for a single stock symbol.
 * Implements strict Price-Time Priority (FIFO at each price level):
 *   - Bids (BUY): Highest price first, then earliest sequence number / timestamp
 *   - Asks (SELL): Lowest price first, then earliest sequence number / timestamp
 */

export class OrderBook {
  constructor(symbol, { tickSize = 1, lotSize = 1 } = {}) {
    this.symbol = symbol.toUpperCase();
    this.tickSize = Number(tickSize);
    this.lotSize = Number(lotSize);

    // Arrays of resting orders sorted in strict Price-Time priority
    this.bids = [];
    this.asks = [];

    // Fast lookup by orderId -> order reference
    this.orderMap = new Map();
    this.sequenceCounter = 0;
  }

  /**
   * Compare two BUY orders: Higher price has priority; ties broken by lower seqNo
   */
  static compareBids(a, b) {
    if (b.price !== a.price) {
      return b.price - a.price;
    }
    return a.seqNo - b.seqNo;
  }

  /**
   * Compare two SELL orders: Lower price has priority; ties broken by lower seqNo
   */
  static compareAsks(a, b) {
    if (a.price !== b.price) {
      return a.price - b.price;
    }
    return a.seqNo - b.seqNo;
  }

  /**
   * Normalize a resting order into canonical format
   */
  normalizeOrder(rawOrder) {
    const seqNo =
      rawOrder.seqNo ??
      rawOrder.seq_no ??
      ++this.sequenceCounter;

    if (seqNo > this.sequenceCounter) {
      this.sequenceCounter = Number(seqNo);
    }

    const quantity = Number(rawOrder.quantity);
    const filledQuantity = Number(rawOrder.filledQuantity ?? rawOrder.filled_quantity ?? 0);
    const remainingQuantity = Number(
      rawOrder.remainingQuantity ??
      rawOrder.remaining_quantity ??
      quantity - filledQuantity
    );

    return {
      id: String(rawOrder.id),
      playerId: String(rawOrder.playerId ?? rawOrder.player_id),
      symbol: this.symbol,
      side: String(rawOrder.side).toUpperCase(),
      type: String(rawOrder.type || 'LIMIT').toUpperCase(),
      price: rawOrder.price !== null && rawOrder.price !== undefined ? Number(rawOrder.price) : null,
      quantity,
      filledQuantity,
      remainingQuantity,
      lockedFunds: Number(rawOrder.lockedFunds ?? rawOrder.locked_funds ?? 0),
      status: String(rawOrder.status || (filledQuantity > 0 ? 'PARTIALLY_FILLED' : 'OPEN')),
      seqNo: Number(seqNo),
      createdAt: rawOrder.createdAt || rawOrder.created_at || new Date().toISOString()
    };
  }

  /**
   * Add or update a resting LIMIT order on the order book
   */
  addOrder(rawOrder) {
    const order = this.normalizeOrder(rawOrder);

    if (order.type !== 'LIMIT') {
      throw new Error('Only LIMIT orders can rest in the order book');
    }
    if (order.remainingQuantity <= 0) {
      return null;
    }
    if (!['OPEN', 'PARTIALLY_FILLED'].includes(order.status)) {
      return null;
    }

    if (this.orderMap.has(order.id)) {
      this.removeOrder(order.id);
    }

    this.orderMap.set(order.id, order);

    if (order.side === 'BUY') {
      this.bids.push(order);
      this.bids.sort(OrderBook.compareBids);
    } else if (order.side === 'SELL') {
      this.asks.push(order);
      this.asks.sort(OrderBook.compareAsks);
    } else {
      throw new Error(`Invalid order side: ${order.side}`);
    }

    return order;
  }

  /**
   * Remove an order by ID from the book
   */
  removeOrder(orderId) {
    const existing = this.orderMap.get(String(orderId));
    if (!existing) return null;

    this.orderMap.delete(String(orderId));

    if (existing.side === 'BUY') {
      const idx = this.bids.findIndex((o) => o.id === String(orderId));
      if (idx !== -1) this.bids.splice(idx, 1);
    } else {
      const idx = this.asks.findIndex((o) => o.id === String(orderId));
      if (idx !== -1) this.asks.splice(idx, 1);
    }

    return existing;
  }

  /**
   * Get an order by ID
   */
  getOrder(orderId) {
    return this.orderMap.get(String(orderId)) || null;
  }

  /**
   * Best Bid (highest buy price)
   */
  getBestBid() {
    return this.bids.length > 0 ? this.bids[0] : null;
  }

  /**
   * Best Ask (lowest sell price)
   */
  getBestAsk() {
    return this.asks.length > 0 ? this.asks[0] : null;
  }

  /**
   * Calculate available liquidity on one side (optionally excluding a specific playerId for self-trade prevention)
   */
  getAvailableLiquidity(side, { excludePlayerId = null, limitPrice = null } = {}) {
    const list = side === 'BUY' ? this.bids : this.asks;
    let totalQty = 0;
    let totalCost = 0;

    for (const order of list) {
      if (excludePlayerId && order.playerId === excludePlayerId) continue;
      if (limitPrice !== null) {
        if (side === 'SELL' && order.price > limitPrice) break;
        if (side === 'BUY' && order.price < limitPrice) break;
      }
      totalQty += order.remainingQuantity;
      totalCost += order.remainingQuantity * order.price;
    }

    return { totalQuantity: totalQty, totalCost };
  }

  /**
   * Clear and rebuild order book from database active order rows
   */
  rebuildFromOrders(orders = []) {
    this.bids = [];
    this.asks = [];
    this.orderMap.clear();
    this.sequenceCounter = 0;

    for (const row of orders) {
      if (row.type === 'LIMIT' && ['OPEN', 'PARTIALLY_FILLED'].includes(row.status)) {
        this.addOrder(row);
      }
    }
  }

  /**
   * Get aggregated price levels (L2 Order Book Snapshot)
   */
  getSnapshot(depth = 20) {
    const aggregateLevels = (orders) => {
      const levels = [];
      for (const order of orders) {
        const last = levels[levels.length - 1];
        if (last && last.price === order.price) {
          last.quantity += order.remainingQuantity;
          last.orderCount += 1;
        } else {
          if (levels.length >= depth) break;
          levels.push({
            price: order.price,
            quantity: order.remainingQuantity,
            orderCount: 1
          });
        }
      }
      return levels;
    };

    const bestBid = this.getBestBid()?.price ?? null;
    const bestAsk = this.getBestAsk()?.price ?? null;
    const spread = bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;

    return {
      symbol: this.symbol,
      bestBid,
      bestAsk,
      spread,
      bids: aggregateLevels(this.bids),
      asks: aggregateLevels(this.asks),
      timestamp: new Date().toISOString()
    };
  }
}

export default OrderBook;

