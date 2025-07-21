"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const aws_wrapper_1 = require("@scraper/aws-wrapper");
const logger_1 = require("@scraper/logger");
class DatabaseService {
    constructor(dynamodb) {
        this.reservedKeywords = ['status', 'data', 'timestamp', 'count', 'date', 'type', 'name', 'value'];
        this.tableName = aws_wrapper_1.config.tableName;
        this.dynamodb = dynamodb;
        if (!this.tableName) {
            throw new Error('DynamoDB table names are not configured');
        }
        logger_1.logger.debug('DatabaseService initialized', {
            tableName: this.tableName,
        });
    }
    async saveScrapedContent(content) {
        const result = await this.dynamodb.putItem(this.tableName, content);
        if (result.error) {
            logger_1.logger.error('Failed to save scraped content', {
                error: result.error.message,
                contentId: content.id
            });
            return { error: result.error };
        }
        logger_1.logger.info(`Scraped content saved: ${content.id}`);
        return { data: content };
    }
    async getScrapedContent(id) {
        const result = await this.dynamodb.getItem(this.tableName, { PK: `CONTENT#${id}`, SK: 'CONTENT' });
        if (result.error) {
            logger_1.logger.error('Failed to get scraped content', {
                error: result.error.message,
                id,
            });
            return { error: result.error };
        }
        if (!result.data) {
            logger_1.logger.warn(`Scraped content not found for id: ${id}`);
            return { data: null };
        }
        logger_1.logger.info(`Scraped content retrieved: ${id}`);
        return result.data;
    }
    async saveJob(job) {
        const item = {
            ...job,
            createdAt: job.createdAt || new Date().toISOString(),
        };
        const result = await this.dynamodb.putItem(this.tableName, item, {
            conditionExpression: 'attribute_not_exists(PK)',
        });
        if (result.error) {
            logger_1.logger.error('Failed to create job', {
                error: result.error.message,
            });
            return { error: result.error };
        }
        logger_1.logger.info(`Job saved: ${job.id}`);
        return { data: item };
    }
    async updateJob(id, updates) {
        try {
            // Filter out undefined values
            const filteredUpdates = {};
            for (const [key, value] of Object.entries(updates)) {
                if (value !== undefined) {
                    filteredUpdates[key] = value;
                }
            }
            if (Object.keys(filteredUpdates).length === 0) {
                logger_1.logger.warn(`No valid updates provided for job: ${id}`);
                return { data: undefined };
            }
            // Build update expression and attribute values with expression attribute names for reserved keywords
            const updateExpressions = [];
            const expressionAttributeValues = {};
            const expressionAttributeNames = {};
            for (const [key, value] of Object.entries(filteredUpdates)) {
                if (this.reservedKeywords.includes(key)) {
                    // Use expression attribute names for reserved keywords
                    const attributeName = `#${key}`;
                    const attributeValue = `:${key}`;
                    updateExpressions.push(`${attributeName} = ${attributeValue}`);
                    expressionAttributeNames[attributeName] = key;
                    expressionAttributeValues[attributeValue] = value;
                }
                else {
                    updateExpressions.push(`${key} = :${key}`);
                    expressionAttributeValues[`:${key}`] = value;
                }
            }
            const updateExpression = `SET ${updateExpressions.join(', ')}`;
            const key = { PK: `JOB#${id}`, SK: 'JOB' };
            const result = await this.dynamodb.updateItem(this.tableName, key, updateExpression, expressionAttributeValues, {
                returnValues: 'ALL_NEW',
                expressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
            });
            if (result.error) {
                logger_1.logger.error('Failed to update job', {
                    error: result.error.message,
                    jobId: id,
                });
                return { error: result.error };
            }
            logger_1.logger.info(`Job updated: ${id}`, { updates: Object.keys(filteredUpdates) });
            return { data: result.data };
        }
        catch (error) {
            const errorMessage = `Failed to update job for id ${id}: ${error.message}`;
            logger_1.logger.error(errorMessage, error);
            return { error: new Error(errorMessage) };
        }
    }
    /**
     * Helper method to update just the job status
     */
    async updateJobStatus(id, status, metadata) {
        const updates = { status };
        if (metadata) {
            Object.assign(updates, metadata);
        }
        return this.updateJob(id, updates);
    }
    async getJob(id) {
        try {
            const result = await this.dynamodb.getItem(this.tableName, {
                PK: `JOB#${id}`,
                SK: 'JOB'
            });
            if (result.error) {
                logger_1.logger.error('Failed to get job', {
                    error: result.error.message,
                    jobId: id,
                });
                return { error: result.error };
            }
            if (!result.data) {
                logger_1.logger.warn(`Job not found for id: ${id}`);
                return { data: null };
            }
            logger_1.logger.info(`Job retrieved: ${id}`);
            return { data: result.data };
        }
        catch (error) {
            const errorMessage = `Failed to get job for id ${id}: ${error.message}`;
            logger_1.logger.error(errorMessage, error);
            return { error: new Error(errorMessage) };
        }
    }
    async getRecentJobs(limit = 50) {
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
                    logger_1.logger.error('Failed to scan recent jobs', {
                        error: result.error.message,
                        limit,
                    });
                    return { error: result.error };
                }
                const jobs = (result.data || []);
                // Sort by createdAt descending
                jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                logger_1.logger.info(`Retrieved ${jobs.length} recent jobs`);
                return { data: jobs };
            }
            else {
                logger_1.logger.warn('Scan method not available, returning empty result');
                return { data: [] };
            }
        }
        catch (error) {
            const errorMessage = `Failed to get recent jobs: ${error.message}`;
            logger_1.logger.error(errorMessage, error);
            return { error: new Error(errorMessage) };
        }
    }
}
exports.DatabaseService = DatabaseService;
