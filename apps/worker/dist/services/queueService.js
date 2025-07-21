"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class QueueService {
    constructor(sqs) {
        this.sqs = sqs;
    }
    async sendMessage(message) {
        try {
            const result = await this.sqs.sendMessage(message);
            logger_1.default.info(`Message sent to queue: ${message.jobId}`);
            return result;
        }
        catch (error) {
            const errorMessage = `Failed to send message to queue for job ${message.jobId}: ${error.message}`;
            logger_1.default.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }
    async receiveMessages(params) {
        //      params const messages = await queueService.receiveMessages({
        //         MaxNumberOfMessages: 5
        //     })
        try {
            const result = await this.sqs.receiveMessages(params);
            return result.messages || [];
        }
        catch (error) {
            const errorMessage = `Failed to receive messages from queue: ${error.message}`;
            logger_1.default.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }
    async deleteMessage(receiptHandle) {
        try {
            await this.sqs.deleteMessage(receiptHandle);
        }
        catch (error) {
            const errorMessage = `Failed to delete message from queue: ${error.message}`;
            logger_1.default.error(errorMessage, error);
            throw new Error(errorMessage);
        }
    }
}
exports.QueueService = QueueService;
//# sourceMappingURL=queueService.js.map