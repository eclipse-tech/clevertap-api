import axios from 'axios';
import { apiHeaders, BASE_URL } from './constants.js';
import sendToSlack from './slack-notification.js';
import metabaseClient from './metabase-client.js';

export const generateDailyReport = async () => {
  try {
    const maxPolls = 10; // Maximum number of polling attempts
    
    // Calculate yesterday's date range
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Calculate month start date
    const monthStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1);
    
    // Format dates as YYYYMMDD for CleverTap API
    const fromDate = yesterday.getFullYear() * 10000 + 
                    (yesterday.getMonth() + 1) * 100 + 
                    yesterday.getDate();
    const toDate = fromDate;

    // Format month start date
    const monthStartDate = monthStart.getFullYear() * 10000 + 
                          (monthStart.getMonth() + 1) * 100 + 
                          monthStart.getDate();

    console.log('Time range details:', {
      yesterday: {
        fromDate,
        toDate,
        fromDateFormatted: new Date(yesterday).toLocaleDateString()
      },
      monthToDate: {
        fromDate: monthStartDate,
        toDate,
        fromDateFormatted: new Date(monthStart).toLocaleDateString(),
        toDateFormatted: new Date(yesterday).toLocaleDateString()
      }
    });

    let yesterdayUniqueUsers = 0;
    let yesterdayTotalEvents = 0;
    let monthToDateUniqueUsers = 0;
    let monthToDateTotalEvents = 0;
    let monthTotalAppOpens = 0;  // Initialize the variable here

    try {
      // Get total app opens for the month (non-unique, no filters)
      const monthTotalAppOpensRequestBody = {
        event_name: "app_opened",
        from: monthStartDate,
        to: toDate,
        unique: false
      };

      console.log('Making month total app opens request:', JSON.stringify(monthTotalAppOpensRequestBody, null, 2));

      const monthTotalAppOpensResponse = await axios.post(`${BASE_URL}/1/counts/events.json`, monthTotalAppOpensRequestBody, {
        headers: {
          ...apiHeaders,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (monthTotalAppOpensResponse.data && monthTotalAppOpensResponse.data.status === 'success') {
        monthTotalAppOpens = monthTotalAppOpensResponse.data.count || 0;
      } else if (monthTotalAppOpensResponse.data && monthTotalAppOpensResponse.data.req_id) {
        const monthTotalAppOpensReqId = monthTotalAppOpensResponse.data.req_id;
        let pollCount = 0;
        
        while (pollCount < maxPolls) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const pollResponse = await axios.get(`${BASE_URL}/1/counts/events.json?req_id=${monthTotalAppOpensReqId}`, {
            headers: {
              ...apiHeaders,
              'Accept': 'application/json'
            }
          });
          
          if (pollResponse.data.status === 'success') {
            monthTotalAppOpens = pollResponse.data.count || 0;
            break;
          }
          
          pollCount++;
        }
      }

      // Step 1: Get yesterday's counts
      const yesterdayRequestBody = {
        event_name: "app_opened",
        from: fromDate,
        to: toDate,
        unique: true,
        where: {
          profile: {
            "Internal User": {
              "$ne": true
            }
          }
        }
      };
      
      console.log('Making yesterday count request:', JSON.stringify(yesterdayRequestBody, null, 2));
      
      try {
        // Get yesterday's counts
        const yesterdayResponse = await axios.post(`${BASE_URL}/1/counts/events.json`, yesterdayRequestBody, {
          headers: {
            ...apiHeaders,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        console.log('Yesterday response:', JSON.stringify(yesterdayResponse.data, null, 2));

        // Handle yesterday's response
        if (yesterdayResponse.data && yesterdayResponse.data.status === 'success') {
          yesterdayUniqueUsers = yesterdayResponse.data.count || 0;
          console.log('Got yesterday unique users count immediately:', yesterdayUniqueUsers);
        } else if (yesterdayResponse.data && yesterdayResponse.data.req_id) {
          // Poll for yesterday's results
          const yesterdayReqId = yesterdayResponse.data.req_id;
          console.log('Polling for yesterday counts with req_id:', yesterdayReqId);
          
          let pollCount = 0;
          
          while (pollCount < maxPolls) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const pollResponse = await axios.get(`${BASE_URL}/1/counts/events.json?req_id=${yesterdayReqId}`, {
              headers: {
                ...apiHeaders,
                'Accept': 'application/json'
              }
            });
            
            console.log(`Yesterday poll attempt ${pollCount + 1}:`, JSON.stringify(pollResponse.data, null, 2));
            
            if (pollResponse.data.status === 'success') {
              yesterdayUniqueUsers = pollResponse.data.count || 0;
              console.log('Got yesterday unique users count after polling:', yesterdayUniqueUsers);
              break;
            } else if (pollResponse.data.status === 'fail') {
              throw new Error(pollResponse.data.error || 'Failed to get yesterday counts');
            }
            
            pollCount++;
          }
        }

        // Get yesterday's total events
        const yesterdayTotalRequestBody = {
          ...yesterdayRequestBody,
          unique: false
        };

        const yesterdayTotalResponse = await axios.post(`${BASE_URL}/1/counts/events.json`, yesterdayTotalRequestBody, {
          headers: {
            ...apiHeaders,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (yesterdayTotalResponse.data && yesterdayTotalResponse.data.status === 'success') {
          yesterdayTotalEvents = yesterdayTotalResponse.data.count || 0;
        } else if (yesterdayTotalResponse.data && yesterdayTotalResponse.data.req_id) {
          const yesterdayTotalReqId = yesterdayTotalResponse.data.req_id;
          let pollCount = 0;
          
          while (pollCount < maxPolls) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const pollResponse = await axios.get(`${BASE_URL}/1/counts/events.json?req_id=${yesterdayTotalReqId}`, {
              headers: {
                ...apiHeaders,
                'Accept': 'application/json'
              }
            });
            
            if (pollResponse.data.status === 'success') {
              yesterdayTotalEvents = pollResponse.data.count || 0;
              break;
            }
            
            pollCount++;
          }
        }

        // Step 2: Get month-to-date counts
        const monthToDateRequestBody = {
          event_name: "app_opened",
          from: monthStartDate,
          to: toDate,
          unique: true,
          where: {
            profile: {
              "Internal User": {
                "$ne": true
              }
            }
          }
        };

        console.log('Making month-to-date count request:', JSON.stringify(monthToDateRequestBody, null, 2));

        const monthToDateResponse = await axios.post(`${BASE_URL}/1/counts/events.json`, monthToDateRequestBody, {
          headers: {
            ...apiHeaders,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        console.log('Month-to-date response:', JSON.stringify(monthToDateResponse.data, null, 2));

        // Handle month-to-date response
        if (monthToDateResponse.data && monthToDateResponse.data.status === 'success') {
          monthToDateUniqueUsers = monthToDateResponse.data.count || 0;
          console.log('Got month-to-date unique users count immediately:', monthToDateUniqueUsers);
        } else if (monthToDateResponse.data && monthToDateResponse.data.req_id) {
          const monthToDateReqId = monthToDateResponse.data.req_id;
          console.log('Polling for month-to-date counts with req_id:', monthToDateReqId);
          
          let pollCount = 0;
          
          while (pollCount < maxPolls) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const pollResponse = await axios.get(`${BASE_URL}/1/counts/events.json?req_id=${monthToDateReqId}`, {
              headers: {
                ...apiHeaders,
                'Accept': 'application/json'
              }
            });
            
            console.log(`Month-to-date poll attempt ${pollCount + 1}:`, JSON.stringify(pollResponse.data, null, 2));
            
            if (pollResponse.data.status === 'success') {
              monthToDateUniqueUsers = pollResponse.data.count || 0;
              console.log('Got month-to-date unique users count after polling:', monthToDateUniqueUsers);
              break;
            } else if (pollResponse.data.status === 'fail') {
              throw new Error(pollResponse.data.error || 'Failed to get month-to-date counts');
            }
            
            pollCount++;
          }
        }

        // Get month-to-date total events
        const monthToDateTotalRequestBody = {
          ...monthToDateRequestBody,
          unique: false
        };

        const monthToDateTotalResponse = await axios.post(`${BASE_URL}/1/counts/events.json`, monthToDateTotalRequestBody, {
          headers: {
            ...apiHeaders,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (monthToDateTotalResponse.data && monthToDateTotalResponse.data.status === 'success') {
          monthToDateTotalEvents = monthToDateTotalResponse.data.count || 0;
        } else if (monthToDateTotalResponse.data && monthToDateTotalResponse.data.req_id) {
          const monthToDateTotalReqId = monthToDateTotalResponse.data.req_id;
          let pollCount = 0;
          
          while (pollCount < maxPolls) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const pollResponse = await axios.get(`${BASE_URL}/1/counts/events.json?req_id=${monthToDateTotalReqId}`, {
              headers: {
                ...apiHeaders,
                'Accept': 'application/json'
              }
            });
            
            if (pollResponse.data.status === 'success') {
              monthToDateTotalEvents = pollResponse.data.count || 0;
              break;
            }
            
            pollCount++;
          }
        }

      } catch (error) {
        console.error('API Error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers
        });
        throw error;
      }

      console.log('Final counts (excluding internal users):');
      console.log('Yesterday:', {
        uniqueUsers: yesterdayUniqueUsers,
        totalEvents: yesterdayTotalEvents
      });
      console.log('Month-to-date:', {
        uniqueUsers: monthToDateUniqueUsers,
        totalEvents: monthToDateTotalEvents
      });

      // Get Metabase dashboard data
      console.log('Fetching Metabase dashboard data...');
      const metabaseData = await metabaseClient.getDashboardData();
      console.log('Metabase data:', metabaseData);

      // Send to Slack
      const message = {
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "📊 Daily App Analytics Report",
              emoji: true
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `📅 *Yesterday's App Opens* (${new Date(yesterday).toLocaleDateString()})\n• Unique Users: *${yesterdayUniqueUsers.toLocaleString()}*\n• Total Events: *${yesterdayTotalEvents.toLocaleString()}*\n• Event: \`app_opened\`\n• Filter: Excluding Internal Users`
            }
          },
          {
            type: "divider"
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `📈 *Month-to-Date App Opens* (${new Date(monthStart).toLocaleDateString()} to ${new Date(yesterday).toLocaleDateString()})\n• Unique Users: *${monthToDateUniqueUsers.toLocaleString()}*\n• Total Events: *${monthToDateTotalEvents.toLocaleString()}*\n• Total App Opens (All Users): *${monthTotalAppOpens.toLocaleString()}*\n• Days into Month: *${Math.ceil((yesterday - monthStart) / (1000 * 60 * 60 * 24)) + 1}*\n• Avg Daily Unique Users: *${Math.round(monthToDateUniqueUsers / (Math.ceil((yesterday - monthStart) / (1000 * 60 * 60 * 24)) + 1)).toLocaleString()}*\n• Avg Daily Events: *${Math.round(monthToDateTotalEvents / (Math.ceil((yesterday - monthStart) / (1000 * 60 * 60 * 24)) + 1)).toLocaleString()}*\n• Event: \`app_opened\`\n• Filter: Excluding Internal Users`
            }
          },
          {
            type: "divider"
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `📊 *Performance Indicators*\n🟢 Yesterday vs Avg: *${((yesterdayUniqueUsers / (monthToDateUniqueUsers / Math.ceil((yesterday - monthStart) / (1000 * 60 * 60 * 24)))) * 100 - 100).toFixed(1)}%*`
            }
          }
        ]
      };

      // Add Metabase dashboard data if available
      if (metabaseData) {
        const metabaseMessage = metabaseClient.formatDashboardMessage(metabaseData);
        message.blocks.push(...metabaseMessage.blocks);
      } else {
        message.blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: "📊 Metabase Dashboard\nUnable to fetch data"
          }
        });
      }

      try {
        console.log('Sending message to Slack:', JSON.stringify(message, null, 2));
        await sendToSlack(message);
        console.log('Successfully sent message to Slack');
      } catch (slackError) {
        console.error('Failed to send to Slack:', slackError);
        return { 
          success: false, 
          error: 'Failed to send to Slack: ' + (slackError.message || 'Unknown error'),
          yesterday: {
            uniqueUsers: yesterdayUniqueUsers,
            totalEvents: yesterdayTotalEvents
          },
          monthToDate: {
            uniqueUsers: monthToDateUniqueUsers,
            totalEvents: monthToDateTotalEvents
          }
        };
      }
      
      return { 
        success: true, 
        message: 'Daily report sent successfully', 
        yesterday: {
          uniqueUsers: yesterdayUniqueUsers,
          totalEvents: yesterdayTotalEvents
        },
        monthToDate: {
          uniqueUsers: monthToDateUniqueUsers,
          totalEvents: monthToDateTotalEvents
        }
      };
    } catch (error) {
      console.error('Error generating daily report:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  } catch (error) {
    console.error('Error generating daily report:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

export default generateDailyReport;