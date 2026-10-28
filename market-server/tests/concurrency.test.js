import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { MatchingEngine } from '../src/modules/market/matching-engine.js';
import { TradingService } from '../src/modules/trading/trading-service.js';

describe('Concurrency & Order Book Recovery', () => {
  it('serializes concurrent orders on the same stock without overselling liquidity or corrupting balances', async () => {
    const matchingEngine = new MatchingEngine();
    matchingEngine.registerStock({
      symbol: 'NVDA',
      name: 'NVIDIA Corp.',
      sector: 'Technology',
      tickSize: 1,
      lotSize: 1,
      basePrice: 85000
    });

    const sellerId = crypto.randomUUID();
    matchingEngine.setAccount(sellerId, { availableBalance: 0, lockedBalance: 0 });
    matchingEngine.setPosition(sellerId, 'NVDA', {
      availableQuantity: 100,
      lockedQuantity: 0,
      avgBuyPrice: 80000
    });

    const tradingService = new TradingService({
      db: null,
      matchingEngine
    });

    // Seller places 100 shares on the ask book @ 85000
    await tradingService.placeOrder(sellerId, {
      symbol: 'NVDA',
      side: 'SELL',
      type: 'LIMIT',
      price: 85000,
      quantity: 100,
      idempotencyKey: 'seller-nvda-100'
    });

    // 10 buyers simultaneously try to MARKET BUY 20 shares each (total demand = 200 shares, supply = 100 shares)
    const buyers = Array.from({ length: 10 }, () => {
      const id = crypto.randomUUID();
      matchingEngine.setAccount(id, { availableBalance: 2000000, lockedBalance: 0 });
      return id;
    });

    const results = await Promise.allSettled(
      buyers.map((buyerId, idx) =>
        tradingService.placeOrder(buyerId, {
          symbol: 'NVDA',
          side: 'BUY',
          type: 'MARKET',
          quantity: 20,
          idempotencyKey: `concurrent-buyer-${idx}-${buyerId}`
        })
      )
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly 5 buyers should succeed (5 * 20 = 100 shares) and 5 should be rejected for insufficient liquidity
    expect(fulfilled).toHaveLength(5);
    expect(rejected).toHaveLength(5);

    // Total shares across all buyers + seller must equal 100
    const totalBuyerShares = buyers.reduce(
      (sum, id) => sum + matchingEngine.getPosition(id, 'NVDA').availableQuantity,
      0
    );
    const sellerPos = matchingEngine.getPosition(sellerId, 'NVDA');

    expect(totalBuyerShares).toBe(100);
    expect(sellerPos.availableQuantity).toBe(0);
    expect(sellerPos.lockedQuantity).toBe(0);
  });

  it('rebuilds in-memory OrderBook accurately from persisted active orders on server restart', () => {
    const matchingEngine = new MatchingEngine();
    matchingEngine.registerStock({
      symbol: 'MSFT',
      name: 'Microsoft',
      tickSize: 1,
      lotSize: 1,
      basePrice: 42000
    });

    const book = matchingEngine.getBook('MSFT');
    book.rebuildFromOrders([
      {
        id: crypto.randomUUID(),
        player_id: crypto.randomUUID(),
        symbol: 'MSFT',
        side: 'BUY',
        type: 'LIMIT',
        price: 41900,
        quantity: 50,
        filled_quantity: 10,
        remaining_quantity: 40,
        locked_funds: 40 * 41900,
        status: 'PARTIALLY_FILLED',
        seq_no: 1
      },
      {
        id: crypto.randomUUID(),
        player_id: crypto.randomUUID(),
        symbol: 'MSFT',
        side: 'SELL',
        type: 'LIMIT',
        price: 42100,
        quantity: 30,
        filled_quantity: 0,
        remaining_quantity: 30,
        locked_funds: 0,
        status: 'OPEN',
        seq_no: 2
      }
    ]);

    const snapshot = book.getSnapshot();
    expect(snapshot.bestBid).toBe(41900);
    expect(snapshot.bestAsk).toBe(42100);
    expect(snapshot.bids[0].quantity).toBe(40);
    expect(snapshot.asks[0].quantity).toBe(30);
  });
});

