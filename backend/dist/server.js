"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const queue_1 = require("./services/queue");
const database_1 = require("./services/database");
const scraper_1 = require("./services/scraper");
const worker_1 = require("./worker/worker");
const routes_1 = require("./api/routes");
const logger_1 = require("./services/logger");
class ScraperBackend {
    constructor() {
        this.port = parseInt(process.env.PORT || '3001');
        this.app = (0, express_1.default)();
        this.server = (0, http_1.createServer)(this.app);
        this.io = new socket_io_1.Server(this.server, {
            cors: { origin: "*" },
            path: '/ws'
        });
        // Initialize services
        this.queueService = new queue_1.QueueService();
        this.databaseService = new database_1.DatabaseService();
        this.scraperService = new scraper_1.ScraperService();
        // Initialize worker with EventEmitter communication
        this.worker = new worker_1.Worker(this.queueService, this.databaseService, this.scraperService);
        this.setupMiddleware();
        this.setupRoutes();
        this.setupWorkerCommunication();
        this.setupSocketIO();
        this.setupGracefulShutdown();
    }
    setupMiddleware() {
        this.app.use((0, cors_1.default)());
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
    }
    setupRoutes() {
        // API routes
        this.app.use('/api', (0, routes_1.createApiRoutes)(this.queueService, this.databaseService, this.io));
        // Root health check
        this.app.get('/', (req, res) => {
            res.json({
                message: 'Scraper Backend API',
                status: 'healthy',
                timestamp: new Date().toISOString()
            });
        });
    }
    setupWorkerCommunication() {
        // Listen for job updates from worker and broadcast via Socket.IO
        this.worker.on('jobUpdate', (update) => {
            logger_1.logger.debug('Broadcasting job update', { jobId: update.jobId, status: update.status });
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
    setupSocketIO() {
        this.io.on('connection', (socket) => {
            logger_1.logger.info(`Client connected: ${socket.id}`);
            socket.on('disconnect', () => {
                logger_1.logger.info(`Client disconnected: ${socket.id}`);
            });
        });
    }
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            logger_1.logger.info(`Received ${signal}, shutting down gracefully...`);
            try {
                // Stop accepting new connections
                this.server.close(() => {
                    logger_1.logger.info('HTTP server closed');
                });
                // Stop the worker
                await this.worker.stop();
                logger_1.logger.info('Worker stopped');
                // Close Socket.IO
                this.io.close();
                logger_1.logger.info('Socket.IO server closed');
                process.exit(0);
            }
            catch (error) {
                const err = error;
                logger_1.logger.error('Error during shutdown', { error: err.message });
                process.exit(1);
            }
        };
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    }
    async start() {
        try {
            // Start the worker
            logger_1.logger.info('Starting scraper worker...');
            this.worker.start().catch((error) => {
                logger_1.logger.error('Worker error', { error: error.message });
            });
            // Start the HTTP server
            this.server.listen(this.port, () => {
                logger_1.logger.info(`🚀 Scraper Backend running on port ${this.port}`);
                logger_1.logger.info(`📊 API available at http://localhost:${this.port}/api`);
                logger_1.logger.info(`🔌 WebSocket available at ws://localhost:${this.port}/ws`);
                logger_1.logger.info(`🏥 Health check at http://localhost:${this.port}/api/health`);
            });
        }
        catch (error) {
            const err = error;
            logger_1.logger.error('Failed to start backend', { error: err.message });
            process.exit(1);
        }
    }
}
// Start the application
const backend = new ScraperBackend();
backend.start();
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        promise: String(promise)
    });
    process.exit(1);
});
//# sourceMappingURL=server.js.map