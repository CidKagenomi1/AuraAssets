import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { MatchingEngine } from '../src/modules/market/matching-engine.js';
import { TradingService } from '../src/modules/trading/trading-service.js';

describe('TradingService - Idempotency & Validation', () => {
  let matchingEngine;
  let tradingService;
  const buyerId = crypto.randomUUID();
  const sellerId = crypto.randomUUID();

  beforeEach(() => {
    matchingEngine = new MatchingEngine();
    matchingEngine.registerStock({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      sector: 'Technology',
      tickSize: 1,
      lotSize: 1,
      basePrice: 18050
    });

    matchingEngine.setAccount(buyerId, { availableBalance: 5000000, lockedBalance: 0 });
    matchingEngine.setAccount(sellerId, { availableBalance: 5000000, lockedBalance: 0 });
    matchingEngine.setPosition(sellerId, 'AAPL', { availableQuantity: 200, lockedQuantity: 0, avgBuyPrice: 18000 });

    tradingService = new TradingService({
      db: null,
      matchingEngine
    });
  });

  it('prevents duplicate order execution when retrying with the same idempotencyKey', async () => {
    const payload = {
      symbol: 'AAPL',
      side: 'BUY',
      type: 'LIMIT',
      price: 18000,
      quantity: 10,
      idempotencyKey: 'idem-key-retry-test-001'
    };

    const first = await tradingService.placeOrder(buyerId, payload);
    const second = await tradingService.placeOrder(buyerId, payload);

    expect(first.idempotentReplay).toBe(false);
    expect(second.idempotentReplay).toBe(true);
    expect(second.order.id).toBe(first.order.id);

    // Balance was only locked once (10 * 18000 = 180000)
    const buyerAcc = matchingEngine.getAccount(buyerId);
    expect(buyerAcc.lockedBalance).toBe(180000);
    expect(buyerAcc.availableBalance).toBe(5000000 - 180000);
  });

  it('prevents a player from cancelling another player order', async () => {
    const created = await tradingService.placeOrder(sellerId, {
      symbol: 'AAPL',
      side: 'SELL',
      type: 'LIMIT',
      price: 18100,
      quantity: 25,
      idempotencyKey: 'seller-order-001'
    });

    await expect(
      tradingService.cancelOrder(buyerId, created.order.id)
    ).rejects.toThrow(/another player/i);
  });
});

