import app from './api/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['ACCOUNT_ID', 'PASSCODE', 'SLACK_BOT_TOKEN', 'SLACK_CHANNEL_IDS'];
const optionalEnvVars = ['METABASE_API_URL', 'METABASE_API_KEY', 'METABASE_DASHBOARD_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Log optional environment variables status
const missingOptionalVars = optionalEnvVars.filter(varName => !process.env[varName]);
if (missingOptionalVars.length > 0) {
  console.warn('Warning: Missing optional environment variables:', missingOptionalVars.join(', '));
  console.warn('Metabase integration will be disabled');
}

// Validate ACCOUNT_ID format
if (process.env.ACCOUNT_ID.length !== 12) {
  console.error('ACCOUNT_ID must be 12 digits. Current value:', process.env.ACCOUNT_ID);
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Test the daily report at: http://localhost:${PORT}/api/v1/test-daily-report`);
      console.log('Environment variables loaded:', {
        ACCOUNT_ID: `${process.env.ACCOUNT_ID.substring(0, 4)}...${process.env.ACCOUNT_ID.substring(8)}`,
        hasPasscode: !!process.env.PASSCODE,
        hasSlackBot: !!process.env.SLACK_BOT_TOKEN,
        hasSlackChannels: !!process.env.SLACK_CHANNEL_IDS
      });
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port by setting the PORT environment variable.`);
        process.exit(1);
      } else {
        console.error('Error starting server:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer(); 