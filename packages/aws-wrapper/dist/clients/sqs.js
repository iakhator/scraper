"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = sendMessage;
exports.receiveMessages = receiveMessages;
exports.deleteMessage = deleteMessage;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const config_1 = require("../config");
const logger_1 = require("@scraper/logger");
/**
 * Send message to SQS queue with error handling
 */
async function sendMessage(message) {
    try {
        const result = await config_1.sqsClient.send(new client_sqs_1.SendMessageCommand({
            QueueUrl: config_1.config.queueUrl,
            MessageBody: JSON.stringify(message),
            MessageAttributes: {
                priority: {
                    DataType: 'String',
                    StringValue: message.priority,
                },
            },
        }));
        logger_1.logger.debug("Message sent successfully", {
            messageId: result.MessageId,
            queueUrl: message.url
        });
        return { messageId: result.MessageId };
    }
    catch (error) {
        logger_1.logger.error("Failed to send SQS message", {
            error,
            queueUrl: message.url,
        });
        throw wrapSqsError(error, "sendMessage");
    }
}
/**
 * Receive messages from SQS queue with error handling
 */
async function receiveMessages(params) {
    const command = new client_sqs_1.ReceiveMessageCommand({
        QueueUrl: config_1.config.queueUrl,
        WaitTimeSeconds: 20,
        MaxNumberOfMessages: config_1.config.batchMessages || 10,
        ...params, // Allow overriding defaults with passed parameters
    });
    try {
        const result = await config_1.sqsClient.send(command);
        logger_1.logger.debug("Messages received", {
            count: result.Messages?.length || 0,
            queueUrl: config_1.config.queueUrl
        });
        return { messages: result.Messages || [] };
    }
    catch (error) {
        logger_1.logger.error("Failed to receive SQS messages", {
            error,
            queueUrl: config_1.config.queueUrl
        });
        throw wrapSqsError(error, "receiveMessages");
    }
}
/**
 * Delete message from SQS queue with error handling
 */
async function deleteMessage(params) {
    const command = new client_sqs_1.DeleteMessageCommand(params);
    try {
        await config_1.sqsClient.send(command);
        logger_1.logger.debug("Message deleted successfully", {
            receiptHandle: params.ReceiptHandle,
            queueUrl: params.QueueUrl
        });
    }
    catch (error) {
        logger_1.logger.error("Failed to delete SQS message", {
            error,
            queueUrl: params.QueueUrl,
            receiptHandle: params.ReceiptHandle
        });
        throw wrapSqsError(error, "deleteMessage");
    }
}
/**
 * Helper to standardize SQS error handling
 */
function wrapSqsError(error, operation) {
    if (error instanceof client_sqs_1.SQSServiceException) {
        return new Error(`SQS operation ${operation} failed: ${error.message}`);
    }
    return new Error(`Unexpected error during SQS ${operation}: ${error instanceof Error ? error.message : String(error)}`);
}
