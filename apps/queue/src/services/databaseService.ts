import { dynamodb, config } from '../config/aws';
import { ScrapedContent, ScrapeJob } from '../types';
import { logger } from '../utils/logger';
import { addRetryToClient } from 'aws-sdk-retry';

export class DatabaseService {
  private dynamodbWithRetry: AWS.DynamoDB.DocumentClient;
  private reservedKeywords = ['id', 'status', 'createdAt']; // Add more as needed

  constructor() {
    this.dynamodbWithRetry = addRetryToClient(dynamodb, { maxRetries: 3, delay: 100 });
  }

  async saveScrapedContent(content: ScrapedContent): Promise<void> {
    try {
      await this.dynamodbWithRetry
        .put({
          TableName: config.scrapedContentTable,
          Item: content,
        })
        .promise();

      logger.info(`Scraped content saved: ${content.id}`);
    } catch (error) {
      const errorMessage = `Failed to save scraped content for id ${content.id}: ${error.message}`;
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  async getScrapedContent(id: string): Promise<ScrapedContent | null> {
    try {
      const result = await this.dynamodbWithRetry
        .get({
          TableName: config.scrapedContentTable,
          Key: { id },
        })
        .promise();

      return (result.Item as ScrapedContent) || null;
    } catch (error) {
      const errorMessage = `Failed to get scraped content for id ${id}: ${error.message}`;
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  async saveJob(job: ScrapeJob): Promise<void> {
    try {
      await this.dynamodbWithRetry
        .put({
          TableName: config.scrapeJobsTable,
          Item: job,
        })
        .promise();

      logger.info(`Job saved: ${job.id}`);
    } catch (error) {
      const errorMessage = `Failed to save job for id ${job.id}: ${error.message}`;
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  async updateJob(id: string, updates: Partial<ScrapeJob>): Promise<void> {
    try {
      for (const key of Object.keys(updates)) {
        if (this.reservedKeywords.includes(key)) {
          throw new Error(`Cannot update reserved attribute: ${key}`);
        }
      }

      const updateExpression = [];
      const expressionAttributeValues: any = {};

      for (const [key, value] of Object.entries(updates)) {
        updateExpression.push(`${key} = :${key}`);
        expressionAttributeValues[`:${key}`] = value;
      }

      await this.dynamodbWithRetry
        .update({
          TableName: config.scrapeJobsTable,
          Key: { id },
          UpdateExpression: `SET ${updateExpression.join(', ')}`,
          ExpressionAttributeValues: expressionAttributeValues,
        })
        .promise();

      logger.info(`Job updated: ${id}`);
    } catch (error) {
      const errorMessage = `Failed to update job for id ${id}: ${error.message}`;
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  async getJob(id: string): Promise<ScrapeJob | null> {
    try {
      const result = await this.dynamodbWithRetry
        .get({
          TableName: config.scrapeJobsTable,
          Key: { id },
        })
        .promise();

      return (result.Item as ScrapeJob) || null;
    } catch (error) {
      const errorMessage = `Failed to get job for id ${id}: ${error.message}`;
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  async getRecentJobs(limit: number = 50): Promise<ScrapeJob[]> {
    try {
      const result = await this.dynamodbWithRetry
        .scan({
          TableName: config.scrapeJobsTable,
          Limit: limit,
        })
        .promise();

      return (result.Items as ScrapeJob[]) || [];
    } catch (error: any) {
      const errorMessage = `Failed to get recent jobs: ${error.message}`;
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }
}
