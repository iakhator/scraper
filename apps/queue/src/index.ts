// apps/backend/src/index.ts
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'

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

// Initialize WebSocket Server
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
})

// Store connected clients with their subscriptions
interface WSClient {
  ws: WebSocket;
  id: string;
  subscribedJobs: Set<string>;
}

const clients = new Map<string, WSClient>();

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  const client: WSClient = {
    ws,
    id: clientId,
    subscribedJobs: new Set()
  };
  
  clients.set(clientId, client);
  logger.info(`WebSocket client connected: ${clientId}`);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    timestamp: new Date().toISOString()
  }));
  
  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'subscribe-job':
           console.log(message, 'mes')
          if (message.jobId) {
            client.subscribedJobs.add(message.jobId);
            logger.info(`Client ${clientId} subscribed to job ${message.jobId}`);
            ws.send(JSON.stringify({
              type: 'subscribed',
              jobId: message.jobId,
              timestamp: new Date().toISOString()
            }));
          }
          break;
          
        case 'unsubscribe-job':
          if (message.jobId) {
            client.subscribedJobs.delete(message.jobId);
            logger.info(`Client ${clientId} unsubscribed from job ${message.jobId}`);
            ws.send(JSON.stringify({
              type: 'unsubscribed',
              jobId: message.jobId,
              timestamp: new Date().toISOString()
            }));
          }
          break;
          
        case 'job-status-update':
          // Handle status updates from workers
          if (message.jobId && message.status) {
            logger.info(`Received job status update from worker: ${message.jobId} -> ${message.status}`);
            // Broadcast this update to subscribed clients
            broadcastJobUpdate(message.jobId, message.status, message.data);
          }
          break;
          
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;
      }
    } catch (error: any) {
      logger.error('Error parsing WebSocket message', error);
    }
  });
  
  ws.on('close', () => {
    clients.delete(clientId);
    logger.info(`WebSocket client disconnected: ${clientId}`);
  });
  
  ws.on('error', (error: any) => {
    logger.error(`WebSocket error for client ${clientId}:`, error);
    clients.delete(clientId);
  });
});

app.use(cors())
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  logger.startup(PORT);
  logger.info(`WebSocket server running on ws://localhost:${PORT}/ws`);
})

// Function to broadcast job status updates
export function broadcastJobUpdate(jobId: string, status: string, data?: any) {
  const message = JSON.stringify({
    type: 'job-update',
    jobId,
    status,
    data,
    timestamp: new Date().toISOString()
  });
  
  // Broadcast to all clients subscribed to this job
  for (const client of clients.values()) {
    if (client.subscribedJobs.has(jobId) && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(message);
      } catch (error:any) {
        logger.error(`Error sending message to client ${client.id}:`, error);
      }
    }
  }
  
  logger.info(`Broadcasted job update for ${jobId}: ${status}`);
}

// Function to broadcast to all connected clients
// export function broadcastToAll(message: any) {
//   const messageStr = JSON.stringify({
//     ...message,
//     timestamp: new Date().toISOString()
//   });
  
//   for (const client of clients.values()) {
//     if (client.ws.readyState === WebSocket.OPEN) {
//       try {
//         client.ws.send(messageStr);
//       } catch (error) {
//         logger.error(`Error sending broadcast to client ${client.id}:`, error);
//       }
//     }
//   }
// }

export { wss, clients };
