"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.putItem = putItem;
exports.getItem = getItem;
exports.updateItem = updateItem;
exports.deleteItem = deleteItem;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const config_1 = require("../config");
const logger_1 = require("@scraper/logger");
async function putItem(tableName, item, options) {
    const params = {
        TableName: tableName,
        Item: (0, util_dynamodb_1.marshall)(item, { removeUndefinedValues: true }),
        ConditionExpression: options?.conditionExpression,
    };
    try {
        const { Attributes } = await config_1.dynamoClient.send(new client_dynamodb_1.PutItemCommand(params));
        logger_1.logger.debug("DynamoDB putItem success", { tableName, itemId: item.id });
        return { data: Attributes ? (0, util_dynamodb_1.unmarshall)(Attributes) : undefined };
    }
    catch (error) {
        const err = handleDynamoError(error, "putItem", { tableName, itemId: item.id });
        logger_1.logger.error("DynamoDB putItem failed", { error: err.message, tableName, itemId: item.id });
        return { error: err };
    }
}
async function getItem(tableName, key, options) {
    const params = {
        TableName: tableName,
        Key: (0, util_dynamodb_1.marshall)(key),
        ConsistentRead: options?.consistentRead || false,
    };
    try {
        const { Item } = await config_1.dynamoClient.send(new client_dynamodb_1.GetItemCommand(params));
        if (!Item) {
            logger_1.logger.debug("DynamoDB getItem not found", { tableName, key });
            return { data: undefined };
        }
        logger_1.logger.debug("DynamoDB getItem success", { tableName, key });
        return { data: (0, util_dynamodb_1.unmarshall)(Item) };
    }
    catch (error) {
        const err = handleDynamoError(error, "getItem", { tableName, key });
        logger_1.logger.error("DynamoDB getItem failed", { error: err.message, tableName, key });
        return { error: err };
    }
}
async function updateItem(tableName, key, updateExpression, expressionAttributeValues, options) {
    const params = {
        TableName: tableName,
        Key: (0, util_dynamodb_1.marshall)(key),
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: (0, util_dynamodb_1.marshall)(expressionAttributeValues, { removeUndefinedValues: true }),
        ReturnValues: options?.returnValues || "UPDATED_NEW",
    };
    if (options?.conditionExpression) {
        params.ConditionExpression = options.conditionExpression;
    }
    if (options?.expressionAttributeNames) {
        params.ExpressionAttributeNames = options.expressionAttributeNames;
    }
    try {
        const { Attributes } = await config_1.dynamoClient.send(new client_dynamodb_1.UpdateItemCommand(params));
        logger_1.logger.debug("DynamoDB updateItem success", { tableName, key });
        return { data: Attributes ? (0, util_dynamodb_1.unmarshall)(Attributes) : undefined };
    }
    catch (error) {
        const err = handleDynamoError(error, "updateItem", { tableName, key });
        logger_1.logger.error("DynamoDB updateItem failed", { error: err.message, tableName, key });
        return { error: err };
    }
}
async function deleteItem(tableName, key, options) {
    const params = {
        TableName: tableName,
        Key: (0, util_dynamodb_1.marshall)(key),
        ConditionExpression: options?.conditionExpression,
        ReturnValues: options?.returnValues || "ALL_OLD",
    };
    try {
        const { Attributes } = await config_1.dynamoClient.send(new client_dynamodb_1.DeleteItemCommand(params));
        logger_1.logger.debug("DynamoDB deleteItem success", { tableName, key });
        return { data: Attributes ? (0, util_dynamodb_1.unmarshall)(Attributes) : undefined };
    }
    catch (error) {
        const err = handleDynamoError(error, "deleteItem", { tableName, key });
        logger_1.logger.error("DynamoDB deleteItem failed", { error: err.message, tableName, key });
        return { error: err };
    }
}
function handleDynamoError(error, operation, context) {
    if (error instanceof client_dynamodb_1.DynamoDBServiceException) {
        error.operation = operation;
        error.context = context;
        return error;
    }
    const baseError = error instanceof Error ? error : new Error(String(error));
    baseError.operation = operation;
    baseError.context = context;
    return baseError;
}
