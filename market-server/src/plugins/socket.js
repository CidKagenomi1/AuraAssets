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

  // Authenticate Socket.IO connection; allow unauthenticated/guest connections for public market data
  io.use(async (socket, next) => {
    try {
      let player = null;
      try {
        player = await fastify.authService.authenticateSocket(socket);
      } catch (authErr) {
        // Do not reject connection: allow public market data streaming as guest
        fastify.log.debug(`[Socket.IO] Public connection (unauthenticated/guest): ${authErr.message}`);
      }

      socket.data.player = player;

      if (player?.id && fastify.accountsService) {
        await fastify.accountsService.ensureAccount(player.id, player.username).catch((err) => {
          fastify.log.warn(`[Socket.IO] ensureAccount failed: ${err.message}`);
        });
      }

      next();
    } catch (err) {
      next();
    }
  });

  io.on('connection', (socket) => {
    const player = socket.data.player;

    // Join private room for player-specific events (`order:updated`)
    if (player?.id) {
      socket.join(`player:${player.id}`);
    }

    // Join global ticker room (public for all clients)
    socket.join('market:all');

    /**
     * Client -> Server: `auth:authenticate`
     * Allows upgrading an existing connection with fresh JWT or dev credentials
     */
    socket.on('auth:authenticate', async (authPayload, ack) => {
      try {
        const dummySocket = {
          handshake: {
            auth: authPayload || {},
            headers: socket.handshake?.headers || {}
          }
        };
        const authenticatedPlayer = await fastify.authService.authenticateSocket(dummySocket);
        socket.data.player = authenticatedPlayer;

        if (authenticatedPlayer?.id) {
          socket.join(`player:${authenticatedPlayer.id}`);
          if (fastify.accountsService) {
            await fastify.accountsService.ensureAccount(authenticatedPlayer.id, authenticatedPlayer.username).catch(() => {});
          }
        }

        if (typeof ack === 'function') {
          ack({ ok: true, player: authenticatedPlayer });
        }
      } catch (err) {
        if (typeof ack === 'function') {
          ack({ ok: false, error: err.message });
        }
      }
    });

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

