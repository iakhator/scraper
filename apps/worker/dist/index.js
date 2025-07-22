"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_1 = require("./worker");
const scraper_logger_1 = require("@iakhator/scraper-logger");
// Increase the max listeners to avoid warnings from multiple loggers
process.setMaxListeners(20);
const worker = new worker_1.Worker();
// Graceful shutdown handlers
process.on('SIGINT', async () => {
    scraper_logger_1.logger.info('Received SIGINT, stopping worker...');
    await worker.stop();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    scraper_logger_1.logger.info('Received SIGTERM, stopping worker...');
    await worker.stop();
    process.exit(0);
});
process.on('uncaughtException', (error) => {
    scraper_logger_1.logger.error('Uncaught exception:', { error: error.message, stack: error.stack });
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    scraper_logger_1.logger.error('Unhandled rejection at promise:', {
        reason: reason instanceof Error ? reason.message : String(reason),
        promise: String(promise)
    });
    process.exit(1);
});
// Start the worker
async function startWorker() {
    try {
        scraper_logger_1.logger.info('Starting scraper worker daemon...');
        await worker.start();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        scraper_logger_1.logger.error(`Worker startup failed: ${errorMessage}`, {
            error: error instanceof Error ? error.message : String(error)
        });
        process.exit(1);
    }
}
// startWorker();
//# sourceMappingURL=index.js.map