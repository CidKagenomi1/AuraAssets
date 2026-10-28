import crypto from 'node:crypto';
import { env } from '../../config/env.js';

export class OutboxWorker {
  constructor({
    db = null,
    io = null,
    marketService = null,
    pollIntervalMs = env.OUTBOX_POLL_INTERVAL_MS,
    batchSize = env.OUTBOX_BATCH_SIZE,
    maxAttempts = 5,
    logger = console
  }) {
    this.db = db;
    this.io = io;
    this.marketService = marketService;
    this.pollIntervalMs = pollIntervalMs;
    this.batchSize = batchSize;
    this.maxAttempts = maxAttempts;
    this.logger = logger;

    this.timer = null;
    this.isProcessing = false;
    this.inMemoryQueue = [];
  }

  setIo(io) {
    this.io = io;
  }

  /**
   * Used in standalone/in-memory mode to queue outbox events after transaction commit
   */
  enqueueInMemory(event) {
    this.inMemoryQueue.push({
      id: crypto.randomUUID(),
      status: 'PENDING',
      attempts: 0,
      created_at: new Date().toISOString(),
      ...event
    });
  }

  /**
   * Start background polling of the transactional outbox
   */
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.processBatch().catch((err) => {
        this.logger.error({ err }, '[OutboxWorker] Poll error');
      });
    }, this.pollIntervalMs);
  }

  /**
   * Stop background polling
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Trigger an immediate flush without waiting for next poll tick
   */
  nudge() {
    setImmediate(() => {
      this.processBatch().catch((err) => {
        this.logger.error({ err }, '[OutboxWorker] Nudge flush error');
      });
    });
  }

  /**
   * Process pending outbox events and broadcast via Socket.IO
   */
  async processBatch() {
    if (this.isProcessing || !this.io) return 0;
    this.isProcessing = true;

    try {
      if (this.db) {
        return await this.processDatabaseOutbox();
      }
      return await this.processInMemoryOutbox();
    } finally {
      this.isProcessing = false;
    }
  }

  async processDatabaseOutbox() {
    return this.db.withTransaction(async (client) => {
      const { rows: events } = await client.query(
        `SELECT id, seq_no, aggregate_type, aggregate_id, event_type, payload, attempts
         FROM outbox_events
         WHERE status = 'PENDING'
         ORDER BY seq_no ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [this.batchSize]
      );

      if (events.length === 0) return 0;

      let processedCount = 0;

      for (const evt of events) {
        try {
          await this.dispatchEvent(evt);

          await client.query(
            `UPDATE outbox_events
             SET status = 'PROCESSED',
                 attempts = attempts + 1,
                 processed_at = NOW(),
                 last_error = NULL
             WHERE id = $1`,
            [evt.id]
          );
          processedCount++;
        } catch (err) {
          const nextAttempts = Number(evt.attempts) + 1;
          const nextStatus = nextAttempts >= this.maxAttempts ? 'FAILED' : 'PENDING';

          await client.query(
            `UPDATE outbox_events
             SET status = $2,
                 attempts = $3,
                 last_error = $4
             WHERE id = $1`,
            [evt.id, nextStatus, nextAttempts, err.message || 'Broadcast failed']
          );
        }
      }

      return processedCount;
    });
  }

  async processInMemoryOutbox() {
    let processedCount = 0;
    const pending = this.inMemoryQueue.filter((e) => e.status === 'PENDING').slice(0, this.batchSize);

    for (const evt of pending) {
      try {
        await this.dispatchEvent(evt);
        evt.status = 'PROCESSED';
        evt.attempts += 1;
        evt.processed_at = new Date().toISOString();
        processedCount++;
      } catch (err) {
        evt.attempts += 1;
        evt.last_error = err.message;
        if (evt.attempts >= this.maxAttempts) {
          evt.status = 'FAILED';
        }
      }
    }

    // Keep queue bounded
    if (this.inMemoryQueue.length > 500) {
      this.inMemoryQueue = this.inMemoryQueue.filter((e) => e.status === 'PENDING');
    }

    return processedCount;
  }

  /**
   * Dispatch a single outbox event to the appropriate Socket.IO room(s)
   */
  async dispatchEvent(evt) {
    if (!this.io) {
      throw new Error('Socket.IO instance not attached');
    }

    const { event_type: eventType, payload } = evt;

    switch (eventType) {
      case 'market:trade': {
        const symbol = String(payload.symbol).toUpperCase();
        this.io.to(`market:${symbol}`).emit('market:trade', payload);
        break;
      }

      case 'market:book_update': {
        const symbol = String(payload.symbol || evt.aggregate_id).toUpperCase();
        let bookSnapshot = payload;
        if (this.marketService) {
          bookSnapshot = await this.marketService.getOrderBook(symbol);
        }
        this.io.to(`market:${symbol}`).emit('market:book_update', bookSnapshot);
        break;
      }

      case 'market:ticker': {
        const symbol = String(payload.symbol || evt.aggregate_id).toUpperCase();
        let tickerPayload = payload;
        if (this.marketService) {
          tickerPayload = await this.marketService.getStockStats(symbol);
        }
        this.io.to(`market:${symbol}`).to('market:all').emit('market:ticker', tickerPayload);
        break;
      }

      case 'order:updated': {
        const playerId = payload.player_id ?? payload.playerId;
        if (playerId) {
          this.io.to(`player:${playerId}`).emit('order:updated', payload);
        }
        break;
      }

      default:
        this.logger.warn({ eventType }, '[OutboxWorker] Unknown outbox event_type');
    }
  }
}

export default OutboxWorker;

