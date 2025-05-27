import axios from 'axios';

const sendToSlack = async (message) => {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    // Debug logging
    console.log('=== Slack Notification Debug ===');
    console.log('Webhook URL exists:', !!webhookUrl);
    console.log('Webhook URL starts with https://hooks.slack.com/services/:', webhookUrl?.startsWith('https://hooks.slack.com/services/'));
    
    if (!webhookUrl) {
      console.error('SLACK_WEBHOOK_URL is not configured');
      return;
    }

    // If message is a string, convert it to a simple block
    if (typeof message === 'string') {
      message = {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: message
            }
          }
        ]
      };
    }

    // Ensure the message has the required format
    const payload = {
      text: "Daily Report", // Fallback text
      blocks: message.blocks || []
    };

    console.log('Sending payload to Slack:', JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Slack API Response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      
      if (response.status !== 200) {
        throw new Error(`Slack API returned status ${response.status}`);
      }
      
      return response.data;
    } catch (axiosError) {
      console.error('Slack API Error:', {
        message: axiosError.message,
        response: axiosError.response?.data,
        status: axiosError.response?.status,
        headers: axiosError.response?.headers
      });
      throw axiosError;
    }
  } catch (error) {
    console.error('Error in sendToSlack:', error);
    throw error;
  }
};

export default sendToSlack; 