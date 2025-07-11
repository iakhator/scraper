import { S3ClientConfig } from "@aws-sdk/client-s3";
import { DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { SQSClientConfig } from "@aws-sdk/client-sqs";

export interface AWSWrapperConfig {
  region?: string;
  s3?: S3ClientConfig;
  dynamodb?: DynamoDBClientConfig;
  sqs?: SQSClientConfig;
}

export let globalConfig: AWSWrapperConfig = {};

export function configureAWS(config: AWSWrapperConfig) {
  globalConfig = config;
}
