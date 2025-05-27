import axios from 'axios';

const metabaseClient = {
  async getDashboardData() {
    try {
      // Check configuration
      console.log('Checking Metabase configuration...');
      console.log('METABASE_API_URL:', process.env.METABASE_API_URL ? 'Set' : 'Not set');
      console.log('METABASE_API_KEY:', process.env.METABASE_API_KEY ? 'Set' : 'Not set');
      console.log('METABASE_DASHBOARD_URL:', process.env.METABASE_DASHBOARD_URL ? 'Set' : 'Not set');

      if (!process.env.METABASE_API_URL || !process.env.METABASE_API_KEY || !process.env.METABASE_DASHBOARD_URL) {
        console.error('Missing required Metabase configuration');
        return null;
      }

      // Format API URL
      let apiUrl = process.env.METABASE_API_URL;
      apiUrl = apiUrl.replace(/\/$/, '');
      if (!apiUrl.includes('/api')) {
        apiUrl = `${apiUrl}/api`;
      }

      // Extract dashboard ID
      const dashboardUrl = process.env.METABASE_DASHBOARD_URL;
      let dashboardId;
      
      if (dashboardUrl.includes('/dashboard/')) {
        const urlParts = dashboardUrl.split('/dashboard/')[1];
        dashboardId = urlParts.split('-')[0];
      } else {
        dashboardId = dashboardUrl.split('/').pop().split('-')[0];
      }

      console.log('Using API URL:', apiUrl);
      console.log('Extracted dashboard ID:', dashboardId);

      const headers = {
        'x-api-key': process.env.METABASE_API_KEY,
        'Content-Type': 'application/json'
      };

      // Step 1: Get pulse data
      const pulseUrl = `${apiUrl}/pulse?dashboard_id=${dashboardId}`;
      console.log('Fetching pulse data from:', pulseUrl);
      
      const pulseResponse = await axios.get(pulseUrl, {
        headers: headers,
        timeout: 15000
      });

      console.log('Pulse response status:', pulseResponse.status);
      console.log('Pulse response data:', JSON.stringify(pulseResponse.data, null, 2));

      if (!pulseResponse.data || pulseResponse.data.length === 0) {
        console.log('No pulse data found, trying direct dashboard approach...');
        return await this.getDashboardDataDirect(apiUrl, dashboardId, headers);
      }

      // Step 2: Test pulse to get actual data
      const pulse = pulseResponse.data[0];
      console.log('Pulse cards found:', pulse.cards?.length || 0);

      const testPulseUrl = `${apiUrl}/pulse/test`;
      console.log('Testing pulse at:', testPulseUrl);

      const testPulsePayload = {
        name: pulse.name,
        cards: pulse.cards,
        channels: pulse.channels || [],
        skip_if_empty: false,
        dashboard_id: parseInt(dashboardId)
      };

      const testPulseResponse = await axios.post(testPulseUrl, testPulsePayload, {
        headers: headers,
        timeout: 30000
      });

      console.log('Test pulse response status:', testPulseResponse.status);

      // Step 3: Process results with better debugging
      let cardsData = [];
      
      if (testPulseResponse.data) {
        console.log('Processing test pulse response...');
        
        if (Array.isArray(testPulseResponse.data)) {
          const pulseResults = testPulseResponse.data;
          
          pulseResults.forEach((result, index) => {
            if (result.cards && Array.isArray(result.cards)) {
              result.cards.forEach((card, cardIndex) => {
                cardsData.push({
                  title: card.card?.name || card.name || `Card ${card.card?.id || card.id}`,
                  data: {
                    data: {
                      rows: card.result?.data?.rows || card.data?.rows || [],
                      cols: card.result?.data?.cols || card.data?.cols || []
                    }
                  },
                  id: card.card?.id || card.id,
                  display: card.card?.display || card.display
                });
              });
            }
          });
        } else if (testPulseResponse.data.cards) {
          testPulseResponse.data.cards.forEach((card, index) => {
            cardsData.push({
              title: card.card?.name || card.name || `Card ${card.card?.id || card.id}`,
              data: {
                data: {
                  rows: card.result?.data?.rows || card.data?.rows || [],
                  cols: card.result?.data?.cols || card.data?.cols || []
                }
              },
              id: card.card?.id || card.id,
              display: card.card?.display || card.display
            });
          });
        }
      }

      console.log(`Successfully processed ${cardsData.length} cards from pulse`);

      // If pulse method didn't work, fallback to direct method
      if (cardsData.length === 0) {
        console.log('Pulse method returned 0 cards, falling back to direct dashboard approach...');
        return await this.getDashboardDataDirect(apiUrl, dashboardId, headers);
      }

      return {
        dashboard: {
          name: pulse.name || 'Dashboard',
          description: pulse.description || '',
          id: dashboardId
        },
        cards: cardsData,
        source: 'pulse'
      };

    } catch (error) {
      console.error('Error fetching Metabase dashboard via pulse:', error.message);
      
      // Always fallback to direct method
      console.log('Pulse method failed, trying direct dashboard approach...');
      try {
        let apiUrl = process.env.METABASE_API_URL;
        apiUrl = apiUrl.replace(/\/$/, '');
        if (!apiUrl.includes('/api')) {
          apiUrl = `${apiUrl}/api`;
        }
        
        const dashboardUrl = process.env.METABASE_DASHBOARD_URL;
        const dashboardId = dashboardUrl.includes('/dashboard/') 
          ? dashboardUrl.split('/dashboard/')[1].split('-')[0]
          : dashboardUrl.split('/').pop().split('-')[0];

        const headers = {
          'x-api-key': process.env.METABASE_API_KEY,
          'Content-Type': 'application/json'
        };
          
        return await this.getDashboardDataDirect(apiUrl, dashboardId, headers);
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError.message);
        return null;
      }
    }
  },

  async getDashboardDataDirect(apiUrl, dashboardId, headers) {
    try {
      console.log('Fetching dashboard directly...');
      const dashboardResponse = await axios.get(`${apiUrl}/dashboard/${dashboardId}`, {
        headers: headers,
        timeout: 15000
      });

      const dashboard = dashboardResponse.data;
      console.log('Dashboard name:', dashboard.name);
      console.log('Dashboard ordered_cards count:', dashboard.ordered_cards?.length || 0);

      // Get data for each card
      const cardsData = await Promise.all(
        (dashboard.ordered_cards || []).map(async (orderedCard, index) => {
          try {
            const card = orderedCard.card;
            console.log(`Fetching data for card ${index + 1}/${dashboard.ordered_cards.length}: ${card.id} - "${card.name}"...`);
            
            const cardQueryResponse = await axios.post(`${apiUrl}/card/${card.id}/query`, {}, {
              headers: headers,
              timeout: 30000
            });

            console.log(`Card ${card.id} query successful, rows: ${cardQueryResponse.data.data?.rows?.length || 0}`);

            return {
              title: card.name,
              data: cardQueryResponse.data,
              id: card.id,
              display: card.display,
              description: card.description
            };
          } catch (error) {
            console.error(`Error fetching card ${orderedCard.card?.id}:`, error.message);
            return null;
          }
        })
      );

      const validCards = cardsData.filter(card => card !== null);
      console.log(`Successfully fetched ${validCards.length} cards directly`);

      return {
        dashboard: {
          name: dashboard.name,
          description: dashboard.description || '',
          id: dashboard.id
        },
        cards: validCards,
        source: 'direct'
      };
    } catch (error) {
      console.error('Direct dashboard fetch failed:', error.message);
      throw error;
    }
  },

  formatDashboardMessage(dashboardData) {
    if (!dashboardData) {
      return {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*📊 Metabase Dashboard:* ❌ Unable to fetch data"
            }
          }
        ]
      };
    }

    if (!dashboardData.cards || dashboardData.cards.length === 0) {
      return {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*📊 ${dashboardData.dashboard.name}*\n❌ No card data available`
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "🔗 View Dashboard",
                  emoji: true
                },
                url: process.env.METABASE_DASHBOARD_URL,
                style: "primary"
              }
            ]
          }
        ]
      };
    }

    const blocks = [
      {
        type: "divider"
      },
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📊 ${dashboardData.dashboard.name}`,
          emoji: true
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `✅ ${dashboardData.cards.length} cards loaded successfully (via ${dashboardData.source})`
          }
        ]
      }
    ];

    // Group cards by category for better organization
    const categorizedCards = this.categorizeCards(dashboardData.cards);

    // Add each category
    Object.entries(categorizedCards).forEach(([category, cards]) => {
      if (cards.length > 0) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${this.getCategoryEmoji(category)} ${category.toUpperCase()}*`
          }
        });

        cards.forEach((card, index) => {
          const cardBlocks = this.formatBeautifiedCard(card, index + 1);
          blocks.push(...cardBlocks);
        });

        // Add spacing between categories
        if (Object.keys(categorizedCards).indexOf(category) < Object.keys(categorizedCards).length - 1) {
          blocks.push({
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "─────────────────────────────────────"
              }
            ]
          });
        }
      }
    });

    // Add dashboard link at the end
    blocks.push(
      {
        type: "divider"
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "📊 View Full Dashboard",
              emoji: true
            },
            url: process.env.METABASE_DASHBOARD_URL,
            style: "primary"
          }
        ]
      }
    );

    return { blocks };
  },

  categorizeCards(cards) {
    const categories = {
      'User Registrations': [],
      'Quotation Generator': [],
      'Digital Profiles': [],
      'App Activity': [],
      'Other Metrics': []
    };

    cards.forEach(card => {
      const title = card.title.toLowerCase();
      
      if (title.includes('user') && (title.includes('registration') || title.includes('created') || title.includes('new'))) {
        categories['User Registrations'].push(card);
      } else if (title.includes('quotation') || title.includes('qg_') || title.includes('quote')) {
        categories['Quotation Generator'].push(card);
      } else if (title.includes('dp') || title.includes('digital') || title.includes('profile') || title.includes('project')) {
        categories['Digital Profiles'].push(card);
      } else if (title.includes('app') || title.includes('launch') || title.includes('session')) {
        categories['App Activity'].push(card);
      } else {
        categories['Other Metrics'].push(card);
      }
    });

    // Remove empty categories
    Object.keys(categories).forEach(key => {
      if (categories[key].length === 0) {
        delete categories[key];
      }
    });

    return categories;
  },

  getCategoryEmoji(category) {
    const emojiMap = {
      'User Registrations': '👥',
      'Quotation Generator': '📝',
      'Digital Profiles': '🏗️',
      'App Activity': '📱',
      'Other Metrics': '📊'
    };
    return emojiMap[category] || '📊';
  },

  formatBeautifiedCard(card, cardNumber) {
    const { title, data, display, description } = card;
    const rows = data.data?.rows || [];
    const columns = data.data?.cols || [];

    if (rows.length === 0) {
      return [{
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${this.cleanCardTitle(title)}*\n📊 No data available`
        }
      }];
    }

    // Single metric (scalar) - most common for your data
    if (display === 'scalar' || (columns.length === 1 && rows.length === 1)) {
      const value = rows[0][0];
      const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
      const emoji = this.getMetricEmoji(title);
      
      return [{
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} *${this.cleanCardTitle(title)}*\n📊 **${formattedValue}**`
        }
      }];
    }

    // Key-value pairs (perfect for your yesterday/month/total data)
    if (columns.length === 2 && rows.length <= 8) {
      const fields = [];
      
      rows.forEach(row => {
        const key = String(row[0]);
        const value = typeof row[1] === 'number' ? row[1].toLocaleString() : row[1];
        const emoji = this.getValueEmoji(key);
        
        fields.push({
          type: "mrkdwn",
          text: `${emoji} *${key}*\n${value}`
        });
      });

      // Split into chunks of 10 (Slack limit)
      const chunks = [];
      for (let i = 0; i < fields.length; i += 10) {
        chunks.push(fields.slice(i, i + 10));
      }

      const blocks = [];
      chunks.forEach((chunk, index) => {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: index === 0 ? `*${this.cleanCardTitle(title)}*` : `*${this.cleanCardTitle(title)} (continued)*`
          },
          fields: chunk
        });
      });

      return blocks;
    }

    // Table format for complex data
    const header = columns.map(col => col.display_name || col.name).join(' | ');
    const separator = columns.map(() => '---').join(' | ');
    const dataRows = rows.slice(0, 5).map(row => 
      row.map(cell => {
        if (cell === null || cell === undefined) return 'N/A';
        return typeof cell === 'number' ? cell.toLocaleString() : String(cell);
      }).join(' | ')
    );

    let tableText = `*${this.cleanCardTitle(title)}*\n\`\`\`\n${header}\n${separator}\n${dataRows.join('\n')}\n\`\`\``;
    
    if (rows.length > 5) {
      tableText += `\n_📊 Showing 5 of ${rows.length} rows_`;
    }

    if (description) {
      tableText += `\n_${description}_`;
    }

    return [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: tableText
      }
    }];
  },

  cleanCardTitle(title) {
    // Clean up card titles for better readability
    return title
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  getMetricEmoji(title) {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('user') || titleLower.includes('registration')) return '👥';
    if (titleLower.includes('quotation') || titleLower.includes('quote')) return '📝';
    if (titleLower.includes('share') || titleLower.includes('shared')) return '🔗';
    if (titleLower.includes('profile') || titleLower.includes('dp')) return '🏗️';
    if (titleLower.includes('photo') || titleLower.includes('image')) return '📸';
    if (titleLower.includes('project')) return '🏠';
    if (titleLower.includes('today') || titleLower.includes('yesterday')) return '📅';
    if (titleLower.includes('month')) return '📊';
    if (titleLower.includes('total') || titleLower.includes('till')) return '📈';
    
    return '📊';
  },

  getValueEmoji(key) {
    const keyLower = key.toLowerCase();
    
    if (keyLower.includes('yesterday') || keyLower.includes('today')) return '📅';
    if (keyLower.includes('month')) return '📊';
    if (keyLower.includes('total') || keyLower.includes('till')) return '📈';
    if (keyLower.includes('user')) return '👥';
    if (keyLower.includes('quotation')) return '📝';
    if (keyLower.includes('share')) return '🔗';
    if (keyLower.includes('photo')) return '📸';
    if (keyLower.includes('profile') || keyLower.includes('dp')) return '🏗️';
    
    return '•';
  },

  async sendPulseAlert(dashboardData) {
    try {
      if (!dashboardData) {
        console.log('No dashboard data to send pulse alert');
        return null;
      }

      console.log('Preparing pulse alert for dashboard:', dashboardData.dashboard.name);
      
      const pulseData = {
        name: `Daily Report - ${dashboardData.dashboard.name}`,
        cards: dashboardData.cards.map(card => ({
          name: card.title,
          data: card.data?.data || {},
          id: card.id
        })),
        dashboard_id: parseInt(dashboardData.dashboard.id),
        source: dashboardData.source
      };

      console.log('Pulse alert data prepared with', pulseData.cards.length, 'cards');
      return pulseData;
    } catch (error) {
      console.error('Error preparing pulse alert:', error.message);
      return null;
    }
  }
};

export default metabaseClient;
