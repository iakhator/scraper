import WebSocket from 'ws';
import { logger } from '@iakhator/scraper-logger';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private isConnected = false;

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
          this.isConnected = true;
          logger.info('WebSocket connected to queue service');
          resolve();
        });

        this.ws.on('close', () => {
          this.isConnected = false;
          logger.warn('WebSocket connection closed');
        });

        this.ws.on('error', (error: Error) => {
          this.isConnected = false;
          logger.error('WebSocket error:', { error: error.message });
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  sendJobUpdate(jobId: string, status: string, data?: any): void {
    if (!this.isConnected || !this.ws) {
      logger.warn('WebSocket not connected, skipping job update');
      return;
    }

    const message = {
      type: 'job-status-update',
      jobId,
      status,
      data,
      timestamp: new Date().toISOString(),
      source: 'worker'
    };

    try {
      this.ws.send(JSON.stringify(message));
      logger.debug(`Sent job update for ${jobId}: ${status}`);
    } catch (error) {
      logger.error('Error sending job update:', { error });
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
