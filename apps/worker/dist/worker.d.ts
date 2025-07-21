export declare class Worker {
    private queueService;
    private databaseService;
    private scraperService;
    private isRunning;
    private pollingInterval;
    private errorRetryInterval;
    constructor();
    start(): Promise<void>;
    stop(): Promise<void>;
    private processMessage;
    private handleFailedJob;
    private sleep;
}
//# sourceMappingURL=worker.d.ts.map