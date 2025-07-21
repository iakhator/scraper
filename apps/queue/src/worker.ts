import { QueueService, DatabaseService, ScraperService } from './services';
import logger from './utils/logger';
import { ScrapedContent, QueueMessage, Message, ScrapeJob } from './types';
// import { v4 as uuidv4 } from 'uuid';
// import { io } from './server';
import { sqs, dynamodb } from './aws-wrapper';

class Worker {
  private queueService: QueueService;
  private databaseService: DatabaseService;
  private scraperService: ScraperService;
  private isRunning = false;

  constructor() {
    this.queueService = new QueueService(sqs);
    this.databaseService = new DatabaseService(dynamodb);
    this.scraperService = new ScraperService();
  }

  async start(): Promise<void> {
    this.isRunning = true;
    logger.info('Worker started');

    try {
      await this.scraperService.init();
      while (this.isRunning) {
        try {
          const messages = await this.queueService.receiveMessages();
          if (messages.length === 0) {
            await this.sleep(1000); // Prevent tight loop
            continue;
          }

          const processingPromises = messages.map((message) => this.processMessage(message));
          await Promise.all(processingPromises);
        } catch (error: any) {
          logger.error(`Worker error: ${error.message}`, error);
          await this.sleep(5000); // Wait before retrying
        }
      }
    } catch (error: any) {
      logger.error(`Worker startup failed: ${error.message}`, error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    await this.scraperService.close();
    logger.info('Worker stopped');
  }

  private async processMessage(message: Message): Promise<void> {
    if (!message.Body) {
      logger.error('Received message with no body');
      await this.queueService.deleteMessage({ 
        QueueUrl: process.env.QUEUE_URL!, 
        ReceiptHandle: message.ReceiptHandle! 
      });
      return;
    }

    let queueMessage: QueueMessage;
    try {
      queueMessage = JSON.parse(message.Body);
    } catch (error: any) {
      logger.error(`Failed to parse message body: ${error.message}`);
      await this.queueService.deleteMessage({ 
        QueueUrl: process.env.QUEUE_URL!, 
        ReceiptHandle: message.ReceiptHandle! 
      });
      return;
    }

    try {
      // Update job status to processing
      const updateResult = await this.databaseService.updateJob(queueMessage.jobId, {
        status: 'processing',
      });

      if (updateResult.error) {
        throw new Error(`Failed to update job status to processing: ${updateResult.error.message}`);
      }

      const scrapedData = await this.scraperService.scrapeUrl(queueMessage.url);

      const content: ScrapedContent = {
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

      // io.emit('jobCompleted', { jobId: queueMessage.jobId, contentId: content.id });
      await this.queueService.deleteMessage({ 
        QueueUrl: process.env.QUEUE_URL!, 
        ReceiptHandle: message.ReceiptHandle! 
      });
      logger.info(`Successfully processed job: ${queueMessage.jobId}`);
    } catch (error: any) {
      logger.error(`Failed to process job ${queueMessage.jobId}: ${error.message}`, error);
      await this.handleFailedJob(queueMessage, message, error);
    }
  }

  private async handleFailedJob(queueMessage: QueueMessage, message: Message, error: any): Promise<void> {
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

        logger.info(`Retrying job ${queueMessage.jobId} (attempt ${newRetryCount})`);
      } else {
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

        // io.emit('jobFailed', { jobId: queueMessage.jobId, error: error.message });
        logger.error(`Job failed after max retries: ${queueMessage.jobId}`);
      }

      await this.queueService.deleteMessage({ 
        QueueUrl: process.env.QUEUE_URL!, 
        ReceiptHandle: message.ReceiptHandle! 
      });
    } catch (retryError: any) {
      const errorMessage = `Failed to handle failed job ${queueMessage.jobId}: ${retryError.message}`;
      logger.error(errorMessage, retryError);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const worker = new Worker();

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

worker.start().catch((error) => {
  logger.error(`Worker startup failed: ${error.message}`, error);
  process.exit(1);
});
