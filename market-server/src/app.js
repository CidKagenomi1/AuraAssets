import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import databasePlugin from './plugins/database.js';
import socketPlugin from './plugins/socket.js';
import authPlugin from './modules/auth/index.js';
import { AccountsService } from './modules/accounts/accounts-service.js';
import { MatchingEngine } from './modules/market/matching-engine.js';
import { MarketService } from './modules/market/market-service.js';
import { TradingService } from './modules/trading/trading-service.js';
import { PortfolioService } from './modules/portfolio/portfolio-service.js';
import { OutboxWorker } from './modules/events/outbox-worker.js';
import marketRoutes from './routes/market.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';

export async function buildApp(options = {}) {
  const fastify = Fastify({
    logger:
      options.logger ??
      (env.NODE_ENV === 'development'
        ? {
            level: env.LOG_LEVEL,
            transport: {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname'
              }
            }
          }
        : { level: env.LOG_LEVEL })
  });

  await fastify.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true
  });

  await fastify.register(rateLimit, {
    max: options.rateLimitMax || 120,
    timeWindow: '1 minute'
  });

  // 1. Database & Auth Plugins
  await fastify.register(databasePlugin, {
    db: options.db,
    supabase: options.supabase
  });

  // 2. Domain Services & Matching Engine
  const matchingEngine = options.matchingEngine || new MatchingEngine();
  const accountsService = options.accountsService || new AccountsService(fastify.db);
  const marketService = options.marketService || new MarketService(fastify.db, matchingEngine, fastify.log);

  fastify.decorate('matchingEngine', matchingEngine);
  fastify.decorate('accountsService', accountsService);
  fastify.decorate('marketService', marketService);

  await fastify.register(authPlugin, {
    authService: options.authService,
    jwtSecret: options.jwtSecret,
    allowDevHeader: options.allowDevHeader
  });

  // 3. Socket.IO Real-Time Server
  await fastify.register(socketPlugin);

  // 4. Transactional Outbox Worker & Trading / Portfolio Services
  const outboxWorker =
    options.outboxWorker ||
    new OutboxWorker({
      db: fastify.db,
      io: fastify.io,
      marketService,
      logger: fastify.log
    });
  outboxWorker.setIo(fastify.io);

  const tradingService =
    options.tradingService ||
    new TradingService({
      db: fastify.db,
      matchingEngine,
      outboxWorker,
      logger: fastify.log
    });

  const portfolioService =
    options.portfolioService ||
    new PortfolioService(fastify.db, accountsService);

  fastify.decorate('outboxWorker', outboxWorker);
  fastify.decorate('tradingService', tradingService);
  fastify.decorate('portfolioService', portfolioService);

  // 5. Health Check Endpoint
  fastify.get('/health', async () => {
    const dbOk = fastify.db ? await fastify.db.healthCheck().catch(() => false) : false;
    return {
      status: 'ok',
      database: dbOk ? 'connected' : 'unconfigured_or_offline',
      orderbook_recovered: marketService.isRecovered,
      active_symbols: matchingEngine.stocks.size,
      timestamp: new Date().toISOString()
    };
  });

  // 6. Register REST API Routes
  await fastify.register(marketRoutes);
  await fastify.register(ordersRoutes);
  await fastify.register(portfolioRoutes);

  // 7. Global Structured Error Handler
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Unhandled server error');
    }

    reply.code(statusCode).send({
      error: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
      ...(error.details ? { details: error.details } : {})
    });
  });

  fastify.addHook('onClose', async () => {
    outboxWorker.stop();
  });

  return fastify;
}

export default buildApp;

