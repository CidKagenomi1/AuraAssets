import { describe, it, expect } from 'vitest';
import { CandleService } from '../src/modules/market/candle-service.js';

describe('CandleService - In-Memory Accumulator & Aggregation', () => {
  it('accumulates multiple trades in the same minute bucket', async () => {
    const candleService = new CandleService();
    const now = 1700000000000; // Fixed timestamp

    candleService.onTrade('AAPL', 150.00, 10, now + 1000);
    candleService.onTrade('AAPL', 152.50, 5, now + 2000);
    candleService.onTrade('AAPL', 149.00, 20, now + 3000);
    candleService.onTrade('AAPL', 151.00, 15, now + 4000);

    const candles = await candleService.getCandles('AAPL', '1m', 10);
    expect(candles.length).toBe(1);

    const c = candles[0];
    expect(c.open).toBe(150.00);
    expect(c.high).toBe(152.50);
    expect(c.low).toBe(149.00);
    expect(c.close).toBe(151.00);
    expect(c.volume).toBe(50);
    expect(c.isLive).toBe(true);
  });

  it('rolls over and archives previous minute candle when a new minute starts', async () => {
    const candleService = new CandleService();
    const minute1 = 1700000000000;
    const minute2 = minute1 + 60000;

    candleService.onTrade('BTC', 60000, 1, minute1 + 10000);
    candleService.onTrade('BTC', 61000, 2, minute1 + 30000);

    // New trade in next minute
    candleService.onTrade('BTC', 60500, 0.5, minute2 + 5000);

    const candles = await candleService.getCandles('BTC', '1m', 10);
    expect(candles.length).toBe(2);

    // First candle is archived
    expect(candles[0].open).toBe(60000);
    expect(candles[0].high).toBe(61000);
    expect(candles[0].close).toBe(61000);
    expect(candles[0].isLive).toBe(false);

    // Second candle is active/live
    expect(candles[1].open).toBe(61000);
    expect(candles[1].close).toBe(60500);
    expect(candles[1].isLive).toBe(true);
  });
});

