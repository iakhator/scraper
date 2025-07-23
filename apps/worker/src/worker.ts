import { QueueService, DatabaseService, ScraperService } from '@iakhator/scraper-core';
import { logger } from '@iakhator/scraper-logger';
import { ScrapedContent, QueueMessage, Message, ScrapeJob } from '@iakhator/scraper-types';
import { WebSocketClient } from './websocketClient';

interface WorkerDependencies {
  queueService: QueueService;
  databaseService: DatabaseService;
  scraperService: ScraperService;
  wsClient?: WebSocketClient; // Optional for testing
}

export class Worker {
  private queueService: QueueService;
  private databaseService: DatabaseService;
  private scraperService: ScraperService;
  private wsClient?: WebSocketClient;
  private isRunning = false;
  private pollingInterval = 10000; // Poll every 10 seconds
  private errorRetryInterval = 30000; // Wait 30 seconds on error

  constructor(dependencies: WorkerDependencies) {
    this.queueService = dependencies.queueService;
    this.databaseService = dependencies.databaseService;
    this.scraperService = dependencies.scraperService;
    this.wsClient = dependencies.wsClient;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    logger.info(`Scraper Worker started - polling every ${this.pollingInterval/1000} seconds`);

    try {
      await this.scraperService.init();
      logger.info('Puppeteer cluster initialized');
      
      // Connect to WebSocket service
      if (this.wsClient) {
        try {
          await this.wsClient.connect();
          logger.info('WebSocket client connected to queue service');
        } catch (error) {
          logger.warn('Failed to connect WebSocket client, continuing without real-time updates:', { error });
        }
      }
      
      while (this.isRunning) {
        try {
          logger.debug('Polling SQS queue for messages...');
          const startTime = Date.now();
          
          // Configure SQS polling parameters
          const messages = await this.queueService.receiveMessages({
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,  
            VisibilityTimeout: 300   
          });
          
          const pollDuration = Date.now() - startTime;
          
          if (messages.length === 0) {
            logger.info(`No messages in queue after ${pollDuration}ms polling. Next poll in ${this.pollingInterval/1000}s`);
            await this.sleep(this.pollingInterval);
            continue;
          }

          logger.info(`Found ${messages.length} messages after ${pollDuration}ms polling`);
          
          // Process messages sequentially to avoid overwhelming the scraper
          for (const message of messages) {
            if (!this.isRunning) break; // Stop if worker is shutting down
            await this.processMessage(message);
          }
          
        } catch (error: any) {
          logger.error(`Worker polling error: ${error.message}`, error);
          await this.sleep(this.errorRetryInterval);
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
    this.wsClient?.disconnect();
    logger.info('Scraper Worker stopped');
  }

  private async processMessage(sqsMessage: Message): Promise<void> {
    const queueMessage =  JSON.parse(sqsMessage.Body || '{}');
    const receiptHandle = sqsMessage.ReceiptHandle;

    try {
      logger.info(`Processing job: ${queueMessage.jobId} for URL: ${queueMessage.url}`);
      
      // Notify start of processing
      this.wsClient?.sendJobUpdate(queueMessage.jobId, 'processing', {
        url: queueMessage.url,
        startedAt: new Date().toISOString()
      });
      
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

      // Notify completion
      this.wsClient?.sendJobUpdate(queueMessage.jobId, 'completed', {
        url: queueMessage.url,
        title: scrapedData.title,
        completedAt: new Date().toISOString(),
        processingTime: scrapedData.processingTime
      });

      // Delete message from queue
      // if(!receiptHandle) return;

      try {
        await this.queueService.deleteMessage({ 
          QueueUrl: process.env.QUEUE_URL!, 
          ReceiptHandle: receiptHandle! 
        });
      } catch (deleteError: any) {
        logger.error(`Failed to delete message after processing job ${queueMessage.jobId}: ${deleteError.message}`);
      }
      
      logger.info(`Successfully processed job: ${queueMessage.jobId}`);
    } catch (error: any) {
      logger.error(`Failed to process job ${queueMessage.jobId}: ${error.message}`, error);
      await this.handleFailedJob(queueMessage, receiptHandle, error);
    }
  }

  private async handleFailedJob(queueMessage: QueueMessage, receiptHandle: string | undefined, error: any): Promise<void> {
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

        // Notify retry
        this.wsClient?.sendJobUpdate(queueMessage.jobId, 'retrying', {
          url: queueMessage.url,
          retryCount: newRetryCount,
          maxRetries,
          error: error.message,
          retryAt: new Date().toISOString()
        });

        logger.info(`Retrying job ${queueMessage.jobId} (attempt ${newRetryCount}/${maxRetries})`);
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
        
        // Notify permanent failure
        this.wsClient?.sendJobUpdate(queueMessage.jobId, 'failed', {
          url: queueMessage.url,
          error: error.message,
          retryCount: newRetryCount,
          maxRetries,
          failedAt: new Date().toISOString()
        });
        
        await this.queueService.sendMessage({
          jobId: queueMessage.jobId,
          url: queueMessage.url,
          priority: 'low'}, 'dlq');

        logger.error(`Job permanently failed after ${maxRetries} retries: ${queueMessage.jobId}`);
      }
      
      // Delete message from queue
      try {
        await this.queueService.deleteMessage({ 
          QueueUrl: process.env.QUEUE_URL!, 
          ReceiptHandle: receiptHandle! 
        });
      } catch (deleteError: any) {
        logger.error(`Failed to delete message after handling failed job ${queueMessage.jobId}: ${deleteError.message}`);
        // Continue execution - job status was updated even if message deletion failed
      }
    } catch (retryError: any) {
      const errorMessage = `Failed to handle failed job ${queueMessage.jobId}: ${retryError.message}`;
      logger.error(errorMessage, retryError);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
