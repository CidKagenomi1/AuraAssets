/**
 * candle-service.js - In-Memory Candle Accumulator & Rollup Engine for market-server
 * 
 * Aggregates trades and price ticks in RAM to prevent database thrashing,
 * flushing closed minute candles in batches to PostgreSQL and broadcasting live updates via Socket.IO.
 */

const TIMEFRAMES_MS = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000
};

// Safety cap on 1m rows pulled for a single aggregated request
const MAX_SOURCE_ROWS = 10080;

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
   * Query historical candles for a symbol.
   * Only 1m candles are persisted; higher timeframes (5m, 1h, 1d) are aggregated
   * from the 1m series on read so every timeframe the frontend requests is served.
   */
  async getCandles(symbol, timeframe = '1m', limit = 120) {
    const sym = symbol.toUpperCase();
    const cleanLimit = Math.min(300, Math.max(1, Number(limit) || 120));
    const tfMs = TIMEFRAMES_MS[timeframe];

    if (!tfMs) {
      const err = new Error(
        `Unsupported timeframe "${timeframe}". Use one of: ${Object.keys(TIMEFRAMES_MS).join(', ')}`
      );
      err.statusCode = 400;
      err.code = 'INVALID_TIMEFRAME';
      throw err;
    }

    const ratio = tfMs / TIMEFRAMES_MS['1m'];
    const sourceCount = Math.min(MAX_SOURCE_ROWS, cleanLimit * ratio);
    const source = await this.getMinuteCandles(sym, sourceCount);

    if (ratio === 1) return source.slice(-cleanLimit);
    return this.aggregate(source, tfMs).slice(-cleanLimit);
  }

  /**
   * Load the most recent 1m candles (oldest first), including the live bucket.
   */
  async getMinuteCandles(sym, count) {
    let candles = null;

    if (this.db) {
      try {
        const { rows } = await this.db.query(
          `SELECT timestamp AS time, open, high, low, close, volume
           FROM market_candles
           WHERE symbol = $1 AND timeframe = '1m'
           ORDER BY timestamp DESC
           LIMIT $2`,
          [sym, count]
        );

        if (rows && rows.length > 0) {
          candles = rows.reverse().map((r) => ({
            time: new Date(r.time).toISOString(),
            open: Number(r.open),
            high: Number(r.high),
            low: Number(r.low),
            close: Number(r.close),
            volume: Number(r.volume || 0),
            isLive: false
          }));
        }
      } catch (err) {
        this.logger.warn({ err: err.message }, '[CandleService] Database candle query failed; falling back to memory');
      }
    }

    if (!candles) {
      candles = (this.candleHistory.get(`${sym}_1m`) || []).slice(-count);
    }

    const active = this.activeBuckets.get(sym);
    if (active) {
      const activeTime = new Date(active.bucketTime).toISOString();
      const live = {
        time: activeTime,
        open: active.open,
        high: active.high,
        low: active.low,
        close: active.close,
        volume: active.volume,
        isLive: true
      };
      const lastIdx = candles.length - 1;
      if (lastIdx >= 0 && candles[lastIdx].time === activeTime) {
        candles[lastIdx] = live;
      } else {
        candles.push(live);
      }
    }

    return candles;
  }

  /**
   * Roll an ordered 1m candle series up into buckets of `tfMs` milliseconds.
   */
  aggregate(minuteCandles, tfMs) {
    const out = [];
    let current = null;

    for (const c of minuteCandles) {
      const bucket = Math.floor(new Date(c.time).getTime() / tfMs) * tfMs;
      if (!current || current.bucket !== bucket) {
        current = {
          bucket,
          time: new Date(bucket).toISOString(),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
          isLive: c.isLive
        };
        out.push(current);
      } else {
        current.high = Math.max(current.high, c.high);
        current.low = Math.min(current.low, c.low);
        current.close = c.close;
        current.volume += c.volume;
        current.isLive = current.isLive || c.isLive;
      }
    }

    return out.map(({ bucket, ...candle }) => candle);
  }
}

export default CandleService;
