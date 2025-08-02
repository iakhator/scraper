import { QueueService, DatabaseService, ScraperService } from '@iakhator/scraper-core';
import { logger } from '@iakhator/scraper-logger';
import { ScrapedContent, QueueMessage, Message, ScrapeJob } from '@iakhator/scraper-types';
import Redis from 'ioredis'

interface WorkerDependencies {
  queueService: QueueService;
  databaseService: DatabaseService;
  scraperService: ScraperService;
  redis: Redis
}

export class Worker {
  private queueService: QueueService;
  private databaseService: DatabaseService;
  private scraperService: ScraperService;
  private redis?: Redis;
  private isRunning = false;
  private pollingInterval = 10000; // Poll every 10 seconds
  private errorRetryInterval = 30000; // Wait 30 seconds on error
  private maxRetries = 3;

  constructor(dependencies: WorkerDependencies) {
    this.queueService = dependencies.queueService;
    this.databaseService = dependencies.databaseService;
    this.scraperService = dependencies.scraperService;
    this.redis = dependencies.redis
  }

  async start(): Promise<void> {
    this.isRunning = true;
    logger.info(`Scraper Worker started - polling every ${this.pollingInterval/1000} seconds`);

    try {
      await this.scraperService.init();
      logger.info('Puppeteer cluster initialized');
      
      while (this.isRunning) {
        try {
          const messages = await this.queueService.receiveMessages({
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,  
            VisibilityTimeout: 300   
          });
          if (messages.length === 0) {
            await this.sleep(1000); // Prevent tight loop
            continue;
          }

          // const processingPromises = messages.map((message) => this.processMessage(message));
          // await Promise.all(processingPromises);
          
          for (const message of messages) {
            if (!this.isRunning) break; // Stop if worker is shutting down
            await this.processMessage(message);
          }
        } catch (error: any) {
          logger.error(`Worker error: ${error.message}`, error);
          await this.sleep(5000); // Wait before retrying
        }
        // try {
        //   logger.debug('Polling SQS queue for messages...');
        //   const startTime = Date.now();
          
        //   // Configure SQS polling parameters
        //   const messages = await this.queueService.receiveMessages({
        //     MaxNumberOfMessages: 10,
        //     WaitTimeSeconds: 20,  
        //     VisibilityTimeout: 300   
        //   });
          
        //   const pollDuration = Date.now() - startTime;
          
        //   if (messages.length === 0) {
        //     logger.info(`No messages in queue after ${pollDuration}ms polling. Next poll in ${this.pollingInterval/1000}s`);
        //     await this.sleep(this.pollingInterval);
        //     continue;
        //   }

        //   logger.info(`Found ${messages.length} messages after ${pollDuration}ms polling`);
          
        //   // Process messages sequentially to avoid overwhelming the scraper
          // for (const message of messages) {
          //   if (!this.isRunning) break; // Stop if worker is shutting down
          //   await this.processMessage(message);
          // }
          
        // } catch (error: any) {
        //   logger.error(`Worker polling error: ${error.message}`, error);
        //   await this.sleep(this.errorRetryInterval);
        // }
      }
    } catch (error: any) {
      logger.error(`Worker startup failed: ${error.message}`, error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    await this.scraperService.close();
    logger.info('Scraper Worker stopped');
  }

  private async processMessage(message: Message): Promise<void> {
    // const queueMessage =  JSON.parse(sqsMessage.Body || '{}');
    // const receiptHandle = message.ReceiptHandle;


    if(!message.Body) { 
      logger.error('Received message with no body');
      await this.queueService.deleteMessage({QueueUrl: process.env.SQS_QUEUE_URL!, ReceiptHandle: message.ReceiptHandle!});
      return;
    }

    let job: QueueMessage;
    let redisJob: QueueMessage & { status: string};
    try {
      job = JSON.parse(message.Body);
    } catch (error: any) {
      logger.error(`Failed to parse message body: ${error.message}`);
      await this.queueService.deleteMessage({QueueUrl: process.env.SQS_QUEUE_URL!, ReceiptHandle: message.ReceiptHandle!});
      return;
    }

    try {
      redisJob = {...job, status: 'processing' }
      this.redis?.publish('job_updates', JSON.stringify(redisJob))
      await this.databaseService.updateJob(job.jobId, {
        status: 'processing',
      });

      const scrapedData = await this.scraperService.scrapeUrl(job.url);

      const content: ScrapedContent = {
        PK: `CONTENT#${job.jobId}`,
        SK: `CONTENT`,
        id: job.jobId,
        url: job.url,
        title: scrapedData.title || '',
        content: scrapedData.content || '',
        metadata: scrapedData.metadata || {},
        scrapedAt: new Date().toISOString(),
        processingTime: scrapedData.processingTime || 0,
      };

      await this.databaseService.saveScrapedContent(content);
      
      // Update job status to completed
      await this.databaseService.updateJob(job.jobId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      redisJob = {...job, status: 'completed' }
      this.redis?.publish('job_updates', JSON.stringify(redisJob))

      
      // Delete message from queue
      await this.queueService.deleteMessage({ 
        QueueUrl: process.env.SQS_QUEUE_URL!, 
        ReceiptHandle: message.ReceiptHandle 
      });

      logger.info(`Successfully processed job: ${job.jobId}`);
    } catch (error: any) {
      logger.error(`Failed to process job: ${job.jobId}`, error);
      await this.handleFailedJob(job, message, error);
    }
  }

  private async handleFailedJob(job: QueueMessage, message: Message, error: any): Promise<void> {
     const receiveCount = parseInt(message.Attributes?.ApproximateReceiveCount || '1');
     const updates: Partial<ScrapeJob> = {
        status: receiveCount >= this.maxRetries ? 'failed' : 'queued',
        errorMessage: error.message,
        retryCount: receiveCount,
      };

    try {
      if (receiveCount >= this.maxRetries) {
        updates.completedAt = new Date().toISOString();
        // Let SQS move the message to the DLQ automatically after maxReceiveCount
        //   this.wsClient?.sendJobUpdate(job.jobId, 'sendtodlq', {
        //   url: job.url,
        //   retryCount: receiveCount,
        //   error: error.message,
        //   retryAt: new Date().toISOString()
        // });
        logger.error(`Job moved to DLQ after ${receiveCount} attempts: ${job.jobId}`);
        // Optionally, send to DLQ manually as a fallback (not required with proper redrive policy)
        // await this.queueService.sendToDLQ(job, receiveCount);
      } else {
        logger.info(`Job ${job.jobId} failed (attempt ${receiveCount}), will retry`);
        //   this.wsClient?.sendJobUpdate(job.jobId, 'failed', {
        //   url: job.url,
        //   error: error.message,
        //   retryCount: receiveCount,
        //   maxRetries: this.maxRetries,
        //   failedAt: new Date().toISOString()
        // });
      }

      await this.databaseService.updateJob(job.jobId, updates);
      // Do NOT delete the message on failure to allow SQS to retry
    } catch (retryError: any) {
      const errorMessage = `Failed to handle failed job ${job.jobId}: ${retryError.message}`;
      logger.error(errorMessage, retryError);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
