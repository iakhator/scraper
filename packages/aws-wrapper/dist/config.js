"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqsClient = exports.dynamoClient = exports.config = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_sqs_1 = require("@aws-sdk/client-sqs");
const envalid_1 = require("envalid");
// Validate environment variables
const env = (0, envalid_1.cleanEnv)(process.env, {
    AWS_REGION: (0, envalid_1.str)({ default: 'us-east-1' }),
    AWS_ACCESS_KEY_ID: (0, envalid_1.str)(),
    AWS_SECRET_ACCESS_KEY: (0, envalid_1.str)(),
    SQS_QUEUE_URL: (0, envalid_1.url)(),
    SQS_DLQ_URL: (0, envalid_1.url)({ default: undefined }),
    DYNAMODB_TABLE: (0, envalid_1.str)({ default: 'scrape_db' }),
    QUEUE_BATCH_SIZE: (0, envalid_1.num)({ default: 10 }),
    PAGE_TIMEOUT: (0, envalid_1.num)({ default: 15000 }),
});
exports.config = {
    batchMessages: env.QUEUE_BATCH_SIZE,
    queueUrl: env.SQS_QUEUE_URL,
    dlqUrl: env.SQS_DLQ_URL,
    tableName: env.DYNAMODB_TABLE,
    pageTimeout: env.PAGE_TIMEOUT,
};
const clientConfig = {
    region: env.AWS_REGION,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    maxAttempts: 3,
    retryMode: 'standard',
};
exports.dynamoClient = new client_dynamodb_1.DynamoDBClient(clientConfig);
exports.sqsClient = new client_sqs_1.SQSClient(clientConfig);
