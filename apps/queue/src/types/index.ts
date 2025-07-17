export interface ScrapedContent {
  PK: string;
  SK: string;
  id: string;
  url: string;
  title?: string;
  // content?: string;
  // metadata?: {
  //   description?: string;
  //   keywords?: string[];
  //   author?: string;
  //   publishDate?: string;
  // };
  createdAt?: string;
  // status?: 'pending' | 'completed' | 'failed';
  // errorMessage?: string;
  // processingTime?: number;
}

export interface ScrapeJob {
  PK: string,
  SK: string,
  id: string;
  url: string;
  priority: 'low' | 'medium' | 'high';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
}

export interface DynamoReturn<T> { data?: T; error?: Error }


// Queue Types
export interface QueueMessage {
  jobId: string;
  url: string;
  priority: 'low' | 'medium' | 'high';
  retryCount?: number;
  maxRetries?: number;
}
export interface QueueAttributes {
  ApproximateNumberOfMessages?: string;
  ApproximateNumberOfMessagesNotVisible?: string;
}

export interface Message {
  MessageId?: string;
  ReceiptHandle?: string;
  Body?: string;
  Attributes?: Record<string, string>;
};
