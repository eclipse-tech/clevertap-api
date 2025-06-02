import { generateDailyReport } from './daily-report.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['ACCOUNT_ID', 'PASSCODE'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

// Validate ACCOUNT_ID format if present
if (process.env.ACCOUNT_ID && process.env.ACCOUNT_ID.length !== 12) {
  console.error('ACCOUNT_ID must be 12 digits. Current value:', process.env.ACCOUNT_ID);
}

export default async function handler(req, res) {
  // Debug logging
  console.log('Environment variables status:', {
    ACCOUNT_ID: process.env.ACCOUNT_ID ? `${process.env.ACCOUNT_ID.substring(0, 4)}...${process.env.ACCOUNT_ID.substring(8)}` : 'not set',
    hasPasscode: !!process.env.PASSCODE,
    hasSlackBot: !!process.env.SLACK_BOT_TOKEN,
    hasSlackChannels: !!process.env.SLACK_CHANNEL_IDS,
    missingVars: missingEnvVars
  });

  // Check for missing required variables
  if (missingEnvVars.length > 0) {
    return res.status(500).json({ 
      success: false,
      error: 'Missing required environment variables',
      missingVars: missingEnvVars
    });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

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
}
