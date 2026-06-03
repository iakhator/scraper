import { EventEmitter } from "events";
import { QueueService } from "../services/queue";
import { DatabaseService } from "../services/database";
import { ScraperService } from "../services/scraper";
import { createChildLogger } from "../services/logger";
import {
  ScrapedContent,
  QueueMessage,
  Message,
  ScrapeJob,
  JobUpdateEvent,
  ActiveJob,
  WorkerStatus,
} from "../types";

const logger = createChildLogger("worker");

export class Worker extends EventEmitter {
  private queueService: QueueService;
  private databaseService: DatabaseService;
  private scraperService: ScraperService;
  private isRunning = false;
  private pollingInterval = 10000;
  private maxRetries = 3;
  private maxConcurrentJobs = 5;
  private activeJobs: Map<string, ActiveJob> = new Map();

  constructor(
    queueService: QueueService,
    databaseService: DatabaseService,
    scraperService: ScraperService,
  ) {
    super();
    this.queueService = queueService;
    this.databaseService = databaseService;
    this.scraperService = scraperService;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    logger.info("Scraper Worker started", {
      pollIntervalMs: this.pollingInterval,
      maxConcurrentJobs: this.maxConcurrentJobs,
    });

    while (this.isRunning) {
      try {
        await this.processMessages();
      } catch (error) {
        const err = error as Error;
        logger.error("Error in worker polling loop", { error: err.message });
        await this.sleep(5000);
      }

      if (this.isRunning) {
        await this.sleep(this.pollingInterval);
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info("Scraper Worker stopping", {
      activeJobs: this.activeJobs.size,
    });

    // Wait up to 30s for active jobs to complete before forcing shutdown
    const maxWait = 30_000;
    const started = Date.now();
    while (this.activeJobs.size > 0 && Date.now() - started < maxWait) {
      await this.sleep(1000);
    }

    if (this.activeJobs.size > 0) {
      logger.warn(
        `Forced shutdown with ${this.activeJobs.size} jobs still active`,
      );
    }

    logger.info("Scraper Worker stopped");
  }

  getStatus(): WorkerStatus {
    const activeJobDetails = Array.from(this.activeJobs.entries()).map(
      ([jobId, job]) => ({
        jobId,
        url: job.url,
        durationMs: Date.now() - job.startTime,
      }),
    );

    return {
      isRunning: this.isRunning,
      activeJobs: this.activeJobs.size,
      maxConcurrentJobs: this.maxConcurrentJobs,
      availableSlots: Math.max(
        0,
        this.maxConcurrentJobs - this.activeJobs.size,
      ),
      pollIntervalMs: this.pollingInterval,
      activeJobDetails,
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  private async processMessages(): Promise<void> {
    const availableSlots = this.maxConcurrentJobs - this.activeJobs.size;

    if (availableSlots <= 0) {
      logger.debug("All worker slots busy", {
        activeJobs: this.activeJobs.size,
      });
      return;
    }

    const messages = await this.queueService.receiveMessages(
      Math.min(availableSlots, 10),
    );

    if (messages.length === 0) return;

    logger.info(`Received ${messages.length} messages`, {
      activeJobs: this.activeJobs.size,
    });

    // Fire and forget — each job tracks itself in activeJobs until it finishes
    messages.forEach((message) => {
      this.processMessage(message).catch((error) => {
        const err = error as Error;
        logger.error("Unhandled error in processMessage", {
          error: err.message,
        });
      });
    });
  }

  private async processMessage(message: Message): Promise<void> {
    if (!message.Body || !message.ReceiptHandle) {
      logger.error("Invalid message format", { message });
      return;
    }

    let jobId: string | undefined;

    try {
      const queueMessage: QueueMessage = JSON.parse(message.Body);
      jobId = queueMessage.jobId;

      this.activeJobs.set(jobId, {
        url: queueMessage.url,
        startTime: Date.now(),
      });
      logger.info(`Processing job ${jobId}`, { url: queueMessage.url });

      await this.updateJobStatus(jobId, "processing");
      this.emitJobUpdate({
        jobId,
        status: "processing",
        url: queueMessage.url,
        priority: queueMessage.priority,
      });

      const scrapedContent = await this.scraperService.scrapeUrl(
        queueMessage.url,
      );
      await this.saveScrapedContent(jobId, queueMessage.url, scrapedContent);

      const completedAt = new Date().toISOString();
      await this.updateJobStatus(jobId, "completed", completedAt);
      this.emitJobUpdate({
        jobId,
        status: "completed",
        url: queueMessage.url,
        priority: queueMessage.priority,
        completedAt,
      });

      await this.queueService.deleteMessage(message.ReceiptHandle);
      logger.info(`Successfully processed job ${jobId}`);
    } catch (error) {
      const err = error as Error;
      await this.handleProcessingError(message, err);
    } finally {
      if (jobId) this.activeJobs.delete(jobId);
    }
  }

  private async handleProcessingError(
    message: Message,
    error: Error,
  ): Promise<void> {
    try {
      const queueMessage: QueueMessage = JSON.parse(message.Body!);
      const retryCount = (queueMessage.retryCount || 0) + 1;
      const willRetry = retryCount < this.maxRetries && this.shouldRetry(error);

      logger.error(`Processing failed for job ${queueMessage.jobId}`, {
        error: error.message,
        retryCount,
        maxRetries: this.maxRetries,
        willRetry,
      });

      if (willRetry) {
        queueMessage.retryCount = retryCount;
        await this.queueService.sendMessage(queueMessage);
        logger.info(
          `Job ${queueMessage.jobId} queued for retry ${retryCount}/${this.maxRetries}`,
        );
      } else {
        const reason = !this.shouldRetry(error)
          ? "non-retryable error"
          : "max retries reached";
        logger.error(`Job ${queueMessage.jobId} permanently failed: ${reason}`);
        await this.updateJobStatus(
          queueMessage.jobId,
          "failed",
          undefined,
          error.message,
        );
        this.emitJobUpdate({
          jobId: queueMessage.jobId,
          status: "failed",
          url: queueMessage.url,
          priority: queueMessage.priority,
          errorMessage: error.message,
        });
      }

      await this.queueService.deleteMessage(message.ReceiptHandle!);
    } catch (parseError) {
      const err = parseError as Error;
      logger.error("Failed to handle processing error", {
        error: err.message,
        messageBody: message.Body,
      });
    }
  }

  // Determines whether a failed job should be retried based on the error type.
  // Avoids wasting retries on permanent errors (bad URL, 4xx client errors).
  private shouldRetry(
    error: Error & { statusCode?: number; code?: string },
  ): boolean {
    // Don't retry client errors (4xx) except rate limiting (429)
    if (
      error.statusCode !== undefined &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      return error.statusCode === 429;
    }

    // Don't retry structural errors — the URL will never succeed
    if (
      error.message.includes("Invalid URL") ||
      error.message.includes("Unsupported protocol")
    ) {
      return false;
    }

    // Retry transient network errors and server-side failures
    const retryableCodes = [
      "ECONNRESET",
      "ECONNABORTED",
      "ENOTFOUND",
      "ECONNREFUSED",
      "ETIMEDOUT",
    ];
    return (
      retryableCodes.includes((error as any).code || "") ||
      (error.statusCode !== undefined && error.statusCode >= 500) ||
      error.message.toLowerCase().includes("timeout") ||
      error.message.toLowerCase().includes("network")
    );
  }

  private async updateJobStatus(
    jobId: string,
    status: ScrapeJob["status"],
    completedAt?: string,
    errorMessage?: string,
  ): Promise<void> {
    const updates: Record<string, any> = { status };
    if (completedAt) updates.completedAt = completedAt;
    if (errorMessage) updates.errorMessage = errorMessage;

    const { error } = await this.databaseService.updateItem(
      { PK: `JOB#${jobId}`, SK: "METADATA" },
      updates,
    );

    if (error) {
      logger.error(`Failed to update job status for ${jobId}`, {
        error: error.message,
      });
    }
  }

  private async saveScrapedContent(
    jobId: string,
    url: string,
    content: Partial<ScrapedContent>,
  ): Promise<ScrapedContent> {
    const scrapedContent: ScrapedContent = {
      PK: `JOB#${jobId}`,
      SK: "CONTENT",
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
      logger.error(`Failed to save scraped content for job ${jobId}`, {
        error: error.message,
      });
      throw error;
    }

    return scrapedContent;
  }

  private emitJobUpdate(update: JobUpdateEvent): void {
    this.emit("jobUpdate", update);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
