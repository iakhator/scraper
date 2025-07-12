// apps/backend/src/index.ts
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { configureAWS, aws } from "./aws-wrapper";
import logger from "./utils/logger";
import { DatabaseService } from './services/databaseService';

const dbService = new DatabaseService();

dotenv.config()

const region = process.env.AWS_REGION || "us-east-2";
configureAWS({
  region,
  s3: { region },
  dynamodb: { region }
});

const app = express()
app.use(cors())
app.use(express.json())


app.get('/api', async(req, res) => {
  logger.info("API endpoint called", { endpoint: "/api" });
  
  const item = await dbService.getScrapedContent("123");
  
  // const item = await dbService.saveScrapedContent({
  //   PK: "123",
  //   url: "https://example.com",
  //   title: "Sample content",
  //   id: "123"
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
