import axios from "axios";

const metabaseClient = {
  async getDashboardData() {
    try {
      console.log("Checking Metabase configuration...");
      console.log(
        "METABASE_API_URL:",
        process.env.METABASE_API_URL ? "Set" : "Not set"
      );
      console.log(
        "METABASE_API_KEY:",
        process.env.METABASE_API_KEY ? "Set" : "Not set"
      );
      console.log(
        "METABASE_DASHBOARD_URL:",
        process.env.METABASE_DASHBOARD_URL ? "Set" : "Not set"
      );

      if (
        !process.env.METABASE_API_URL ||
        !process.env.METABASE_API_KEY ||
        !process.env.METABASE_DASHBOARD_URL
      ) {
        console.error("Missing required Metabase configuration");
        return null;
      }

      let apiUrl = process.env.METABASE_API_URL;
      apiUrl = apiUrl.replace(/\/$/, "");
      if (!apiUrl.includes("/api")) {
        apiUrl = `${apiUrl}/api`;
      }

      const dashboardUrl = process.env.METABASE_DASHBOARD_URL;
      let dashboardId;

      if (dashboardUrl.includes("/dashboard/")) {
        const urlParts = dashboardUrl.split("/dashboard/")[1];
        dashboardId = urlParts.split("-")[0];
      } else {
        dashboardId = dashboardUrl.split("/").pop().split("-")[0];
      }

      console.log("Using API URL:", apiUrl);
      console.log("Extracted dashboard ID:", dashboardId);

      const headers = {
        "x-api-key": process.env.METABASE_API_KEY,
        "Content-Type": "application/json",
        "User-Agent": "MetabaseClient/1.0",
      };

      try {
        const dashboardResponse = await axios.get(
          `${apiUrl}/dashboard/${dashboardId}`,
          {
            headers: headers,
            timeout: 20000,
          }
        );

        const dashboard = dashboardResponse.data;
        console.log("Dashboard name:", dashboard.name);

        let cardsToProcess =
          dashboard.ordered_cards ||
          dashboard.dashcards ||
          dashboard.cards ||
          [];
        console.log("Total cards found:", cardsToProcess.length);

        if (cardsToProcess.length > 0) {
          const cardsData = [];

          for (let i = 0; i < cardsToProcess.length; i++) {
            const cardItem = cardsToProcess[i];
            try {
              const card = cardItem.card || cardItem;
              const cardId = card.id || cardItem.card_id || cardItem.id;
              const cardName = card.name || cardItem.name || `Card ${cardId}`;

              console.log(
                `Processing card ${i + 1}/${
                  cardsToProcess.length
                }: ID=${cardId}, Name="${cardName}"`
              );

              if (!cardId) {
                console.log("No card ID found, skipping...");
                continue;
              }

              let cardData = null;
              let retryCount = 0;
              const maxRetries = 1;

              while (retryCount < maxRetries && !cardData) {
                try {
                  const cardQueryResponse = await axios.post(
                    `${apiUrl}/card/${cardId}/query`,
                    {},
                    {
                      headers: headers,
                      timeout: 60000,
                    }
                  );

                  console.log(
                    `Card ${cardId} query successful on attempt ${
                      retryCount + 1
                    }`
                  );

                  if (cardQueryResponse.data && cardQueryResponse.data.data) {
                    console.log(
                      `Card ${cardId} data rows:`,
                      cardQueryResponse.data.data.rows?.length || 0
                    );

                    cardData = {
                      title: cardName,
                      data: cardQueryResponse.data,
                      id: cardId,
                      display: card.display || "scalar",
                      description: card.description || "",
                      fetchedAt: new Date().toISOString(),
                    };
                  } else {
                    console.warn(
                      `Card ${cardId} returned invalid data structure`
                    );
                  }
                } catch (cardError) {
                  // If the card was deleted or not found, skip retries
                  if (cardError?.response?.status === 404) {
                    console.warn(
                      `Card ${cardId} returned 404 (not found). Skipping without retry.`
                    );
                    break; // exit retry loop, leave cardData as null
                  }

                  retryCount++;
                  console.error(
                    `Card ${cardId} attempt ${retryCount} failed:`,
                    cardError.message
                  );

                  if (retryCount < maxRetries) {
                    const delay = Math.pow(2, retryCount) * 1000;
                    console.log(`Retrying card ${cardId} in ${delay}ms...`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                  }
                }
              }

              if (cardData) {
                cardsData.push(cardData);
              } else {
                console.error(
                  `Failed to fetch card ${cardId} after ${retryCount} attempts`
                );
              }

              await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (error) {
              console.error(
                `Error processing card ${cardItem.card?.id || cardItem.id}:`,
                error.message
              );
            }
          }

          console.log(
            `Successfully fetched ${cardsData.length} out of ${cardsToProcess.length} cards`
          );

          if (cardsData.length > 0) {
            return {
              dashboard: {
                name: dashboard.name,
                description: dashboard.description || "",
                id: dashboard.id,
              },
              cards: cardsData,
              source: "direct",
              fetchedAt: new Date().toISOString(),
              totalCardsAttempted: cardsToProcess.length,
              successfulCards: cardsData.length,
            };
          }
        }

        return this.createFallbackData();
      } catch (dashboardError) {
        console.error("Dashboard fetch failed:", dashboardError.message);
        if (dashboardError.response?.status === 403) {
          console.error("403 Forbidden - Check API key permissions");
        }
        return this.createFallbackData();
      }
    } catch (error) {
      console.error("Error in getDashboardData:", error.message);
      return this.createFallbackData();
    }
  },

  createFallbackData() {
    console.log("Creating fallback data with sample metrics...");

    const sampleCards = [
      {
        title: "New Users Created Yesterday",
        data: {
          data: {
            rows: [[178]],
            cols: [{ name: "count", display_name: "Count" }],
          },
        },
        id: "sample-1",
        display: "scalar",
        fetchedAt: new Date().toISOString(),
      },
      {
        title: "QG_User_Count_Yesterday",
        data: {
          data: {
            rows: [[178]],
            cols: [{ name: "count", display_name: "Count" }],
          },
        },
        id: "sample-2",
        display: "scalar",
        fetchedAt: new Date().toISOString(),
      },
      {
        title: "Quotations_Created_Yesterday",
        data: {
          data: {
            rows: [[225]],
            cols: [{ name: "count", display_name: "Count" }],
          },
        },
        id: "sample-3",
        display: "scalar",
        fetchedAt: new Date().toISOString(),
      },
      {
        title: "DP's Created Today",
        data: {
          data: {
            rows: [[152]],
            cols: [{ name: "count", display_name: "Count" }],
          },
        },
        id: "sample-4",
        display: "scalar",
        fetchedAt: new Date().toISOString(),
      },
    ];

    return {
      dashboard: {
        name: "App Analytics - Yesterday (Fallback)",
        description: "Sample data - API connection issue",
        id: "17",
      },
      cards: sampleCards,
      source: "fallback",
      fetchedAt: new Date().toISOString(),
      totalCardsAttempted: 0,
      successfulCards: sampleCards.length,
    };
  },

  // REQUIRED METHOD: formatDashboardMessage (for Block Kit format)
  formatDashboardMessage(dashboardData) {
    if (!dashboardData) {
      return {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: ":warning: *Metabase Dashboard* - Unable to fetch data",
            },
          },
        ],
      };
    }

    if (!dashboardData.cards || dashboardData.cards.length === 0) {
      return {
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `📊 ${dashboardData.dashboard.name}`,
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: ":x: No card data available",
            },
          },
        ],
      };
    }

    // Convert to text format for consistency
    const textOutput = this.formatDashboardAsText(dashboardData);

    return {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: textOutput,
          },
        },
      ],
    };
  },

  // REQUIRED METHOD: formatDashboardAsText (for styled text format)
  formatDashboardAsText(dashboardData) {
    if (!dashboardData) {
      return "📊 **Metabase Dashboard:** Unable to fetch data";
    }

    if (!dashboardData.cards || dashboardData.cards.length === 0) {
      return `📊 **${dashboardData.dashboard.name}**\n❌ No card data available`;
    }

    let output = `📊 **${dashboardData.dashboard.name}**\n`;
    output += `✅ ${dashboardData.cards.length} metrics loaded (${dashboardData.source})\n`;

    if (dashboardData.source === "direct") {
      output += `📊 Success rate: ${dashboardData.successfulCards}/${dashboardData.totalCardsAttempted} cards\n`;
    }

    output += `🕒 Last updated: ${new Date(
      dashboardData.fetchedAt
    ).toLocaleTimeString()}\n\n`;

    const categorizedCards = this.categorizeCards(dashboardData.cards);

    Object.entries(categorizedCards).forEach(([category, cards]) => {
      if (cards.length > 0) {
        output += `${this.getCategoryEmojiText(
          category
        )} **${category.toUpperCase()}**\n`;

        cards.forEach((card) => {
          const cardText = this.formatCardAsText(card);
          output += `${cardText}\n`;
        });

        output += "\n";
      }
    });

    return output.trim();
  },

  // REQUIRED METHOD: formatCardAsText
  formatCardAsText(card) {
    const { title, data, display } = card;
    const rows = data.data?.rows || [];
    const columns = data.data?.cols || [];

    if (rows.length === 0) {
      return `• *${this.cleanCardTitle(title)}:* No data available`;
    }

    if (display === "scalar" || (columns.length === 1 && rows.length === 1)) {
      const value = rows[0][0];
      const formattedValue =
        typeof value === "number" ? value.toLocaleString() : value;
      return `• *${this.cleanCardTitle(title)}:* ${formattedValue}`;
    }

    if (columns.length === 2 && rows.length <= 8) {
      let result = `• *${this.cleanCardTitle(title)}:*\n`;
      rows.forEach((row) => {
        const key = String(row[0]);
        const value =
          typeof row[1] === "number" ? row[1].toLocaleString() : row[1];
        result += `  - ${key}: ${value}\n`;
      });
      return result.trim();
    }

    if (rows.length <= 5) {
      let result = `• *${this.cleanCardTitle(title)}:*\n`;
      rows.forEach((row) => {
        const rowText = row
          .map((cell) =>
            cell === null || cell === undefined
              ? "N/A"
              : typeof cell === "number"
              ? cell.toLocaleString()
              : String(cell)
          )
          .join(" | ");
        result += `  ${rowText}\n`;
      });
      return result.trim();
    }

    const firstValue = rows[0]
      ? typeof rows[0][0] === "number"
        ? rows[0][0].toLocaleString()
        : rows[0][0]
      : "N/A";
    return `• *${this.cleanCardTitle(title)}:* ${
      rows.length
    } rows (Latest: ${firstValue})`;
  },

  // REQUIRED METHOD: formatCardData (legacy compatibility)
  formatCardData(card) {
    return this.formatCardAsText(card);
  },

  // REQUIRED METHOD: getCategoryEmojiText
  getCategoryEmojiText(category) {
    const emojiMap = {
      "New User Registrations": "👥",
      "Quotation Generator Data": "📝",
      "Digital Profiles": "🏗️",
      "App Activity": "📱",
      "Performance Metrics": "📊",
    };
    return emojiMap[category] || "📊";
  },

  // REQUIRED METHOD: categorizeCards
  categorizeCards(cards) {
    const categories = {
      "New User Registrations": [],
      "Quotation Generator Data": [],
      "Digital Profiles": [],
      "App Activity": [],
      "Performance Metrics": [],
    };

    cards.forEach((card) => {
      const title = card.title.toLowerCase();

      if (
        title.includes("user") &&
        (title.includes("registration") ||
          title.includes("created") ||
          title.includes("new"))
      ) {
        categories["New User Registrations"].push(card);
      } else if (
        title.includes("quotation") ||
        title.includes("qg") ||
        title.includes("quote")
      ) {
        categories["Quotation Generator Data"].push(card);
      } else if (
        title.includes("dp") ||
        title.includes("digital") ||
        title.includes("profile") ||
        title.includes("project")
      ) {
        categories["Digital Profiles"].push(card);
      } else if (
        title.includes("app") ||
        title.includes("launch") ||
        title.includes("session")
      ) {
        categories["App Activity"].push(card);
      } else {
        categories["Performance Metrics"].push(card);
      }
    });

    Object.keys(categories).forEach((key) => {
      if (categories[key].length === 0) {
        delete categories[key];
      }
    });

    return categories;
  },

  // REQUIRED METHOD: cleanCardTitle
  cleanCardTitle(title) {
    return title
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  },

  // REQUIRED METHOD: validateDataFreshness
  validateDataFreshness(dashboardData) {
    if (!dashboardData || !dashboardData.fetchedAt) {
      return false;
    }

    const fetchTime = new Date(dashboardData.fetchedAt);
    const now = new Date();
    const diffMinutes = (now - fetchTime) / (1000 * 60);

    return diffMinutes < 10;
  },

  // REQUIRED METHOD: getDataSummary
  getDataSummary(dashboardData) {
    if (!dashboardData) return "No data";

    const summary = {
      totalCards: dashboardData.cards?.length || 0,
      totalAttempted: dashboardData.totalCardsAttempted || 0,
      successRate: dashboardData.totalCardsAttempted
        ? `${Math.round(
            (dashboardData.successfulCards /
              dashboardData.totalCardsAttempted) *
              100
          )}%`
        : "N/A",
      categories: Object.keys(this.categorizeCards(dashboardData.cards || [])),
      fetchedAt: dashboardData.fetchedAt,
      source: dashboardData.source,
      isFresh: this.validateDataFreshness(dashboardData),
      sampleValues:
        dashboardData.cards?.slice(0, 5).map((card) => ({
          title: card.title,
          value: card.data?.data?.rows?.[0]?.[0] || "No data",
        })) || [],
    };

    return summary;
  },

  // REQUIRED METHOD: sendPulseAlert
  async sendPulseAlert(dashboardData) {
    try {
      if (!dashboardData) {
        console.log("No dashboard data to send pulse alert");
        return null;
      }

      console.log(
        "Preparing pulse alert for dashboard:",
        dashboardData.dashboard.name
      );

      const pulseData = {
        name: `Daily Report - ${dashboardData.dashboard.name}`,
        cards: dashboardData.cards.map((card) => ({
          name: card.title,
          data: card.data?.data || {},
          id: card.id,
        })),
        dashboard_id: parseInt(dashboardData.dashboard.id),
        source: dashboardData.source,
      };

      console.log(
        "Pulse alert data prepared with",
        pulseData.cards.length,
        "cards"
      );
      return pulseData;
    } catch (error) {
      console.error("Error preparing pulse alert:", error.message);
      return null;
    }
  },

  async getDashboard() {
    try {
      console.log("Checking Metabase configuration...");
      console.log(
        "METABASE_API_URL:",
        process.env.METABASE_API_URL ? "Set" : "Not set"
      );
      console.log(
        "METABASE_API_KEY:",
        process.env.METABASE_API_KEY ? "Set" : "Not set"
      );
      console.log(
        "METABASE_DASHBOARD_URL:",
        process.env.METABASE_DASHBOARD_URL ? "Set" : "Not set"
      );

      if (
        !process.env.METABASE_API_URL ||
        !process.env.METABASE_API_KEY ||
        !process.env.METABASE_DASHBOARD_URL
      ) {
        console.error("Missing required Metabase configuration");
        return null;
      }

      let apiUrl = process.env.METABASE_API_URL;
      apiUrl = apiUrl.replace(/\/$/, "");
      if (!apiUrl.includes("/api")) {
        apiUrl = `${apiUrl}/api`;
      }

      const dashboardUrl = process.env.METABASE_DASHBOARD_URL;
      let dashboardId;

      if (dashboardUrl.includes("/dashboard/")) {
        const urlParts = dashboardUrl.split("/dashboard/")[1];
        dashboardId = urlParts.split("-")[0];
      } else {
        dashboardId = dashboardUrl.split("/").pop().split("-")[0];
      }

      console.log("Using API URL:", apiUrl);
      console.log("Extracted dashboard ID:", dashboardId);

      const headers = {
        "x-api-key": process.env.METABASE_API_KEY,
        "Content-Type": "application/json",
        "User-Agent": "MetabaseClient/1.0",
      };

      try {
        const dashboardResponse = await axios.get(
          `${apiUrl}/dashboard/${dashboardId}`,
          {
            headers: headers,
            timeout: 20000,
          }
        );

        const dashboard = dashboardResponse.data;
        console.log("Dashboard name:", dashboard.name);

        return {
          id: dashboard.id,
          name: dashboard.name,
          description: dashboard.description || "",
          url: process.env.METABASE_DASHBOARD_URL,
          cards:
            dashboard.ordered_cards ||
            dashboard.dashcards ||
            dashboard.cards ||
            [],
        };
      } catch (dashboardError) {
        console.error("Dashboard fetch failed:", dashboardError.message);
        if (dashboardError.response?.status === 403) {
          console.error("403 Forbidden - Check API key permissions");
        }
        return null;
      }
    } catch (error) {
      console.error("Error in getDashboard:", error.message);
      return null;
    }
  },
};

export default metabaseClient;
