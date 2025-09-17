import {
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { dynamoClient } from "./aws-config";
import { DynamoItem, DynamoKey, DynamoReturn } from "../types";
import { logger } from "./logger";

export class DatabaseService {
  private tableName: string;

  constructor() {
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'scraper_db';
  }

  async putItem(item: DynamoItem): Promise<DynamoReturn<DynamoItem>> {
    const params = {
      TableName: this.tableName,
      Item: marshall(item, { removeUndefinedValues: true }),
    };

    try {
      const { Attributes } = await dynamoClient.send(new PutItemCommand(params));
      logger.debug("DynamoDB putItem success", { tableName: this.tableName, itemId: item.id });
      return { data: Attributes ? unmarshall(Attributes) : undefined };
    } catch (error) {
      const err = error as Error;
      logger.error("DynamoDB putItem failed", { error: err.message, tableName: this.tableName, itemId: item.id });
      return { error: err };
    }
  }

  async getItem(key: DynamoKey): Promise<DynamoReturn<DynamoItem>> {
    const params = {
      TableName: this.tableName,
      Key: marshall(key),
    };

    try {
      const { Item } = await dynamoClient.send(new GetItemCommand(params));
      const data = Item ? unmarshall(Item) : undefined;
      logger.debug("DynamoDB getItem success", { tableName: this.tableName, key });
      return { data };
    } catch (error) {
      const err = error as Error;
      logger.error("DynamoDB getItem failed", { error: err.message, tableName: this.tableName, key });
      return { error: err };
    }
  }

  async updateItem(key: DynamoKey, updates: Record<string, any>): Promise<DynamoReturn<DynamoItem>> {
    const updateExpression = Object.keys(updates)
      .map(key => `#${key} = :${key}`)
      .join(', ');
    
    const expressionAttributeNames = Object.keys(updates).reduce((acc, key) => {
      acc[`#${key}`] = key;
      return acc;
    }, {} as Record<string, string>);

    const expressionAttributeValues = Object.keys(updates).reduce((acc, key) => {
      acc[`:${key}`] = updates[key];
      return acc;
    }, {} as Record<string, any>);

    const params = {
      TableName: this.tableName,
      Key: marshall(key),
      UpdateExpression: `SET ${updateExpression}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ReturnValues: 'ALL_NEW' as const,
    };

    try {
      const { Attributes } = await dynamoClient.send(new UpdateItemCommand(params));
      const data = Attributes ? unmarshall(Attributes) : undefined;
      logger.debug("DynamoDB updateItem success", { tableName: this.tableName, key });
      return { data };
    } catch (error) {
      const err = error as Error;
      logger.error("DynamoDB updateItem failed", { error: err.message, tableName: this.tableName, key });
      return { error: err };
    }
  }

  async queryItems(partitionKey: string, sortKeyPrefix?: string): Promise<DynamoReturn<DynamoItem[]>> {
    let keyConditionExpression = 'PK = :pk';
    const expressionAttributeValues: Record<string, any> = {
      ':pk': partitionKey,
    };

    if (sortKeyPrefix) {
      keyConditionExpression += ' AND begins_with(SK, :sk)';
      expressionAttributeValues[':sk'] = sortKeyPrefix;
    }

    const params = {
      TableName: this.tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
    };

    try {
      const { Items } = await dynamoClient.send(new QueryCommand(params));
      const data = Items ? Items.map((item: any) => unmarshall(item)) : [];
      logger.debug("DynamoDB queryItems success", { tableName: this.tableName, partitionKey, count: data.length });
      return { data };
    } catch (error) {
      const err = error as Error;
      logger.error("DynamoDB queryItems failed", { error: err.message, tableName: this.tableName, partitionKey });
      return { error: err };
    }
  }
}
