import {DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { SQSClient, SQSClientConfig } from "@aws-sdk/client-sqs";
import { getEnvVar } from "../utils/env";

export interface AWSWrapperConfig {
  dynamodb?: DynamoDBClientConfig;
  sqs?: SQSClientConfig;
  queueUrl?: string;
  dlqUrl?: string;
  tableName?: string;
}

export const config: AWSWrapperConfig = {
  queueUrl: getEnvVar("SQS_QUEUE_URL") ?? "",
  dlqUrl: getEnvVar("SQS_DLQ_URL") ?? "",
  tableName: getEnvVar("DYNAMODB_TABLE") ?? "scrape_db",
};

const clientConfig = {
  region: getEnvVar("AWS_REGION") ?? "us-east-2",
  credentials: {
    accessKeyId: getEnvVar("AWS_ACCESS_KEY_ID"),
    secretAccessKey: getEnvVar("AWS_SECRET_ACCESS_KEY"),
  },
  maxAttempts: 3,
  retryMode: 'standard',
};

export const dynamoClient = new DynamoDBClient(clientConfig);
export const sqsClient = new SQSClient(clientConfig);
