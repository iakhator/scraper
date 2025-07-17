import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  SendMessageCommandInput,
  ReceiveMessageCommandInput,
  DeleteMessageCommandInput,
  SQSClientConfig,
  SQSServiceException
} from "@aws-sdk/client-sqs";
import { sqsClient } from "../config";
import logger from "../../utils/logger"; 


/**
 * Send message to SQS queue with error handling
 */
export async function sendMessage(
  params: SendMessageCommandInput
): Promise<{ messageId: string }> {
  const command = new SendMessageCommand(params);
  
  try {
    const result = await sqsClient.send(command);
    logger.debug("Message sent successfully", { 
      messageId: result.MessageId,
      queueUrl: params.QueueUrl 
    });
    return { messageId: result.MessageId! };
  } catch (error) {
    logger.error("Failed to send SQS message", { 
      error,
      queueUrl: params.QueueUrl,
      messageBody: params.MessageBody 
    });
    throw wrapSqsError(error, "sendMessage");
  }
}

/**
 * Receive messages from SQS queue with error handling
 */
export async function receiveMessages(
  params: ReceiveMessageCommandInput
): Promise<{ messages: Message[] }> {
  const command = new ReceiveMessageCommand({
    WaitTimeSeconds: 20, 
    MaxNumberOfMessages: 10, 
    ...params, 
  });

  try {
    const result = await sqsClient.send(command);
    logger.debug("Messages received", { 
      count: result.Messages?.length || 0,
      queueUrl: params.QueueUrl 
    });
    return { messages: result.Messages || [] };
  } catch (error) {
    logger.error("Failed to receive SQS messages", { 
      error,
      queueUrl: params.QueueUrl 
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

// Type for better code completion
type Message = {
  MessageId?: string;
  ReceiptHandle?: string;
  Body?: string;
  Attributes?: Record<string, string>;
};
