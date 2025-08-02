// apps/backend/src/index.ts
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import Redis from 'ioredis'

// Load environment variables FIRST
dotenv.config()

import * as dynamodb from '@iakhator/scraper-aws-wrapper';
import * as sqs from '@iakhator/scraper-aws-wrapper';
import { createScraperLogger } from '@iakhator/scraper-logger';
import apiRoutes from './routes/api';
import { DatabaseService, QueueService } from '@iakhator/scraper-core';
import { v4 as uuidv4 } from 'uuid';

const logger = createScraperLogger({ service: 'queue-server' });
const dbService = new DatabaseService(dynamodb);
const queueService = new QueueService(sqs)

const app = express()
const server = createServer(app)
const io = new Server(server, {cors: {origin:"*"}, path: '/ws'})

// Export io instance for use in other modules
export { io };

app.use(cors())
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379"); // Pub/Sub
redis.subscribe("job_updates");
redis.on("message", (channel, message) => {
  logger.info(`Received Redis message on channel: ${channel}`)
  if (channel === "job_updates") {
    const job = JSON.parse(message);
    
    // Transform the job data to match the expected format
    const jobUpdate = {
      type: 'job-update',
      jobId: job.id || job.jobId,
      status: job.status,
      data: {
        url: job.url,
        priority: job.priority,
        completedAt: job.completedAt,
        title: job.title
      },
      timestamp: new Date().toISOString()
    };
    
    io.emit("job_updated", jobUpdate);
    logger.info(`Broadcasted job update via Redis for ${jobUpdate.jobId}: ${jobUpdate.status}`);
  }
});

app.use('/api', apiRoutes);

io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`)
  socket.on("disconnect", () =>  logger.info(`Client disconnected: ${socket.id}`) )
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  logger.startup(PORT);
  logger.info(`WebSocket server running on ws://localhost:${PORT}/ws`);
})

// Function to broadcast job status updates via Socket.IO
// export function broadcastJobUpdate(jobId: string, status: string, data?: any) {
//   const message = {
//     type: 'job-update',
//     jobId,
//     status,
//     data,
//     timestamp: new Date().toISOString()
//   };
  
//   // Emit job_updated event to all connected Socket.IO clients
//   io.emit('job_updated', message);
//   logger.info(`Broadcasted job update for ${jobId}: ${status}`);
// }
