import { S3ClientConfig } from "@aws-sdk/client-s3";
import { DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";

export interface AWSWrapperConfig {
  region?: string;
  s3?: S3ClientConfig;
  dynamodb?: DynamoDBClientConfig;
}

export let globalConfig: AWSWrapperConfig = {};

export function configureAWS(config: AWSWrapperConfig) {
  globalConfig = config;
}
