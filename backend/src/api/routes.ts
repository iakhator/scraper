import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { QueueService } from "../services/queue";
import { DatabaseService } from "../services/database";
import { urlSchema, bulkUrlSchema } from "../services/validators";
import { createChildLogger } from "../services/logger";
import { ScrapeJob } from "../types";
import { Server as SocketIOServer } from "socket.io";
import { Worker } from "../worker/worker";

const logger = createChildLogger("routes");

export function createApiRoutes(
  queueService: QueueService,
  databaseService: DatabaseService,
  io: SocketIOServer,
  worker: Worker,
) {
  const router = Router();

  // ── Submit single URL ────────────────────────────────────────────────────────
  router.post("/urls", async (req, res) => {
    try {
      const { error, value } = urlSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const jobId = uuidv4();
      const job: ScrapeJob = {
        PK: `JOB#${jobId}`,
        SK: "METADATA",
        id: jobId,
        url: value.url,
        priority: value.priority,
        status: "queued",
        createdAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
      };

      const { error: dbError } = await databaseService.putItem(job);
      if (dbError) {
        logger.error("Failed to save job", { error: dbError.message, jobId });
        return res.status(500).json({ error: "Failed to create job" });
      }

      await queueService.sendMessage({
        jobId,
        url: value.url,
        priority: value.priority,
        retryCount: 0,
        maxRetries: 3,
      });

      io.emit("job_added", {
        type: "job-added",
        jobId,
        status: "queued",
        data: {
          url: value.url,
          priority: value.priority,
          createdAt: job.createdAt,
        },
      });

      logger.info(`Job created: ${jobId}`, { url: value.url });
      res.status(201).json({ jobId, status: "queued" });
    } catch (error) {
      const err = error as Error;
      logger.error("Error creating job", { error: err.message });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── Submit multiple URLs ─────────────────────────────────────────────────────
  router.post("/urls/bulk", async (req, res) => {
    try {
      const { error, value } = bulkUrlSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const jobIds: string[] = [];

      for (const url of value.urls) {
        const jobId = uuidv4();
        const job: ScrapeJob = {
          PK: `JOB#${jobId}`,
          SK: "METADATA",
          id: jobId,
          url,
          priority: value.priority,
          status: "queued",
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
        };

        const { error: dbError } = await databaseService.putItem(job);
        if (dbError) {
          logger.error("Failed to save bulk job", {
            error: dbError.message,
            jobId,
          });
          continue;
        }

        await queueService.sendMessage({
          jobId,
          url: job.url,
          priority: job.priority,
          retryCount: 0,
          maxRetries: 3,
        });

        io.emit("job_added", {
          type: "job-added",
          jobId,
          status: "queued",
          data: {
            url: job.url,
            priority: job.priority,
            createdAt: job.createdAt,
          },
        });

        jobIds.push(jobId);
      }

      logger.info(`Bulk job creation completed: ${jobIds.length} jobs`);
      res.status(201).json({ jobIds, status: "queued", count: jobIds.length });
    } catch (error) {
      const err = error as Error;
      logger.error("Error creating bulk jobs", { error: err.message });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── List all jobs ────────────────────────────────────────────────────────────
  router.get("/jobs", async (_req, res) => {
    try {
      const { data: jobs, error } = await databaseService.queryItems({
        indexName: "GSI1",
        keyConditionExpression: "SK = :sk",
        expressionAttributeValues: { ":sk": "METADATA" },
        limit: 50,
        scanIndexForward: false,
      });

      if (error) {
        logger.error("Failed to retrieve jobs", { error: error.message });
        return res.status(500).json({ error: "Failed to retrieve jobs" });
      }

      const formattedJobs = (jobs || []).map((job) => ({
        jobId: job.id,
        url: job.url,
        status: job.status,
        priority: job.priority,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        errorMessage: job.errorMessage,
      }));

      res.json({ jobs: formattedJobs });
    } catch (error) {
      const err = error as Error;
      logger.error("Error retrieving jobs", { error: err.message });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── Get single job (metadata + scraped content if available) ─────────────────
  router.get("/jobs/:id", async (req, res) => {
    const { id } = req.params;
    const includeContent = req.query.include_content === "true";

    try {
      const { data: job, error } = await databaseService.getItem({
        PK: `JOB#${id}`,
        SK: "METADATA",
      });

      if (error) {
        logger.error("Failed to retrieve job", {
          error: error.message,
          jobId: id,
        });
        return res.status(500).json({ error: "Failed to retrieve job" });
      }

      if (!job) {
        return res.status(404).json({ error: `Job '${id}' not found` });
      }

      const response: Record<string, any> = {
        jobId: job.id,
        url: job.url,
        status: job.status,
        priority: job.priority,
        createdAt: job.createdAt,
        completedAt: job.completedAt || null,
        errorMessage: job.errorMessage || null,
        retryCount: job.retryCount,
      };

      if (includeContent && job.status === "completed") {
        const { data: content } = await databaseService.getItem({
          PK: `JOB#${id}`,
          SK: "CONTENT",
        });
        if (content) {
          response.title = content.title;
          response.content = content.content;
          response.metadata = content.metadata;
          response.processingTime = content.processingTime;
          response.scrapedAt = content.scrapedAt;
        }
      }

      res.json(response);
    } catch (error) {
      const err = error as Error;
      logger.error("Error retrieving job", { error: err.message, jobId: id });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── Get job status (lightweight — no content) ────────────────────────────────
  router.get("/jobs/:id/status", async (req, res) => {
    const { id } = req.params;

    try {
      const { data: job, error } = await databaseService.getItem({
        PK: `JOB#${id}`,
        SK: "METADATA",
      });

      if (error) {
        logger.error("Failed to retrieve job status", {
          error: error.message,
          jobId: id,
        });
        return res.status(500).json({ error: "Failed to retrieve job status" });
      }

      if (!job) {
        return res.status(404).json({ error: `Job '${id}' not found` });
      }

      res.json({
        jobId: job.id,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt || null,
        errorMessage: job.errorMessage || null,
      });
    } catch (error) {
      const err = error as Error;
      logger.error("Error retrieving job status", {
        error: err.message,
        jobId: id,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── Cancel a queued job ──────────────────────────────────────────────────────
  router.delete("/jobs/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const { data: job, error } = await databaseService.getItem({
        PK: `JOB#${id}`,
        SK: "METADATA",
      });

      if (error) {
        logger.error("Failed to retrieve job for cancellation", {
          error: error.message,
          jobId: id,
        });
        return res.status(500).json({ error: "Failed to retrieve job" });
      }

      if (!job) {
        return res.status(404).json({ error: `Job '${id}' not found` });
      }

      if (job.status !== "queued") {
        return res.status(400).json({
          error: `Cannot cancel a job with status '${job.status}'. Only queued jobs can be cancelled.`,
        });
      }

      const { error: updateError } = await databaseService.updateItem(
        { PK: `JOB#${id}`, SK: "METADATA" },
        { status: "cancelled" },
      );

      if (updateError) {
        logger.error("Failed to cancel job", {
          error: updateError.message,
          jobId: id,
        });
        return res.status(500).json({ error: "Failed to cancel job" });
      }

      io.emit("job_updated", {
        type: "job-update",
        jobId: id,
        status: "cancelled",
        data: {
          cancelledAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        },
      });

      logger.info(`Job cancelled: ${id}`);
      res.json({
        jobId: id,
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
      });
    } catch (error) {
      const err = error as Error;
      logger.error("Error cancelling job", { error: err.message, jobId: id });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── Aggregate stats ──────────────────────────────────────────────────────────
  router.get("/stats", async (_req, res) => {
    try {
      const [{ data: jobStats, error: statsError }, queueStats] =
        await Promise.all([
          databaseService.getStats(),
          queueService.getQueueAttributes(),
        ]);

      if (statsError) {
        logger.error("Failed to retrieve job stats", {
          error: statsError.message,
        });
        return res.status(500).json({ error: "Failed to retrieve stats" });
      }

      res.json({
        jobs: jobStats,
        queue: queueStats,
        worker: worker.getStatus(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const err = error as Error;
      logger.error("Error retrieving stats", { error: err.message });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── Health check ─────────────────────────────────────────────────────────────
  router.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "scraper-backend",
    });
  });

  return router;
}
