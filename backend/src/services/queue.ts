import {
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";
import { sqsClient } from "./aws-config";
import { QueueMessage, Message, QueueStats } from "../types";
import { createChildLogger } from "./logger";

const logger = createChildLogger("queue");

export class QueueService {
  private queueUrl: string;

  constructor() {
    this.queueUrl = process.env.SQS_QUEUE_URL || "";
    if (!this.queueUrl) {
      throw new Error("SQS_QUEUE_URL environment variable is required");
    }
  }

  async sendMessage(message: QueueMessage): Promise<{ messageId: string }> {
    try {
      const result = await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify(message),
          MessageAttributes: {
            priority: {
              DataType: "String",
              StringValue: message.priority,
            },
          },
        }),
      );

      logger.debug("Message sent successfully", {
        messageId: result.MessageId,
        jobId: message.jobId,
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
      const result = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: maxMessages,
          WaitTimeSeconds: 20,
          MessageAttributeNames: ["All"],
        }),
      );

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
      await sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: receiptHandle,
        }),
      );

      logger.debug("Message deleted successfully", { receiptHandle });
    } catch (error) {
      const err = error as Error;
      logger.error("Failed to delete SQS message", {
        error: err.message,
        receiptHandle,
      });
      throw err;
    }
  }

  async getQueueAttributes(): Promise<QueueStats> {
    try {
      const result = await sqsClient.send(
        new GetQueueAttributesCommand({
          QueueUrl: this.queueUrl,
          AttributeNames: [
            "ApproximateNumberOfMessages",
            "ApproximateNumberOfMessagesNotVisible",
            "ApproximateNumberOfMessagesDelayed",
          ],
        }),
      );

      const attrs = result.Attributes || {};
      return {
        messagesAvailable: parseInt(attrs.ApproximateNumberOfMessages || "0"),
        messagesInFlight: parseInt(
          attrs.ApproximateNumberOfMessagesNotVisible || "0",
        ),
        messagesDelayed: parseInt(
          attrs.ApproximateNumberOfMessagesDelayed || "0",
        ),
      };
    } catch (error) {
      const err = error as Error;
      logger.error("Failed to get queue attributes", { error: err.message });
      // Return zeroes so a queue error doesn't break the stats endpoint
      return { messagesAvailable: 0, messagesInFlight: 0, messagesDelayed: 0 };
    }
  }
}
