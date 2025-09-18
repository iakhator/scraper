import dotenv from 'dotenv';
// Load environment variables first
// dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { QueueService } from './services/queue';
import { DatabaseService } from './services/database';
import { ScraperService } from './services/scraper';
import { Worker } from './worker/worker';
import { createApiRoutes } from './api/routes';
import { logger } from './services/logger';
import { JobUpdateEvent } from './types';

class ScraperBackend {
  private app: express.Application;
  private server: any;
  private io: Server;
  private queueService: QueueService;
  private databaseService: DatabaseService;
  private scraperService: ScraperService;
  private worker: Worker;
  private port: number;

  constructor() {
    // Load environment variables FIRST
    // dotenv.config()
    this.port = parseInt(process.env.PORT || '3001');
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: { origin: process.env.FRONTEND_URL || "http://localhost:3000" },
      path: '/ws',
      transports: ['websocket', 'polling'],
      serveClient: false,
    });

    // Initialize services
    this.queueService = new QueueService();
    this.databaseService = new DatabaseService();
    this.scraperService = new ScraperService();
    
    // Initialize worker with EventEmitter communication
    this.worker = new Worker(
      this.queueService,
      this.databaseService,
      this.scraperService
    );

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWorkerCommunication();
    this.setupSocketIO();
    this.setupGracefulShutdown();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // API routes
    this.app.use('/api', createApiRoutes(
      this.queueService,
      this.databaseService,
      this.io
    ));

    // Root health check
    this.app.get('/', (req, res) => {
      res.json({ 
        message: 'Scraper Backend API',
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });
  }

  private setupWorkerCommunication(): void {
    // Listen for job updates from worker and broadcast via Socket.IO
    this.worker.on('jobUpdate', (update: JobUpdateEvent) => {
      logger.debug('Broadcasting job update', { jobId: update.jobId, status: update.status });
      
      this.io.emit('job_updated', {
        type: 'job-update',
        jobId: update.jobId,
        status: update.status,
        data: {
          url: update.url,
          priority: update.priority,
          completedAt: update.completedAt,
          errorMessage: update.errorMessage,
          timestamp: new Date().toISOString(),
        },
      });
    });
  }

  private setupSocketIO(): void {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        // Stop accepting new connections
        this.server.close(() => {
          logger.info('HTTP server closed');
        });

        // Stop the worker
        await this.worker.stop();
        logger.info('Worker stopped');

        // Close Socket.IO
        this.io.close();
        logger.info('Socket.IO server closed');

        process.exit(0);
      } catch (error) {
        const err = error as Error;
        logger.error('Error during shutdown', { error: err.message });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  async start(): Promise<void> {
    try {
      // Start the worker
      logger.info('Starting scraper worker...');
      this.worker.start().catch((error) => {
        logger.error('Worker error', { error: error.message });
      });

      // Start the HTTP server
      this.server.listen(this.port, () => {
        logger.info(`🚀 Scraper Backend running on port ${this.port}`);
        logger.info(`📊 API available at http://localhost:${this.port}/api`);
        logger.info(`🔌 WebSocket available at ws://localhost:${this.port}/ws`);
        logger.info(`🏥 Health check at http://localhost:${this.port}/api/health`);
      });

    } catch (error) {
      const err = error as Error;
      logger.error('Failed to start backend', { error: err.message });
      process.exit(1);
    }
  }
}

// Start the application
const backend = new ScraperBackend();
backend.start();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { 
    reason: reason instanceof Error ? reason.message : String(reason),
    promise: String(promise)
  });
  process.exit(1);
});
