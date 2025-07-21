import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { SQSClient, SQSClientConfig } from "@aws-sdk/client-sqs";
export interface AWSWrapperConfig {
    dynamodb?: DynamoDBClientConfig;
    sqs?: SQSClientConfig;
    queueUrl?: string;
    dlqUrl?: string;
    tableName?: string;
    batchMessages?: number;
    pageTimeout?: number;
}
export declare const config: AWSWrapperConfig;
export declare const dynamoClient: DynamoDBClient;
export declare const sqsClient: SQSClient;
