/**
 * candle-service.js - In-Memory Candle Accumulator & Rollup Engine for market-server
 * 
 * Aggregates trades and price ticks in RAM to prevent database thrashing,
 * flushing closed minute candles in batches to PostgreSQL and broadcasting live updates via Socket.IO.
 */

export class CandleService {
  constructor({ db = null, io = null, logger = console } = {}) {
    this.db = db;
    this.io = io;
    this.logger = logger;
    this.activeBuckets = new Map(); // symbol -> { bucketTime, open, high, low, close, volume }
    this.candleHistory = new Map(); // symbol_tf -> Array<Candle>
    this.maxMemoryHistory = 500;
  }

  /**
   * Process trade execution or price tick
   */
  onTrade(symbol, price, quantity = 0, timestamp = Date.now()) {
    if (!symbol || price <= 0) return;
    const sym = symbol.toUpperCase();
    const p = Number(price);
    const q = Number(quantity) || 0;
    const bucketTime = Math.floor(timestamp / 60000) * 60000;

    let bucket = this.activeBuckets.get(sym);

    if (!bucket) {
      bucket = {
        symbol: sym,
        bucketTime,
        open: p,
        high: p,
        low: p,
        close: p,
        volume: q
      };
      this.activeBuckets.set(sym, bucket);
    } else if (bucket.bucketTime === bucketTime) {
      // Update ongoing minute candle
      bucket.high = Math.max(bucket.high, p);
      bucket.low = Math.min(bucket.low, p);
      bucket.close = p;
      bucket.volume += q;
    } else {
      // Previous minute closed! Archive previous candle
      this.archiveCandle(bucket);

      // Start new minute candle
      bucket = {
        symbol: sym,
        bucketTime,
        open: bucket.close,
        high: Math.max(bucket.close, p),
        low: Math.min(bucket.close, p),
        close: p,
        volume: q
      };
      this.activeBuckets.set(sym, bucket);
    }

    // Emit live candle tick to Socket.IO subscribers if available
    if (this.io) {
      const liveCandle = {
        symbol: sym,
        time: new Date(bucket.bucketTime).toISOString(),
        open: bucket.open,
        high: bucket.high,
        low: bucket.low,
        close: bucket.close,
        volume: bucket.volume,
        isLive: true
      };
      this.io.to(`market:${sym}`).emit('candle:update', liveCandle);
    }
  }

  /**
   * Archive closed candle to memory buffer and flush to PostgreSQL
   */
  archiveCandle(c) {
    const sym = c.symbol;
    const key1m = `${sym}_1m`;

    if (!this.candleHistory.has(key1m)) {
      this.candleHistory.set(key1m, []);
    }

    const history = this.candleHistory.get(key1m);
    const record = {
      time: new Date(c.bucketTime).toISOString(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      isLive: false
    };

    history.push(record);
    if (history.length > this.maxMemoryHistory) {
      history.shift();
    }

    // Persist to PostgreSQL if database connection is available
    if (this.db) {
      this.db.query(
        `INSERT INTO market_candles (symbol, timeframe, timestamp, open, high, low, close, volume)
         VALUES ($1, '1m', $2, $3, $4, $5, $6, $7)
         ON CONFLICT (symbol, timeframe, timestamp)
         DO UPDATE SET high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume`,
        [sym, record.time, c.open, c.high, c.low, c.close, c.volume]
      ).catch(err => {
        this.logger.warn({ err: err.message, symbol: sym }, '[CandleService] Failed to persist closed candle to DB');
      });
    }
  }

  /**
   * Query historical candles for a symbol
   */
  async getCandles(symbol, timeframe = '1m', limit = 120) {
    const sym = symbol.toUpperCase();
    const cleanLimit = Math.min(300, Math.max(1, Number(limit) || 120));

    // 1. Try querying PostgreSQL if configured
    if (this.db) {
      try {
        const { rows } = await this.db.query(
          `SELECT timestamp AS time, open, high, low, close, volume
           FROM market_candles
           WHERE symbol = $1 AND timeframe = $2
           ORDER BY timestamp DESC
           LIMIT $3`,
          [sym, timeframe, cleanLimit]
        );

        if (rows && rows.length > 0) {
          const candles = rows.reverse().map(r => ({
            time: new Date(r.time).toISOString(),
            open: Number(r.open),
            high: Number(r.high),
            low: Number(r.low),
            close: Number(r.close),
            volume: Number(r.volume || 0),
            isLive: false
          }));

          // Attach current running active candle if matching timeframe
          const active = this.activeBuckets.get(sym);
          if (active && timeframe === '1m') {
            candles.push({
              time: new Date(active.bucketTime).toISOString(),
              open: active.open,
              high: active.high,
              low: active.low,
              close: active.close,
              volume: active.volume,
              isLive: true
            });
          }

          return candles;
        }
      } catch (err) {
        this.logger.warn({ err: err.message }, '[CandleService] Database candle query failed; falling back to memory');
      }
    }

    // 2. In-memory buffer fallback
    const key = `${sym}_${timeframe}`;
    const inMem = this.candleHistory.get(key) || [];
    const result = inMem.slice(-cleanLimit);

    const active = this.activeBuckets.get(sym);
    if (active && timeframe === '1m') {
      result.push({
        time: new Date(active.bucketTime).toISOString(),
        open: active.open,
        high: active.high,
        low: active.low,
        close: active.close,
        volume: active.volume,
        isLive: true
      });
    }

    return result;
  }
}

