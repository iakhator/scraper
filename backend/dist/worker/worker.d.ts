import { EventEmitter } from 'events';
import { QueueService } from '../services/queue';
import { DatabaseService } from '../services/database';
import { ScraperService } from '../services/scraper';
export declare class Worker extends EventEmitter {
    private queueService;
    private databaseService;
    private scraperService;
    private isRunning;
    private pollingInterval;
    private maxRetries;
    constructor(queueService: QueueService, databaseService: DatabaseService, scraperService: ScraperService);
    start(): Promise<void>;
    stop(): Promise<void>;
    private processMessage;
    private handleProcessingError;
    private updateJobStatus;
    private saveScrapedContent;
    private emitJobUpdate;
    private sleep;
}
