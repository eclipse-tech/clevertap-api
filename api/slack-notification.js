import axios from 'axios';

const sendToSlack = async (message) => {
  try {
    const botToken = process.env.SLACK_BOT_TOKEN;
    const channelIds = process.env.SLACK_CHANNEL_IDS?.split(',') || [];
    
    // Debug logging
    console.log('=== Slack Notification Debug ===');
    console.log('Bot Token exists:', !!botToken);
    console.log('Channel IDs:', channelIds);
    
    if (!botToken || channelIds.length === 0) {
      console.error('SLACK_BOT_TOKEN or SLACK_CHANNEL_IDS is not configured');
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

    // Send to each channel
    const results = await Promise.allSettled(
      channelIds.map(async (channelId) => {
        const payload = {
          channel: channelId.trim(),
          text: "Daily Report", // Fallback text
          blocks: message.blocks || []
        };

        console.log(`Sending payload to Slack channel ${channelId}:`, JSON.stringify(payload, null, 2));

        try {
          const response = await axios.post('https://slack.com/api/chat.postMessage', payload, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${botToken}`
            }
          });
          
          console.log(`Slack API Response for channel ${channelId}:`, {
            status: response.status,
            statusText: response.statusText,
            data: response.data
          });
          
          if (!response.data.ok) {
            throw new Error(`Slack API returned error: ${response.data.error}`);
          }
          
          return { channelId, success: true, data: response.data };
        } catch (axiosError) {
          console.error(`Slack API Error for channel ${channelId}:`, {
            message: axiosError.message,
            response: axiosError.response?.data,
            status: axiosError.response?.status,
            headers: axiosError.response?.headers
          });
          throw axiosError;
        }
      })
    );

    // Process results
    const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);

    if (failed.length > 0) {
      console.error('Failed to send to some channels:', failed);
    }

    return {
      success: successful.length > 0,
      successful,
      failed
    };
  } catch (error) {
    console.error('Error in sendToSlack:', error);
    throw error;
  }
};

export default sendToSlack; 