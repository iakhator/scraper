import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";

// AWS Configuration
const region = process.env.AWS_REGION || 'us-east-1';
const endpoint = process.env.AWS_ENDPOINT_URL;

export const dynamoClient = new DynamoDBClient({
  region,
  ...(endpoint && { endpoint })
});

export const sqsClient = new SQSClient({
  region,
  ...(endpoint && { endpoint })
});
