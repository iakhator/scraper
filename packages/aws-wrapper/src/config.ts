import {DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { SQSClient, SQSClientConfig } from "@aws-sdk/client-sqs";
import { cleanEnv, str, num, url } from 'envalid';

// Validate environment variables
const env = cleanEnv(process.env, {
  AWS_REGION: str({ default: 'us-east-1' }),
  AWS_ACCESS_KEY_ID: str(),
  AWS_SECRET_ACCESS_KEY: str(),
  LOCAL_ENDPOINT: str({ default: undefined }),
  SQS_QUEUE_URL: url(),
  SQS_DLQ_URL: url({ default: undefined }),
  DYNAMODB_TABLE: str({ default: 'scrape_db' }),
  QUEUE_BATCH_SIZE: num({ default: 10 }),
  PAGE_TIMEOUT: num({ default: 15000 }),
});

export interface AWSWrapperConfig {
  dynamodb?: DynamoDBClientConfig;
  sqs?: SQSClientConfig;
  queueUrl?: string;
  dlqUrl?: string;
  tableName?: string;
  batchMessages?: number,
  pageTimeout?: number
}

export const config: AWSWrapperConfig = {
  batchMessages: env.QUEUE_BATCH_SIZE,
  queueUrl: env.SQS_QUEUE_URL,
  dlqUrl: env.SQS_DLQ_URL,
  tableName: env.DYNAMODB_TABLE,
  pageTimeout: env.PAGE_TIMEOUT,  
};

const clientConfig = {
  endpoint: env.LOCAL_ENDPOINT,
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  maxAttempts: 3,
  retryMode: 'standard',
};

export const dynamoClient = new DynamoDBClient(clientConfig);
export const sqsClient = new SQSClient(clientConfig);
