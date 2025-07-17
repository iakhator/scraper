import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { QueueService } from '../services/queueService';
import { DatabaseService } from '../services/databaseService';
import { urlSchema, bulkUrlSchema } from '../utils/validators';
import { dynamodb, sqs } from "../aws-wrapper";
import logger from '../utils/logger';
import { ScrapeJob } from '../types';
// import { io } from '../server';
// import { sqsClient, dynamodb } from '../config/aws';

const router = Router();
const queueService = new QueueService(sqs);
const databaseService = new DatabaseService(dynamodb);

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
      SK: 'JOB',
      id: jobId,
      url: value.url,
      priority: value.priority,
      status: 'queued',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 3,
    };

    await databaseService.saveJob(job);
    await queueService.sendMessage({
      jobId,
      url: value.url,
      priority: value.priority,
      retryCount: 0,
      maxRetries: 3,
    });

    // io.emit('jobSubmitted', { jobId, url: value.url, status: 'queued' });
    res.status(201).json({ jobId, status: 'queued' });
  } catch (error: any) {
    const errorMessage = `Failed to submit URL ${req.body.url}: ${error.message}`;
    logger.error(errorMessage, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit bulk URLs
// router.post('/urls/bulk', async (req, res) => {
//   try {
//     const { error, value } = bulkUrlSchema.validate(req.body);
//     if (error) {
//       return res.status(400).json({ error: error.details[0].message });
//     }

//     const jobIds = [];
//     for (const url of value.urls) {
//       const jobId = uuidv4();
//       const job: ScrapeJob = {
//         id: jobId,
//         url,
//         priority: value.priority,
//         status: 'queued',
//         createdAt: new Date().toISOString(),
//         retryCount: 0,
//         maxRetries: 3,
//       };

//       await databaseService.saveJob(job);
//       await queueService.sendMessage({
//         jobId,
//         url,
//         priority: value.priority,
//         retryCount: 0,
//         maxRetries: 3,
//       });

//       io.emit('jobSubmitted', { jobId, url, status: 'queued' });
//       jobIds.push(jobId);
//     }

//     res.status(201).json({ jobIds, status: 'queued', count: jobIds.length });
//   } catch (error) {
//     const errorMessage = `Failed to submit bulk URLs: ${error.message}`;
//     logger.error(errorMessage, error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// Get job status
// router.get('/jobs/:jobId', async (req, res) => {
//   try {
//     const job = await databaseService.getJob(req.params.jobId);
//     if (!job) {
//       return res.status(404).json({ error: 'Job not found' });
//     }

//     res.json(job);
//   } catch (error) {
//     const errorMessage = `Failed to get job status for id ${req.params.jobId}: ${error.message}`;
//     logger.error(errorMessage, error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// Get scraped content
// router.get('/data/:contentId', async (req, res) => {
//   try {
//     const content = await databaseService.getScrapedContent(req.params.contentId);
//     if (!content) {
//       return res.status(404).json({ error: 'Content not found' });
//     }

//     res.json(content);
//   } catch (error) {
//     const errorMessage = `Failed to get scraped content for id ${req.params.contentId}: ${error.message}`;
//     logger.error(errorMessage, error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// Get recent jobs
// router.get('/jobs', async (req, res) => {
//   try {
//     const limit = parseInt(req.query.limit as string) || 50;
//     const jobs = await databaseService.getRecentJobs(limit);
//     res.json(jobs);
//   } catch (error) {
//     const errorMessage = `Failed to get recent jobs: ${error.message}`;
//     logger.error(errorMessage, error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// Get queue metrics
// router.get('/metrics/queue', async (req, res) => {
//   try {
//     const attributes = await queueService.getQueueAttributes();
//     res.json({
//       messagesAvailable: parseInt(attributes.ApproximateNumberOfMessages || '0'),
//       messagesInFlight: parseInt(attributes.ApproximateNumberOfMessagesNotVisible || '0'),
//     });
//   } catch (error) {
//     const errorMessage = `Failed to get queue metrics: ${error.message}`;
//     logger.error(errorMessage, error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// Health check
// router.get('/health', (req, res) => {
//   res.json({ status: 'healthy', timestamp: new Date().toISOString() });
// });

export default router;
