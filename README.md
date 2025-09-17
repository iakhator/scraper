# 🕷️ Async Web Scraper

![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Nuxtjs](https://img.shields.io/badge/Nuxt-002E3B?style=for-the-badge&logo=nuxtdotjs&logoColor=#00DC82)
![Redis](https://img.shields.io/badge/Redis-Pub%2FSub-DC382D?style=flat&logo=redis&logoColor=white)
![AWS SQS](https://img.shields.io/badge/AWS-SQS-FF9900?style=flat&logo=amazonaws&logoColor=white)
![DynamoDB](https://img.shields.io/badge/AWS-DynamoDB-FF9900?style=flat&logo=amazondynamodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat&logo=docker&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)

A distributed web scraping system built with Node.js and TypeScript. The system processes scraping jobs asynchronously using a modular architecture with separate services for job queuing, processing, and monitoring. Designed for scalability and production use with comprehensive error handling and real-time updates.

**Note**: This project uses private GitHub Packages for distribution. See [PACKAGES.md](./PACKAGES.md) for authentication setup.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Development](#development)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

The system follows a microservices architecture with Redis pub/sub for real-time communication:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Analytics     │    │   Queue API     │    │   Redis         │    │   Worker        │
│   Dashboard     │◄──►│   Service       │◄──►│   Message       │◄──►│   Service       │
│   (Port 3000)   │    │   (Port 3001)   │    │   Broker        │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         │ Socket.IO WebSocket   │ Redis Pub/Sub         │ job_updates Channel   │ Redis Pub/Sub
         │                       │                       │                       │
         ▼                       ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Real-time     │    │   Job Queue     │    │   Pub/Sub       │    │   AWS SQS /     │
│   Updates       │    │   Management    │    │   Communication │    │   LocalStack    │
│   ws://3001/ws  │    │                 │    │                 │    │   Job Queue     │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │                                             │
                                 │                                             │
                                 ▼                                             ▼
                        ┌─────────────────┐                          ┌─────────────────┐
                        │   AWS DynamoDB  │                          │   AWS DynamoDB  │
                        │   / LocalStack  │                          │   / LocalStack  │
                        │   Database      │                          │   Database      │
                        └─────────────────┘                          └─────────────────┘
```

### Components

**Analytics Dashboard**: A Nuxt.js frontend application that connects to the Queue API via Socket.IO WebSocket. Provides a user interface for submitting URLs, monitoring job status, and viewing scraping results in real-time.

**Queue API Service**: An Express.js backend that:

- Handles REST API requests for job submission
- Manages job queuing to SQS
- Subscribes to Redis `job_updates` channel  
- Broadcasts job status updates to connected clients via Socket.IO WebSocket
- Stores job metadata in DynamoDB

**Worker Service**: A standalone Node.js service that:

- Polls SQS for scraping jobs
- Processes jobs using Cheerio/Puppeteer with proxy rotation and rate limiting
- Publishes job status updates to Redis `job_updates` channel
- Stores results in DynamoDB

**Redis Message Broker**: Handles pub/sub communication between Worker and Queue API services via the `job_updates` channel.

**Message Queue**: AWS SQS (or LocalStack for development) handles job distribution between the API and workers.

**Database**: AWS DynamoDB (or LocalStack for development) stores job metadata, results, and system state.

### Data Flow

1. Users submit URLs through the Analytics Dashboard via Socket.IO WebSocket connection
2. Queue API validates requests, creates jobs in DynamoDB, and sends jobs to SQS
3. Worker services poll SQS for jobs and begin processing
4. During processing, workers publish status updates to Redis `job_updates` channel
5. Queue API subscribes to Redis and receives status updates
6. Queue API broadcasts updates to all connected Analytics Dashboard clients via Socket.IO
7. Dashboard displays real-time job progress and results without polling

### Real-time Communication Flow

```
Worker Service ──► Redis Pub ──► Queue API ──► Socket.IO ──► Analytics Dashboard
     │               (job_updates)     │           (WebSocket)        │
     │                                 │                              │
     └──── Job Processing ─────────────┴──── Real-time Updates ──────┘
```

This architecture ensures:

- **Decoupled Services**: Worker and Queue API communicate asynchronously via Redis
- **Real-time Updates**: Instant job status updates without polling
- **Scalability**: Multiple workers can publish to the same Redis channel
- **Reliability**: Redis provides durable message delivery between services

## Features

**Intelligent Scraping**: Uses a dual-strategy approach starting with fast Cheerio parsing and falling back to Puppeteer for dynamic content when needed.

**Real-time Updates**: Redis pub/sub architecture enables instant job status updates from workers to frontend clients via Socket.IO WebSocket connections.

**Decoupled Architecture**: Services communicate asynchronously through Redis messaging, allowing independent scaling and deployment.

**Scalable Processing**: Multiple worker instances can process jobs simultaneously, with Redis ensuring all status updates reach connected clients.

**Error Recovery**: Automatic retries with exponential backoff and comprehensive error logging.

**Development-friendly**: Full Docker support with LocalStack for AWS service mocking and Redis for local pub/sub messaging.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Docker and Docker Compose (for containerized setup)
- AWS account with SQS and DynamoDB access (for production)

### GitHub Packages Authentication

This project uses private GitHub Packages. You'll need to authenticate with GitHub:

1. Create a personal access token at [GitHub Settings](https://github.com/settings/tokens) with `packages:read` permission
2. Copy `.npmrc.template` to `.npmrc` and add your token:

   ```
   @iakhator:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
   ```

### Setup Option 1: Docker Development (Recommended)

The easiest way to get started is using Docker with LocalStack for AWS services:

```bash
# Clone the repository
git clone https://github.com/iakhator/scraper.git
cd scraper

# Create environment file
cp .env.example .env
# Edit .env with your GitHub token

# Start all services with LocalStack
docker compose -f docker-compose.dev.yml up

# The services will be available at:
# Analytics Dashboard: http://localhost:3000
# Queue API: http://localhost:3001
# LocalStack: http://localhost:4566
```

This setup includes:

- All three services (analytics, queue, worker)
- LocalStack for AWS SQS and DynamoDB
- Redis for pub/sub messaging between worker and queue API
- Hot reloading for development

### Setup Option 2: Local Development (Without Docker)

For local development without Docker, you'll need to set up each service manually:

#### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install package dependencies
cd packages/aws-wrapper && npm install && npm run build
cd ../core && npm install && npm run build
cd ../logger && npm install && npm run build
cd ../types && npm install && npm run build
cd ../../

# Install application dependencies
cd apps/analytics && npm install
cd ../queue && npm install
cd ../worker && npm install
cd ../../
```

#### 2. Set Up AWS Services

You can either use LocalStack locally or real AWS services:

**Option A: LocalStack (Local AWS)**

```bash
# Install and start LocalStack
pip install localstack
localstack start

# Create SQS queue and DynamoDB table
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name scraper-queue --region us-east-1
aws --endpoint-url=http://localhost:4566 dynamodb create-table \
    --table-name scraper_db \
    --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
    --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

**Option B: Real AWS Services**

```bash
# Create production AWS resources
aws sqs create-queue --queue-name scraper-queue
aws dynamodb create-table \
    --table-name scraper_db \
    --attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
    --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST
```

#### 3. Configure Environment

Create `.env` file in the root directory:

```bash
# GitHub Packages
GITHUB_TOKEN=your_github_token_here

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test  # for LocalStack, or real AWS key
AWS_SECRET_ACCESS_KEY=test  # for LocalStack, or real AWS secret

# LocalStack endpoints (comment out for real AWS)
AWS_ENDPOINT_URL=http://localhost:4566
SQS_ENDPOINT=http://localhost:4566
DYNAMODB_ENDPOINT=http://localhost:4566

# Queue Configuration
QUEUE_URL=http://localhost:4566/000000000000/scraper-queue  # LocalStack format
# QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/scraper-queue  # Real AWS format

# Database
DYNAMODB_TABLE_NAME=scraper_db

# Redis Configuration (for pub/sub messaging)
REDIS_URL=redis://localhost:6379

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
```

#### 4. Start Services

Open three terminal windows and start each service:

```bash
# Terminal 1: Queue API Service
cd apps/queue
npm run dev

# Terminal 2: Worker Service  
cd apps/worker
npm run dev

# Terminal 3: Analytics Dashboard
cd apps/analytics
npm run dev
```

### Verification

Once everything is running, verify the setup:

1. **Check API Health**: Visit <http://localhost:3001/api/health>
2. **Access Dashboard**: Open <http://localhost:3000>
3. **Submit Test Job**: Use the dashboard to submit a test URL
4. **Monitor Logs**: Check that all services are processing requests

The system should now be ready for development and testing.

## Configuration

### Environment Variables

The system uses environment variables for configuration. Key variables include:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GITHUB_TOKEN` | GitHub personal access token for package access | - | Yes |
| `AWS_REGION` | AWS region for services | us-east-1 | Yes |
| `AWS_ACCESS_KEY_ID` | AWS access key (use 'test' for LocalStack) | - | Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key (use 'test' for LocalStack) | - | Yes |
| `AWS_ENDPOINT_URL` | Custom AWS endpoint (for LocalStack) | - | No |
| `QUEUE_URL` | SQS queue URL | - | Yes |
| `DYNAMODB_TABLE_NAME` | DynamoDB table name | scraper_db | Yes |
| `REDIS_URL` | Redis connection URL for pub/sub messaging | redis://localhost:6379 | Yes |
| `NODE_ENV` | Application environment | development | No |
| `LOG_LEVEL` | Logging level (error, warn, info, debug) | info | No |

### Scraper Configuration

The scraper service supports additional configuration for proxy rotation and rate limiting:

```typescript
// Example: Configure scraper with proxy rotation
const scraperConfig = {
  proxyConfig: {
    proxies: [
      { host: 'proxy1.example.com', port: 8080, auth: { username: 'user', password: 'pass' } },
      { host: 'proxy2.example.com', port: 8080, auth: { username: 'user', password: 'pass' } }
    ],
    rotationStrategy: 'round-robin'
  },
  rateLimitConfig: {
    requestsPerSecond: 2,
    burstLimit: 5
  }
};
```

### Queue Configuration

SQS queue behavior can be customized:

```typescript
// Example: Custom queue settings
const queueConfig = {
  MaxNumberOfMessages: 10,        // Batch size (1-10)
  WaitTimeSeconds: 20,            // Long polling (0-20)
  VisibilityTimeout: 300,         // Processing time (0-43200)
  MessageAttributeNames: ['All'], // Include custom attributes
  AttributeNames: ['All']         // Include system attributes
};
```

## Development

### Project Structure

```
scraper/
├── apps/
│   ├── analytics/          # Nuxt.js frontend dashboard
│   ├── queue/             # Express.js API service
│   └── worker/            # Standalone worker service
├── packages/
│   ├── aws-wrapper/       # AWS service abstractions
│   ├── core/              # Core business logic
│   ├── logger/            # Logging utilities
│   └── types/             # TypeScript type definitions
├── docker-compose.yml     # Production deployment
├── docker-compose.dev.yml # Development with LocalStack
└── .env.example          # Environment template
```

### Available Scripts

**Root Level**

```bash
npm run dev              # Start all services in development mode
npm install              # Install all dependencies
npm run build            # Build all packages and applications
```

**Individual Applications**

```bash
# Analytics Dashboard (apps/analytics/)
npm run dev              # Start Nuxt.js development server
npm run build            # Build for production
npm run start            # Start production server

# Queue API Service (apps/queue/)  
npm run dev              # Start Express.js development server
npm run build            # Compile TypeScript
npm run start            # Start production server

# Worker Service (apps/worker/)
npm run dev              # Start worker in development mode
npm run build            # Compile TypeScript  
npm run start            # Start production worker
```

**Package Development**

```bash
# For any package in packages/
npm run build            # Compile TypeScript
npm run test             # Run tests (when available)
```

### Adding New Features

**New API Endpoint**: Add routes in `apps/queue/src/routes/api.ts` and implement handlers.

**New Scraping Strategy**: Extend the `ScraperService` in `packages/core/src/scraperService.ts`.

**New Queue Behavior**: Modify `QueueService` in `packages/core/src/queueService.ts`.

**New Worker Pattern**: Extend the worker logic in `apps/worker/src/worker.ts`.

### Hot Reloading

When using Docker development setup, file changes trigger automatic reloading:

- **Analytics**: Nuxt.js hot reload for immediate UI updates
- **Queue API**: ts-node-dev restarts the server on file changes  
- **Worker**: Automatic restart when TypeScript files change
- **Packages**: Changes trigger rebuilds and dependent service restarts

## API Reference

The Queue API service provides REST endpoints for job management:

### Endpoints

**POST /api/urls**
Submit a single URL for scraping.

Request:

```json
{
  "url": "https://example.com",
  "priority": "high"
}
```

Response:

```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "queued"
}
```

**POST /api/urls/bulk**
Submit multiple URLs for scraping.

Request:

```json
{
  "urls": [
    "https://example.com",
    "https://github.com",
    "https://stackoverflow.com"
  ],
  "priority": "medium"
}
```

Response:

```json
{
  "jobIds": ["uuid1", "uuid2", "uuid3"],
  "status": "queued",
  "count": 3
}
```

**GET /api/jobs**
Retrieve job status and results.

Response:

```json
{
  "jobs": [
    {
      "jobId": "uuid",
      "url": "https://example.com",
      "status": "completed",
      "result": {...},
      "createdAt": "2025-08-05T10:30:00Z"
    }
  ]
}
```

**GET /api/health**
Check API service health.

Response:

```json
{
  "status": "healthy",
  "timestamp": "2025-08-05T10:30:00Z"
}
```

### WebSocket Events

The system provides real-time updates through Redis pub/sub architecture:

1. **Worker Processing**: Worker publishes job status to Redis `job_updates` channel
2. **Queue API Relay**: Queue API subscribes to Redis and forwards updates via Socket.IO  
3. **Frontend Updates**: Analytics Dashboard receives real-time updates via WebSocket

**Job Status Updates**

Events sent from Queue API to frontend clients via Socket.IO WebSocket:

```json
{
  "event": "job_updated",
  "data": {
    "jobId": "uuid",
    "status": "processing|completed|failed",
    "url": "https://example.com",
    "timestamp": "2025-08-05T10:30:00Z"
  }
}
```

## Deployment

### Production Deployment

For production deployment, use the standard Docker Compose configuration:

```bash
# Build and start all services
docker compose up -d

# Scale worker services for higher throughput
docker compose up -d --scale worker=3

# View logs
docker compose logs -f worker

# Update a specific service
docker compose build queue
docker compose up -d queue
```

### Environment Configuration

Create a production `.env` file with real AWS credentials:

```bash
# GitHub Packages
GITHUB_TOKEN=your_github_token

# AWS Production Configuration  
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Production SQS and DynamoDB (no LocalStack endpoints)
QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/scraper-queue
DYNAMODB_TABLE_NAME=scraper_db

# Production settings
NODE_ENV=production
LOG_LEVEL=warn
```

### Scaling Considerations

**Horizontal Scaling**: Deploy multiple worker instances to handle higher job volumes. Each worker will independently poll the SQS queue.

**Database Performance**: Consider using DynamoDB's provisioned capacity for predictable high-throughput workloads.

**Monitoring**: Implement CloudWatch monitoring for AWS resources and application metrics.

**Load Balancing**: Use an Application Load Balancer for the Queue API service if deploying multiple instances.

## Troubleshooting

### Common Issues

**GitHub Packages Authentication Error**

```
npm ERR! 401 Unauthorized - GET https://npm.pkg.github.com/@iakhator/...
```

Solution: Verify your GitHub token has `packages:read` permission and is correctly set in `.npmrc`.

**Queue Connection Error**

```
QueueDoesNotExist: The specified queue does not exist
```

Solution: Ensure the SQS queue is created and the `QUEUE_URL` environment variable is correct.

**DynamoDB Connection Error**

```
ResourceNotFoundException: Requested resource not found
```

Solution: Create the DynamoDB table or verify the `DYNAMODB_TABLE_NAME` matches your table.

**Worker Not Processing Jobs**

```
Worker polling but no jobs processed
```

Solution: Check that the worker has the same `QUEUE_URL` as the API service and AWS credentials are valid.

**LocalStack Connection Issues**

```
connect ECONNREFUSED 127.0.0.1:4566
```

Solution: Ensure LocalStack is running (`docker compose -f docker-compose.dev.yml up localstack`) and check the `AWS_ENDPOINT_URL` configuration.

**Redis Connection Issues**

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

Solution: Ensure Redis is running. For Docker: `docker compose -f docker-compose.dev.yml up redis`. For local: `redis-server` or check the `REDIS_URL` configuration.

**Real-time Updates Not Working**

```
WebSocket connected but no job updates received
```

Solution: Check that worker is publishing to Redis (`job_updates` channel) and queue API is subscribing. Verify `REDIS_URL` is consistent across both services.

### Debugging

**Enable Debug Logging**

```bash
LOG_LEVEL=debug npm run dev
```

**Check Queue Status**

```bash
# For real AWS
aws sqs get-queue-attributes --queue-url YOUR_QUEUE_URL

# For LocalStack
aws --endpoint-url=http://localhost:4566 sqs get-queue-attributes --queue-url YOUR_QUEUE_URL
```

**Monitor Worker Health**
The worker service logs its health status every 30 seconds. Look for:

```
INFO Worker health check: { worker: 'worker-1', status: 'running', queueConnected: true }
```

### Performance Tuning

**High Load Scenarios**

- Increase `MaxNumberOfMessages` in queue configuration (up to 10)
- Deploy multiple worker instances
- Use SQS FIFO queues for ordered processing if needed

**Memory Management**

- Monitor Puppeteer memory usage in worker processes
- Restart workers periodically for long-running deployments
- Adjust `MAX_CONCURRENT_PAGES` based on available memory

**Rate Limiting**

- Configure appropriate `requestsPerSecond` in scraper config
- Use proxy rotation to distribute requests across IP addresses
- Implement respectful delays for target websites

---

This project is actively maintained. For issues, feature requests, or contributions, please visit the [GitHub repository](https://github.com/iakhator/scraper).
