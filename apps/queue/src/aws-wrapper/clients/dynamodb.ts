import {
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  DynamoDBServiceException,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { dynamoClient } from "../config";
import logger from "../../utils/logger";

// types definition
type DynamoItem = Record<string, any>;
type DynamoKey = Record<string, any>;
type DynamoReturn<T> = { data?: T; error?: Error };

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
    logger.error("DynamoDB putItem failed", { error: err, tableName, itemId: item.id });
    return { error: err };
  }
}

export async function getItem(
  tableName: string,
  key: DynamoKey,
  options?: { consistentRead?: boolean }
): Promise<DynamoReturn<DynamoItem>> {
  // const client = getClient();
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
    logger.error("DynamoDB getItem failed", { error: err, tableName, key });
    return { error: err };
  }
}

export async function updateItem(
  tableName: string,
  key: DynamoKey,
  updateExpression: string,
  expressionAttributeValues: Record<string, any>,
  options?: { conditionExpression?: string; returnValues?:  "NONE" | "ALL_OLD" | "UPDATED_OLD" | "ALL_NEW" | "UPDATED_NEW" }
): Promise<DynamoReturn<DynamoItem>> {
  // const client = getClient();
  const params = {
    TableName: tableName,
    Key: marshall(key),
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: marshall(expressionAttributeValues, { removeUndefinedValues: true }),
    ConditionExpression: options?.conditionExpression,
    ReturnValues: options?.returnValues || "UPDATED_NEW",
  };

  try {
    const { Attributes } = await dynamoClient.send(new UpdateItemCommand(params));
    logger.debug("DynamoDB updateItem success", { tableName, key });
    return { data: Attributes ? unmarshall(Attributes) : undefined };
  } catch (error) {
    const err = handleDynamoError(error, "updateItem", { tableName, key });
    logger.error("DynamoDB updateItem failed", { error: err, tableName, key });
    return { error: err };
  }
}

export async function deleteItem(
  tableName: string,
  key: DynamoKey,
  options?: { conditionExpression?: string; returnValues?: "NONE" | "ALL_OLD" }
): Promise<DynamoReturn<DynamoItem>> {
  // const client = getClient();
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
    logger.error("DynamoDB deleteItem failed", { error: err, tableName, key });
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
