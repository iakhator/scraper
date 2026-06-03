export interface ScrapeJob {
  id: string;
  url: string;
  priority: "low" | "medium" | "high";
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  result?: ScrapeResult;
  error?: string;
}

export interface ScrapedContent {
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
  processingTime?: number;
}

export interface JobUpdateEvent {
  type: "job-update" | "job-added";
  jobId: string;
  status: ScrapeJob["status"];
  data: {
    url: string;
    priority: ScrapeJob["priority"];
    completedAt?: string;
    errorMessage?: string;
    timestamp: string;
  };
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// API Request/Response Types
export interface CreateJobRequest {
  url: string;
  priority: "low" | "medium" | "high";
}

export interface CreateBulkJobRequest {
  urls: string[];
  priority: "low" | "medium" | "high";
}

// Job status and result types
export interface ScrapeResult {
  title: string;
  text: string;
  links: string[];
  images: string[];
  description?: string;
  downloadUrl?: string;
}

// Alias for consistency with other components
export type Job = ScrapeJob;

// Stats Types (mirrors backend)
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

export interface WorkerStatus {
  isRunning: boolean;
  activeJobs: number;
  maxConcurrentJobs: number;
  availableSlots: number;
  pollIntervalMs: number;
  activeJobDetails: Array<{ jobId: string; url: string; durationMs: number }>;
  uptimeSeconds: number;
}

export interface StatsResponse {
  jobs: JobStats;
  queue: QueueStats;
  worker: WorkerStatus;
  timestamp: string;
}
