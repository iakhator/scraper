"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_1 = require("./worker");
const logger_1 = require("@scraper/logger");
const logger = (0, logger_1.createScraperLogger)({ service: 'scraper-worker' });
const worker = new worker_1.Worker();
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
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Worker startup failed: ${errorMessage}`, {
            error: error instanceof Error ? error.message : String(error)
        });
        process.exit(1);
    }
}
startWorker();
//# sourceMappingURL=index.js.map