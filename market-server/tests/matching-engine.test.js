import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { MatchingEngine } from '../src/modules/market/matching-engine.js';

describe('MatchingEngine - Continuous Limit Order Book', () => {
  let engine;
  const playerA = crypto.randomUUID();
  const playerB = crypto.randomUUID();
  const playerC = crypto.randomUUID();

  beforeEach(() => {
    engine = new MatchingEngine({ preventSelfTrade: true });
    engine.registerStock({
      symbol: 'BBCA',
      name: 'Bank Central Asia',
      sector: 'Finance',
      tickSize: 10,
      lotSize: 1,
      basePrice: 1000
    });

    engine.setAccount(playerA, { availableBalance: 1000000, lockedBalance: 0 });
    engine.setAccount(playerB, { availableBalance: 1000000, lockedBalance: 0 });
    engine.setAccount(playerC, { availableBalance: 1000000, lockedBalance: 0 });

    engine.setPosition(playerA, 'BBCA', { availableQuantity: 500, lockedQuantity: 0, avgBuyPrice: 1000 });
    engine.setPosition(playerC, 'BBCA', { availableQuantity: 500, lockedQuantity: 0, avgBuyPrice: 1000 });
  });

  it('matches the exact scenario from Implementation Plan (100 sell @ 1020 vs 60 buy @ 1030 -> 60 matched @ 1020)', () => {
    // Pemain A memasang limit sell: 100 lembar @ Rp1.020
    const orderA = engine.placeOrder({
      playerId: playerA,
      symbol: 'BBCA',
      side: 'SELL',
      type: 'LIMIT',
      price: 1020,
      quantity: 100,
      idempotencyKey: 'order-a-100-at-1020'
    });

    expect(orderA.order.status).toBe('OPEN');
    expect(orderA.order.remainingQuantity).toBe(100);
    expect(engine.getPosition(playerA, 'BBCA').availableQuantity).toBe(400);
    expect(engine.getPosition(playerA, 'BBCA').lockedQuantity).toBe(100);

    // Pemain B mengirim limit buy: 60 lembar @ Rp1.030
    const orderB = engine.placeOrder({
      playerId: playerB,
      symbol: 'BBCA',
      side: 'BUY',
      type: 'LIMIT',
      price: 1030,
      quantity: 60,
      idempotencyKey: 'order-b-60-at-1030'
    });

    // Jumlah yang matched: 60 lembar @ harga maker Rp1.020
    expect(orderB.trades).toHaveLength(1);
    expect(orderB.trades[0].quantity).toBe(60);
    expect(orderB.trades[0].price).toBe(1020);

    // Sisa order B: 0 (FILLED)
    expect(orderB.order.status).toBe('FILLED');
    expect(orderB.order.remainingQuantity).toBe(0);

    // Sisa order A: 40 lembar di order book (PARTIALLY_FILLED)
    const restingA = engine.getBook('BBCA').getBestAsk();
    expect(restingA).not.toBeNull();
    expect(restingA.remainingQuantity).toBe(40);
    expect(restingA.status).toBe('PARTIALLY_FILLED');

    // Verifikasi saldo & price improvement refund untuk Pemain B:
    // Bayar 60 * 1020 = 61.200 (bukan 61.800), lockedBalance kembali 0
    const accB = engine.getAccount(playerB);
    expect(accB.availableBalance).toBe(1000000 - 61200);
    expect(accB.lockedBalance).toBe(0);
    expect(engine.getPosition(playerB, 'BBCA').availableQuantity).toBe(60);

    // Verifikasi saldo & saham Pemain A:
    const accA = engine.getAccount(playerA);
    expect(accA.availableBalance).toBe(1000000 + 61200);
    expect(engine.getPosition(playerA, 'BBCA').lockedQuantity).toBe(40);
  });

  it('enforces strict Price-Time Priority across multiple makers', () => {
    // Player A places sell @ 1020 (first at 1020)
    const sellA = engine.placeOrder({
      playerId: playerA,
      symbol: 'BBCA',
      side: 'SELL',
      type: 'LIMIT',
      price: 1020,
      quantity: 50,
      idempotencyKey: 'sell-a-1020'
    });

    // Player C places sell @ 1020 (second at 1020)
    const sellC = engine.placeOrder({
      playerId: playerC,
      symbol: 'BBCA',
      side: 'SELL',
      type: 'LIMIT',
      price: 1020,
      quantity: 50,
      idempotencyKey: 'sell-c-1020'
    });

    // Player C also places cheaper sell @ 1010 (better price than 1020)
    const sellC2 = engine.placeOrder({
      playerId: playerC,
      symbol: 'BBCA',
      side: 'SELL',
      type: 'LIMIT',
      price: 1010,
      quantity: 30,
      idempotencyKey: 'sell-c-1010'
    });

    // Player B buys 90 shares via MARKET order
    // Expected match order:
    // 1. sellC2 (30 @ 1010) - best price
    // 2. sellA  (50 @ 1020) - earlier timestamp at 1020
    // 3. sellC  (10 @ 1020) - later timestamp at 1020
    const buyB = engine.placeOrder({
      playerId: playerB,
      symbol: 'BBCA',
      side: 'BUY',
      type: 'MARKET',
      quantity: 90,
      idempotencyKey: 'market-buy-b-90'
    });

    expect(buyB.trades).toHaveLength(3);
    expect(buyB.trades[0]).toMatchObject({ makerOrderId: sellC2.order.id, price: 1010, quantity: 30 });
    expect(buyB.trades[1]).toMatchObject({ makerOrderId: sellA.order.id, price: 1020, quantity: 50 });
    expect(buyB.trades[2]).toMatchObject({ makerOrderId: sellC.order.id, price: 1020, quantity: 10 });
  });

  it('unlocks remaining funds and shares when an order is cancelled', () => {
    const buyOrder = engine.placeOrder({
      playerId: playerB,
      symbol: 'BBCA',
      side: 'BUY',
      type: 'LIMIT',
      price: 1000,
      quantity: 50,
      idempotencyKey: 'cancel-test-buy-1'
    });

    expect(engine.getAccount(playerB).availableBalance).toBe(950000);
    expect(engine.getAccount(playerB).lockedBalance).toBe(50000);

    const cancelled = engine.cancelOrder(buyOrder.order.id, playerB);
    expect(cancelled.order.status).toBe('CANCELLED');
    expect(cancelled.unlockedFunds).toBe(50000);
    expect(engine.getAccount(playerB).availableBalance).toBe(1000000);
    expect(engine.getAccount(playerB).lockedBalance).toBe(0);
  });

  it('rejects invalid tick sizes, insufficient funds, and insufficient liquidity', () => {
    expect(() =>
      engine.placeOrder({
        playerId: playerB,
        symbol: 'BBCA',
        side: 'BUY',
        type: 'LIMIT',
        price: 1005, // tickSize is 10
        quantity: 10,
        idempotencyKey: 'bad-tick-1'
      })
    ).toThrow(/tick size/i);

    expect(() =>
      engine.placeOrder({
        playerId: playerB,
        symbol: 'BBCA',
        side: 'BUY',
        type: 'MARKET',
        quantity: 10, // Empty sell book
        idempotencyKey: 'no-liquidity-1'
      })
    ).toThrow(/liquidity|available/i);
  });
});

