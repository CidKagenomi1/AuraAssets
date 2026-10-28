import { symbolParamsSchema } from '../modules/trading/trading-schema.js';

export default async function marketRoutes(fastify) {
  /**
   * GET /api/market/stocks
   * Daftar seluruh saham aktif beserta harga terakhir dan bid/ask terbaik
   */
  fastify.get('/api/market/stocks', async (request, reply) => {
    const stocks = await fastify.marketService.getAllStocks();
    return reply.send({ data: stocks });
  });

  /**
   * GET /api/market/:symbol
   * Harga dan statistik pasar untuk satu saham
   */
  fastify.get('/api/market/:symbol', async (request, reply) => {
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
  fastify.get('/api/market/:symbol/orderbook', async (request, reply) => {
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
  fastify.get('/api/market/:symbol/trades', async (request, reply) => {
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
}

