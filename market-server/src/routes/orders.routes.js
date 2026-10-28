import { cancelOrderParamsSchema, myOrdersQuerySchema } from '../modules/trading/trading-schema.js';

export default async function ordersRoutes(fastify) {
  // Semua endpoint order wajib melalui autentikasi JWT
  fastify.addHook('preHandler', fastify.authenticate);

  /**
   * POST /api/orders
   * Membuat order baru (LIMIT atau MARKET, BUY atau SELL) dengan idempotensi
   */
  fastify.post('/api/orders', async (request, reply) => {
    const idempotencyHeader = request.headers['idempotency-key'] || request.headers['x-idempotency-key'];
    const payload = {
      ...(request.body || {}),
      idempotencyKey: request.body?.idempotencyKey || idempotencyHeader
    };

    const result = await fastify.tradingService.placeOrder(request.player.id, payload);
    const statusCode = result.idempotentReplay ? 200 : 201;

    return reply.code(statusCode).send({
      data: result.order,
      trades: result.trades,
      idempotent_replay: result.idempotentReplay
    });
  });

  /**
   * DELETE /api/orders/:id
   * Membatalkan order aktif milik pemain dan membuka kunci saldo/saham
   */
  fastify.delete('/api/orders/:id', async (request, reply) => {
    const parsed = cancelOrderParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_ORDER_ID',
        message: parsed.error.issues[0]?.message || 'Invalid order ID'
      });
    }

    const result = await fastify.tradingService.cancelOrder(request.player.id, parsed.data.id);
    return reply.send({
      data: result.order,
      unlocked_funds: result.unlockedFunds,
      unlocked_shares: result.unlockedShares
    });
  });

  /**
   * GET /api/orders/me
   * Mengambil daftar order milik pemain yang sedang login
   */
  fastify.get('/api/orders/me', async (request, reply) => {
    const parsed = myOrdersQuerySchema.safeParse(request.query || {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'INVALID_QUERY',
        message: parsed.error.issues[0]?.message || 'Invalid query parameters'
      });
    }

    const orders = await fastify.tradingService.getPlayerOrders(request.player.id, parsed.data);
    return reply.send({ data: orders });
  });
}

