import { generateDailyReport } from './daily-report.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Debug logging
  console.log('Environment variables status:', {
    ACCOUNT_ID: process.env.ACCOUNT_ID ? `${process.env.ACCOUNT_ID.substring(0, 4)}...${process.env.ACCOUNT_ID.substring(8)}` : 'not set',
    hasPasscode: !!process.env.PASSCODE,
    hasSlackBot: !!process.env.SLACK_BOT_TOKEN,
    hasSlackChannels: !!process.env.SLACK_CHANNEL_IDS
  });

  try {
    console.log('Manually triggering daily report...');
    const result = await generateDailyReport();
    res.status(200).json({ success: result, message: 'Report generation triggered' });
  } catch (error) {
    console.error('Error in daily report handler:', error);
    res.status(500).json({ error: error.message });
  }
}
