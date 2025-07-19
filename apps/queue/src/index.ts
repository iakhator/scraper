// apps/backend/src/index.ts
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Load environment variables FIRST
dotenv.config()

import { dynamodb, sqs } from "./aws-wrapper";
import logger from "./utils/logger";
import apiRoutes from './routes/api';
import { DatabaseService, QueueService } from './services';
import { v4 as uuidv4 } from 'uuid';

const dbService = new DatabaseService(dynamodb);
const queueService = new QueueService(sqs)

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  logger.startup(PORT);
})
