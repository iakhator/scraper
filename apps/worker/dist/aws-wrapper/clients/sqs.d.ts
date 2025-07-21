import { ReceiveMessageCommandInput, DeleteMessageCommandInput } from "@aws-sdk/client-sqs";
import { QueueMessage, Message } from "../../types";
/**
 * Send message to SQS queue with error handling
 */
export declare function sendMessage(message: QueueMessage): Promise<{
    messageId: string;
}>;
/**
 * Receive messages from SQS queue with error handling
 */
export declare function receiveMessages(params?: Omit<ReceiveMessageCommandInput, 'QueueUrl'>): Promise<{
    messages: Message[];
}>;
/**
 * Delete message from SQS queue with error handling
 */
export declare function deleteMessage(params: DeleteMessageCommandInput): Promise<void>;
//# sourceMappingURL=sqs.d.ts.map