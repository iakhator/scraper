"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Worker = void 0;
const events_1 = require("events");
const logger_1 = require("../services/logger");
class Worker extends events_1.EventEmitter {
    constructor(queueService, databaseService, scraperService) {
        super();
        this.isRunning = false;
        this.pollingInterval = 10000; // Poll every 10 seconds
        this.maxRetries = 3;
        this.queueService = queueService;
        this.databaseService = databaseService;
        this.scraperService = scraperService;
    }
    async start() {
        this.isRunning = true;
        logger_1.logger.info(`Scraper Worker started - polling every ${this.pollingInterval / 1000} seconds`);
        while (this.isRunning) {
            try {
                const messages = await this.queueService.receiveMessages(10);
                if (messages.length === 0) {
                    await this.sleep(1000);
                    continue;
                }
                logger_1.logger.info(`Processing ${messages.length} messages`);
                // Process messages in parallel
                const promises = messages.map(message => this.processMessage(message));
                await Promise.allSettled(promises);
            }
            catch (error) {
                const err = error;
                logger_1.logger.error('Error in worker polling loop', { error: err.message });
                await this.sleep(5000); // Wait before retrying
            }
        }
    }
    async stop() {
        this.isRunning = false;
        logger_1.logger.info('Scraper Worker stopped');
    }
    async processMessage(message) {
        if (!message.Body || !message.ReceiptHandle) {
            logger_1.logger.error('Invalid message format', { message });
            return;
        }
        try {
            const queueMessage = JSON.parse(message.Body);
            logger_1.logger.info(`Processing job ${queueMessage.jobId} for URL: ${queueMessage.url}`);
            // Update job status to processing
            await this.updateJobStatus(queueMessage.jobId, 'processing');
            this.emitJobUpdate({
                jobId: queueMessage.jobId,
                status: 'processing',
                url: queueMessage.url,
                priority: queueMessage.priority,
            });
            // Scrape the URL
            const scrapedContent = await this.scraperService.scrapeUrl(queueMessage.url);
            // Save the scraped content
            const savedContent = await this.saveScrapedContent(queueMessage.jobId, queueMessage.url, scrapedContent);
            // Update job status to completed
            await this.updateJobStatus(queueMessage.jobId, 'completed', new Date().toISOString());
            this.emitJobUpdate({
                jobId: queueMessage.jobId,
                status: 'completed',
                url: queueMessage.url,
                priority: queueMessage.priority,
                completedAt: new Date().toISOString(),
            });
            // Delete message from queue
            await this.queueService.deleteMessage(message.ReceiptHandle);
            logger_1.logger.info(`Successfully processed job ${queueMessage.jobId}`);
        }
        catch (error) {
            const err = error;
            await this.handleProcessingError(message, err);
        }
    }
    async handleProcessingError(message, error) {
        try {
            const queueMessage = JSON.parse(message.Body);
            const retryCount = (queueMessage.retryCount || 0) + 1;
            logger_1.logger.error(`Processing failed for job ${queueMessage.jobId}`, {
                error: error.message,
                retryCount,
                maxRetries: this.maxRetries
            });
            if (retryCount < this.maxRetries) {
                // Retry the job
                queueMessage.retryCount = retryCount;
                await this.queueService.sendMessage(queueMessage);
                logger_1.logger.info(`Job ${queueMessage.jobId} queued for retry ${retryCount}/${this.maxRetries}`);
            }
            else {
                // Mark job as failed
                await this.updateJobStatus(queueMessage.jobId, 'failed', undefined, error.message);
                this.emitJobUpdate({
                    jobId: queueMessage.jobId,
                    status: 'failed',
                    url: queueMessage.url,
                    priority: queueMessage.priority,
                    errorMessage: error.message,
                });
            }
            // Delete the message from queue in both cases
            await this.queueService.deleteMessage(message.ReceiptHandle);
        }
        catch (parseError) {
            const err = parseError;
            logger_1.logger.error('Failed to parse message for error handling', {
                error: err.message,
                messageBody: message.Body
            });
        }
    }
    async updateJobStatus(jobId, status, completedAt, errorMessage) {
        const updates = { status };
        if (completedAt) {
            updates.completedAt = completedAt;
        }
        if (errorMessage) {
            updates.errorMessage = errorMessage;
        }
        const { error } = await this.databaseService.updateItem({ PK: `JOB#${jobId}`, SK: 'METADATA' }, updates);
        if (error) {
            logger_1.logger.error(`Failed to update job status for ${jobId}`, { error: error.message });
        }
    }
    async saveScrapedContent(jobId, url, content) {
        const scrapedContent = {
            PK: `JOB#${jobId}`,
            SK: 'CONTENT',
            id: jobId,
            url,
            title: content.title,
            content: content.content,
            metadata: content.metadata,
            scrapedAt: content.scrapedAt || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            processingTime: content.processingTime,
        };
        const { error } = await this.databaseService.putItem(scrapedContent);
        if (error) {
            logger_1.logger.error(`Failed to save scraped content for job ${jobId}`, { error: error.message });
            throw error;
        }
        return scrapedContent;
    }
    emitJobUpdate(update) {
        this.emit('jobUpdate', update);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.Worker = Worker;
//# sourceMappingURL=worker.js.map