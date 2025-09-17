"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const aws_config_1 = require("./aws-config");
const logger_1 = require("./logger");
class DatabaseService {
    constructor() {
        this.tableName = process.env.DYNAMODB_TABLE_NAME || 'scraper_db';
    }
    async putItem(item) {
        const params = {
            TableName: this.tableName,
            Item: (0, util_dynamodb_1.marshall)(item, { removeUndefinedValues: true }),
        };
        try {
            const { Attributes } = await aws_config_1.dynamoClient.send(new client_dynamodb_1.PutItemCommand(params));
            logger_1.logger.debug("DynamoDB putItem success", { tableName: this.tableName, itemId: item.id });
            return { data: Attributes ? (0, util_dynamodb_1.unmarshall)(Attributes) : undefined };
        }
        catch (error) {
            const err = error;
            logger_1.logger.error("DynamoDB putItem failed", { error: err.message, tableName: this.tableName, itemId: item.id });
            return { error: err };
        }
    }
    async getItem(key) {
        const params = {
            TableName: this.tableName,
            Key: (0, util_dynamodb_1.marshall)(key),
        };
        try {
            const { Item } = await aws_config_1.dynamoClient.send(new client_dynamodb_1.GetItemCommand(params));
            const data = Item ? (0, util_dynamodb_1.unmarshall)(Item) : undefined;
            logger_1.logger.debug("DynamoDB getItem success", { tableName: this.tableName, key });
            return { data };
        }
        catch (error) {
            const err = error;
            logger_1.logger.error("DynamoDB getItem failed", { error: err.message, tableName: this.tableName, key });
            return { error: err };
        }
    }
    async updateItem(key, updates) {
        const updateExpression = Object.keys(updates)
            .map(key => `#${key} = :${key}`)
            .join(', ');
        const expressionAttributeNames = Object.keys(updates).reduce((acc, key) => {
            acc[`#${key}`] = key;
            return acc;
        }, {});
        const expressionAttributeValues = Object.keys(updates).reduce((acc, key) => {
            acc[`:${key}`] = updates[key];
            return acc;
        }, {});
        const params = {
            TableName: this.tableName,
            Key: (0, util_dynamodb_1.marshall)(key),
            UpdateExpression: `SET ${updateExpression}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: (0, util_dynamodb_1.marshall)(expressionAttributeValues),
            ReturnValues: 'ALL_NEW',
        };
        try {
            const { Attributes } = await aws_config_1.dynamoClient.send(new client_dynamodb_1.UpdateItemCommand(params));
            const data = Attributes ? (0, util_dynamodb_1.unmarshall)(Attributes) : undefined;
            logger_1.logger.debug("DynamoDB updateItem success", { tableName: this.tableName, key });
            return { data };
        }
        catch (error) {
            const err = error;
            logger_1.logger.error("DynamoDB updateItem failed", { error: err.message, tableName: this.tableName, key });
            return { error: err };
        }
    }
    async queryItems(partitionKey, sortKeyPrefix) {
        let keyConditionExpression = 'PK = :pk';
        const expressionAttributeValues = {
            ':pk': partitionKey,
        };
        if (sortKeyPrefix) {
            keyConditionExpression += ' AND begins_with(SK, :sk)';
            expressionAttributeValues[':sk'] = sortKeyPrefix;
        }
        const params = {
            TableName: this.tableName,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: (0, util_dynamodb_1.marshall)(expressionAttributeValues),
        };
        try {
            const { Items } = await aws_config_1.dynamoClient.send(new client_dynamodb_1.QueryCommand(params));
            const data = Items ? Items.map((item) => (0, util_dynamodb_1.unmarshall)(item)) : [];
            logger_1.logger.debug("DynamoDB queryItems success", { tableName: this.tableName, partitionKey, count: data.length });
            return { data };
        }
        catch (error) {
            const err = error;
            logger_1.logger.error("DynamoDB queryItems failed", { error: err.message, tableName: this.tableName, partitionKey });
            return { error: err };
        }
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=database.js.map