import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { QueueService } from '../services/queue';
import { DatabaseService } from '../services/database';
import { urlSchema, bulkUrlSchema } from '../services/validators';
import { logger } from '../services/logger';
import { ScrapeJob } from '../types';
import { Server as SocketIOServer } from 'socket.io';

export function createApiRoutes(
  queueService: QueueService,
  databaseService: DatabaseService,
  io: SocketIOServer
) {
  const router = Router();

  // Submit single URL
  router.post('/urls', async (req, res) => {
    try {
      const { error, value } = urlSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const jobId = uuidv4();
      const job: ScrapeJob = {
        PK: `JOB#${jobId}`,
        SK: 'METADATA',
        id: jobId,
        url: value.url,
        priority: value.priority,
        status: 'queued',
        createdAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Save job to database
      const { error: dbError } = await databaseService.putItem(job);
      if (dbError) {
        logger.error('Failed to save job to database', { error: dbError.message, jobId });
        return res.status(500).json({ error: 'Failed to create job' });
      }

      // Send job to queue
      await queueService.sendMessage({
        jobId,
        url: value.url,
        priority: value.priority,
        retryCount: 0,
        maxRetries: 3,
      });

      // Emit job creation event via Socket.IO
      io.emit('job_added', {
        type: 'job-added',
        jobId,
        status: 'queued',
        data: {
          url: value.url,
          priority: value.priority,
          createdAt: job.createdAt,
        },
      });

      logger.info(`Job created successfully: ${jobId} for URL: ${value.url}`);
      res.status(201).json({ jobId, status: 'queued' });

    } catch (error) {
      const err = error as Error;
      logger.error('Error creating job', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Submit multiple URLs
  router.post('/urls/bulk', async (req, res) => {
    try {
      const { error, value } = bulkUrlSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const jobIds: string[] = [];
      const jobs: ScrapeJob[] = [];

      // Create jobs for each URL
      for (const url of value.urls) {
        const jobId = uuidv4();
        const job: ScrapeJob = {
          PK: `JOB#${jobId}`,
          SK: 'METADATA',
          id: jobId,
          url,
          priority: value.priority,
          status: 'queued',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
        };
        
        jobs.push(job);
        jobIds.push(jobId);
      }

      // Save all jobs to database
      for (const job of jobs) {
        const { error: dbError } = await databaseService.putItem(job);
        if (dbError) {
          logger.error('Failed to save job to database', { error: dbError.message, jobId: job.id });
          continue; // Continue with other jobs
        }

        // Send job to queue
        await queueService.sendMessage({
          jobId: job.id,
          url: job.url,
          priority: job.priority,
          retryCount: 0,
          maxRetries: 3,
        });

        // Emit job creation event
        io.emit('job_added', {
          type: 'job-added',
          jobId: job.id,
          status: 'queued',
          data: {
            url: job.url,
            priority: job.priority,
            createdAt: job.createdAt,
          },
        });
      }

      logger.info(`Bulk job creation completed: ${jobIds.length} jobs created`);
      res.status(201).json({ 
        jobIds, 
        status: 'queued', 
        count: jobIds.length 
      });

    } catch (error) {
      const err = error as Error;
      logger.error('Error creating bulk jobs', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get all jobs
  router.get('/jobs', async (req, res) => {
    try {
      const { data: jobs, error } = await databaseService.queryItems('JOB#', 'METADATA');
      
      if (error) {
        logger.error('Failed to retrieve jobs', { error: error.message });
        return res.status(500).json({ error: 'Failed to retrieve jobs' });
      }

      // Transform jobs for response
      const formattedJobs = (jobs || []).map(job => ({
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
      logger.error('Error retrieving jobs', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Health check
  router.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'scraper-backend'
    });
  });

  return router;
}
