import axios from 'axios';
import { apiHeaders, BASE_URL } from '../constants.js';
import sendToSlack from '../slack-notification.js';
import metabaseClient from '../metabase-client.js';

// Validate CleverTap configuration
function validateCleverTapConfig() {
  const missingVars = [];
  
  if (!process.env.ACCOUNT_ID) {
    missingVars.push('ACCOUNT_ID');
  } else if (process.env.ACCOUNT_ID.length !== 12) {
    throw new Error('Invalid ACCOUNT_ID: Must be 12 digits');
  }
  
  if (!process.env.PASSCODE) {
    missingVars.push('PASSCODE');
  }

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

export async function generateDailyReport() {
  try {
    // Validate configuration
    validateCleverTapConfig();

    const maxPolls = 10;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1);
    const endOfMonth = new Date(yesterday.getFullYear(), yesterday.getMonth() + 1, 0);

    // Format dates for CleverTap API (YYYYMMDD format)
    const yesterdayFormatted = yesterday.getFullYear() * 10000 + 
                             (yesterday.getMonth() + 1) * 100 + 
                             yesterday.getDate();
    const startOfMonthFormatted = startOfMonth.getFullYear() * 10000 + 
                                (startOfMonth.getMonth() + 1) * 100 + 
                                startOfMonth.getDate();
    const endOfMonthFormatted = endOfMonth.getFullYear() * 10000 + 
                              (endOfMonth.getMonth() + 1) * 100 + 
                              endOfMonth.getDate();

    console.log('Time range details:', {
      yesterday: yesterdayFormatted,
      startOfMonth: startOfMonthFormatted,
      endOfMonth: endOfMonthFormatted
    });

    // Initialize variables to store counts
    let yesterdayUniqueUsers = 0;
    let yesterdayTotalEvents = 0;
    let monthToDateUniqueUsers = 0;
    let monthToDateTotalEvents = 0;

    // Function to poll for results
    const pollForResults = async (reqId, maxAttempts = 10) => {
      let attempts = 0;
      while (attempts < maxAttempts) {
        try {
          const response = await axios.get(`${BASE_URL}/1/counts/events.json?req_id=${reqId}`, {
            headers: {
              ...apiHeaders,
              'Accept': 'application/json'
            }
          });
          
          if (response.data.status === 'success') {
            return response.data;
          } else if (response.data.status === 'fail') {
            throw new Error(`Job failed: ${response.data.error || 'Unknown error'}`);
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        } catch (error) {
          console.error(`Polling attempt ${attempts + 1} failed:`, error.message);
          throw error;
        }
      }
      throw new Error('Max polling attempts reached');
    };

    // Get total app opens for month
    console.log('Fetching total app opens for month...');
    const monthTotalRequestBody = {
      event_name: "app_opened",
      from: startOfMonthFormatted,
      to: endOfMonthFormatted,
      unique: false
    };

    const monthTotalResponse = await axios.post(
      `${BASE_URL}/1/counts/events.json`,
      monthTotalRequestBody,
      {
        headers: {
          ...apiHeaders,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    if (monthTotalResponse.data.status === 'success') {
      monthToDateTotalEvents = monthTotalResponse.data.count || 0;
    } else if (monthTotalResponse.data.req_id) {
      const result = await pollForResults(monthTotalResponse.data.req_id);
      monthToDateTotalEvents = result.count || 0;
    }

    // Get unique users for yesterday
    console.log('Fetching unique users for yesterday...');
    const yesterdayUniqueRequestBody = {
      event_name: "app_opened",
      from: yesterdayFormatted,
      to: yesterdayFormatted,
      unique: true
    };

    const yesterdayUniqueResponse = await axios.post(
      `${BASE_URL}/1/counts/events.json`,
      yesterdayUniqueRequestBody,
      {
        headers: {
          ...apiHeaders,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    if (yesterdayUniqueResponse.data.status === 'success') {
      yesterdayUniqueUsers = yesterdayUniqueResponse.data.count || 0;
    } else if (yesterdayUniqueResponse.data.req_id) {
      const result = await pollForResults(yesterdayUniqueResponse.data.req_id);
      yesterdayUniqueUsers = result.count || 0;
    }

    // Get month-to-date unique users
    console.log('Fetching month-to-date unique users...');
    const monthUniqueRequestBody = {
      event_name: "app_opened",
      from: startOfMonthFormatted,
      to: endOfMonthFormatted,
      unique: true
    };

    const monthUniqueResponse = await axios.post(
      `${BASE_URL}/1/counts/events.json`,
      monthUniqueRequestBody,
      {
        headers: {
          ...apiHeaders,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    if (monthUniqueResponse.data.status === 'success') {
      monthToDateUniqueUsers = monthUniqueResponse.data.count || 0;
    } else if (monthUniqueResponse.data.req_id) {
      const result = await pollForResults(monthUniqueResponse.data.req_id);
      monthToDateUniqueUsers = result.count || 0;
    }

    // Get total events for yesterday
    console.log('Fetching total events for yesterday...');
    const yesterdayTotalRequestBody = {
      event_name: "app_opened",
      from: yesterdayFormatted,
      to: yesterdayFormatted,
      unique: false
    };

    const yesterdayTotalResponse = await axios.post(
      `${BASE_URL}/1/counts/events.json`,
      yesterdayTotalRequestBody,
      {
        headers: {
          ...apiHeaders,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    if (yesterdayTotalResponse.data.status === 'success') {
      yesterdayTotalEvents = yesterdayTotalResponse.data.count || 0;
    } else if (yesterdayTotalResponse.data.req_id) {
      const result = await pollForResults(yesterdayTotalResponse.data.req_id);
      yesterdayTotalEvents = result.count || 0;
    }

    // Calculate performance indicators
    const dailyGrowth = ((yesterdayUniqueUsers / monthToDateUniqueUsers) * 100).toFixed(2);
    const engagementRate = ((yesterdayTotalEvents / yesterdayUniqueUsers) * 100).toFixed(2);

    // Get Metabase dashboard URL if available
    let metabaseUrl = '';
    let metabaseData = null;
    try {
      const dashboard = await metabaseClient.getDashboard();
      if (dashboard) {
        metabaseUrl = dashboard.url;
        metabaseData = dashboard;
        console.log('Successfully fetched Metabase dashboard:', {
          name: dashboard.name,
          id: dashboard.id,
          cards: dashboard.cards?.length || 0
        });

        // Fetch detailed card data
        if (dashboard.cards && dashboard.cards.length > 0) {
          const dashboardData = await metabaseClient.getDashboardData();
          if (dashboardData && dashboardData.cards) {
            metabaseData.cards = dashboardData.cards;
            console.log('Successfully fetched detailed card data:', {
              totalCards: dashboardData.cards.length,
              categories: Object.keys(metabaseClient.categorizeCards(dashboardData.cards))
            });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get Metabase dashboard:', error.message);
    }

    // Construct message
    const message = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Daily App Analytics Report",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:date: *Yesterday's App Opens (${yesterday.toLocaleDateString()})*\n` +
              `• Unique Users: ${yesterdayUniqueUsers.toLocaleString()}\n` +
              `• Total Events: ${yesterdayTotalEvents.toLocaleString()}\n` +
              `• Event: \`app_opened\`\n` +
              `• Filter: Excluding Internal Users`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:chart_with_upwards_trend: *Month-to-Date App Opens (${startOfMonth.toLocaleDateString()} to ${yesterday.toLocaleDateString()})*\n` +
              `• Unique Users: ${monthToDateUniqueUsers.toLocaleString()}\n` +
              `• Total Events: ${monthToDateTotalEvents.toLocaleString()}\n` +
              `• Total App Opens (All Users): ${monthToDateTotalEvents.toLocaleString()}\n` +
              `• Days into Month: ${yesterday.getDate()}\n` +
              `• Avg Daily Unique Users: ${Math.round(monthToDateUniqueUsers / yesterday.getDate())}\n` +
              `• Avg Daily Events: ${Math.round(monthToDateTotalEvents / yesterday.getDate())}\n` +
              `• Event: \`app_opened\`\n` +
              `• Filter: Excluding Internal Users`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:bar_chart: *Performance Indicators*\n` +
              `:large_green_circle: Yesterday vs Avg: ${((yesterdayUniqueUsers / (monthToDateUniqueUsers / yesterday.getDate()) - 1) * 100).toFixed(1)}%`
          }
        }
      ]
    };

    // Add Metabase dashboard link if available
    if (metabaseUrl) {
      message.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:bar_chart: **App Analytics - Yesterday**\n` +
            `:white_check_mark: ${metabaseData.cards?.length || 0} metrics loaded (direct)\n` +
            `:bar_chart: Success rate: ${metabaseData.cards?.length || 0}/${metabaseData.cards?.length || 0} cards\n` +
            `:clock3: Last updated: ${new Date().toLocaleTimeString()}`
        }
      });

      // Add Metabase card data if available
      if (metabaseData && metabaseData.cards && metabaseData.cards.length > 0) {
        const categorizedCards = metabaseClient.categorizeCards(metabaseData.cards);
        
        Object.entries(categorizedCards).forEach(([category, cards]) => {
          if (cards.length > 0) {
            message.blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `${metabaseClient.getCategoryEmojiText(category)} **${category.toUpperCase()}**\n` +
                  cards.map(card => metabaseClient.formatCardAsText(card)).join('\n')
              }
            });
          }
        });
      }
    }

    // Send to Slack
    await sendToSlack(message);

    return {
      success: true,
      data: {
        yesterday: {
          uniqueUsers: yesterdayUniqueUsers,
          totalEvents: yesterdayTotalEvents,
          engagementRate: parseFloat(engagementRate)
        },
        monthToDate: {
          uniqueUsers: monthToDateUniqueUsers,
          totalEvents: monthToDateTotalEvents,
          dailyGrowth: parseFloat(dailyGrowth)
        },
        metabase: metabaseData ? {
          name: metabaseData.name,
          url: metabaseUrl,
          cards: metabaseData.cards?.length || 0
        } : null
      }
    };

  } catch (error) {
    console.error('Error generating daily report:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    });

    return {
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details available'
    };
  }
}