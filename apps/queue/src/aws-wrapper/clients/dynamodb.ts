import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  BatchWriteItemCommand,
  DynamoDBClientConfig,
  DynamoDBServiceException,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { globalConfig } from "../config";
import logger from "../logger";

// types definition
type DynamoItem = Record<string, any>;
type DynamoKey = Record<string, any>;
type DynamoReturn<T> = { data?: T; error?: Error };

// config
const DEFAULT_CONFIG: DynamoDBClientConfig = {
  region: globalConfig.region,
  retryMode: "standard",
  ...(globalConfig.dynamodb || {}), 
};

let dynamoClient: DynamoDBClient;

function getClient(): DynamoDBClient {
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient(DEFAULT_CONFIG);
    logger.debug("DynamoDB client initialized", { region: DEFAULT_CONFIG.region });
  }
  return dynamoClient;
}


export async function putItem(
  tableName: string,
  item: DynamoItem,
  options?: { conditionExpression?: string }
): Promise<DynamoReturn<DynamoItem>> {
  const client = getClient();
  const params = {
    TableName: tableName,
    Item: marshall(item, { removeUndefinedValues: true }),
    ConditionExpression: options?.conditionExpression,
  };

  try {
    const { Attributes } = await client.send(new PutItemCommand(params));
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
  const client = getClient();
  const params = {
    TableName: tableName,
    Key: marshall(key),
    ConsistentRead: options?.consistentRead || false,
  };

  try {
    const { Item } = await client.send(new GetItemCommand(params));
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
