import { generateDailyReport } from './daily-report.js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Manually triggering daily report...');
    const result = await generateDailyReport();
    res.status(200).json({ success: result, message: 'Report generation triggered' });
  } catch (error) {
    console.error('Error in daily report handler:', error);
    res.status(500).json({ error: error.message });
  }
}
