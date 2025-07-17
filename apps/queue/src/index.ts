// apps/backend/src/index.ts
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { dynamodb } from "./aws-wrapper";
import logger from "./utils/logger";
import { DatabaseService } from './services/databaseService';
import { v4 as uuidv4 } from 'uuid';

const dbService = new DatabaseService(dynamodb);

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())


app.get('/api', async(req, res) => {
  logger.info("API endpoint called", { endpoint: "/api" });
  
  const item = await dbService.getScrapedContent("c4cbfbb2-7670-4d23-81b2-844b02873574");
  // const jobId = uuidv4();
  // const item = await dbService.saveScrapedContent({
  //   PK: `CONTENT#${jobId}`,
  //   SK: "CONTENT",
  //   url: "https://example.com",
  //   title: "Sample content",
  //   id: jobId,
  //   createdAt: new Date().toISOString()
  // });

  if(item.error) {
    return res.status(500).json({ error: item.error.message });
  }
  return res.status(200).json({ item, message: 'Hello from Express API'  });
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  logger.startup(PORT);
})
