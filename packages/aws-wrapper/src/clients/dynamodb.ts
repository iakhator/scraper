import {
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand,
  DynamoDBServiceException,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { dynamoClient } from "../config";
import { DynamoItem, DynamoKey, DynamoReturn } from '@iakhator/scraper-types';
import { logger } from '@iakhator/scraper-logger';

export async function putItem(
  tableName: string,
  item: DynamoItem,
  options?: { conditionExpression?: string }
): Promise<DynamoReturn<DynamoItem>> {

  const params = {
    TableName: tableName,
    Item: marshall(item, { removeUndefinedValues: true }),
    ConditionExpression: options?.conditionExpression,
  };

  try {
    const { Attributes } = await dynamoClient.send(new PutItemCommand(params));
    logger.debug("DynamoDB putItem success", { tableName, itemId: item.id });
    return { data: Attributes ? unmarshall(Attributes) : undefined };
  } catch (error) {
    const err = handleDynamoError(error, "putItem", { tableName, itemId: item.id });
    logger.error("DynamoDB putItem failed", { error: err.message, tableName, itemId: item.id });
    return { error: err };
  }
}

export async function getItem(
  tableName: string,
  key: DynamoKey,
  options?: { consistentRead?: boolean }
): Promise<DynamoReturn<DynamoItem>> {
  const params = {
    TableName: tableName,
    Key: marshall(key),
    ConsistentRead: options?.consistentRead || false,
  };

  try {
    const { Item } = await dynamoClient.send(new GetItemCommand(params));
    if (!Item) {
      logger.debug("DynamoDB getItem not found", { tableName, key });
      return { data: undefined };
    }
    logger.debug("DynamoDB getItem success", { tableName, key });
    return { data: unmarshall(Item) };
  } catch (error) {
    const err = handleDynamoError(error, "getItem", { tableName, key });
    logger.error("DynamoDB getItem failed", { error: err.message, tableName, key });
    return { error: err };
  }
}

export async function updateItem(
  tableName: string,
  key: DynamoKey,
  updateExpression: string,
  expressionAttributeValues: Record<string, any>,
  options?: { 
    conditionExpression?: string; 
    returnValues?: "NONE" | "ALL_OLD" | "UPDATED_OLD" | "ALL_NEW" | "UPDATED_NEW";
    expressionAttributeNames?: Record<string, string>;
  }
): Promise<DynamoReturn<DynamoItem>> {
  const params: any = {
    TableName: tableName,
    Key: marshall(key),
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: marshall(expressionAttributeValues, { removeUndefinedValues: true }),
    ReturnValues: options?.returnValues || "UPDATED_NEW",
  };

  if (options?.conditionExpression) {
    params.ConditionExpression = options.conditionExpression;
  }

  if (options?.expressionAttributeNames) {
    params.ExpressionAttributeNames = options.expressionAttributeNames;
  }

  try {
    const { Attributes } = await dynamoClient.send(new UpdateItemCommand(params));
    logger.debug("DynamoDB updateItem success", { tableName, key });
    return { data: Attributes ? unmarshall(Attributes) : undefined };
  } catch (error) {
    const err = handleDynamoError(error, "updateItem", { tableName, key });
    logger.error("DynamoDB updateItem failed", { error: err.message, tableName, key });
    return { error: err };
  }
}

export async function queryItems(
  tableName: string,
  options?: {
    indexName?: string;
    keyConditionExpression?: string;
    filterExpression?: string;
    expressionAttributeValues?: Record<string, any>;
    expressionAttributeNames?: Record<string, string>;
    limit?: number;
    scanIndexForward?: boolean;
  }
): Promise<DynamoReturn<DynamoItem[]>> {
  const params = {
    TableName: tableName,
    IndexName: options?.indexName,
    KeyConditionExpression: options?.keyConditionExpression,
    FilterExpression: options?.filterExpression,
    ExpressionAttributeValues: options?.expressionAttributeValues 
      ? marshall(options.expressionAttributeValues, { removeUndefinedValues: true })
      : undefined,
    ExpressionAttributeNames: options?.expressionAttributeNames,
    Limit: options?.limit,
    ScanIndexForward: options?.scanIndexForward,
  };

  try {
    const { Items } = await dynamoClient.send(new QueryCommand(params));
    const items = Items ? Items.map(item => unmarshall(item)) : [];
    logger.debug("DynamoDB queryItems success", { 
      tableName, 
      indexName: options?.indexName,
      itemCount: items.length 
    });
    return { data: items };
  } catch (error) {
    const err = handleDynamoError(error, "queryItems", { 
      tableName, 
      indexName: options?.indexName 
    });
    logger.error("DynamoDB queryItems failed", { 
      error: err.message, 
      tableName, 
      indexName: options?.indexName 
    });
    return { error: err };
  }
}

export async function scanItems(
  tableName: string,
  options?: {
    filterExpression?: string;
    expressionAttributeValues?: Record<string, any>;
    expressionAttributeNames?: Record<string, string>;
    limit?: number;
  }
): Promise<DynamoReturn<DynamoItem[]>> {
  const params = {
    TableName: tableName,
    FilterExpression: options?.filterExpression,
    ExpressionAttributeValues: options?.expressionAttributeValues 
      ? marshall(options.expressionAttributeValues, { removeUndefinedValues: true })
      : undefined,
    ExpressionAttributeNames: options?.expressionAttributeNames,
    Limit: options?.limit,
  };

  try {
    const { Items } = await dynamoClient.send(new ScanCommand(params));
    const items = Items ? Items.map(item => unmarshall(item)) : [];
    logger.debug("DynamoDB scanItems success", { 
      tableName, 
      itemCount: items.length 
    });
    return { data: items };
  } catch (error) {
    const err = handleDynamoError(error, "scanItems", { tableName });
    logger.error("DynamoDB scanItems failed", { 
      error: err.message, 
      tableName 
    });
    return { error: err };
  }
}

export async function deleteItem(
  tableName: string,
  key: DynamoKey,
  options?: { conditionExpression?: string; returnValues?: "NONE" | "ALL_OLD" }
): Promise<DynamoReturn<DynamoItem>> {
  const params = {
    TableName: tableName,
    Key: marshall(key),
    ConditionExpression: options?.conditionExpression,
    ReturnValues: options?.returnValues || "ALL_OLD",
  };

  try {
    const { Attributes } = await dynamoClient.send(new DeleteItemCommand(params));
    logger.debug("DynamoDB deleteItem success", { tableName, key });
    return { data: Attributes ? unmarshall(Attributes) : undefined };
  } catch (error) {
    const err = handleDynamoError(error, "deleteItem", { tableName, key });
    logger.error("DynamoDB deleteItem failed", { error: err.message, tableName, key });
    return { error: err };
  }
}

function handleDynamoError(
  error: unknown,
  operation: string,
  context: Record<string, any>
): Error {
  if (error instanceof DynamoDBServiceException) {
    (error as any).operation = operation;
    (error as any).context = context;
    return error;
  }
  
  const baseError = error instanceof Error ? error : new Error(String(error));
  (baseError as any).operation = operation;
  (baseError as any).context = context;
  return baseError;
}
