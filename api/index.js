import express from "express";
import cors from "cors";
import cron from 'node-cron';
import fetchUserData from "./fetch-user-data.js";
import uploadEvent from "./upload-user-event.js";
import { generateDailyReport } from "./daily-report-generator/daily-report.js";
import { apiHeaders } from "./constants.js";

// List of allowed origins
const allowedOrigins = [
  "https://www.letsmultiply.co.in",
  "https://stage.letsmultiply.co.in",
  "https://dev.letsmultiply.co.in",
  "http://localhost:3000",
];

const app = express();

// CORS middleware configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type"], // Allowed headers
  })
);

app.use(express.json());

// Debug endpoint to check configuration
app.get("/api/v1/debug-config", (_, res) => {
  res.json({
    accountId: process.env.ACCOUNT_ID ? `${process.env.ACCOUNT_ID.substring(0, 4)}...${process.env.ACCOUNT_ID.substring(8)}` : 'not set',
    hasPasscode: !!process.env.PASSCODE,
    hasSlackBot: !!process.env.SLACK_BOT_TOKEN,
    hasSlackChannels: !!process.env.SLACK_CHANNEL_IDS,
    headers: {
      ...apiHeaders,
      "X-CleverTap-Passcode": "***" // Hide the actual passcode
    }
  });
});

// Schedule the daily report to run at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily app opened events report...');
  await generateDailyReport();
});

// Daily report generator endpoint
app.get("/api/daily-report-generator", async (_, res) => {
  try {
    console.log('Manually triggering daily report...');
    const result = await generateDailyReport();
    
    if (!result.success) {
      console.error('Daily report generation failed:', result.error);
      return res.status(500).json({ 
        success: false, 
        error: result.error,
        message: 'Report generation failed'
      });
    }

    res.status(200).json({ 
      success: true,
      result, 
      message: 'Report generation triggered' 
    });
  } catch (error) {
    console.error('Error in daily report handler:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    });
    
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details available'
    });
  }
});

app.get("/health", (_, res) => res.send("Health Check"));

app.post("/api/v1/get-user-profile", async (req, res) => {
  const { identity } = req.body;
  const { filterEvents } = req.body;
  try {
    const userProfile = await fetchUserData(identity, filterEvents);
    res.send(userProfile);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/api/v1/upload-event", async (req, res) => {
  const { identity, eventName, eventData } = req.body;
  try {
    const uploadData = await uploadEvent(identity, eventName, eventData);
    res.send(uploadData);
  } catch (error) {
    res.status(500).send(error);
  }
});

export default app;
