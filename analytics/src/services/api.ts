import { ScrapeJob, CreateJobRequest, CreateBulkJobRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async createJob(data: CreateJobRequest): Promise<{ jobId: string; status: string }> {
    return this.request('/urls', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createBulkJobs(data: CreateBulkJobRequest): Promise<{ jobIds: string[]; status: string; count: number }> {
    return this.request('/urls/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getJobs(): Promise<{ jobs: ScrapeJob[] }> {
    return this.request('/jobs');
  }

  async retryJob(jobId: string): Promise<{ status: string; message: string }> {
    return this.request(`/jobs/${jobId}/retry`, {
      method: 'POST',
    });
  }

  async getHealth(): Promise<{ status: string; timestamp: string; service: string }> {
    return this.request('/health');
  }
}

export const apiService = new ApiService();
