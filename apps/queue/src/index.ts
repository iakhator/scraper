// apps/backend/src/index.ts
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { configureAWS, aws } from "./aws-wrapper";

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
  const item = await aws.dynamodb.getItem("scraper-db", {
  PK: "123" 
});
  res.json({ item, message: 'Hello from Express API 1' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})
