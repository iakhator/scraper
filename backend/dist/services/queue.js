"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const aws_config_1 = require("./aws-config");
const logger_1 = require("./logger");
class QueueService {
    constructor() {
        this.queueUrl = process.env.QUEUE_URL || '';
        if (!this.queueUrl) {
            throw new Error('QUEUE_URL environment variable is required');
        }
    }
    async sendMessage(message) {
        try {
            const result = await aws_config_1.sqsClient.send(new client_sqs_1.SendMessageCommand({
                QueueUrl: this.queueUrl,
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
                jobId: message.jobId
            });
            return { messageId: result.MessageId };
        }
        catch (error) {
            const err = error;
            logger_1.logger.error("Failed to send SQS message", {
                error: err.message,
                jobId: message.jobId,
            });
            throw err;
        }
    }
    async receiveMessages(maxMessages = 10) {
        try {
            const result = await aws_config_1.sqsClient.send(new client_sqs_1.ReceiveMessageCommand({
                QueueUrl: this.queueUrl,
                MaxNumberOfMessages: maxMessages,
                WaitTimeSeconds: 20,
                MessageAttributeNames: ['All'],
            }));
            const messages = result.Messages || [];
            logger_1.logger.debug("Received messages from queue", { count: messages.length });
            return messages.map((msg) => ({
                MessageId: msg.MessageId,
                ReceiptHandle: msg.ReceiptHandle,
                Body: msg.Body,
                Attributes: msg.Attributes,
            }));
        }
        catch (error) {
            const err = error;
            logger_1.logger.error("Failed to receive SQS messages", { error: err.message });
            throw err;
        }
    }
    async deleteMessage(receiptHandle) {
        try {
            await aws_config_1.sqsClient.send(new client_sqs_1.DeleteMessageCommand({
                QueueUrl: this.queueUrl,
                ReceiptHandle: receiptHandle,
            }));
            logger_1.logger.debug("Message deleted successfully", { receiptHandle });
        }
        catch (error) {
            const err = error;
            logger_1.logger.error("Failed to delete SQS message", {
                error: err.message,
                receiptHandle
            });
            throw err;
        }
    }
}
exports.QueueService = QueueService;
//# sourceMappingURL=queue.js.map