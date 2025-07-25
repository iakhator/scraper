import {
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  SendMessageCommandInput,
  ReceiveMessageCommandInput,
  DeleteMessageCommandInput,
  SQSServiceException
} from "@aws-sdk/client-sqs";
import { config, sqsClient } from "../config";
import { QueueMessage, Message } from "@iakhator/scraper-types";
import { logger } from '@iakhator/scraper-logger';

/**
 * Send message to SQS queue with error handling
 */
export async function sendMessage(
  message: QueueMessage,
): Promise<{ messageId: string }> {
  
  try {
    const result = await sqsClient.send(new SendMessageCommand({
        QueueUrl: config.queueUrl,
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
      queueUrl: message.url 
    });
    return { messageId: result.MessageId! };
  } catch (error) {
    logger.error("Failed to send SQS message", { 
      error,
      queueUrl: message.url,
    });
    throw wrapSqsError(error, "sendMessage");
  }
}

/**
 * Receive messages from SQS queue with error handling
 */
export async function receiveMessages(
  params?: Omit<ReceiveMessageCommandInput, 'QueueUrl'>
): Promise<{ messages: Message[] }> {
  const command = new ReceiveMessageCommand({
    QueueUrl: config.queueUrl,
    WaitTimeSeconds: 20, 
    MaxNumberOfMessages: config.batchMessages || 10,
    ...params, // Allow overriding defaults with passed parameters
  });

  try {
    const result = await sqsClient.send(command);
    logger.debug("Messages received", { 
      count: result.Messages?.length || 0,
      queueUrl: config.queueUrl 
    });
    return { messages: result.Messages || [] };
  } catch (error) {
    logger.error("Failed to receive SQS messages", { 
      error,
      queueUrl: config.queueUrl 
    });
    throw wrapSqsError(error, "receiveMessages");
  }
}

/**
 * Delete message from SQS queue with error handling
 */
export async function deleteMessage(
  params: DeleteMessageCommandInput
): Promise<void> {
  const command = new DeleteMessageCommand(params);

  try {
    await sqsClient.send(command);
    logger.debug("Message deleted successfully", { 
      receiptHandle: params.ReceiptHandle,
      queueUrl: params.QueueUrl 
    });
  } catch (error) {
    logger.error("Failed to delete SQS message", { 
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
function wrapSqsError(error: unknown, operation: string): Error {
  if (error instanceof SQSServiceException) {
    return new Error(
      `SQS operation ${operation} failed: ${error.message}`
    );
  }
  return new Error(
    `Unexpected error during SQS ${operation}: ${error instanceof Error ? error.message : String(error)}`
  );
}
