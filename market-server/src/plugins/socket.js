import fp from 'fastify-plugin';
import { Server as SocketIOServer } from 'socket.io';
import { env } from '../config/env.js';

async function socketPlugin(fastify, options = {}) {
  const io = new SocketIOServer(fastify.server, {
    cors: {
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Authenticate every Socket.IO connection before allowing room subscriptions
  io.use(async (socket, next) => {
    try {
      const player = await fastify.authService.authenticateSocket(socket);
      socket.data.player = player;

      if (fastify.accountsService) {
        await fastify.accountsService.ensureAccount(player.id, player.username);
      }

      next();
    } catch (err) {
      next(new Error(err.message || 'UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const player = socket.data.player;

    // Join private room for player-specific events (`order:updated`)
    if (player?.id) {
      socket.join(`player:${player.id}`);
    }

    // Join global ticker room
    socket.join('market:all');

    /**
     * Client -> Server: `market:subscribe`
     * Subscribes client to `market:<SYMBOL>` room and immediately emits `market:snapshot`
     */
    socket.on('market:subscribe', async (payload, ack) => {
      try {
        const rawSymbol = typeof payload === 'string' ? payload : payload?.symbol;
        if (!rawSymbol || typeof rawSymbol !== 'string') {
          throw new Error('Stock symbol is required to subscribe');
        }

        const symbol = rawSymbol.trim().toUpperCase();
        const snapshot = await fastify.marketService.getSnapshot(symbol);

        socket.join(`market:${symbol}`);
        socket.emit('market:snapshot', snapshot);

        if (typeof ack === 'function') {
          ack({ ok: true, data: snapshot });
        }
      } catch (err) {
        const errorPayload = {
          ok: false,
          error: err.code || 'SUBSCRIBE_FAILED',
          message: err.message
        };
        if (typeof ack === 'function') {
          ack(errorPayload);
        } else {
          socket.emit('market:error', errorPayload);
        }
      }
    });

    /**
     * Optional unsubscribe handler when switching charts
     */
    socket.on('market:unsubscribe', (payload) => {
      const rawSymbol = typeof payload === 'string' ? payload : payload?.symbol;
      if (rawSymbol && typeof rawSymbol === 'string') {
        socket.leave(`market:${rawSymbol.trim().toUpperCase()}`);
      }
    });
  });

  fastify.decorate('io', io);

  fastify.addHook('onClose', async () => {
    await io.close();
  });
}

export default fp(socketPlugin, {
  name: 'socket-plugin',
  dependencies: ['auth-plugin']
});

