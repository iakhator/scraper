import { config } from "../aws-wrapper";
import { ScrapedContent, ScrapeJob , DynamoReturn} from '../types';
import logger from '../utils/logger';

// Define the interface for DynamoDB operations
interface IDynamoDBOperations {
  putItem: (tableName: string, item: any, options?: { conditionExpression?: string }) => Promise<DynamoReturn<any>>;
  getItem: (tableName: string, key: any, options?: { consistentRead?: boolean }) => Promise<DynamoReturn<any>>;
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

  async saveJob(content: ScrapedContent): Promise<DynamoReturn<ScrapedContent>> {
      const item = {
      ...content,
      createdAt: content.createdAt || new Date().toISOString(),
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

      logger.info(`Job saved: ${content.id}`);
      return {data: item}
  }

  // async updateJob(id: string, updates: Partial<ScrapeJob>): Promise<void> {
  //   try {
  //     for (const key of Object.keys(updates)) {
  //       if (this.reservedKeywords.includes(key)) {
  //         throw new Error(`Cannot update reserved attribute: ${key}`);
  //       }
  //     }

  //     const updateExpression = [];
  //     const expressionAttributeValues: any = {};

  //     for (const [key, value] of Object.entries(updates)) {
  //       updateExpression.push(`${key} = :${key}`);
  //       expressionAttributeValues[`:${key}`] = value;
  //     }

  //     await this.dynamodbWithRetry
  //       .update({
  //         TableName: config.scrapeJobsTable,
  //         Key: { id },
  //         UpdateExpression: `SET ${updateExpression.join(', ')}`,
  //         ExpressionAttributeValues: expressionAttributeValues,
  //       })
  //       .promise();

  //     logger.info(`Job updated: ${id}`);
  //   } catch (error: any) {
  //     const errorMessage = `Failed to update job for id ${id}: ${error.message}`;
  //     logger.error(errorMessage, error);
  //     throw new Error(errorMessage);
  //   }
  // }

  // async getJob(id: string): Promise<ScrapeJob | null> {
  //   try {
  //     const result = await this.dynamodbWithRetry
  //       .get({
  //         TableName: config.scrapeJobsTable,
  //         Key: { id },
  //       })
  //       .promise();

  //     return (result.Item as ScrapeJob) || null;
  //   } catch (error: any) {
  //     const errorMessage = `Failed to get job for id ${id}: ${error.message}`;
  //     logger.error(errorMessage, error);
  //     throw new Error(errorMessage);
  //   }
  // }

  // async getRecentJobs(limit: number = 50): Promise<ScrapeJob[]> {
  //   try {
  //     const result = await this.dynamodbWithRetry
  //       .scan({
  //         TableName: config.scrapeJobsTable,
  //         Limit: limit,
  //       })
  //       .promise();

  //     return (result.Items as ScrapeJob[]) || [];
  //   } catch (error: any) {
  //     const errorMessage = `Failed to get recent jobs: ${error.message}`;
  //     logger.error(errorMessage, error);
  //     throw new Error(errorMessage);
  //   }
  // }
}
