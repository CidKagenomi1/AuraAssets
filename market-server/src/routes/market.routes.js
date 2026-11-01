import { symbolParamsSchema } from '../modules/trading/trading-schema.js';
import { env } from '../config/env.js';

// Public, read-only market data is polled frequently by the UI; give it a higher ceiling
// than the global limit (order placement keeps the stricter global limit).
const marketReadLimit = { config: { rateLimit: { max: env.RATE_LIMIT_MARKET_MAX, timeWindow: '1 minute' } } };

export default async function marketRoutes(fastify) {
  /**
   * GET /api/market/stocks
   * Daftar seluruh saham aktif beserta harga terakhir dan bid/ask terbaik
   */
  fastify.get('/api/market/stocks', marketReadLimit, async (request, reply) => {
    const stocks = await fastify.marketService.getAllStocks();
    return reply.send({ data: stocks });
  });

  /**
   * GET /api/market/:symbol
   * Harga dan statistik pasar untuk satu saham
   */
  fastify.get('/api/market/:symbol', marketReadLimit, async (request, reply) => {
    const parsed = symbolParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_SYMBOL',
        message: 'Invalid stock symbol'
      });
    }

    const stats = await fastify.marketService.getStockStats(parsed.data.symbol);
    return reply.send({ data: stats });
  });

  /**
   * GET /api/market/:symbol/orderbook
   * Antrean bid dan ask berdasarkan prioritas harga-waktu
   */
  fastify.get('/api/market/:symbol/orderbook', marketReadLimit, async (request, reply) => {
    const parsed = symbolParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_SYMBOL',
        message: 'Invalid stock symbol'
      });
    }

    const depth = Math.min(100, Math.max(1, Number(request.query?.depth) || 20));
    const orderbook = await fastify.marketService.getOrderBook(parsed.data.symbol, depth);
    return reply.send({ data: orderbook });
  });

  /**
   * GET /api/market/:symbol/trades
   * Riwayat transaksi terakhir untuk satu saham
   */
  fastify.get('/api/market/:symbol/trades', marketReadLimit, async (request, reply) => {
    const parsed = symbolParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_SYMBOL',
        message: 'Invalid stock symbol'
      });
    }

    const limit = Math.min(200, Math.max(1, Number(request.query?.limit) || 50));
    const trades = await fastify.marketService.getRecentTrades(parsed.data.symbol, limit);
    return reply.send({ data: trades });
  });

  /**
   * GET /api/market/:symbol/candles
   * Riwayat OHLCV candle teragregasi untuk satu saham/kripto
   */
  fastify.get('/api/market/:symbol/candles', marketReadLimit, async (request, reply) => {
    const parsed = symbolParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_SYMBOL',
        message: 'Invalid asset symbol'
      });
    }

    const timeframe = request.query?.timeframe || '1m';
    const limit = Math.min(300, Math.max(1, Number(request.query?.limit) || 120));
    const candles = await fastify.candleService.getCandles(parsed.data.symbol, timeframe, limit);
    return reply.send({ data: candles });
  });
}

