import { S3ClientConfig } from "@aws-sdk/client-s3";
import { DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { SQSClientConfig } from "@aws-sdk/client-sqs";
import { getEnvVar } from "../utils/env";

export interface AWSWrapperConfig {
  region: string;
  s3?: S3ClientConfig;
  dynamodb?: DynamoDBClientConfig;
  sqs?: SQSClientConfig;
  queueUrl?: string;
  dlqUrl?: string;
  scrapedContentTable?: string;
  scrapeJobsTable?: string;
}

export let globalConfig: AWSWrapperConfig = {
  region: getEnvVar("AWS_REGION") ?? "us-east-2",
  queueUrl: getEnvVar("SQS_QUEUE_URL") ?? "",
  dlqUrl: getEnvVar("SQS_DLQ_URL") ?? "",
  scrapedContentTable: getEnvVar("DYNAMODB_SCRAPED_CONTENT_TABLE") ?? "scraped-db",
  scrapeJobsTable: getEnvVar("DYNAMODB_SCRAPE_JOBS_TABLE") ?? "scrape-jobs",
};

export function configureAWS(awsConfig: AWSWrapperConfig) {
  if (!awsConfig.region) {
    throw new Error("AWS region is required");
  }
  globalConfig = {
    ...globalConfig,
    ...awsConfig,
  };
}
