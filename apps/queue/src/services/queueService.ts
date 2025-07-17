import {  DeleteMessageCommandInput, ReceiveMessageCommandInput } from '@aws-sdk/client-sqs';
import { QueueMessage, QueueAttributes, Message } from '../types';
import { config } from "../aws-wrapper";

import logger from '../utils/logger';

interface ISQSOperations{
  sendMessage: (message: QueueMessage) => Promise<{ messageId: string }>,
  receiveMessages: (message: ReceiveMessageCommandInput) => Promise<{ messages: Message[] }>,
  deleteMessage: (receiptHandle: DeleteMessageCommandInput) => Promise<void>
}

export class QueueService {
  private sqs: ISQSOperations;

  constructor(sqs: ISQSOperations) {
    this.sqs = sqs;
  }

  async sendMessage(message: QueueMessage): Promise<{ messageId: string }> {
    try {
      const result = await this.sqs.sendMessage(message);

      logger.info(`Message sent to queue: ${message.jobId}`);
      return result
    } catch (error: any) {
      const errorMessage = `Failed to send message to queue for job ${message.jobId}: ${error.message}`;
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  // async receiveMessages(maxMessages: number = env.QUEUE_BATCH_SIZE): Promise<AWS.SQS.Message[]> {
  //   try {
  //     const result = await this.client.send(new ReceiveMessageCommand({
  //       QueueUrl: config.queueUrl,
  //       MaxNumberOfMessages: maxMessages,
  //       WaitTimeSeconds: 20,
  //       VisibilityTimeout: 300,
  //     }));

  //     return result.Messages || [];
  //   } catch (error) {
  //     const errorMessage = `Failed to receive messages from queue: ${error.message}`;
  //     logger.error(errorMessage, error);
  //     throw new Error(errorMessage);
  //   }
  // }

  // async deleteMessage(receiptHandle: string): Promise<void> {
  //   try {
  //     await this.client.send(new DeleteMessageCommand({
  //       QueueUrl: config.queueUrl,
  //       ReceiptHandle: receiptHandle,
  //     }));
  //   } catch (error) {
  //     const errorMessage = `Failed to delete message from queue: ${error.message}`;
  //     logger.error(errorMessage, error);
  //     throw new Error(errorMessage);
  //   }
  // }

//   async getQueueAttributes(): Promise<QueueAttributes> {
//     try {
//       const result = await this.client.send(new GetQueueAttributesCommand({
//         QueueUrl: config.queueUrl,
//         AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
//       }));

//       return (result.Attributes || {}) as QueueAttributes;
//     } catch (error) {
//       const errorMessage = `Failed to get queue attributes: ${error.message}`;
//       logger.error(errorMessage, error);
//       throw new Error(errorMessage);
//     }
//   }
}
