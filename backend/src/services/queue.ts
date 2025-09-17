import {
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { sqsClient } from "./aws-config";
import { QueueMessage, Message } from "../types";
import { logger } from "./logger";

export class QueueService {
  private queueUrl: string;

  constructor() {
    this.queueUrl = process.env.QUEUE_URL || '';
    if (!this.queueUrl) {
      throw new Error('QUEUE_URL environment variable is required');
    }
  }

  async sendMessage(message: QueueMessage): Promise<{ messageId: string }> {
    try {
      const result = await sqsClient.send(new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          priority: {
            DataType: 'String',
            StringValue: message.priority,
          },
        },
      }));
      
      logger.debug("Message sent successfully", { 
        messageId: result.MessageId,
        jobId: message.jobId 
      });
      
      return { messageId: result.MessageId! };
    } catch (error) {
      const err = error as Error;
      logger.error("Failed to send SQS message", { 
        error: err.message,
        jobId: message.jobId,
      });
      throw err;
    }
  }

  async receiveMessages(maxMessages: number = 10): Promise<Message[]> {
    try {
      const result = await sqsClient.send(new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: 20,
        MessageAttributeNames: ['All'],
      }));

      const messages = result.Messages || [];
      logger.debug("Received messages from queue", { count: messages.length });
      
      return messages.map((msg: any) => ({
        MessageId: msg.MessageId,
        ReceiptHandle: msg.ReceiptHandle,
        Body: msg.Body,
        Attributes: msg.Attributes,
      }));
    } catch (error) {
      const err = error as Error;
      logger.error("Failed to receive SQS messages", { error: err.message });
      throw err;
    }
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    try {
      await sqsClient.send(new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      }));
      
      logger.debug("Message deleted successfully", { receiptHandle });
    } catch (error) {
      const err = error as Error;
      logger.error("Failed to delete SQS message", { 
        error: err.message, 
        receiptHandle 
      });
      throw err;
    }
  }
}
