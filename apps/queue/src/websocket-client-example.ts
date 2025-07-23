// Example frontend WebSocket client usage
// This shows how a frontend application would connect to receive real-time job updates

class ScraperWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('Connected to scraper WebSocket server');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        };

        this.ws.onclose = () => {
          console.log('WebSocket connection closed');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'connected':
        console.log('WebSocket connected with client ID:', message.clientId);
        break;

      case 'job-update':
        console.log(`Job ${message.jobId} status: ${message.status}`, message.data);
        // Update UI with job status
        this.updateJobStatus(message.jobId, message.status, message.data);
        break;

      case 'subscribed':
        console.log(`Subscribed to job ${message.jobId}`);
        break;

      case 'unsubscribed':
        console.log(`Unsubscribed from job ${message.jobId}`);
        break;

      case 'pong':
        // Handle ping/pong for keep-alive
        break;

      default:
        console.log('Unknown message type:', message);
    }
  }

  private updateJobStatus(jobId: string, status: string, data?: any): void {
    // Example of how you might update the UI
    const jobElement = document.getElementById(`job-${jobId}`);
    if (jobElement) {
      const statusElement = jobElement.querySelector('.status');
      if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = `status ${status}`;
      }

      // Update progress or other data
      if (data) {
        const progressElement = jobElement.querySelector('.progress');
        if (progressElement && status === 'processing') {
          progressElement.textContent = 'Processing...';
        } else if (status === 'completed' && data.title) {
          const titleElement = jobElement.querySelector('.title');
          if (titleElement) {
            titleElement.textContent = data.title;
          }
        }
      }
    }
  }

  subscribeToJob(jobId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe-job',
        jobId
      }));
    }
  }

  unsubscribeFromJob(jobId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe-job',
        jobId
      }));
    }
  }

  ping(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectInterval);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage example:
/*
const wsClient = new ScraperWebSocketClient('ws://localhost:3001/ws');

// Connect to WebSocket
wsClient.connect().then(() => {
  console.log('WebSocket client ready');
  
  // Subscribe to specific job updates
  wsClient.subscribeToJob('job-123-456');
  
  // Send a ping every 30 seconds to keep connection alive
  setInterval(() => wsClient.ping(), 30000);
});

// When submitting a new job via API:
fetch('/api/urls', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com', priority: 'normal' })
})
.then(response => response.json())
.then(data => {
  // Subscribe to updates for this job
  wsClient.subscribeToJob(data.jobId);
});
*/
