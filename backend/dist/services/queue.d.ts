import { QueueMessage, Message } from "../types";
export declare class QueueService {
    private queueUrl;
    constructor();
    sendMessage(message: QueueMessage): Promise<{
        messageId: string;
    }>;
    receiveMessages(maxMessages?: number): Promise<Message[]>;
    deleteMessage(receiptHandle: string): Promise<void>;
}
