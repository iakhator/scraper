import { DeleteMessageCommandInput, ReceiveMessageCommandInput } from '@aws-sdk/client-sqs';
import { QueueMessage, Message } from '@scraper/types';
type ReceiveMessageParams = Omit<ReceiveMessageCommandInput, 'QueueUrl'>;
interface ISQSOperations {
    sendMessage: (message: QueueMessage) => Promise<{
        messageId: string;
    }>;
    receiveMessages: (params?: ReceiveMessageParams) => Promise<{
        messages: Message[];
    }>;
    deleteMessage: (receiptHandle: DeleteMessageCommandInput) => Promise<void>;
}
export declare class QueueService {
    private sqs;
    constructor(sqs: ISQSOperations);
    sendMessage(message: QueueMessage): Promise<{
        messageId: string;
    }>;
    receiveMessages(params?: ReceiveMessageParams): Promise<Message[]>;
    deleteMessage(receiptHandle: DeleteMessageCommandInput): Promise<void>;
}
export {};
