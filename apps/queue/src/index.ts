// apps/backend/src/index.ts
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { dynamodb, sqs } from "./aws-wrapper";
import logger from "./utils/logger";
import apiRoutes from './routes/api';
import { DatabaseService, QueueService } from './services';
import { v4 as uuidv4 } from 'uuid';

const dbService = new DatabaseService(dynamodb);
const queueService = new QueueService(sqs)

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// app.use('/api', apiRoutes);


app.get('/api', async(req, res) => {
  logger.info("API endpoint called", { endpoint: "/api" });
  
  // const item = await dbService.getScrapedContent("c4cbfbb2-7670-4d23-81b2-844b02873574");
  // const jobId = uuidv4();
  // const item = await dbService.saveScrapedContent({
  //   PK: `CONTENT#${jobId}`,
  //   SK: "CONTENT",
  //   url: "https://example.com",
  //   title: "Sample content",
  //   id: jobId,
  //   createdAt: new Date().toISOString()
  // });

  // if(item.error) {
  //   return res.status(500).json({ error: item.error.message });
  // }
  // return res.status(200).json({ item, message: 'Hello from Express API'  });

  const jobId = uuidv4();
  const message = {
    jobId: jobId,
    url: 'https://example.com',
    priority: 'high' as const,
    retryCount: 5,
    maxRetries: 5,
  }
  const result = await queueService.sendMessage(message)
  if(result) {
    return res.status(200).json({ message: "here we go"})
  } else {
    return res.status(500).json({ error: 'error' });
  }
})

// Add endpoint to view queue messages
app.get('/api/queue/messages', async(req, res) => {
  logger.info("Queue messages endpoint called");
  
  try {
    const messages = await queueService.receiveMessages();
    return res.status(200).json({ 
      messages: messages,
      count: messages.length 
    });
  } catch (error) {
    logger.error("Failed to retrieve queue messages", { error });
    return res.status(500).json({ error: "Failed to retrieve messages" });
  }
});

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  logger.startup(PORT);
})
