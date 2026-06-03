export interface ScrapedContent {
  PK: string;
  SK: string;
  id: string;
  url: string;
  title?: string;
  content?: string;
  metadata?: {
    description?: string;
    keywords?: string[];
    author?: string;
    publishDate?: string;
  };
  scrapedAt?: string;
  createdAt?: string;
  processingTime?: number;
}

export interface ScrapeJob {
  PK: string;
  SK: string;
  id: string;
  url: string;
  priority: "low" | "medium" | "high";
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  createdAt: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
}

export type DynamoItem = Record<string, any>;
export type DynamoKey = Record<string, any>;
export interface DynamoReturn<T> {
  data?: T;
  error?: Error;
}

// Queue Types
export interface QueueMessage {
  jobId: string;
  url: string;
  priority: "low" | "medium" | "high";
  retryCount?: number;
  maxRetries?: number;
  error?: string;
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
}

// Event Types for internal communication
export interface JobUpdateEvent {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  url: string;
  priority: "low" | "medium" | "high";
  completedAt?: string;
  errorMessage?: string;
}

// Worker Types
export interface ActiveJob {
  url: string;
  startTime: number;
}

export interface WorkerStatus {
  isRunning: boolean;
  activeJobs: number;
  maxConcurrentJobs: number;
  availableSlots: number;
  pollIntervalMs: number;
  activeJobDetails: Array<{ jobId: string; url: string; durationMs: number }>;
  uptimeSeconds: number;
}

// Stats Types
export interface JobStats {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface QueueStats {
  messagesAvailable: number;
  messagesInFlight: number;
  messagesDelayed: number;
}
