import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { QueueService } from '../services/queue';
import { DatabaseService } from '../services/database';
import { ScraperService } from '../services/scraper';
import { logger } from '../services/logger';
import { ScrapedContent, QueueMessage, Message, ScrapeJob, JobUpdateEvent } from '../types';

export class Worker extends EventEmitter {
  private queueService: QueueService;
  private databaseService: DatabaseService;
  private scraperService: ScraperService;
  private isRunning = false;
  private pollingInterval = 10000; // Poll every 10 seconds
  private maxRetries = 3;

  constructor(
    queueService: QueueService,
    databaseService: DatabaseService,
    scraperService: ScraperService
  ) {
    super();
    this.queueService = queueService;
    this.databaseService = databaseService;
    this.scraperService = scraperService;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    logger.info(`Scraper Worker started - polling every ${this.pollingInterval/1000} seconds`);

    while (this.isRunning) {
      try {
        const messages = await this.queueService.receiveMessages(10);
        
        if (messages.length === 0) {
          await this.sleep(1000);
          continue;
        }

        logger.info(`Processing ${messages.length} messages`);
        
        // Process messages in parallel
        const promises = messages.map(message => this.processMessage(message));
        await Promise.allSettled(promises);
        
      } catch (error) {
        const err = error as Error;
        logger.error('Error in worker polling loop', { error: err.message });
        await this.sleep(5000); // Wait before retrying
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info('Scraper Worker stopped');
  }

  private async processMessage(message: Message): Promise<void> {
    if (!message.Body || !message.ReceiptHandle) {
      logger.error('Invalid message format', { message });
      return;
    }

    try {
      const queueMessage: QueueMessage = JSON.parse(message.Body);
      logger.info(`Processing job ${queueMessage.jobId} for URL: ${queueMessage.url}`);

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
      logger.info(`Successfully processed job ${queueMessage.jobId}`);

    } catch (error) {
      const err = error as Error;
      await this.handleProcessingError(message, err);
    }
  }

  private async handleProcessingError(message: Message, error: Error): Promise<void> {
    try {
      const queueMessage: QueueMessage = JSON.parse(message.Body!);
      const retryCount = (queueMessage.retryCount || 0) + 1;

      logger.error(`Processing failed for job ${queueMessage.jobId}`, { 
        error: error.message, 
        retryCount,
        maxRetries: this.maxRetries
      });

      if (retryCount < this.maxRetries) {
        // Retry the job
        queueMessage.retryCount = retryCount;
        await this.queueService.sendMessage(queueMessage);
        logger.info(`Job ${queueMessage.jobId} queued for retry ${retryCount}/${this.maxRetries}`);
      } else {
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
      await this.queueService.deleteMessage(message.ReceiptHandle!);

    } catch (parseError) {
      const err = parseError as Error;
      logger.error('Failed to parse message for error handling', { 
        error: err.message,
        messageBody: message.Body 
      });
    }
  }

  private async updateJobStatus(
    jobId: string, 
    status: ScrapeJob['status'], 
    completedAt?: string,
    errorMessage?: string
  ): Promise<void> {
    const updates: Record<string, any> = { status };
    
    if (completedAt) {
      updates.completedAt = completedAt;
    }
    
    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }

    const { error } = await this.databaseService.updateItem(
      { PK: `JOB#${jobId}`, SK: 'METADATA' },
      updates
    );

    if (error) {
      logger.error(`Failed to update job status for ${jobId}`, { error: error.message });
    }
  }

  private async saveScrapedContent(
    jobId: string, 
    url: string, 
    content: Partial<ScrapedContent>
  ): Promise<ScrapedContent> {
    const scrapedContent: ScrapedContent = {
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
      logger.error(`Failed to save scraped content for job ${jobId}`, { error: error.message });
      throw error;
    }

    return scrapedContent;
  }

  private emitJobUpdate(update: JobUpdateEvent): void {
    this.emit('jobUpdate', update);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
