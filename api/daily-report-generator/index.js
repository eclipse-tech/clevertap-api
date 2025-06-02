import { generateDailyReport } from './daily-report.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
function validateEnvVariables() {
  const requiredVars = ['ACCOUNT_ID', 'PASSCODE'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    return {
      success: false,
      error: "Missing required environment variables",
      missingVars,
      details: `Please set the following environment variables: ${missingVars.join(', ')}`
    };
  }

  // Validate ACCOUNT_ID format
  if (process.env.ACCOUNT_ID && process.env.ACCOUNT_ID.length !== 12) {
    return {
      success: false,
      error: "Invalid ACCOUNT_ID format",
      details: "ACCOUNT_ID must be exactly 12 digits"
    };
  }

  return { success: true };
}

export default async function handler(req, res) {
  // Log request details
  console.log('Request received:', {
    method: req.method,
    path: req.url,
    timestamp: new Date().toISOString()
  });

  // Debug log environment variables
  console.log('Environment variables status:', {
    ACCOUNT_ID: process.env.ACCOUNT_ID ? `${process.env.ACCOUNT_ID.slice(0, 4)}...${process.env.ACCOUNT_ID.slice(-4)}` : 'Not set',
    PASSCODE: process.env.PASSCODE ? 'Set' : 'Not set',
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN ? 'Set' : 'Not set',
    SLACK_CHANNEL_IDS: process.env.SLACK_CHANNEL_IDS ? 'Set' : 'Not set'
  });

  // Validate environment variables
  const validationResult = validateEnvVariables();
  if (!validationResult.success) {
    console.error('Environment validation failed:', validationResult);
    return res.status(400).json(validationResult);
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      details: 'Only GET requests are supported'
    });
  }

  try {
    const result = await generateDailyReport();
    
    if (!result.success) {
      console.error('Report generation failed:', result);
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Unexpected error:', {
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
