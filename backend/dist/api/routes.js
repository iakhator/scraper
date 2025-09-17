"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiRoutes = createApiRoutes;
const express_1 = require("express");
const uuid_1 = require("uuid");
const validators_1 = require("../services/validators");
const logger_1 = require("../services/logger");
function createApiRoutes(queueService, databaseService, io) {
    const router = (0, express_1.Router)();
    // Submit single URL
    router.post('/urls', async (req, res) => {
        try {
            const { error, value } = validators_1.urlSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            const jobId = (0, uuid_1.v4)();
            const job = {
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
                logger_1.logger.error('Failed to save job to database', { error: dbError.message, jobId });
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
            logger_1.logger.info(`Job created successfully: ${jobId} for URL: ${value.url}`);
            res.status(201).json({ jobId, status: 'queued' });
        }
        catch (error) {
            const err = error;
            logger_1.logger.error('Error creating job', { error: err.message });
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Submit multiple URLs
    router.post('/urls/bulk', async (req, res) => {
        try {
            const { error, value } = validators_1.bulkUrlSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            const jobIds = [];
            const jobs = [];
            // Create jobs for each URL
            for (const url of value.urls) {
                const jobId = (0, uuid_1.v4)();
                const job = {
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
                    logger_1.logger.error('Failed to save job to database', { error: dbError.message, jobId: job.id });
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
            logger_1.logger.info(`Bulk job creation completed: ${jobIds.length} jobs created`);
            res.status(201).json({
                jobIds,
                status: 'queued',
                count: jobIds.length
            });
        }
        catch (error) {
            const err = error;
            logger_1.logger.error('Error creating bulk jobs', { error: err.message });
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // Get all jobs
    router.get('/jobs', async (req, res) => {
        try {
            const { data: jobs, error } = await databaseService.queryItems('JOB#', 'METADATA');
            if (error) {
                logger_1.logger.error('Failed to retrieve jobs', { error: error.message });
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
        }
        catch (error) {
            const err = error;
            logger_1.logger.error('Error retrieving jobs', { error: err.message });
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
//# sourceMappingURL=routes.js.map