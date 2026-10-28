import fp from 'fastify-plugin';
import { AuthService } from './auth-service.js';

async function authPlugin(fastify, options = {}) {
  const authService =
    options.authService ||
    new AuthService({
      supabase: fastify.supabase,
      jwtSecret: options.jwtSecret,
      allowDevHeader: options.allowDevHeader
    });

  fastify.decorate('authService', authService);
  fastify.decorateRequest('player', null);

  fastify.decorate('authenticate', async function authenticate(request, reply) {
    try {
      const player = await authService.authenticateRequest(request);
      request.player = player;

      if (fastify.accountsService) {
        await fastify.accountsService.ensureAccount(player.id, player.username);
      }
    } catch (err) {
      const statusCode = err.statusCode || 401;
      return reply.code(statusCode).send({
        error: err.code || 'UNAUTHORIZED',
        message: err.message
      });
    }
  });
}

export default fp(authPlugin, {
  name: 'auth-plugin'
});

