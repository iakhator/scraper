import { DeleteMessageCommandInput, ReceiveMessageCommandInput } from '@aws-sdk/client-sqs';
import { QueueMessage, QueueAttributes, Message } from '@iakhator/scraper-types';
import { config } from '@iakhator/scraper-aws-wrapper';
import { logger } from '@iakhator/scraper-logger';

// Custom type for receive message parameters (QueueUrl is handled automatically by the SQS client)
type ReceiveMessageParams = Omit<ReceiveMessageCommandInput, 'QueueUrl'>;

interface ISQSOperations{
  sendMessage: (message: QueueMessage) => Promise<{ messageId: string }>,
  receiveMessages: (params?: ReceiveMessageParams) => Promise<{ messages: Message[] }>,
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

  async receiveMessages(params?: ReceiveMessageParams): Promise<Message[]> {
    try {
      const result = await this.sqs.receiveMessages(params);
      return result.messages || [];
    } catch (error: any) {
      const errorMessage = `Failed to receive messages from queue: ${error.message}`;
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }

  async deleteMessage(params: DeleteMessageCommandInput): Promise<void> {
    try {
      await this.sqs.deleteMessage(params);
    } catch (error: any) {
      const errorMessage = `Failed to delete message from queue: ${error.message}`;
      logger.error(errorMessage, error);
      throw new Error(errorMessage);
    }
  }
}
