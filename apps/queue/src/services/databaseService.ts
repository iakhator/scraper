import { config } from "../aws-wrapper";
import { ScrapedContent, ScrapeJob , DynamoReturn, DynamoKey, DynamoItem} from '../types';
import logger from '../utils/logger';

interface IDynamoDBOperations {
  putItem: (tableName: string, item: any, options?: { conditionExpression?: string }) => Promise<DynamoReturn<any>>;
  getItem: (tableName: string, key: any, options?: { consistentRead?: boolean }) => Promise<DynamoReturn<any>>;
  updateItem: (tableName: string,
  key: DynamoKey,
  updateExpression: string,
  expressionAttributeValues: Record<string, any>,
  options?: { conditionExpression?: string; returnValues?:  "NONE" | "ALL_OLD" | "UPDATED_OLD" | "ALL_NEW" | "UPDATED_NEW"}) => Promise<DynamoReturn<DynamoItem>>;
  scanItems?: (tableName: string, options?: { limit?: number; filterExpression?: string; expressionAttributeValues?: Record<string, any> }) => Promise<DynamoReturn<DynamoItem[]>>;
}

export class DatabaseService {
  private tableName: string;
  private dynamodb: IDynamoDBOperations;
  private reservedKeywords = ['PK', 'SK', 'createdAt'];

  constructor(dynamodb: IDynamoDBOperations) {
    this.tableName = config.tableName as string;
    this.dynamodb = dynamodb;
    

    if (!this.tableName) {
      throw new Error('DynamoDB table names are not configured');
    }
    logger.debug('DatabaseService initialized', {
      tableName: this.tableName,
    });
  }

  async saveScrapedContent(content: ScrapedContent): Promise<DynamoReturn<ScrapedContent>> {
     
      const result = await this.dynamodb.putItem(this.tableName, content, {
        conditionExpression: 'attribute_not_exists(PK)',
      });

      if(result.error) {
        logger.error('Failed to create scrape job', {
          error: result.error.message,
        });
        return { error: result.error };
      }

      logger.info(`Scraped content saved: ${content.id}`);
      return {data: content}
  }

  async getScrapedContent(id: string): Promise<DynamoReturn<ScrapedContent | null>> {
      const result = await this.dynamodb.getItem(this.tableName, {PK: `CONTENT#${id}`, SK: 'CONTENT'});
      if (result.error) {
        logger.error('Failed to get scraped content', {
          error: result.error.message,
          id,
        });
        return { error: result.error };
      }

      if(!result.data) {
        logger.warn(`Scraped content not found for id: ${id}`);
        return { data: null };
      }

      logger.info(`Scraped content retrieved: ${id}`);
      return result.data;
  }

  async saveJob(job: ScrapeJob): Promise<DynamoReturn<ScrapeJob>> {
      const item = {
      ...job,
      createdAt: job.createdAt || new Date().toISOString(),
    };
      const result = await this.dynamodb.putItem(this.tableName, item, {
        conditionExpression: 'attribute_not_exists(PK)',
      });

      if(result.error) {
        logger.error('Failed to create job', {
          error: result.error.message,
        });
        return { error: result.error };
      }

      logger.info(`Job saved: ${job.id}`);
      return {data: item as ScrapeJob}
  }

  async updateJob(id: string, updates: Partial<ScrapeJob>): Promise<DynamoReturn<ScrapeJob>> {
    try {
      // Filter out reserved keywords and undefined values
      const filteredUpdates: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(updates)) {
        if (this.reservedKeywords.includes(key)) {
          logger.warn(`Skipping reserved attribute: ${key}`);
          continue;
        }
        if (value !== undefined) {
          filteredUpdates[key] = value;
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        logger.warn(`No valid updates provided for job: ${id}`);
        return { data: undefined };
      }

      // Build update expression and attribute values
      const updateExpressions = [];
      const expressionAttributeValues: Record<string, any> = {};

      for (const [key, value] of Object.entries(filteredUpdates)) {
        updateExpressions.push(`${key} = :${key}`);
        expressionAttributeValues[`:${key}`] = value;
      }

      const updateExpression = `SET ${updateExpressions.join(', ')}`;
      const key = { PK: `JOB#${id}`, SK: 'JOB' };

      const result = await this.dynamodb.updateItem(
        this.tableName,
        key,
        updateExpression,
        expressionAttributeValues,
        { returnValues: 'ALL_NEW' }
      );

      if (result.error) {
        logger.error('Failed to update job', {
          error: result.error.message,
          jobId: id,
        });
        return { error: result.error };
      }

      logger.info(`Job updated: ${id}`, { updates: Object.keys(filteredUpdates) });
      return { data: result.data as ScrapeJob };
    } catch (error: any) {
      const errorMessage = `Failed to update job for id ${id}: ${error.message}`;
      logger.error(errorMessage, error);
      return { error: new Error(errorMessage) };
    }
  }

  /**
   * Helper method to update just the job status
   */
  async updateJobStatus(
    id: string, 
    status: 'queued' | 'processing' | 'completed' | 'failed',
    metadata?: Record<string, any>
  ): Promise<DynamoReturn<ScrapeJob>> {
    const updates: Partial<ScrapeJob> = { status };
    
    if (metadata) {
      Object.assign(updates, metadata);
    }

    return this.updateJob(id, updates);
  }

  async getJob(id: string): Promise<DynamoReturn<ScrapeJob | null>> {
    try {
      const result = await this.dynamodb.getItem(this.tableName, {
        PK: `JOB#${id}`,
        SK: 'JOB'
      });

      if (result.error) {
        logger.error('Failed to get job', {
          error: result.error.message,
          jobId: id,
        });
        return { error: result.error };
      }

      if (!result.data) {
        logger.warn(`Job not found for id: ${id}`);
        return { data: null };
      }

      logger.info(`Job retrieved: ${id}`);
      return { data: result.data as ScrapeJob };
    } catch (error: any) {
      const errorMessage = `Failed to get job for id ${id}: ${error.message}`;
      logger.error(errorMessage, error);
      return { error: new Error(errorMessage) };
    }
  }

  async getRecentJobs(limit: number = 50): Promise<DynamoReturn<ScrapeJob[]>> {
    try {
      // If scan method is available, use it
      if (this.dynamodb.scanItems) {
        const result = await this.dynamodb.scanItems(this.tableName, {
          limit,
          filterExpression: 'SK = :sk',
          expressionAttributeValues: {
            ':sk': 'JOB'
          }
        });

        if (result.error) {
          logger.error('Failed to scan recent jobs', {
            error: result.error.message,
            limit,
          });
          return { error: result.error };
        }

        const jobs = (result.data || []) as ScrapeJob[];
        // Sort by createdAt descending
        jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        logger.info(`Retrieved ${jobs.length} recent jobs`);
        return { data: jobs };
      } else {
        logger.warn('Scan method not available, returning empty result');
        return { data: [] };
      }
    } catch (error: any) {
      const errorMessage = `Failed to get recent jobs: ${error.message}`;
      logger.error(errorMessage, error);
      return { error: new Error(errorMessage) };
    }
  }
}
