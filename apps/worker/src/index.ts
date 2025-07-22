import { Worker } from './worker';
import { logger } from '@iakhator/scraper-logger';

// Increase the max listeners to avoid warnings from multiple loggers
process.setMaxListeners(20);
const worker = new Worker();

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, stopping worker...');
  await worker.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, stopping worker...');
  await worker.stop();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at promise:', { 
    reason: reason instanceof Error ? reason.message : String(reason),
    promise: String(promise)
  });
  process.exit(1);
});

// Start the worker
async function startWorker() {
  try {
    logger.info('Starting scraper worker daemon...');
    await worker.start();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Worker startup failed: ${errorMessage}`, { 
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

// startWorker();
