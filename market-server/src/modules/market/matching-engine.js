import crypto from 'node:crypto';
import { OrderBook } from './orderbook.js';

/**
 * MatchingEngine.js
 * Authoritative Continuous Limit Order Book Matching Engine.
 *
 * Supports:
 * 1. Limit Buy & Limit Sell (with price improvement refund on Limit Buy)
 * 2. Market Buy & Market Sell (strict liquidity & balance validation)
 * 3. Partial fills (PARTIALLY_FILLED)
 * 4. Order cancellation (unlocks remaining locked funds/shares)
 * 5. Price-Time Priority (FIFO per price level)
 * 6. Account balance & asset position locking/settlement + immutable ledger generation
 * 7. Idempotency key deduplication & self-trade prevention
 */
export class MatchingEngine {
  constructor({ preventSelfTrade = true } = {}) {
    this.books = new Map();       // symbol -> OrderBook
    this.stocks = new Map();      // symbol -> stock config
    this.marketState = new Map(); // symbol -> { lastPrice, previousClose, high24h, low24h, volume24h, lastTradeAt }
    this.accounts = new Map();    // playerId -> { availableBalance, lockedBalance }
    this.positions = new Map();   // `${playerId}:${symbol}` -> { availableQuantity, lockedQuantity, avgBuyPrice, totalInvested }
    this.ordersById = new Map();  // orderId -> order
    this.idempotencyMap = new Map(); // `${playerId}:${idempotencyKey}` -> execution result
    this.ledger = [];             // Immutable in-memory audit log
    this.trades = [];             // Executed trades
    this.preventSelfTrade = preventSelfTrade;
    this.seqCounter = 0;
  }

  /**
   * Register a tradable stock and initialize its order book & market state
   */
  registerStock({
    id = crypto.randomUUID(),
    symbol,
    name = symbol,
    sector = 'General',
    tickSize = 1,
    lotSize = 1,
    basePrice = 1000
  }) {
    const cleanSymbol = symbol.toUpperCase();
    const stock = {
      id,
      symbol: cleanSymbol,
      name,
      sector,
      tickSize: Number(tickSize),
      lotSize: Number(lotSize),
      basePrice: Number(basePrice)
    };

    this.stocks.set(cleanSymbol, stock);

    if (!this.books.has(cleanSymbol)) {
      this.books.set(cleanSymbol, new OrderBook(cleanSymbol, {
        tickSize: stock.tickSize,
        lotSize: stock.lotSize
      }));
    }

    if (!this.marketState.has(cleanSymbol)) {
      this.marketState.set(cleanSymbol, {
        symbol: cleanSymbol,
        lastPrice: stock.basePrice,
        previousClose: stock.basePrice,
        high24h: stock.basePrice,
        low24h: stock.basePrice,
        volume24h: 0,
        lastTradeAt: null
      });
    }

    return stock;
  }

  getBook(symbol) {
    const cleanSymbol = symbol.toUpperCase();
    let book = this.books.get(cleanSymbol);
    if (!book) {
      const stock = this.stocks.get(cleanSymbol);
      book = new OrderBook(cleanSymbol, {
        tickSize: stock?.tickSize || 1,
        lotSize: stock?.lotSize || 1
      });
      this.books.set(cleanSymbol, book);
    }
    return book;
  }

  /**
   * Provision or update a player's cash account (used in standalone/test mode)
   */
  setAccount(playerId, { availableBalance = 0, lockedBalance = 0 } = {}) {
    if (availableBalance < 0 || lockedBalance < 0) {
      throw new Error('Account balances cannot be negative');
    }
    const acc = {
      playerId,
      availableBalance: Number(availableBalance),
      lockedBalance: Number(lockedBalance)
    };
    this.accounts.set(playerId, acc);
    return { ...acc };
  }

  getAccount(playerId) {
    return this.accounts.get(playerId) || null;
  }

  /**
   * Provision or update a player's stock position (used in standalone/test mode)
   */
  setPosition(playerId, symbol, { availableQuantity = 0, lockedQuantity = 0, avgBuyPrice = 0 } = {}) {
    if (availableQuantity < 0 || lockedQuantity < 0) {
      throw new Error('Position quantities cannot be negative');
    }
    const cleanSymbol = symbol.toUpperCase();
    const key = `${playerId}:${cleanSymbol}`;
    const totalQty = Number(availableQuantity) + Number(lockedQuantity);
    const pos = {
      playerId,
      symbol: cleanSymbol,
      availableQuantity: Number(availableQuantity),
      lockedQuantity: Number(lockedQuantity),
      avgBuyPrice: Number(avgBuyPrice),
      totalInvested: totalQty * Number(avgBuyPrice)
    };
    this.positions.set(key, pos);
    return { ...pos };
  }

  getPosition(playerId, symbol) {
    const key = `${playerId}:${symbol.toUpperCase()}`;
    return (
      this.positions.get(key) || {
        playerId,
        symbol: symbol.toUpperCase(),
        availableQuantity: 0,
        lockedQuantity: 0,
        avgBuyPrice: 0,
        totalInvested: 0
      }
    );
  }

  recordLedger(entry) {
    const record = Object.freeze({
      id: crypto.randomUUID(),
      ...entry,
      createdAt: new Date().toISOString()
    });
    this.ledger.push(record);
    return record;
  }

  /**
   * Process and match an incoming order deterministically with Price-Time Priority.
   */
  placeOrder({
    id = crypto.randomUUID(),
    playerId,
    symbol,
    side,
    type = 'LIMIT',
    price = null,
    quantity,
    idempotencyKey
  }) {
    if (!playerId) {
      throw this.createError('UNAUTHORIZED', 'playerId is required', 401);
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      throw this.createError('INVALID_IDEMPOTENCY_KEY', 'idempotencyKey is required', 400);
    }

    const idemKey = `${playerId}:${idempotencyKey}`;
    if (this.idempotencyMap.has(idemKey)) {
      const previous = this.idempotencyMap.get(idemKey);
      return {
        ...previous,
        idempotentReplay: true
      };
    }

    const cleanSymbol = String(symbol || '').toUpperCase();
    const stock = this.stocks.get(cleanSymbol);
    if (!stock) {
      throw this.createError('STOCK_NOT_FOUND', `Stock ${cleanSymbol} not found`, 404);
    }

    const cleanSide = String(side || '').toUpperCase();
    if (!['BUY', 'SELL'].includes(cleanSide)) {
      throw this.createError('INVALID_SIDE', 'Order side must be BUY or SELL', 400);
    }

    const cleanType = String(type || '').toUpperCase();
    if (!['LIMIT', 'MARKET'].includes(cleanType)) {
      throw this.createError('INVALID_TYPE', 'Order type must be LIMIT or MARKET', 400);
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw this.createError('INVALID_QUANTITY', 'Order quantity must be a positive integer', 400);
    }
    if (qty % stock.lotSize !== 0) {
      throw this.createError('INVALID_LOT_SIZE', `Quantity must be a multiple of lot size ${stock.lotSize}`, 400);
    }

    let orderPrice = null;
    if (cleanType === 'LIMIT') {
      orderPrice = Number(price);
      if (!Number.isInteger(orderPrice) || orderPrice <= 0) {
        throw this.createError('INVALID_PRICE', 'Limit order price must be a positive integer', 400);
      }
      if (orderPrice % stock.tickSize !== 0) {
        throw this.createError('INVALID_TICK_SIZE', `Price ${orderPrice} does not match tick size ${stock.tickSize}`, 400);
      }
    }

    const account = this.accounts.get(playerId);
    if (!account) {
      throw this.createError('ACCOUNT_NOT_FOUND', `Account ${playerId} not found`, 404);
    }

    const book = this.getBook(cleanSymbol);
    const posKey = `${playerId}:${cleanSymbol}`;
    let takerPos = this.positions.get(posKey) || {
      playerId,
      symbol: cleanSymbol,
      availableQuantity: 0,
      lockedQuantity: 0,
      avgBuyPrice: 0,
      totalInvested: 0
    };

    // Pre-validate liquidity & lock funds/shares
    let lockedFunds = 0;

    if (cleanSide === 'BUY') {
      if (cleanType === 'LIMIT') {
        lockedFunds = orderPrice * qty;
      } else {
        // Market Buy: compute exact fill cost across available asks
        let remSim = qty;
        let simCost = 0;
        let availLiquidity = 0;

        for (const ask of book.asks) {
          if (this.preventSelfTrade && ask.playerId === playerId) continue;
          if (remSim <= 0) break;
          const take = Math.min(remSim, ask.remainingQuantity);
          availLiquidity += take;
          simCost += take * ask.price;
          remSim -= take;
        }

        if (availLiquidity < qty) {
          throw this.createError(
            'INSUFFICIENT_LIQUIDITY',
            `Market BUY requires ${qty} shares, only ${availLiquidity} available`,
            422
          );
        }
        lockedFunds = simCost;
      }

      if (account.availableBalance < lockedFunds) {
        throw this.createError(
          'INSUFFICIENT_FUNDS',
          `Insufficient available balance: required ${lockedFunds}, available ${account.availableBalance}`,
          422
        );
      }

      account.availableBalance -= lockedFunds;
      account.lockedBalance += lockedFunds;
      this.recordLedger({
        playerId,
        assetType: 'CASH',
        entryType: 'ORDER_LOCK',
        deltaAvailable: -lockedFunds,
        deltaLocked: lockedFunds,
        balanceAvailableAfter: account.availableBalance,
        balanceLockedAfter: account.lockedBalance,
        referenceType: 'ORDER',
        referenceId: id
      });
    } else {
      // SELL order
      if (takerPos.availableQuantity < qty) {
        throw this.createError(
          'INSUFFICIENT_SHARES',
          `Insufficient shares of ${cleanSymbol}: required ${qty}, available ${takerPos.availableQuantity}`,
          422
        );
      }

      if (cleanType === 'MARKET') {
        const { totalQuantity } = book.getAvailableLiquidity('BUY', {
          excludePlayerId: this.preventSelfTrade ? playerId : null
        });
        if (totalQuantity < qty) {
          throw this.createError(
            'INSUFFICIENT_LIQUIDITY',
            `Market SELL requires ${qty} shares, only ${totalQuantity} bid liquidity available`,
            422
          );
        }
      }

      takerPos.availableQuantity -= qty;
      takerPos.lockedQuantity += qty;
      this.positions.set(posKey, takerPos);

      this.recordLedger({
        playerId,
        assetType: cleanSymbol,
        entryType: 'ORDER_LOCK',
        deltaAvailable: -qty,
        deltaLocked: qty,
        balanceAvailableAfter: takerPos.availableQuantity,
        balanceLockedAfter: takerPos.lockedQuantity,
        referenceType: 'ORDER',
        referenceId: id
      });
    }

    const seqNo = ++this.seqCounter;
    const takerOrder = {
      id,
      playerId,
      symbol: cleanSymbol,
      side: cleanSide,
      type: cleanType,
      price: orderPrice,
      quantity: qty,
      filledQuantity: 0,
      remainingQuantity: qty,
      lockedFunds,
      status: 'OPEN',
      idempotencyKey,
      seqNo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const executedTrades = [];
    const updatedMakerOrders = [];

    // Continuous Matching Loop
    const oppositeBook = cleanSide === 'BUY' ? book.asks : book.bids;
    let i = 0;

    while (takerOrder.remainingQuantity > 0 && i < oppositeBook.length) {
      const makerOrder = oppositeBook[i];

      if (this.preventSelfTrade && makerOrder.playerId === playerId) {
        i++;
        continue;
      }

      // Check price crossing for LIMIT orders
      if (cleanType === 'LIMIT') {
        if (cleanSide === 'BUY' && makerOrder.price > takerOrder.price) break;
        if (cleanSide === 'SELL' && makerOrder.price < takerOrder.price) break;
      }

      const matchQty = Math.min(takerOrder.remainingQuantity, makerOrder.remainingQuantity);
      const execPrice = makerOrder.price; // Execution always occurs at Maker's price
      const tradeCost = matchQty * execPrice;

      const buyerId = cleanSide === 'BUY' ? playerId : makerOrder.playerId;
      const sellerId = cleanSide === 'SELL' ? playerId : makerOrder.playerId;

      const buyerAccount = this.accounts.get(buyerId);
      const sellerAccount = this.accounts.get(sellerId);

      const buyerPosKey = `${buyerId}:${cleanSymbol}`;
      const sellerPosKey = `${sellerId}:${cleanSymbol}`;

      const buyerPos = this.positions.get(buyerPosKey) || {
        playerId: buyerId,
        symbol: cleanSymbol,
        availableQuantity: 0,
        lockedQuantity: 0,
        avgBuyPrice: 0,
        totalInvested: 0
      };
      const sellerPos = this.positions.get(sellerPosKey);

      // Calculate Price Improvement Refund if Taker is a LIMIT BUY
      let priceImprovementRefund = 0;
      if (cleanSide === 'BUY' && cleanType === 'LIMIT' && takerOrder.price > execPrice) {
        priceImprovementRefund = (takerOrder.price - execPrice) * matchQty;
      }

      // 1. Settle Buyer Cash
      buyerAccount.lockedBalance -= (tradeCost + priceImprovementRefund);
      buyerAccount.availableBalance += priceImprovementRefund;
      if (cleanSide === 'BUY') {
        takerOrder.lockedFunds -= (tradeCost + priceImprovementRefund);
      } else {
        makerOrder.lockedFunds -= tradeCost;
      }

      // 2. Settle Seller Cash
      sellerAccount.availableBalance += tradeCost;

      // 3. Settle Seller Position (deduct locked shares)
      const sellerRemainingTotal = (sellerPos.availableQuantity + sellerPos.lockedQuantity) - matchQty;
      sellerPos.lockedQuantity -= matchQty;
      if (sellerRemainingTotal <= 0) {
        sellerPos.totalInvested = 0;
        sellerPos.avgBuyPrice = 0;
      } else {
        sellerPos.totalInvested = Math.max(0, sellerPos.totalInvested - (sellerPos.avgBuyPrice * matchQty));
      }
      this.positions.set(sellerPosKey, sellerPos);

      // 4. Settle Buyer Position (credit available shares)
      const newBuyerTotalShares = buyerPos.availableQuantity + buyerPos.lockedQuantity + matchQty;
      const newBuyerTotalInvested = buyerPos.totalInvested + tradeCost;
      buyerPos.availableQuantity += matchQty;
      buyerPos.totalInvested = newBuyerTotalInvested;
      buyerPos.avgBuyPrice = Math.floor(newBuyerTotalInvested / newBuyerTotalShares);
      this.positions.set(buyerPosKey, buyerPos);

      // 5. Update Maker & Taker Order quantities
      makerOrder.filledQuantity += matchQty;
      makerOrder.remainingQuantity -= matchQty;
      makerOrder.status = makerOrder.remainingQuantity === 0 ? 'FILLED' : 'PARTIALLY_FILLED';
      makerOrder.updatedAt = new Date().toISOString();

      takerOrder.filledQuantity += matchQty;
      takerOrder.remainingQuantity -= matchQty;
      takerOrder.updatedAt = new Date().toISOString();

      const trade = {
        id: crypto.randomUUID(),
        symbol: cleanSymbol,
        makerOrderId: makerOrder.id,
        takerOrderId: takerOrder.id,
        buyerId,
        sellerId,
        price: execPrice,
        quantity: matchQty,
        totalAmount: tradeCost,
        takerSide: cleanSide,
        executedAt: new Date().toISOString()
      };

      this.trades.push(trade);
      executedTrades.push(trade);
      updatedMakerOrders.push({ ...makerOrder });
      this.ordersById.set(makerOrder.id, { ...makerOrder });

      // Record Ledger Entries
      this.recordLedger({
        playerId: buyerId,
        assetType: 'CASH',
        entryType: 'TRADE_BUY',
        deltaAvailable: 0,
        deltaLocked: -tradeCost,
        balanceAvailableAfter: buyerAccount.availableBalance - priceImprovementRefund,
        balanceLockedAfter: buyerAccount.lockedBalance + priceImprovementRefund,
        referenceType: 'TRADE',
        referenceId: trade.id
      });

      if (priceImprovementRefund > 0) {
        this.recordLedger({
          playerId: buyerId,
          assetType: 'CASH',
          entryType: 'PRICE_IMPROVEMENT_REFUND',
          deltaAvailable: priceImprovementRefund,
          deltaLocked: -priceImprovementRefund,
          balanceAvailableAfter: buyerAccount.availableBalance,
          balanceLockedAfter: buyerAccount.lockedBalance,
          referenceType: 'TRADE',
          referenceId: trade.id
        });
      }

      this.recordLedger({
        playerId: buyerId,
        assetType: cleanSymbol,
        entryType: 'TRADE_BUY',
        deltaAvailable: matchQty,
        deltaLocked: 0,
        balanceAvailableAfter: buyerPos.availableQuantity,
        balanceLockedAfter: buyerPos.lockedQuantity,
        referenceType: 'TRADE',
        referenceId: trade.id
      });

      this.recordLedger({
        playerId: sellerId,
        assetType: 'CASH',
        entryType: 'TRADE_SELL',
        deltaAvailable: tradeCost,
        deltaLocked: 0,
        balanceAvailableAfter: sellerAccount.availableBalance,
        balanceLockedAfter: sellerAccount.lockedBalance,
        referenceType: 'TRADE',
        referenceId: trade.id
      });

      this.recordLedger({
        playerId: sellerId,
        assetType: cleanSymbol,
        entryType: 'TRADE_SELL',
        deltaAvailable: 0,
        deltaLocked: -matchQty,
        balanceAvailableAfter: sellerPos.availableQuantity,
        balanceLockedAfter: sellerPos.lockedQuantity,
        referenceType: 'TRADE',
        referenceId: trade.id
      });

      // Update Market State
      const mState = this.marketState.get(cleanSymbol);
      if (mState) {
        mState.lastPrice = execPrice;
        mState.high24h = Math.max(mState.high24h, execPrice);
        mState.low24h = Math.min(mState.low24h, execPrice);
        mState.volume24h += matchQty;
        mState.lastTradeAt = trade.executedAt;
      }

      if (makerOrder.remainingQuantity === 0) {
        book.removeOrder(makerOrder.id);
        // Do not increment `i` because element at `i` was removed from `oppositeBook`
      } else {
        i++;
      }
    }

    // Finalize Taker Order Status
    if (takerOrder.remainingQuantity === 0) {
      takerOrder.status = 'FILLED';
    } else if (takerOrder.filledQuantity > 0) {
      takerOrder.status = 'PARTIALLY_FILLED';
    } else {
      takerOrder.status = 'OPEN';
    }

    // If LIMIT order still has remaining quantity, rest it in the OrderBook
    if (cleanType === 'LIMIT' && takerOrder.remainingQuantity > 0) {
      book.addOrder(takerOrder);
    }

    this.ordersById.set(takerOrder.id, { ...takerOrder });

    const result = {
      idempotentReplay: false,
      order: { ...takerOrder },
      trades: executedTrades,
      updatedMakerOrders,
      marketState: { ...this.marketState.get(cleanSymbol) }
    };

    this.idempotencyMap.set(idemKey, result);
    return result;
  }

  /**
   * Cancel an active OPEN or PARTIALLY_FILLED order and unlock remaining funds/shares
   */
  cancelOrder(orderId, playerId) {
    const stored = this.ordersById.get(String(orderId));
    if (!stored) {
      throw this.createError('ORDER_NOT_FOUND', `Order ${orderId} not found`, 404);
    }
    if (stored.playerId !== playerId) {
      throw this.createError('FORBIDDEN', 'Cannot cancel an order owned by another player', 403);
    }
    if (!['OPEN', 'PARTIALLY_FILLED'].includes(stored.status)) {
      throw this.createError('ORDER_NOT_ACTIVE', `Cannot cancel order in status ${stored.status}`, 409);
    }

    const book = this.getBook(stored.symbol);
    const inBook = book.removeOrder(stored.id) || stored;

    let unlockedFunds = 0;
    let unlockedShares = 0;

    if (inBook.side === 'BUY') {
      unlockedFunds = inBook.lockedFunds;
      const account = this.accounts.get(playerId);
      if (account) {
        account.availableBalance += unlockedFunds;
        account.lockedBalance -= unlockedFunds;
        this.recordLedger({
          playerId,
          assetType: 'CASH',
          entryType: 'ORDER_UNLOCK',
          deltaAvailable: unlockedFunds,
          deltaLocked: -unlockedFunds,
          balanceAvailableAfter: account.availableBalance,
          balanceLockedAfter: account.lockedBalance,
          referenceType: 'ORDER',
          referenceId: inBook.id
        });
      }
    } else {
      unlockedShares = inBook.remainingQuantity;
      const posKey = `${playerId}:${inBook.symbol}`;
      const pos = this.positions.get(posKey);
      if (pos) {
        pos.availableQuantity += unlockedShares;
        pos.lockedQuantity -= unlockedShares;
        this.recordLedger({
          playerId,
          assetType: inBook.symbol,
          entryType: 'ORDER_UNLOCK',
          deltaAvailable: unlockedShares,
          deltaLocked: -unlockedShares,
          balanceAvailableAfter: pos.availableQuantity,
          balanceLockedAfter: pos.lockedQuantity,
          referenceType: 'ORDER',
          referenceId: inBook.id
        });
      }
    }

    const cancelledOrder = {
      ...inBook,
      lockedFunds: 0,
      status: 'CANCELLED',
      updatedAt: new Date().toISOString()
    };

    this.ordersById.set(cancelledOrder.id, cancelledOrder);

    return {
      order: cancelledOrder,
      unlockedFunds,
      unlockedShares
    };
  }

  /**
   * Synchronize in-memory OrderBook cache after a committed PostgreSQL atomic transaction
   */
  synchronizeFromDatabaseResult(symbol, dbResult) {
    const book = this.getBook(symbol);

    const updatedMakers = dbResult.updated_maker_orders || dbResult.updatedMakerOrders || [];
    for (const maker of updatedMakers) {
      if (maker.status === 'FILLED' || maker.status === 'CANCELLED' || Number(maker.remaining_quantity ?? maker.remainingQuantity) <= 0) {
        book.removeOrder(maker.id);
      } else {
        book.addOrder(maker);
      }
    }

    const taker = dbResult.order;
    if (taker) {
      if (taker.type === 'LIMIT' && ['OPEN', 'PARTIALLY_FILLED'].includes(taker.status) && Number(taker.remaining_quantity ?? taker.remainingQuantity) > 0) {
        book.addOrder(taker);
      } else {
        book.removeOrder(taker.id);
      }
    }

    if (dbResult.market_state || dbResult.marketState) {
      const ms = dbResult.market_state || dbResult.marketState;
      this.marketState.set(symbol.toUpperCase(), {
        symbol: symbol.toUpperCase(),
        lastPrice: Number(ms.last_price ?? ms.lastPrice),
        previousClose: Number(ms.previous_close ?? ms.previousClose),
        high24h: Number(ms.high_24h ?? ms.high24h),
        low24h: Number(ms.low_24h ?? ms.low24h),
        volume24h: Number(ms.volume_24h ?? ms.volume24h),
        lastTradeAt: ms.last_trade_at ?? ms.lastTradeAt
      });
    }
  }

  createError(code, message, statusCode = 400) {
    const err = new Error(message);
    err.code = code;
    err.statusCode = statusCode;
    return err;
  }
}

export default MatchingEngine;

