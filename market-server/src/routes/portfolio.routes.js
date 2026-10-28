export default async function portfolioRoutes(fastify) {
  // Semua endpoint portofolio wajib melalui autentikasi JWT
  fastify.addHook('preHandler', fastify.authenticate);

  /**
   * GET /api/portfolio
   * Mengambil saldo kas (available & locked), daftar kepemilikan saham, dan valuasi portofolio
   */
  fastify.get('/api/portfolio', async (request, reply) => {
    const portfolio = await fastify.portfolioService.getPlayerPortfolio(request.player.id);
    return reply.send({ data: portfolio });
  });

  /**
   * GET /api/portfolio/ledger
   * Mengambil riwayat mutasi ledger pemain (immutable audit log)
   */
  fastify.get('/api/portfolio/ledger', async (request, reply) => {
    const limit = Math.min(200, Math.max(1, Number(request.query?.limit) || 50));
    const entries = await fastify.accountsService.getLedgerHistory(request.player.id, limit);
    return reply.send({ data: entries });
  });
}

