import { env } from './config/env.js';
import { buildApp } from './app.js';

async function startServer() {
  const app = await buildApp();

  try {
    // Recover active order book and verify lock consistency from PostgreSQL
    await app.marketService.recoverStateFromDatabase();

    // Start Transactional Outbox background dispatcher
    app.outboxWorker.start();

    await app.listen({
      port: env.PORT,
      host: env.HOST
    });

    app.log.info(`🚀 Authoritative Market Engine listening on http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.fatal({ err }, 'Failed to start Market Engine server');
    process.exit(1);
  }

  const shutdown = async (signal) => {
    app.log.info(`Received ${signal}. Gracefully shutting down market-server...`);
    try {
      app.outboxWorker.stop();
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer();

