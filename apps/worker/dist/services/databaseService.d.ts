import { ScrapedContent, ScrapeJob, DynamoReturn, DynamoKey, DynamoItem } from '@scraper/aws-wrapper';
interface IDynamoDBOperations {
    putItem: (tableName: string, item: any, options?: {
        conditionExpression?: string;
    }) => Promise<DynamoReturn<any>>;
    getItem: (tableName: string, key: any, options?: {
        consistentRead?: boolean;
    }) => Promise<DynamoReturn<any>>;
    updateItem: (tableName: string, key: DynamoKey, updateExpression: string, expressionAttributeValues: Record<string, any>, options?: {
        conditionExpression?: string;
        returnValues?: "NONE" | "ALL_OLD" | "UPDATED_OLD" | "ALL_NEW" | "UPDATED_NEW";
        expressionAttributeNames?: Record<string, string>;
    }) => Promise<DynamoReturn<DynamoItem>>;
    scanItems?: (tableName: string, options?: {
        limit?: number;
        filterExpression?: string;
        expressionAttributeValues?: Record<string, any>;
    }) => Promise<DynamoReturn<DynamoItem[]>>;
}
export declare class DatabaseService {
    private tableName;
    private dynamodb;
    private reservedKeywords;
    constructor(dynamodb: IDynamoDBOperations);
    saveScrapedContent(content: ScrapedContent): Promise<DynamoReturn<ScrapedContent>>;
    getScrapedContent(id: string): Promise<DynamoReturn<ScrapedContent | null>>;
    saveJob(job: ScrapeJob): Promise<DynamoReturn<ScrapeJob>>;
    updateJob(id: string, updates: Partial<ScrapeJob>): Promise<DynamoReturn<ScrapeJob>>;
    /**
     * Helper method to update just the job status
     */
    updateJobStatus(id: string, status: 'queued' | 'processing' | 'completed' | 'failed', metadata?: Record<string, any>): Promise<DynamoReturn<ScrapeJob>>;
    getJob(id: string): Promise<DynamoReturn<ScrapeJob | null>>;
    getRecentJobs(limit?: number): Promise<DynamoReturn<ScrapeJob[]>>;
}
export {};
//# sourceMappingURL=databaseService.d.ts.map