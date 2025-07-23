import { config } from '@iakhator/scraper-aws-wrapper';
import { ScrapedContent, ScrapeJob, DynamoReturn, DynamoKey, DynamoItem } from '@iakhator/scraper-types';
import { logger } from '@iakhator/scraper-logger';

interface IDynamoDBOperations {
  putItem: (tableName: string, item: any, options?: { conditionExpression?: string }) => Promise<DynamoReturn<any>>;
  getItem: (tableName: string, key: any, options?: { consistentRead?: boolean }) => Promise<DynamoReturn<any>>;
  updateItem: (tableName: string,
  key: DynamoKey,
  updateExpression: string,
  expressionAttributeValues: Record<string, any>,
  options?: { 
    conditionExpression?: string; 
    returnValues?: "NONE" | "ALL_OLD" | "UPDATED_OLD" | "ALL_NEW" | "UPDATED_NEW";
    expressionAttributeNames?: Record<string, string>;
  }) => Promise<DynamoReturn<DynamoItem>>;
  queryItems: (tableName: string, options?: { 
    indexName?: string;
    keyConditionExpression?: string; 
    filterExpression?: string; 
    expressionAttributeValues?: Record<string, any>;
    expressionAttributeNames?: Record<string, string>;
    limit?: number;
    scanIndexForward?: boolean;
  }) => Promise<DynamoReturn<DynamoItem[]>>;
  scanItems?: (tableName: string, options?: { limit?: number; filterExpression?: string; expressionAttributeValues?: Record<string, any> }) => Promise<DynamoReturn<DynamoItem[]>>;
}

export class DatabaseService {
  private tableName: string;
  private dynamodb: IDynamoDBOperations;
  private reservedKeywords = ['status', 'data', 'timestamp', 'count', 'date', 'type', 'name', 'value'];

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
     
      const result = await this.dynamodb.putItem(this.tableName, content);

      if(result.error) {
        logger.error('Failed to save scraped content', {
          error: result.error.message,
          contentId: content.id
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
      const createdAt = job.createdAt || new Date().toISOString();
      const item = {
      ...job,
      createdAt,
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

      logger.info(`Job saved: ${job.id} with GSI attributes`);
      return {data: item as ScrapeJob}
  }

  async updateJob(id: string, updates: Partial<ScrapeJob>): Promise<DynamoReturn<ScrapeJob>> {
    try {
      // Filter out undefined values
      const filteredUpdates: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          filteredUpdates[key] = value;
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        logger.warn(`No valid updates provided for job: ${id}`);
        return { data: undefined };
      }

      // Build update expression and attribute values with expression attribute names for reserved keywords
      const updateExpressions = [];
      const expressionAttributeValues: Record<string, any> = {};
      const expressionAttributeNames: Record<string, string> = {};

      for (const [key, value] of Object.entries(filteredUpdates)) {
        if (this.reservedKeywords.includes(key)) {
          // Use expression attribute names for reserved keywords
          const attributeName = `#${key}`;
          const attributeValue = `:${key}`;
          updateExpressions.push(`${attributeName} = ${attributeValue}`);
          expressionAttributeNames[attributeName] = key;
          expressionAttributeValues[attributeValue] = value;
        } else {
          updateExpressions.push(`${key} = :${key}`);
          expressionAttributeValues[`:${key}`] = value;
        }
      }

      const updateExpression = `SET ${updateExpressions.join(', ')}`;
      const key = { PK: `JOB#${id}`, SK: 'JOB' };

      const result = await this.dynamodb.updateItem(
        this.tableName,
        key,
        updateExpression,
        expressionAttributeValues,
        { 
          returnValues: 'ALL_NEW',
          expressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
        }
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
      // Use query operation on GSI which is much more efficient than scan
        logger.info('Querying recent jobs using GSI1 index');
        
        const result = await this.dynamodb.queryItems(this.tableName, {
          indexName: 'GSI1',
          keyConditionExpression: 'SK = :sk',
          expressionAttributeValues: {
            ':sk': 'JOB'
          },
          limit,
          scanIndexForward: false
        });

        if (result.error) {
          logger.error('Failed to query recent jobs from GSI1', {
            error: result.error.message,
            limit,
          });

          return {data : []};
        }

        const jobs = (result.data || []) as ScrapeJob[];
        logger.info(`Retrieved ${jobs.length} recent jobs using GSI1 query`);
        return { data: jobs };
        
      
    } catch (error: any) {
      const errorMessage = `Failed to get recent jobs: ${error.message}`;
      logger.error(errorMessage, error);
      return { error: new Error(errorMessage) };
    }
  }
}
