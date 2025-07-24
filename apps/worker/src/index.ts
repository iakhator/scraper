import 'dotenv/config';
import { Worker } from './worker';
import { logger } from '@iakhator/scraper-logger';
import { QueueService, DatabaseService, ScraperService } from '@iakhator/scraper-core';
import * as sqs from '@iakhator/scraper-aws-wrapper';
import * as dynamodb from '@iakhator/scraper-aws-wrapper';
import { WebSocketClient } from './websocketClient';

// dependencies Factory
function createWorker(): Worker {
  const queueService = new QueueService(sqs);
  const databaseService = new DatabaseService(dynamodb);
  const scraperService = new ScraperService();
  
  const queueServiceUrl = process.env.QUEUE_SERVICE_URL || 'ws://localhost:3001';
  const wsUrl = queueServiceUrl.replace(/^http/, 'ws') + '/ws';
  
  logger.info(`Creating WebSocket client with URL: ${wsUrl}`);
  const wsClient = new WebSocketClient(wsUrl);
  
  return new Worker({
    queueService,
    databaseService,
    scraperService,
    wsClient
  });
}

// Increase the max listeners to avoid warnings from multiple loggers
process.setMaxListeners(20);
const worker = createWorker();

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

startWorker();
