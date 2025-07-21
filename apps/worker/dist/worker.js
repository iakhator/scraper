"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Worker = void 0;
const core_1 = require("@scraper/core");
const logger_1 = require("@scraper/logger");
const sqs = __importStar(require("@scraper/aws-wrapper"));
const dynamodb = __importStar(require("@scraper/aws-wrapper"));
const logger = (0, logger_1.createScraperLogger)({ service: 'scraper-worker' });
class Worker {
    constructor() {
        this.isRunning = false;
        this.pollingInterval = 10000; // Poll every 10 seconds
        this.errorRetryInterval = 30000; // Wait 30 seconds on error
        this.queueService = new core_1.QueueService(sqs);
        this.databaseService = new core_1.DatabaseService(dynamodb);
        this.scraperService = new core_1.ScraperService();
    }
    async start() {
        this.isRunning = true;
        logger.info(`Scraper Worker started - polling every ${this.pollingInterval / 1000} seconds`);
        try {
            await this.scraperService.init();
            logger.info('Puppeteer cluster initialized');
            while (this.isRunning) {
                try {
                    logger.debug('Polling SQS queue for messages...');
                    const startTime = Date.now();
                    // Configure SQS polling parameters
                    const messages = await this.queueService.receiveMessages({
                        MaxNumberOfMessages: 10, // Process up to 10 messages at once
                        WaitTimeSeconds: 20, // Long polling - wait up to 20 seconds for messages
                        VisibilityTimeout: 300 // 5 minutes to process each message
                    });
                    const pollDuration = Date.now() - startTime;
                    if (messages.length === 0) {
                        logger.info(`No messages in queue after ${pollDuration}ms polling. Next poll in ${this.pollingInterval / 1000}s`);
                        await this.sleep(this.pollingInterval);
                        continue;
                    }
                    logger.info(`Found ${messages.length} messages after ${pollDuration}ms polling`);
                    // Process messages sequentially to avoid overwhelming the scraper
                    for (const message of messages) {
                        if (!this.isRunning)
                            break; // Stop if worker is shutting down
                        await this.processMessage(message);
                    }
                }
                catch (error) {
                    logger.error(`Worker polling error: ${error.message}`, error);
                    await this.sleep(this.errorRetryInterval);
                }
            }
        }
        catch (error) {
            logger.error(`Worker startup failed: ${error.message}`, error);
            throw error;
        }
    }
    async stop() {
        this.isRunning = false;
        await this.scraperService.close();
        logger.info('Scraper Worker stopped');
    }
    async processMessage(message) {
        if (!message.Body) {
            logger.error('Received message with no body');
            try {
                await this.queueService.deleteMessage({
                    QueueUrl: process.env.QUEUE_URL,
                    ReceiptHandle: message.ReceiptHandle
                });
            }
            catch (deleteError) {
                logger.error(`Failed to delete invalid message: ${deleteError.message}`);
            }
            return;
        }
        let queueMessage;
        try {
            queueMessage = JSON.parse(message.Body);
        }
        catch (error) {
            logger.error(`Failed to parse message body: ${error.message}`);
            try {
                await this.queueService.deleteMessage({
                    QueueUrl: process.env.QUEUE_URL,
                    ReceiptHandle: message.ReceiptHandle
                });
            }
            catch (deleteError) {
                logger.error(`Failed to delete malformed message: ${deleteError.message}`);
            }
            return;
        }
        try {
            logger.info(`Processing job: ${queueMessage.jobId} for URL: ${queueMessage.url}`);
            // Update job status to processing
            const updateResult = await this.databaseService.updateJob(queueMessage.jobId, {
                status: 'processing',
            });
            if (updateResult.error) {
                throw new Error(`Failed to update job status to processing: ${updateResult.error.message}`);
            }
            const scrapedData = await this.scraperService.scrapeUrl(queueMessage.url);
            const content = {
                PK: `CONTENT#${queueMessage.jobId}`,
                SK: `CONTENT`,
                id: queueMessage.jobId,
                url: queueMessage.url,
                title: scrapedData.title || '',
                content: scrapedData.content || '',
                metadata: scrapedData.metadata || {},
                scrapedAt: new Date().toISOString(),
                processingTime: scrapedData.processingTime || 0,
            };
            // Save scraped content
            const saveContentResult = await this.databaseService.saveScrapedContent(content);
            if (saveContentResult.error) {
                throw new Error(`Failed to save scraped content: ${saveContentResult.error.message}`);
            }
            // Update job status to completed
            const completeResult = await this.databaseService.updateJob(queueMessage.jobId, {
                status: 'completed',
                completedAt: new Date().toISOString(),
            });
            if (completeResult.error) {
                throw new Error(`Failed to update job status to completed: ${completeResult.error.message}`);
            }
            // Delete message from queue
            try {
                await this.queueService.deleteMessage({
                    QueueUrl: process.env.QUEUE_URL,
                    ReceiptHandle: message.ReceiptHandle
                });
            }
            catch (deleteError) {
                logger.error(`Failed to delete message after processing job ${queueMessage.jobId}: ${deleteError.message}`);
                // Continue execution - job was processed successfully even if message deletion failed
            }
            logger.info(`Successfully processed job: ${queueMessage.jobId}`);
        }
        catch (error) {
            logger.error(`Failed to process job ${queueMessage.jobId}: ${error.message}`, error);
            await this.handleFailedJob(queueMessage, message, error);
        }
    }
    async handleFailedJob(queueMessage, message, error) {
        try {
            const newRetryCount = (queueMessage.retryCount || 0) + 1;
            const maxRetries = queueMessage.maxRetries || 3;
            if (newRetryCount <= maxRetries) {
                await this.queueService.sendMessage({
                    ...queueMessage,
                    retryCount: newRetryCount,
                    error: error.message,
                });
                // Update job for retry
                const retryResult = await this.databaseService.updateJob(queueMessage.jobId, {
                    status: 'queued',
                    retryCount: newRetryCount,
                });
                if (retryResult.error) {
                    logger.error(`Failed to update job for retry: ${retryResult.error.message}`);
                    throw retryResult.error;
                }
                logger.info(`Retrying job ${queueMessage.jobId} (attempt ${newRetryCount}/${maxRetries})`);
            }
            else {
                // Mark job as permanently failed
                const failResult = await this.databaseService.updateJob(queueMessage.jobId, {
                    status: 'failed',
                    errorMessage: error.message,
                    completedAt: new Date().toISOString(),
                });
                if (failResult.error) {
                    logger.error(`Failed to mark job as failed: ${failResult.error.message}`);
                    throw failResult.error;
                }
                logger.error(`Job permanently failed after ${maxRetries} retries: ${queueMessage.jobId}`);
            }
            // Delete message from queue
            try {
                await this.queueService.deleteMessage({
                    QueueUrl: process.env.QUEUE_URL,
                    ReceiptHandle: message.ReceiptHandle
                });
            }
            catch (deleteError) {
                logger.error(`Failed to delete message after handling failed job ${queueMessage.jobId}: ${deleteError.message}`);
                // Continue execution - job status was updated even if message deletion failed
            }
        }
        catch (retryError) {
            const errorMessage = `Failed to handle failed job ${queueMessage.jobId}: ${retryError.message}`;
            logger.error(errorMessage, retryError);
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.Worker = Worker;
//# sourceMappingURL=worker.js.map