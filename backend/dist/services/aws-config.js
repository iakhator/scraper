"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqsClient = exports.dynamoClient = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_sqs_1 = require("@aws-sdk/client-sqs");
// AWS Configuration
const region = process.env.AWS_REGION || 'us-east-1';
const endpoint = process.env.AWS_ENDPOINT_URL;
exports.dynamoClient = new client_dynamodb_1.DynamoDBClient({
    region,
    ...(endpoint && { endpoint })
});
exports.sqsClient = new client_sqs_1.SQSClient({
    region,
    ...(endpoint && { endpoint })
});
//# sourceMappingURL=aws-config.js.map