# Web Scraper

An asynchronous web scraping system built with Node.js and TypeScript. Features a unified backend service with a React dashboard for job management and real-time monitoring.

## Architecture

The system consists of two main components:

- **Backend Service**: Unified Node.js service handling API requests, job processing, and WebSocket connections
- **Analytics Dashboard**: React frontend for job submission and monitoring

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Analytics     │    │   Backend       │    │   AWS Services  │
│   Dashboard     │◄──►│   Service       │◄──►│   DynamoDB      │
│   (React)       │    │   (Node.js)     │    │   SQS           │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
    WebSocket/HTTP         API + Worker           Data Storage
```

### Components

**Backend Service** (`/backend`):
- REST API for job management
- Background worker for processing scraping jobs
- WebSocket server for real-time updates
- DynamoDB integration for data persistence
- SQS integration for job queuing

**Analytics Dashboard** (`/analytics`):
- React application with TypeScript
- Real-time job monitoring via WebSocket
- Job submission and management interface
- Responsive design with Tailwind CSS

## Features

- Asynchronous job processing with SQS
- Real-time status updates via WebSocket
- Intelligent scraping with Cheerio and Puppeteer fallback
- Comprehensive error handling and retry logic
- Docker containerization for development and production

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose

### Development Setup

```bash
# Clone and setup
git clone https://github.com/iakhator/scraper.git
cd scraper

# Start services
docker compose -f docker-compose.dev.yml up --build

# Access applications
# Backend API: http://localhost:3001
# Analytics Dashboard: http://localhost:3000
```

### Configuration

Environment variables are managed through `.env` files:

```bash
# Copy example configurations
cp backend/.env.example backend/.env
cp analytics/.env.example analytics/.env
```

Key configuration options:

- `DYNAMODB_TABLE`: Database table name
- `SQS_QUEUE_URL`: Job queue URL  
- `AWS_REGION`: AWS region for services
- `PORT`: Service port numbers

## API Reference

### Submit Job

```http
POST /api/jobs
Content-Type: application/json

{
  "url": "https://example.com",
  "options": {
    "selector": "h1",
    "waitFor": 1000
  }
}
```

### Get Job Status

```http
GET /api/jobs/:id
```

### WebSocket Events

Connect to `ws://localhost:3001` for real-time updates:

- `job:created` - New job submitted
- `job:processing` - Job started
- `job:completed` - Job finished
- `job:failed` - Job error

## Deployment

### Production Build

```bash
# Build all services
docker compose build

# Start production stack
docker compose up -d
```

### AWS Configuration

For production deployment, configure AWS credentials and update environment variables to point to real AWS services instead of LocalStack.

## Project Structure

```
scraper/
├── backend/           # Node.js backend service
├── analytics/         # React frontend
├── docker-compose.yml # Production setup
└── docker-compose.dev.yml # Development setup
```

